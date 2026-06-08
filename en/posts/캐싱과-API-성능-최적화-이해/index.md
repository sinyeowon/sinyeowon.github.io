---
layout: "post"
title: "Understand caching and API performance optimization"
date: 2026-06-06 09:00:00 +0900
last_modified_at: 2026-06-09 01:13:00 +0900
categories: ["Spring 단기 심화", "심화 주차"]
tags: ["TIL", "Cache"]
description: "Based on the concepts of caching and Redis, we organized Cache Hit/Miss, TTL, and cache invalidation strategies, and learned what to consider when applying caching in optimizing API performance."
description_source: "notion"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/캐싱과-API-성능-최적화-이해/"
original_url: "/posts/캐싱과-API-성능-최적화-이해/"
notion_id: "3777788a-fc66-8088-ad79-c6efd0e9c3ac"
notion_lang: "en"
---
## Concepts learned today

- Caching

    <hr>

In web services, the basic method is to always access the database whenever a user requests it. However, if all requests reach the DB every time, the larger the number of requests, the greater the burden on the DB. In particular, it is more efficient to temporarily store and reuse data that is repeatedly viewed by multiple users, such as notices, popular product lists, main page banners, and frequently viewed posts, in faster storage than to retrieve it from the DB each time.

The method used at this time is **caching**. Caching is a strategy that stores frequently used data in a space where it can be accessed more quickly, and retrieves data from the cache rather than the DB of the original storage from the next request.

## Reasons to use cache

The biggest reason to use cache is **improved response speed and reduced DB load**.

For example, assuming that many users view the same announcement, if there is no cache, all requests are sent to the DB. If there are 1,000 users, DB queries can occur 1,000 times. However, if you query DB data in the first request and store the results in a cache such as Redis, subsequent requests can retrieve data from the cache rather than the DB.

This way, the DB will receive fewer repeated inquiry requests, and users will receive faster responses.

In other words, rather than simply ‘a place to store data,’ the cache can be viewed as a performance optimization layer to quickly provide frequently viewed data.

## Cache Hit and Cache Miss

The important concepts summarized while solving the problem are **Cache Hit and Cache Miss**.

**Cache Hit** is when the requested data exists in the cache.

In this case, the response speed is fast because data can be retrieved directly from the cache without going to the DB.

Conversely, **Cache Miss** is when the requested data is not in the cache.

In this case, data is searched in the DB, the search results are stored in the cache, and a response is made. If the same data request comes in later, a cache hit may occur.

1. The user requests data.

2. First, check whether there is data in the cache.

3. If it is in the cache, it responds directly from the cache.

4. If it is not in the cache, look it up in the DB.

5. Store the DB search results in the cache.

6. Respond to the user.By understanding this flow, you can see why caching reduces the number of DB accesses.

## Why use Redis as a cache

Redis is often used as a cache storage.

Because Redis stores data mainly **memory-based** rather than on disk, it can read and write data much faster than DB. Therefore, storing frequently viewed data in Redis can improve API response speed.

Of course, it is also possible to store data in the application's internal memory. This method is very fast, but data may be lost when the application is restarted, and when there are multiple servers, the cache status may vary on each server. On the other hand, having Redis as a separate cache storage has the advantage of allowing multiple application servers to share the same cache.

Therefore, large-scale services often use an external in-memory storage such as Redis as a cache layer.

## TTL and cache expiration policy

Cache is fast, but it doesn't always guarantee that the data is up-to-date.

Therefore, a policy is needed to determine how long data stored in the cache is valid. The concept used here is **TTL (Time To Live)**.

TTL is the validity time of data stored in the cache. For example, if you set certain data to be stored in the cache for only 10 minutes, it may automatically disappear from the cache after 10 minutes.

If data does not change frequently, you can set the TTL longer. For example, data that changes infrequently, such as announcement lists or category lists, has few problems even if cached for a long time.

Conversely, for data that changes frequently or for which accuracy is important, such as inventory quantity, order status, or payment status, the TTL should be set short or caching itself should be applied carefully.

Through today's problem, we were able to summarize that in caching, it is not simply 'storing is faster', but also considers **how long to store, when to update, and how important freshness is**.

## Cache invalidation and data consistency

The most important thing to watch out for in caching is **data consistency**.

If data in the DB has changed, but old data remains in the cache, users may see outdated information. For example, if the product price has changed in the DB, but the previous price remains in Redis, the incorrect price may be exposed to the user.

To solve this problem, the cache must be processed together when data changes.There are two representative methods.

<div class="notion-indent" markdown="1">

1. Clear cache

2. Cache update

</div>

**Cache deletion** is a method of deleting the related cache when DB data is changed. Afterwards, when the user searches again, a cache miss occurs, and the latest data is retrieved from the DB and stored in the cache again.

**Cache update** is a method of changing the cache value to the latest value when DB data changes.

Both methods have pros and cons. Cache deletion is relatively simple to implement, but DB access occurs again during the next query. Cache updates can immediately maintain the latest data, but the update logic can become complicated.

Ultimately, cache strategies must be designed differently depending on service characteristics and data characteristics.

## Caching from an API performance optimization perspective

Most web APIs take a lot of time in tasks such as DB queries, external API calls, and file I/O. Therefore, to improve performance, you need to identify where bottlenecks occur.

Caching is especially effective when there are many read requests and few data changes.

For example, the following data is suitable for caching:

<div class="notion-indent" markdown="1">

- Frequently viewed notices

- Main page banner

- Category list

- List of popular posts

- Settings with low frequency of change

- Data commonly viewed by multiple users

</div>

Conversely, you should be careful about caching the following data:

<div class="notion-indent" markdown="1">

- Real-time inventory

- Payment status

- Sensitive information for each user

- Data whose response varies depending on authority

- Frequently changing data

</div>

I felt that it was important that caching should not be applied unconditionally to all APIs, but that application should be judged based on reading frequency and change frequency.

<hr>

## What I felt

While solving the problem of caching and API performance optimization today, I learned that caching is not simply a “technology to make things faster.”

At first, I thought that storing data in Redis would inevitably improve performance, but in reality, I had to consider what data to cache, how long to keep it, and how to handle the cache when the data changes.In particular, it was important to note that although a cache can reduce DB load, if it is managed incorrectly, it can display old data to users. So I felt that caching was a balancing act between performance and data accuracy.

From an API performance optimization perspective, the structure of unconditionally sending all requests to the DB may have limitations as the number of requests increases. Different strategies should be adopted depending on the characteristics of the data, such as using cache for frequently viewed data and carefully applying caching for data where accuracy is important.
