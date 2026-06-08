---
layout: "post"
title: "[TIL] Entity design standards organized by implementing Crew and CrewMember"
date: 2026-05-29 09:00:00 +0900
last_modified_at: 2026-06-05 15:13:00 +0900
categories: ["GDGoC KNU", "0 to Product"]
tags: ["project"]
description: "Structure of automatic issuance of invitation code when creating a crew"
description_source: "notion"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-Crew와-CrewMember-구현하며-정리한-엔티티-설계-기준/"
original_url: "/posts/TIL-Crew와-CrewMember-구현하며-정리한-엔티티-설계-기준/"
notion_id: "3767788a-fc66-800a-b8ad-d6c8039f7fe4"
notion_lang: "en"
---
## What I did today

- Crew entity implementation

- Implementation of CrewMember entity

- Structure of automatic issuance of invitation code when creating a crew

- Review invite_code unique constraints

- Summary of meaning of owner_id column name

- Summary of maxMemberCount verification criteria

- Whether to use @Builder and the direction of using static factory methods

    <hr>

## Invitation code is automatically issued when creating a crew

In our service, when a user creates a crew, an invitation code to join the crew is automatically issued.

At first, I thought the invitation code could be set to nullable, but **currently, the invitation code must always exist immediately after crew creation.**

Therefore, it was judged correct to set inviteCode and inviteCodeExpiresAt to `nullable = false`.

```java
@Column(nullable = false, unique = true)
private String inviteCode;

@Column(nullable = false)
private LocalDateTime inviteCodeExpiresAt;
```

Since the invitation code is a key means of inviting friends to the crew, it must be created at the time of creation.

## invite_code unique constraint

Since the invitation code is used to identify and join crews, different crews should not have the same invitation code.

Although it is possible to check for duplication in the application code, we determined that duplication is likely to occur in situations where multiple requests come in at the same time.

Therefore, it was implemented in a way that safely imposes unique restrictions at the DB level.

```java
@Table(
    name = "crew",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_crew_invite_code",
            columnNames = "invite_code"
        )
    }
)
```

In this way, even if the code generation logic checks for duplicates, the DB ultimately prevents duplicate storage.

## Why is owner_id not user_id?

When saving the crew leader in Crew, the actual reference target is User, so I was confused at first whether the column name should be user_id.

However, the role of this column is not simply the ‘user ID’ but rather the ‘owner of this crew’.

Because the column name can express what the relationship means in the domain, owner_id is more appropriate for the column side.

## Do not save currentMemberCount

A crew requires maxMemberCount, which means the maximum number of people. This value is a setting that the user directly selects when creating a crew, so it must be saved in the DB.On the other hand, the current member count, currentMemberCount, can be calculated by counting the number of active members in the CrewMember table.

```sql
SELECT COUNT(*)
FROM crew_member
WHERE crew_id = ?
AND deleted_at IS NULL;
```

Therefore, we decided that it would be safer to process currentMemberCount as a value calculated from the API response rather than storing it as a DB column.

If currentMemberCount is stored as a column, the value must be manually increased/decreased each time a member joins, leaves, or leaves the membership. If synchronization is missed during this process, the actual number of members and stored values ​​may differ.

In particular, because our service has a small crew of up to 5 people, the count query cost is not large.

However, this may cause the N+1 problem, which will likely be addressed in TIL next week.

## Use static factory method instead of @Builder

At first I thought I could also use @Builder for entity creation.

I thought that using @Builder would be good for readability because it allows you to create an object while specifying a field name.

However, for entities with creation rules, such as CrewMember, leaving the Builder open may result in objects in the wrong state being created.

For example, crew creators must have the OWNER role, and regular subscribers must have the MEMBER role.

Rather than inserting these rules directly in the service code every time, we decided that it would be safer to limit them to static factory methods inside the entity.

```java
public static CrewMember createOwner(UUID crewId, UUID userId) {
    return new CrewMember(crewId, userId, CrewRole.OWNER, LocalDateTime.now());
}

public static CrewMember createMember(UUID crewId, UUID userId) {
    return new CrewMember(crewId, userId, CrewRole.MEMBER, LocalDateTime.now());
}
```

This way, you can clearly distinguish between crew leader creation and general member creation.

<hr>

## Lessons learned

During this implementation, I felt that entity design is not simply a matter of listing fields, but rather a task of expressing domain rules as code.

Like owner_id, each column name must contain domain meaning, and it was also important to distinguish between values ​​that must be stored and values ​​that can be calculated, such as maxMemberCount and currentMemberCount.

Also, although Builder is convenient, I found that it is not a good idea to use it unconditionally for all entities. If object creation rules are important, static factory methods may be safer.

## RetrospectiveAt first, I focused on quickly implementing the entity, but as I was implementing it, I realized that ‘preventing incorrect states from occurring later’ was more important.

When designing entities in the future, rather than simply moving DB columns, we should consider together what rules this object should be created and changed.
