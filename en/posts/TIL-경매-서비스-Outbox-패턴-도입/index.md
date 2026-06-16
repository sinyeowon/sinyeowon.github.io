---
layout: "post"
title: "[TIL] Auction service Outbox pattern introduced"
date: 2026-06-16 00:00:00 +0900
last_modified_at: 2026-06-17 02:23:00 +0900
categories: ["Spring 단기 심화", "심화 프로젝트"]
tags: []
description: "This article summarizes what we learned about the introduction of the auction service Outbox pattern."
description_source: "excerpt"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-경매-서비스-Outbox-패턴-도입/"
original_url: "/posts/TIL-경매-서비스-Outbox-패턴-도입/"
notion_id: "3817788a-fc66-8070-9f1b-c8d72e76e95c"
notion_lang: "en"
---
## The Big Picture — What We Create

This is a service that sells agricultural and marine products through real-time auctions. A seller posts ‘5kg of Wando abalone’, people compete to bid in real time at a set time, and the person who bids the highest price wins the bid and pays.

## MSA — Why split the service into multiple services?

It can be made into one huge program, but it is divided into several small services for each function.

Because — if one part breaks down in one piece, everything stops, and to prevent 6 people from touching the same code and crashing, the service is divided so that each person is in charge of his own service and can develop/deploy it separately.

The downside to implementing it this way is that the services cannot see data directly between services. The auction service cannot directly look into the payment service's DB. So we need a way to ‘talk’ to each other, and that is the next concept.

## Two ways to talk between services

### Method A — Ask directly (FeignClient, synchronous)

Used when ‘I need an answer right now.’ It’s like an auction service calling a bidding service and asking, ‘What is the highest price for this auction?’ It waits for an answer, but in our design, we decided to use this only as a fallback (emergency use).

### Method B — Post a message on the bulletin board (Kafka, asynchronous)

It is used when ‘I want to know, but there is no need to wait for an answer.’ The auction service says, ‘Auction number 123 has been won! An event (note) saying ‘The winning bidder is Hong Gil-dong!’ is posted on the bulletin board called Kafka. Then, the services that require it (orders, notifications) come, read, and process themselves.

The good thing about Kafka is that posts are left on the bulletin board, so even if the receiving service dies for a moment, you can read the post when it comes back to life. The phone call (A) is simply hung up if the person on the other end does not answer, but the message on the bulletin board (B) remains.

In the auction service, the key role is to post ‘Won the bid’ (AUCTION_WON) and ‘AUCTION_FAILED’ on the bulletin board.

## What the auction service actually does — state machines

The status of each auction changes one after another. This is called a state machine, and just as traffic lights change only in the order of red → green → yellow, auctions must also change only in a certain order.

- **READY**: Auction room created, not yet started

- **PROGRESS**: Auction in progress, accepting bids- **RESULT_PENDING**: Time is up, organizing results.

- **WON**: Successful bidder has been determined, waiting for payment

- **SUCCESS**: Payment completed, finished

- **FAIL**: No one bids (failed) or the successful bidder does not pay.

The core job of the auction service is to automatically transfer these states in a timely manner. ‘It’s time to start, so READY → PROGRESS’, ‘It’s time to end, let’s get it all sorted out.’ The program does this automatically, not people.

## Scheduler — Alarm clock that automatically works on time

The auction has a set time, such as ‘starts at 2 p.m., closes at 3 p.m.’ But no one can press the ‘start’ button at 2 o’clock sharp. Therefore, the scheduler acts as an automatic alarm clock. If you register in advance, ‘Let this auction start at 2 o’clock’ and ‘End at 3 o’clock’, the scheduler automatically wakes up at that time and changes the status.

## Three tricky problems

### Problem 1 — If there are multiple servers, alarms sound repeatedly. (→ ShedLock)

If the number of customers increases, the number of auction servers is increased to 2-3. But then there will be 2 to 3 alarm clocks (schedulers). When the auction closes at 3 o'clock, three auctions wake up to 'close' at the same time, causing an accident to close one auction three times. So, ShedLock is a device that prevents only the one person who catches the flag first, saying, ‘I will finish this deadline.’ (distributed lock)

### Problem 2 — Deadline keeps changing (→ Anti-Sniping)

If someone makes a sneaky bid and walks away right before the auction ends, it's unfair because the other person doesn't have time to react. So, if a bid comes in within 30 seconds of closing, the closing time is extended by one minute. However, this ‘extending time’ is done by the bidding service, and the auction service receives a call saying that the time has been increased and resets the alarm clock.

### Problem 3 — What if I change the status but the bulletin board post doesn’t go up? (→ Outbox)

I need to change the status to WON in the DB and post a message on the Kafka bulletin board saying, ‘I won the bid.’ — What if the DB is successful, but there is a problem while uploading the bulletin board? There are accidents where the auction is successful, but the ordering service is unaware of it. So, Outbox is a method in which status changes and ‘posts to be posted’ are stored together in the DB as a bundle, and a separate employee (Relay) takes out the posts and posts them on the bulletin board. It guarantees that ‘either both will happen, or neither will happen’.## The whole thing in one sentence

The auction service — creates an auction room (CRUD), automatically opens and closes the auction at the right time (scheduler), determines the winning bidder (state machine), and safely posts ‘I won the bid’ on the bulletin board (Kafka + Outbox). In the process, it handles difficult situations such as multiple server crashes (ShedLock) and last-minute bidding extensions (Anti-Sniping).
