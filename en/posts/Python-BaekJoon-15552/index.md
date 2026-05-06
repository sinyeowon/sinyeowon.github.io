---
layout: "post"
title: "[Python] Baekjun No. 15552 - Fast A+B"
date: 2026-04-05 16:14:22 +0900
last_modified_at: 2026-05-04 02:07:34 +0900
categories: ['BaekJoon']
tags: ['baekjoon', 'Python']
description: "We have compiled a solution for quickly handling multi-line input using sys.stdin.readline() in Python."
lang: "en"
ui_lang: "ko-KR"
permalink: "/en/posts/Python-BaekJoon-15552/"
original_url: "/posts/Python-BaekJoon-15552/"
source_post: "_posts/2026-04-05-Python-BaekJoon-15552.md"
generated_lang: "en"
---
[BaekJoon 15552](https://www.acmicpc.net/problem/15552)

### Solution
``` python
import sys

n = int(input())

for i in range(n):
    a, b = map(int, sys.stdin.readline().split())
    print(a+b)
```

### `많은 수의 입력이 있을 때` in Python
- In Python, it is better than the previously used `input()`.
- Better to use `readline()`
#### readline()
- Faster input than `input()`
- Use: `import sys`
- Default: `a = sys.stdin.readline()` -> Comes as a string containing `\n`
- Remove newline (`\n`): `a = sys.stdin.readline().rstrip()`
- Enter multiple values: `a, b = map(int, sys.stdin.readline().split())`
