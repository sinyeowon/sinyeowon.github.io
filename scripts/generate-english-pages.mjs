import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, '_posts');
const EN_POSTS_DIR = path.join(ROOT, 'en', 'posts');

const translationCache = new Map();
const TRANSLATE_CHUNK_SIZE = 1200;

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
    const englishDescription = await translateText(parsed.description || createDescription(parsed.body, parsed.title));
    const normalizedBody = normalizeMarkdown(parsed.body);
    const englishBody = normalizeMarkdown(await translateMarkdown(normalizedBody));
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
      'toc: true',
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
    (trimmed.startsWith('\'') && trimmed.endsWith('\''))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1).replace(/''/g, '\'');
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

function normalizeMarkdown(markdown) {
  return splitJoinedMarkdownBlocks(unwrapMarkdownTableFences(markdown)).trim();
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

function normalizeDescriptionText(line) {
  return String(line || '')
    .trim()
    .replace(/^(공부한 내용|오늘 학습한 개념|학습한 내용|학습 내용|문제|오류|해결|회고|정리|개요|참고|느낀 점)\s*[:\-–—]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTitleForDescription(title = '') {
  return normalizeDescriptionText(
    String(title || '')
      .replace(/^[\[\(]?TIL[\]\)]?\s*[-–—]?\s*/i, '')
      .replace(/-\d{6,8}$/, '')
      .replace(/[-_]+/g, ' ')
  );
}

function generateTitleDescription(title = '') {
  const value = normalizeTitleForDescription(title);
  if (!value) return '';

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
  const withoutCode = String(markdown || '')
    .replace(/```[\s\S]*?```/g, '\n')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '\n')
    .trim();

  const blocks = [];
  let current = [];

  for (const rawLine of withoutCode.split('\n')) {
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
  const value = String(rawLine || '').trim();
  return /^([-*+]|\d+\.)\s+/.test(value) || /^\[[ xX]]\s+/.test(value);
}

function summarizeDescriptionBlock(block, title = '') {
  const titleText = cleanDescriptionLine(title);
  let lines = block
    .map((line) => cleanDescriptionLine(line))
    .filter(Boolean)
    .filter((line) => !isGenericDescriptionHeading(line));

  if (!lines.length) {
    return null;
  }

  const rawFirstLine = String(block[0] || '').trim();
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

function createDescription(markdown, title = '') {
  const titleDescription = generateTitleDescription(title);
  if (titleDescription) {
    return trimDescription(titleDescription);
  }

  const blocks = splitDescriptionBlocks(markdown);
  for (const block of blocks) {
    const summary = summarizeDescriptionBlock(block, title);
    if (!summary) continue;
    const cleaned = normalizeDescriptionText(summary);
    if (!cleaned || isGenericDescriptionHeading(cleaned) || cleaned.length < 40) continue;
    return trimDescription(cleaned);
  }

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

  return trimDescription(selected.join(' ') || titleDescription);
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
