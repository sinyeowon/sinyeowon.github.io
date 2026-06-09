---
title: '[TIL] CRUD Code Shadowing 2회차'
date: 2026-04-20 01:52:37 +0900
last_modified_at: 2026-04-22 01:21:51 +0900
categories: ["Spring 단기 심화", "과제"]
tags: ['Java', 'Spring', 'TIL', '과제', '내일배움캠프']
description: "JPA @ManyToOne 다대일 연관관계 설정, 지연 로딩(LAZY) 성능 최적화, N+1 문제 발생 원인"
english_url: "/en/posts/TIL-CRUD-Code-Shadowing-2/"
---
## Entity

`@ManyToOne` 어노테이션
: 관계 설정 - 여러 개의 Order가 하나의 Product를 참조한다
  - Order : Product = N : 1
  - 헷갈리니까 Order 클래스에서 작성하였으니까, Many Order to One Product로 해석해보자

- `fetch = FetchType.LAZY`
: 지연 로딩
  - Order 조회할 때 Product를 바로 가져오지 않음
  - 실제로 order.getProduct() 할 때 DB 조회
  - '일단 주문만 가져오고, 상품은 필요할 때만 꺼내보자' 라는 의미
- `optional = false`
: null 허용 안함
  - product는 반드시 있어야 함
  - 즉, 상품 없는 주문은 허용되지 않는다는 뜻

`@JoinColumn(name = "product_id", nullable = false)` 어노테이션
: FK 설정
  - DB에서 실제 컬럼 생성됨
  - orders 테이블에 product_id 컬럼 생성
- `nullable = false`
: DB에서도 null 금지

### 생성자
``` java
public Order(Product product) {
    this.product = product;
}
```
- Order 만들 때 반드시 Product를 넣게 강제함
ex) `new Order();` -> 안됨: 기본 생성자 protected라 못씀
ex) `new Order(product);` -> 가능!
- 상품 없는 주문은 만들지도 못하게 막음

### Prodcut를 참조하는지 어떻게 아는가
`private Product product;`
- 어노테이션 밑에 정의된 필드 타입이 Product이므로,
- JPA는 @ManyToOne + 필드 타입을 보고 판단함
-> 어노테이션은 관계 종류를 알려주고, 타입은 누구랑 관계인지 알려줌
- @JoinColumn도 마찬가지
  - 현재 테이블에 어떤 FK 컬럼을 만들지 알려줌

### LAZY를 안 쓰면 왜 N+1 문제가 생기는지
- @ManyToOne의 기본 fetch 전략은 EAGER
-> 즉, LAZY를 안 쓰면 보통 Order를 조회할 때 Product도 같이 가져오려고 함
ex) 
	```List<Order> orders = orderRepository.findAll();```
	주문이 10개 있을 때, 각 주문은 product를 가지고 있기 때문에, JPA 입장에서는 '주문만 가져오면 안 되고 상품도 채워놔야지'라고 생각할 수 있음
  1. 주문 목록 조회
  	`select * from orders;`: 이걸로 주문 10개를 가져옴 = 이게 1번 쿼리
  2. 각 주문마다 연결된 상품 조회
  ``` sql
      select * from product where id = 1;
      select * from product where id = 2;
      select * from product where id = 3;
      ...
  ```
 -> 주문 수만큼 추가 조회가 나감 = 이게 N번 쿼리
 	=> N+1: 처음 목록 조회 1번 + 연관 엔티티 조회 N번

> LAZY
: Product가 필요할 때까지 조회 미뤄줌
- LAZY 자체가 N+1을 자동 해결하는 건 아니지만, 대신 불필요한 즉시 조회를 막아주고
- 필요할 때는 fetch join 같은 걸로 직접 최적화할 수 있게 해줌

> EAGER
: order만 가져오는 게 아니라 연결된 product도 함께 조회하려고 함
- 무조건 조인 한 번으로 가져오는 게 아님 (즉시 로딩 != SQL JOIN 한 번)
-> 즉시 로딩해야 한다는 건 보장하지만, 어떤 SQL로 가져올지를 보장하지 않음
  - 어떤 경우엔 join으로 한 번에 가져올 수도 있고
  - 어떤 경우엔 먼저 orders로 조회하고
  - 그 다음 product를 하나씩 따로 조회할 수도 있음
  
## Controller

`@RestController` 어노테이션
: @Controller + @ResponseBody 합친 것
- 이 클래스의 모든 메서드는 결과를 JSON으로 반환한다는 뜻

`@RequestMapping` 어노테이션
: 기본 URL 설정
- 이 컨트롤러의 모든 API 앞에 붙음

`@RequiredArgsConstructor` 어노테이션
: Lombok
- final 붙은 필드 자동으로 생성자 만들어줌 + @NonNull 붙은 필드
- 필수 값만 받는 생성자 (@NoArgsConstructor: 아무 값도 안 받는 기본 생성자)

> @RequiredArgsConstructor와 @NoArgsConstructor의 차이점
- @RequiredArgsConstructor: 필수 값만 받는 생성자
  ``` java
  @RequiredArgsConstructor
  public class OrderService {
      private final ProductRepository productRepository;
      private final OrderRepository orderRepository;
  }
  ```
  - @RequiredArgsConstructor를 사용하면
  ``` java
  public OrderService(ProductRepository productRepository,
                      OrderRepository orderRepository) {
      this.productRepository = productRepository;
      this.orderRepository = orderRepository;
  }
  ```
  - 위 코드가 자동 생성됨
- @NoArgsConstructor: 아무 값도 안 받는 기본 생성자
  ``` java
  @NoArgsConstructor
  public class Order {
      private Long id;
      private String name;
  }
  ```
  - @NoArgsConsturctor를 사용하면
  ``` java
  public Order() {
  }
  ```
  - 위 코드가 자동 생성됨
  
`@PostMapping` 어노테이션
: HTTP POST 요청 처리

``` java
public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody ProductRequest request)
```
- `@RequestBody` 어노테이션
: 요청 Body(JSON)를 객체로 변환
- `@Valid` 어노테이션
ex) DTO에 @NotBlank 같은 게 있으면, 값이 없으면 자동으로 에러 발생
- 반환 타입 `ResponseEntity<ProductResponse>`
: HTTP 응답 전체를 컨트롤
  - 상태코드 + 바디 같이 반환 가능
  - `ResponseEntity`: Spring Framework에서 제공하는 클래스
    - HTTP 응답 전체(상태코드 + 헤더 + 바디)를 담는 객체
    - 제네릭 문법 ResponseEntity<T> -> 여기서 T = 응답 바디 타입

- 핵심 로직 `ProductResponse response = productService.createProduct(request);`
  - 흐름
    1. 요청 받음
    2. DTO로 변환됨
    3. 서비스에 넘김
    4. 결과를 받아옴

- 반환 값 `return ResponseEntity.created(URI.create("/api/products/" + response.getId())).body(response);`
  - `ResponseEntity.created(...)`: HTTP 201 Created 상태코드로 응답한다는 의미
    - Location 헤더도 같이 설정함
      - `URI.create("/api/products/" + response.getId())` -> 예를 들어 id가 10이면, `Location: /api/products/10' -> 이 리소스 여기서 확인 가능해요! 라는 의미
  - `.body(response)`: 실제 응답 데이터 넣는 부분 ex) 상태코드(201), 헤더(Location), 바디(response(JSON))
  ``` http
  HTTP/1.1 201 Created
  Location: /api/products/10
  Content-Type: application/json

  {
    "id": 10,
    "name": "콜라",
    "price": 2000
  }
  ```
  -> 실행하면 이런 식으로 HTTP 응답이 구성됨
  
 
 - 반환 타입 `ResponseEntity<void>`
    - Void: 응답 body 없음
 - `ResponseEntity.noContent().build()`
  : HTTP 204 No Content
    ```
    HTTP/1.1 204 No Content
    ```
  	-> body 없음 (진짜 텅 비어있음)
  
## Respository
- DB 접근 담당하는 인터페이스 (Repository)
- Product를 DB에서 저장/조회/삭제하는 도구
### 구현 코드가 없는데 왜 동작하는지
- Spring Data JPA가 자동으로 구현해줌
- 인터페이스만 정의하면, 스프링이 런타임에 구현체를 만들어줌
`JpaRepository<엔티티(Product), 타입(Long)>`
  - Product = 어떤 테이블 다룰지
  - Long = PK 타입 (id 타입)
  -> ex) save(product); findById(id); findAll(); deleteById(id); existsById(id); 등의 메서드를 다 사용할 수 있게 됨 (직접 SQL로 안 짜도 됨)
  -> 실제 사용 ex) `productRepository.save(product);`, `productRepository.findById(1L);`
- 인터페이스로 정의하는 이유: 구현은 스프링이 대신 해주기 때문
- 추가 기능도 만들 수 있음 ex) `List<Product> findByName(String name);` -> 메서드 이름만 같은 형식으로 지으면, 메서드 이름을 보고 자동으로 쿼리가 생성되기 때문에 구현할 필요도 없음
