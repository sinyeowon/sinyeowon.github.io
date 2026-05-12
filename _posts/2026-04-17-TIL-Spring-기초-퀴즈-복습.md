---
title: "[TIL] Spring 기초 퀴즈 복습"
date: 2026-04-17 09:00:00 +0900
last_modified_at: 2026-05-12 12:15:00 +0900
categories: ["Spring 단기 심화", "특강"]
tags: ["Spring"]
description: "DispatcherServlet: 모든 요청을 먼저 받아 적절한 Controller를 찾아 연결해줌 @RestController: @Controller + @ResponseBody"
description_source: "excerpt"
english_url: "/en/posts/TIL-Spring-기초-퀴즈-복습/"
notion_id: "35e7788a-fc66-80d0-8238-e7b6d699f7e3"
notion_lang: "ko"
---
- DispatcherServlet: 모든 요청을 먼저 받아 적절한 Controller를 찾아 연결해줌

- @RestController: @Controller + @ResponseBody

- @RequestBody
    - 요청 본문의 JSON을 자바 객체로 변환함 → 이 변환은 내부적으로 Jackson 라이브러리가 수행함

- DI(Dependency Injection): Spring이 빈(Bean) 사이의 의존 관계를 파악하여 필요한 객체를 자동으로 주입해 주는 방식

- singleton: Spring에서 기본 빈 스코프
    - 하나의 객체를 만들어 컨테이너 전체에 공유

    - 인스턴스 변수에 사용자별 상태를 저장하면 동시 접근 시 다른 사용자의 데이터가 섞임

- @Controller와 @RestController의 가장 핵심적인 차이
    - @Controller는 메서드 반환값을 뷰 이름으로 해석하여 HTML을 렌더링하고, @RestController는 @Controller+@ResponseBody 이므로, 반환값을 JSON 등으로 변환하여 응답 본문에 직접 씀

- @Transaction이 붙은 메서드를 같은 클래스 내부에서 this.method()로 호출하면
    - @Transactional은 프록시 패턴으로 동작하므로, 같은 클래스 내부에서 this로 호출하면 프록시를 거치지 않기 때문에 트랜잭션이 적용되지 않음

    - 프록시 패턴: 진짜 객체 대신 대리인 객체를 하나 끼워 넣는 구조
        - 직접 처리하지 않고, 중간에 누가 대신 처리해줌

        - 실제 호출은 프록시가 먼저 호출되고 → 트랜잭션 시작 → 진짜 메서드 실행  → 성공 (commit) / 실패 (rollback)
⇒ 즉, 트랜잭션 처리를 가로채서 실행하는 구조

- @Transactional(readOnly = true)
    - readOnly=true는 트랜잭션을 생성하되 읽기 전용 힌트를 줌

    - 트랜잭션 자체가 생성되지 않는 것은 아님

- @Repository의 특별 기능
    - 빈 등록 외에, DB 기술별로 다른 예외를 Spring의 DataAccessException 계층으로 자동 변환하는 추가 기능을 가지고 있음

- @RestController에 이미 @ResponseBody가 포함되어 있으므로 두개를 동시에 사용하면 중복이지만, 동작에는 문제가 없음 → 읽는 사람을 혼란스럽게 할 수 있음

- DispatcherServlet: Spring MVC에서 모든 HTTP 요청을 가장 먼저 받아서 적절한 Controller에 연결해 주는 컴포넌트

- IoC (Inversion of Control): 개발자가 직접 객체를 생성하지 않고 Spring 컨테이너가 대신 관리하는 구조
    - 원래는 개발자가 객체를 생성하고 관리하는데, Spring 컨테이너가 대신 관리하기 때문에 제어권이 뒤집혔다고 표현함

- URL 경로에서 값을 꺼낼 때는 @PathVariable을 사용하고, 쿼리 문자열에서 값을 꺼낼 때는 @RequestParam을 사용하고, 요청 본문 JSON을 객체로 받을 때는 @RequestBody를 사용한다.

- Controller
    - 얇게 유지해야 하는 이유
        - 비즈니스 로직을 분리해서 유지보수성과 재사용성을 높이기 위함

        - Controller는 요청/응답 처리 역할만 담당함

    - Controller가 해야 할 일
        1. 요청 받기

        2. 요청 데이터 변환
            - DTO로 변환

        3. Service 호출
            - 비즈니스 로직은 Service에게 위임

        4. 응답 반환
            - 결과를 JSON/HTTP 응답으로 반환

            - 상태 코드 포함 (200, 404 등)

- POST /api/members 요청이 서버에 도착했을 때, DispatcherServlet부터 DB 저장 후 응답까지의 전체 흐름
    1. 요청이 DispatcherServlet에 도착한다.

    2. HandlerMapping을 통해 해당 URL(/api/members)과 매칭되는 Controller의 메서드를 찾는다.

    3. HandlerAdapter를 통해 해당 Controller 메서드를 실행한다.

    4. 요청 데이터(@RequestBody)를 DTO 객체로 변환한다.

    5. Controller는 Service를 호출한다.

    6. Service는 비즈니스 로직을 수행하고 Repository를 호출한다.

    7. Repository가 DB에 데이터를 저장한다.

    8. 결과가 Service → Controller로 반환된다.

    9. Controller는 응답 데이터를 생성한다.

    10. DispatcherServlet이 HTTP 응답(JSON 등)으로 클라이언트에 반환한다.

- 어노테이션이 ‘스스로 아무 일도 하지 않는다’는 말의 의미
    - 어노테이션은 단지 코드에 붙이는 메타데이터일 뿐, 그 자체가 직접 로직을 실행하지 않는다는 뜻

    - 실제로는 Spring 같은 프레임워크가 어노테이션을 읽고 해석해서 필요한 동작을 수행함

    - 어노테이션은 지시 표시이고, 실제로 일하는 주체는 Spring 컨테이너, DispatcherServlet, HandlerMapping, 프록시 같은 Spring 내부 구성 요소들임
