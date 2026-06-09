import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const NOTION_VERSION = process.env.NOTION_VERSION || "2022-06-28";
const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, "_posts");
const EN_POSTS_DIR = path.join(ROOT, "en", "posts");
const ASSETS_DIR = path.join(ROOT, "assets", "img", "notion");
const GENERATE_ENGLISH = process.env.NOTION_GENERATE_ENGLISH !== "false";
const FORCE_IMPORT = process.env.NOTION_FORCE_IMPORT === "true";

const token = process.env.NOTION_TOKEN;
const databaseId = process.env.DATABASE_ID || process.env.NOTION_DATABASE_ID;

if (!token) {
  throw new Error("Missing NOTION_TOKEN environment variable.");
}

if (!databaseId) {
  throw new Error("Missing DATABASE_ID environment variable.");
}

const propertyNames = {
  title: ["제목", "title", "Title", "이름", "Name"],
  date: ["날짜", "date", "Date", "작성일"],
  categories: ["카테고리", "categories", "Categories", "category", "Category"],
  tags: ["태그", "tags", "Tags", "tag", "Tag"],
  description: [
    "설명",
    "description",
    "Description",
    "요약",
    "summary",
    "Summary"
  ],
  published: ["공개여부", "공개", "published", "Published", "status", "Status"],
  slug: ["slug", "Slug", "URL", "url"]
};

const publishedValues = new Set([
  "공개",
  "게시",
  "게시됨",
  "발행",
  "발행됨",
  "published",
  "publish",
  "public",
  "yes",
  "true",
  "done",
  "완료"
]);

const layoutBlockTypes = new Set(["column_list", "column"]);
const listBlockTypes = new Set([
  "bulleted_list_item",
  "numbered_list_item",
  "to_do"
]);
const listContinuationBlockTypes = new Set([
  "bookmark",
  "breadcrumb",
  "callout",
  "code",
  "divider",
  "embed",
  "equation",
  "file",
  "image",
  "link_preview",
  "pdf",
  "quote",
  "synced_block",
  "table",
  "toggle",
  "video"
]);

async function notion(pathname, options = {}) {
  const response = await fetch(`https://api.notion.com/v1${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Notion API ${response.status} ${response.statusText}: ${body}`
    );
  }

  return response.json();
}

async function queryDatabase() {
  const pages = [];
  let startCursor;

  do {
    const body = {
      page_size: 100,
      ...(startCursor ? { start_cursor: startCursor } : {})
    };

    const response = await notion(`/databases/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify(body)
    });

    pages.push(...response.results);
    startCursor = response.has_more ? response.next_cursor : undefined;
  } while (startCursor);

  return pages;
}

async function getBlockChildren(blockId) {
  const blocks = [];
  let startCursor;

  do {
    const query = new URLSearchParams({ page_size: "100" });
    if (startCursor) {
      query.set("start_cursor", startCursor);
    }

    const response = await notion(
      `/blocks/${blockId}/children?${query.toString()}`,
      {
        method: "GET"
      }
    );

    blocks.push(...response.results);
    startCursor = response.has_more ? response.next_cursor : undefined;
  } while (startCursor);

  return blocks;
}

function findProperty(page, names, fallbackType) {
  for (const name of names) {
    if (page.properties[name]) {
      return page.properties[name];
    }
  }

  if (fallbackType) {
    return Object.values(page.properties).find(
      (property) => property.type === fallbackType
    );
  }

  return undefined;
}

function richTextPlain(richText = []) {
  return richText
    .map((item) => item.plain_text || "")
    .join("")
    .trim();
}

function propertyText(property) {
  if (!property) {
    return "";
  }

  switch (property.type) {
    case "title":
      return richTextPlain(property.title);
    case "rich_text":
      return richTextPlain(property.rich_text);
    case "select":
      return property.select?.name || "";
    case "status":
      return property.status?.name || "";
    case "multi_select":
      return property.multi_select.map((item) => item.name).join(", ");
    case "date":
      return property.date?.start || "";
    case "number":
      return property.number === null ? "" : String(property.number);
    case "checkbox":
      return property.checkbox ? "true" : "false";
    case "url":
      return property.url || "";
    default:
      return "";
  }
}

async function existingPostDescriptionState(filePath) {
  try {
    const content = await readFile(filePath, "utf8");
    const description = frontMatterValue(content, "description");
    const source = normalizeDescriptionSource(
      frontMatterValue(content, "description_source")
    );

    if (!isUsableDescription(description)) {
      return { description: "", source: "" };
    }

    return {
      description,
      source
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { description: "", source: "" };
    }

    throw error;
  }
}

async function existingPostTitleState(filePath) {
  try {
    const content = await readFile(filePath, "utf8");
    const title = frontMatterValue(content, "title");
    const source = normalizeTitleSource(
      frontMatterValue(content, "title_source")
    );

    return {
      title,
      source
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { title: "", source: "" };
    }

    throw error;
  }
}

async function existingPostCategories(filePath) {
  try {
    return frontMatterArray(await readFile(filePath, "utf8"), "categories");
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function frontMatterValue(content, key) {
  return parseYamlScalar(frontMatterRawValue(content, key));
}

function frontMatterRawValue(content, key) {
  const frontMatter = String(content || "").match(/^---\n([\s\S]*?)\n---/);
  if (!frontMatter) {
    return "";
  }

  const prefix = `${key}:`;
  const line = frontMatter[1]
    .split("\n")
    .find((item) => item.startsWith(prefix));
  if (!line) {
    return "";
  }

  return line.slice(prefix.length).trim();
}

function frontMatterArray(content, key) {
  const raw = frontMatterRawValue(content, key);
  if (!raw) {
    return [];
  }

  const quotedValues = [...raw.matchAll(/(['"])((?:\\.|(?!\1).)*?)\1/g)].map(
    (match) => parseYamlScalar(`${match[1]}${match[2]}${match[1]}`)
  );

  if (quotedValues.length) {
    return quotedValues;
  }

  return raw
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseYamlScalar(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw.slice(1, -1);
    }
  }

  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1).replace(/''/g, "'");
  }

  return raw;
}

function isUsableDescription(description) {
  const value = String(description || "").trim();
  return (
    value.length >= 20 &&
    !/^https?:\/\//i.test(value) &&
    !/0 to Product/i.test(value) &&
    !/작성한 글입니다/.test(value) &&
    !/This is an article written about/i.test(value)
  );
}

function normalizeDescriptionSource(source) {
  const value = String(source || "")
    .trim()
    .toLowerCase();
  return ["notion", "manual", "excerpt"].includes(value) ? value : "";
}

function normalizeTitleSource(source) {
  const value = String(source || "")
    .trim()
    .toLowerCase();
  return ["notion", "manual"].includes(value) ? value : "";
}

function propertyList(property) {
  if (!property) {
    return [];
  }

  switch (property.type) {
    case "multi_select":
      return property.multi_select.map((item) => item.name).filter(Boolean);
    case "select":
      return property.select?.name ? [property.select.name] : [];
    case "status":
      return property.status?.name ? [property.status.name] : [];
    case "rich_text":
      return splitList(richTextPlain(property.rich_text));
    case "title":
      return splitList(richTextPlain(property.title));
    default:
      return splitList(propertyText(property));
  }
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCategoryName(value) {
  const category = String(value || "").trim();
  const aliases = {
    baekjoon: "BaekJoon",
    백준: "BaekJoon"
  };

  return aliases[category.toLowerCase()] || aliases[category] || category;
}

function normalizeCategories(values) {
  const categories = [];

  for (const value of values) {
    for (const part of String(value || "").split("/")) {
      const category = normalizeCategoryName(part);
      if (category && !categories.includes(category)) {
        categories.push(category);
      }
    }
  }

  return categories;
}

function resolvePostCategories(notionCategories, existingCategories) {
  if (!notionCategories.length && existingCategories.length) {
    return existingCategories;
  }

  if (
    notionCategories.length === 1 &&
    existingCategories.length > 1 &&
    notionCategories[0] === existingCategories[0]
  ) {
    return existingCategories;
  }

  return notionCategories;
}

function isPublished(page) {
  const property = findProperty(page, propertyNames.published);

  if (!property) {
    return true;
  }

  if (property.type === "checkbox") {
    return property.checkbox;
  }

  const value = propertyText(property).trim().toLowerCase();
  return publishedValues.has(value);
}

function formatDateForJekyll(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid Notion date: ${value}`);
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} +0900`;
}

function datePrefix(value) {
  const formatted = formatDateForJekyll(value);
  return formatted.slice(0, 10);
}

function slugify(value) {
  const slug = String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|#%{}[\]^~`]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (slug) {
    return slug;
  }

  return `notion-${Date.now()}`;
}

async function existingGeneratedPostPath(notionId, notionLang) {
  const directories = notionLang === "en" ? [EN_POSTS_DIR] : [POSTS_DIR];

  for (const directory of directories) {
    const files = await generatedMarkdownFiles(directory);

    for (const filePath of files) {
      const content = await readFile(filePath, "utf8");
      const idMatch = content.match(/^notion_id:\s*["']?([^"'\n]+)["']?/m);

      if (!idMatch || idMatch[1] !== notionId) {
        continue;
      }

      const langMatch = content.match(/^notion_lang:\s*["']?([^"'\n]+)["']?/m);
      const fileLang = langMatch?.[1] || "ko";

      if (fileLang === notionLang) {
        return filePath;
      }
    }
  }

  return "";
}

async function existingGeneratedPostState(notionId, notionLang) {
  const filePath = await existingGeneratedPostPath(notionId, notionLang);

  if (!filePath) {
    return { filePath: "", lastModifiedAt: "" };
  }

  const content = await readFile(filePath, "utf8");
  return {
    filePath,
    lastModifiedAt: frontMatterValue(content, "last_modified_at")
  };
}

function slugFromKoreanPostPath(filePath) {
  return path.basename(filePath, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

function slugFromEnglishPostPath(filePath) {
  const directory = path.dirname(filePath);
  return path.relative(EN_POSTS_DIR, directory).split(path.sep).join("/");
}

function pageDateValue(page) {
  const dateProperty = findProperty(page, propertyNames.date, "date");
  return propertyText(dateProperty) || page.created_time;
}

function pageBaseSlug(page) {
  const title = propertyText(findProperty(page, propertyNames.title, "title"));
  const slugProperty = findProperty(page, propertyNames.slug);
  return slugify(propertyText(slugProperty) || title);
}

function createUrlSlugPlan(pages) {
  const groups = new Map();

  for (const page of pages) {
    const baseSlug = pageBaseSlug(page);
    if (!baseSlug) {
      continue;
    }

    const entries = groups.get(baseSlug) || [];
    entries.push({ page, dateValue: pageDateValue(page) });
    groups.set(baseSlug, entries);
  }

  const plan = new Map();

  for (const [baseSlug, entries] of groups.entries()) {
    entries.sort((a, b) => {
      const byDate = String(a.dateValue).localeCompare(String(b.dateValue));
      return byDate || String(a.page.id).localeCompare(String(b.page.id));
    });

    const used = new Set();
    entries.forEach((entry, index) => {
      let candidate =
        index === 0 ? baseSlug : `${baseSlug}-${datePrefix(entry.dateValue)}`;
      let suffix = 2;

      while (used.has(candidate)) {
        candidate = `${baseSlug}-${datePrefix(entry.dateValue)}-${suffix}`;
        suffix += 1;
      }

      used.add(candidate);
      plan.set(entry.page.id, candidate);
    });
  }

  return plan;
}

function yamlString(value) {
  return JSON.stringify(String(value || ""));
}

function yamlArray(values) {
  return `[${values.map((value) => yamlString(value)).join(", ")}]`;
}

function frontMatter(metadata) {
  const lines = [
    "---",
    ...(metadata.layout ? [`layout: ${yamlString(metadata.layout)}`] : []),
    `title: ${yamlString(metadata.title)}`,
    ...(metadata.titleSource
      ? [`title_source: ${yamlString(metadata.titleSource)}`]
      : []),
    `date: ${metadata.date}`,
    `last_modified_at: ${metadata.lastModifiedAt}`,
    `categories: ${yamlArray(metadata.categories)}`,
    `tags: ${yamlArray(metadata.tags)}`,
    `description: ${yamlString(metadata.description)}`,
    ...(metadata.descriptionSource
      ? [`description_source: ${yamlString(metadata.descriptionSource)}`]
      : []),
    ...(metadata.lang ? [`lang: ${yamlString(metadata.lang)}`] : []),
    ...(metadata.uiLang ? [`ui_lang: ${yamlString(metadata.uiLang)}`] : []),
    ...(metadata.toc !== undefined
      ? [`toc: ${metadata.toc ? "true" : "false"}`]
      : []),
    ...(metadata.permalink
      ? [`permalink: ${yamlString(metadata.permalink)}`]
      : []),
    ...(metadata.originalUrl
      ? [`original_url: ${yamlString(metadata.originalUrl)}`]
      : []),
    ...(metadata.englishUrl
      ? [`english_url: ${yamlString(metadata.englishUrl)}`]
      : []),
    `notion_id: ${yamlString(metadata.notionId)}`,
    `notion_lang: ${yamlString(metadata.notionLang || "ko")}`,
    "---",
    ""
  ];

  return lines.join("\n");
}

function markdownInline(richText = [], context = {}) {
  return richText
    .map((item) => {
      let text = item.plain_text || "";

      if (!text) {
        return "";
      }

      if (item.type === "mention") {
        return mentionMarkdown(item, context);
      }

      if (item.href) {
        text = wrapMarkdownLink(linkLabel(text, item.href, context), item.href);
      }

      const annotations = item.annotations || {};
      if (annotations.code) {
        text = wrapMarkdownInline(text, "`");
      }
      if (annotations.bold) {
        text = wrapMarkdownInline(text, "**");
      }
      if (annotations.italic) {
        text = wrapMarkdownInline(text, "*");
      }
      if (annotations.strikethrough) {
        text = wrapMarkdownInline(text, "~~");
      }
      if (annotations.underline) {
        text = wrapMarkdownInline(text, "<u>", "</u>");
      }

      return text;
    })
    .join("");
}

function mentionMarkdown(item, context = {}) {
  const label = String(item.plain_text || "").trim();

  if (!label) {
    return "";
  }

  const href = String(item.href || "");
  if (href) {
    return `<a class="notion-mention" href="${escapeHtml(href)}">${escapeHtml(linkLabel(label, href, context))}</a>`;
  }

  return `<span class="notion-mention">${escapeHtml(label)}</span>`;
}

function linkLabel(text, href, context = {}) {
  const label = String(text || "");
  const url = String(href || "");

  if (label.trim() !== url.trim()) {
    return label;
  }

  if (
    /^https:\/\/school\.programmers\.co\.kr\/learn\/courses\/\d+\/lessons\/\d+/i.test(
      url
    )
  ) {
    return `Programmers ${problemTitleFromPostTitle(context.title) || "문제"}`;
  }

  return label;
}

function problemTitleFromPostTitle(title = "") {
  return String(title || "")
    .replace(/^\[[^\]]+]\s*/, "")
    .replace(/^(?:프로그래머스|Programmers)\s*-+\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitInlineWhitespace(text) {
  const value = String(text || "");
  const match = value.match(/^(\s*)([\s\S]*?)(\s*)$/);

  return {
    leading: match?.[1] || "",
    body: match?.[2] || "",
    trailing: match?.[3] || ""
  };
}

function wrapMarkdownInline(text, opening, closing = opening) {
  const { leading, body, trailing } = splitInlineWhitespace(text);
  // Ensure body is not just whitespace (including NBSP)
  const isWhitespaceOnly = body.trim().replace(/\u00A0/g, "").length === 0;
  return body && !isWhitespaceOnly ? `${leading}${opening}${body}${closing}${trailing}` : text;
}

function wrapMarkdownLink(text, href) {
  const { leading, body, trailing } = splitInlineWhitespace(text);
  return body ? `${leading}[${body}](${href})${trailing}` : text;
}

async function renderBlocks(blocks, context, depth = 0) {
  const rendered = [];
  let numberedIndex = 1;
  let previousListType = null;

  for (const block of blocks) {
    const isListContinuation = Boolean(
      previousListType && listContinuationBlockTypes.has(block.type)
    );
    const renderDepth = isListContinuation ? depth + 2 : depth;
    const listNumber = block.type === "numbered_list_item" ? numberedIndex : 1;
    const markdown = await renderBlock(block, context, renderDepth, listNumber);
    if (markdown.trim()) {
      rendered.push(markdown);
    }

    if (block.type === "numbered_list_item") {
      numberedIndex += 1;
      previousListType = block.type;
    } else if (block.type === "bulleted_list_item" || block.type === "to_do") {
      numberedIndex = 1;
      previousListType = block.type;
    } else if (!isListContinuation && !listBlockTypes.has(block.type)) {
      numberedIndex = 1;
      previousListType = null;
    }
  }

  return rendered.join("\n\n");
}

async function renderBlock(block, context, depth = 0, listNumber = 1) {
  const type = block.type;
  const value = block[type];
  const indent = "  ".repeat(depth);
  let output;

  switch (type) {
    case "paragraph":
      output = markdownInline(value.rich_text, context);
      break;
    case "heading_1":
      output = `# ${markdownInline(value.rich_text, context).replace(/^\*\*(.*)\*\*$/, "$1")}`;
      break;
    case "heading_2":
      output = `## ${markdownInline(value.rich_text, context).replace(/^\*\*(.*)\*\*$/, "$1")}`;
      break;
    case "heading_3":
      output = `### ${markdownInline(value.rich_text, context).replace(/^\*\*(.*)\*\*$/, "$1")}`;
      break;
    case "heading_4":
      output = `#### ${markdownInline(value.rich_text, context).replace(/^\*\*(.*)\*\*$/, "$1")}`;
      break;
    case "bulleted_list_item":
      output = `${indent}- ${markdownInline(value.rich_text, context)}`;
      break;
    case "numbered_list_item":
      output = `${indent}${listNumber}. ${markdownInline(value.rich_text, context)}`;
      break;
    case "to_do":
      output = `${indent}- [${value.checked ? "x" : " "}] ${markdownInline(value.rich_text, context)}`;
      break;
    case "quote":
    case "callout":
      output = markdownInline(value.rich_text, context);
      break;
    case "code": {
      const plainCode = richTextPlain(value.rich_text);
      const language = markdownCodeLanguage(value.language, plainCode);
      const code = [`\`\`\`${language}`, plainCode, "```"].join("\n");
      output = depth > 0 ? indentMarkdown(code, depth) : code;
      break;
    }
    case "divider":
      output = "<hr>";
      break;
    case "image":
      output = await renderImage(block, context);
      break;
    case "bookmark":
    case "link_preview":
    case "embed":
      output = value.url ? `[${value.url}](${value.url})` : "";
      break;
    case "equation":
      output = `$$\n${value.expression}\n$$`;
      break;
    case "table":
      output = await renderTable(block, depth, context);
      break;
    case "toggle": {
      const summaryText = markdownInline(value.rich_text, context) || "상세 내용";
      const summary = summaryText.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      const children = block.has_children
        ? await renderBlocks(await getBlockChildren(block.id), context, depth)
        : "";
      const details = `<details markdown="1">\n<summary>${summary}</summary>\n\n${children}\n\n</details>`;
      return depth > 0 ? indentMarkdown(details, depth) : details;
    }
    case "child_page":
      output = `- ${value.title}`;
      break;
    case "column_list":
    case "column":
      output = "";
      break;
    case "unsupported":
    case "synced_block":
    case "child_database":
      output = "";
      break;
    default:
      output = "";
      console.warn(`Unsupported Notion block type: ${type}`);
  }

  if (shouldIndentNestedBlock(type, depth) && output.trim()) {
    output = indentMarkdown(output, depth);
  }

  if (block.has_children && type !== "toggle" && type !== "table") {
    const wrapNestedChildren = shouldWrapNestedChildren(type);
    const childDepth =
      wrapNestedChildren ||
      layoutBlockTypes.has(type) ||
      type === "quote" ||
      type === "callout"
        ? depth
        : listBlockTypes.has(type)
          ? depth + 2
          : depth + 1;
    const children = await renderBlocks(
      await getBlockChildren(block.id),
      context,
      childDepth
    );
    if (children.trim()) {
      const renderedChildren = wrapNestedChildren
        ? indentMarkdown(nestedChildrenContainer(children), depth)
        : children;
      const separator = wrapNestedChildren
        ? "\n\n"
        : listBlockTypes.has(type) &&
            startsWithContinuationParagraph(renderedChildren)
          ? "<br>\n"
          : containsMarkdownBlock(renderedChildren)
            ? "\n\n"
            : "\n";
      output = output
        ? `${output}${separator}${renderedChildren}`
        : renderedChildren;
    }
  }

  if (type === "quote" && output.trim()) {
    const quoted = blockquoteMarkdown(output);
    return depth > 0 ? indentMarkdown(quoted, depth) : quoted;
  }

  if (type === "callout" && output.trim()) {
    const callout = calloutMarkdown(output, notionCalloutIcon(block));
    return depth > 0 ? indentMarkdown(callout, depth) : callout;
  }

  return output;
}

function shouldIndentNestedBlock(type, depth) {
  return (
    depth > 0 &&
    !layoutBlockTypes.has(type) &&
    !listBlockTypes.has(type) &&
    !["code", "table", "quote", "callout"].includes(type)
  );
}

function shouldWrapNestedChildren(type) {
  return (
    !layoutBlockTypes.has(type) &&
    !listBlockTypes.has(type) &&
    !["quote", "callout", "code", "table", "toggle"].includes(type)
  );
}

function nestedChildrenContainer(markdown) {
  return `<div class="notion-indent" markdown="1">\n\n${String(markdown || "").trim()}\n\n</div>`;
}

function markdownCodeLanguage(language = "", code = "") {
  const trimmed = String(language || "").trim();

  if (!trimmed) {
    return "";
  }

  if (/^(?:plain\s*text|plaintext|plain|text)$/i.test(trimmed)) {
    return "plaintext";
  }

  const normalized = trimmed.replace(/\s+/g, "-").toLowerCase();
  const codeValue = String(code || "").trim();

  if (normalized === "json") {
    if (/^-\s+\S/m.test(codeValue)) {
      return "yaml";
    }

    try {
      JSON.parse(codeValue);
    } catch {
      return "plaintext";
    }
  }

  return normalized;
}

function containsMarkdownTable(markdown) {
  return /^\s*\|.*\|\s*$/m.test(markdown);
}

function containsMarkdownBlock(markdown) {
  return containsMarkdownTable(markdown) || /^\s*```/m.test(markdown);
}

function startsWithContinuationParagraph(markdown) {
  const firstLine = String(markdown || "")
    .split("\n")
    .find((line) => line.trim());

  if (!firstLine || !/^\s+/.test(firstLine)) {
    return false;
  }

  const trimmed = firstLine.trimStart();
  return (
    !/^(?:[-*+]|\d+\.|\[[ xX]\])\s+/.test(trimmed) &&
    !/^(```|\|+|!\[[^\]]*])/.test(trimmed)
  );
}

function blockquoteMarkdown(markdown) {
  return normalizeBlockquoteContent(markdown)
    .split("\n")
    .map((line) => (line.trim() ? `> ${line}` : ">"))
    .join("\n");
}

function normalizeBlockquoteContent(markdown) {
  return String(markdown || "").replace(
    /^ {4,}(?=!\[|\*\*|[-*+]\s+|\d+\.\s+|```|<details|<\/details>|<summary|<\/summary>)/gm,
    ""
  );
}

function normalizeIndentedBlockquotes(markdown) {
  return String(markdown || "")
    .replace(/^ {4,}(> ?)/gm, "$1")
    .replace(
      /^([ \t]*>\s?) {4,}(?=!\[|\*\*|[-*+]\s+|\d+\.\s+|```|<details|<\/details>|<summary|<\/summary>)/gm,
      "$1"
    );
}

function notionCalloutIcon(block) {
  const icon = block.callout?.icon;

  if (icon?.type === "emoji" && icon.emoji) {
    return icon.emoji;
  }

  return "💡";
}

function calloutMarkdown(markdown, icon = "💡") {
  const content = normalizeCalloutContent(markdown);
  const { title, body } = splitCalloutContent(content);
  const normalizedTitle = normalizeCalloutTitle(title);

  const lines = [
    '<div class="notion-callout" markdown="1">',
    '',
    '<div class="notion-callout-heading">',
    `<span class="notion-callout-icon">${escapeHtml(icon)}</span>` +
      (normalizedTitle ? ` <span class="notion-callout-title">${normalizedTitle}</span>` : ""),
    '</div>',
    '',
    body,
    '',
    "</div>"
  ];

  return lines.join("\n");
}

function normalizeCalloutContent(markdown) {
  const text = String(markdown || "").trim();
  const unwrapped = unwrapAccidentalCalloutPlaintextBlocks(text);
  const dedented = dedentCalloutContent(unwrapped);

  // Remove any surrounding ```plaintext``` fences leftover and trim
  const body = String(dedented || "").replace(/```(?:plain\s*text|plaintext|plain|text)\n([\s\S]*?)\n```/gi, (_, inner) => inner.trim());

  return String(body || "")
    .split("\n")
    .map((line) => line.trimStart()) // Aggressively remove leading spaces
    .join("\n")
    .trim();
}

function dedentCalloutContent(markdown) {
  const lines = String(markdown || "").split("\n");
  const trimmed = trimEmptyLines(lines);
  const indentLengths = trimmed
    .filter((line) => line.trim())
    .map((line) => line.match(/^\s*/)[0].length);
  const minIndent = indentLengths.length ? Math.min(...indentLengths) : 0;

  return trimmed
    .map((line) => (minIndent ? line.slice(minIndent) : line))
    .join("\n");
}

function trimEmptyLines(lines) {
  let start = 0;
  let end = lines.length;

  while (start < end && !lines[start].trim()) {
    start += 1;
  }

  while (end > start && !lines[end - 1].trim()) {
    end -= 1;
  }

  return lines.slice(start, end);
}

function splitCalloutContent(markdown) {
  const lines = String(markdown || "").split("\n");
  const titleIndex = lines.findIndex((line) => line.trim());

  if (titleIndex === -1) {
    return { title: "", body: "" };
  }

  return {
    title: lines[titleIndex].trim(),
    body: [...lines.slice(0, titleIndex), ...lines.slice(titleIndex + 1)]
      .join("\n")
      .trim()
  };
}

function normalizeCalloutTitle(title) {
  let t = String(title || "").trim();

  // strip surrounding backticks or fences
  t = t.replace(/^`+|`+$/g, "");

  // common markdown wrappers
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
  t = t.replace(/\*([^*]+)\*/g, "$1");
  t = t.replace(/__([^_]+)__/g, "$1");
  t = t.replace(/_([^_]+)_/g, "$1");

  // remove accidental leftover literal markers at edges
  t = t.replace(/^\*+|\*+$/g, "").replace(/^_+|_+$/g, "").trim();

  return t;
}

function unwrapAccidentalCalloutPlaintextBlocks(markdown) {
  const text = String(markdown || "").trim();
  const unwrappedWhole = unwrapOuterPlaintextFence(text);

  if (unwrappedWhole !== text) {
    return unwrappedWhole;
  }

  const unwrappedTrailing = unwrapTrailingPlaintextFence(text);

  if (unwrappedTrailing !== text) {
    return unwrappedTrailing;
  }

  return text.replace(
    /```(?:plain\s*text|plaintext|plain|text)\n([\s\S]*?)\n```/gi,
    (match, body) => (looksLikeRenderedMarkdownBody(body) ? body.trim() : match)
  );
}

function unwrapOuterPlaintextFence(markdown) {
  const lines = String(markdown || "").split("\n");
  const lastLine = lines[lines.length - 1];

  if (
    lines.length < 3 ||
    !isPlaintextFence(lines[0]) ||
    !isFenceEnd(lastLine)
  ) {
    return markdown;
  }

  const body = lines.slice(1, -1).join("\n").trim();

  return looksLikeRenderedMarkdownBody(body) ? body : markdown;
}

function unwrapTrailingPlaintextFence(markdown) {
  const lines = String(markdown || "").split("\n");
  const startIndex = lines.findIndex(isPlaintextFence);
  const lastLine = lines[lines.length - 1];

  if (
    startIndex === -1 ||
    !isFenceEnd(lastLine) ||
    startIndex >= lines.length - 1
  ) {
    return markdown;
  }

  const before = lines.slice(0, startIndex).join("\n").trimEnd();
  const body = lines
    .slice(startIndex + 1, -1)
    .join("\n")
    .trim();

  if (!looksLikeRenderedMarkdownBody(body)) {
    return markdown;
  }

  return [before, body].filter(Boolean).join("\n\n");
}

function isPlaintextFence(line) {
  return /^```(?:plain\s*text|plaintext|plain|text)\s*$/i.test(
    String(line || "").trim()
  );
}

function isFenceEnd(line) {
  return String(line || "").trim() === "```";
}

function looksLikeRenderedMarkdownBody(body) {
  const text = String(body || "").trim();

  if (!text) {
    return false;
  }

  if (
    /!\[[^\]]*]\(/.test(text) ||
    /```/.test(text) ||
    /<details\b|<\/details>/.test(text) ||
    /^\s{0,3}#{1,6}\s+/m.test(text) ||
    /^\s{0,3}[-*+]\s+/m.test(text) ||
    /^\s{0,3}\d+\.\s+/m.test(text) ||
    /^\s*\|.*\|\s*$/m.test(text)
  ) {
    return true;
  }

  if (
    /\*\*[^*]+\*\*/.test(text) ||
    /\*[^*\s][^*]*\*/.test(text) ||
    /~~[^~]+~~/.test(text) ||
    /<u>.*?<\/u>/.test(text) ||
    /\[[^\]]+\]\([^)]+\)/.test(text)
  ) {
    return true;
  }

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return false;
  }

  const codeLikeLines = lines.filter(
    (line) =>
      /^```/.test(line) ||
      /^[>{|]/.test(line) ||
      /^[A-Za-z0-9_$]+\s*[:=]+\s*/.test(line) ||
      /[{}\[\]();=<>]/.test(line)
  );

  return codeLikeLines.length < lines.length;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeMarkdown(markdown) {
  return normalizeIndentedBlockquotes(
    splitJoinedMarkdownBlocks(
      unwrapMarkdownTableFences(
        normalizeFenceLines(normalizeCodeFenceLanguages(markdown))
      )
    )
  )
    .replace(/^([ \t]*)-([^\s-].*)$/gm, "$1- $2")
    .replace(/^ {4,}(\|.+\|[ \t]*)$/gm, "  $1")
    .replace(/^([ \t]*(?:[-*+]|\d+\.)\s+.+)\n([ \t]*```)/gm, "$1\n\n$2")
    .replace(
      /^([ \t]*(?:[-*+]|\d+\.)\s+.+)\n([ \t]*\|.+\|[ \t]*$)/gm,
      "$1\n\n$2"
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeCodeFenceLanguages(markdown) {
  return String(markdown || "").replace(
    /^([ \t]*```)plain text([ \t]*)$/gim,
    "$1plaintext$2"
  );
}

function splitJoinedMarkdownBlocks(markdown) {
  const lines = String(markdown || "").split("\n");
  const normalized = [];
  let inFence = false;

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      normalized.push(line);
      continue;
    }

    if (inFence) {
      normalized.push(line);
      continue;
    }

    const imageListMatch = line.match(/^(\s*!\[[^\]]*]\([^)]+\))([-*+]\s+.*)$/);
    if (imageListMatch) {
      normalized.push(imageListMatch[1], "");

      let nestedIndent = "";
      for (let i = normalized.length - 3; i >= 0; i -= 1) {
        const listMatch = normalized[i]?.match(/^(\s*)(?:[-*+]|\d+\.)\s+/);
        if (listMatch) {
          nestedIndent = `${listMatch[1]}  `;
          break;
        }
      }

      normalized.push(`${nestedIndent}${imageListMatch[2]}`);
      continue;
    }

    normalized.push(line.replace(/(\))(?=#{1,6}\s+)/g, "$1\n\n"));
  }

  return normalized.join("\n");
}

function unwrapMarkdownTableFences(markdown) {
  return String(markdown || "").replace(
    /```([^\n]*)\n([\s\S]*?)\n```/g,
    (match, lang, body) => {
      const normalizedLang = lang.trim().toLowerCase();
      const canUnwrap =
        !normalizedLang ||
        ["plain", "plaintext", "text"].includes(normalizedLang);

      if (!canUnwrap) {
        return match;
      }

      const lines = body
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      return isMarkdownTable(lines) ? lines.join("\n") : match;
    }
  );
}

function isMarkdownTable(lines) {
  return (
    lines.length >= 2 &&
    lines.every((line) => /^\|.*\|$/.test(line)) &&
    lines.some((line) => /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|$/.test(line))
  );
}

function normalizeFenceLines(markdown) {
  const lines = String(markdown || "").split("\n");
  const normalized = [];
  let inFence = false;

  for (const line of lines) {
    const fenceIndex = line.indexOf("```");

    if (fenceIndex === -1) {
      normalized.push(line);
      continue;
    }

    if (!inFence) {
      const before = line.slice(0, fenceIndex).trimEnd();

      if (before.trim() && !/^>+\s*$/.test(before.trim())) {
        normalized.push(before);
        normalized.push(line.slice(fenceIndex));
      } else {
        normalized.push(line);
      }

      inFence = true;
      continue;
    }

    const closing = line.slice(0, fenceIndex + 3);
    const after = line.slice(fenceIndex + 3).trimStart();
    normalized.push(closing);

    if (after) {
      normalized.push("");
      normalized.push(after);
    }

    inFence = false;
  }

  return normalized.join("\n");
}

function markdownTableCell(richText = [], context = {}) {
  return markdownInline(richText, context)
    .replace(/\r?\n/g, "<br>")
    .replace(/\|/g, "\\|")
    .trim();
}

function indentMarkdown(markdown, depth = 0) {
  const prefix = "  ".repeat(depth);
  if (!prefix) {
    return markdown;
  }

  return markdown
    .split("\n")
    .map((line) => (line ? `${prefix}${line}` : line))
    .join("\n");
}

async function renderTable(block, depth = 0, context = {}) {
  const rows = await getBlockChildren(block.id);
  const cells = rows
    .filter((row) => row.type === "table_row")
    .map((row) =>
      row.table_row.cells.map((cell) => markdownTableCell(cell, context))
    );

  if (!cells.length) {
    return "";
  }

  const width = Math.max(...cells.map((row) => row.length));
  const normalizedRows = cells.map((row) => {
    const next = [...row];
    while (next.length < width) {
      next.push("");
    }
    return next;
  });

  const [header, ...body] = normalizedRows;
  const separator = Array.from({ length: width }, () => "---");
  const table = [header, separator, ...body]
    .map((row) => `| ${row.join(" | ")} |`)
    .join("\n");

  return indentMarkdown(table, depth);
}

async function renderImage(block, context) {
  const image = block.image;
  const caption = markdownInline(image.caption, context);
  const source =
    image.type === "external" ? image.external.url : image.file?.url;

  if (!source) {
    return "";
  }

  let url = source;
  if (image.type === "file") {
    url = await downloadNotionAsset(source, context);
  }

  const alt = caption || "image";
  const imageMarkdown = `![${alt}](${url})`;
  return caption ? `${imageMarkdown}\n_${caption}_` : imageMarkdown;
}

async function downloadNotionAsset(url, context) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download Notion asset: ${response.status} ${response.statusText}`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const extension =
    extensionFromContentType(contentType) || extensionFromUrl(url) || ".png";
  const buffer = Buffer.from(await response.arrayBuffer());
  const hash = createHash("sha1").update(buffer).digest("hex").slice(0, 10);
  const fileName = `${String(++context.assetIndex).padStart(2, "0")}-${hash}${extension}`;
  const assetDir = path.join(ASSETS_DIR, context.slug);
  const relativePath = path.join(
    "assets",
    "img",
    "notion",
    context.slug,
    fileName
  );

  await mkdir(assetDir, { recursive: true });
  await writeFile(path.join(ROOT, relativePath), buffer);

  return `/${relativePath.split(path.sep).join("/")}`;
}

function extensionFromContentType(contentType) {
  const normalized = contentType.split(";")[0].trim().toLowerCase();
  const extensions = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg"
  };

  return extensions[normalized];
}

function extensionFromUrl(url) {
  const pathname = new URL(url).pathname;
  const extension = path.extname(pathname);
  return extension && extension.length <= 6 ? extension : "";
}

async function buildPost(page, urlSlugPlan = new Map()) {
  const notionTitle = propertyText(
    findProperty(page, propertyNames.title, "title")
  );
  if (!notionTitle) {
    throw new Error(`Notion page ${page.id} has no title.`);
  }

  const dateValue = pageDateValue(page);
  const slugProperty = findProperty(page, propertyNames.slug);
  const requestedSlug = slugify(propertyText(slugProperty) || notionTitle);
  const lastModifiedAt = formatDateForJekyll(page.last_edited_time);
  const existingKoreanState = await existingGeneratedPostState(page.id, "ko");
  const existingEnglishState = await existingGeneratedPostState(page.id, "en");
  const existingKoreanPath = existingKoreanState.filePath;
  const existingEnglishPath = existingEnglishState.filePath;

  // Check if Notion sync is disabled manually in the post
  if (existingKoreanPath) {
    const content = await readFile(existingKoreanPath, "utf8");
    const syncEnabled = frontMatterValue(content, "notion_sync");
    if (syncEnabled === "false") {
      console.log(`> Skipping Notion import for "${notionTitle}" (notion_sync: false)`);
      return [
        { notionId: page.id, notionLang: "ko", filePath: existingKoreanPath, skipped: true },
        ...(GENERATE_ENGLISH ? [{ notionId: page.id, notionLang: "en", filePath: existingEnglishPath, skipped: true }] : [])
      ];
    }
  }

  const slug = existingKoreanPath
    ? slugFromKoreanPostPath(existingKoreanPath)
    : requestedSlug;
  const urlSlug = existingEnglishPath
    ? slugFromEnglishPostPath(existingEnglishPath)
    : urlSlugPlan.get(page.id) || slug;
  const date = formatDateForJekyll(dateValue);
  const fileName = `${datePrefix(dateValue)}-${slug}.md`;
  const filePath = existingKoreanPath || path.join(POSTS_DIR, fileName);
  const englishPath =
    existingEnglishPath || path.join(EN_POSTS_DIR, urlSlug, "index.md");
  const koreanCurrent =
    !FORCE_IMPORT &&
    existingKoreanPath &&
    existingKoreanState.lastModifiedAt === lastModifiedAt;
  const englishCurrent =
    !FORCE_IMPORT &&
    (!GENERATE_ENGLISH ||
      (existingEnglishPath &&
        existingEnglishState.lastModifiedAt === lastModifiedAt));

  if (koreanCurrent && englishCurrent) {
    const posts = [
      {
        notionId: page.id,
        notionLang: "ko",
        filePath,
        skipped: true
      }
    ];

    if (GENERATE_ENGLISH) {
      posts.push({
        notionId: page.id,
        notionLang: "en",
        filePath: englishPath,
        skipped: true
      });
    }

    return posts;
  }

  const existingTitleState = await existingPostTitleState(filePath);
  const title =
    existingTitleState.source === "manual" && existingTitleState.title
      ? existingTitleState.title
      : notionTitle;
  const titleSource = existingTitleState.source === "manual" ? "manual" : "";
  const notionCategories = normalizeCategories(
    propertyList(findProperty(page, propertyNames.categories))
  );
  const existingCategories = await existingPostCategories(filePath);
  const categories = resolvePostCategories(
    notionCategories,
    existingCategories
  );
  const tags = propertyList(findProperty(page, propertyNames.tags)).filter(
    Boolean
  );
  
  const blocks = await getBlockChildren(page.id);
  const body = normalizeMarkdown(
    await renderBlocks(blocks, { slug, assetIndex: 0, title })
  );
  const generatedDescription = createDescription(body, title);
  const existingDescriptionState = await existingPostDescriptionState(filePath);
  const existingDescription = existingDescriptionState.description;
  const fallbackDescription = existingDescription || generatedDescription;
  const descriptionSource = existingDescription ? "manual" : "excerpt";
  const koreanUrl = `/posts/${urlSlug}/`;
  const englishUrl = `/en/posts/${urlSlug}/`;

  const metadata = {
    title,
    date,
    lastModifiedAt,
    categories: categories.length ? categories : ["Notion"],
    tags,
    description: fallbackDescription,
    descriptionSource,
    permalink: urlSlug === slug ? "" : koreanUrl,
    englishUrl,
    notionId: page.id,
    notionLang: "ko",
    titleSource
  };

  const posts = [
    koreanCurrent
      ? {
          notionId: page.id,
          notionLang: "ko",
          filePath,
          skipped: true
        }
      : {
          notionId: page.id,
          notionLang: "ko",
          filePath,
          content: `${frontMatter(metadata)}${body.trim()}\n`
        }
  ];

  if (GENERATE_ENGLISH) {
    if (englishCurrent) {
      posts.push({
        notionId: page.id,
        notionLang: "en",
        filePath: englishPath,
        skipped: true
      });
    } else {
      const existingEnglishTitleState =
        await existingPostTitleState(englishPath);
      const englishTitle =
        existingEnglishTitleState.source === "manual" &&
        existingEnglishTitleState.title
          ? existingEnglishTitleState.title
          : await translateText(title);
      const englishTitleSource =
        existingEnglishTitleState.source === "manual" ? "manual" : titleSource;
      const existingEnglishDescriptionState = await existingPostDescriptionState(englishPath);
      const englishDescription =
        existingEnglishDescriptionState.description ||
        (await translateText(fallbackDescription));
      const englishDescriptionSource = existingEnglishDescriptionState.description
          ? existingEnglishDescriptionState.source || descriptionSource
          : descriptionSource;
      const englishBody = normalizeMarkdown(await translateMarkdown(body));
      const englishMetadata = {
        layout: "post",
        title: englishTitle || title,
        date,
        lastModifiedAt,
        categories: metadata.categories,
        tags,
        description: englishDescription || fallbackDescription,
        descriptionSource: englishDescriptionSource,
        lang: "en",
        uiLang: "ko-KR",
        toc: true,
        permalink: englishUrl,
        originalUrl: koreanUrl,
        notionId: page.id,
        notionLang: "en",
        titleSource: englishTitleSource
      };

      posts.push({
        notionId: page.id,
        notionLang: "en",
        filePath: englishPath,
        content: `${frontMatter(englishMetadata)}${englishBody.trim()}\n`
      });
    }
  }

  return posts;
}

const translationCache = new Map();
const TRANSLATE_CHUNK_SIZE = 1200;
const TRANSLATE_RETRY_DELAYS = [500, 1500, 3000];
const TRANSLATE_RETRY_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

async function translateText(text, targetLanguage = "en") {
  const value = String(text || "");

  if (!value.trim()) {
    return value;
  }

  const cacheKey = `${targetLanguage}:${value}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  const translatedParts = [];
  for (const part of splitLongText(value, TRANSLATE_CHUNK_SIZE)) {
    translatedParts.push(await translateChunk(part, targetLanguage));
  }

  const translated = translatedParts.join("");
  translationCache.set(cacheKey, translated);
  return translated;
}

async function translateChunk(text, targetLanguage) {
  const value = String(text || "");

  if (!value.trim()) {
    return value;
  }

  try {
    return await requestTranslation(value, targetLanguage);
  } catch (error) {
    if (
      !String(error.message).includes("Translate API 400") ||
      value.length <= 1
    ) {
      throw error;
    }

    const fallbackChunks = splitLongText(
      value,
      Math.max(1, Math.floor(value.length / 2))
    );
    if (fallbackChunks.length <= 1) {
      throw error;
    }

    const translated = [];
    for (const chunk of fallbackChunks) {
      translated.push(await translateChunk(chunk, targetLanguage));
    }

    return translated.join("");
  }
}

async function requestTranslation(value, targetLanguage) {
  const params = new URLSearchParams({
    client: "gtx",
    sl: "ko",
    tl: targetLanguage,
    dt: "t",
    q: value
  });

  for (
    let attempt = 0;
    attempt <= TRANSLATE_RETRY_DELAYS.length;
    attempt += 1
  ) {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?${params}`
    );
    if (response.ok) {
      const data = await response.json();
      return (data[0] || []).map((part) => part[0]).join("");
    }

    const detail = await response.text();
    const message = `Translate API ${response.status} ${response.statusText}: ${detail.slice(0, 200)}`;
    const shouldRetry =
      TRANSLATE_RETRY_STATUSES.has(response.status) &&
      attempt < TRANSLATE_RETRY_DELAYS.length;

    if (!shouldRetry) {
      if (TRANSLATE_RETRY_STATUSES.has(response.status)) {
        console.warn(`Warning: ${message}`);
        console.warn(
          "Warning: Keeping the original text because translation is temporarily unavailable."
        );
        return value;
      }

      throw new Error(message);
    }

    await wait(TRANSLATE_RETRY_DELAYS[attempt]);
  }

  return value;
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function translateMarkdown(markdown) {
  const protectedSegments = [];
  const tableProtectedMarkdown = await protectMarkdownTables(
    markdown,
    protectedSegments
  );
  const protectedMarkdown = tableProtectedMarkdown.replace(
    /```[\s\S]*?```|`[^`\n]+`|!\[[^\]]*]\([^)]*\)|\[[^\]]+]\([^)]*\)/g,
    (match) => {
      const token = `ZXCVBNOTIONSEGMENT${protectedSegments.length}TOKEN`;
      protectedSegments.push({ token, value: match });
      return token;
    }
  );

  const chunks = splitTranslationChunks(protectedMarkdown);
  const translatedChunks = [];

  for (const chunk of chunks) {
    translatedChunks.push(await translateText(chunk));
  }

  let translated = translatedChunks.join("");
  for (const segment of protectedSegments) {
    translated = translated.replaceAll(segment.token, segment.value);
  }

  return translated;
}

async function protectMarkdownTables(markdown, protectedSegments) {
  const lines = String(markdown || "").split("\n");
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (
      isMarkdownTableLine(line) &&
      isMarkdownTableSeparatorLine(lines[index + 1] || "")
    ) {
      const tableLines = [line, lines[index + 1]];
      index += 2;

      while (index < lines.length && isMarkdownTableLine(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }

      index -= 1;

      const token = `ZXCVBNOTIONSEGMENT${protectedSegments.length}TOKEN`;
      protectedSegments.push({
        token,
        value: await translateMarkdownTable(tableLines.join("\n"))
      });
      output.push(token);
      continue;
    }

    output.push(line);
  }

  return output.join("\n");
}

function isMarkdownTableLine(line = "") {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isMarkdownTableSeparatorLine(line = "") {
  return /^\s*\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|\s*$/.test(line);
}

async function translateMarkdownTable(table) {
  const translatedLines = [];

  for (const line of table.split("\n")) {
    if (isMarkdownTableSeparatorLine(line)) {
      translatedLines.push(line);
      continue;
    }

    const match = line.match(/^(\s*)\|(.*)\|\s*$/);
    if (!match) {
      translatedLines.push(line);
      continue;
    }

    const indent = match[1];
    const cells = splitMarkdownTableCells(match[2]);
    const translatedCells = [];

    for (const cell of cells) {
      translatedCells.push(await translateInlineMarkdown(cell));
    }

    translatedLines.push(`${indent}| ${translatedCells.join(" | ")} |`);
  }

  return translatedLines.join("\n");
}

function splitMarkdownTableCells(row) {
  const cells = [];
  let current = "";
  let escaped = false;

  for (const character of String(row || "")) {
    if (character === "|" && !escaped) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
    escaped = character === "\\" && !escaped;
    if (character !== "\\") {
      escaped = false;
    }
  }

  cells.push(current.trim());
  return cells;
}

async function translateInlineMarkdown(markdown) {
  const protectedSegments = [];
  const protectedMarkdown = String(markdown || "").replace(
    /`[^`\n]+`|!\[[^\]]*]\([^)]*\)|\[[^\]]+]\([^)]*\)/g,
    (match) => {
      const token = `ZXCVBNOTIONINLINE${protectedSegments.length}TOKEN`;
      protectedSegments.push({ token, value: match });
      return token;
    }
  );

  let translated = await translateText(protectedMarkdown);
  for (const segment of protectedSegments) {
    translated = translated.replaceAll(segment.token, segment.value);
  }

  return translated.replace(/\|/g, "\\|").trim();
}

function splitTranslationChunks(text, maxLength = TRANSLATE_CHUNK_SIZE) {
  const paragraphs = text.split(/(\n{2,})/);
  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length > maxLength && current) {
      chunks.push(current);
      current = "";
    }

    if (paragraph.length > maxLength) {
      chunks.push(...splitLongText(paragraph, maxLength));
    } else {
      current += paragraph;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function splitLongText(text, maxLength = TRANSLATE_CHUNK_SIZE) {
  const value = String(text || "");

  if (value.length <= maxLength) {
    return [value];
  }

  const chunks = [];
  let current = "";
  const segments = value.split(/(\n{2,}|\n|[.!?。！？]\s+|[,;:]\s+|\s+)/);

  for (const segment of segments) {
    if (!segment) {
      continue;
    }

    if (current && current.length + segment.length > maxLength) {
      chunks.push(current);
      current = "";
    }

    if (segment.length > maxLength) {
      if (current) {
        chunks.push(current);
        current = "";
      }

      for (let index = 0; index < segment.length; index += maxLength) {
        chunks.push(segment.slice(index, index + maxLength));
      }
    } else {
      current += segment;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function normalizeDescriptionText(line) {
  return String(line || "")
    .trim()
    .replace(/^(공부한 내용|오늘 학습한 개념|학습한 내용|학습 내용|문제|오류|해결|회고|정리|개요|참고|느낀 점)\s*[:\-–—]?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitleForDescription(title = "") {
  return normalizeDescriptionText(
    String(title || "")
      .replace(/^\[?TIL\]?\s*[-–—]?\s*/i, "")
      .replace(/-\d{6,8}$/, "")
      .replace(/[-_]+/g, " ")
  );
}

function generateTitleDescription(title = "") {
  const value = normalizeTitleForDescription(title);
  if (!value) return "";

  if (/프로그래머스|Programmers/i.test(title)) {
    return `${value} 문제 풀이 과정을 정리한 글입니다.`;
  }

  if (/BaekJoon|BOJ/i.test(title)) {
    return `${value} 문제 풀이 과정을 정리한 글입니다.`;
  }

  if (/TIL/i.test(title)) {
    return `${value}에 대한 학습 내용을 정리한 글입니다.`;
  }

  return `${value}에 대한 정리입니다.`;
}

function splitDescriptionBlocks(markdown) {
  const withoutCode = String(markdown || "")
    .replace(/```[\s\S]*?```/g, "\n")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "\n")
    .trim();

  const blocks = [];
  let current = [];

  for (const rawLine of withoutCode.split("\n")) {
    if (!rawLine.trim()) {
      if (current.length) {
        blocks.push(current);
        current = [];
      }
      continue;
    }

    current.push(rawLine);
  }

  if (current.length) {
    blocks.push(current);
  }

  return blocks;
}

function isListLine(rawLine) {
  const value = String(rawLine || "").trim();
  return /^([-*+]|\d+\.)\s+/.test(value) || /^\[[ xX]]\s+/.test(value);
}

function summarizeDescriptionBlock(block, title = "") {
  const titleText = cleanDescriptionLine(title);
  let lines = block
    .map((line) => cleanDescriptionLine(line))
    .filter(Boolean)
    .filter((line) => !isGenericDescriptionHeading(line));

  if (!lines.length) {
    return null;
  }

  const rawFirstLine = String(block[0] || "").trim();
  const firstIsHeading = /^#{1,6}\s*/.test(rawFirstLine);
  if (firstIsHeading && lines.length > 1) {
    lines = lines.slice(1);
  }

  const filteredLines = lines.filter((line) => line !== titleText);
  if (filteredLines.length) {
    lines = filteredLines;
  }

  if (lines.length === 1) {
    return lines[0];
  }

  return lines.join(' ');
}

function createDescription(markdown, title = "") {
  const titleDescription = generateTitleDescription(title);
  if (titleDescription) {
    return trimDescription(titleDescription);
  }

  const candidates = descriptionCandidates(markdown, title).map(normalizeDescriptionText);
  const selected = [];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const next = [...selected, candidate].join(' ');
    if (next.length > 150 && selected.length) {
      break;
    }

    selected.push(candidate);

    if (next.length >= 80 || selected.length >= 2) {
      break;
    }
  }

  return trimDescription(selected.join(' ') || titleDescription);
}

function descriptionCandidates(markdown, title = "") {
  const titleText = cleanDescriptionLine(title);
  const seen = new Set();
  const candidates = [];
  const withoutCode = String(markdown || "")
    .replace(/```[\s\S]*?```/g, "\n")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "\n");

  for (const rawLine of withoutCode.split("\n")) {
    if (isSkippableDescriptionLine(rawLine)) {
      continue;
    }

    const line = cleanDescriptionLine(rawLine);
    if (!line || line.length < 8 || isGenericDescriptionHeading(line)) {
      continue;
    }

    if (titleText && (line === titleText || titleText.includes(line))) {
      continue;
    }

    const key = line.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    candidates.push(line);
  }

  return candidates;
}

function isSkippableDescriptionLine(line) {
  const value = String(line || "").trim();
  return (
    !value ||
    /^\|.*\|$/.test(value) ||
    /^:?-{3,}:?$/.test(value) ||
    /^---+$/.test(value) ||
    /^https?:\/\//.test(value) ||
    /^<[^>]+>$/.test(value)
  );
}

function cleanDescriptionLine(line) {
  return String(line || "")
    .replace(/\[[^\]]+]\([^)]*\)/g, (match) =>
      match.replace(/^\[|\]\([^)]*\)$/g, "")
    )
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^>+\s*/, "")
    .replace(/^#{1,6}\s*/, "")
    .replace(/^[\s>*-]*(?:[-*+]|\d+\.)\s+/, "")
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\[[ xX]]\s+/, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericDescriptionHeading(line) {
  return [
    "공부한 내용",
    "오늘 할 일",
    "내일 할 일",
    "문제",
    "오류",
    "문제와 오류",
    "해결",
    "회고",
    "정리",
    "개요",
    "목차",
    "참고",
    "느낀 점"
  ].includes(line);
}

function trimDescription(text, maxLength = 150) {
  const value = String(text || "")
    .replace(/\s+/g, " ")
    .trim();

  if (value.length <= maxLength) {
    return value;
  }

  const trimmed = value.slice(0, maxLength + 1);
  const breakpoint = Math.max(
    trimmed.lastIndexOf("."),
    trimmed.lastIndexOf("!"),
    trimmed.lastIndexOf("?"),
    trimmed.lastIndexOf("다"),
    trimmed.lastIndexOf("요"),
    trimmed.lastIndexOf(",")
  );

  if (breakpoint >= 60) {
    return trimmed.slice(0, breakpoint + 1).trim();
  }

  return `${value.slice(0, maxLength - 1).trim()}…`;
}

async function removeStaleGeneratedPosts(currentPosts) {
  const currentByNotionKey = new Map(
    currentPosts.map((post) => [
      notionKey(post.notionId, post.notionLang),
      post.filePath
    ])
  );
  const files = [
    ...(await generatedMarkdownFiles(POSTS_DIR)),
    ...(await generatedMarkdownFiles(EN_POSTS_DIR))
  ];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    const match = content.match(/^notion_id:\s*["']?([^"'\n]+)["']?/m);

    if (!match) {
      continue;
    }

    const notionId = match[1];
    const langMatch = content.match(/^notion_lang:\s*["']?([^"'\n]+)["']?/m);
    const notionLang = langMatch?.[1] || "ko";
    const nextPath = currentByNotionKey.get(notionKey(notionId, notionLang));
    if (!nextPath || nextPath !== filePath) {
      await rm(filePath);
      console.log(
        `Removed stale Notion post: ${path.relative(ROOT, filePath)}`
      );
    }
  }
}

async function generatedMarkdownFiles(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await generatedMarkdownFiles(filePath)));
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(filePath);
      }
    }

    return files;
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function notionKey(notionId, notionLang) {
  return `${notionId}:${notionLang || "ko"}`;
}

async function main() {
  await mkdir(POSTS_DIR, { recursive: true });

  const pages = await queryDatabase();
  const publishedPages = pages.filter(isPublished);
  const skippedCount = pages.length - publishedPages.length;
  const urlSlugPlan = createUrlSlugPlan(publishedPages);

  console.log(`Fetched ${pages.length} Notion page(s).`);
  console.log(`Importing ${publishedPages.length} published page(s).`);
  if (skippedCount) {
    console.log(`Skipped ${skippedCount} unpublished page(s).`);
  }

  const posts = [];
  for (const page of publishedPages) {
    const pagePosts = await buildPost(page, urlSlugPlan);
    posts.push(...pagePosts);
  }

  await removeStaleGeneratedPosts(posts);

  let skippedPosts = 0;
  let writtenPosts = 0;

  for (const post of posts) {
    if (post.skipped) {
      skippedPosts += 1;
      continue;
    }

    await mkdir(path.dirname(post.filePath), { recursive: true });
    await writeFile(post.filePath, post.content);
    writtenPosts += 1;
    console.log(`Wrote ${path.relative(ROOT, post.filePath)}`);
  }

  if (skippedPosts) {
    console.log(`Skipped ${skippedPosts} unchanged generated post file(s).`);
  }

  if (!writtenPosts) {
    console.log("No changed Notion post files to write.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
