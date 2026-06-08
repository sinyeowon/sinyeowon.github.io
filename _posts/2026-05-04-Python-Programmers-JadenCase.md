---
title: '[Python] 프로그래머스 - JadenCase 문자열 만들기'
date: 2026-05-04 23:59:00 +0900
last_modified_at: 2026-05-05 01:30:40 +0900
categories: ["Programmers", "Python"]
tags: ['programmers', 'Python']
description: "문장 속 단어의 첫글자가 알파벳이든 숫자이든, 단어의 두번째 글자부터는 소문자 적용! 처음에는 .isalpha()를 통해 첫글자가 알파벳인지 확인하거나 알파벳이 아니라면 으로 적용해서 코드가 길었는데 단축됨 연속 공백이 존재하는 함정 이 함정 때문에 계속 테스트 케이…"
english_url: "/en/posts/Python-Programmers-JadenCase/"
---
[Programmers JadenCase 문자열 만들기](https://school.programmers.co.kr/learn/courses/30/lessons/12951?language=python3)

### 풀이

```java
def solution(s):
    answer = []
    
    for i in s.split(" "):
        
        answer.append(i[:1].upper() + i[1:].lower())
        
    return " ".join(answer)
    
```

- 문장 속 단어의 첫글자가 알파벳이든 숫자이든, 단어의 두번째 글자부터는 소문자 적용!
    - 처음에는 `.isalpha()`를 통해 첫글자가 알파벳인지 확인하거나 알파벳이 아니라면~ 으로 적용해서 코드가 길었는데 단축됨
- 연속 공백이 존재하는 함정
    - 이 함정 때문에 계속 테스트 케이스를 통과하지 못함
    - `s.split(" ")`: 연속 공백을 빈 문자열 “”로 남겨둠
        - 공백 2개가 붙어있다면 위 코드를 통해 공백 2개가 사라져서 하나처럼 처리됨

### `" ".join(answer)`

- 리스트 안의 문자열들을 “ “ 공백 하나로 이어붙이는 코드
- join()을 사용하면 마지막에 불필요한 공백도 안 붙고 훨씬 깔끔해짐
    - 마지막에 불필요한 공백을 제거하기 위해 단어가 마지막 단어라면? ~ 같은 코드를 추가했었는데, 필요없어짐
