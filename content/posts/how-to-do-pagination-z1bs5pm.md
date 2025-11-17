---
title: 到底要怎么做分页?
slug: how-to-do-pagination-z1bs5pm
url: /post/how-to-do-pagination-z1bs5pm.html
date: '2025-05-14 22:58:26+08:00'
lastmod: '2025-11-17 23:03:25+08:00'
toc: true
isCJKLanguage: true
tags: ["分页", "后端", "数据库", "性能", "API"]
---



# 到底要怎么做分页?

> 真实情况是, 我做了一些分页相关的业务, 但是确实没有深入思考过`分页`​. 今天[旭神](https://github.com/lxdlam)介绍了一些分页相关的方案, 我觉得非常有所收益, A一篇文章记录
>
> **基于和Claude-3.7对话 + Gemini 总结生成**

# 痛点

1. **性能**：如何高效地跳过大量数据，只读取目标页的数据？
2. **一致性/稳定性**：在数据频繁增删改的情况下，如何保证用户翻页时数据不重复、不遗漏（即"页面漂移"问题）？
3. **易用性与复杂性**：如何在实现高效分页的同时，保持API和实现的简洁性？

# 常见的数据库分页方法

> 主要有两种主流的分页方法：OFFSET法和SEEK法（也称Keyset Pagination或游标分页）。

## OFFSET 法 (Offset-Based Pagination)

这是最直观也是早期最常用的方法。其原理是指定一个`OFFSET`​（跳过的记录数）和`LIMIT`（每页的记录数）。

### 原理分析

OFFSET法的核心思想是"跳过N行，然后取M行"。例如，获取第3页，每页10条数据，那么就需要跳过 `(3-1)*10 = 20` 条数据，然后取10条。

- **优点**：

  - 实现简单，几乎所有关系型数据库都原生支持 `LIMIT`​ 和 `OFFSET` (或其变种关键字)。
  - 可以直接跳转到任意页码。
- **缺点**：

  - **性能瓶颈**：数据库通常需要扫描 `OFFSET + LIMIT`​ 数量的行，然后丢弃掉前面的 `OFFSET`​ 行。当 `OFFSET` 很大时（即用户翻到很深的页码），扫描的行数会非常多，导致查询性能急剧下降。

    - > [引用](https://use-the-index-luke.com/sql/partial-results/fetch-next-page): "the database must count all rows from the beginning until it reaches the requested page."
      >
  - **页面漂移**：如果在用户翻页的间隙，有新的数据插入到当前页之前，或者有数据从当前页之前删除，那么用户在点击"下一页"时，看到的数据可能会有重复或者遗漏。这是因为 `OFFSET` 是基于数据在查询时的瞬时排序位置。

### 最佳实践

**SQL示例 (以PostgreSQL/MySQL为例):**   
假设我们有一个`sales`​表，按`sale_date`降序排列。获取第11页，每页10条数据（即跳过100条，取10条）：

```sql
-- 假设 page = 11, limit = 10
-- offset = (page - 1) * limit = (11 - 1) * 10 = 100
SELECT *
FROM sales
ORDER BY sale_date DESC
LIMIT 10 OFFSET 100;
```

**常见误区：**

- **误区1**：认为OFFSET法在数据量不大或浅层分页时性能尚可，就全局采用。但随着业务发展，数据量增长后性能问题会逐渐暴露。
- **误区2**：忽略页面漂移问题。对于更新不频繁或对一致性要求不高的场景可能可以接受，但对于交易流水、社交feed等场景则可能是严重问题。

## SEEK 法 (Keyset Pagination / Cursor-Based Pagination)

SEEK法的核心思想是利用上一页最后一条数据的排序键值作为"锚点"或"游标"，来查询下一页的数据。

### 原理分析

它不关心跳过了多少行，而是关心"从哪里开始取下一批数据"。例如，如果上一页最后一条销售记录的 `sale_date`​ 是 `2023-10-26 10:00:00`​，并且其唯一ID是 `12345`​，那么下一页的数据就是 `sale_date < '2023-10-26 10:00:00'`​ 或者 (`sale_date = '2023-10-26 10:00:00'`​ AND `id < 12345`) 的记录（假设按日期和ID降序）。

- **优点**：

  - **高性能且稳定**：查询通常能高效利用索引（如 `(sale_date, id)` 上的索引），无论翻到多深的页码，查询的扫描范围相对固定，性能不会随页码增加而显著下降。

    - 引用: "the database can truly skip the rows from the previous pages. On top of that, you will also get stable results if new rows are inserted."
  - **结果稳定**：由于是基于实际数据的值来定位，即使在翻页间隙有数据增删，只要新数据不影响当前"锚点"的相对位置，分页结果就不会漂移。
- **缺点**：

  - **实现相对复杂**：`WHERE`条件需要根据排序字段和上一页的末尾数据动态构建。
  - **排序键要求**：排序依据的列（组合）必须能唯一确定一条记录的顺序，即排序必须是"确定性的 (deterministic)"。通常意味着 `ORDER BY`子句中需要包含一个唯一键（如主键）。
  - **不能直接跳页**：只能获取"上一页"或"下一页"，无法直接跳转到指定页码（如第100页），因为不知道第99页的最后一个值是什么。
  - **方向改变复杂**：如果要支持反向浏览（从后往前），查询条件和排序方向都需要相应调整。

### 最佳实践

**SQL示例 (以PostgreSQL为例，假设按** **​`sale_date`​**​ **DESC,**  **​`sale_id`​**​ **DESC 排序):**   
获取第一页：

```sql
SELECT sale_id, sale_date, amount
FROM sales
ORDER BY sale_date DESC, sale_id DESC
LIMIT 10;
```

假设第一页最后一条是 `(sale_date='2023-10-27', sale_id=998)`。  
获取第二页：

```sql
-- ?1 = '2023-10-27', ?2 = 998
SELECT sale_id, sale_date, amount
FROM sales
WHERE (sale_date, sale_id) < (?1, ?2) -- 使用 Row Values 语法
ORDER BY sale_date DESC, sale_id DESC
LIMIT 10;
```

## **一些新的DB或NoSQL数据库**

- **MongoDB**:

  - OFFSET法: `db.collection.find().sort({sale_date: -1}).skip(100).limit(10)`​ (同样有 `skip` 的性能问题)
  - SEEK法: 利用 `_id`​ 或排序字段进行范围查询，如 `db.collection.find({sale_date: {$lt: last_sale_date_from_prev_page}}).sort({sale_date: -1}).limit(10)`​。如果 `sale_date`​ 不唯一，则需要组合 `_id`​：`db.collection.find({$or: [{sale_date: {$lt: last_sale_date}}, {sale_date: last_sale_date, _id: {$lt: last_id}}]}).sort({sale_date: -1, _id: -1}).limit(10)`
- **Elasticsearch**:

  - OFFSET法: `from`​ 和 `size`​ 参数。`from` 大时性能会下降。
  - SEEK法: `search_after` 参数，推荐用于深度分页。它使用上一页最后文档的排序值来进行下一次查询。

    - 参考: Elasticsearch官方文档 - Search After [https://www.elastic.co/guide/en/elasticsearch/reference/current/paginate-search-results.html#search-after](https://www.elastic.co/guide/en/elasticsearch/reference/current/paginate-search-results.html#search-after)

# 前后端接口定义

## 基于OFFSET法的API

请求：

```
GET /api/v1/sales?page=3&page_size=20
// 或者
GET /api/v1/sales?offset=40&limit=20
```

响应：

```json
{
  "data": [
    // ... 销售记录列表 ...
  ],
  "meta": {
    "current_page": 3,
    "page_size": 20,
    "total_items": 1530, // 获取总数通常需要额外COUNT查询，或在某些场景下可以估算/缓存
    "total_pages": 77
  }
}
```

## 基于SEEK法(游标)的API

请求 (第一页)：

```
GET /api/v1/sales?limit=20
```

请求 (下一页，假设上一页最后一条记录的游标是 "MjAyMy0xMC0yN1QxMDowMDowMFo_OTk4")：

```
GET /api/v1/sales?limit=20&after_cursor=sdiofu93849
```

游标 `after_cursor` 通常是上一页最后一条记录的关键排序字段值的组合（可能经过编码，如Hash之后的Namespace+{Cursor}的组合

响应：

```json
{
  "data": [
    // ... 销售记录列表 ...
  ],
  "meta": {
    "next_cursor": "sdiofu93849", // 指向下一页的游标，如果为null或不存在则表示没有更多数据
    "has_next_page": true, // 或者直接用 next_cursor 是否存在来判断
    "count_in_page": 20 // 当前页实际返回数量
  }
}
```

- **注意**：SEEK法通常不方便提供 `total_items`​ 和 `total_pages`​，因为这需要额外的 `COUNT(*)` 查询，会抵消SEEK法带来的部分性能优势。对于无限滚动场景，用户通常也不关心总页数。

## 性能考量

- **索引**：无论哪种分页方式，`ORDER BY`​ 子句中涉及的列都应该建立合适的索引。对于SEEK法，一个覆盖 `ORDER BY`​ 列和 `WHERE` 条件列的复合索引至关重要。
- ​**​`COUNT(*)`​** ​**的代价**：在OFFSET法中，获取总条目数（用于计算总页数）通常需要执行 `SELECT COUNT(*) FROM table WHERE ...`​。当表很大且`WHERE`​条件复杂时，这个`COUNT`操作本身也可能很慢。

  - 优化`COUNT`​：某些场景下可以接受估算值，或者定期缓存总数。对于PostgreSQL，`EXPLAIN SELECT ...` 的结果中会包含行数估算，但可能不精确。

# 总结与选择建议

|特性|OFFSET 法|SEEK 法 (Keyset/游标)|
| :-----| :-------------------------------| :------------------------------------|
|**性能**|深分页时性能差|性能稳定，不受页码深度影响|
|**跳页**|支持随机跳页|不支持随机跳页，仅支持上一页/下一页|
|**数据稳定性**|可能出现页面漂移|结果相对稳定|
|**实现复杂度**|简单|相对复杂，需处理游标和确定性排序|
|**获取总数**|较容易（但COUNT可能慢）|困难/不推荐|
|**适用场景**|数据量小、浅分页、需要跳页功能|数据量大、无限滚动、高性能要求|

1. **优先考虑SEEK法**：对于需要高性能和数据稳定性的场景，尤其是在无限滚动、feed流等场景，SEEK法是更优的选择。
2. **混合策略**：对于某些既需要跳页又关注深分页性能的后台管理系统，可以考虑：

    - 浅层页（如前100页）使用OFFSET法，允许用户快速跳转。
    - 当用户请求超过一定页码阈值时，提示用户"后续页面请使用上一页/下一页浏览"，并切换到SEEK法。
3. **务必保证确定性排序**：无论哪种方法，`ORDER BY`子句都应包含唯一键，以确保排序的确定性，这是分页正确的基石。
4. **API设计清晰**：向前端明确分页方式（页码还是游标），并提供必要的元信息。

后端分页虽然是一个老生常谈的话题，但随着数据体量的不断膨胀，其重要性日益凸显。选择合适的分页策略，并结合数据库特性进行优化，是构建高性能、可扩展应用的必要环节。

## 参考资料

1. https://use-the-index-luke.com/sql/partial-results/fetch-next-page (本文的核心参考，提供了OFFSET和SEEK法的详细对比和SQL示例)
2. PostgreSQL Official Documentation - `LIMIT`​ and `OFFSET`​: [https://www.postgresql.org/docs/current/queries-limit.html](https://www.postgresql.org/docs/current/queries-limit.html)
3. Elasticsearch Official Documentation - Paginate search results (Search After): [https://www.elastic.co/guide/en/elasticsearch/reference/current/paginate-search-results.html#search-after](https://www.elastic.co/guide/en/elasticsearch/reference/current/paginate-search-results.html#search-after)
