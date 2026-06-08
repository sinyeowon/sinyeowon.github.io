---
layout: "post"
title: "[Python] Baekjun number 2480 - three dice"
date: 2026-04-05 15:48:16 +0900
last_modified_at: 2026-05-03 16:23:24 +0900
categories: ["BaekJoon", "Python"]
tags: ['baekjoon', 'Python']
description: "Used to find the maximum value Can be obtained without using loops"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Python-BaekJoon-2480/"
original_url: "/posts/Python-BaekJoon-2480/"
source_post: "_posts/2026-04-05-Python-BaekJoon-2480.md"
generated_lang: "en"
---
[BaekJoon 2480](https://www.acmicpc.net/problem/2480)

### Solution
``` python
a, b, c = input().split()
a, b, c = int(a), int(b), int(c)

if (a == b) and (b == c):
    print(10000 + a*1000)
elif (a == b) or (b == c) or (a == c):
    if (a == b): print(1000 + a*100)
    elif (b == c): print(1000 + b*100)
    else: print(1000 + a*100)
else:
    large = 0
    for num in a, b, c:
        if num > large:
            large = num
    print(large * 100)
```

### `max()` function
- Used to find the maximum value
- Can be obtained without using loops
``` python
large = max(a, b, c)
```
