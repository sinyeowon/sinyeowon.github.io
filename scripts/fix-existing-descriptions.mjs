import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, '_posts');
const EN_POSTS_DIR = path.join(ROOT, 'en', 'posts');

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

function frontMatterRawValue(content, key) {
  const frontMatter = String(content || '').match(/^---\n([\s\S]*?)\n---/);
  if (!frontMatter) return '';

  const prefix = `${key}:`;
  const line = frontMatter[1].split('\n').find((item) => item.startsWith(prefix));
  if (!line) return '';

  return line.slice(prefix.length).trim();
}

function parseYamlScalar(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
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
  if (value.length <= maxLength) return value;

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

function createDescription(markdown, title = '') {
  // Prefer the first meaningful paragraph if available
  const firstParagraph = (() => {
    const withoutCode = String(markdown || '')
      .replace(/```[\s\S]*?```/g, '\n')
      .replace(/!\[[^\]]*]\([^)]*\)/g, '\n')
      .trim();

    const paragraphs = withoutCode.split(/\n\s*\n+/).map((p) => p.trim());

    for (const p of paragraphs) {
      const cleaned = cleanDescriptionLine(p);
      if (!cleaned) continue;
      if (cleaned.length >= 40 && !isGenericDescriptionHeading(cleaned)) {
        return cleaned;
      }
    }

    return null;
  })();

  if (firstParagraph) return trimDescription(firstParagraph);

  // fallback: pick candidate lines
  const candidates = descriptionCandidates(markdown, title);
  const selected = [];

  for (const candidate of candidates) {
    const next = [...selected, candidate].join(' ');
    if (next.length > 150 && selected.length) break;
    selected.push(candidate);
    if (next.length >= 80 || selected.length >= 2) break;
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
    if (isSkippableDescriptionLine(rawLine)) continue;
    const line = cleanDescriptionLine(rawLine);
    if (!line || line.length < 8 || isGenericDescriptionHeading(line)) continue;
    if (titleText && (line === titleText || titleText.includes(line))) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
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
    /^:? -{3,}:?$/.test(value) ||
    /^---+$/.test(value) ||
    /^https?:\/\//.test(value) ||
    /^<[^>]+>$/.test(value)
  );
}

function isUsableDescription(description) {
  const value = String(description || '').trim();
  return (
    value.length >= 20 &&
    !/^https?:\/\//i.test(value) &&
    !/0 to Product/i.test(value) &&
    !/작성한 글입니다/.test(value) &&
    !/This is an article written about/i.test(value)
  );
}

function frontMatterValue(content, key) {
  return parseYamlScalar(frontMatterRawValue(content, key));
}

async function updateFiles() {
  const files = [
    ...(await generatedMarkdownFiles(POSTS_DIR)),
    ...(await generatedMarkdownFiles(EN_POSTS_DIR))
  ];

  const changed = [];

  for (const filePath of files) {
    try {
      const content = await readFile(filePath, 'utf8');
      const fmMatch = String(content || '').match(/^(---\n[\s\S]*?\n---\n)/);
      if (!fmMatch) continue;
      const fm = fmMatch[1];
      const body = content.slice(fm.length).trim();
      const title = frontMatterValue(content, 'title') || '';
      const existingDescription = frontMatterValue(content, 'description') || '';
      const generated = createDescription(body, title);

      if (!isUsableDescription(generated)) continue;

      if (generated !== existingDescription) {
        const newFm = fm.replace(/(^|\n)description:\s*([\s\S]*?)(\n|$)/, (m, a, val, c) => {
          return `${a}description: ${JSON.stringify(generated)}${c}`;
        });

        const newContent = content.replace(fm, newFm);
        await writeFile(filePath, newContent, 'utf8');
        changed.push(path.relative(ROOT, filePath));
      }
    } catch (e) {
      // ignore individual file errors
      console.error('Failed to process', filePath, e && e.message);
    }
  }

  if (changed.length) {
    console.log('Updated descriptions for files:');
    changed.forEach((f) => console.log(' -', f));
  } else {
    console.log('No description updates needed.');
  }
}

updateFiles().catch((e) => {
  console.error(e && e.message);
  process.exitCode = 1;
});
