---
layout: "post"
title: "[Python] Programmers - Creating a JadenCase string"
date: 2026-05-04 23:59:00 +0900
last_modified_at: 2026-05-05 01:30:40 +0900
categories: ['Programmers']
tags: ['programmers', 'Python']
description: "I have summarized the solution for creating a JadenCase string while preserving consecutive spaces using split(\" \") and join() in Python."
lang: "en"
ui_lang: "ko-KR"
permalink: "/en/posts/Python-Programmers-JadenCase/"
original_url: "/posts/Python-Programmers-JadenCase/"
source_post: "_posts/2026-05-04-Python-Programmers-JadenCase.md"
generated_lang: "en"
---
[Programmers JadenCase 문자열 만들기](https://school.programmers.co.kr/learn/courses/30/lessons/12951?language=python3)

### Solution

```java
def solution(s):
    answer = []
    
    for i in s.split(" "):
        
        answer.append(i[:1].upper() + i[1:].lower())
        
    return " ".join(answer)
    
```

- Whether the first letter of a word in a sentence is an alphabet or a number, the second letter of the word is lowercase!
    - At first, the code was long by checking whether the first letter was an alphabet through `.isalpha()`, or applying ~ if it was not an alphabet, but it was shortened.
- Trap with continuous blank spaces
    - Test cases keep failing because of this trap
    - `s.split(" ")`: Leave consecutive spaces as empty string “”
        - If there are two spaces attached, the two spaces disappear through the code above and are treated as one.

### `" ".join(answer)`

- Code that concatenates the strings in the list with a single space “ “
- If you use join(), there will be no unnecessary spaces at the end and it will be much neater.
    - What if the word is the last word to remove unnecessary spaces at the end? ~ I added the same code, but it is no longer needed.
