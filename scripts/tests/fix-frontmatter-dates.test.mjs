import assert from 'node:assert/strict';
import test from 'node:test';
import { fixFrontMatterDates } from '../fix-frontmatter-dates.mjs';

const doc = (fm, body = '\n# 正文\n\ndate: 2026-10-26 11:46:33--7:00\n') => `---\n${fm}\n---\n${body}`;

test('插件输出的是北京时间，坏掉的偏移一律改回 +08:00', () => {
  const { source, fixes } = fixFrontMatterDates(doc(
    'title: 关于E宝\ndate: 2026-10-26 11:46:33--7:00\nlastmod: 2026-10-26 12:39:04--10:00\ntoc: true',
  ));
  assert.equal(source, doc(
    "title: 关于E宝\ndate: '2026-10-26 11:46:33+08:00'\nlastmod: '2026-10-26 12:39:04+08:00'\ntoc: true",
  ));
  assert.deepEqual(fixes.map((f) => f.field), ['date', 'lastmod']);
});

test('一位数小时和带引号的坏值也修正', () => {
  const { source } = fixFrontMatterDates(doc('date: "2026-10-08 02:55:25-7:00"\nlastmod: \'2026-10-08 03:55:45+9:00\''));
  assert.match(source, /^date: '2026-10-08 02:55:25\+08:00'$/m);
  assert.match(source, /^lastmod: '2026-10-08 03:55:45\+08:00'$/m);
});

test('格式正确的日期不动，重复执行结果不变', () => {
  const valid = doc("date: '2026-10-08 02:55:25+08:00'\nlastmod: 2026-10-08 03:55:45-07:00");
  assert.deepEqual(fixFrontMatterDates(valid), { source: valid, fixes: [] });
  const once = fixFrontMatterDates(doc('date: 2026-10-26 11:46:33--7:00')).source;
  assert.deepEqual(fixFrontMatterDates(once), { source: once, fixes: [] });
});

test('只改 front matter 的日期行，正文、换行符和 BOM 原样保留', () => {
  assert.match(fixFrontMatterDates(doc('date: 2026-10-26 11:46:33--7:00')).source,
    /\n# 正文\n\ndate: 2026-10-26 11:46:33--7:00\n$/);
  assert.equal(
    fixFrontMatterDates('﻿---\r\ntitle: x\r\ndate: 2026-10-26 11:46:33--7:00\r\n---').source,
    "﻿---\r\ntitle: x\r\ndate: '2026-10-26 11:46:33+08:00'\r\n---",
  );
});

test('没有 front matter 或日期字段为空时原样返回', () => {
  for (const input of ['', '# 无 front matter\ndate: 2026-10-26 11:46:33--7:00\n', '---\ndate:\n---\n', '---\n---\n']) {
    assert.deepEqual(fixFrontMatterDates(input), { source: input, fixes: [] });
  }
});

test('修正后 date 在未来时标记出来（时间被插件重复换算过）', () => {
  const now = new Date('2026-10-26T10:00:00Z');
  const { fixes } = fixFrontMatterDates(doc(
    'date: 2026-10-27 02:46:33--7:00\nlastmod: 2026-10-28 01:00:00--7:00',
  ), now);
  assert.deepEqual(fixes.map((f) => [f.field, f.future]), [['date', true], ['lastmod', false]]);
  assert.equal(fixFrontMatterDates(doc('date: 2026-10-26 11:46:33--7:00'), now).fixes[0].future, false);
});
