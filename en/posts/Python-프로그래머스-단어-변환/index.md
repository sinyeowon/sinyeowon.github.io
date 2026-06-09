---
layout: "post"
title: "[Python] Programmers - Word Conversion"
date: 2026-06-07 09:00:00 +0900
last_modified_at: 2026-06-09 01:15:00 +0900
categories: ["Programmers", "Python"]
tags: ["Python", "programmers"]
description: "Shortest conversion calculation using BFS, and Python data structures like deque, set, tuple, and zip()"
description_source: "notion"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Python-프로그래머스-단어-변환/"
original_url: "/posts/Python-프로그래머스-단어-변환/"
notion_id: "3777788a-fc66-80ea-872b-d6b3d5e882c2"
notion_lang: "en"
---
<a class="notion-mention" href="https://school.programmers.co.kr/learn/courses/30/lessons/43163?language=python3">Programmers word conversion</a>

## code

```python
from collections import deque

def solution(begin, target, words):
    
    if target not in words:
        return 0
    else:
    
		    // 큐에 현재 단어와 변환 횟수를 저장
        queue = deque([(begin, 0)])
        visited = set([begin])
        
        while queue:
            current_word, step = queue.popleft()
            
            // 현재 단어가 target과 일치하면 변환 횟수를 return
            if current_word == target:
                return step
            
            // 다음 단계로 가능한 모든 단어를 queue에 넣음
            for word in words:
                if word not in visited:
                
		                // 알파벳이 1개 다른지 확인
                    diff_cnt = sum(c1 != c2 for c1, c2 in zip(word, current_word))
                    if diff_cnt == 1:
                        visited.add(word)
                        queue.append((word, step + 1))
        
    return 0
```

## Solving process

**Since it is a word graph problem in which two words are connected by only one letter difference**, I thought I would solve it using BFS, which uses a queue.

> And, like the above problem, BFS is said to be a good fit for the problem of finding the shortest distance where all movement costs are 1.

You can also use DFS, but in that case, if there is a longer path, it may be found first, so it does not guarantee the minimum when the target is first encountered.

Therefore, it was thought that using DFS could be more cumbersome and inefficient.

Since BFS uses a structure such as ‘what comes in first, take out first’, it uses a queue, a data structure that can quickly insert and remove data from both sides.

As a result, since we need to search for a word and return the number of times the word has been changed, we used a tuple to bundle the current word and the number of conversion steps and store it in the queue.

- Tuple: A data structure that groups multiple values into one.

- `deque( [ (begin, 0) ] )` → refers to parentheses that use deque function calls, lists, and tuples in order.

In visited, a set is used to store words that have already been visited.

- Set set: Frequently used for visit checking as duplication is not allowed.

Tuple unpacking was performed to search for the next converted word.

- Tuple unpacking: As in the code, the two values stored as a tuple are divided into two variables.<br>
    `current_word, step = ("hit", 0)`

I used zip() to compare two strings and check if they differ by just one alphabet.

- zip(): Bundles each comparison string one by one from the beginning<br>
    `zip(word, current_word)` → `('h', 'h')`

- `for c1, c2 in zip(word, current_word)`<br>
    → Take out the zipped letter pairs one by one and write them

- `diff_cnt = sum(c1 != c2 for c1, c2 in zip(word, current_word))`<br>
    → Compare word and current_word one letter at a time to count the number of different letters`h == h` → `False -> 0`

    `o != i` → `True -> 1`

Finally, in the code, BFS checks all words at level 0 → Checks all words at level 1 → Checks all words at level 2 → … Search in order and check the shortest distances first.

Therefore, the first encountered step can be the minimum number of transformations.
