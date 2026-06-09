---
layout: "post"
title: "[Python] Baekjun 10807 - Counting"
date: 2026-04-05 20:28:46 +0900
last_modified_at: 2026-04-25 23:38:20 +0900
categories: ["BaekJoon", "Python"]
tags: ['baekjoon', 'Python']
description: "Learned how to handle user input in Python using the map() function and understood why it is necessary to convert map objects to lists for indexing and output, as demonstrated in Baekjoon 10807."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Python-BaekJoon-10807/"
original_url: "/posts/Python-BaekJoon-10807/"
source_post: "_posts/2026-04-05-Python-BaekJoon-10807.md"
generated_lang: "en"
---
[BaekJoon 10807](https://www.acmicpc.net/problem/10807)

### Solution
``` python
num = int(input())
arr = list(map(int, input().split()))
    
v = int(input())

cnt = 0
for i in range(num):
    if arr[i] == v:
        cnt += 1
        
print(cnt)
```

### Result of map
- It is a map object, not a list ex) `<map object at 0x...>`
- Therefore, you need to wrap it in `list()` and make it into a list.
