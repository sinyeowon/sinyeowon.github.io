// Keep Markdown structure out of translation requests: translators may trim
// indentation or join lines, which can turn the rest of a post into code.
export async function translateMarkdownLayout(markdown, translateText, translateTable) {
  const lines = String(markdown || '').split('\n');
  const output = [];
  let fence = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const content = line.replace(/^[ \t]*(?:>[ \t]*)*/, '');

    if (fence) {
      output.push(line);
      const closing = content.match(/^(`{3,}|~{3,})[ \t]*$/);
      if (closing && closing[1][0] === fence[0] && closing[1].length >= fence.length) {
        fence = null;
      }
      continue;
    }

    const opening = content.match(/^(`{3,}|~{3,})/);
    if (opening) {
      fence = opening[1];
      output.push(line);
      continue;
    }

    if (
      translateTable &&
      /^\s*\|.*\|\s*$/.test(line) &&
      /^\s*\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|\s*$/.test(lines[index + 1] || '')
    ) {
      const table = [line, lines[++index]];
      while (/^\s*\|.*\|\s*$/.test(lines[index + 1] || '')) {
        table.push(lines[++index]);
      }
      output.push(await translateTable(table.join('\n')));
      continue;
    }

    const [, prefix, text, suffix] = line.match(
      /^([ \t]*(?:>[ \t]*)*(?:(?:#{1,6}|[-*+]|\d+[.)])[ \t]+)?(?:\[[ xX]\][ \t]+)?)(.*?)([ \t]*)$/
    );
    output.push(`${prefix}${await translateMarkdownInline(text, translateText)}${suffix}`);
  }

  return output.join('\n');
}

export async function translateMarkdownInline(markdown, translateText) {
  const protectedSegments = [];
  const protectedMarkdown = String(markdown || '').replace(
    /`+[^`\n]+`+|!\[[^\]]*]\([^)]*\)|\[[^\]]+]\([^)]*\)|<[^>]+>|\{%.*?%\}|\{\{.*?\}\}/g,
    (match) => {
      const token = `ZXCVBMARKDOWNSEGMENT${protectedSegments.length}TOKEN`;
      protectedSegments.push({ token, value: match });
      return token;
    }
  );

  // URLs, markup-only lines and text already in English need no translation.
  if (!/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/u.test(protectedMarkdown)) {
    return markdown;
  }

  let translated = (await translateText(protectedMarkdown)).trim().replace(/\r?\n/g, ' ');
  for (const segment of protectedSegments) {
    if (translated.split(segment.token).length !== 2) {
      throw new Error('Translation changed a protected Markdown segment.');
    }
    translated = translated.replace(segment.token, () => segment.value);
  }

  return translated;
}
