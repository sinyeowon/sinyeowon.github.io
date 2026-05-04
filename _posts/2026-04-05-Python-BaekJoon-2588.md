---
title: '[Python] 백준 2588번 - 곱셈'
date: 2026-04-05 15:38:27 +0900
last_modified_at: 2026-04-23 13:23:48 +0900
categories: ['BaekJoon']
tags: ['baekjoon', 'python']
description: 'BaekJoon 2588입력이 기존과 다르게 "345 678" 형태가 아니라, "345\\n678" 같은 형태이므로,리스트 형식인 split()을 사용할 수 없고, 따로 input()으로 입력을 받음'
---
[BaekJoon 2588](https://www.acmicpc.net/problem/2588)

### 풀이
``` python
a = int(input())
b = int(input())

c = a * (b%10)
d = a * ((b%100)//10)
e = a * (b//100)
f = a * b

print("%d\n%d\n%d\n%d" % (c, d, e, f))
```
입력이 기존과 다르게 `"345 678"` 형태가 아니라 `"345\n678"` 같은 형태이므로,
리스트 형식인 `split()`을 사용할 수 없고, 따로 `input()`으로 입력을 받았다.
