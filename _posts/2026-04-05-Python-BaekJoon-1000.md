---
title: '[Python] 백준 1000번 - A+B'
date: 2026-04-05 15:05:12 +0900
last_modified_at: 2026-04-23 00:17:55 +0900
categories: ['BaekJoon']
tags: ['baekjoon', 'Python']
description: 'Python에서 입력 문자열을 정수로 변환해 두 수를 더하는 기본 입출력 풀이를 정리했습니다.'
---
[BaekJoon 1000](https://www.acmicpc.net/problem/1000)

### 풀이
``` python
A, B = input().split()

print(int(A) + int(B))
```

### `input()`
- `input()`으로 입력받게 될 경우 문자열로 저장됨

### 다른 풀이
``` python
a, b = map(int, input().split())
```
으로 바로 int로 받을 수 있음
``` python
a, b = int(input().split()) # 잘못된 풀이
```
-> `input().split()`의 결과가 리스트 형태이기 때문에, 리스트를 `int()`로 감싸면 에러 발생


### map() 함수
- 리스트에서 같은 여러 값에 "같은 함수"를 한 번에 적용해주는 도구
``` python
map(함수, 반복 가능한 데이터)
```
``` python
# 예시
nums = [1, 2, 3]

result = map(int, nums) # nums 안에 있는 값들 하나씩 꺼내서 int() 적용
print(list(result))  # [1, 2, 3]
```
- 주의할 점
	- 바로 출력하면 안 나옴
	- `map()` 적용한 객체를 바로 출력하게 되면 해당 값이 map 객체(iterator)를 출력하게 되므로 이상한 객체가 나옴
 	- 따라서 `map`을 적용한 값을 출력하고 싶다면 `list()`로 한번 감싸서 list 형태로 출력하는 등 형변환이 필요함
 	- 한 번 쓰면 끝남 (iterator 특징)
    ``` python
	a = map(int, [1,2,3])

	print(list(a))  # [1,2,3]
	print(list(a))  # [] (이미 다 써버림)
	```
