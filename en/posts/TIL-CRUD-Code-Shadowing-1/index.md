---
layout: "post"
title: "[TIL] CRUD Code Shadowing Round 1"
date: 2026-04-15 16:11:38 +0900
last_modified_at: 2026-05-03 05:34:06 +0900
categories: ["Spring 단기 심화", "과제"]
tags: ['Java', 'Spring', 'TIL', '과제', '내일배움캠프']
description: "Explored the fundamentals of CRUD in Spring Boot and JPA, focusing on Entity and DTO roles, annotation usage, and the flow of data mapping and transfer."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-CRUD-Code-Shadowing-1/"
original_url: "/posts/TIL-CRUD-Code-Shadowing-1/"
source_post: "_posts/2026-04-15-TIL-CRUD-Code-Shadowing-1.md"
generated_lang: "en"
---
## Entity

`@Entity` annotation
- Indicates that this class is a class that maps to a DB table.
- JPA dependency must be added -> This class is recognized as a table through JPA
`implementation 'org.springframework.boot:spring-boot-starter-data-jpa'` (build.gradle)
- JPA sees this object and performs INSERT / UPDATE / SELECT

`@Getter` annotation
- Automatically generate getter methods for all fields
- Available through Lombok library

`@Table(name = "products")`
- Specify table name directly
- By default, the class name is followed, but the DB table name can be forcefully specified through the annotation above.

`@NoArgsConstructor(access = AccessLevel.PROTECTED)`
- Creates a default constructor, but restricts access.
  - JPA requires a default constructor when creating an object, but I use protected because I want to prevent anyone from using new Product().
  - JPA can be used, but cannot be freely created externally -> It feels like a JPA-only constructor.
- Available through Lombok library

### Why do you need a default constructor?
- It is absolutely necessary because JPA creates objects through ‘reflection’.
- How JPA works
  ``` java
  Product p = Product.class.newInstance(); // 기본 생성자 호출
  p.setName(...);
  p.setPrice(...);
  ```
  - Feels like the above code when taking data out of DB
  - **JPA** does not use a constructor like new Product(name, price),
  - **Create an empty object first -> put the value later**
  -> Therefore, **default constructor required**, only public or protected
  - **The default constructor is the path that is called when creating an empty object**
  - Create an empty object with the default constructor -> Fill the fields with values
  - Since the framework does not know the entire class structure, it creates a default constructor and fills it in using reflection.

`@Id`: PK (Primary Key) designation, representative value of the table

`@GeneratedValue`: Automatically generate ID
  - IDENTITY STRATEGY (`strategy = GenerationType.IDENTITY`)
    - DB automatically increases (auto increment)
    - You do not need to enter the ID when inserting.
    - DB automatically adds it.

### constructor
``` java
public Product(String name, Integer price) {
    this.name = name;
    this.price = price;
}
```
- Create our own constructor
- The default constructor is for JPA, the above constructor is for business ex) `new Product("콜라", 2000);`: Meaningful creation

### update method
``` java
public void update(String name, Integer price) {
    this.name = name;
    this.price = price;
}
```
- Why not use a setter and use it like the code above?
  - It is dangerous to overuse setters in JPA.
    - Setter problem: Intermediate state can be broken, and only the value is changed without logic (because fields are modified one by one)
- Advantages of update method: Change at once, verification logic can be added later
    
## DTO
- DTO is used to receive data coming from client to server.

**1. RequestDto**

 `@Getter`
   - Automatic creation of getter -> Used because the value must be taken out from controller / service

`@NoArgsConstructor`
   - Automatic creation of default constructor -> Required when Spring converts from JSON to object
   - Like JPA, Spring also uses the method of ‘creating an empty object first and then inserting values’.
   
`@NotBlank`
   - String only
   - When it cannot be null, "" is not an empty string, or is not a space " "
   
`@NotNull`
   - Only nulls are prohibited
   - 0 is allowed
   
`@Min`
   - Minimum value limit ex) `@Min(0)`: means the price must be greater than 0
   
### jakarta.validation.constraints
- Validation annotation package
- Must be imported to use `@NotBlank`, `@NotNull`, `@Min`, etc.
- Add `implementation 'org.springframework.boot:spring-boot-starter-validation'` to build.gradle

### Difference between DTO (Data Transfer Object) and Entity
- DTO: Object for moving data
  - Receiving request data, sending response data, passing data between layers
  - A bundle of values received as a request, rather than a true object that stores the product.
- Entity: Object directly mapped to DB table
  - JPA connects and manages DB tables
  
-> DTO is for the outside world, Entity is for internal DB management.

**2. ResponseDto**

 `@Getter`
   - Automatic creation of getter -> Required when taking out response data
   
Why is ### field finalized?
- Once you enter the value, it can never be changed.
-> To lock the response data so that it cannot be modified.

### constructor
``` java
public ProductResponse(Product product) {
    this.id = product.getId();
    this.name = product.getName();
    this.price = product.getPrice();
}
```
- **Entity -> DTO conversion**
- Action flow
  - Remove `product.getId()`, `product.getName()`, and `product.getPrice()` from the inside of the entity retrieved from the DB (Product product of the entity) and place them in the DTO.
- Because the Entity should not be returned as is.
  - If you return the Entity as is,
    - DB structure exposed as is
    - All unnecessary fields are removed.
    - There is a security risk
    - Difficult to change structure
  - Convert to DTO
    -Select and send only the necessary values
    - API structure can be freely designed
    - Entity protected

### Difference between requestDto and responseDto
-RequestDto
  - Client -> Server
  - For input
  - With validation ex) `@NotNull`
  - No relation to DB yet
-ResponseDto
  - Server -> Client
  - For output
  - Processed data
  - Entity-based
