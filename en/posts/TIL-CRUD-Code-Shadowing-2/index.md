---
layout: "post"
title: "[TIL] CRUD Code Shadowing 2nd session"
date: 2026-04-20 01:52:37 +0900
last_modified_at: 2026-04-22 01:21:51 +0900
categories: ['Spring 단기 심화']
tags: ['Java', 'Spring', 'TIL', '과제', '내일배움캠프']
description: "This article maps the many-to-one relationship between orders and products with JPA @ManyToOne and summarizes lazy loading."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-CRUD-Code-Shadowing-2/"
original_url: "/posts/TIL-CRUD-Code-Shadowing-2/"
source_post: "_posts/2026-04-20-TIL-CRUD-Code-Shadowing-2.md"
generated_lang: "en"
---
## Entity

`@ManyToOne` annotation
: Relationship setting - Multiple Orders refer to one Product
  - Order: Product = N: 1
  - It's confusing, so it's written in the Order class, so let's interpret it as Many Order to One Product.

-`fetch = FetchType.LAZY`
: lazy loading
  - Product is not imported immediately when checking order
  - DB inquiry when actually order.getProduct()
  - Meaning, ‘Let’s just take orders and take out products only when needed.’
-`optional = false`
: Do not allow null
  - Product must be present
  - This means that orders without products are not accepted.

`@JoinColumn(name = "product_id", nullable = false)` annotation
: FK settings
  - Actual column created in DB
  - Create product_id column in orders table
-`nullable = false`
: No nulls in DB

### constructor
``` java
public Order(Product product) {
    this.product = product;
}
```
- Forced to enter product when creating order
ex) `new Order();` -> No: Cannot be used because the default constructor is protected.
ex) `new Order(product);` -> Available!
- Prevents the creation of orders without products.

### How do I know if I'm referencing a Prodcut?
`private Product product;`
- Since the field type defined under the annotation is Product,
- JPA judges by looking at @ManyToOne + field type
-> Annotation tells you the type of relationship, and type tells you who you are in a relationship with.
- Same goes for @JoinColumn
  - Informs which FK column to create in the current table.

### Why the N+1 problem occurs if LAZY is not used
- @ManyToOne's default fetch strategy is EAGER
-> In other words, if you do not use LAZY, you will usually want to retrieve the product when searching the order.
ex) 
	```List<Order> orders = orderRepository.findAll();```
	When there are 10 orders, each order has a product, so from JPA's perspective, you can think, 'I can't just bring the order, I have to fill the product as well.'
  1. Check order list
  	`select * from orders;`: Get 10 orders with this = This is query number 1
  2. Search for products linked to each order
  ``` sql
      select * from product where id = 1;
      select * from product where id = 2;
      select * from product where id = 3;
      ...
  ```
 -> Additional inquiries are made according to the number of orders = This is N number of queries.
 	=> N+1: 1 initial list query + N number of related entity queries

> LAZY
: Postponing inquiry until the product is needed
- LAZY itself does not automatically resolve N+1, but instead prevents unnecessary immediate queries.
- When necessary, it allows direct optimization with things like fetch join.

> EAGER
: We want to retrieve not only the order but also the connected products.
- It is not unconditionally retrieved through one join (immediate loading != one SQL JOIN)
-> It guarantees that it should be loaded immediately, but does not guarantee which SQL it will be imported into.
  - In some cases, you can import it all at once by joining.
  - In some cases, search by orders first
  - You can then search for each product separately.
  
## Controller

`@RestController` annotation
: @Controller + @ResponseBody combined
- This means that all methods in this class return results as JSON.

`@RequestMapping` annotation
: Set default URL
- Prefixed to all APIs of this controller

`@RequiredArgsConstructor` annotation
: Lombok
- Automatically creates a constructor for fields marked final + Fields marked @NonNull
- Constructor that takes only required values (@NoArgsConstructor: default constructor that takes no values)

> Difference between @RequiredArgsConstructor and @NoArgsConstructor
- @RequiredArgsConstructor: Constructor that receives only required values.
  ``` java
  @RequiredArgsConstructor
  public class OrderService {
      private final ProductRepository productRepository;
      private final OrderRepository orderRepository;
  }
  ```
  - If you use @RequiredArgsConstructor
  ``` java
  public OrderService(ProductRepository productRepository,
                      OrderRepository orderRepository) {
      this.productRepository = productRepository;
      this.orderRepository = orderRepository;
  }
  ```
  - The above code is automatically generated
- @NoArgsConstructor: Default constructor that takes no value.
  ``` java
  @NoArgsConstructor
  public class Order {
      private Long id;
      private String name;
  }
  ```
  - If you use @NoArgsConsturctor
  ``` java
  public Order() {
  }
  ```
  - The above code is automatically generated
  
`@PostMapping` annotation
: HTTP POST request processing

``` java
public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody ProductRequest request)
```
- `@RequestBody` annotation
: Convert request body (JSON) to object
- `@Valid` annotation
ex) If there is something like @NotBlank in the DTO, an error will automatically occur if there is no value.
- Return type `ResponseEntity<ProductResponse>`
: Control the entire HTTP response
  - Status code + body can be returned together
  - `ResponseEntity`: Class provided by Spring Framework
    - Object containing the entire HTTP response (status code + header + body)
    - Generic syntax ResponseEntity<T> -> where T = response body type

- Core logic `ProductResponse response = productService.createProduct(request);`
  - flow
    1. Requested
    2. Converted to DTO
    3. Hand over to service
    4. Receive results- Return value `return ResponseEntity.created(URI.create("/api/products/" + response.getId())).body(response);`
  - `ResponseEntity.created(...)`: means responding with HTTP 201 Created status code.
    - The Location header is also set.
      - `URI.create("/api/products/" + response.getId())` -> For example, if the id is 10, `Location: /api/products/10' -> You can check this resource here! meaning
  - `.body(response)`: Part where actual response data is entered ex) Status code (201), header (Location), body (response (JSON))
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
  -> When executed, the HTTP response is constructed like this:
  
 
 - Return type `ResponseEntity<void>`
    - Void: no response body
 -`ResponseEntity.noContent().build()`
  : HTTP 204 No Content
    ```
    HTTP/1.1 204 No Content
    ```
  	-> No body (really empty)
  
## Respository
- Interface responsible for DB access (Repository)
- Tool to save/search/delete product from DB
### Why does it work even though there is no implementation code?
- Automatically implemented by Spring Data JPA
- Just define an interface, and Spring creates an implementation at runtime.
`JpaRepository<엔티티(Product), 타입(Long)>`
  - Product = Which table to deal with
  - Long = PK type (id type)
  -> ex) save(product); findById(id); findAll(); deleteById(id); existsById(id); All methods such as these can now be used (no need to write them directly in SQL)
  -> Actual use ex) `productRepository.save(product);`, `productRepository.findById(1L);`
- Reason for defining it as an interface: Because Spring does the implementation for you.
- Additional functions can also be created ex) `List<Product> findByName(String name);` -> If you just name the method in the same format, there is no need to implement it because a query is automatically created based on the method name.
