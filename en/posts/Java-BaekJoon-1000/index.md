---
layout: "post"
title: "[Java] Baekjun number 1000 - A+B"
date: 2026-04-05 15:09:27 +0900
last_modified_at: 2026-04-21 13:56:30 +0900
categories: ["BaekJoon", "Java"]
tags: ['Java', 'baekjoon']
description: "Import the Scanner class to receive input."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Java-BaekJoon-1000/"
original_url: "/posts/Java-BaekJoon-1000/"
source_post: "_posts/2026-04-05-Java-BaekJoon-1000.md"
generated_lang: "en"
---
[BaekJoon 1000](https://www.acmicpc.net/problem/1000)

### Solution
``` java
import java.util.Scanner;

public class Main {
    public static void main (String args[]) {
        Scanner input = new Scanner(System.in);
        
        int num1 = input.nextInt();
        int num2 = input.nextInt();
        
        System.out.print(num1 + num2);
    }
}
```

### `Scanner 클래스`
- Import the Scanner class to receive input.
``` java
import java.util.Scanner
```
- The integer `int` is input through `.nextInt()`.
