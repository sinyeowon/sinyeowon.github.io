import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { translateMarkdownInline, translateMarkdownLayout } from './translate-markdown.mjs';

const translate = async (text) => text
  .replaceAll('배열', 'Array')
  .replaceAll('선언', 'Declaration')
  .replaceAll('길이 확인', 'Check length')
  .replaceAll('다음 제목', 'Next heading')
  .trim()
  .replace(/\s+/g, ' ');

test('keeps nested code blocks and following headings outside translation requests', async () => {
  const source = [
    '- 배열', '',
    '    - 선언', '',
    '        ```java',
    '        int[] arr; // 배열',
    '        ```', '',
    '    - 길이 확인', '',
    '        ```java',
    '        System.out.println(arr.length);',
    '        ```', '',
    '### 다음 제목', ''
  ].join('\n');

  const expected = source
    .replace('- 배열', '- Array')
    .replace('- 선언', '- Declaration')
    .replace('- 길이 확인', '- Check length')
    .replace('### 다음 제목', '### Next heading');

  assert.equal(await translateMarkdownLayout(source, translate), expected);
});

test('preserves quoted, longer and tilde fences, including Markdown inside code', async () => {
  const source = [
    '> ````markdown',
    '> ```java',
    '> 배열',
    '> ```',
    '> ````', '',
    '    ~~~text',
    '    | 배열 |',
    '    | --- |',
    '    ~~~', '',
    '> 1. 배열  '
  ].join('\n');

  const translateTable = () => assert.fail('A table inside code must not be translated.');
  assert.equal(
    await translateMarkdownLayout(source, translate, translateTable),
    source.replace('> 1. 배열  ', '> 1. Array  ')
  );
});

test('preserves inline code, links and HTML attributes while translating their surrounding prose', async () => {
  const source = '<span class="notion-callout-title">`Integer[]` 배열</span> [문서](/posts/배열/)';
  assert.equal(
    await translateMarkdownInline(source, translate),
    '<span class="notion-callout-title">`Integer[]` Array</span> [문서](/posts/배열/)'
  );
});

test('passes actual tables to the table translator with their indentation intact', async () => {
  const table = '    | 배열 | name |\n    | --- | --- |\n    | 선언 | value |';
  const source = `- 배열\n\n${table}\n\n### 다음 제목`;
  let calls = 0;
  const translateTable = async (value) => {
    calls += 1;
    assert.equal(value, table);
    return value.replaceAll('배열', 'Array').replaceAll('선언', 'Declaration');
  };

  assert.equal(
    await translateMarkdownLayout(source, translate, translateTable),
    '- Array\n\n    | Array | name |\n    | --- | --- |\n    | Declaration | value |\n\n### Next heading'
  );
  assert.equal(calls, 1);
});

test('rejects translations that lose protected inline markup', async () => {
  await assert.rejects(
    translateMarkdownInline('`int[]` 배열', async () => 'Array'),
    /protected Markdown segment/
  );
});

test('preserves every code block and line break in the reported Java post', async () => {
  const source = await readFile(new URL('../_posts/2026-10-19-Java-프로그래머스-Java-기초.md', import.meta.url), 'utf8');
  const body = source.replace(/^---\n[\s\S]*?\n---\n/, '');
  const english = await readFile(new URL('../en/posts/Java-프로그래머스-Java-기초/index.md', import.meta.url), 'utf8');
  const translated = await translateMarkdownLayout(body, translate);
  const codeBlocks = body.match(/^[ \t]*```[^\n]*\n[\s\S]*?^[ \t]*```$/gm);

  assert.ok(codeBlocks.length > 0);
  for (const block of codeBlocks) {
    assert.ok(translated.includes(block), 'Translation must preserve the complete code block.');
    assert.ok(english.includes(block), 'The repaired English post must contain the original code block.');
  }
  assert.equal(translated.split('\n').length, body.split('\n').length);
  assert.ok(english.includes('\n### Find the mode\n'));
});

test('both generation commands preserve nested code with mocked Notion and translation APIs', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'blog-translation-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const richText = (text) => [{ type: 'text', plain_text: text, text: { content: text } }];
  const block = (id, type, text, hasChildren = false) => ({
    id, type, has_children: hasChildren,
    [type]: { rich_text: richText(text), ...(type === 'code' ? { language: 'java' } : {}) }
  });
  const fixture = {
    page: {
      id: 'fixture', created_time: '2026-10-19T00:00:00Z', last_edited_time: '2026-10-19T00:00:00Z',
      properties: { title: { type: 'title', title: richText('fixture') } }
    },
    children: {
      fixture: [block('parent', 'bulleted_list_item', '배열', true)],
      parent: [block('paragraph', 'paragraph', '선언', true), block('toggle', 'toggle', '길이 확인', true)],
      paragraph: [block('code-one', 'code', 'str = str.replace("H", "J");')],
      toggle: [block('code-two', 'code', 'System.out.println(str);')]
    }
  };
  const loader = path.join(directory, 'mock-apis.mjs');
  await writeFile(loader, `
    const fixture = ${JSON.stringify(fixture)};
    globalThis.fetch = async (input) => {
      const url = new URL(input);
      if (url.hostname === 'translate.googleapis.com') {
        const text = url.searchParams.get('q').trim().replace(/\\n\\s*/g, ' ');
        return new Response(JSON.stringify([[[text]]]));
      }
      if (url.hostname === 'api.notion.com') {
        if (url.pathname.endsWith('/query')) {
          return Response.json({ results: [fixture.page], has_more: false });
        }
        const id = url.pathname.match(/\\/blocks\\/([^/]+)\\/children/)?.[1];
        if (fixture.children[id]) {
          return Response.json({ results: fixture.children[id], has_more: false });
        }
      }
      throw new Error('Unexpected request: ' + url);
    };
  `);
  const run = (script) => execFileSync(process.execPath, [
    '--import', loader, fileURLToPath(new URL(script, import.meta.url))
  ], {
    cwd: directory,
    env: { ...process.env, NOTION_TOKEN: 'fixture', DATABASE_ID: 'fixture', NOTION_GENERATE_ENGLISH: 'true', NOTION_FORCE_IMPORT: 'true' }
  });

  run('./import-notion-posts.mjs');
  for (const file of ['_posts/2026-10-19-fixture.md', 'en/posts/fixture/index.md']) {
    const post = await readFile(path.join(directory, file), 'utf8');
    assert.ok(post.includes('    ```java\n    str = str.replace("H", "J");\n    ```'));
    assert.ok(post.includes('    ```java\n    System.out.println(str);\n    ```'));
    assert.ok(!post.includes('        ```'), 'HTML containers must not apply the same indentation twice.');
  }

  const code = '        ```java\n        int[] arr; // 배열\n        ```';
  await writeFile(path.join(directory, '_posts/2026-10-19-static.md'),
    `---\ntitle: "배열"\ndate: 2026-10-19 00:00:00 +0900\n---\n- 배열\n\n    - 선언\n\n${code}\n\n### 다음 제목\n`);
  run('./generate-english-pages.mjs');
  const english = await readFile(path.join(directory, 'en/posts/static/index.md'), 'utf8');
  assert.ok(english.includes(code));
  assert.ok(english.includes('\n### 다음 제목\n'));
});
