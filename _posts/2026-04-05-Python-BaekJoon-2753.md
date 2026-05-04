---
title: '[Python] 백준 2753번 - 윤년'
date: 2026-04-05 15:44:08 +0900
last_modified_at: 2026-04-30 15:30:23 +0900
categories: ['BaekJoon']
tags: ['baekjoon', 'python']
description: 'BaekJoon 2753Python에서는 Java나 C와 달리, ||나 && 연산자를 or과 and로 사용해야한다.'
---
[BaekJoon 2753](https://www.acmicpc.net/problem/2753)

### 풀이
``` python
year = int(input())

if year%4 == 0:
    if (year%100 != 0) or (year%400 == 0):
        print("1")
    else:
        print("0")
else: print("0")
```
Python에서는 Java나 C와 달리, `||`나 `&&` 연산자를 `or`과 `and`로 사용해야한다.
