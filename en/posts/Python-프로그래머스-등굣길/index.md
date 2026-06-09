---
layout: "post"
title: "[Python] Programmers - On the way to school"
date: 2026-06-09 09:00:00 +0900
last_modified_at: 2026-06-09 11:53:00 +0900
categories: ["Programmers", "Python"]
tags: ["Python", "programmers"]
description: "Through the school route problem, we summarized the DP approach, which calculates the number of paths to each location from the results of the previous cell."
description_source: "notion"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Python-프로그래머스-등굣길/"
original_url: "/posts/Python-프로그래머스-등굣길/"
notion_id: "37a7788a-fc66-800d-8e13-f357a16b20e4"
notion_lang: "en"
---
<a class="notion-mention" href="https://school.programmers.co.kr/learn/courses/30/lessons/42898">Programmers on their way to school</a>

## code

```python
def solution(m, n, puddles):
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    puddles = [[q,p] for [p,q] in puddles]
    
    dp[1][1] = 1
    for i in range(1, n+1):
        for j in range(1, m+1):
            if i == 1 and j == 1:
                continue
            if [i, j] in puddles:
                dp[i][j] = 0
            else:
                dp[i][j] = dp[i-1][j] + dp[i][j-1]
          
    return dp[n][m] % 1000000007
```

## Solving process

Since the problem is to calculate the ‘number of possible routes’ by accumulating the number of routes from previous locations, DP was used.

You can think of it as a method of moving one space at a time and storing the number of ways to get there.

### Dynamic Programming

Dynamic programming is a method of dividing a large problem into smaller problems and saving the results of the smaller problems that have already been obtained to be used again.

In this problem, `dp[i][j]` was defined as `(i, j) 위치까지 올 수 있는 경로의 수`.

→ Since the number of paths to a specific location depends on the results of previous locations, I thought I should use DP because the answer to each cell can be obtained from the answer to the previous cell.

Since it is impossible to pass through a puddle, the number of paths at that location was set to 0.

When the number of paths in a puddle space becomes 0, that path is naturally excluded when calculating future spaces.

Since the path from the top and the path from the left must be added to the first column and first row, we created dp as an array of size m+1, n+1, initialized it to 0, and started the calculation using (1, 1) as the starting point.
