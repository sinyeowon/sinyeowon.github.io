---
layout: "post"
title: "[TIL] Planning BE meeting - 260505"
date: 2026-05-05 09:00:00 +0900
last_modified_at: 2026-05-06 15:04:00 +0900
categories: ["GDGoC KNU"]
tags: ["project"]
description: "This is an article written about TIL during the 0 to Product BE meeting process."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-기획안-BE-회의-260505/"
original_url: "/posts/TIL-기획안-BE-회의-260505/"
notion_id: "3587788a-fc66-80df-ba2f-fb19c3d70c30"
notion_lang: "en"
---
## What I did today

- ERD Initiative

- BE planning meeting

- ERD confirmed

- Creation of GitHub organization

- Create BE repo

- Project basic settings
  - Folder structure

- Request ERD feedback

## Meeting

- Drafting with AI

- Compare the draft with the service features of the PRD plan

  - Is the POOR_TITLE table necessary?
    - Initially, we will try to store the title name in string form directly in the `RANKING_RESULT` table.

    - problem
      - String duplication occurs

      - Difficult to manage title standards/extensions

      - The roles between code and DB become ambiguous.

    - Resolution: Separate the title into a separate `POOR_TITLE` table and refer to title_id in `RANKING_RESULT`

  - Privacy - How to handle hiding

    - Wondering where and how to hide it

    - At first, I thought I could simply make it “invisible” on the front desk.

    - problem
      - Actual data exists in the API response.

      - Can be checked in developer tools or network tab

      - No real security/privacy processing

    - Resolution: An enum field indicating the public scope was added to the `EXPENSE` table.

      - visibility_type

        ```plain text
        PUBLIC
        AMOUNT_ONLY
        CATEGORY_ONLY
        HIDE_MERCHANT
        PRIVATE
        ```

  - Do I need a category table or not?

    - Initially, we wanted to separate the categories into separate tables.

    - problem
      - Category types do not change frequently

      - Use only specified values

      - Strong data for inquiry purposes

    - Resolution: Ultimately, the category was decided to be managed as an enum in the `EXPENSE` table.

      - category

        ```plain text
        CAFE
        DELIVERY
        SHOPPING
        FOOD
        ...
        ```

  - What is a template?
    - The word “template” keeps appearing during AI function design.

    - Initially, it was for storing vitriolic phrases? A collection of random sentences? AI prompt? The role was not clear, etc.

    - solved
      - During the meeting, it was summarized that what is needed in the current service is the ability for AI to generate opinion-style results.

      - In other words, the key is “save the sentence template” rather than the `AI 입력 → 결과 생성 흐름` itself

  - How should I design the AI partial table?
    - At first, I simply thought about “using AI,” but as I tried to design the actual back-end structure, the following concerns arose.
      - Should AI prompts also be managed through DB?

      - How long should the AI ​​call results be stored?

    - Initially, considering relative scalability, the following structure was considered:
      - AI_PROMPT_TEMPLATE / AI_RESULT / AI_GENERATION_LOG

      - In particular, the `AI_PROMPT_TEMPLATE` table was designed to take into account prompt modification, prompt version management, experimentation with various styles, and word changes during operation.

- Final ERD Draft
![image](/assets/img/notion/TIL-기획안-BE-회의-260505/01-506d96c2bc.png)

- Needs modification compared to front wireframe

- Need to reflect feedback

## Lessons learned

- The biggest thing I felt through this meeting was that a good design is not necessarily a complicated design.

- At first, we thought about maximizing scalability, such as separating categories into separate tables, adding AI prompt tables, and managing booleans for notes or not, but as we discussed it, we felt that it was more important to make decisions based on `“지금 실제로 필요한 기능인가?”` at the MVP stage.

- I also learned that we need to think not only about functional implementation, but also about data duplication, separation of responsibilities, roles of front and back end, and balance between scalability and current complexity.

- I was particularly impressed by `“숨기는 것”과 “실제로 접근을 제한하는 것”은 다르다` in terms of privacy processing. I learned that it is not just simple UI processing, but also the need to consider what form the data will be sent from the backend.

- `AI를 사용한다고 해서 모든 것을 AI 전용 테이블로 관리할 필요는 없다` was also felt in the AI ​​design area. Choosing an appropriate structure for the current service phase was more important than a technically feasible structure.

- Through this meeting, I was able to learn that a design that can explain `왜 이런 구조를 선택했는가` is more important than simply “implementing functions.”

## What to do next

- Reflection and correction of ERD feedback

- Writing API specifications

- Design of common parts of the project
  - Common Response

  - Error handling

  - Code/commit convention
