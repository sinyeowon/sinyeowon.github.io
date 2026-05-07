---
layout: "post"
title: "[TIL] Introduction to Spring TIL - 26/04/12"
date: 2026-04-13 10:10:15 +0900
last_modified_at: 2026-04-26 00:22:28 +0900
categories: ["Spring 단기 심화", "Spring 강의"]
tags: ['Spring', 'TIL', '내일배움캠프']
description: "This is a TIL that summarizes how to automatically manage the creation and modification dates of entities using JPA Auditing."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-스프링입문-260412/"
original_url: "/posts/TIL-스프링입문-260412/"
source_post: "_posts/2026-04-13-TIL-스프링입문-260412.md"
generated_lang: "en"
---
## What to do today



## What I studied
### Apply JPA Auditing
#### Timestamped
- Spring Data JPA provides JPA Auditing, a function that automatically enters time values.
  - Data creation (created_at) and modification (modified_at) times are very frequently used for various data.
  - It is inefficient to write the creation and modification time of each entity every time.
``` java
@Getter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class Timestamped {

    @CreatedDate
    @Column(updatable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column
    @Temporal(TemporalType.TIMESTAMP)
    private LocalDateTime modifiedAt;
}
```
- `@MappedSuperclass`: When JPA Entity classes inherit the abstract class, member variables declared in the abstract class, such as createdAt and modifiedAt, can be recognized as columns.
- `@EntityListeners(AuditingEntityListner.class)`: Includes Auditing function in the class.
- `@CreateDate`: The time is automatically saved when an Entity object is created and saved.
  - The `update = false` option was added because the initial creation time is stored and cannot be modified after that.
- `@LastModifiedDate`: When changing the value of the searched Entity object, the changed time is automatically saved.
  - Whenever a change occurs after the initial creation time is saved, it is updated to the corresponding change time.
- `@Temporal`: Used when mapping date types (java.util.Date, java.util.Calender)
  - There are three separate types in DB: Date, Time, and Timestamp.

**Add `@EnableJpaAuditing` to the class with `@SpringBootApplication`!**
- `@EnableJpaAuditing` must be added to convey information that the JPA Auditing function will be used.



## Problems & Errors



## What to do tomorrow
