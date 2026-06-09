---
layout: "post"
title: "[Python] Baekjun #2588 - Multiplication"
date: 2026-04-05 15:38:27 +0900
last_modified_at: 2026-04-23 13:23:48 +0900
categories: ["BaekJoon", "Python"]
tags: ['baekjoon', 'Python']
description: "Learned how to handle multi-line inputs in Python and implemented a solution for step-by-step multiplication using string indexing and arithmetic operations in Baekjoon 2588."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Python-BaekJoon-2588/"
original_url: "/posts/Python-BaekJoon-2588/"
source_post: "_posts/2026-04-05-Python-BaekJoon-2588.md"
generated_lang: "en"
---
[BaekJoon 2588](https://www.acmicpc.net/problem/2588)

### Solution
``` python
a = int(input())
b = int(input())

c = a * (b%10)
d = a * ((b%100)//10)
e = a * (b//100)
f = a * b

print("%d\n%d\n%d\n%d" % (c, d, e, f))
```
Unlike before, the input is not in the form of `"345 678"`, but in the form of `"345\n678"`,
The list format `split()` cannot be used, and input was received separately as `input()`.
