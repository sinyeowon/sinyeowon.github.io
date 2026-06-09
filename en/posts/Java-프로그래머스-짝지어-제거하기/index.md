---
layout: "post"
title: "[Java] Programmers - Pair Removal"
title_source: "manual"
date: 2026-05-14 09:00:00 +0900
last_modified_at: 2026-06-09 01:34:00 +0900
categories: ["Programmers", "Java"]
tags: ["Java", "programmers"]
description: "The programmer's matching removal problem was solved using the Java Stack, and a method for efficiently removing adjacent identical characters using push(), pop(), peek(), and isEmpty() was summarized."
description_source: "notion"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Java-프로그래머스-짝지어-제거하기/"
original_url: "/posts/Java-프로그래머스-짝지어-제거하기/"
notion_id: "3607788a-fc66-80cb-9a22-e49062ed382b"
notion_lang: "en"
---
<a class="notion-mention" href="https://school.programmers.co.kr/learn/courses/30/lessons/12973?language=java">Programmers pairing and eliminating</a>

## Solution

```python
import java.util.Stack;

class Solution
{
    public int solution(String s)
    {
        Stack<Character> stack = new Stack<>();
        
        for(int i = 0; i < s.length(); i++) {
            if (stack.isEmpty()) {
                stack.push(s.charAt(i));
            }
            else {
                char ch = s.charAt(i);
                
                if (stack.peek() == ch) {
                    stack.pop();
                }
                else {
                    stack.push(ch);
                }
            }
        }
        
        return stack.isEmpty() ? 1 : 0;

    }
}
```

### Use of Stack data structure in Java

- Main method
    - `push()`: Adds a value to the stack.

    - `pop()`: Removes the top value of the stack.

    - `peek()`: Check the top value of the stack.

    - `isEmpty()`: Check whether the stack is empty.
