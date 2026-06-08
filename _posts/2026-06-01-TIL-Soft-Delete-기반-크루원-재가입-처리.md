---
title: "[TIL] Soft Delete 기반 크루원 재가입 처리"
date: 2026-06-01 09:00:00 +0900
last_modified_at: 2026-06-05 15:23:00 +0900
categories: ["GDGoC KNU", "0 to Product"]
tags: ["project"]
description: "@SQLRestriction(\"deletedat IS NULL\") 사용 시 주의점 정리"
description_source: "notion"
english_url: "/en/posts/TIL-Soft-Delete-기반-크루원-재가입-처리/"
notion_id: "3767788a-fc66-8030-8e55-cf4ae4a7b3ce"
notion_lang: "ko"
---
## 오늘 한 일

- `CrewMember` soft delete 정책 검토

- 탈퇴 후 재가입 처리 방식 정리

- `crew_id`, `user_id` 유니크 제약 검토

- 삭제된 row 복구 방식 정리

- `@SQLRestriction("deleted_at IS NULL")` 사용 시 주의점 정리

- 크루 삭제 시 연관 데이터 처리 방향 고민

    <hr>

## Soft Delete를 사용하는 이유

우리 프로젝트는 `deleted_at`을 사용하는 soft delete 기반으로 설계하고 있다.

즉, 데이터를 실제로 DB에서 삭제하는 것이 아니라, 삭제된 시간을 기록해서 일반 조회에서 제외한다.

```java
private LocalDateTime deletedAt;
```

크루와 크루원, 결제 내역, 랭킹 데이터는 서로 연결되어 있기 때문에 만약 하드 딜리트로 데이터를 실제 삭제한다면, 관련된 데이터들을 함께 삭제해야 하는지 고민해야 한다.

예를 들어 크루를 삭제할 때 다음과 같은 문제가 생긴다.

- 해당 크루의 `CrewMember`도 삭제할 것인가

- 해당 크루의 `Expense`는 어떻게 처리할 것인가

- 이미 생성된 `RankingResult`는 유지할 것인가

- FK cascade 정책은 어떻게 가져갈 것인가

이런 부분을 모두 명확히 정하지 않은 상태에서는 하드 딜리트보다 soft delete가 더 안전하다고 판단했다.

## 중복 가입 방지를 위한 유니크 제약

크루원 관계는 `crew_id`와 `user_id` 조합으로 구분된다.

한 사용자가 같은 크루에 중복 가입하면 안 되므로, `CrewMember`에는 다음 유니크 제약을 고려해야 했다.

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

이 제약을 걸면 같은 크루에 같은 사용자의 row가 여러 개 생기는 것을 막을 수 있다.

## 크루 탈퇴 후 재가입 문제

유니크 제약을 걸면 한 가지 문제가 생긴다.

사용자가 크루에서 탈퇴하면 `deleted_at`만 채워지고 row는 DB에 남아 있다.

이 상태에서 같은 사용자가 같은 크루에 다시 가입하려고 하면, 기존 row가 남아 있기 때문에 새 row를 생성할 수 없다.

따라서 탈퇴 후 재가입은 새 row를 만드는 방식보다, 기존 soft delete row를 복구하는 방식이 더 적절하다.

```plaintext
처음 가입 = CrewMember 신규 생성
탈퇴 = deleted_at 기록
재가입 = 기존 deleted row 복구
```

## 삭제된 멤버 조회 시 주의점

현재 `@SQLRestriction("deleted_at IS NULL")`을 사용하면 일반 JPA 조회에서는 삭제된 row가 자동으로 제외된다.

이것은 일반 조회에서는 편리하지만, 재가입 처리에서는 주의해야 한다.

재가입을 처리하려면 삭제된 row를 찾아야 하는데, 일반 조회로는 deleted row가 보이지 않는다.

그래서 삭제된 멤버를 찾는 별도 쿼리가 필요했다.

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

그리고 삭제된 row가 있다면 `deleted_at`을 다시 null로 바꾸고, `joined_at`과 `role`을 갱신한다.

## 재가입 처리 흐름

재가입 로직은 다음과 같이 정리할 수 있다.

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

이렇게 하면 탈퇴 이력이 있는 사용자는 기존 row를 복구하고, 탈퇴 이력이 없는 사용자는 새로 생성할 수 있다.

## 크루 삭제와 연관 데이터

크루 자체를 soft delete하면, CrewMember row는 그대로 남아 있을 수 있다.

이 경우 삭제된 크루에 접근하려고 하면 `CrewAuthorizationService.validateCrewExists()`에서 삭제된 크루를 찾지 못하기 때문에 접근은 막을 수 있다.

하지만 데이터 정합성까지 더 엄격하게 챙기려면, 크루 삭제 시 해당 크루의 `CrewMember`도 함께 soft delete하는 정책을 고려해야 한다.

또한 해당 크루의 결제 내역과 랭킹 데이터는 보존할지, 조회에서만 제외할지도 추후 정책이 필요하다.

다음주 TIL에서 해결방법을 다룰 예정이다.

<hr>

## 배운 점

Soft delete는 단순히 삭제 시간을 저장하는 기능이 아니라, 이후 재가입이나 데이터 조회 정책과 깊게 연결된다는 것을 알게 되었다.

특히 유니크 제약과 soft delete를 함께 사용할 때는 탈퇴 후 재가입을 어떻게 처리할지 반드시 정해야 한다.

또한 `@SQLRestriction`처럼 삭제된 데이터를 자동으로 제외하는 설정은 편리하지만, 삭제된 데이터를 복구해야 하는 경우에는 별도의 조회 방법이 필요하다는 것도 배웠다.

## 회고

처음에는 탈퇴하면 새로 가입할 때 row를 다시 만들면 된다고 생각했다.

하지만 유니크 제약과 soft delete 정책을 함께 고려하니, 기존 row를 복구하는 방식이 더 일관성 있다는 것을 알게 되었다.

앞으로는 삭제 기능을 구현할 때 단순히 “삭제한다”가 아니라, 이후 복구나 재가입, 연관 데이터 처리까지 함께 고민해야겠다.
