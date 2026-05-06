---
layout: "post"
title: "[Python] Baekjun No. 10869 - Four arithmetic operations"
date: 2026-04-05 15:20:39 +0900
last_modified_at: 2026-04-23 00:17:21 +0900
categories: ['BaekJoon']
tags: ['baekjoon', 'Python']
description: "We have summarized the solution for outputting the results of four arithmetic operations using Python's arithmetic operations and string formatting."
lang: "en"
permalink: "/en/posts/Python-BaekJoon-10869/"
original_url: "/posts/Python-BaekJoon-10869/"
source_post: "_posts/2026-04-05-Python-BaekJoon-10869.md"
generated_lang: "en"
---
[BaekJoon 10869](https://www.acmicpc.net/problem/10869)

### Solution
``` python
a, b = input().split()
a, b = int(a), int(b)

print("%d\n%d\n%d\n%d\n%d" % (a+b, a-b, a*b, a/b, a%b))
```

### Using string formatting (% operator)
`"문자열" % (값들)`: The values following the same placeholder as `%d, %f` in the string are entered in order.
