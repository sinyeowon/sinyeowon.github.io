---
title: '[TIL] CRUD Code Shadowing 1회차'
date: 2026-04-15 16:11:38 +0900
last_modified_at: 2026-05-03 05:34:06 +0900
categories: ['Spring 단기 심화']
tags: ['Java', 'Spring', 'TIL', '과제', '내일배움캠프']
description: 'JPA Entity, Lombok, Repository를 사용해 도메인 모델을 구성하는 과정을 정리한 글입니다.'
---
## Entity

`@Entity` 어노테이션
- 이 클래스는 DB 테이블이랑 매핑되는 클래스 라는 것을 알려줌
- JPA 의존성을 추가해줘야함 -> JPA를 통해 이 클래스를 테이블로 인식함
`implementation 'org.springframework.boot:spring-boot-starter-data-jpa'` (build.gradle)
- JPA가 이 객체를 보고 INSERT / UPDATE / SELECT 다 해줌

`@Getter` 어노테이션
- 모든 필드에 대한 getter 메서드 자동 생성
- Lombok 라이브러리를 통해 사용 가능

`@Table(name = "products")`
- 테이블 이름을 직접 지정
- default로 클래스 이름 따라가지만, 위 어노테이션을 통해 DB 테이블 이름을 강제로 지정할 수 있음

`@NoArgsConstructor(access = AccessLevel.PROTECTED)`
- 기본 생성자를 만들어주는데, 접근 제한을 둠
  - JPA는 객체 만들 때 기본 생성자 필요한데, 아무나 new Product() 못하게 막고 싶기 때문에 protected 사용함
  - JPA는 사용 가능하고, 외부에서는 마음대로 생성 못함 -> JPA 전용 생성자 느낌
- Lombok 라이브러리를 통해 사용 가능

### 기본 생성자가 왜 필요한가
- JPA가 객체를 '리플렉션'으로 만들기 때문에 무조건 필요함
- JPA 동작방식
  ``` java
  Product p = Product.class.newInstance(); // 기본 생성자 호출
  p.setName(...);
  p.setPrice(...);
  ```
  - DB에서 데이터 꺼낼 때 위 코드 같은 느낌
  - **JPA**는 new Product(name, price) 이렇게 생성자를 쓰는 게 아니라,
  - **빈 객체를 먼저 만들고 -> 값을 나중에 넣음**
  -> 그렇기 때문에, **기본 생성자 필수**, public or protected만 가능
  - **기본 생성자는 빈 객체를 만들 때 호출되는 통로**
  - 기본 생성자로 빈 객체 생성 -> 필드에 값 채움
  - 프레임워크 입장에서는 클래스 구조를 다 알 수 없으니까 기본 생성자로 만들고 반사(reflection) 같은 걸 써서 채우는 방식

`@Id`: PK(Primary Key) 지정, 테이블의 대표 값

`@GeneratedValue`: ID 자동 생성
  - IDENTITY 전략(`strategy = GenerationType.IDENTITY`)
    - DB가 자동으로 증가시킴 (auto increment)
    - insert 할 때 id 안 넣어도 됨
    - DB가 알아서 넣어줌

### 생성자
``` java
public Product(String name, Integer price) {
    this.name = name;
    this.price = price;
}
```
- 우리가 직접 쓰는 생성자 생성
- 기본 생성자는 JPA용, 위 생성자는 비즈니스용 ex) `new Product("콜라", 2000);`: 의미 있는 생성

### update 메서드
``` java
public void update(String name, Integer price) {
    this.name = name;
    this.price = price;
}
```
- 왜 setter 안 사용하고 위 코드처럼 사용하는지
  - JPA에서는 setter를 남발하면 위험함
    - setter 문제: 중간 상태 깨질 수 있고, 로직 없이 값만 바뀜 (필드 하나씩 수정하기 때문)
- update 메서드 장점: 한 번에 변경하며, 나중에 검증 로직을 추가할 수 있음
    
## DTO
- DTO는 클라이언트 -> 서버로 들어오는 데이터를 받는 용도

**1. RequestDto**

 `@Getter`
   - getter 자동 생성 -> controller / service에서 값을 꺼내야 하기 때문에 사용

`@NoArgsConstructor`
   - 기본 생성자 자동 생성 -> Spring이 JSON에서 객체로 변환할 때 필요
   - 스프링도 JPA처럼 '빈 객체 먼저 만들고 값 넣는 방식' 사용
   
`@NotBlank`
   - String 전용
   - null도 안되고, "" 빈 문자열도 안되고, 공백 " "도 안될 때
   
`@NotNull`
   - null만 금지
   - 0은 허용됨
   
`@Min`
   - 최소값 제한 ex) `@Min(0)`: 가격은 0 이상이어야 한다는 뜻
   
### jakarta.validation.constraints
- 유효성 검사 어노테이션 패키지
- `@NotBlank`, `@NotNull`, `@Min` 등을 사용하기 위해 import 해야함
- `implementation 'org.springframework.boot:spring-boot-starter-validation'` build.gradle에 추가

### DTO(Data Transfer Object)와 Entity의 차이
- DTO: 데이터를 옮기기 위한 객체
  - 요청 데이터 받기, 응답 데이터 보내기, 계층 간 데이터 전달
  - 상품을 저장하는 진짜 객체라기보다, 요청으로 들어온 값 묶음
- Entity: DB 테이블과 직접 매핑되는 객체
  - JPA가 DB의 테이블과 연결해서 관리
  
-> DTO는 바깥세상용, Entity는 내부 DB 관리용

**2. ResponseDto**

 `@Getter`
   - getter 자동 생성 -> 응답 데이터 꺼낼 때 필요
   
### 필드에 final 붙는 이유
- 한 번 값 넣으면 절대 못 바꿈
-> 응답 데이터는 수정 못 하게 잠그기 위함

### 생성자
``` java
public ProductResponse(Product product) {
    this.id = product.getId();
    this.name = product.getName();
    this.price = product.getPrice();
}
```
- **Entity -> DTO 변환**
- 동작 흐름
  - DB에서 가져온 엔티티의 내부(Entity의 Product product)에서 `product.getId()`, `product.getName()`, `product.getPrice()` 꺼내서 DTO에 넣음
- Entity를 그대로 반환하면 안되기 때문
  - Entity를 그대로 반환하면,
    - DB 구조 그대로 노출됨
    - 필요 없는 필드도 다 나감
    - 보안 위험 있음
    - 구조 바꾸기 어려움
  - DTO로 변환하면
    - 필요한 값만 골라서 보냄
    - API 구조 자유롭게 설계 가능
    - Entity 보호됨

### requestDto와 responseDto의 차이
- RequestDto
  - 클라이언트 -> 서버
  - 입력용
  - validation 있음 ex) `@NotNull`
  - 아직 DB랑 관계 없음
- ResponseDto
  - 서버 -> 클라이언트
  - 출력용
  - 가공된 데이터
  - Entity 기반
