---
title: '[Python] 백준 15552번 - 빠른 A+B'
date: 2026-04-05 16:14:22 +0900
last_modified_at: 2026-05-04 02:07:34 +0900
categories: ["BaekJoon", "Python"]
tags: ['baekjoon', 'Python']
description: 'Python에서 sys.stdin.readline()으로 빠르게 여러 줄 입력을 처리하는 풀이를 정리했습니다.'
english_url: "/en/posts/Python-BaekJoon-15552/"
---
[BaekJoon 15552](https://www.acmicpc.net/problem/15552)

### 풀이
``` python
import sys

n = int(input())

for i in range(n):
    a, b = map(int, sys.stdin.readline().split())
    print(a+b)
```

### Python에서 `많은 수의 입력이 있을 때`
- Python에서는 기존에 사용하던 `input()` 보다
- `readline()`을 사용하는 게 나음
#### readline()
- `input()` 보다 빠른 입력
- 사용: `import sys`
- 기본: `a = sys.stdin.readline()` -> `\n` 포함 문자열로 들어옴
- 개행(`\n`) 제거: `a = sys.stdin.readline().rstrip()`
- 여러 값 입력: `a, b = map(int, sys.stdin.readline().split())`
