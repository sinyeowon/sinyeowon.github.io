---
layout: "post"
title: "[Python] Programmers - Fibonacci numbers"
date: 2026-05-13 09:00:00 +0900
last_modified_at: 2026-05-13 10:32:00 +0900
categories: ["Programmers", "Python"]
tags: ["Python", "programmers"]
description: "Programmers Fibonacci numbers F(2) = F(0) + F(1) = 0 + 1 = 1"
description_source: "excerpt"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Python-프로그래머스-피보나치-수/"
original_url: "/posts/Python-프로그래머스-피보나치-수/"
notion_id: "35f7788a-fc66-8064-8cdf-ef83dd3a90dc"
notion_lang: "en"
---
[Programmers 피보나치 수](https://school.programmers.co.kr/learn/courses/30/lessons/12945?language=python3)

## Solution

```python
def solution(n):
    a, b = 0, 1
    
    for _ in range(n):
        a, b = b, a + b
    
    return a % 1234567
```

F(2) = F(0) + F(1) = 0 + 1 = 1

F(3) = F(1) + F(2) = 1 + 1 = 2

F(4) = F(2) + F(3) = 1 + 2 = 3

F(5) = F(3) + F(4) = 2 + 3 = 5

- Because it is added in the same way as above, it could be expressed as `a, b = b, a+b`.

- And since the problem asks to find the remainder of dividing the nth Fibonacci number by 1234567, the return value is set to `a%1234567`.

```python
def solution(n):
    answer = 0
    
    answer = pibo(n)
    
    return answer

def pibo(k):
    if k == 0:
        return 0
    elif k == 1:
        return 1
    else:
        return pibo(k-1) + pibo(k-2)
```

At first, we solved it in the same way as above, but it failed in terms of efficiency because we kept recalculating the same values.
