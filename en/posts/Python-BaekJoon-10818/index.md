---
layout: "post"
title: "[Python] Baekjun number 10818 - minimum, maximum"
date: 2026-04-05 20:41:45 +0900
last_modified_at: 2026-04-23 01:15:24 +0900
categories: ['BaekJoon']
tags: ['baekjoon', 'Python']
description: "We have summarized the solution to finding the minimum and maximum values ​​of a list using loop statements and initial value settings in Python."
lang: "en"
ui_lang: "ko-KR"
permalink: "/en/posts/Python-BaekJoon-10818/"
original_url: "/posts/Python-BaekJoon-10818/"
source_post: "_posts/2026-04-05-Python-BaekJoon-10818.md"
generated_lang: "en"
---
[BaekJoon 10818](https://www.acmicpc.net/problem/10818)

### Solution
``` python
n = int(input())
arr = list(map(int, input().split()))

min_val = 1000000
max_val = -1000000

for num in arr:
    if num < min_val:
        min_val = num
    if num > max_val:
        max_val = num
        
print("%d %d" %(min_val, max_val))
```
To use `arr[i] = ...` in Python, you must have a list that already has size.
-> Therefore, if it is an empty list, the list must be filled with `arr.append(int(input())`.
**Additionally**, it is safer to set the initial value of `min_val` and `max_val` to `arr[0]`.
