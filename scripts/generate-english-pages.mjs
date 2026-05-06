import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, '_posts');
const EN_POSTS_DIR = path.join(ROOT, 'en', 'posts');

const translationCache = new Map();

function yamlString(value) {
  return JSON.stringify(String(value || ''));
}

async function main() {
  const files = (await readdir(POSTS_DIR))
    .filter((file) => file.endsWith('.md'))
    .sort();

  let generatedCount = 0;
  let updatedSourceCount = 0;

  for (const file of files) {
    const filePath = path.join(POSTS_DIR, file);
    const source = await readFile(filePath, 'utf8');
    const parsed = parsePost(source, file);

    if (frontMatterValue(parsed.frontMatter, 'lang') === 'en') {
      continue;
    }

    if (frontMatterValue(parsed.frontMatter, 'notion_id')) {
      continue;
    }

    const slug = slugFromFile(file);
    const englishUrl = `/en/posts/${slug}/`;
    const originalUrl = `/posts/${slug}/`;
    const englishTitle = await translateText(parsed.title);
    const englishDescription = await translateText(parsed.description || createDescription(parsed.body));
    const englishBody = await translateMarkdown(parsed.body);
    const englishFrontMatter = [
      '---',
      'layout: "post"',
      `title: ${yamlString(englishTitle || parsed.title)}`,
      `date: ${parsed.date}`,
      parsed.lastModifiedAt ? `last_modified_at: ${parsed.lastModifiedAt}` : undefined,
      parsed.categoriesLine ? `categories: ${parsed.categoriesLine}` : 'categories: []',
      parsed.tagsLine ? `tags: ${parsed.tagsLine}` : 'tags: []',
      `description: ${yamlString(englishDescription || parsed.description)}`,
      'lang: "en"',
      'ui_lang: "ko-KR"',
      `permalink: ${yamlString(englishUrl)}`,
      `original_url: ${yamlString(originalUrl)}`,
      `source_post: ${yamlString(`_posts/${file}`)}`,
      'generated_lang: "en"',
      '---',
      ''
    ]
      .filter((line) => line !== undefined)
      .join('\n');

    const englishPath = path.join(EN_POSTS_DIR, slug, 'index.md');
    await mkdir(path.dirname(englishPath), { recursive: true });
    await writeFile(englishPath, `${englishFrontMatter}${englishBody.trim()}\n`);
    generatedCount += 1;

    const updatedFrontMatter = setFrontMatterValue(
      parsed.frontMatter,
      'english_url',
      yamlString(englishUrl),
      ['description', 'tags', 'categories']
    );

    if (updatedFrontMatter !== parsed.frontMatter) {
      await writeFile(filePath, `---\n${updatedFrontMatter}\n---\n${parsed.body}`);
      updatedSourceCount += 1;
    }
  }

  console.log(`Generated ${generatedCount} English page(s).`);
  console.log(`Updated ${updatedSourceCount} source post front matter block(s).`);
}

function parsePost(source, fileName) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`${fileName} does not have YAML front matter.`);
  }

  const frontMatter = match[1];
  const body = match[2];
  const title = frontMatterValue(frontMatter, 'title');
  const date = rawFrontMatterValue(frontMatter, 'date');
  const lastModifiedAt = rawFrontMatterValue(frontMatter, 'last_modified_at');
  const categoriesLine = rawFrontMatterValue(frontMatter, 'categories');
  const tagsLine = rawFrontMatterValue(frontMatter, 'tags');
  const description = frontMatterValue(frontMatter, 'description');

  if (!title || !date) {
    throw new Error(`${fileName} is missing title or date.`);
  }

  return {
    frontMatter,
    body,
    title,
    date,
    lastModifiedAt,
    categoriesLine,
    tagsLine,
    description
  };
}

function rawFrontMatterValue(frontMatter, key) {
  const match = frontMatter.match(new RegExp(`^${escapeRegExp(key)}:\\s*(.*)$`, 'm'));
  return match?.[1]?.trim() || '';
}

function frontMatterValue(frontMatter, key) {
  const rawValue = rawFrontMatterValue(frontMatter, key);
  return parseYamlScalar(rawValue);
}

function parseYamlScalar(value) {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1).replace(/''/g, "'");
    }
  }

  return trimmed;
}

function setFrontMatterValue(frontMatter, key, value, preferredAfterKeys = []) {
  const lines = frontMatter.split('\n');
  const existingIndex = lines.findIndex((line) => line.startsWith(`${key}:`));

  if (existingIndex >= 0) {
    const nextLine = `${key}: ${value}`;
    if (lines[existingIndex] === nextLine) {
      return frontMatter;
    }

    lines[existingIndex] = nextLine;
    return lines.join('\n');
  }

  let insertIndex = lines.length;
  for (const afterKey of preferredAfterKeys) {
    const index = lines.findIndex((line) => line.startsWith(`${afterKey}:`));
    if (index >= 0) {
      insertIndex = index + 1;
      break;
    }
  }

  lines.splice(insertIndex, 0, `${key}: ${value}`);
  return lines.join('\n');
}

function slugFromFile(file) {
  return file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
}

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
      const token = `ZXCVBSTATICSEGMENT${protectedSegments.length}TOKEN`;
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
