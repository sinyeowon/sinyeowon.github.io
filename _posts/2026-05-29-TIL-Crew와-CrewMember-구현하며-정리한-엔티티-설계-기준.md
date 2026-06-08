---
title: "[TIL] Crew와 CrewMember 구현하며 정리한 엔티티 설계 기준"
date: 2026-05-29 09:00:00 +0900
last_modified_at: 2026-06-05 15:13:00 +0900
categories: ["GDGoC KNU", "0 to Product"]
tags: ["project"]
description: "우리 서비스에서는 사용자가 크루를 생성하면, 해당 크루에 참여할 수 있는 초대코드가 자동으로 발급된다."
description_source: "notion"
english_url: "/en/posts/TIL-Crew와-CrewMember-구현하며-정리한-엔티티-설계-기준/"
notion_id: "3767788a-fc66-800a-b8ad-d6c8039f7fe4"
notion_lang: "ko"
---
## 오늘 한 일

- Crew 엔티티 구현

- CrewMember 엔티티 구현

- 크루 생성 시 초대코드 자동 발급 구조 정리

- invite_code 유니크 제약 검토

- owner_id 컬럼명의 의미 정리

- maxMemberCount 검증 기준 정리

- @Builder 사용 여부와 정적 팩토리 메서드 사용 방향 정리

    <hr>

## 크루 생성 시 초대코드 자동 발급

우리 서비스에서는 사용자가 크루를 생성하면, 해당 크루에 참여할 수 있는 초대코드가 자동으로 발급된다.

처음에는 초대코드를 nullable로 둘 수도 있지 않을까 생각했지만, **현재 기획상 크루 생성 직후 초대코드가 항상 존재해야 한다.**

따라서 inviteCode와 inviteCodeExpiresAt은 `nullable = false`로 두는 것이 맞다고 판단했다.

```java
@Column(nullable = false, unique = true)
private String inviteCode;

@Column(nullable = false)
private LocalDateTime inviteCodeExpiresAt;
```

초대코드는 크루에 친구를 초대하는 핵심 수단이기 때문에, 생성 시점에 반드시 만들어져야 한다.

## invite_code 유니크 제약

초대코드는 크루를 식별해서 가입하는 데 사용되기 때문에, 서로 다른 크루가 같은 초대코드를 가지면 안 된다.

애플리케이션 코드에서 중복 여부를 검사할 수도 있지만, 동시에 여러 요청이 들어오는 상황에서는 중복이 발생할 가능성이 있다고 판단했다.

그래서 DB 레벨에서도 안전하게 유니크 제약을 거는 방식으로 구현하였다.

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

이렇게 하면 코드 생성 로직에서 중복 체크를 하더라도, 최종적으로 DB가 중복 저장을 막아준다.

## owner_id는 왜 user_id가 아닌가

Crew에서 크루장을 저장할 때 실제로 참조하는 대상은 User이기 떄문에, 처음에는 컬럼명을 user_id로 해야 하는지 헷갈렸다.

하지만 이 컬럼의 역할은 단순히 ‘사용자 ID’가 아니라 ‘이 크루의 소유자’를 의미한다.

컬럼명은 해당 관계가 도메인에서 어떤 의미를 가지는지 표현하면 되기 때문에 컬럼면은 owner_id가 더 적절하다.

## currentMemberCount는 저장하지 않기

크루에는 최대 인원 수를 의미하는 maxMemberCount가 필요하며, 이 값은 사용자가 크루 생성 시 직접 선택하는 설정값이기 때문에 DB에 저장해야 한다.

반면 현재 멤버 수인 currentMemberCount는 CrewMember 테이블에서 활성 멤버 수를 세면 계산할 수 있다.

```sql
SELECT COUNT(*)
FROM crew_member
WHERE crew_id = ?
AND deleted_at IS NULL;
```

따라서 currentMemberCount는 DB 컬럼으로 저장하지 않고, API 응답에서 계산해서 내려주는 값으로 처리하는 것이 더 안전하다고 판단했다.

만약 currentMemberCount를 컬럼으로 저장하면 가입, 탈퇴, 강퇴가 일어날 때마다 값을 직접 증가/감소시켜야 한다. 이 과정에서 동기화가 누락되면 실제 멤버 수와 저장된 값이 달라질 수 있다.

특히 우리 서비스는 크루 최대 인원이 5명으로 작기 떄문에, count 쿼리 비용도 크지 않다.

하지만 이로 인해서 N+1 문제가 발생할 수 있을 것 같은데, 이건 다음주 TIL에서 해결과정을 다룰 것 같다.

## @Builder 대신 정적 팩토리 메서드 사용

처음에는 엔티티 생성에 @Builder를 사용할 수도 있다고 생각했다.

@Builder를 사용하면 필드명을 지정하면서 객체를 만들 수 있어 가독성이 좋다고 생각했다.

하지만 CrewMember처럼 생성 규칙이 있는 엔티티에는 Builder를 열어두면 잘못된 상태의 객체가 만들어질 가능성이 있다.

예를 들어 크루 생성자는 반드시 OWNER 역할을 가져야 하고, 일반 가입자는 MEMBER 역할을 가져야 한다.

이런 규칙을 서비스 코드에서 매번 직접 넣는 것보다, 엔티티 내부의 정적 팩토리 메서드로 제한하는 것이 더 안전하다고 판단했다.

```java
public static CrewMember createOwner(UUID crewId, UUID userId) {
    return new CrewMember(crewId, userId, CrewRole.OWNER, LocalDateTime.now());
}

public static CrewMember createMember(UUID crewId, UUID userId) {
    return new CrewMember(crewId, userId, CrewRole.MEMBER, LocalDateTime.now());
}
```

이렇게 하면 크루장 생성과 일반 멤버 생성을 명확히 구분할 수 있다.

<hr>

## 배운 점

이번 구현을 하면서 엔티티 설계는 단순히 필드를 나열하는 것이 아니라, 도메인 규칙을 코드로 표현하는 작업이라는 것을 느꼈다.

owner_id처럼 컬럼명 하나에도 도메인 의미가 담겨야 하고, maxMemberCount와 currentMemberCount처럼 저장해야 하는 값과 계산 가능한 값을 구분하는 것도 중요했다.

또한 Builder는 편리하지만, 모든 엔티티에 무조건 사용하는 것이 정담은 아니라는 것을 알게 되었다. 객체 생성 규칙이 중요한 경우에는 정적 팩토리 메서드가 더 안전할 수 있다.

## 회고

처음에는 엔티티를 빨리 구현하는 것에 집중했지만, 구현을 하다 보니 ‘나중에 잘못된 상태가 생기지 않게 막는 것’이 더 중요하다는 생각이 들었다.

앞으로 엔티티를 설계할 때는 단순히 DB 컬럼을 옮기는 것이 아니라, 이 객체가 어떤 규칙으로 생성되고 변경되어야 하는지 함께 고민해야겠다.
