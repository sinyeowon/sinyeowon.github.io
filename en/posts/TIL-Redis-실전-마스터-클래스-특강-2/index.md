---
layout: "post"
title: "[TIL] Redis Practical Master Class 2 - Distributed Locks and Async Processing"
title_source: "manual"
date: 2026-05-14 09:00:00 +0900
last_modified_at: 2026-06-09 01:32:00 +0900
categories: ["Spring 단기 심화", "특강"]
tags: ["Redis"]
description: "We understand the concurrency control method of the MSA environment through Redis distributed lock and Redisson RLock, and summarize the differences between Pub/Sub and Message Queue, asynchronous processing structure, Redlock controversy, and lock failure handling strategy."
description_source: "notion"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-Redis-실전-마스터-클래스-특강-2/"
original_url: "/posts/TIL-Redis-실전-마스터-클래스-특강-2/"
notion_id: "3607788a-fc66-80f8-8a68-cb7bdcaee5a8"
notion_lang: "en"
---
## What I Learned

### Concurrency control and asynchronous communication in MSA distributed environment

#### The biggest enemies of distributed environments: concurrency problems and distributed locks

> **Q Payment war at midnight: What if 100 people press the button at the same time? - 1 stockist, multiple payers**
> - Will oversell
>
> - There is only one item in stock, but a catastrophe occurs where the payment is approved at the same time and the item is sold to multiple people.
>
> → Over-sell occurs

In an MSA environment, multiple servers rush to read and modify inventory data in the DB at the same time, resulting in a disastrous loss of data consistency.

- To prevent this, **Distributed Lock** must be used.

1. **Deepening the distributed locking mechanism: How SETNX works**

    - Distributed lock = public restroom key
        ![image](/assets/img/notion/TIL-Redis-실전-마스터-클래스-특강-2/01-e13b402dc5.png)

    - If multiple servers (people) want to use the restroom (data), make sure that only the person who takes the key (lock) hanging in front of the restroom (Redis) first can enter.
        - Early developers used Redis' `SETNX` (SET if Not eXists) command to create this key.
            - Set the value only when the key does not exist! It means

            - If successful, 1 (lock acquired), if failed, 0 (lock acquired failed) is returned.

> **Q Why `SET key value NX EX` format all at once? (Disaster Scenario)**
>![image](/assets/img/notion/TIL-Redis-실전-마스터-클래스-특강-2/02-49ecffa5dd.png)

    - In the past, a lock was set and an expiration time (TTL) was set separately to prevent the bathroom door from being permanently locked.
        - **12:00:00** - Server A succeeds in `SETNX lock:sneakers 1` (lock acquired!)

        1. **12:00:01** - Just as server A is trying to call `EXPIRE lock:sneakers 5`... **Server A loses power! and leaves.**

        2. **12:00:02** - Since the server died without setting the expiration time, the `lock:sneakers` key will remain in Redis forever.3. **Result**: All other servers will be in **Deadlock** waiting forever for this lock to be released, and no one will be able to get Sneakers.

    → To prevent such disasters, starting with Redis version 2.6.12, lock acquisition and expiration time setting are **completely combined into one atomic command**.

    ```javascript
    SET lock:sneakers "server-A-uuid" NX EX 5
    ```

    - If you write it in one line like this, the lock is applied and an expiration time of 5 seconds is atomically set, so even if the server dies in the middle, the lock is safely released after 5 seconds.

    - **Lock expiration time (TTL) dilemma: 1 second vs 60 seconds**
        - When TTL is set too short
            - It takes 3 seconds for server A to hold the lock and perform payment logic due to network delay.

            - But the lock is already released in 1 second.

            - At this time, server B comes in holding the lock and deducts the inventory.

            **→ Mutual Exclusion Collapse Disorder** Occurs

        - When the TTL is set too long:
            - Server A dies as soon as it holds the lock.

            - Other servers cannot do anything for 60 seconds and continue to fail.

            - **Users will see a payment error window** for an entire minute

> **Q If the TTL is 3 seconds, but the payment logic takes 5 seconds and the lock is released in the middle,
> Even if you are lucky and no other server comes in, what kind of absurd thing will happen if the payment logic is completed and the lock is erased with `DEL lock:sneakers`**
> - Delete the newly acquired lock by another server, not your own lock.
>
> → After 3 seconds, my lock was already naturally destroyed, and after 4 seconds, server B acquired a new lock, and when I finished after 5 seconds, I erased server B's lock.
>
>![image](/assets/img/notion/TIL-Redis-실전-마스터-클래스-특강-2/03-9008952e17.png)
>
> ⇒ So, **put a unique value such as UUID in the value of the lock, and when erasing, verification logic such as ‘Erase only if it matches my UUID!’ is absolutely necessary**

2. **Comparison of concurrency control technologies**

  | Compare items | DB Pessimistic Rock | DB optimistic lock | Redis basic distributed locking | Redisson (RLock) |
  | --- | --- | --- | --- | --- |
  | **principle** | `SELECT FOR UPDATE` | Check the Version column | Single Threaded Spinlock | Pub/Sub based event queuing |
  | **Performance (Throughput)** | **Very Low** | **High** (when no collisions) | **Medium~High** | **Very High** |
  | **Deadlock Risk** | height | doesn't exist | Low (TTL defense) | Low (built-in Watchdog) |
  | **Implementation Difficulty** | facility | commonly | **Very difficult** | facility |
  | **Representative Scenario** | financial core | Edit member information | Light concurrency control | **First come first served coupon, time sale** |

3. **Limited quantity coupon issued on a first-come, first-served basis (actual code Deep Dive)**- ❌ [Version 1] Redis distributed lock implemented directly (full of risk factors!)

        ```java
        public void issueCouponDirect(String userId, String couponId) {
            String lockKey = "lock:coupon:" + couponId;
            String uuid = UUID.randomUUID().toString();
            
            // [위험 1] 락을 얻을 때까지 무한 루프를 도는 Spinlock.
            // Thread.sleep 없이 돌면 Redis에 초당 수만 번 요청을 때려 Redis CPU가 터집니다.
            while (!redisTemplate.opsForValue().setIfAbsent(lockKey, uuid, Duration.ofSeconds(3))) {
                try { Thread.sleep(50); } catch (Exception e) {} 
            }

            try {
                // [위험 2] 락의 TTL(3초)보다 비즈니스 로직이 길어지면 락이 풀려버립니다.
                if (couponRepository.countById(couponId) > 0) {
                    couponRepository.issue(userId, couponId); 
                    // [위험 3] 이 로직이 트랜잭션으로 묶여있다면,
                    // 락이 해제된 이후에 DB 커밋이 발생해 동시성이 깨질 수 있습니다!
                }
            } finally {
                // [위험 4] Exception이 터져도 락이 풀리도록 반드시 finally 안에서 해제.
                // [위험 5] 남이 잡은 락을 내가 지워버릴 수 있습니다. Lua 스크립트로 value 검증 필수!
                if (uuid.equals(redisTemplate.opsForValue().get(lockKey))) {
                    redisTemplate.delete(lockKey); 
                }
            }
        }
        ```

    - ✅ [Version 2] Distributed locking using Redisson (★ Watchdog precautions included)

        ```java
        public void issueCouponRedisson(String userId, String couponId) {
            String lockKey = "lock:coupon:" + couponId;
            RLock lock = redissonClient.getLock(lockKey);

            try {
                // 💡 [사용법 1] Watchdog이 동작하는 방식 (기본 권장)
                // 매개변수: (최대 대기 시간, 시간 단위)
                // 10초 동안 락 획득을 대기. 락 획득 시 작업이 끝날 때까지
                // Redisson의 Watchdog이 기본 30초마다 만료 시간을 자동 연장해 줍니다!
                boolean isLocked = lock.tryLock(10, TimeUnit.SECONDS); 
                
                /* 
                // 💡 [사용법 2] Watchdog이 동작하지 않는 방식 (주의 요망!)
                // 매개변수: (최대 대기 시간, 임대 시간(leaseTime), 시간 단위)
                // 10초 대기 후 락을 획득하면, 비즈니스 로직이 끝나든 말든 무조건 3초 뒤에 락이 해제됩니다.
                // 작업이 3초를 넘어가면 상호 배제가 깨질 수 있으므로, 장애 시 강제 해제용으로만 조심히 써야 합니다.
                boolean isLocked = lock.tryLock(10, 3, TimeUnit.SECONDS); 
                */

                if (!isLocked) {
                    throw new RuntimeException("대기열 초과. 잠시 후 다시 시도해주세요.");
                }

                // 안전한 비즈니스 로직 수행
                if (couponRepository.countById(couponId) > 0) {
                    couponRepository.issue(userId, couponId);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                // 현재 스레드가 락을 쥐고 있는지 자체 검증 후 안전하게 해제
                if (lock.isLocked() && lock.isHeldByCurrentThread()) {
                    lock.unlock();
                }
            }
        }
        ```

#### Postman between services: Redis Pub/Sub vs Message Queue

> **Q When the customer completes the payment, the ordering service must send a ‘payment completion notification’ to the shipping service. What is the critical reason why Redis Pub/Sub should not be used in this case?**
> - Message may be lost midway
>
> → Payment notifications are key data that must arrive 100% of the time.
>
> - **Redis Pub/Sub is like a radio broadcast with no guarantees, so it should not be used alone for important logic**

- **“Fire-and-Forget”**

    - Redis Pub/Sub is like a radio broadcast.
        - **How it works**: DJ (Publisher) sends a story (message) to the channel. At this time, only subscribers who tune in and turn on the radio can hear the story.

        - **Critical limit**: What if the receiving server is briefly restarting for deployment and the connection is lost for a minute? Messages sent during that one minute evaporate into thin air forever (Fire-and-Forget).

    - In contrast, Kafka/RabbitMQ is like a post office (queuing and guarantees)
        ![image](/assets/img/notion/TIL-Redis-실전-마스터-클래스-특강-2/04-bf7de23fa9.png)

        - Messages are stored safely and deleted only after receiving confirmation (Ack).

  | Compare items | Redis Pub/Sub (broadcasting station) | Kafka (Post Office) |
  | --- | --- | --- |
  | **Whether to store the message** | ❌ Do not store (volatilizes immediately) | ⭕ Keep queues on disk/memory |
  | **Receipt confirmation (Ack)** | ❌ No confirmation | ⭕ Consumer sends Ack to remove from queue |
  | **Level of Processing Assurance** | Low (high probability of loss) | **Very high (guaranteed at least once, etc.)** |
  | **Performance (Speed)** | **Extreme speed** (latency < 1ms) | High (heavier than Redis due to disk I/O) |
  | **Operational Complexity** | very low | very high |
  | **Typical usage scenario** | Real-time chat, stock price updates | Payment completion event, **data stream that must never be lost** |

#### How are large Korean IT companies using Redis?

- **How Redis supports tens of thousands of people with one employee**
    - Thanks to Event Loop, tens of thousands of connections can be processed simultaneously with just one thread.

    - However, only one instruction is executed at a time, ensuring perfect atomicity.

    - Therefore, by entering only a short command that will end soon, continuous service without delay is possible, even for one employee.- **Use the atomicity of single threads: concurrency control and distributed locking**
    - [Case 1] Woowa Brothers (Baemin B Mart): Warehouse logistics concurrency control
        - **① Business background**: B-Mart operates a warehouse management system (WMS) that endlessly transfers product inventory from the distribution center (DC) to the regional base (PPC).

        - **② Technical problem that occurred**: There was a lock in the 'Inventory Allocation' function, but there was no lock in the 'Cancel Allocation' function. At the moment when Manager A was allocating inventory, Manager B pressed Cancel, causing a serious incident where the status value was incorrect and there was a discrepancy between the actual warehouse inventory and the DB inventory.

        - **③ Decision to introduce Redis**: This could have been solved with a MySQL DB lock, but locking the DB in a situation where thousands of inventory movements occur could cause the entire logistics system to stop due to connection pool depletion and deadlock, so we chose the lightweight Redis distributed lock.

        - **④ Specific implementation method**: Distributed lock based on `SETNX` was applied and processed in units of ‘transfer request number’.

        - **⑤ Result after introduction**: Achieved 0 concurrency issues.

        - **⑥ What if there was no Redis?**: Due to lock conflicts, delivery riders would have come and gone to pick up items that were out of stock, or the warehouse would have been paralyzed.

    - [Case 2] Toss: Simultaneous control of foreign currency deposits and withdrawals
        - **① Business background**: This is a core financial service that manages customers’ foreign currency deposit account balances.

        - **② Technical problem that occurred**: A situation may occur where 'direct currency exchange', 'automatic collection', and overseas direct purchase 'card payment' are simultaneously credited to the same account in 0.1 seconds.

        - **③ Decision to introduce Redis**: Due to the nature of financial data, excessive withdrawal is fatal. DB lock alone was not enough to completely and quickly process distributed transactions in a multi-server environment.

        - **④ Specific implementation method**: Using Redisson, concurrency was primarily controlled by placing a distributed lock on the basis of **'account number', and then secondary verification of whether transactions were possible through locking at the MySQL DB level was performed.- **⑤ Result after introduction**: Completely blocks balance discrepancies and negative bank accounts due to concurrency errors.

- **Convert to asynchronous mode without data loss: Olive Young first-come, first-served coupon**
    - [Case 3] Olive Young: Issuance of coupons on a first-come, first-served basis (reverse idea of Pub/Sub)
        - **① Business background**: During the All Young Sale period, coupons will be issued to the first 10,000 people on a first-come-first-served basis at 12 o'clock every night.

        - **② Technical problem**: Hundreds of thousands of issuance requests were received at 12 o'clock sharp, occupying 100% of the main DB's connection pool, and a failure occurred that paralyzed the entire Olive Young site.

        - **③ Decision to introduce Redis**: We adopted the familiar Redis instead of the heavy Kafka and converted the synchronous method to an asynchronous method.

        - **④ Specific implementation method (★Contradiction resolution point)**: Ask questions here! “Didn’t you say earlier that Pub/Sub should not be used for important logic because there is a risk of loss?” you're right! So, to prevent data loss, Olive Young safely loaded the issuance request data into the Redis List as **`RPUSH`**. And **Pub/Sub was only used as a light 'trigger' to tell asynchronous workers to "start processing!"** When the Worker receives the notification, it pulls out the data as `LPOP` from the List and records it in the Main DB.

        - **⑤ Result after introduction**: The overall site processing speed improved by 2.2 times by isolating the main DB load.

#### Pitfalls and alternatives to distributed locks

> **Q The user pressed the button to reserve tickets for a popular concert, but it failed because it was already locked. At this time, should 1) keep loading in circles and retry, or 2) should an error be immediately displayed saying, “The seat has already been selected”**
> - Since it is a concert ticket, it is correct to immediately display an error window and let you choose a different seat.
>
> → Unconditional retry (Spin/Retry) is not the answer. The strategy must be completely different depending on the nature of the business.

1. **Is distributed locking really always the answer? (How to control concurrency without locking)**
    - The lock requires three network round trips: acquisition, operation, and release.- For simple counting or inventory deduction, it is much faster to use Redis' atomic commands (`INCR`, `DECR`) without locking.

    - For slightly more complex logic, if you throw the entire **Lua script**, which is supported starting from Redis 2.6, on the server, it will be executed atomically in a single-threaded environment, allowing perfect control without locking.

2. **"The Redlock Algorithm Controversy" (Beyond the Limits of a Single Node)**<br>
> **Q I set a lock on a single Redis Master node, but what happens if the Master dies right before the lock information is synchronized to the Slave?**
> → Since there is no lock on the newly promoted Slave, a situation occurs where another client acquires the lock again.

    - To prevent this, the founder of Redis proposed an algorithm called **Redlock**.
        - A method that requests a lock from an odd number of independent Redis nodes of 5 or more and recognizes it only when a majority (3) or more is obtained.

        - 🚨 **Academic Controversy**: For your information, Redlock has also been the subject of active debate in academic circles. Martin Kleppmann, a distributed systems researcher, criticized Redlock's strong dependence on system clock synchronization in an article titled 'How to do distributed locking' in 2016, and Salvatore Sanfilippo, the founder of Redis, immediately refuted this.

        - 💡 **Conclusion**: In areas where strict distributed consensus is required, such as financial transactions that must never be lost, database transactions or specialized consensus algorithms such as Zookeeper may be more secure than Redlock.

3. **‘Handling strategy when lock acquisition fails’ (harmony between business and UX)**
    1. **Fail-Fast**: This method has the lowest system load as there is no waiting like in concert reservations.

    2. **Spin/Blocking Wait**: Used when it must be processed sequentially even if there is a delay, such as a bank transfer. (Maximum waiting time setting required!)

    3. **Queuing**: Like taking orders during heavy rain in a delivery app, all requests are received, pushed into the queue, and processed sequentially asynchronously.<hr>

## Questions & Errors

**Q What are DB pessimistic locks, DB optimistic locks, Redis distributed locks, and Redisson RLocks and what is the difference between them?**

A. These are methods to prevent conflicts when multiple requests attempt to modify the same data at the same time.

<div class="notion-indent" markdown="1">

- **DB Pessimistic Lock**
It is a “no one should access it until I finish the work” method. It locks the data directly with `SELECT FOR UPDATE`, and although it is safe, performance is slow and there is a risk of deadlock.
It is used in situations where consistency is most important, such as financial transactions.

- **DB Optimistic Lock**
The method is “Let’s edit together first and check for conflicts at the end.” Check for conflicts using the `version` column, and if there are few conflicts, the performance is good.
Used in cases where simultaneous modification is unlikely, such as modifying member information.

- **Redis basic distributed locking**
This is a method of creating a lock (key) in Redis and allowing only requests with the key to work.
It is processed quickly using Redis' single-threaded characteristics, but it is difficult because TTL, retries, error handling, etc. must be implemented directly.

- **Redisson RLock**
This is a library-based lock created to make Redis distributed locking safer and more convenient to use.
It waits in Pub/Sub mode and automatically extends TTL with Watchdog.
It is often used in situations where traffic is high, such as first-come-first-served coupons and time sales.

That is,

- DB lock focuses on data consistency

- Redis/Redisson locks are centered on controlling concurrent requests in a distributed server environment

You can understand this as follows.

</div>

**Q Redis Pub/Sub**

A. Notification structure that separates the sender and receiver of messages

<div class="notion-indent" markdown="1">

Here, Pub/Sub means the following, respectively:

- **Pub(Publish)**: Publishing a message

- **Sub(Subscribe)**: Subscribe and wait for messages

To put it simply, it is similar to **group chat room notification**.

Just as when someone sends a message to a group chat room, the people in the room immediately receive the message, in Redis, when an event occurs, a message can be delivered to the subscribed target.Redisson lock uses this structure to wait without continuously checking whether the lock has been released.

When the request holding the lock finishes its work and releases the lock, Redis notifies the waiting request that “the lock has been released.”

In other words, Redis Pub/Sub is not a method that asks continuously, but a method that notifies you when it is resolved.

</div>

**Q Why did you choose Redis distributed lock rather than MySQL DB lock?**

A. Concurrency problems can be solved with MySQL DB locks.

<div class="notion-indent" markdown="1">

However, in an environment where thousands of inventory movement requests occur simultaneously, such as a logistics system, directly locking the DB can be burdensome.

- If DB lock is used, other requests must wait until the task is completed.

- The DB connection continues to be used while waiting.

- If there are many requests, the connection pool may become insufficient.

- Deadlocks can also occur when multiple requests wait for each other to lock.

- In severe cases, there is a risk that the entire logistics system will slow down or stop.

So, we used Redis distributed locks instead of DB to first control the request order.

Redis is memory-based, so it can handle locks much faster and more lightly than DB.

In other words, Redis distributed locking is a method used to reduce DB burden and manage request order stably in an environment with many concurrent requests.

</div>

**Q Why did you switch from synchronous to asynchronous using Redis?**

A. Olive Young's first-come-first-served coupon event received hundreds of thousands of requests at the same time at 12 o'clock at night.

<div class="notion-indent" markdown="1">

If you process it in a synchronous way, which stores it in the DB immediately every time a request comes in, like the existing method, all requests will be concentrated in the main DB at once.

- As a result, the DB connection pool quickly filled up.

- A problem occurred where the entire site slowed down or paralyzed.

So, we changed the structure by first storing requests in Redis rather than storing them in the DB right away.

- User requests are stored in the Redis List. (`RPUSH`)

- Pub/Sub is used only to notify the Worker, “Start processing!”- Worker pulls out data one by one from the Redis List (`LPOP`) and stores it in the DB.

In other words, the request was changed to an asynchronous method that does not process the request immediately, but queues it in Redis for a while and processes it later.

Through this, we were able to reduce the phenomenon of a large number of requests being made to the main DB at once, and also improve overall site performance.

</div>

**Q Why did the Redlock algorithm appear and why was there controversy**

A. Existing Redis distributed locks were usually stored on a single Redis Master server.

<div class="notion-indent" markdown="1">

But there was one problem.

For example:

- Client A acquires lock on Master

- Before lock information is copied to Slave

- Master server suddenly dies

- Slave is promoted to new Master

In this situation, because the new Master has no lock information, another client can acquire the same lock again.

In other words, the lock was originally supposed to be held by only one person, but due to server failure, a problem arose where two people could act as if they had the lock at the same time.

To solve this problem, the founder of Redis proposed the Redlock algorithm.

Redlock:

- Don’t trust only one Redis

- After requesting locks from multiple independent Redis servers simultaneously

- This method recognizes success only when more than half of the locks are obtained.

For example, if you have 5 Redis servers:

- Obtain 3 or more locks → Success

- 2 or less → failure

The purpose was to increase stability even if some servers died.

But then a controversy arose.

Martin Kleppmann, a distributed systems researcher:

- Redlock relies heavily on system time synchronization

- Criticized that it may not be completely safe in certain disability situations.

In other words, he argued, “It may be dangerous in truly important financial transactions or systems that require strong distributed consensus.”

So now it is used differently depending on the situation.

- General services such as first-come-first-served coupons and inventory processing → Redlock available

- Financial transactions, a system where data errors cannot occur → Use a stronger consensus system such as Zookeeper

You can understand this as follows.

</div>
