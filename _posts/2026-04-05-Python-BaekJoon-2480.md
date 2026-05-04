---
title: '[Python] 백준 2480번 - 주사위 세개'
date: 2026-04-05 15:48:16 +0900
last_modified_at: 2026-05-03 16:23:24 +0900
categories: ['BaekJoon']
tags: ['baekjoon', 'python']
description: 'Python 조건문과 max()를 활용해 주사위 세 개의 상금을 계산하는 풀이를 정리했습니다.'
---
[BaekJoon 2480](https://www.acmicpc.net/problem/2480)

### 풀이
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

### `max()` 함수
- 최댓값을 구할 때 사용
- 반복문을 사용하지 않고 구할 수 있음
``` python
large = max(a, b, c)
```
