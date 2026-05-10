---
layout: "post"
title: "[TIL] Spring Basics - DTO and Layered Architecture"
title_source: "manual"
date: 2026-04-10 15:58:53 +0900
last_modified_at: 2026-04-11 12:15:33 +0900
categories: ["Spring 단기 심화", "Spring 강의"]
tags: ['Spring', 'TIL', '내일배움캠프']
description: "This TIL summarizes the role of DTO and the reason for exchanging data through DTO instead of Entity."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-스프링입문-260410/"
original_url: "/posts/TIL-스프링입문-260410/"
source_post: "_posts/2026-04-10-TIL-스프링입문-260410.md"
generated_lang: "en"
---
### What to do today



### What I studied

#### DTO
> **DTO (Data Transfer Object)**
: Object created for data transmission and movement
- Used when processing data sent from the client as an object
- Used to move between server tiers
- It is also used to convert the Java class responsible for communication with the DB to a DTO and then return it, rather than returning it as is to the client.

- You can create a DTO class by naming the object used when processing request data RequestDto and the object used when responding is named ResponseDto.
	- Not an absolute rule

#### Database
> **Database**
: set of data
- DBMS (Database Management System): Software that manages and operates database
- RDBMS (Relational DBMS): Relational database
ex) Oracle, MySQL
	- Composed of the minimum unit called a table, each table consists of a column and a row.
    
#### SQL
> Understanding JOINs
- Functions provided by the database to combine divided tables into one
- Combine two tables by selecting a standard column through the keyword `ON`
- When joining, at least one column must be shared, so if a foreign key is set in the table, the condition can be met by joining through that column.
**However**, setting up a foreign key to do a JOIN may not always be a good choice.
	- Setting a foreign key causes additional operations to check data integrity.
    - Because integrity must be maintained, development may be inconvenient depending on the situation.
=> Apply to the most efficient constraint table depending on the situation

####JDBC
- How the server actually communicates with the database
> **JDBC (Java Database Connectivity)**
: API provided by Java to access DB
	
 - If you provide a JDBC driver for the DB that needs to be connected to JDBC, you can change the DB without having to change the DB connection logic.
 	- JDBC Driver: A library provided by DB companies after implementing the JDBC interface to suit their DB.
    -> ex) If you are connecting to a DB using a MySQL driver and need to change to a PostgreSQL server, you can easily change the DB by simply replacing the driver.
> **JdbcTemplate**
: Handles repetitive and overlapping tasks such as connecting connections, preparing and executing statements, and terminating connections.
	<- With the advent of JDBC, DB replacement became possible easily, but it remained inconvenient to have to write various work logic directly to connect to the DB.

=> Although JdbcTemplate has solved the inconvenience that arises when using JDBC directly, it is still complicated and difficult to use, so a technology called **ORM** has emerged for Java developers to communicate by mapping DB and objects.

#### Layer Architecture
- Problem with the previous notepad project: All APIs are handled by a single Controller class.
	- Right now, the code does not seem complicated because the number of APIs is small and the functions are simple, but problems may arise if functions are added and complexity increases in the future.
> Spring’s **3 Layer Architecture**
	- Taking advantage of the fact that most of the processing processes on the server are similar, the processing processes are largely divided into three parts: **Controller, Service, and Repository**.

> **Controller**
: Receiving the client's request, the service responds to the client with the completed processing results.
- Logic processing for requests is dedicated to the Service
	- If there is request data, it is delivered to the service as well.

> **Service**
: The real power that handles user requirements ('business logic')
- Request to Repository when DB storage and inquiry is required

> **Repository**
: DB management (connection, disconnection, resource management)
- DB CRUD task processing

#### IoC (Inversion of Control), DI (Dependency Injection)
- Design principles and design patterns such as object-oriented SOLID principles and GoF design patterns
ex) How to make delicious kimchi fried rice - Design principles / Kimchi fried rice recipe - Design pattern
- Spring's IoC and DI for good code
	
    - Good code: simple logic, clear expressions with redundancies removed, easy to understand and modify even for first-time code readers, minimal dependency, no major structural changes even when new features are added, ...
    - IoC and DI are one of Spring's core technologies for writing good code.
    - **IoC design principles are implemented using DI patterns.**

> **Dependencies**
- Understanding dependencies is necessary to understand DI

   - strong bond
   ``` java
  public class Consumer {

      void eat() {
          Chicken chicken = new Chicken();
          chicken.eat();
      }

      public static void main(String[] args) {
          Consumer consumer = new Consumer();
          consumer.eat();
      }
  }

  class Chicken {
      public void eat() {
          System.out.println("치킨을 먹는다.");
      }
  }
	```
Consumer and Chicken are strongly connected
	- If a consumer wants to eat pizza instead of chicken, a lot of code changes are inevitable.
    
	```
    public class Consumer {

        void eat(Food food) {
            food.eat();
        }

        public static void main(String[] args) {
            Consumer consumer = new Consumer();
            consumer.eat(new Chicken());
            consumer.eat(new Pizza());
        }
    }

    interface Food {
        void eat();
    }

    class Chicken implements Food{
        @Override
        public void eat() {
            System.out.println("치킨을 먹는다.");
        }
    }

    class Pizza implements Food{
        @Override
        public void eat() {
            System.out.println("피자를 먹는다.");
        }
    }
	```
    Solved using Java Interface
    	- If you implement it using the principle of Interface polymorphism, you can easily respond to any food request by customers.
    
> **Injection**
: Passing the required object to the corresponding object through various methods

- Direct injection into the field
``` java
public class Consumer {

    Food food;

    void eat() {
        this.food.eat();
    }

    public static void main(String[] args) {
        Consumer consumer = new Consumer();
        consumer.food = new Chicken();
        consumer.eat();

        consumer.food = new Pizza();
        consumer.eat();
    }
}

interface Food {
    void eat();
}

class Chicken implements Food{
    @Override
    public void eat() {
        System.out.println("치킨을 먹는다.");
    }
}

class Pizza implements Food{
    @Override
    public void eat() {
        System.out.println("피자를 먹는다.");
    }
}
```
	Food can be included in Consumer and the objects needed for Food can be injected and used.
    
- Injection through methods
``` java
public class Consumer {

    Food food;

    void eat() {
        this.food.eat();
    }

    public void setFood(Food food) {
        this.food = food;
    }

    public static void main(String[] args) {
        Consumer consumer = new Consumer();
        consumer.setFood(new Chicken());
        consumer.eat();

        consumer.setFood(new Pizza());
        consumer.eat();
    }
}

interface Food {
    void eat();
}

class Chicken implements Food{
    @Override
    public void eat() {
        System.out.println("치킨을 먹는다.");
    }
}

class Pizza implements Food{
    @Override
    public void eat() {
        System.out.println("피자를 먹는다.");
    }
}
```
	You can use the set method to inject the necessary object.

- Injection through constructor
``` java
public class Consumer {

    Food food;

    public Consumer(Food food) {
        this.food = food;
    }

    void eat() {
        this.food.eat();
    }

    public static void main(String[] args) {
        Consumer consumer = new Consumer(new Chicken());
        consumer.eat();

        consumer = new Consumer(new Pizza());
        consumer.eat();
    }
}

interface Food {
    void eat();
}

class Chicken implements Food{
    @Override
    public void eat() {
        System.out.println("치킨을 먹는다.");
    }
}

class Pizza implements Food{
    @Override
    public void eat() {
        System.out.println("피자를 먹는다.");
    }
}
```
	You can use the constructor to inject the necessary object.
    
> **Reversal of Control**
- Previously, consumers made and ate food themselves, so additional cooking preparation (code change) was inevitable to create new food.
	-> At this time, the flow of control was Consumer -> Food.
- To solve this problem, by changing the way the created food is delivered to the consumer, the consumer can eat any food without additional cooking preparation (code change).
	-> As a result, the flow of control is reversed from Food -> Consumer.
	(Because even in the real world, the customer does not make the food, but the prepared food is delivered to the customer)

#### Strongly coupled Notepad project
- Notepad project with strong coupling
	1. Controller creates and uses a Service object
  ``` java
      public class Controller1 {
          private final Service1 service1;

          public Controller1() {
              this.service1 = new Service1();
          }
      }
  ```
.
	2. Service creates and uses a Repository object
	3. Repository object declaration

- Problems with **strong coupling**:	

  - Each of the 5 Controllers creates and uses Service1
  - Due to change in Repository1 constructor => code change of all Controllers and all Services is required.

- MemoService does not use itself, but in order to use MemoRepository, JdbcTemplate is inserted into the constructor of MemoRepository (the same applies to MemoController)

- Strong coupling solution
   1. Object creation for each object only once
   2. Reuse created objects everywhere
   3. Use constructor injection to inject that object into the object you need
   
 .
  - Repository1 class declaration and object creation -> repository1
  ``` java
  public class Repository1 { ... }

  // 객체 생성
  Repository1 repository1 = new Repository1();
  ```
  - Service1 class declaration and object creation (using repository1) -> service1
  ``` java
  Class Service1 {
      private final Repository1 repitory1;

      // repository1 객체 사용
      public Service1(Repository1 repository1) {
          this.repository1 = new Repository1();
          this.repository1 = repository1;
      }
  }

  // 객체 생성
  Service1 service1 = new Service1(repository1);
  ```
  - Declare Controller1 (use service1)
  ``` java
  Class Controller1 {
      private final Service1 service1;

      // service1 객체 사용
      public Controller1(Service1 service1) {
          this.service1 = new Service1();
          this.service1 = service1;
      }
  }
  ```
=> Improvement results:
      - Changing the constructor of Repository1 and Service1 does not affect other places.
      => **Loose coupling**
- Inversion of Control (IoC)
  - Notepad projects that are strongly coupled are inefficient.
  (Control flow: Controller -> Service -> Repository)
  - However, it is converted into efficient code by reversing the flow of control from Repository -> Service -> Controller through DI (dependency injection).



### Issues & Errors



### What to do tomorrow
