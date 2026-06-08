---
layout: "post"
title: "[TIL] MSA Transaction Consistency and Saga Pattern"
title_source: "manual"
date: 2026-06-04 09:00:00 +0900
last_modified_at: 2026-06-09 01:42:00 +0900
categories: ["Spring 단기 심화", "심화 주차"]
tags: ["TIL", "Saga", "2PC", "MSA"]
description: "We understand transaction consistency issues that occur in the MSA environment, and summarize how 2PC and Saga patterns work, their pros and cons, and how to maintain consistency through compensation transactions."
description_source: "notion"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL/"
original_url: "/posts/TIL/"
notion_id: "3757788a-fc66-80ac-b20a-c45fdf4f59b3"
notion_lang: "en"
---
## Concepts learned today

- 2pcs

- Saga pattern

In an MSA environment, one function can be handled across multiple services.

For example, if the order service, payment service, and inventory service are separate, a single order request is accompanied by data changes in multiple services.

An important issue at this time is how to maintain data consistency across multiple services. 2PC and Saga patterns were learned as representative methods to solve this problem.

<hr>

##2PC

2PC stands for Two-Phase Commit, and is literally a distributed transaction method that commits in two stages.

When multiple services or databases participate in one transaction, it first checks whether all participants are ready to perform the task, and then performs the final commit only when all are ready.

- How it works
    1. Preparation stage
        - The coordinator checks whether each participant is ready to commit.

        - If all participants respond that they can, move on to the next step.

    2. Commit phase
        - If all participants are ready, the coordinator instructs commit.

        - If any one fails or is not ready, the entire transaction is rolled back.

- Easy analogy<br>
    When several people decide to go on a trip, the secretary checks with everyone, asking, ‘Can you go?’

    At this time, it is similar to the method of departing if everyone says it is possible, and canceling the trip if even one person says it is not possible.

### 2PC Advantages

1. Strong data consistency can be guaranteed<br>
    Since all participants must succeed before committing, it is unlikely that data will remain in an intermediate state.

2. In case of failure, full rollback is possible<br>
    If any of the participants encounters a problem, the entire task can be canceled, making it easy to achieve consistency.

3. It is clear whether the transaction was successful<br>
    It is possible to judge relatively clearly whether the overall success or failure was successful.

### 2PC Disadvantages

1. Performance may decrease<br>
    Processing speed may be slow because you have to wait for responses from all participants.

2. There is a possibility of transmission of the disorder<br>
    If one of the participants delays or fails, the entire transaction is affected.3. It may not fit well with the MSA environment.<br>
    MSA values independence and loose coupling between services, but 2PC strongly binds multiple services into one transaction, which can increase the coupling between services.

## Saga Pattern

The Saga pattern is a method of processing one large transaction by dividing it into several small local transactions.

Each service commits its work independently, but if a failure occurs in the middle, it executes a compensation transaction to undo the work that has already succeeded.

- Example<br>
    When the order processing flow is as follows:

    1. Create order

    2. Payment processing

    3. Inventory deduction

    4. Delivery request

    If the inventory deduction step fails, a compensation operation is performed to cancel the already successful payment and change the order status to canceled.

    In other words, Saga does not roll back all tasks at once, but rather rolls back already completed tasks as compensation tasks.

### Saga Advantages

1. Suitable for MSA environment<br>
    Since each service processes only its own local transactions, the degree of coupling between services can be reduced.

2. High availability<br>
    There is no need to wait for all services to be ready at the same time like 2PC.

    Therefore, it is possible to reduce situations where delays in specific services block the entire system for a long time.

3. Advantageous for scalability<br>
    Because the services operate independently, it is good for flexible expansion in large-scale systems.

### Disadvantages of Saga

1. Compensation transaction design is difficult<br>
    You need to clearly design what actions need to be undone in case of failure.

2. Temporary data inconsistency may occur<br>
    Because each step is committed independently, data may temporarily become inconsistent during the intermediate process.

3. Overall flow tracking is complicated<br>
    Because events and requests are exchanged across multiple services, it can be difficult to track at what stage the problem occurred when a failure occurs.

## Cleanup

2PC is advantageous in ensuring strong consistency because it commits only when all participants can succeed, but it imposes a burden in terms of performance and availability because it must wait for responses from all participants.On the other hand, the Sage pattern is more suitable for the MSA environment because it processes each service independently and achieves consistency through compensation transactions in case of failure, but compensation logic design and failure tracking can become complicated.

→ 2PC is a method that commits only when everyone is ready, and Sage is a method that ensures consistency by processing each task and then compensating if it fails.

<hr>

## What I felt

We learned that in MSA, we need to consider not only the success of transactions, but also the degree of connectivity between services and failure situations.

2PC may be appropriate when strong consistency is required, but the Saga pattern may be used more often in MSA that values ​​service independence and scalability.
