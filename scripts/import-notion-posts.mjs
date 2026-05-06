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
        text = `[${text}](${item.href})`;
      }

      const annotations = item.annotations || {};
      if (annotations.code) {
        text = `\`${text}\``;
      }
      if (annotations.bold) {
        text = `**${text}**`;
      }
      if (annotations.italic) {
        text = `*${text}*`;
      }
      if (annotations.strikethrough) {
        text = `~~${text}~~`;
      }
      if (annotations.underline) {
        text = `<u>${text}</u>`;
      }

      return text;
    })
    .join('');
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
      output = markdownInline(value.rich_text)
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
      break;
    case 'callout':
      output = markdownInline(value.rich_text)
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
      break;
    case 'code':
      output = [
        `\`\`\`${value.language || ''}`,
        richTextPlain(value.rich_text),
        '```'
      ].join('\n');
      break;
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
      output = await renderTable(block);
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
    case 'unsupported':
    case 'synced_block':
    case 'child_database':
      output = '';
      break;
    default:
      output = '';
      console.warn(`Unsupported Notion block type: ${type}`);
  }

  if (block.has_children && type !== 'toggle' && type !== 'table') {
    const children = await renderBlocks(await getBlockChildren(block.id), context, depth + 1);
    if (children.trim()) {
      output = output ? `${output}\n${children}` : children;
    }
  }

  return output;
}

async function renderTable(block) {
  const rows = await getBlockChildren(block.id);
  const cells = rows
    .filter((row) => row.type === 'table_row')
    .map((row) => row.table_row.cells.map((cell) => markdownInline(cell)));

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
  return [header, separator, ...body]
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');
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
  const body = await renderBlocks(blocks, { slug, assetIndex: 0 });
  const fallbackDescription = description || createDescription(body);
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
    const englishBody = await translateMarkdown(body);
    const englishMetadata = {
      layout: 'post',
      title: englishTitle || title,
      date,
      lastModifiedAt,
      categories: metadata.categories,
      tags,
      description: englishDescription || fallbackDescription,
      lang: 'en',
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

async function translateText(text, targetLanguage = 'en') {
  const value = String(text || '');

  if (!value.trim()) {
    return value;
  }

  const cacheKey = `${targetLanguage}:${value}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'ko',
    tl: targetLanguage,
    dt: 't',
    q: value
  });

  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`);
  if (!response.ok) {
    throw new Error(`Translate API ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const translated = (data[0] || []).map((part) => part[0]).join('');
  translationCache.set(cacheKey, translated);
  return translated;
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

function splitTranslationChunks(text, maxLength = 3500) {
  const paragraphs = text.split(/(\n{2,})/);
  const chunks = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length > maxLength && current) {
      chunks.push(current);
      current = '';
    }

    if (paragraph.length > maxLength) {
      chunks.push(paragraph);
    } else {
      current += paragraph;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function createDescription(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]+]\([^)]*\)/g, (match) => match.replace(/^\[|\]\([^)]*\)$/g, ''))
    .replace(/[#>*_`~\-[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
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
