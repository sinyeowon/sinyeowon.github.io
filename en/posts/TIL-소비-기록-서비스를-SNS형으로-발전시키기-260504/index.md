---
layout: "post"
title: "[TIL] Developing consumption record service into SNS type - 260504"
date: 2026-05-04 09:00:00 +0900
last_modified_at: 2026-05-07 11:33:00 +0900
categories: ["GDGoC KNU", "0 to Product"]
tags: ["project"]
description: "0 to Product This is an article written about TIL in the process of writing the Article 4 plan."
description_source: "notion"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-소비-기록-서비스를-SNS형으로-발전시키기-260504/"
original_url: "/posts/TIL-소비-기록-서비스를-SNS형으로-발전시키기-260504/"
notion_id: "3587788a-fc66-80fd-985d-eefcbe2ec170"
notion_lang: "en"
---
## What I did today

- Create team notion

- Drafting a plan and drafting a meeting agenda
  - Creating a basic framework for an idea-based plan

- Planning meeting

## Meeting

- Final decision and materialization of idea
  - The idea I had in mind was too similar to other services, so I needed something different.

  - We want to add a lot of fun elements so that it can go viral among users.

  - Also encourages users to use it every day

  - We want to create a SNS-type service with friends, like the recently popular Setlog.

- Feature discussion
  - Transaction details are imported and reflected through Excel and PDF files
    - Problem: Is it possible to retrieve transfer details other than card payments, and since information about transfer details is not automatically reflected, is it possible to enable AI to allow users to enter and record information about why and where they used it?

    - Solution: When a notification appears on the banking app during a transfer, the notification is detected and the user is notified so that they can enter the transfer information themselves immediately when transferring! → Since the information about the transfer has already been created, if you download the transaction history, you can also retrieve the information you created about the transfer.
      - Another problem...: All information may not be retrieved, iOS does not work, and is sensitive because it is information from a financial app + Salad Bank

  - Final solution
    - We judged that loading transaction details separately would be difficult for our project.

    - Have a consumption competition with your friends every day on a fun topic, and encourage them to capture and post daily transaction details for the parts they want to post.
      - Use text recognition through OCR

## Lessons learned

- Rather than simply adding a lot of functions, I felt that the process of reviewing whether it was within the range that could actually be implemented was more important.

- Automatic collection of financial data had more limitations than expected due to security/OS limitations, so we changed direction to an OCR-based upload method.

- Also, I liked the idea that an SNS-type consumption service that can be shared with friends could be a more differentiating point than a simple household account book.

## What to do next

- Meetings by series
  - Determine your technology stack

  - Write ERD

  - Project settings
