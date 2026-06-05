---
layout: "post"
title: "[Python] Programmer - Integer Triangle"
date: 2026-05-18 09:00:00 +0900
last_modified_at: 2026-06-04 22:19:00 +0900
categories: ["Programmers", "Python"]
tags: ["Python", "programmers"]
description: "A dynamic programming solution for the Integer Triangle problem, updating accumulated path sums to find the maximum total from top to bottom."
description_source: "manual"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Python-프로그래머스-정수-삼각형/"
original_url: "/posts/Python-프로그래머스-정수-삼각형/"
notion_id: "3757788a-fc66-809a-885c-cacfc67bfc8e"
notion_lang: "en"
---
[Programmers 정수 삼각형](https://school.programmers.co.kr/learn/courses/30/lessons/43105)

## Solution

```python
def solution(triangle):
    answer = 0
    
    for i in range(1, len(triangle)):
        for j in range(len(triangle[i])):
            if j == 0:
                triangle[i][j] += triangle[i-1][j]
            elif j == i:
                triangle[i][j] += triangle[i-1][j-1]
            else:
                triangle[i][j] += max(triangle[i-1][j-1], triangle[i-1][j])
    
    answer = max(triangle[-1])
    
    return answer
```

### Dynamic Programming (DP)

A method of dividing a big problem into smaller problems and saving the answers to the smaller problems that have already been found to use them again.

- How to save and reuse already obtained results without recalculating from scratch every time.

- While solving the above problem using dynamic programming, change the meaning of triangle[i][j] to `triangle[i][j] = 맨 위에서 이 칸까지 오는 최대 합` to find the ‘maximum sum that can be obtained when arriving at this cell.’

- The same can be implemented in Java.

```python
class Solution {
    public int solution(int[][] triangle) {
        for (int i = 1; i < triangle.length; i++) {
            for (int j = 0; j < triangle[i].length; j++) {

                if (j == 0) {
                    // 왼쪽 끝: 바로 위에서만 내려올 수 있음
                    triangle[i][j] += triangle[i - 1][j];
                } 
                else if (j == i) {
                    // 오른쪽 끝: 왼쪽 위에서만 내려올 수 있음
                    triangle[i][j] += triangle[i - 1][j - 1];
                } 
                else {
                    // 가운데: 왼쪽 위, 오른쪽 위 중 더 큰 값 선택
                    triangle[i][j] += Math.max(triangle[i - 1][j - 1], triangle[i - 1][j]);
                }
            }
        }

        int answer = 0;

        for (int i = 0; i < triangle[triangle.length - 1].length; i++) {
            answer = Math.max(answer, triangle[triangle.length - 1][i]);
        }

        return answer;
    }
}
```
