---
title: '[Python] 백준 2588번 - 곱셈'
date: 2026-04-05 15:38:27 +0900
last_modified_at: 2026-04-23 13:23:48 +0900
categories: ["BaekJoon", "Python"]
tags: ['baekjoon', 'Python']
description: "Python에서 여러 줄로 구성된 입력을 처리하는 방법을 익히고, 문자열 인덱싱과 산술 연산을 조합해 곱셈의 중간 과정과 결과를 산출하는 로직을 백준 2588번 풀이를 통해 정리했다."
english_url: "/en/posts/Python-BaekJoon-2588/"
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
