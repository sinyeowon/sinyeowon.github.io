---
layout: "post"
title: "[Java] Baekjun No. 15552 - Fast A+B"
date: 2026-04-05 16:09:50 +0900
last_modified_at: 2026-04-22 08:31:14 +0900
categories: ["BaekJoon", "Java"]
tags: ['Java', 'baekjoon']
description: "많은 수의 입력과 출력이 있을 때 in Java - In Java, it is better than the previously used Scanner and System.out.print."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Java-BaekJoon-15552/"
original_url: "/posts/Java-BaekJoon-15552/"
source_post: "_posts/2026-04-05-Java-BaekJoon-15552.md"
generated_lang: "en"
---
[BaekJoone 15552](https://www.acmicpc.net/problem/15552)

### Solution
``` java
import java.io.*;
import java.util.StringTokenizer;

public class Main {
    public static void main(String args[]) throws IOException {
        
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        BufferedWriter bw = new BufferedWriter(new OutputStreamWriter(System.out));
        
        int n = Integer.parseInt(br.readLine());
        
        for(int i=0; i<n; i++) {
            StringTokenizer st = new StringTokenizer(br.readLine());
            int a = Integer.parseInt(st.nextToken());
            int b = Integer.parseInt(st.nextToken());
            
            bw.write((a+b) + "\n");
            
        }
        
        bw.flush();
        bw.close();
        
    }
}
```

### `많은 수의 입력과 출력이 있을 때` in Java
- In Java, it is better than the previously used `Scanner` and `System.out.print`.
- Better to use `BufferedReader + StringTokenizer + BufferedWriter`
#### BufferedReader (input)
- Read one line quickly
- Use: `import java.io.*;`
- Default: `BufferedReder br = new BufferedReader(new InputStreamReader(System.in));`
- One line input: `String s = br.readLine();` -> string
- Convert to number: `int n = Integer.parseInt(br.readLine());`
#### StringTokenizer (Split)
- Faster than `split()`, whitespace-based separator
- Use: `import java.util.StringTokenizer;`
- Default: `StringTokenizer st = new StringTokenizer(br.readLine());`
- Split: `int a = Integer.parseInt(st.nextToken());`
#### BufferedWriter (output)
- Print quickly
- Use: `import java.io.*;`
- Default: `BufferedWriter bw = new BufferedWriter(new OutputStreamWriter(System.out));`
- Output: `bw.write("hello\n");` -> Only strings are allowed in `write()`
- Finalization (required): `bw.flush(); bw.close();` -> Use only one last time
##### Why can a+b, not a string, be entered in write() in the above code?
- In Java, `"문자열" + 숫자` is treated as `문자열`, so it can be used because it is converted to a string through `"\n"`

#### `import java.io.*`
- Import input/output related classes at once
	ex) BufferedReader, BufferedWriter, InputStreamReader, OutputStreamWriter
