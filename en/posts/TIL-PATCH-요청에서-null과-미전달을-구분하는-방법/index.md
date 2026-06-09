---
layout: "post"
title: "[TIL] How to distinguish between null and undelivered in PATCH requests"
date: 2026-06-03 09:00:00 +0900
last_modified_at: 2026-06-09 14:50:00 +0900
categories: ["GDGoC KNU", "0 to Product"]
tags: ["project"]
description: "Distinguishing 'missing field' and 'explicit null' in PATCH requests, and selective field updates using JsonNullable"
description_source: "notion"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-PATCH-요청에서-null과-미전달을-구분하는-방법/"
original_url: "/posts/TIL-PATCH-요청에서-null과-미전달을-구분하는-방법/"
notion_id: "3767788a-fc66-808d-8dee-c8b66e899d4d"
notion_lang: "en"
---
## What I did today

- Summary of crew information modification API implementation direction

- Review the possibility of deleting `description`

- Summary of three states of PATCH request

- Summary of how `JsonNullable` is used

- Summary of modification request validation criteria

- Summary of `maxMemberCount` modification verification criteria

    <hr>

## Problem with PATCH request

While implementing the crew information modification API, a problem arose due to the `description` field.

Since `description` is not a required value, the user must be able to leave the description blank.

In other words, even if there is an existing description, the user must be able to intentionally delete the description.

For example, the following request could mean deleting a description:

```json
{
  "description": null
}
```

However, if you receive it as a String description in a general DTO, a problem arises.

```java
public record UpdateCrewRequest(
    String name,
    String description,
    Integer maxMemberCount,
    AiMode aiMode
) {
}
```

In this case, both of the following situations appear to be null in Java objects.

<div class="notion-indent" markdown="1">

1. `{}`

2. `{ "description": null }`

</div>

The first means that the description will not be modified at all, and the second means that the description will be changed to null.

However, since both come in as the same `null`, the two situations cannot be distinguished using only the general `String` type.

## 3 states of PATCH request

In a PATCH request, one field can have three states.

1. Do not send the field at all → Do not modify it

2. Send value to field → Modify with corresponding value

3. Send the field as null → empty the value

In particular, nullable fields such as `description` must distinguish between these three states.On the other hand, `name`, `maxMemberCount`, and `aiMode` are required values, so they are not allowed to be modified to `null`.

Therefore, there is no need to use `JsonNullable` in all fields, and in this implementation, `JsonNullable<String>` was applied only to `description`.

## Use JsonNullable

The modification request DTO was structured as follows.

```java
public record UpdateCrewRequest(
    String name,
    JsonNullable<String> description,
    Integer maxMemberCount,
    AiMode aiMode
) {
}
```

The reason why only `description` and `JsonNullable<String>` are used here is because only `description` must allow explicit `null` requests.

In other words, if the front desk does not send `description` at all, the existing description is maintained, and if `description: null` is sent, the description is deleted.

## Processing method per request

1. When the description is not modified

    ```json
    {
      "name": "새 크루 이름"
    }
    ```

    This request only modifies `name`, and `description` maintains its existing value.

2. When modifying the description with a new value

    ```json
    {
      "description": "새로운 크루 설명입니다."
    }
    ```

    This request modifies description with a new value.

3. When deleting description

    ```json
    {
      "description": null
    }
    ```

    This request changes the description to null. In other words, delete the crew description.

## Field-specific modification policy

| **Field** | **When not requested** | **When sending as null** | **When there is a value** |
| --- | --- | --- | --- |
| name | Keep existing values | error | Edit name |
| description | Keep existing values | Delete description | Edit description |
| maxMemberCount | Keep existing values | error | Modify maximum number of people |
| aiMode | Keep existing values | error | AI mode modifications |

Since this policy must be shared with the front desk, the corresponding content was also added to the API specification.

If you have not modified the description on the front page, you should not send the `description` field at all, and if you want to delete the description, you must explicitly send `"description": null`.

## Example of modification logicSince `description` uses `JsonNullable`, it first checks whether it is included in the request and then reflects the value.

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

This way, you can only modify the field `description` if it is included in the request, and delete the description if its value is `null`.

On the other hand, `name`, `maxMemberCount`, and `aiMode` are received as general types and are modified only when a value is received.

<hr>

## Lessons learned

In PATCH requests, we learned that there are cases where modification logic should not be handled simply by checking for null.

Especially in the case of nullable fields, “not included in the request” and “null explicitly passed” have completely different meanings.

In this crew modification API, instead of using `JsonNullable` for all fields, it was applied only to `description` that requires null deletion.

Through this, we were able to distinguish between non-delivery and null delivery only in the required fields, and process the remaining fields like normal modification requests.

## Retrospective

At first, I thought that if it was null in the PATCH request, I could handle it by not modifying it.

However, as fields such as `description` emerged that required the user to empty the value, it became clear that a simple null check was not enough.

When designing the editing API in the future, I will first need to organize what null means for each field.

In particular, I felt it was important to clearly state the difference between “field not passed” and “null passed” in the API specification so that the front and backend could interpret the request with the same meaning.
