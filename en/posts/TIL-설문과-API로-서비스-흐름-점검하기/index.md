---
layout: "post"
title: "[TIL] Checking the service flow through surveys and API discussion"
title_source: "manual"
date: 2026-05-13 09:00:00 +0900
last_modified_at: 2026-05-14 21:16:00 +0900
categories: ["GDGoC KNU", "0 to Product"]
tags: ["project"]
description: "This note turns preliminary survey questions and backend discussions into a clearer service flow for feeds, rankings, AI feedback, and API ownership."
description_source: "manual"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-설문과-API로-서비스-흐름-점검하기/"
original_url: "/posts/TIL-설문과-API로-서비스-흐름-점검하기/"
notion_id: "3607788a-fc66-8011-9346-c854c80330cb"
notion_lang: "en"
---
## What I did today

- Create and distribute pre-survey Google form
    - We reflected the feedback that it would be good to conduct a preliminary survey to check whether the actual targeted users are willing to use this service and whether they have any objection to disclosing their spending habits to others.

- Draft API specification

- BE Meeting

## Meeting

### Lack of understanding of user flow

- The biggest thing I felt through the meeting was that there was a lack of understanding of the actual user flow when first designing the ERD.

- Previously, I thought it was simply `소비 기록 -> 랭킹 생성 -> AI 결과 생성`, but when I connected it to the actual wireframe, I realized that ‘where and what results I see’ was much more important from the user’s perspective.

- I noticed differences between the front wireframe and the initial design, especially in the part below.
    - Based on front wireframe
        - Early
            - Multiple topics per day - Nickname provided for each person

            - Generate rankings using off-topic criteria

            - AI roasting provided only to the top 3 people

            - Users ranked 4th or lower cannot check personal feedback.

        - After intermediate changes
            - One topic per day

            - Generate rankings based on topics

            - AI roasting provided only to the top 3 people

            - Users ranked 4th or lower cannot check personal feedback.

    - Direction thought from the backend
        - You can check your AI roasting on your personal page

        - Alternatively, users ranked 4th or lower can check AI feedback without rankings being revealed.

    - In other words, rather than simply storing AI results, we feel that we need to consider who sees the results, where and in what form.

### Concerns about feed structure

- Another thing discussed is that there is no feed structure like Setlog in the current wireframe.

- If we add a feed, we are considering a vertical timeline structure where consumption details are accumulated in chronological order.
    - Also, since we decided not to save photos, we thought about composing a consumption feed using category icons / affiliated stores / amounts / notes, etc.

- We also talk about the structure of creating a personal page to accumulate and display daily consumption details.

## Lessons learned- During the discussion, I felt that ERD and API should not be viewed only from a simple data structure perspective, but that we should also look at the flow in which actual users use the service.
    - In particular, it was impressive that one policy, such as who can see AI results, affects everything from API, DB structure, and screen design.

- Initially, it was designed with a focus on functionality, but now it seems that we are increasingly thinking with a focus on user experience.

## What to do next

- Share all matters discussed during BE meetings

- ERD final revision

- Writing API specifications

- Divide domains for each person

- Start development after setting up the project
