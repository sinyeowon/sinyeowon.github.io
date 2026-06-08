---
layout: "post"
title: "Zipkin distributed tracing and event-based architecture learning"
date: 2026-06-08 09:00:00 +0900
last_modified_at: 2026-06-08 14:38:00 +0900
categories: ["Spring 단기 심화", "심화 주차"]
tags: ["TIL", "Zipkin"]
description: "Concepts learned today Distributed tracking using Zipkin"
description_source: "excerpt"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Zipkin-분산-추적과-이벤트-기반-아키텍처-학습/"
original_url: "/posts/Zipkin-분산-추적과-이벤트-기반-아키텍처-학습/"
notion_id: "3797788a-fc66-80a1-85ef-ef0b10d49796"
notion_lang: "en"
---
## Concepts learned today

- Distributed tracking using Zipkin

- Event-based architecture

- How to use message queue

    <hr>

## Zipkin distributed tracing and request flow analysis

In MSA, one request is processed through multiple services.

For example, when an order request is received, order service, product service, and user service may operate together.

If a problem occurs at this time, it is more difficult to find the cause than with a single application.

So, we use **distributed tracking** to check which services were used and how long each step took.

Zipkin is a tool that collects and visualizes these request flows in **Trace** and **Span units**.

- Trace: One request entire flow

- Span: Individual work unit within the request flow

- Zipkin's role: Allows you to visually check call relationships and delay sections between services

Through this, you can quickly determine which service is experiencing a bottleneck and which call is failing.

## Event-based architecture and message queues

Event-based architecture works by issuing events and subscribing to them by services, rather than having services directly call each other.

For example, when an order is created, the order service issues an “order created” event, and the notification service or inventory service can receive this event and perform their own actions.

At this time, the message queue plays the role of safely delivering events in the middle.

Using message queues has the following advantages:

- The degree of coupling between services can be reduced.

- Even if one service temporarily fails, messages can be processed later.

- Response speed can be improved through asynchronous processing.

- Requests can be buffered when traffic is heavy.

    <hr>

## What I felt

In distributed tracing, I felt it was important to understand the difference between Trace and Span.

In addition, we confirmed again that in event-based architecture, the key point is not simply exchanging messages, but **reducing dependency between services and mitigating failure propagation**.

## Retrospective

At first, Zipkin and Message Queuing seemed like separate concepts, but they both had in common that they were tools for increasing operational stability in MSA.Zipkin is closer to ‘a tool for tracking where problems occur’, and message queue is closer to ‘a structure that helps services loosely cooperate’.

In the future, as the number of calls between services increases in the project, I felt that it would be necessary to not only implement functions, but also consider **whether the request flow can be tracked and whether the degree of coupling between services is too high**.

## Q&A

**Q Why is message queue asynchronous processing**

- Synchronous processing usually works like this:
    - Order service requests payment service → Wait until payment is completed → Next processing

    In other words, you have to wait until the other service finishes processing.

- On the other hand, if you use a message queue, the flow changes.
    - The ordering service puts the ‘payment request message’ into the queue → The ordering service finishes its work → The payment service takes it out of the queue and processes it later.

    **The key is for the requesting party not to wait for the other party to finish processing**

⇒ Therefore, message queue-based processing can be considered asynchronous processing.

By analogy, calling a friend directly and waiting for them to hear back is synchronous processing, while sending a messenger and then doing something else is asynchronous processing.

**What does Q traffic buffering mean?**

A sudden surge in traffic may exceed the amount the service can handle at one time.

For example, a payment service can only process 100 transactions per second, but if 1,000 transactions come in per second, it may immediately fail.

If there is a message queue, requests can be piled up in the queue instead of being immediately pushed to the payment service.

- 1,000 requests arrive → stored in queue → processed one by one at a speed that the payment service can process

Because the cue absorbs shock in the middle, it is said to ‘buffer’.

It's similar to standing in line in front of the supermarket checkout counter. Even if there are a large number of customers at once, the cashier processes them one by one at a manageable speed.

> - **Asynchronous processing: The requested service can just leave a message and then move on to the next task without waiting until the end for the result**
>
> - **Traffic buffering: Sudden requests are stored in a queue and processed at a speed that consumers can handle**
