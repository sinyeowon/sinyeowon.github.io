---
title: '[Python] 백준 10869번 - 사칙연산'
date: 2026-04-05 15:20:39 +0900
last_modified_at: 2026-04-23 00:17:21 +0900
categories: ['BaekJoon']
tags: ['baekjoon', 'python']
description: 'BaekJoon 10869"문자열" % (값들): 문자열 안의 %d, %f 같은 자리 표시자에 뒤에 있는 값들이 순서대로 들어감'
---
[BaekJoon 10869](https://www.acmicpc.net/problem/10869)

### 풀이
``` python
a, b = input().split()
a, b = int(a), int(b)

print("%d\n%d\n%d\n%d\n%d" % (a+b, a-b, a*b, a/b, a%b))
```

### 문자열 포맷팅 (% 연산자) 사용
`"문자열" % (값들)`: 문자열 안의 `%d, %f` 같은 자리 표시자에 뒤에 있는 값들이 순서대로 들어감
