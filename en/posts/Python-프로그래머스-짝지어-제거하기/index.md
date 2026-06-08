---
layout: "post"
title: "[Python] Programmers - Pair Removal"
title_source: "manual"
date: 2026-05-14 09:00:00 +0900
last_modified_at: 2026-05-14 14:54:00 +0900
categories: ["Programmers", "Python"]
tags: ["Python", "programmers"]
description: "Insert one alphabet into the stack, bring in the next alphabet, and if it matches the previously inserted alphabet,"
description_source: "manual"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Python-프로그래머스-짝지어-제거하기/"
original_url: "/posts/Python-프로그래머스-짝지어-제거하기/"
notion_id: "3607788a-fc66-80b8-aed9-d90b25d0091c"
notion_lang: "en"
---
<a class="notion-mention" href="https://school.programmers.co.kr/learn/courses/30/lessons/12973">Programmers pairing and eliminating</a>

## Solution

```python
def solution(s):

    stack = []

    for ch in s:

        if stack and stack[-1] == ch:

            stack.pop()

        else:

            stack.append(ch)

    return 1 if not stack else 0
```

- Insert one alphabet into the stack, bring in the next alphabet, and if it matches the previously inserted alphabet, pop the previously inserted alphabet. If it does not match, put that alphabet into the stack as well.
    - If you do this, if you succeed in pairing and removing all alphabets, the stack should be empty.

```python
def solution(s):
    answer = -1
    arr = []

    while True:
        if len(arr) == len(s):
            return 1
        cnt = 1
        for i in range(0, len(s)-1):
            if s[i] == s[i+1]:
                arr.append(s[i])
                arr.append(s[i+1])
                if i+2 > len(s)-1 and i==0:
                    return 1
                elif i+2 > len(s)-1:
                    s = s[:i]
                elif i == 0:
                    s = s[i+2:]
                else:
                    s = s[:i] + s[i+2:]
                break
            else:
                cnt += 1
                if cnt == len(s):
                    return 0

    return answer
```

At first, I solved it as above, but the accuracy test timed out and the efficiency test failed.

The above problem must be solved using the stack.

- I knew I had to use the stack, but I was wondering how to use it and ended up not using the stack.

- It's the same as just creating a new array and solving it.
