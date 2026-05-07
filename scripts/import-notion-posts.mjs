import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const NOTION_VERSION = process.env.NOTION_VERSION || '2022-06-28';
const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, '_posts');
const EN_POSTS_DIR = path.join(ROOT, 'en', 'posts');
const ASSETS_DIR = path.join(ROOT, 'assets', 'img', 'notion');
const GENERATE_ENGLISH = process.env.NOTION_GENERATE_ENGLISH !== 'false';

const token = process.env.NOTION_TOKEN;
const databaseId = process.env.DATABASE_ID || process.env.NOTION_DATABASE_ID;

if (!token) {
  throw new Error('Missing NOTION_TOKEN environment variable.');
}

if (!databaseId) {
  throw new Error('Missing DATABASE_ID environment variable.');
}

const propertyNames = {
  title: ['제목', 'title', 'Title', '이름', 'Name'],
  date: ['날짜', 'date', 'Date', '작성일'],
  categories: ['카테고리', 'categories', 'Categories', 'category', 'Category'],
  tags: ['태그', 'tags', 'Tags', 'tag', 'Tag'],
  description: ['설명', 'description', 'Description', '요약', 'summary', 'Summary'],
  published: ['공개여부', '공개', 'published', 'Published', 'status', 'Status'],
  slug: ['slug', 'Slug', 'URL', 'url']
};

const publishedValues = new Set([
  '공개',
  '게시',
  '게시됨',
  '발행',
  '발행됨',
  'published',
  'publish',
  'public',
  'yes',
  'true',
  'done',
  '완료'
]);

const layoutBlockTypes = new Set(['column_list', 'column']);
const listBlockTypes = new Set(['bulleted_list_item', 'numbered_list_item', 'to_do']);

async function notion(pathname, options = {}) {
  const response = await fetch(`https://api.notion.com/v1${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Notion API ${response.status} ${response.statusText}: ${body}`);
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
      method: 'POST',
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
    const query = new URLSearchParams({ page_size: '100' });
    if (startCursor) {
      query.set('start_cursor', startCursor);
    }

    const response = await notion(`/blocks/${blockId}/children?${query.toString()}`, {
      method: 'GET'
    });

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
    return Object.values(page.properties).find((property) => property.type === fallbackType);
  }

  return undefined;
}

function richTextPlain(richText = []) {
  return richText.map((item) => item.plain_text || '').join('').trim();
}

function propertyText(property) {
  if (!property) {
    return '';
  }

  switch (property.type) {
    case 'title':
      return richTextPlain(property.title);
    case 'rich_text':
      return richTextPlain(property.rich_text);
    case 'select':
      return property.select?.name || '';
    case 'status':
      return property.status?.name || '';
    case 'multi_select':
      return property.multi_select.map((item) => item.name).join(', ');
    case 'date':
      return property.date?.start || '';
    case 'number':
      return property.number === null ? '' : String(property.number);
    case 'checkbox':
      return property.checkbox ? 'true' : 'false';
    case 'url':
      return property.url || '';
    default:
      return '';
  }
}

function propertyList(property) {
  if (!property) {
    return [];
  }

  switch (property.type) {
    case 'multi_select':
      return property.multi_select.map((item) => item.name).filter(Boolean);
    case 'select':
      return property.select?.name ? [property.select.name] : [];
    case 'status':
      return property.status?.name ? [property.status.name] : [];
    case 'rich_text':
      return splitList(richTextPlain(property.rich_text));
    case 'title':
      return splitList(richTextPlain(property.title));
    default:
      return splitList(propertyText(property));
  }
}

function splitList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isPublished(page) {
  const property = findProperty(page, propertyNames.published);

  if (!property) {
    return true;
  }

  if (property.type === 'checkbox') {
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

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
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
  const slug = String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|#%{}[\]^~`]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (slug) {
    return slug;
  }

  return `notion-${Date.now()}`;
}

function yamlString(value) {
  return JSON.stringify(String(value || ''));
}

function yamlArray(values) {
  return `[${values.map((value) => yamlString(value)).join(', ')}]`;
}

function frontMatter(metadata) {
  const lines = [
    '---',
    ...(metadata.layout ? [`layout: ${yamlString(metadata.layout)}`] : []),
    `title: ${yamlString(metadata.title)}`,
    `date: ${metadata.date}`,
    `last_modified_at: ${metadata.lastModifiedAt}`,
    `categories: ${yamlArray(metadata.categories)}`,
    `tags: ${yamlArray(metadata.tags)}`,
    `description: ${yamlString(metadata.description)}`,
    ...(metadata.lang ? [`lang: ${yamlString(metadata.lang)}`] : []),
    ...(metadata.uiLang ? [`ui_lang: ${yamlString(metadata.uiLang)}`] : []),
    ...(metadata.toc !== undefined ? [`toc: ${metadata.toc ? 'true' : 'false'}`] : []),
    ...(metadata.permalink ? [`permalink: ${yamlString(metadata.permalink)}`] : []),
    ...(metadata.originalUrl ? [`original_url: ${yamlString(metadata.originalUrl)}`] : []),
    ...(metadata.englishUrl ? [`english_url: ${yamlString(metadata.englishUrl)}`] : []),
    `notion_id: ${yamlString(metadata.notionId)}`,
    `notion_lang: ${yamlString(metadata.notionLang || 'ko')}`,
    '---',
    ''
  ];

  return lines.join('\n');
}

function markdownInline(richText = []) {
  return richText
    .map((item) => {
      let text = item.plain_text || '';

      if (!text) {
        return '';
      }

      if (item.href) {
        text = wrapMarkdownLink(text, item.href);
      }

      const annotations = item.annotations || {};
      if (annotations.code) {
        text = wrapMarkdownInline(text, '`');
      }
      if (annotations.bold) {
        text = wrapMarkdownInline(text, '**');
      }
      if (annotations.italic) {
        text = wrapMarkdownInline(text, '*');
      }
      if (annotations.strikethrough) {
        text = wrapMarkdownInline(text, '~~');
      }
      if (annotations.underline) {
        text = wrapMarkdownInline(text, '<u>', '</u>');
      }

      return text;
    })
    .join('');
}

function splitInlineWhitespace(text) {
  const value = String(text || '');
  const match = value.match(/^(\s*)([\s\S]*?)(\s*)$/);

  return {
    leading: match?.[1] || '',
    body: match?.[2] || '',
    trailing: match?.[3] || ''
  };
}

function wrapMarkdownInline(text, opening, closing = opening) {
  const { leading, body, trailing } = splitInlineWhitespace(text);
  return body ? `${leading}${opening}${body}${closing}${trailing}` : text;
}

function wrapMarkdownLink(text, href) {
  const { leading, body, trailing } = splitInlineWhitespace(text);
  return body ? `${leading}[${body}](${href})${trailing}` : text;
}

async function renderBlocks(blocks, context, depth = 0) {
  const rendered = [];

  for (const block of blocks) {
    const markdown = await renderBlock(block, context, depth);
    if (markdown.trim()) {
      rendered.push(markdown);
    }
  }

  return rendered.join('\n\n');
}

async function renderBlock(block, context, depth = 0) {
  const type = block.type;
  const value = block[type];
  const indent = '  '.repeat(depth);
  let output = '';

  switch (type) {
    case 'paragraph':
      output = markdownInline(value.rich_text);
      break;
    case 'heading_1':
      output = `# ${markdownInline(value.rich_text)}`;
      break;
    case 'heading_2':
      output = `## ${markdownInline(value.rich_text)}`;
      break;
    case 'heading_3':
      output = `### ${markdownInline(value.rich_text)}`;
      break;
    case 'bulleted_list_item':
      output = `${indent}- ${markdownInline(value.rich_text)}`;
      break;
    case 'numbered_list_item':
      output = `${indent}1. ${markdownInline(value.rich_text)}`;
      break;
    case 'to_do':
      output = `${indent}- [${value.checked ? 'x' : ' '}] ${markdownInline(value.rich_text)}`;
      break;
    case 'quote':
    case 'callout':
      output = markdownInline(value.rich_text);
      break;
    case 'code': {
      const code = [
        `\`\`\`${value.language || ''}`,
        richTextPlain(value.rich_text),
        '```'
      ].join('\n');
      output = depth > 0 ? indentMarkdown(code, depth) : code;
      break;
    }
    case 'divider':
      output = '---';
      break;
    case 'image':
      output = await renderImage(block, context);
      break;
    case 'bookmark':
    case 'link_preview':
    case 'embed':
      output = value.url ? `[${value.url}](${value.url})` : '';
      break;
    case 'equation':
      output = `$$\n${value.expression}\n$$`;
      break;
    case 'table':
      output = await renderTable(block, depth);
      break;
    case 'toggle': {
      const summary = markdownInline(value.rich_text) || '상세 내용';
      const children = block.has_children
        ? await renderBlocks(await getBlockChildren(block.id), context, depth + 1)
        : '';
      return `<details>\n<summary>${summary}</summary>\n\n${children}\n\n</details>`;
    }
    case 'child_page':
      output = `- ${value.title}`;
      break;
    case 'column_list':
    case 'column':
      output = '';
      break;
    case 'unsupported':
    case 'synced_block':
    case 'child_database':
      output = '';
      break;
    default:
      output = '';
      console.warn(`Unsupported Notion block type: ${type}`);
  }

  if (shouldIndentNestedBlock(type, depth) && output.trim()) {
    output = indentMarkdown(output, depth);
  }

  if (block.has_children && type !== 'toggle' && type !== 'table') {
    const childDepth = layoutBlockTypes.has(type) ? depth : depth + 1;
    const children = await renderBlocks(await getBlockChildren(block.id), context, childDepth);
    if (children.trim()) {
      const separator = containsMarkdownBlock(children) ? '\n\n' : '\n';
      output = output ? `${output}${separator}${children}` : children;
    }
  }

  if ((type === 'quote' || type === 'callout') && output.trim()) {
    const quoted = blockquoteMarkdown(output);
    return depth > 0 ? indentMarkdown(quoted, depth) : quoted;
  }

  return output;
}

function shouldIndentNestedBlock(type, depth) {
  return (
    depth > 0 &&
    !layoutBlockTypes.has(type) &&
    !listBlockTypes.has(type) &&
    !['code', 'table', 'quote', 'callout'].includes(type)
  );
}

function containsMarkdownTable(markdown) {
  return /^\s*\|.*\|\s*$/m.test(markdown);
}

function containsMarkdownBlock(markdown) {
  return containsMarkdownTable(markdown) || /^\s*```/m.test(markdown);
}

function blockquoteMarkdown(markdown) {
  return String(markdown)
    .split('\n')
    .map((line) => (line.trim() ? `> ${line}` : '>'))
    .join('\n');
}

function normalizeMarkdown(markdown) {
  return splitJoinedMarkdownBlocks(unwrapMarkdownTableFences(normalizeFenceLines(markdown)))
    .replace(/^([ \t]*)-([^\s-].*)$/gm, '$1- $2')
    .replace(/^ {4,}(\|.+\|[ \t]*)$/gm, '  $1')
    .replace(/^([ \t]*(?:[-*+]|\d+\.)\s+.+)\n([ \t]*```)/gm, '$1\n\n$2')
    .replace(/^([ \t]*(?:[-*+]|\d+\.)\s+.+)\n([ \t]*\|.+\|[ \t]*$)/gm, '$1\n\n$2')
    .trim();
}

function splitJoinedMarkdownBlocks(markdown) {
  const lines = String(markdown || '').split('\n');
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
      normalized.push(imageListMatch[1], '');

      let nestedIndent = '';
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

    normalized.push(line.replace(/(\))(?=#{1,6}\s+)/g, '$1\n\n'));
  }

  return normalized.join('\n');
}

function unwrapMarkdownTableFences(markdown) {
  return String(markdown || '').replace(/```([^\n]*)\n([\s\S]*?)\n```/g, (match, lang, body) => {
    const normalizedLang = lang.trim().toLowerCase();
    const canUnwrap = !normalizedLang || ['plain', 'plaintext', 'text'].includes(normalizedLang);

    if (!canUnwrap) {
      return match;
    }

    const lines = body
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    return isMarkdownTable(lines) ? lines.join('\n') : match;
  });
}

function isMarkdownTable(lines) {
  return (
    lines.length >= 2 &&
    lines.every((line) => /^\|.*\|$/.test(line)) &&
    lines.some((line) => /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|$/.test(line))
  );
}

function normalizeFenceLines(markdown) {
  const lines = String(markdown || '').split('\n');
  const normalized = [];
  let inFence = false;

  for (const line of lines) {
    const fenceIndex = line.indexOf('```');

    if (fenceIndex === -1) {
      normalized.push(line);
      continue;
    }

    if (!inFence) {
      const before = line.slice(0, fenceIndex).trimEnd();

      if (before.trim()) {
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
      normalized.push('');
      normalized.push(after);
    }

    inFence = false;
  }

  return normalized.join('\n');
}

function markdownTableCell(richText = []) {
  return markdownInline(richText)
    .replace(/\r?\n/g, '<br>')
    .replace(/\|/g, '\\|')
    .trim();
}

function indentMarkdown(markdown, depth = 0) {
  const prefix = '  '.repeat(depth);
  if (!prefix) {
    return markdown;
  }

  return markdown
    .split('\n')
    .map((line) => (line ? `${prefix}${line}` : line))
    .join('\n');
}

async function renderTable(block, depth = 0) {
  const rows = await getBlockChildren(block.id);
  const cells = rows
    .filter((row) => row.type === 'table_row')
    .map((row) => row.table_row.cells.map((cell) => markdownTableCell(cell)));

  if (!cells.length) {
    return '';
  }

  const width = Math.max(...cells.map((row) => row.length));
  const normalizedRows = cells.map((row) => {
    const next = [...row];
    while (next.length < width) {
      next.push('');
    }
    return next;
  });

  const [header, ...body] = normalizedRows;
  const separator = Array.from({ length: width }, () => '---');
  const table = [header, separator, ...body]
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return indentMarkdown(table, Math.min(depth, 1));
}

async function renderImage(block, context) {
  const image = block.image;
  const caption = markdownInline(image.caption);
  const source = image.type === 'external' ? image.external.url : image.file?.url;

  if (!source) {
    return '';
  }

  let url = source;
  if (image.type === 'file') {
    url = await downloadNotionAsset(source, context);
  }

  const alt = caption || 'image';
  const imageMarkdown = `![${alt}](${url})`;
  return caption ? `${imageMarkdown}\n_${caption}_` : imageMarkdown;
}

async function downloadNotionAsset(url, context) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download Notion asset: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const extension = extensionFromContentType(contentType) || extensionFromUrl(url) || '.png';
  const buffer = Buffer.from(await response.arrayBuffer());
  const hash = createHash('sha1').update(buffer).digest('hex').slice(0, 10);
  const fileName = `${String(++context.assetIndex).padStart(2, '0')}-${hash}${extension}`;
  const assetDir = path.join(ASSETS_DIR, context.slug);
  const relativePath = path.join('assets', 'img', 'notion', context.slug, fileName);

  await mkdir(assetDir, { recursive: true });
  await writeFile(path.join(ROOT, relativePath), buffer);

  return `/${relativePath.split(path.sep).join('/')}`;
}

function extensionFromContentType(contentType) {
  const normalized = contentType.split(';')[0].trim().toLowerCase();
  const extensions = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg'
  };

  return extensions[normalized];
}

function extensionFromUrl(url) {
  const pathname = new URL(url).pathname;
  const extension = path.extname(pathname);
  return extension && extension.length <= 6 ? extension : '';
}

async function buildPost(page) {
  const title = propertyText(findProperty(page, propertyNames.title, 'title'));
  if (!title) {
    throw new Error(`Notion page ${page.id} has no title.`);
  }

  const dateProperty = findProperty(page, propertyNames.date, 'date');
  const dateValue = propertyText(dateProperty) || page.created_time;
  const slugProperty = findProperty(page, propertyNames.slug);
  const slug = slugify(propertyText(slugProperty) || title);
  const categories = propertyList(findProperty(page, propertyNames.categories)).filter(Boolean);
  const tags = propertyList(findProperty(page, propertyNames.tags)).filter(Boolean);
  const description = propertyText(findProperty(page, propertyNames.description));
  const blocks = await getBlockChildren(page.id);
  const body = normalizeMarkdown(await renderBlocks(blocks, { slug, assetIndex: 0 }));
  const fallbackDescription = description || createDescription(body, title);
  const date = formatDateForJekyll(dateValue);
  const lastModifiedAt = formatDateForJekyll(page.last_edited_time);
  const koreanUrl = `/posts/${slug}/`;
  const englishUrl = `/en/posts/${slug}/`;

  const metadata = {
    title,
    date,
    lastModifiedAt,
    categories: categories.length ? categories : ['Notion'],
    tags,
    description: fallbackDescription,
    englishUrl,
    notionId: page.id,
    notionLang: 'ko'
  };

  const fileName = `${datePrefix(dateValue)}-${slug}.md`;
  const filePath = path.join(POSTS_DIR, fileName);
  const posts = [
    {
      notionId: page.id,
      notionLang: 'ko',
      filePath,
      content: `${frontMatter(metadata)}${body.trim()}\n`
    }
  ];

  if (GENERATE_ENGLISH) {
    const englishTitle = await translateText(title);
    const englishDescription = await translateText(fallbackDescription);
    const englishBody = normalizeMarkdown(await translateMarkdown(body));
    const englishMetadata = {
      layout: 'post',
      title: englishTitle || title,
      date,
      lastModifiedAt,
      categories: metadata.categories,
      tags,
      description: englishDescription || fallbackDescription,
      lang: 'en',
      uiLang: 'ko-KR',
      toc: true,
      permalink: englishUrl,
      originalUrl: koreanUrl,
      notionId: page.id,
      notionLang: 'en'
    };

    posts.push({
      notionId: page.id,
      notionLang: 'en',
      filePath: path.join(EN_POSTS_DIR, slug, 'index.md'),
      content: `${frontMatter(englishMetadata)}${englishBody.trim()}\n`
    });
  }

  return posts;
}

const translationCache = new Map();
const TRANSLATE_CHUNK_SIZE = 1200;

async function translateText(text, targetLanguage = 'en') {
  const value = String(text || '');

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

  const translated = translatedParts.join('');
  translationCache.set(cacheKey, translated);
  return translated;
}

async function translateChunk(text, targetLanguage) {
  const value = String(text || '');

  if (!value.trim()) {
    return value;
  }

  try {
    return await requestTranslation(value, targetLanguage);
  } catch (error) {
    if (!String(error.message).includes('Translate API 400') || value.length <= 1) {
      throw error;
    }

    const fallbackChunks = splitLongText(value, Math.max(1, Math.floor(value.length / 2)));
    if (fallbackChunks.length <= 1) {
      throw error;
    }

    const translated = [];
    for (const chunk of fallbackChunks) {
      translated.push(await translateChunk(chunk, targetLanguage));
    }

    return translated.join('');
  }
}

async function requestTranslation(value, targetLanguage) {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'ko',
    tl: targetLanguage,
    dt: 't',
    q: value
  });

  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Translate API ${response.status} ${response.statusText}: ${detail.slice(0, 200)}`);
  }

  const data = await response.json();
  return (data[0] || []).map((part) => part[0]).join('');
}

async function translateMarkdown(markdown) {
  const protectedSegments = [];
  const protectedMarkdown = markdown.replace(
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

  let translated = translatedChunks.join('');
  for (const segment of protectedSegments) {
    translated = translated.replaceAll(segment.token, segment.value);
  }

  return translated;
}

function splitTranslationChunks(text, maxLength = TRANSLATE_CHUNK_SIZE) {
  const paragraphs = text.split(/(\n{2,})/);
  const chunks = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length > maxLength && current) {
      chunks.push(current);
      current = '';
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
  const value = String(text || '');

  if (value.length <= maxLength) {
    return [value];
  }

  const chunks = [];
  let current = '';
  const segments = value.split(/(\n{2,}|\n|[.!?。！？]\s+|[,;:]\s+|\s+)/);

  for (const segment of segments) {
    if (!segment) {
      continue;
    }

    if (current && current.length + segment.length > maxLength) {
      chunks.push(current);
      current = '';
    }

    if (segment.length > maxLength) {
      if (current) {
        chunks.push(current);
        current = '';
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

function createDescription(markdown, title = '') {
  const candidates = descriptionCandidates(markdown, title);
  const selected = [];

  for (const candidate of candidates) {
    const next = [...selected, candidate].join(' ');
    if (next.length > 150 && selected.length) {
      break;
    }

    selected.push(candidate);

    if (next.length >= 80 || selected.length >= 2) {
      break;
    }
  }

  return trimDescription(selected.join(' ') || title);
}

function descriptionCandidates(markdown, title = '') {
  const titleText = cleanDescriptionLine(title);
  const seen = new Set();
  const candidates = [];
  const withoutCode = String(markdown || '')
    .replace(/```[\s\S]*?```/g, '\n')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '\n');

  for (const rawLine of withoutCode.split('\n')) {
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
  const value = String(line || '').trim();
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
  return String(line || '')
    .replace(/\[[^\]]+]\([^)]*\)/g, (match) => match.replace(/^\[|\]\([^)]*\)$/g, ''))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^>+\s*/, '')
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[\s>*-]*(?:[-*+]|\d+\.)\s+/, '')
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\[[ xX]]\s+/, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isGenericDescriptionHeading(line) {
  return [
    '공부한 내용',
    '오늘 할 일',
    '내일 할 일',
    '문제',
    '오류',
    '문제와 오류',
    '해결',
    '회고',
    '정리',
    '개요',
    '목차',
    '참고',
    '느낀 점'
  ].includes(line);
}

function trimDescription(text, maxLength = 150) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();

  if (value.length <= maxLength) {
    return value;
  }

  const trimmed = value.slice(0, maxLength + 1);
  const breakpoint = Math.max(
    trimmed.lastIndexOf('.'),
    trimmed.lastIndexOf('!'),
    trimmed.lastIndexOf('?'),
    trimmed.lastIndexOf('다'),
    trimmed.lastIndexOf('요'),
    trimmed.lastIndexOf(',')
  );

  if (breakpoint >= 60) {
    return trimmed.slice(0, breakpoint + 1).trim();
  }

  return `${value.slice(0, maxLength - 1).trim()}…`;
}

async function removeStaleGeneratedPosts(currentPosts) {
  const currentByNotionKey = new Map(
    currentPosts.map((post) => [notionKey(post.notionId, post.notionLang), post.filePath])
  );
  const files = [
    ...(await generatedMarkdownFiles(POSTS_DIR)),
    ...(await generatedMarkdownFiles(EN_POSTS_DIR))
  ];

  for (const filePath of files) {
    const content = await readFile(filePath, 'utf8');
    const match = content.match(/^notion_id:\s*["']?([^"'\n]+)["']?/m);

    if (!match) {
      continue;
    }

    const notionId = match[1];
    const langMatch = content.match(/^notion_lang:\s*["']?([^"'\n]+)["']?/m);
    const notionLang = langMatch?.[1] || 'ko';
    const nextPath = currentByNotionKey.get(notionKey(notionId, notionLang));
    if (!nextPath || nextPath !== filePath) {
      await rm(filePath);
      console.log(`Removed stale Notion post: ${path.relative(ROOT, filePath)}`);
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
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(filePath);
      }
    }

    return files;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

function notionKey(notionId, notionLang) {
  return `${notionId}:${notionLang || 'ko'}`;
}

async function main() {
  await mkdir(POSTS_DIR, { recursive: true });

  const pages = await queryDatabase();
  const publishedPages = pages.filter(isPublished);
  const skippedCount = pages.length - publishedPages.length;

  console.log(`Fetched ${pages.length} Notion page(s).`);
  console.log(`Importing ${publishedPages.length} published page(s).`);
  if (skippedCount) {
    console.log(`Skipped ${skippedCount} unpublished page(s).`);
  }

  const posts = [];
  for (const page of publishedPages) {
    const pagePosts = await buildPost(page);
    posts.push(...pagePosts);
  }

  await removeStaleGeneratedPosts(posts);

  for (const post of posts) {
    await mkdir(path.dirname(post.filePath), { recursive: true });
    await writeFile(post.filePath, post.content);
    console.log(`Wrote ${path.relative(ROOT, post.filePath)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
