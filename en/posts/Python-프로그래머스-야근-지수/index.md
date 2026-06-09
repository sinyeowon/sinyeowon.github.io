---
layout: "post"
title: "[Python] Programmers - Overtime Index"
date: 2026-06-08 09:00:00 +0900
last_modified_at: 2026-06-09 01:10:00 +0900
categories: ["Programmers", "Python"]
tags: ["Python", "programmers"]
description: "Inefficiency of sorting iterations in the overtime index problem, and efficiency improvement using max heap"
description_source: "notion"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Python-프로그래머스-야근-지수/"
original_url: "/posts/Python-프로그래머스-야근-지수/"
notion_id: "3797788a-fc66-805f-bb7d-d87a0c00a5ee"
notion_lang: "en"
---
<a class="notion-mention" href="https://school.programmers.co.kr/learn/courses/30/lessons/12927">Programmers Overtime Index</a>

## code

```python
import heapq

def solution(n, works):
    
    if sum(works) <= n:
        return 0
    
    heap = []
    
    for work in works:
        heapq.heappush(heap, -work)
        
    for _ in range(n):
        max_work = -heapq.heappop(heap)
        max_work -= 1
        heapq.heappush(heap, -max_work)
        
    answer = 0
    
    for work in heap:
        answer += work ** 2
    
    return answer
```

## Solving process

At first, the code was implemented in the order of reducing the greatest amount of work by repeatedly sorting in descending order using a general array.

```python
def solution(n, works):
    answer = 0
    
    for i in range(n):
        works.sort(reverse=True)
        if works[0] == 0:
            break
        else:
            works[0] -= 1
    
    for work in works:
        answer += work ** 2
    
    return answer
```

Then it failed the efficiency test.

The above code sorts works in descending order each time and then reduces the value at the front.

The idea is correct, but if n is large, it will be repeated n times, sorting the entire array each time. Therefore, there was an inefficiency in re-sorting the entire array to find the single maximum value each time.

So **Heap** was used.

- Heap: Data structure to quickly retrieve the maximum or minimum value

In Python, the heapq module is used, and since it is basically a min heap, the smallest value can be retrieved first.

Since the problem requires the maximum value, the value had to be changed to a negative number in order to utilize Python's heapq, which only supports the minimum heap.

In the problem, the only information needed each time was ‘current largest workload’, and the entire array did not need to be perfectly aligned every time.

As in the first solution, if you perform sort() every time, the entire array is sorted, which increases unnecessary work.

On the other hand, if you use a heap, you can quickly take out and put back only the maximum value every time.
