---
layout: "post"
title: "[TIL] How far should FK be allowed in MSA?"
date: 2026-05-14 09:00:00 +0900
last_modified_at: 2026-05-15 19:18:00 +0900
categories: ["Spring 단기 심화", "숙련 프로젝트"]
tags: ["project"]
description: "Start writing logistics management and delivery system SA documents"
description_source: "notion"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-MSA에서-FK를-어디까지-허용해야-할까/"
original_url: "/posts/TIL-MSA에서-FK를-어디까지-허용해야-할까/"
notion_id: "3607788a-fc66-805b-92db-c26bccb80429"
notion_lang: "en"
---
## What I did today

- Start writing logistics management and delivery system SA documents

- Create domain definition and table statement

- Discussion of MSA service boundary separation

- Organizing data reference methods between services

- Consider the scope of FK use and data consistency method

<hr>

## **Domain and service separation**

It was decided to separate the project into five services as follows:

**1. Users and Authentication**

- p_users

**2. Hubs and Hub Management**

- p_hub

- p_hub_to_hub

**3. Companies and products**

- p_company

- p_product

**4. Order and delivery execution**

- p_order

- p_delivery

- p_delivery_route

- p_delivery_manager

**5. Notifications and AI messages**

- p_slack_message

- p_ai_message

    <hr>

## **Why separate services?**

At first, I thought MSA was simply a “structure that divides services into multiple services.”

However, while working on the design today, I learned that the important thing is not simple separation, but making sure that each service can manage its own responsibilities and data independently.

For example:

- User Service focuses on authentication and authority management.

- Hub Service focuses on managing hub and logistics movement information

- Order/Delivery Service focuses on order and delivery flow management.

Separating roles in this way can reduce the impact of modifications to specific functions on other services, and is also advantageous for independent deployment and expansion of each service.

It was also impressive that by separating data ownership for each service, each service could focus on its own business logic.

However, considering the scale of the project and the difficulty of implementation, the current design was designed to bundle strongly connected functions into one service rather than splitting them into pieces.

For example, since the delivery creation flow after order creation is closely connected, Order and Delivery were organized into one service.

<hr>

## **FK concerns in MSA environment**

In the MSA structure, each service must own its own data.

Therefore, we decided to store only the UUID value and connect it logically, rather than directly referencing other service tables as FKs.

for example:- Order Service stores user_id, but

- The users table of User Service and the physical FK are not connected.

Data inquiry between services is handled through API calls or event-based methods.

<hr>

## **Is it necessary to use FK even within the same service?**

At first, I thought it was natural to use FK within the same service, but I learned that in practice, there are cases where FK is not used due to operational complexity and performance issues.

Specifically:

- Referential integrity check costs incurred during INSERT/UPDATE/DELETE

- Performance burden when loading large amounts of data

- Increased migration and failover complexity

For the same reason, consistency is also managed at the application level.

<hr>

## **User table design concerns**

I was impressed by the fact that company_id or hub_id had to be saved depending on the user's role.

For example:

- HUB_MANAGER → use hub_id

- COMPANY_MANAGER → use company_id

We had to consider a structure in which the reference object varies depending on the role.

<hr>

## **Delivery manager design concerns**

I was wondering what kind of relationship the delivery person should have with the user entity.

We discussed whether to manage slack_id and hub_id in User or separately in DeliveryManager.

Currently:

- User = authentication subject

- DeliveryManager = Delivery manager

I understand it as a way to separate roles.

<hr>

## What I felt

Today was not a simple CRUD design day, but a day where I kept thinking about “how far to divide the service.”

In particular, it was impressive that in MSA, rather than simply connecting ERDs, we had to consider how to own and reference data based on service boundaries.

For the first time, I felt that drawing an ERD line was strongly connected to service responsibility.
