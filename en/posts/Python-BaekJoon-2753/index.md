---
layout: "post"
title: "[Python] Baekjun number 2753 - leap year"
date: 2026-04-05 15:44:08 +0900
last_modified_at: 2026-04-30 15:30:23 +0900
categories: ["BaekJoon", "Python"]
tags: ['baekjoon', 'Python']
description: "In Python, unlike Java or C, you must use the || or && operators as or and and."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Python-BaekJoon-2753/"
original_url: "/posts/Python-BaekJoon-2753/"
source_post: "_posts/2026-04-05-Python-BaekJoon-2753.md"
generated_lang: "en"
---
[BaekJoon 2753](https://www.acmicpc.net/problem/2753)

### Solution
``` python
year = int(input())

if year%4 == 0:
    if (year%100 != 0) or (year%400 == 0):
        print("1")
    else:
        print("0")
else: print("0")
```
In Python, unlike Java or C, you must use the `||` or `&&` operators as `or` and `and`.
