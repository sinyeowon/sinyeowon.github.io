---
layout: "post"
title: "[Java] Baekjun No. 11021 - A+B - 7"
date: 2026-04-05 16:27:07 +0900
last_modified_at: 2026-04-15 12:45:59 +0900
categories: ['BaekJoon']
tags: ['Java', 'baekjoon']
description: "I've outlined how to output multiple test cases in a formatted manner using BufferedReader and StringTokenizer in Java."
lang: "en"
ui_lang: "ko-KR"
permalink: "/en/posts/Java-BaekJoon-11021/"
original_url: "/posts/Java-BaekJoon-11021/"
source_post: "_posts/2026-04-05-Java-BaekJoon-11021.md"
generated_lang: "en"
---
[BaekJoon 11021](https://www.acmicpc.net/problem/11021)

### Solution
``` java
import java.io.*;
import java.util.StringTokenizer;

public class Main {
    public static void main(String args[]) throws IOException {
        
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        BufferedWriter bw = new BufferedWriter(new OutputStreamWriter(System.out));
        
        int num = Integer.parseInt(br.readLine());
        
        for(int i=0; i<num; i++) {
            
            StringTokenizer st = new StringTokenizer(br.readLine());
            
            int a = Integer.parseInt(st.nextToken());
            int b = Integer.parseInt(st.nextToken());
            
            bw.write("Case #" + (i+1) + ": " + (a+b) + "\n");
        }
        
        bw.flush();
        bw.close();
    }
}
```

### `StringTokenizer` location
- **Need to create a new line for each line**
- If you do not put it inside the loop, and only create it once outside the loop -> only the first line is read in the loop, and the tokens have already been used, so there is nothing to do in the next iteration.
- Therefore, you need to put it inside a loop so that a new token can be read every time it repeats.

### `throws IOException`
- When a problem occurs while reading input, ex) no input, stream problem -> called `IOException`
- If you use this kind of dangerous code -> you have to handle it yourself (try-catch) or throw it.
`throws IOException`: If an error occurs, I pass it on without processing it! (commonly used in cote)
