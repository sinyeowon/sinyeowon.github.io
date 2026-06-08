---
layout: "post"
title: "[Java] Baekjun number 2557 - Hello World"
date: 2026-04-05 14:50:05 +0900
last_modified_at: 2026-04-21 13:57:07 +0900
categories: ["BaekJoon", "Java"]
tags: ['Java', 'baekjoon']
description: "You should write the main method as follows: - The main method operates first when running a Java application (main),"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Java-BaekJoon-2557/"
original_url: "/posts/Java-BaekJoon-2557/"
source_post: "_posts/2026-04-05-Java-BaekJoon-2557.md"
generated_lang: "en"
---
[BaekJoon 2557](https://www.acmicpc.net/problem/2557)

### Solution
``` java
public class Main {
    public static void main(String args[]) {
        System.out.print("Hello World!");
    }
}
```

#### For Java in Baekjun
``` java
public class Main {
	public static void main(String args[]) {
    }
}
```
You should write the main method as follows:
- The main method operates first when running a Java application (`main`), can be accessed from any object (`public`), is defined the moment Java is compiled (`static`), and is a function that does not return a value (`void`).

As I usually solve problems using programmers, I was confused because often I just had to put the answer in the answer.

### main method in java
- Because program startup is the main method, when a Java application is executed, the main method is executed first.
`public`: Access modifier, means the object can be referenced from anywhere.
- A type of restriction that can be accessed from the outside
- The types are in the order of strongest constraints: `private -> protected -> public`
`default`: Can be accessed from the same package as inside the class
`static`: This means that this function is a static function. If a function or class is declared with `static`, the corresponding object is defined the moment Java is compiled -> Afterwards, objects other than `static` are defined.
	- Therefore, it is impossible to call an object other than `static` from a `static` object.
	- Because `static` is defined first, objects that have not yet been defined cannot be called.
`void`: Only executes, no return value -> Just moves to the called part after the function ends.
`String args[]`: Used to receive values from outside when executing a program.
	``` bash
java Main hello 123
	```
	``` java
public static void main(String[] args) {
    System.out.println(args[0]); // hello
    System.out.println(args[1]); // 123
}
	```
	- The received hello and 123 values are entered into the args array.
    - In KOTE, input is mostly received through Scanner and BufferedReader, so it is rarely used.

### Output from java
`print`: simply prints the content in parentheses
`printf`: Same as printf in C, used to write `%d, %s`, etc.
`println`: After printing the content in parentheses, a newline character (`\n`) is included at the end, leaving a single line space after printing.
