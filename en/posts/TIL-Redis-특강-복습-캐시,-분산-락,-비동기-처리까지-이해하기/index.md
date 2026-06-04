---
layout: "post"
title: "[TIL] Review of Redis special lecture: Understanding cache, distributed locking, and asynchronous processing"
date: 2026-06-05 09:00:00 +0900
last_modified_at: 2026-06-05 00:57:00 +0900
categories: ["Spring 단기 심화", "심화 주차"]
tags: ["Redis"]
description: "I knew Redis as a simple cache storage, but while reviewing the special lecture notes, I summarized how Redis is used in caching, distributed locking, first-come-first-served event processing, and asynchronous structure."
description_source: "notion"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-Redis-특강-복습-캐시,-분산-락,-비동기-처리까지-이해하기/"
original_url: "/posts/TIL-Redis-특강-복습-캐시,-분산-락,-비동기-처리까지-이해하기/"
notion_id: "3757788a-fc66-8069-8f7c-e553e2b6e5c3"
notion_lang: "en"
---
## What I reviewed today

- Differences between Redis and Memcached

- Meaning of caching

- Role of Batch and Worker

- Connection pool depletion issue

- Redis distributed locking and Redisson

- Asynchronous processing using Kafka

- Comparison of Redis and Kafka in first-come-first-served coupon issuance example

- Possibility of loss of Redis Pub/Sub and use of Redis List

- Limitations of Redis Master/Slave structure and Redlock algorithm

<hr>

## Redis and Memcached

Redis and Memcached are both memory-based storage, and are often used as caches to quickly retrieve frequently used data.

Memcached specializes in simple key-value caches. Although the structure is simple and fast, it is a string-oriented storage method and has little support for persistence or complex data structures.

On the other hand, Redis is a key-value storage and supports various data structures. Data structures such as String, List, Set, Hash, and Sorted Set can be used, and can be used not only as a cache but also as a distributed lock, ranking, queue, and session storage.

→ Memcached is suitable for simple caches, and Redis is suitable for situations that require more diverse functions, including caches.

### What is caching?

Caching refers to storing data that has been viewed once in temporary storage and quickly retrieving it the next time the same data is needed.

- Example: Product detailed information inquiry<br>
    If you access the DB every time you look up product details, the DB load may increase. At this time, if you save product information in Redis or Memcached, you can retrieve data directly from the cache rather than the DB from the next request.

Using caching can speed up response speed and reduce DB load. However, since the cache is not an original data storage, it is suitable for storing data that can be recreated even if it disappears.

## Batch and Worker

Batch is a method of processing tasks at once by gathering them according to a certain time or condition, rather than processing them one by one in real time.

For example, settling orders every night at 12 o'clock or generating statistical data every morning is batch processing.

Worker is a background worker that takes out tasks accumulated in a queue or message broker and actually processes them.- Example: First-come-first-served coupon issuance<br>
    The API server does not store user requests directly in the DB, but stores them in Redis List or Kafka. Afterwards, the Worker takes out the requests one by one and performs the actual coupon issuance processing.

```plaintext
API 서버 = 요청 접수 담당
Redis List / Kafka = 작업 대기열
Worker = 실제 처리 담당
DB = 최종 저장소
```

→ By separating roles in this way, the API server can quickly receive requests, and the actual heavy work can be handled reliably by the worker.

## Connection pool exhaustion

Connection pool depletion refers to a state in which all connections made in advance by an application to connect to the DB are being used.

A request borrows a connection from the connection pool to perform a DB operation, and returns it when the operation is complete. However, if a query takes a long time, a transaction remains long, or a lock wait occurs, connection release is delayed.

As a result, new requests may wait or timeouts may occur because they cannot obtain a connection to use.

- Example: First-come-first-served coupon issuance<br>
    When a large number of requests are received in a short period of time, connection pool depletion problems may occur if all requests access the DB directly. So, you can use a structure that controls requests in front of the DB using Redis or Kafka.

## Redis distributed locking and Redisson

Distributed locking is a method of controlling multiple servers from accessing the same resource at the same time.

If there is one server, simultaneous access can be prevented using Java's synchronized method, but if there are multiple servers, the memory of each server is not shared. Therefore, locks can be managed using Redis, which multiple servers can commonly access.

In the Java/Spring environment, Redisson is often used rather than directly implementing Redis distributed locking. Redisson is a Redis-based Java client library that allows distributed locks to be used like objects through RLock.

```java
RLock lock = redissonClient.getLock("stock:" + productId);

boolean available = false;

try {
    available = lock.tryLock(3, 10, TimeUnit.SECONDS);

    if (!available) {
        throw new RuntimeException("잠시 후 다시 시도해주세요.");
    }

    decreaseStock(productId);

} finally {
    if (available && lock.isHeldByCurrentThread()) {
        lock.unlock();
    }
}
```

Using Redisson, you can reduce the burden of directly implementing lock acquisition, lock release, and expiration time setting. Additionally, through the lock watchdog function, the lock expiration time can be automatically extended while the thread holding the lock is alive.

## Synchronous and asynchronous methods

The synchronous method sends a request and then waits for the result to arrive.- Example<br>
    If order-service calls delivery-service directly when creating an order, order-service must wait for a response from delivery-service.

    In this case, if a failure occurs in the delivery-service, order creation may also fail. In other words, a problem of tight coupling between services arises.

On the other hand, the asynchronous method does not wait for the other service to process after sending a request, but finishes its own work first after leaving an event or message.

- Example<br>
    The Order Service issues an order creation event to Kafka, and the Delivery Service subscribes to the event and creates delivery. This ensures that delivery service failures do not directly impact the order creation flow.

```java
동기 = 지금 바로 결과가 필요할 때
비동기 = 나중에 처리돼도 괜찮을 때
```

However, asynchronous methods are not always better. The synchronous method is suitable for functions where the user needs to know the success/failure results immediately, such as logging in, verifying permissions, and approving payment. On the other hand, asynchronous methods are suitable for functions that can tolerate some delay, such as sending notifications, collecting statistics, and creating deliveries.

## What is Kafka?

Kafka is a large-capacity event streaming platform. The structure is such that when the producer publishes a message to the topic, the consumer subscribes to it and processes it.

- Producer → Kafka Topic → Consumer

Kafka stores messages in a disk-based log, and the consumer manages how far the message has been read based on the offset. Therefore, even if the Consumer briefly fails, it can read and process messages again after recovery.

In an MSA environment, Kafka can be used to reduce direct dependencies between services, mitigate failure propagation, and implement asynchronous event-based processing.

### Example of first-come-first-served coupon issuance

If first-come-first-served coupon issuance is processed in a synchronous manner, the coupon quantity must be searched in the DB each time a user request is received, the issuance details saved, and the coupon quantity deducted.

However, if hundreds of thousands of people make requests at the same time, the load on the DB may increase, and problems such as lock waiting and connection pool depletion may occur. Additionally, if multiple requests attempt to issue the same coupon quantity at the same time, over-issuance problems may occur.

To improve this, you can switch to an asynchronous method.

```plaintext
사용자 요청
→ Redis 또는 Kafka에 발급 요청 저장
→ 사용자에게 접수 완료 응답
→ Worker가 요청을 순서대로 처리
→ DB에 최종 발급 내역 저장
```

Redis is suitable for first-come-first-served quantity restrictions through fast atomic operations. For example, using Redis' DECR command, you can quickly reduce the quantity of coupons and create a structure that only allows up to 100 people to pass.

Kafka has the advantage of stably storing large amounts of issuance request events, processing them in order for consumers, and reprocessing them in the event of a failure.

→ Therefore, Redis and Kafka can be used together for first-come-first-served coupon issuance.

```plaintext
Redis = 빠른 선착순 컷
Kafka = 발급 요청 이벤트를 안정적으로 저장하고 비동기 처리
DB = 최종 발급 결과 저장
```

## Redis Pub/Sub and Redis List

Redis Pub/Sub is a structure where when a message is published, it is delivered to the subscribed Subscriber. However, since messages are not stored, messages cannot be received if the Subscriber is turned off or has a problem at the moment.

Therefore, there is a risk of losing important coupon issuance request data if it is only delivered to Redis Pub/Sub.

```plaintext
쿠폰 발급 요청
→ Pub/Sub으로 발행
→ Worker 장애
→ 메시지 유실
→ 요청 데이터 유실
```

However, the story is different if you use Pub/Sub only as a trigger for notifications and save the actual request data in the Redis List.

```plaintext
쿠폰 발급 요청
→ Redis List에 RPUSH로 요청 데이터 저장
→ Pub/Sub으로 Worker에게 알림
→ Worker가 Redis List에서 LPOP으로 데이터 꺼내 처리
```

In this structure, important data is not stored in Pub/Sub but in the Redis List. Therefore, even if the Pub/Sub notification is lost, the request data itself remains in the List.

```plaintext
Redis List = 대기표 보관함
Redis Pub/Sub = 알림벨
Worker = 대기표를 보고 처리하는 작업자
```

In other words, it is appropriate to use Redis Pub/Sub not for safely delivering important data, but as a light trigger to notify you that there is data to process.

## Redis Master/Slave structure and Redlock

In Redis, the Master/Slave structure is one in which one Master is responsible for writing, and the Slave replicates the Master's data. These days, the expression Primary/Replica is used more often than Master/Slave.

```plaintext
Master = 쓰기 작업을 담당하는 메인 서버
Slave = Master 데이터를 복제하는 보조 서버
```

The problem is when the Master suddenly dies when using Redis as a distributed lock.

```plaintext
1. Client A가 Master에 락을 획득
2. 락 정보가 Slave로 복제되기 전에 Master 장애 발생
3. Slave가 새 Master로 승격
4. 새 Master에는 A의 락 정보가 없음
5. Client B도 락을 획득

```

→ As a result, a situation may arise where Client A and Client B think they have the same lock at the same time.To compensate for this, the founder of Redis proposed the Redlock algorithm. Redlock does not lock only one Redis node, but requests a lock from multiple independent Redis nodes and acknowledges the lock only when more than half of them succeed in obtaining the lock.

For example, the lock is considered to have been obtained only when the lock is successfully acquired from at least 3 out of 5 Redis nodes.

However, Redlock is not a perfect solution either. In distributed systems, network delays, server time differences, and state inconsistencies may occur during disaster recovery. Therefore, in areas that must never be messed up, such as financial transactions or account transfers, stronger consensus methods such as DB transactions, Zookeeper, etcd should be considered rather than Redis distributed locks.

<hr>

## Cleanup

Redis is not simply a tool used as a cache, but is an in-memory storage that can implement distributed locks, first-come-first-served event processing, and even queue-like structures using various data structures and atomic operations.

However, Redis does not solve all problems. Since Redis Pub/Sub does not store messages, there is a risk of loss if used to transmit important data, and Redis-based distributed locks also have limitations in situations of master failure or replication delay.

Although Kafka is heavier than Redis, it can reliably store and reprocess messages, making it suitable for event-based asynchronous processing. On the other hand, Redis is suitable for situations that require fast atomic operations and lightweight structures.

In the end, what is important is not the technology itself, but choosing it according to the situation.

Through this review, I was able to understand Redis not as a simple cache storage, but as a tool for improving performance and controlling concurrency. At the same time, I learned that safe design can only be achieved by knowing the limitations of Redis.
