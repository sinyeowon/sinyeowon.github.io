---
layout: "post"
title: "[Java] Baekjun No. 10952 - A+B - 5"
date: 2026-04-05 16:36:35 +0900
last_modified_at: 2026-04-13 04:50:17 +0900
categories: ["BaekJoon", "Java"]
tags: ['Java', 'baekjoon']
description: "In Java, while(true) is usually used, not while(1) like in Python. In Java, the conditional expression must be of type boolean. In Java, 1 is int,"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Java-BaekJoon-10952/"
original_url: "/posts/Java-BaekJoon-10952/"
source_post: "_posts/2026-04-05-Java-BaekJoon-10952.md"
generated_lang: "en"
---
[BaekJoon 10952](https://www.acmicpc.net/problem/10952)

### Solution
``` java
import java.util.Scanner;

public class Main {
    public static void main(String args[]) {
        Scanner sc = new Scanner(System.in);
        
        while(true) {
            int a = sc.nextInt();
            int b = sc.nextInt();
            
            if((a==0) && (b==0)) {
                break;
            } else {
                System.out.printf("%d\n", a+b);
            }
        }
    }
}
```
In Java, `while(true)` is usually used, not `while(1)` like in Python.
- In Java, the conditional expression must be of type `boolean`.
- In Java, 1 is `int`, so it is not automatically converted to `boolean`.

- Handled implicitly in Python as `0(False), 1(True)`
