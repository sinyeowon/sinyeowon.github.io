---
layout: "post"
title: "[TIL] Spring Basics - Query Methods"
title_source: "manual"
date: 2026-04-13 12:09:01 +0900
last_modified_at: 2026-04-29 12:51:58 +0900
categories: ["Spring 단기 심화", "Spring 강의"]
tags: ['Spring', 'TIL', '내일배움캠프']
description: "This is a TIL that summarizes Spring Data JPA's Query Methods and method name-based query creation method."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-스프링입문-260413/"
original_url: "/posts/TIL-스프링입문-260413/"
source_post: "_posts/2026-04-13-TIL-스프링입문-260413.md"
generated_lang: "en"
---
## What to do today



## What I studied
### Query Methods
> **Query Methods**
: Spring Data JPA provides the Query Methods function that can generate SQL with method names.
- In the JpaRepository interface, you can declare it using the SQL method name you want to request from the table mapped to that interface.
- When the SimpleJpaRepository class is created, all methods of the directly declared JpaRepository interface are automatically implemented as above.
  - The method of the JpaRepository interface, that is, the Query Method, is implemented in SimpleJpaRepository by analyzing the method name when the developer declares the method in accordance with the already defined rules.
ex) `findAllByOrderByModifiedAtDesc`: The method name is ModifiedAt in the Memo table, that is, you can create a method that executes SQL to retrieve the entire data in descending order based on the modification time.
ex) `List<Memo> findAllByUsername(String username);`: When the Query Method is declared like this, the value must be passed to `ByUsername`, so declare the type and variable name of the value in the parameter.
    - In other words, the Query Method can dynamically receive and process the values required for SQL through the method’s parameters.

- Application of Query Methods
  - Modified so that the latest notes appear at the top
``` java
// MemoService
public List<MemoResponseDto> getMemos() {
    // DB 조회
    return memoRepository.findAllByOrderByModifiedAtDesc().stream().map(MemoResponseDto::new).toList();
}
```

## Problems & Errors



## What to do tomorrow
