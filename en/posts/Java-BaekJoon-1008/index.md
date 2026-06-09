---
layout: "post"
title: "[Java] Baekjun No. 1008 - A/B"
date: 2026-04-05 15:16:38 +0900
last_modified_at: 2026-04-22 15:08:07 +0900
categories: ["BaekJoon", "Java"]
tags: ['Java', 'baekjoon']
description: "Understood the characteristics of integer division in Java and learned how to use explicit casting to double or float to obtain accurate floating-point results, based on Baekjoon 1008."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Java-BaekJoon-1008/"
original_url: "/posts/Java-BaekJoon-1008/"
source_post: "_posts/2026-04-05-Java-BaekJoon-1008.md"
generated_lang: "en"
---
[BaekJoon 1008](https://www.acmicpc.net/problem/1008)

### Solution
``` java
import java.util.Scanner;

public class Main {
    public static void main(String args[]) {
        Scanner input = new Scanner(System.in);
        
        int num1 = input.nextInt();
        int num2 = input.nextInt();
        
        System.out.print((double)num1 / num2);
    }
}
```

### `/` division operation in Java
- `정수 / 정수`: The result is `int`, i.e. returns only the quotient.
- To return the entire division result, including real numbers, type conversion must be done using either `double` or `float`.
