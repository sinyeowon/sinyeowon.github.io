---
layout: "post"
title: "[Java] Baekjun #2588 - Multiplication"
date: 2026-04-05 15:41:03 +0900
last_modified_at: 2026-04-25 02:59:38 +0900
categories: ["BaekJoon", "Java"]
tags: ['Java', 'baekjoon']
description: "Used the remainder (%) and quotient (/) operators in Java to extract individual digits from numbers and calculate the step-by-step results of multi-digit multiplication in Baekjoon 2588."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Java-BaekJoon-2588/"
original_url: "/posts/Java-BaekJoon-2588/"
source_post: "_posts/2026-04-05-Java-BaekJoon-2588.md"
generated_lang: "en"
---
[BaekJoon 2588](https://www.acmicpc.net/problem/2588)

### Solution
``` java
import java.util.Scanner;

public class Main{
    public static void main(String args[]) {
        Scanner input = new Scanner(System.in);
        
        int a = input.nextInt();
        int b = input.nextInt();
        
        int c = a * (b%10);
        int d = a * ((b%100)/10);
        int e = a * (b/100);
        int f = a * b;
                     
        System.out.printf("%d\n%d\n%d\n%d", c, d, e, f);
    }
}
```
In Java, the `/` operator was calculated using the fact that it returns only the quotient.
