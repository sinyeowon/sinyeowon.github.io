---
layout: "post"
title: "[Python] Programmer - Repeating binary conversion"
date: 2026-05-08 09:00:00 +0900
last_modified_at: 2026-06-09 01:24:00 +0900
categories: ["Programmers", "Python"]
tags: ["Python", "programmers"]
description: "Through the problem of repeating binary conversion, we understood the process of removing 0 from a string and converting the length to binary, organized loop conditions and string conversion mistakes, and learned how to use the bin() function."
description_source: "notion"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Python-프로그래머스-이진-변환-반복하기/"
original_url: "/posts/Python-프로그래머스-이진-변환-반복하기/"
notion_id: "35a7788a-fc66-8045-8f62-e6e85d9187eb"
notion_lang: "en"
---
<a class="notion-mention" href="https://school.programmers.co.kr/learn/courses/30/lessons/70129">Programmers Binary Conversion Repeat</a>

## Solution

```python
def solution(s):
    answer = []
    z_cnt = 0
    cnt = 0
    
    while True:
        
        if len(s) == 1 and s[0] == '1':
            break
        
        z_cnt += s.count('0')
        s = s.replace("0", "")
        num = len(s)
        
        arr = []
        while num != 0:
            arr.append(str(num%2))
            num = num//2
        
        arr.reverse()
        s = ''.join(arr)
        cnt += 1
    
    answer.append(cnt)
    answer.append(z_cnt)
    
    
    return answer
```

- At first, the while statement in the binary conversion part within the while statement was written as `while num//2 != 0:`, but then when only 1 remained at the end, 1 was not included and the loop ended due to a condition.
    - Therefore, change the condition to `num != 0`

- Also, at first, when reverse sorting, I wrote it as `arr.sort(reverse=True)`, but if I write it that way, the order is broken because it just sorts from the largest number.
    - Therefore, `arr.reverse()` allows the remainder to be stacked upside down.

- At first, an error occurred because `s = arr` was used to assign the created arr to s, making it a list rather than a string.
    - To solve the problem, you can save it as a string through `s = '',join(arr)`.

```python
def solution(s):

    z_cnt = 0

    cnt = 0

    

    while s != "1":

        z_cnt += s.count("0")

        s = s.replace("0", "")

        

        num = len(s)

        s = bin(num)[2:]

        

        cnt += 1

    

    return [cnt, z_cnt]
```

It can also be written in the same way as above.

- `bin()` function
    - Python function that converts a number into a string in binary form ex) `bin(10)` -> Changes to `'0b1010'` (`0b` in front indicates a binary number)

    - In the code above, only the binary part is needed, so cut out the part that indicates a binary number, such as `bin(10)[2:]`.
