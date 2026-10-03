import assert from 'node:assert/strict';
import test from 'node:test';
import { extractD2Blocks } from '../extract-d2.mjs';

test('引用块中的 D2 源码与普通围栏一致，保留内部缩进和 >', () => {
  const code = 'a: {\n  label: "> task"\n}\na -> b\n';
  const plain = '```d2\n' + code + '```';
  const quoted = plain.split('\n').map((line) => '> ' + line).join('\n');
  assert.deepEqual(extractD2Blocks(quoted), [code]);
  assert.deepEqual(extractD2Blocks(plain), [code]);
});

test('嵌套引用和列表中的围栏去除容器标记', () => {
  assert.deepEqual(extractD2Blocks('> > ~~~d2\n> > a -> b\n> > ~~~'), ['a -> b\n']);
  assert.deepEqual(extractD2Blocks('- 图\n\n  ```d2\n  a -> b\n  ```'), ['a -> b\n']);
});

test('文档示例里的 D2 围栏不能被当作真正的图', () => {
  assert.deepEqual(extractD2Blocks('````markdown\n```d2\na -> b\n```\n````'), []);
  assert.deepEqual(extractD2Blocks('    ```d2\n    a -> b\n    ```'), []);
});

test('保留短围栏内容，支持属性及未闭合围栏', () => {
  assert.deepEqual(extractD2Blocks('~~~~D2 {title="图"}\na -> b\n~~~\n~~~~'), ['a -> b\n~~~\n']);
  assert.deepEqual(extractD2Blocks('```d2\na -> b'), ['a -> b']);
});
