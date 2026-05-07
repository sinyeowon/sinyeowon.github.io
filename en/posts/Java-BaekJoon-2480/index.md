---
layout: "post"
title: "[Java] Baekjun number 2480 - three dice"
date: 2026-04-05 15:53:10 +0900
last_modified_at: 2026-04-22 08:30:43 +0900
categories: ["백준", "Java"]
tags: ['Java', 'baekjoon']
description: "We have summarized the solution for calculating the prize money of three dice using Java conditional statements and Math.max."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Java-BaekJoon-2480/"
original_url: "/posts/Java-BaekJoon-2480/"
source_post: "_posts/2026-04-05-Java-BaekJoon-2480.md"
generated_lang: "en"
---
[BaekJoon 2480](https://www.acmicpc.net/problem/2480)

### Solution
``` java
import java.util.Scanner;

public class Main {
    public static void main(String args[]) {
        Scanner input = new Scanner(System.in);
        
        int a = input.nextInt();
        int b = input.nextInt();
        int c = input.nextInt();
        
        if ((a == b) && (b == c)) {
            System.out.println(10000 + a*1000);
        } else if ((a == b) || (b == c) || (c == a)) {
            if (a == b) {
                System.out.println(1000 + a*100);
            } else if (b == c) {
                System.out.println(1000 + b*100);
            } else {
                System.out.println(1000 + c*100);
            }
        } else {
            int large = 0;
            if (a > b) {
                if (a > c) {
                    large = a;
                } else {
                    large = c;
                }
            } else if (b > c) {
                if (b > a) {
                    large = b;
                } else {
                    large = a;
                }
            } else {
                if (c > b) {
                    large = c;
                } else {
                    large = b;
                }
            }
            System.out.println(large*100);
            
        }
    }
}
```

### `Math.max`
- A function that returns the larger of two values.
- Finding the maximum value among three values using a conditional statement becomes complicated as a solution, so it can be easily obtained using `Math.max`.
``` java
int large = Math.max(a, Math.max(b, c));
```
