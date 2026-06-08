---
layout: "post"
title: "[TIL] Soft Delete-based crew member re-enrollment processing"
date: 2026-06-01 09:00:00 +0900
last_modified_at: 2026-06-05 15:23:00 +0900
categories: ["GDGoC KNU", "0 to Product"]
tags: ["project"]
description: "Summary of re-enrollment processing method after withdrawal"
description_source: "notion"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-Soft-Delete-기반-크루원-재가입-처리/"
original_url: "/posts/TIL-Soft-Delete-기반-크루원-재가입-처리/"
notion_id: "3767788a-fc66-8030-8e55-cf4ae4a7b3ce"
notion_lang: "en"
---
## What I did today

- Review `CrewMember` soft delete policy

- Summary of re-enrollment processing method after withdrawal

- `crew_id`, `user_id` Unique Pharmaceutical Review

- Summary of deleted row recovery method

- Summary of precautions when using `@SQLRestriction("deleted_at IS NULL")`

- Consideration on how to process related data when deleting a crew

    <hr>

## Why use Soft Delete

Our project is designed based on soft delete using `deleted_at`.

In other words, the data is not actually deleted from the DB, but the deletion time is recorded and excluded from general searches.

```java
private LocalDateTime deletedAt;
```

Since crew, crew member, payment history, and ranking data are linked to each other, if you actually delete data with hard delete, you should consider whether related data should be deleted together.

For example, the following problem occurs when deleting a crew:

- Will the crew's `CrewMember` also be deleted?

- How will the crew's `Expense` be handled?

- Will the already created `RankingResult` be maintained?

- How to implement the FK cascade policy

In a state where all of these aspects were not clearly determined, soft delete was judged to be safer than hard delete.

## Unique constraints to prevent duplicate subscriptions

Crew member relationships are divided into the combination of `crew_id` and `user_id`.

Since one user cannot join the same crew multiple times, the following unique constraints had to be considered for `CrewMember`.

```java
@Table(
    name = "crew_member",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_crew_member_crew_id_user_id",
            columnNames = {"crew_id", "user_id"}
        )
    }
)
```

By placing this restriction, you can prevent multiple rows of the same user from being created in the same crew.

## Problem rejoining after leaving crew

One problem arises when unique restrictions are applied.

When a user withdraws from the crew, only `deleted_at` is filled and the row remains in the DB.In this state, if the same user tries to join the same crew again, a new row cannot be created because the existing row remains.

Therefore, when rejoining after withdrawal, it is more appropriate to restore an existing soft delete row rather than creating a new row.

```plaintext
처음 가입 = CrewMember 신규 생성
탈퇴 = deleted_at 기록
재가입 = 기존 deleted row 복구
```

## Precautions when searching for deleted members

Currently, when `@SQLRestriction("deleted_at IS NULL")` is used, deleted rows are automatically excluded from general JPA queries.

This is convenient for general inquiries, but caution must be taken when re-registering.

To process re-subscription, you need to find the deleted row, but the deleted row is not visible through general search.

So a separate query to find deleted members was needed.

```java
@Query(value = """
    select * from crew_member
    where crew_id = :crewId
    and user_id = :userId
    and deleted_at is not null
    limit 1
    """, nativeQuery = true)
Optional<CrewMember> findDeletedMember(UUID crewId, UUID userId);
```

And if there are deleted rows, change `deleted_at` back to null and update `joined_at` and `role`.

## Re-enrollment processing flow

The re-enrollment logic can be summarized as follows.

```java
CrewMember crewMember = crewMemberRepository.findDeletedMember(crew.getId(), userId)
    .map(deletedMember -> {
        deletedMember.restoreMember(CrewRole.MEMBER);
        return crewMemberRepository.save(deletedMember);
    })
    .orElseGet(() -> crewMemberRepository.save(
        CrewMember.createMember(crew.getId(), userId)
    ));
```

In this way, users with a history of withdrawal can restore existing rows, and users without a history of withdrawal can create new rows.

## Crew deletion and related data

If you soft delete the crew itself, the CrewMember row may remain.

In this case, if you try to access the deleted crew, the access can be blocked because the deleted crew cannot be found in `CrewAuthorizationService.validateCrewExists()`.

However, to more strictly ensure data consistency, you must consider a policy of soft deleting the crew's `CrewMember` when deleting a crew.

Additionally, future policies are needed to determine whether the crew's payment history and ranking data will be preserved or excluded from inquiries.

We will discuss solutions in TIL next week.

<hr>

## Lessons learned

I learned that soft delete is not simply a function to save the deletion time, but is deeply connected to subsequent re-subscription or data inquiry policies.

In particular, when using unique constraints and soft delete together, you must decide how to handle re-joining after withdrawal.I also learned that although settings that automatically exclude deleted data, such as `@SQLRestriction`, are convenient, a separate search method is needed when deleted data needs to be recovered.

## Retrospective

At first, I thought that if I unsubscribe, I would just have to recreate the row when I sign up again.

However, when we considered the unique constraint and soft delete policy together, we found that the method of restoring existing rows was more consistent.

In the future, when implementing the delete function, we will need to consider not just “delete” but also subsequent recovery, re-subscription, and related data processing.
