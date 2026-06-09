---
title: "[TIL] 단순 CRUD가 아니라 구조를 고민하는 API 설계"
date: 2026-05-15 09:00:00 +0900
last_modified_at: 2026-05-15 19:29:00 +0900
categories: ["Spring 단기 심화", "숙련 프로젝트"]
tags: ["project"]
description: "데이터 생성 시점 및 책임 범위 고려 API 명세서 작성, MSA 도메인 서비스 분리 및 트랜잭션 범위 결정"
description_source: "notion"
english_url: "/en/posts/TIL-단순-CRUD가-아니라-구조를-고민하는-API-설계/"
notion_id: "3617788a-fc66-80dc-b5b8-ec836e895c06"
notion_lang: "ko"
---
## 오늘 한 일

- API 명세서 마무리

- 프로젝트 패키지 구조 작성

- ERD 도메인 분리

    <hr>

## API 명세서 마무리

API 명세서에서 비어있던 부분들을 채우는 작업을 진행했다.

- Search Parameters 작성

- Request Elements 작성

- 요청 예시(Request Example) 작성

특히 DeliveryRoute API를 작성하면서 생성 시점과 수정 시점의 데이터 차이를 고려해야 한다는 점이 인상 깊었다.

- 예를 들어 `estimated_distance, estimated_duration`은 배송 생성 시점에 알 수 있는 값이다.

- 반면 `real_distance, real_duration`은 실제 배송이 완료된 이후에만 알 수 있기 때문에 생성 POST 요청에는 포함하지 않는 것이 자연스럽다.

→ 따라서 실제 거리와 실제 송시간은 배송 상태 수정 PUT 요청에서 관리하는 방향으로 정리했다.

단순히 “테이블에 컬럼이 있으니까 요청값으로 받는다”가 아니라, “이 값이 언제 생성되는 데이터인가?”를 기준으로 API를 설계해야 한다는 점을 배웠다.

## ERD 도메인 분리와 서비스 분리

처음에는 ERD에서 빨간 박스로 묶인 영역이 그대로 하나의 서비스가 되는 줄 알았다.

하지만 실제로는 차이가 있었다.

- ERD 도메인 분리
→ 업무 관심사 기준의 논리적 분리

- 서비스 분리
→ 실제 서버 및 애플리케이션 단위 분리

→ 즉, ERD는 “업무 묶음”에 가까운 개념이고, 서비스 분리는 실제 배포 및 책임 범위를 기준으로 결정된다.

## 프로젝트 서비스 구조 결정

우리 팀은 최종적으로 다음과 같은 5개의 비즈니스 서비스로 구조를 정리했다.

```yaml
- user-service
- hub-service
- company-service
- order-delivery-service
- message-service

```

추가적으로 MSA 환경 구성을 위해 다음 서비스들도 함께 사용하기로 했다.

```yaml
- eureka-server
- gateway-service

```

특히 주문과 배송을 하나의 서비스로 묶은 이유가 가장 인상 깊었다.

- 발제 요구사항상 주문 생성 시 배송과 배송 경로가 함께 생성되어야 하는데, 이를 서로 다른 서비스로 분리하면 트랜잭션 관리가 복잡해질 수 있기 때문이다.

- 그래서 Order, Delivery, DeliveryRoute, DeliveryManager를 하나의 `order-delivery-service`에서 관리하기로 결정했다.

서비스를 무조건 많이 나누는 것이 중요한 것이 아니라, 실제 비즈니스 흐름과 트랜잭션 범위를 기준으로 경계를 나누는 것이 더 중요하다는 점을 느꼈다.

## FK를 사용하지 않는 이유

오늘 가장 헷갈렸던 부분 중 하나는 “왜 FK를 사용하지 않는가?”였다.

MSA 환경에서는 서비스 간 DB 의존성을 줄이고 서비스 독립성을 유지하기 위해 서로 다른 서비스의 테이블 간 FK를 사용하지 않고 UUID 기반 참조와 애플리케이션 로직 검증 방식을 사용한다.

예를 들어 주문 생성 시

```plaintext
1. company-service에 producer_id 존재 여부 확인

2. company-service에 receiver_id 존재 여부 확인

3. company-service에 product_id 존재 여부 확인

4. 검증 성공 시 order-delivery-service에서 주문 및 배송 생성

```

과 같은 흐름으로 동작하도록 설계했다.

실무에서도 FK를 무조건 사용하는 것이 아니라 서비스 독립성, 운영 구조, 배포 환경 등을 고려하여 선택적으로 사용한다는 점이 흥미로웠다.

## 프로젝트 패키지 구조 정리

각 서비스 내부는 `Layered + Package by Feature` 구조를 적용하기로 했다.

```plaintext
presentation
application
domain
infrastructure
```

구조를 기준으로 역할을 나누고,

- presentation → Controller, DTO

- application → Service, 비즈니스 로직

- domain → Entity, Repository, Enum

- infrastructure → 외부 API, QueryDSL, Client

형태로 책임을 분리하기로 정리했다.

처음에는 구조가 복잡하게 느껴졌지만, 서비스 책임과 코드 역할을 명확하게 나누기 위한 방식이라는 점을 조금씩 이해하게 된 것 같다.

<hr>

## 느낀 점

오늘은 단순히 API 명세서를 작성한 날이라기보다, “MSA 환경에서 왜 서비스를 나누고 왜 이런 구조를 사용하는지”를 많이 고민했던 날이었다.

특히 서비스 경계, 트랜잭션 범위, FK 사용 여부, Gateway와 Eureka 역할 같은 개념들이 조금씩 연결되기 시작했다.

아직 완전히 익숙하진 않지만, “왜 이런 구조를 사용하는가?”를 계속 고민하면서 설계해보는 과정 자체가 정말 중요한 경험이라는 생각이 들었다.
