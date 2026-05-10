---
layout: "post"
title: "[Python] Programmers - Creating minimum value"
date: 2026-05-07 09:00:00 +0900
last_modified_at: 2026-05-07 12:02:00 +0900
categories: ["Programmers", "Python"]
tags: ["Python", "programmers"]
description: "This post solves the minimum value problem by sorting two arrays in opposite directions and replacing bubble sort with Python sort()."
description_source: "manual"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Python-프로그래머스-최솟값-만들기/"
original_url: "/posts/Python-프로그래머스-최솟값-만들기/"
notion_id: "3597788a-fc66-8021-b2bb-e883d8047388"
notion_lang: "en"
---
[Programmers 최솟값 만들기](https://school.programmers.co.kr/learn/courses/30/lessons/12941)

## Solution

```python
def solution(A,B):

    A.sort()

    B.sort(reverse=True)

    answer = 0

    for i in range(len(A)):

        answer += A[i] * B[i]
 
    return answer
```

- At first

```python
def solution(A,B):
    answer = 0

    cnt = len(A)
    for i in range(len(A)-1):
        cnt -= 1
        for j in range(cnt):
            if A[j] > A[j+1]:
                A[j], A[j+1] = A[j+1], A[j]

    cnt = len(B)
    for i in range(len(B)-1):
        cnt -= 1
        for j in range(cnt):
            if B[j] < B[j+1]:
                B[j], B[j+1] = B[j+1], B[j]

    for i in range(len(A)):
        answer += A[i] * B[i]

    return answer
```

I wrote the following, but it doesn't pass the efficiency test:

- In Python, bubble sort is not used separately, but can be sorted simply through the `sort()` function.

`sort()`

- Built-in method of List object

- Immediately sort the original list in ascending order (in-place)

- You can sort in descending order with list.sort(reverse=True), and the return value is None.

- If you need sorted copies, use the built-in function sorted().
  - `list.sort()` (modify the original list) Features: Changes the original list itself and does not return a new list (returns None)
