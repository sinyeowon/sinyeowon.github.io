---
layout: "post"
title: "[Java] Programmers - the next big number"
date: 2026-05-12 09:00:00 +0900
last_modified_at: 2026-05-12 12:10:00 +0900
categories: ["Programmers", "Java"]
tags: ["Java", "programmers"]
description: "Programmers Next Big Number I continued to solve the problem using different solving methods, but it was difficult to pass the accuracy test but not the efficiency test."
description_source: "excerpt"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Java-프로그래머스-다음-큰-숫자/"
original_url: "/posts/Java-프로그래머스-다음-큰-숫자/"
notion_id: "35e7788a-fc66-807f-8539-df0b5c2248e2"
notion_lang: "en"
---
[Programmers 다음 큰 숫자](https://school.programmers.co.kr/learn/courses/30/lessons/12911?language=java)

## Solution

```java
class Solution {
    public int solution(int n) {
        
        int target = Integer.bitCount(n);
        
        while(target != Integer.bitCount(++n)) {
            
        }
        
        return n;
    }

}
```

- I continued to solve the problem using different solving methods, but it was difficult to pass the accuracy test but not the efficiency test.

`Integer.bitCount(n)`

- A function that immediately counts the number of 1s when the number is converted to binary in Java.
