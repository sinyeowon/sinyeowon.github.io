---
layout: "post"
title: "[TIL]-260511"
date: 2026-05-11 09:00:00 +0900
last_modified_at: 2026-05-14 15:41:00 +0900
categories: ["GDGoC KNU", "0 to Product"]
tags: ["project"]
description: "Check feedback on the first plan and discuss direction for plan supplementation"
description_source: "excerpt"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-260511/"
original_url: "/posts/TIL-260511/"
notion_id: "3607788a-fc66-80bb-a7d2-c2d21320e002"
notion_lang: "en"
---
## What I did today

- Check feedback on the first plan

- Discussion of direction for planning and supplementation

## Key feedback received

- The most common part of the feedback was that the direction of this service needs to be clarified.
    - Is it a service to improve consumption habits?

    - Is it a fun SNS that shares consumption history?

- After discussion, our team decided that it would be right to move closer to **a fun SNS that shares consumption history**.
    - Improving consumption is an additional effect, but the key is to share and compare consumption with friends and make it fun to keep records.

- OCR itself is already provided by many household account book services or receipt record services.

- Therefore, what differentiates TodayPoor is not simply recognizing consumption details through OCR;
    - Friends-based consumption sharing

    - Random consumption topics

    - AI roasting/upward feedback

    - MVP selection

    - Continuity of records through social pressure and fun

    We rearrange the point that it is in

- In other words, OCR is a tool that lowers the entry barrier, and the core of the service can be seen as **the experience of sharing consumption like a meme**

- The initial plan included many features such as OCR, SNS feed, likes, comments, AI MVP selection, AI feedback, random topics, chat, etc.
    - However, we received feedback that the functionality may be too broad considering the 6-week project period.

- So we decided to focus on the next flow in MVP.
    1. Upload consumption history capture

    2. OCR extraction and user modification

    3. Create a daily consumption feed

    4. Random topic participation

    5. AI roasting/consolation feedback and MVP selection within the group

    Advanced SNS features such as chatting, likes, and comments will be given a lower priority.

- Because consumption details are sensitive information, there was also feedback that designing the scope of disclosure is important.

- In particular, disclosing all information such as amount, affiliated store, category, etc. can be burdensome, so users should be able to choose whether to disclose it or not.

- Even if it is a fun service, I feel that it is important to have safety measures in place to prevent users from feeling shame or discomfort.

- MVP should at least consider the following features:
    - Choose whether to disclose information

    - Whether to agree to AI roasting

    - Good AI/Bad AI mode selection### What I learned about ERD

- Currently, AI functions have two main roles, but in ERD it was not clear where personal feedback connects.
    1. AI results for MVP selection

    2. AI feedback on personal consumption history

- Therefore, if personal feedback is included in the scope of MVP, `EXPENSE` or `POST` and `AI_RESULT` must be connected, and if AI feedback is attached only to MVP results, it is sufficient to connect to `RANKING_RESULT` as is currently done.

- We also decided that it would be a good idea to add the `mode` column to `AI_RESULT` to distinguish between good AI and bad AI modes.

## **Team discussion results**

- Based on feedback, we defined TodayPoor as closer to a **consumption-based social game/SNS** than a **consumption habit improvement app**.

- In addition, compared to similar services, it is concluded that the structure of sharing consumption with friends and AI providing interesting feedback is a more important differentiator than the OCR function itself.

- In the future, the following information must be supplemented in the plan:
    - Clarification of service purpose

    - Persona specification

    - KPI settings

    - Addition of personal information disclosure scope policy

    - AI_RESULT structure supplementation

    - Reorganized MVP feature scope

## Lessons learned

- Through this feedback, I felt that it was not enough to just have a fun idea, and that the purpose and core experience of the service had to be clear.

- At first, it seemed like a good idea to include a lot of OCR, AI, and SNS features, but in reality, we had to be able to explain why users should continue to use this service.

- The point of TodayPoor is not to accurately analyze consumption, but to have friends look back on their consumption in a funny way and keep recording it.

- When supplementing the plan in the future, rather than adding a lot of functions, I will organize it so that the core user experience is clearly visible.

## What to do next

- Meetings by series
    - Modify ERD by reflecting feedback

    - Writing API specifications
