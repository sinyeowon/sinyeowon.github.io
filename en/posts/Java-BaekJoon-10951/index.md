---
layout: "post"
title: "[Java] Baekjun 10951 - A+B - 4"
date: 2026-04-05 20:19:06 +0900
last_modified_at: 2026-04-11 12:39:42 +0900
categories: ['BaekJoon']
tags: ['Java', 'baekjoon']
description: "We have summarized how to handle the A+B problem with an undetermined number of inputs using Java's hasNext()."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Java-BaekJoon-10951/"
original_url: "/posts/Java-BaekJoon-10951/"
source_post: "_posts/2026-04-05-Java-BaekJoon-10951.md"
generated_lang: "en"
---
[BaekJoon 10951](https://www.acmicpc.net/problem/10951)

### Solution
``` java
import java.util.Scanner;

public class Main {
    public static void main(String args[]) {
        Scanner sc = new Scanner(System.in);
        
        while(sc.hasNext()) {
            int a = sc.nextInt();
            int b = sc.nextInt();
            
            System.out.printf("%d\n", a+b);
        }
    }
}
```

### EOF in class `Scanner`
- Using `hasNext()` method
- Returns true if there is an entered token, otherwise returns false.
