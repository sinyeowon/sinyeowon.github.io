---
layout: "post"
title: "MSA central log management and concurrency issue resolution"
date: 2026-06-09 09:00:00 +0900
last_modified_at: 2026-06-09 16:01:00 +0900
categories: ["Spring 단기 심화", "심화 주차"]
tags: ["MSA"]
description: "This is a summary of MSA central log management and concurrency problem solving."
description_source: "excerpt"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/MSA-중앙-로그-관리와-동시성-문제-해결/"
original_url: "/posts/MSA-중앙-로그-관리와-동시성-문제-해결/"
notion_id: "37a7788a-fc66-80ff-8088-fab195472850"
notion_lang: "en"
---
## Concepts learned today

- MSA central log management system

- Concurrency problems and solutions

Because MSA has multiple services operating independently, it is difficult to track which service failed and which request failed when a problem occurs. Therefore, central log management that collects and manages logs in one place is necessary.

Additionally, data inconsistencies may occur when multiple users modify or view the same data at the same time, which is called a concurrency problem.

<hr>

## MSA central log management system

Because MSA services are divided into multiple services, it is difficult to find the cause of the failure by checking the logs of each service separately.

For example, when an order fails at a shopping mall, it is difficult to tell at a glance whether the problem is the member service, order service, or payment service.

Therefore, a structure is needed to centrally collect, search, and analyze the logs of each service.

Representative tools such as **ELK Stack** can be used.

- Log collection

- Save log

- Log search and visualization

- Track cause of failure

In other words, central log management can be seen as **a system for observing the status of distributed services in one place** in MSA.

## Concurrency problems and solutions

A concurrency problem refers to a problem in which data consistency is broken when multiple requests or transactions access or modify the same data at the same time.

For example, if two users simultaneously order a product with only one remaining item in stock, both requests may be judged to be in stock and the order may be successful. In this case, the problem of selling more than actual inventory occurs.

There are typically the following types of concurrency problems:

- **Lost Update**
    - A problem in which multiple transactions modify the same data at the same time, and the results of modifications performed earlier are overwritten by later modifications.

- **Dirty Read**
    - Problem reading change data from another transaction that has not yet been committed

- **Non-repeatable Read**
    - An issue where the same data is read twice within the same transaction, but the results are different because another transaction modifies it in the middle.

- **Phantom Read**
    - An issue where data is searched under the same conditions, but another transaction adds or deletes data in the middle, causing the number of rows in the search results to vary.- **Race Condition**
    - Problems where results vary depending on the order in which multiple tasks are executed

To solve this concurrency problem, you can use the following methods:

- **Transaction Isolation Level**
    - It is a standard that determines the extent to which simultaneously executing transactions can affect each other.

    - Increasing the isolation level improves data consistency, but performance may decrease.

- **Pessimistic Rock**
    - This is a method that locks data in advance when searching or modifying data, assuming that conflicts will occur frequently.

    - Can be used for functions with a high risk of conflict, such as inventory deduction.

- **Optimistic Rock**
    - This is a method of checking whether conflicts occur by comparing version information at the time of modification, assuming that conflicts do not occur frequently.

    - If a crash occurs, you can try again or notify the user of failure.

- **Distributed Lock**
    - This is a method of managing common locks using external storage such as Redis when multiple server instances access the same resource at the same time.

    - Can be used in an environment with multiple MSA or servers.

In summary, the concurrency problem is not a simple code error, but a problem of how to maintain data consistency between requests executing simultaneously. Therefore, transaction isolation level, lock strategy, retry policy, etc. must be appropriately selected depending on the characteristics of the service.

<hr>

## Retrospective

Because services are separated in MSA, we learned that log tracking and monitoring are important from an operational perspective, as well as simply dividing functions.

Additionally, it was understood that concurrency problems can frequently occur in functions such as inventory, coupons, points, and reservations in actual services, and that locks and transaction isolation levels must be appropriately used to maintain data consistency.
