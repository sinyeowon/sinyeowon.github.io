---
title: '[Python] 백준 10818번 - 최소, 최대'
date: 2026-04-05 20:41:45 +0900
last_modified_at: 2026-04-23 01:15:24 +0900
categories: ["BaekJoon", "Python"]
tags: ['baekjoon', 'Python']
description: 'Python에서 반복문과 초기값 설정으로 리스트의 최솟값과 최댓값을 구하는 풀이를 정리했습니다.'
english_url: "/en/posts/Python-BaekJoon-10818/"
---
[BaekJoon 10818](https://www.acmicpc.net/problem/10818)

### 풀이
``` python
n = int(input())
arr = list(map(int, input().split()))

min_val = 1000000
max_val = -1000000

for num in arr:
    if num < min_val:
        min_val = num
    if num > max_val:
        max_val = num
        
print("%d %d" %(min_val, max_val))
```
Python에서 `arr[i] = ...`를 사용하려면 이미 크기가 있는 리스트여야한다.
-> 따라서, 빈 리스트라면 `arr.append(int(input())`으로 리스트를 채워줘야한다.
**추가로**, `min_val`과 `max_val`의 초기 값을 `arr[0]`으로 두면 더 안전하다.
