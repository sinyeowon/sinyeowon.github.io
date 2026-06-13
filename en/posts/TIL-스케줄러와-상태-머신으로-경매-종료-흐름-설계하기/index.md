---
layout: "post"
title: "[TIL] Designing auction termination flow with scheduler and state machine"
date: 2026-06-14 00:00:00 +0900
last_modified_at: 2026-06-14 01:14:00 +0900
categories: ["Spring 단기 심화", "심화 프로젝트"]
tags: ["Scheduler", "상태 머신"]
description: "This article summarizes what we learned about designing the auction completion flow using a scheduler and state machine."
description_source: "excerpt"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-스케줄러와-상태-머신으로-경매-종료-흐름-설계하기/"
original_url: "/posts/TIL-스케줄러와-상태-머신으로-경매-종료-흐름-설계하기/"
notion_id: "37e7788a-fc66-805b-9f15-fbf5c60909be"
notion_lang: "en"
---
> We learned the concepts of scheduler and state machine and applied them to the auction end scenario, summarizing the difference between fixedRate and fixedDelay, state transition rules, and the need for the RESULT_PENDING state.

## What we learned today

- Why you need a scheduler

- How to use `@Scheduled`

- Difference between `fixedRate`, `fixedDelay`, `cron`

- State value enum design

- Write state transition rules

- How to prevent incorrect state changes

- Apply scheduler and state machine to auction end scenario

- Concern about which method to choose between fixedRate and fixedDelay

    <hr>

## Why you need a scheduler

Backend APIs are usually executed when a user request comes in.

For example, when a user creates an auction or places a bid, the corresponding API is called.

However, the end of the auction does not occur when the user presses a button; the server must automatically end the auction over time.

For example, assume you have the following auction data:

```plaintext
auctionId: 1
status: ONGOING
endAt: 2026-06-14 23:00:00
```

When the current time reaches 23:01, this auction should no longer be ONGOING.

However, unless the user views the auction or sends a separate request, the server has no opportunity to process this auction.

What you need at this time is a scheduler.

A scheduler is a function that automatically executes specific logic at set times.

The auction service can play the following roles:

<div class="notion-indent" markdown="1">

- Runs every 60 seconds
    - ONGOIN auction inquiry past the end time

    - Change to RESULT_PENDING state

</div>

In other words, a scheduler is needed to process tasks that must be automatically executed on a time-based basis.

### How to use `@Scheduled`

In Spring Boot, you can implement a scheduler using `@Scheduled`.

First, add `@EnableScheduling` to the main class or configuration class to activate the scheduler function.

```java
@EnableScheduling
@SpringBootApplication
public class AuctionApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuctionApplication.class, args);
    }
}
```

After that, write a scheduler class.

```java
@Component
@RequiredArgsConstructor
public class AuctionScheduler {

    private final AuctionService auctionService;

    @Scheduled(fixedRate = 60000)
    public void markExpiredAuctionsAsPending() {
        auctionService.markExpiredAuctionsAsPending();
    }
}
```

The above code means that the `markExpiredAuctionsAsPending()` method is executed every 60 seconds.

Here, the scheduler class must be registered as a Spring Bean, so `@Component` must be added.

### fixedRate / fixedDelay / cron difference

`@Scheduled` has several implementation methods.

#### fixedRate

```java
@Scheduled(fixedRate = 60000)
```

`fixedRate` runs at regular intervals based on the start time of the previous task.

In other words, the standard is when the work started rather than when it was finished.

It is suitable for tasks that need to be executed as periodically as possible, every 60 seconds.

#### fixedDelay

```java
@Scheduled(fixedDelay = 60000)
```

`fixedDelay` executes the next task a certain period of time after the previous task is completed.

This is suitable when the next task must be executed after the previous task has completely finished.

For example, in cases where operations may take a long time, such as external API calls, large data processing, or reprocessing operations, `fixedDelay` is safer.

#### cron

```java
@Scheduled(cron = "0 0 6 * * *")
```

`cron` is used when you want to execute at a specific time rather than at regular intervals.

For example, the above cron expression means that it runs every day at 6 AM.

Spring cron expressions generally have the following order:

```plaintext
초 분 시 일 월 요일
```

Therefore, it is suitable for tasks that must be executed at a fixed time, such as midnight every day or 9 a.m. every Monday.

## State value enum design

If you manage the auction status directly as a string, errors may occur due to typos or capitalization issues.

Therefore, it is safe to manage state values ​​as enums.

The following status values ​​can be used in the auction service.

```java
public enum AuctionStatus {
    ONGOING,
    RESULT_PENDING,
    WON,
    FAIL
}
```

The meaning of each state is as follows.

```plaintext
ONGOING: 경매 진행 중
RESULT_PENDING: 경매는 종료되었지만 결과 처리 대기 중
WON: 낙찰 성공
FAIL: 유찰 또는 낙찰 실패
```

The important point here is the meaning of `FAIL`.`FAIL` should indicate a failure of business results, not a system error.

For example, if there are no bidders or the winning conditions are not met, it can be processed as `FAIL`.

However, failure to check the highest price, failure to respond to the auction engine, network errors, etc. are closer to system processing failures rather than successful bid failures.

Therefore, in this case, it is safer to maintain the `RESULT_PENDING` state without changing it to `FAIL`.

### Writing state transition rules

A state machine is a rule that governs which states can be moved from the current state.

The auction status must not be changed arbitrarily.

For example, the normal flow is:

```plaintext
ONGOING → RESULT_PENDING → WON
ONGOING → RESULT_PENDING → FAIL
```

On the other hand, the following flow is strange.

```plaintext
WON → ONGOING
FAIL → WON
ONGOING → WON
ONGOING → FAIL
```

The bid for `WON` has already been completed and must not be returned to the ongoing process.

Additionally, if `ONGOING` is changed directly to `WON` or `FAIL`, the result processing waiting step is skipped, making the status flow unclear.

Therefore, the state transition rules can be summarized as follows.

| **Current Status** | **event** | **Next state** | **explanation** |
| --- | --- | --- | --- |
| `ONGOING` | Auction end time reached | `RESULT_PENDING` | Auction end processing begins |
| `RESULT_PENDING` | There is a successful bidder | `WON` | successful bid |
| `RESULT_PENDING` | no bidders | `FAIL` | auction |
| `RESULT_PENDING` | Result processing failed | `RESULT_PENDING` | maintain status |

By writing state transition rules like this, you can prevent incorrect state changes.

### Prevent incorrect state changes

Even if the state value is managed as an enum, the state may be changed incorrectly if `setStatus()` can be called directly from outside.

```plaintext
auction.setStatus(AuctionStatus.WON);
```

If you write it like this, you can immediately change it to `WON` without checking what the current state is.

Therefore, it is safer to create a state change method in the entity and verify the current state within it.

```java
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Auction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime endAt;

    @Enumerated(EnumType.STRING)
    private AuctionStatus status;

    public void markResultPending() {
        if (this.status != AuctionStatus.ONGOING) {
            throw new IllegalStateException("진행 중인 경매만 결과 대기 상태로 변경할 수 있습니다.");
        }

        this.status = AuctionStatus.RESULT_PENDING;
    }

    public void markWon() {
        if (this.status != AuctionStatus.RESULT_PENDING) {
            throw new IllegalStateException("결과 대기 상태에서만 낙찰 처리할 수 있습니다.");
        }

        this.status = AuctionStatus.WON;
    }

    public void markFail() {
        if (this.status != AuctionStatus.RESULT_PENDING) {
            throw new IllegalStateException("결과 대기 상태에서만 유찰 처리할 수 있습니다.");
        }

        this.status = AuctionStatus.FAIL;
    }
}
```

In this way, the auction state is changed only through the specified method.In other words, rather than simply changing the state value, the state is changed through meaningful actions such as `markResultPending()`, `markWon()`, and `markFail()`.

This method has the advantage of allowing state change rules to be collected inside the entity.

## Applies to auction end scenario

In auction end scenarios, schedulers and state machines can be used together.

First, the scheduler checks for auctions whose end time has passed every 60 seconds.

```java
@Component
@RequiredArgsConstructor
public class AuctionScheduler {

    private final AuctionService auctionService;

    @Scheduled(fixedRate = 60000)
    public void markExpiredAuctionsAsPending() {
        auctionService.markExpiredAuctionsAsPending();
    }
}
```

In the Repository, only `ONGOING` auctions whose end time has passed are viewed.

```java
public interface AuctionRepository extends JpaRepository<Auction, Long> {

    List<Auction> findAllByStatusAndEndAtBefore(
            AuctionStatus status,
            LocalDateTime now
    );
}
```

The service changes the viewed auction to the status of `RESULT_PENDING`.

```java
@Service
@RequiredArgsConstructor
public class AuctionService {

    private final AuctionRepository auctionRepository;

    @Transactional
    public void markExpiredAuctionsAsPending() {
        List<Auction> expiredAuctions =
                auctionRepository.findAllByStatusAndEndAtBefore(
                        AuctionStatus.ONGOING,
                        LocalDateTime.now()
                );

        for (Auction auction : expiredAuctions) {
            auction.markResultPending();
        }
    }
}
```

This flow can be defined as follows.

```plaintext
매 60초마다 스케줄러 실행
→ status = ONGOING, endAt <= now인 경매 조회
→ 조회된 경매를 RESULT_PENDING으로 변경
```

Afterwards, when the highest price or successful bid result is delivered from the auction engine, the result is reflected.

```java
@Transactional
public void applyAuctionResult(Long auctionId, boolean hasWinner) {
    Auction auction = auctionRepository.findById(auctionId)
            .orElseThrow(() -> new IllegalArgumentException("경매를 찾을 수 없습니다."));

    if (hasWinner) {
        auction.markWon();
    } else {
        auction.markFail();
    }
}
```

Even at this time, incorrect state changes can be prevented because `markWon()` and `markFail()` internally verify that the current state is `RESULT_PENDING`.

<hr>

## Questions that arise during learning and resolution process

At first I thought it would be safer to use `fixedDelay` when implementing the auction termination scheduler.

`fixedDelay` is a method of executing the next task a certain period of time after the previous task is completed.

```java
@Scheduled(fixedDelay = 60000)
```

Therefore, you can avoid a situation where the next scheduler is run again when the previous scheduler task has not yet finished.

For example, I thought about a case where the primary scheduler operation takes a long time because there are many auctions that have ended.

```plaintext
10:00:00 1차 스케줄러 실행
→ 종료된 경매 처리 중

10:01:00 2차 스케줄러 실행
→ 1차 작업이 아직 끝나지 않았는데 같은 경매를 다시 처리할 수 있음
```

In this case, it was thought that closing processing for the same auction may overlap, or that successful bid confirmation and event issuance may overlap.

So, at first, we decided that `fixedDelay`, in which the next task is executed after the previous task is finished, was safer.However, when I later reconsidered the purpose of processing the end of the auction, a question arose.

There are multiple auction rooms, and each auction must be confirmed to end as quickly as possible when the end time comes.

However, when using `fixedDelay`, if the previous task takes a long time, the next scheduler execution itself is delayed.

For example, the following situation may arise:

```plaintext
10:00 스케줄러 실행
→ 종료된 경매방 5,000개 처리
→ 10:05 작업 종료
→ fixedDelay 60초 대기
→ 10:06 다음 스케줄러 실행
```

In this case, even if there are new auctions that ended at 10:01, 10:02, and 10:03, they may not be confirmed until 10:06.

In other words, `fixedDelay` is safe to avoid duplicate execution, but it has the disadvantage that confirmation of newly ended auctions may be delayed if the operation time is long.

To solve this problem, we considered separating the scheduler's responsibilities again.

At first, I thought the scheduler would handle all the tasks after the auction ended.

```plaintext
종료된 경매 조회
→ 최고가 판단
→ 낙찰자 결정
→ 이벤트 발행
→ 알림 발송
→ 상태 변경
```

However, this increases the likelihood that the scheduler work will become heavier and the execution time will be longer.

Therefore, it was judged more appropriate to minimize the role of the scheduler at the MVP stage.

The scheduler is not responsible for determining successful bidders or issuing events, and is only responsible for changing `ONGOING` auctions that have expired to `RESULT_PENDING`.

```plaintext
스케줄러 역할:
ONGOING → RESULT_PENDING
```

And later, when the highest price and successful bid result is delivered from the auction engine, it is changed to `WON` or `FAIL` in a separate flow.

```plaintext
경매 엔진 결과 전달
→ RESULT_PENDING → WON / FAIL
```

If the roles are divided in this way, the scheduler task becomes relatively light because it is a simple DB state change.

Therefore, it was judged that it was more important to check the auction target for termination every 60 seconds, and the decision was ultimately changed to use `fixedRate` rather than `fixedDelay`.

```java
@Scheduled(fixedRate = 60000)
```

`fixedRate` runs at regular intervals based on the start time of the previous task.

In other words, you can periodically check for auctions whose end time has passed every 60 seconds.
```plaintext
10:00:00 스케줄러 실행
10:01:00 스케줄러 실행
10:02:00 스케줄러 실행
```

To summarize, it is as follows.

```plaintext
처음 판단:
중복 실행을 피하기 위해 fixedDelay가 더 안전하다고 생각함

다시 고민한 점:
fixedDelay는 이전 작업이 오래 걸리면 다음 경매 종료 확인 자체가 밀릴 수 있음

최종 판단:
스케줄러의 역할을 가볍게 만들고, 매 60초마다 확인하기 위해 fixedRate를 사용하기로 함
```

However, using `fixedRate` again raises questions about the possibility of duplicate processing.

When the scheduler runs every 60 seconds, what happens if the previous scheduler is changing some auction to `RESULT_PENDING` and the transaction has not yet committed?

For example, the following situation:

```plaintext
1차 스케줄러 실행
→ auctionId = 10 조회
→ status = ONGOING 확인
→ 엔티티 상태를 RESULT_PENDING으로 변경
→ 아직 트랜잭션 커밋 전
```

At this time, the entity status has changed to `RESULT_PENDING` within the primary scheduler's transaction, but since it has not yet been committed, other transactions cannot see the DB changes.

Therefore, if the secondary scheduler queries the same auction, it may still appear in the DB as follows:

```plaintext
auctionId = 10
status = ONGOING
```

In other words, even from the secondary scheduler's perspective, the auction can still be viewed as an auction that satisfies the conditions `status = ONGOING` and `endAt <= now`.

At first, I thought it would be enough to set the search conditions as follows.

```plaintext
status = ONGOING
endAt <= now
```

However, we found that this condition alone cannot completely prevent duplicate queries in situations where the transaction has not yet been committed.

Also, even if it is verified with a state change method inside the entity, it cannot be completely prevented.

```java
public void markResultPending() {
    if (this.status != AuctionStatus.ONGOING) {
        throw new IllegalStateException("진행 중인 경매만 결과 대기 상태로 변경할 수 있습니다.");
    }

    this.status = AuctionStatus.RESULT_PENDING;
}
```

This is because the entity queried by the secondary scheduler still appears to be in the `ONGOING` state.

Therefore, verifying the current state in an entity method helps maintain domain rules, but does not completely solve the problem of duplicate lookups before committing a transaction.

To solve this problem more safely, it is better to handle status changes as DB conditional UPDATE rather than simply limiting the search conditions.

The way to change the state in Java code after inquiry is as follows.

```plaintext
SELECT로 종료 대상 경매 조회
→ Java에서 엔티티 상태 변경
→ 트랜잭션 커밋 시 UPDATE 반영
```

In this method, other transactions can query the same row in `ONGOING` status until commit.

On the other hand, conditional UPDATE is a method of directly requesting the DB as follows.
```sql
UPDATE auction
SET status = 'RESULT_PENDING'
WHERE id = 10
AND status = 'ONGOING'
AND end_at <= NOW();
```

The meaning of this query is as follows:

```plaintext
이 경매가 아직 ONGOING이고 종료 시간이 지났다면 RESULT_PENDING으로 변경한다.
```

The advantage of conditional UPDATE is that the DB locks the row when UPDATE is executed.

If the primary transaction is already updating the same row, the secondary transaction's UPDATE usually waits until the primary transaction commits or rolls back.

Afterwards, when the primary transaction is committed and the status changes to `RESULT_PENDING`, the secondary transaction does not satisfy the `status = ONGOING` condition when it checks the condition again.

As a result, the secondary UPDATE does not change any rows.

```plaintext
1차 트랜잭션
→ status = ONGOING인 row를 RESULT_PENDING으로 UPDATE
→ row lock 획득
→ 커밋 후 status = RESULT_PENDING

2차 트랜잭션
→ 같은 row UPDATE 시도
→ 1차 트랜잭션 종료까지 대기
→ 커밋 후 조건 재확인
→ status = ONGOING 조건 불만족
→ update count = 0
```

Another question arose here.

The reason I didn't want to use `fixedDelay` at first was because I didn't want the next scheduler to wait for the previous task to finish.

However, even in conditional UPDATE, I wondered if the secondary transaction could wait until the primary transaction was completed, so it would end up waiting the same way.

In conclusion, the scope and purpose of waiting for the two are different.

Waiting for `fixedDelay` means that the entire scheduler execution is delayed.

```plaintext
10:00 스케줄러 시작
10:05 스케줄러 종료
10:06 다음 스케줄러 시작
```

In this case, even if there is a newly completed auction at 10:01, 10:02, or 10:03, confirmation may be delayed because the next scheduler execution itself is delayed.

In other words, waiting for `fixedDelay` is waiting for the entire scheduler cycle to be delayed.

On the other hand, waiting in conditional UPDATE is a DB-level wait that occurs only when simultaneously modifying the same row.

For example, the DB organizes the order for the row only when two transactions simultaneously try to change `auctionId = 10` to `RESULT_PENDING`.

```plaintext
1차 트랜잭션이 auctionId = 10 UPDATE 중
→ 2차 트랜잭션도 auctionId = 10 UPDATE 시도
→ 같은 row이므로 2차 트랜잭션은 잠시 대기
→ 1차 트랜잭션 커밋
→ 2차 트랜잭션이 조건 재확인
→ 이미 RESULT_PENDING이므로 update count = 0
```

In other words, waiting for conditional UPDATE does not slow down the entire scheduler execution, but is a concurrency control that occurs only at the moment when the same data is changed at the same time.

Therefore, the differences between the two methods can be summarized as follows.

```plaintext
fixedDelay의 기다림:
이전 스케줄러 작업 전체가 끝나야 다음 스케줄러가 실행된다.
새로 종료된 경매 확인 자체가 늦어질 수 있다.

조건부 UPDATE의 기다림:
같은 row를 동시에 수정하려는 경우에만 DB가 잠깐 기다리게 한다.
전체 스케줄러 주기를 늦추기 위한 것이 아니라 중복 상태 변경을 막기 위한 장치이다.
```

Ultimately, `fixedRate` and conditional UPDATE play different roles.

```plaintext
fixedRate:
매 60초마다 스케줄러를 실행하여 종료 대상 경매 확인이 너무 밀리지 않도록 한다.

조건부 UPDATE:
동시에 같은 경매를 처리하려는 경우에도 이미 처리된 경매가 다시 상태 변경되지 않도록 막는다.
```

Ultimately, in MVP, the scheduler runs every 60 seconds and is only responsible for changing auctions that have expired to `RESULT_PENDING`.

At this time, the following conditional UPDATE method can be used for safer processing.

```java
@Modifying(clearAutomatically = true)
@Query("""
    UPDATE Auction a
    SET a.status = :pendingStatus
    WHERE a.status = :ongoingStatus
    AND a.endAt <= :now
""")
int bulkMarkExpiredAuctionsAsPending(
        @Param("ongoingStatus") AuctionStatus ongoingStatus,
        @Param("pendingStatus") AuctionStatus pendingStatus,
        @Param("now") LocalDateTime now
);
```

The service can be called as follows:

```java
@Transactional
public int markExpiredAuctionsAsPending() {
    return auctionRepository.bulkMarkExpiredAuctionsAsPending(
            AuctionStatus.ONGOING,
            AuctionStatus.RESULT_PENDING,
            LocalDateTime.now()
    );
}
```

This method is safer in concurrency situations than the method of changing the entity status one by one after searching for auctions to be terminated.

Through this question, I learned that selecting a scheduler method should not be decided simply by “whether to avoid overlapping.”

At first, `fixedDelay` was considered to avoid duplicate execution, but it had the disadvantage that confirmation of auction end could be delayed.

Afterwards, minimizing the scheduler's responsibility to `ONGOING → RESULT_PENDING` state changes made the work lighter, so it was decided that `fixedRate`, which checks periodically every 60 seconds, would be more appropriate.

However, when using `fixedRate`, the possibility of duplicate processing must be considered, so it is safer to change the status with conditional UPDATE at the DB level rather than changing the entity after inquiry.

In conclusion, it was concluded that the following method is appropriate for processing the end of an auction.

```plaintext
fixedRate = 60000
→ 매 60초마다 종료 대상 경매 확인
→ 조건부 UPDATE로 status = ONGOING AND endAt <= now인 경매만 RESULT_PENDING으로 변경
→ 경매 엔진 결과 수신 후 RESULT_PENDING 상태에서 WON 또는 FAIL 처리
```

In other words, `fixedRate` is responsible for “when to check,” and conditional UPDATE is responsible for “avoiding duplicate processing of the same auction.”

<hr>

## Final selection

The auction end processing method was finally summarized as follows.

```plaintext
fixedRate = 60000
→ 매 60초마다 종료 대상 경매 확인
→ 조건부 UPDATE로 status = ONGOING AND endAt <= now인 경매만 RESULT_PENDING으로 변경
→ 경매 엔진 결과 수신 후 RESULT_PENDING 상태에서 WON 또는 FAIL 처리
```

Initially, `fixedDelay` was considered to avoid scheduler duplicate execution.

`fixedDelay` has the advantage of reducing situations where the same task is executed overlapping because the next task is executed only after a certain period of time has passed after the previous task is completed.However, in an auction service, it is important to check auctions whose end time has passed as regularly as possible.

If the previous scheduler task takes a long time, the next scheduler execution itself may be delayed, and newly completed auctions in the meantime may also be processed late.

Therefore, rather than taking the scheduler's responsibility too seriously, at the MVP stage, the scheduler is only responsible for changing auctions whose end time has passed to the `RESULT_PENDING` state.

Judging the successful bidder, confirming the successful bid, issuing events, sending notifications, etc. are not handled directly by the scheduler, but are processed in a separate flow after receiving the auction engine results.

With this separation of roles, the scheduler task becomes a simple state change task and is therefore relatively light.

Therefore, we decided that `fixedRate`, which allows you to check the auction to end every 60 seconds, is more appropriate.

However, when using `fixedRate`, you must consider the possibility that the previous and next tasks may overlap, or that the same auction may be viewed again before the transaction commits.

To prevent this, we decided to use conditional UPDATE at the DB level rather than simply setting search conditions.

```sql
UPDATE auction
SET status = 'RESULT_PENDING'
WHERE status = 'ONGOING'
AND end_at <= NOW();
```

This method only changes auctions that are still in the `ONGOING` state and whose end time has passed to `RESULT_PENDING`.

Auctions that have already been processed in other transactions and become `RESULT_PENDING` will not be changed again because they do not meet the conditions.

In other words, `fixedRate` is responsible for periodic confirmation, and conditional UPDATE prevents duplicate status changes for the same auction.

<hr>

## Retrospective

During this study, I learned that what responsibilities the scheduler has is more important than simply how to use `@Scheduled`.

Through this content, I felt that in back-end design, not only the operation of functions, but also time flow, state changes, transactions, and concurrency must be considered.

Especially in domains where the state changes automatically over time, such as an auction, the flow becomes clear when the scheduler and state machine are considered together.

In conclusion, the key points of this study are as follows.
```plaintext
스케줄러는 언제 실행할지를 담당하고,
상태 머신은 어떤 상태로 변경 가능한지를 담당하며,
조건부 UPDATE는 동시에 같은 경매가 중복 처리되지 않도록 막는 역할을 한다.
```

At first, I tried to understand each concept separately, but as I applied it directly to the auction closing scenario, I realized that the three concepts are interconnected.
