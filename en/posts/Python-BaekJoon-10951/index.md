---
layout: "post"
title: "[Python] Baekjun No. 10951 - A+B - 4"
date: 2026-04-05 20:00:02 +0900
last_modified_at: 2026-04-23 00:31:51 +0900
categories: ["BaekJoon", "Python"]
tags: ['baekjoon', 'Python']
description: "We have summarized how to handle the A+B problem with an undetermined number of inputs by repeating sys.stdin."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Python-BaekJoon-10951/"
original_url: "/posts/Python-BaekJoon-10951/"
source_post: "_posts/2026-04-05-Python-BaekJoon-10951.md"
generated_lang: "en"
---
[BaekJoon 10951](https://www.acmicpc.net/problem/10951)

### Solution
``` python
import sys

for line in sys.stdin:
    a, b = map(int, line.split())
    print(a+b)
```
`for line in sys.stdin:`
- Repeats the entire input and stores the entire input in line
- Can be used when the number of inputs is not fixed
- `a, b = map(int, line.split())` -> Divide the entire input received by space and save as `int`

### Incorrect (old) code
``` python
for line in sys.stdin.readline()
```
- When you do this, you read ‘one line’ and repeat each character within that line.

### Other methods
``` python
import sys

while True:
	line = sys.stdin.readline()

	if not line:
    	break
	else:
   	 a, b = map(int, line.split())
    	print(a+b)
```
If there is no more input, the while loop ends.
