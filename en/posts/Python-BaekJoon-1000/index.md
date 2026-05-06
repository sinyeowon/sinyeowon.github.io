---
layout: "post"
title: "[Python] Baekjun 1000 times - A+B"
date: 2026-04-05 15:05:12 +0900
last_modified_at: 2026-04-23 00:17:55 +0900
categories: ['BaekJoon']
tags: ['baekjoon', 'Python']
description: "We have summarized the basic input/output solution for adding two numbers by converting the input string to an integer in Python."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Python-BaekJoon-1000/"
original_url: "/posts/Python-BaekJoon-1000/"
source_post: "_posts/2026-04-05-Python-BaekJoon-1000.md"
generated_lang: "en"
---
[BaekJoon 1000](https://www.acmicpc.net/problem/1000)

### Solution
``` python
A, B = input().split()

print(int(A) + int(B))
```

### `input()`
- When input as `input()`, it is saved as a string.

### Another solution
``` python
a, b = map(int, input().split())
```
You can receive it directly as int.
``` python
a, b = int(input().split()) # 잘못된 풀이
```
-> Since the result of `input().split()` is in the form of a list, an error occurs if the list is wrapped with `int()`.


### map() function
- A tool that applies the “same function” to multiple values in a list at once
``` python
map(함수, 반복 가능한 데이터)
```
``` python
# 예시
nums = [1, 2, 3]

result = map(int, nums) # nums 안에 있는 값들 하나씩 꺼내서 int() 적용
print(list(result))  # [1, 2, 3]
```
- Things to note
	- If I print it right away, it doesn’t come out.
	- If you immediately output the object to which `map()` is applied, a strange object appears because the corresponding value outputs a map object (iterator).
 	- Therefore, if you want to output the value to which `map` is applied, type conversion is required, such as wrapping it once with `list()` and outputting it in list form.
 	- Use it once and you're done (iterator feature)
    ``` python
	a = map(int, [1,2,3])

	print(list(a))  # [1,2,3]
	print(list(a))  # [] (이미 다 써버림)
	```
