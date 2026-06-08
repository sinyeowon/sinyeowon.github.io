---
layout: "post"
title: "[Python] Programmers - Network"
date: 2026-05-21 09:00:00 +0900
last_modified_at: 2026-06-04 22:39:00 +0900
categories: ["Programmers", "Python"]
tags: ["programmers", "Python"]
description: "Even if they are not directly connected like numbers 0 and 2 in 0번 1번 2번, if they are connected through number 1, they are on the same network."
description_source: "manual"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Python-프로그래머스-네트워크/"
original_url: "/posts/Python-프로그래머스-네트워크/"
notion_id: "3677788a-fc66-805c-abdb-cbf869d5703e"
notion_lang: "en"
---
<a class="notion-mention" href="https://school.programmers.co.kr/learn/courses/30/lessons/43162">Programmers Network</a>

## Solution

```python
def solution(n, computers):
    answer = 0
    visited = [False] * n
    
    def dfs(node):
        visited[node] = True
        
        for next_node in range(n):
            if computers[node][next_node] == 1 and not visited[next_node]:
                dfs(next_node)
    
    for i in range(n):
        if not visited[i]:
            dfs(i)
            answer += 1
    
    return answer
```

###Understand

Even if they are not directly connected like numbers 0 and 2 in `0번 <-> 1번 <-> 2번`, if they are connected through number 1, they are on the same network.

### DFS

Abbreviation for Depth First Search, depth first search.

- A method of going deep into a place where you can go in one direction, and then coming back and exploring another route when there is nowhere else to go.

- Usually implemented using a recursive function or stack.

### BFS

Abbreviation for Breadth First Search.

- A method of visiting nodes in order, starting from the nodes closest to the current location.

- Rather than going deep into one place, first check the surrounding nodes connected to the current node.

- Usually implemented using a queue

→ Since this problem is not about finding the shortest distance, but about finding the number of connected computer bundles, both DFS and BFS can be used.

Previously, I stored the connected computer numbers in the arr array and then tried to calculate the number of networks using the number of unvisited computers.

However, this method found it difficult to properly handle indirect connections.

Rather than simply storing connected numbers, you had to start from one computer and search all connected computers until the end.

My solution used DFS.

1. Check all computers one by one

2. Find computers that haven't been visited yet

3. Start DFS or BFS on that computer

4. Visit all connected computers

5. Once the search is over, one network has been found.

6. Increase answer by 1

### Solving method using BFS

```python
from collections import deque

def solution(n, computers):
    answer = 0
    visited = [False] * n

    for i in range(n):
        if not visited[i]:
            queue = deque([i])
            visited[i] = True

            while queue:
                node = queue.popleft()

                for next_node in range(n):
                    if computers[node][next_node] == 1 and not visited[next_node]:
                        visited[next_node] = True
                        queue.append(next_node)

            answer += 1

    return answer
```
