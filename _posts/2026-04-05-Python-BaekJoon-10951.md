---
title: '[Python] 백준 10951번 - A+B - 4'
date: 2026-04-05 20:00:02 +0900
last_modified_at: 2026-04-23 00:31:51 +0900
categories: ['BaekJoon']
tags: ['baekjoon', 'Python']
description: '입력 개수가 정해지지 않은 A+B 문제를 sys.stdin 반복으로 처리하는 방법을 정리했습니다.'
english_url: "/en/posts/Python-BaekJoon-10951/"
---
[BaekJoon 10951](https://www.acmicpc.net/problem/10951)

### 풀이
``` python
import sys

for line in sys.stdin:
    a, b = map(int, line.split())
    print(a+b)
```
`for line in sys.stdin:`
- 전체 입력을 반복하고, line에 그 전체 입력이 저장됨
- 입력 개수가 정해져있지 않을 때 사용 가능
- `a, b = map(int, line.split())` -> 받아온 전체 입력을 공백 기준으로 나누고, `int`로 저장

### 틀린(이전) 코드
``` python
for line in sys.stdin.readline()
```
- 이렇게 하게 되면 '한 줄'을 읽어서 그 한 줄 안에 문자를 하나씩 반복하는 것

### 다른 방법
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
입력이 더이상 없다면 while 반복문을 종료시킴
