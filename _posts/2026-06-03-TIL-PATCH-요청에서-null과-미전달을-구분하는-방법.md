---
title: "[TIL] PATCH 요청에서 null과 미전달을 구분하는 방법"
date: 2026-06-03 09:00:00 +0900
last_modified_at: 2026-06-05 15:45:00 +0900
categories: ["GDGoC KNU", "0 to Product"]
tags: ["project"]
description: "크루 정보 수정 API를 구현하면서, PATCH 요청에서는 ‘필드를 보내지 않은 것’과 ‘null로 수정하려는 것’을 구분해야 한다는 점을 배웠다."
description_source: "notion"
english_url: "/en/posts/TIL-PATCH-요청에서-null과-미전달을-구분하는-방법/"
notion_id: "3767788a-fc66-808d-8dee-c8b66e899d4d"
notion_lang: "ko"
---
## 오늘 한 일

- 크루 정보 수정 API 구현 방향 정리

- `description` 삭제 가능성 검토

- PATCH 요청의 3가지 상태 정리

- `JsonNullable` 사용 방식 정리

- 수정 요청 validation 기준 정리

- `maxMemberCount` 수정 검증 기준 정리

<hr>

## PATCH 요청에서 생긴 문제

크루 정보 수정 API를 구현하면서 `description` 필드 때문에 문제가 생겼다.

`description`은 필수값이 아니기 때문에 사용자가 설명을 비울 수 있어야 한다.

즉, 기존 설명이 있더라도 사용자가 의도적으로 설명을 삭제할 수 있어야 한다.

예를 들면 다음 요청은 설명을 삭제한다는 의미일 수 있다.

```json
{
  "description": null
}
```

하지만 일반적인 DTO에서 String description으로 받으면 문제가 생긴다.

```java
public record UpdateCrewRequest(
    String name,
    String description,
    Integer maxMemberCount,
    AiMode aiMode
) {
}
```

이 경우 다음 두 상황이 모두 자바 객체에서는 null로 보인다.

<div class="notion-indent" markdown="1">

1. `{}`

2. `{ "description": null }`

</div>

첫 번째는 description을 아예 수정하지 않겠다는 의미이고, 두 번째는 description을 null로 바꾸겠다는 의미이다.

하지만 둘 다 같은 `null`로 들어오기 때문에, 일반 `String` 타입만으로는 두 상황을 구분할 수 없다.

## PATCH 요청의 3가지 상태

PATCH 요청에서는 한 필드가 세 가지 상태를 가질 수 있다.

1. 필드를 아예 보내지 않음 → 수정하지 않음

2. 필드에 값을 보냄 → 해당 값으로 수정

3. 필드를 null로 보냄 → 값을 비움

특히 `description`처럼 nullable한 필드는 이 세 가지 상태를 구분해야 한다.

반면 `name`, `maxMemberCount`, `aiMode`는 필수 성격의 값이기 때문에 `null`로 수정되는 것을 허용하지 않는다.

따라서 모든 필드에 `JsonNullable`을 사용할 필요는 없고, 이번 구현에서는 `description`에만 `JsonNullable<String>`을 적용했다.

## JsonNullable 사용

수정 요청 DTO는 다음과 같이 구성했다.

```java
public record UpdateCrewRequest(
    String name,
    JsonNullable<String> description,
    Integer maxMemberCount,
    AiMode aiMode
) {
}
```

여기서 `description`만 `JsonNullable<String>`을 사용한 이유는 `description`만 명시적인 `null` 요청을 허용해야 하기 때문이다.

즉, 프론트에서 `description`을 아예 보내지 않으면 기존 설명을 유지하고, `description: null`을 보내면 설명을 삭제한다.

## 요청별 처리 방식

1. description을 수정하지 않는 경우

    ```json
    {
      "name": "새 크루 이름"
    }
    ```

    이 요청은 `name`만 수정하고, `description`은 기존 값을 유지한다.

2. description을 새 값으로 수정하는 경우

    ```json
    {
      "description": "새로운 크루 설명입니다."
    }
    ```

    이 요청은 description을 새로운 값으로 수정한다.

3. description을 삭제하는 경우

    ```json
    {
      "description": null
    }
    ```

    이 요청은 description을 null로 변경한다. 즉, 크루 설명을 삭제한다.

## 필드별 수정 정책

| **필드** | **요청에 없을 때** | **null로 보낼 때** | **값이 있을 때** |
| --- | --- | --- | --- |
| name | 기존 값 유지 | 에러 | 이름 수정 |
| description | 기존 값 유지 | 설명 삭제 | 설명 수정 |
| maxMemberCount | 기존 값 유지 | 에러 | 최대 인원 수정 |
| aiMode | 기존 값 유지 | 에러 | AI 모드 수정 |

이 정책은 프론트와 공유되어야 하기 때문에, API 명세에도 해당 내용을 추가하였다.

프론트에서 설명을 수정하지 않았다면 `description` 필드를 아예 보내지 않아야 하고, 설명을 삭제하려면 명시적으로 `"description": null`을 보내야 한다.

## 수정 로직 예시

`description`은 `JsonNullable`을 사용하기 때문에, 요청에 포함되었는지 먼저 확인한 뒤 값을 반영한다.

```java
String description = crew.getDescription();

if (request.description().isPresent()) {
    description = request.description().orElse(null);
}

crew.update(
    request.name(),
    description,
    request.maxMemberCount(),
    request.aiMode()
);
```

```java
if (name != null) {
    this.name = name;
}

this.description = description;

if (maxMemberCount != null) {
    this.maxMemberCount = maxMemberCount;
}

if (aiMode != null) {
    this.aiMode = aiMode;
}
```

이렇게 하면 `description` 필드가 요청에 포함된 경우에만 수정하고, 그 값이 `null`이면 설명을 삭제할 수 있다.

반면 `name`, `maxMemberCount`, `aiMode`는 일반 타입으로 받고, 값이 들어온 경우에만 수정한다.

<hr>

## 배운 점

PATCH 요청에서는 단순히 null 체크만으로 수정 로직을 처리하면 안 되는 경우가 있다는 것을 배웠다.

특히 nullable한 필드의 경우, “요청에 포함되지 않은 것”과 “명시적으로 null이 전달된 것”은 전혀 다른 의미를 가진다.

이번 크루 수정 API에서는 모든 필드에 `JsonNullable`을 사용하는 대신, null 삭제가 필요한 `description`에만 적용했다.

이를 통해 필요한 필드에서만 미전달과 null 전달을 구분하고, 나머지 필드는 일반적인 수정 요청처럼 처리할 수 있었다.

## 회고

처음에는 PATCH 요청에서 null이면 수정하지 않는 방식으로 처리하면 된다고 생각했다.

하지만 `description`처럼 사용자가 직접 값을 비울 수 있어야 하는 필드가 생기면서, 단순한 null 체크만으로는 충분하지 않다는 것을 알게 되었다.

앞으로 수정 API를 설계할 때는 각 필드별로 null이 어떤 의미를 가지는지 먼저 정리해야겠다.

특히 프론트와 백엔드가 같은 의미로 요청을 해석할 수 있도록, API 명세에 “필드 미전달”과 “null 전달”의 차이를 명확히 적어두는 것이 중요하다고 느꼈다.
