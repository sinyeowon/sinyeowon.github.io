---
layout: "post"
title: "[TIL] API design that considers structure rather than simple CRUD"
date: 2026-05-15 09:00:00 +0900
last_modified_at: 2026-05-15 19:29:00 +0900
categories: ["Spring 단기 심화", "숙련 프로젝트"]
tags: ["project"]
description: "We proceeded to fill in the blank parts in the API specification."
description_source: "notion"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-단순-CRUD가-아니라-구조를-고민하는-API-설계/"
original_url: "/posts/TIL-단순-CRUD가-아니라-구조를-고민하는-API-설계/"
notion_id: "3617788a-fc66-80dc-b5b8-ec836e895c06"
notion_lang: "en"
---
## What I did today

- API specification finalization

- Create project package structure

- ERD domain separation

    <hr>

## Finalizing API specification

We proceeded to fill in the blank parts in the API specification.

- Create Search Parameters

- Create Request Elements

- Write a request example

In particular, I was impressed that while writing the DeliveryRoute API, we had to consider the difference in data at the time of creation and modification.

- For example, `estimated_distance, estimated_duration` is a value that can be known at the time of delivery creation.

- On the other hand, `real_distance, real_duration` can only be known after actual delivery is completed, so it is natural not to include it in the creation POST request.

→ Therefore, the actual distance and actual transmission time were organized to be managed in the delivery status modification PUT request.

I learned that the API should be designed based on “When is this value created?” rather than simply “Because there is a column in the table, it is received as a request value.”

## ERD domain separation and service separation

At first, I thought the area enclosed in a red box in ERD was a single service.

But in reality there was a difference.

- ERD domain separation
→ Logical separation of work interest criteria

- Service separation
→ Separation of actual server and application units

→ In other words, ERD is a concept close to “work bundle,” and service separation is determined based on actual distribution and scope of responsibility.

## Determine project service structure

Our team ultimately organized the structure into the following five business services.

```yaml
- user-service
- hub-service
- company-service
- order-delivery-service
- message-service

```

Additionally, we decided to use the following services to configure the MSA environment.

```yaml
- eureka-server
- gateway-service

```

In particular, I was most impressed by the reason for combining ordering and delivery into one service.

- According to the presentation requirements, delivery and delivery route must be created together when creating an order, but separating them into different services can make transaction management complicated.

- So, I decided to manage Order, Delivery, DeliveryRoute, and DeliveryManager in one `order-delivery-service`.I felt that it was not important to unconditionally share many services, but that it was more important to divide boundaries based on actual business flow and transaction scope.

## Reasons not to use FK

One of the most confusing parts today was “Why not use FK?”

In an MSA environment, in order to reduce DB dependency between services and maintain service independence, FK between tables of different services is not used, but UUID-based references and application logic verification methods are used.

For example, when creating an order:

```plaintext
1. company-service에 producer_id 존재 여부 확인

2. company-service에 receiver_id 존재 여부 확인

3. company-service에 product_id 존재 여부 확인

4. 검증 성공 시 order-delivery-service에서 주문 및 배송 생성

```

It was designed to operate in the same flow.

It was interesting that in practice, FK is not used unconditionally, but is used selectively, taking into account service independence, operating structure, and deployment environment.

## Organize project package structure

It was decided to apply the `Layered + Package by Feature` structure inside each service.

```plaintext
presentation
application
domain
infrastructure
```

Divide roles based on structure,

- presentation → Controller, DTO

- application → Service, business logic

- domain → Entity, Repository, Enum

- infrastructure → external API, QueryDSL, Client

Responsibilities were organized in a separate form.

At first, the structure felt complicated, but little by little, I came to understand that it was a way to clearly divide service responsibilities and code roles.

<hr>

## What I felt

Rather than simply writing an API specification, today was a day where I thought a lot about “why services are divided in an MSA environment and why this structure is used.”

In particular, concepts such as service boundary, transaction scope, FK usage, and Gateway and Eureka roles are gradually starting to be connected.

Although I am not completely familiar with it yet, I thought that the design process itself was a really important experience as I kept thinking about “Why are we using this structure?”
