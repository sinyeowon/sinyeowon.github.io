---
layout: "post"
title: "[Java] Baekjun number 10926 - ??!"
date: 2026-04-05 15:33:33 +0900
last_modified_at: 2026-04-25 15:57:56 +0900
categories: ["BaekJoon", "Java"]
tags: ['Java', 'baekjoon']
description: "Analyzed the differences between next() and nextLine() in Java's Scanner class and implemented string concatenation to solve Baekjoon 10926."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Java-BaekJoon-10926/"
original_url: "/posts/Java-BaekJoon-10926/"
source_post: "_posts/2026-04-05-Java-BaekJoon-10926.md"
generated_lang: "en"
---
[BaekJoon 10926](https://www.acmicpc.net/problem/10926)

### Solution
``` java
import java.util.Scanner;

public class Main {
    public static void main(String args[]) {
        Scanner input = new Scanner(System.in);
        
        String name = input.next();
        
        System.out.printf(name + "??!");
    }
}
```

### Strings in Java
- Receive string input using `String` class

#### Difference between next() and nextLine()
- When inputting a string in Java, input can be received through `.next()` and `.nextLine()` from the `String` class.
`.next()`: Receives input of characters or strings one by one, one word or one character at a time.
	- ex) If you enter `Hello World!`, only `Hello` will be entered.
`.nextLine()`: Receives input of characters or the entire sentence before hitting enter.
	- ex) If you enter `Hello World!`, the entire `Hello World!` will be entered.
