---
title: '[Python] 백준 10807번 - 개수 세기'
date: 2026-04-05 20:28:46 +0900
last_modified_at: 2026-04-25 23:38:20 +0900
categories: ['BaekJoon']
tags: ['baekjoon', 'python']
description: 'BaekJoon 10807list가 아니라 map 객체임 ex) &lt;map object at 0x...>따라서 list()로 감싸서 list로 만들어줘야함'
---
[BaekJoon 10807](https://www.acmicpc.net/problem/10807)

### 풀이
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

### map의 결과
- list가 아니라 map 객체임 ex) `<map object at 0x...>`
- 따라서 `list()`로 감싸서 list로 만들어줘야함
