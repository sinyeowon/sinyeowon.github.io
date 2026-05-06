---
layout: "post"
title: "[Java] Baekjun No. 10869 - Four arithmetic operations"
date: 2026-04-05 15:29:31 +0900
last_modified_at: 2026-04-23 15:05:27 +0900
categories: ['BaekJoon']
tags: ['Java', 'baekjoon']
description: "This article solves arithmetic problems using Java's basic arithmetic operations and output format."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Java-BaekJoon-10869/"
original_url: "/posts/Java-BaekJoon-10869/"
source_post: "_posts/2026-04-05-Java-BaekJoon-10869.md"
generated_lang: "en"
---
[BaekJoon 10869](https://www.acmicpc.net/problem/10869)

### Solution
``` java
import java.util.Scanner;

public class Main {
    public static void main(String args[]) {
        Scanner input = new Scanner(System.in);
        
        int a = input.nextInt();
        int b = input.nextInt();
        
        System.out.printf("%d\n%d\n%d\n%d\n%d", a+b, a-b, a*b, a/b, a%b);
    }
}
```

### Java output
When outputting from Java, if you want to use formatted output (%d, %f, etc.), you must use `printf`, not `print`.
