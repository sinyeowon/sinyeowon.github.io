---
layout: "post"
title: "[TIL] Introduction to Spring TIL - 26/04/07"
date: 2026-04-07 13:40:30 +0900
last_modified_at: 2026-04-25 03:01:54 +0900
categories: ['Spring 단기 심화']
tags: ['Spring', 'TIL', '내일배움캠프']
description: "This is a TIL that summarizes the need for Spring test code, black box testing, and developer testing methods."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-스프링입문-260407/"
original_url: "/posts/TIL-스프링입문-260407/"
source_post: "_posts/2026-04-07-TIL-스프링입문-260407.md"
generated_lang: "en"
---
### What I did today
- Introduction to Spring

### What I learned today
#### Test code
> bug bug
Software produces unexpected results

**How to find bugs before deploying development code**
> 1. Black box testing
A method of inspecting the operation of the software in a black box-like state without knowing the internal structure or operating principles, that is, from the perspective of the user of the web service.
Advantage: Anyone can test
Disadvantage: As functions increase, the scope of testing increases, and test quality may vary depending on the tester.
> 2. Developer testing
Developers write test code to verify their own code.
Advantages: Fast and accurate testing, test automation, convenient when refactoring or adding features
Disadvantages: takes a long time to develop, incurs test code maintenance costs

> **JUnit**
Unit testing framework for the Java programming language
![Velog image](https://velog.velcdn.com/images/sinyeowon/post/75930f41-2279-4f74-875e-d108ee6607fe/image.png) already added to build.gradle -> Ready to use JUnit

- Create test file
![Velog image](https://velog.velcdn.com/images/sinyeowon/post/57b0b22e-d6c6-4f1f-b681-125f5f7660a7/image.png) I learned that Java always starts with the main() method and ends with the main() method.
Because JUnit has a test execution environment, you can write and run test code for each method or function without separately executing the main() method or running the server, as shown in the picture.

#### Lombok and application.properties
> **Lombok**
A library that helps save code by automatically generating methods/constructors that are almost essential for running a Java project.

**@Getter, @Setter**
<table>
  <tr>
    <td align="center">
      <img src="https://velog.velcdn.com/images/sinyeowon/post/741c30aa-501d-47d9-9388-a5d09a6064e8/image.png" width="100%" alt="Velog image" />
      <br />
      Memo Java class creation
    </td>
    <td align="center">
      <img src="https://velog.velcdn.com/images/sinyeowon/post/fc11a23f-b829-47b6-85b2-a74f019e2cdd/image.png" width="100%" alt="Velog image" />
      <br />
      <code>getUsername()</code> and <code>getContents()</code> methods that were not entered directly
      You can check that it is created automatically through the <code>@Getter</code> annotation.
      (also <code>@Setter</code>)
    </td>
  </tr>
</table>

**@AllArgsConstructor, @NoArgsConstructor**
Creates an overloaded constructor with the default constructor and all fields as parameters.
- If you create an overloaded constructor with `@AllArgsConstructor`,
- In Java, if even one constructor is defined, a default constructor is not automatically created.
-> Therefore, create a default constructor through `@NoArgsConstructor`.
**@RequiredArgsConstructor**
Creates an overloaded constructor with a field with a final modifier as a parameter.

> **application.properties**
File used to configure settings related to Spring
- src > main > resources > application.properties
- Setting values that are automatically set through SpringBoot can be easily modified.
- When connecting to a DB, you must provide DB information, and even in this case, you can easily transfer values using this file.

#### MySQL
**Terminal**
- MySQL connection
Move `cd /usr/local/mysql/bin` location
`./mysql -u root -p` MySQL connection -> Enter password

#### Spring MVC
> **MVC (Model-View-Controller)**
One of the software design patterns
- MVC pattern: The elements that make up the software are divided into Model, View, and Controller and their respective roles are separated.
  - By separating the elements that make up the software, it increases the reusability and maintainability of the code and facilitates collaboration between developers.
  -Model
    - Responsible for data and business logic
    - Perform tasks such as saving and loading data in conjunction with the database.
  -View
    - Responsible for user interface
    - Design and implement screens, buttons, forms, etc. that users see.
  -Controller
    - Coordinates and controls the interaction between Model and View
    - Receives user input and passes it to the Model, and updates the View based on the Model’s results.

> **Spring MVC (Spring Web MVC)**
A unique web framework built on the Servlet API
- Included in Spring Framework from the beginning
- DispatcherServlet centrally processes HTTP requests and is designed in the Front Controller pattern.
-> HTTP requests are processed efficiently by applying the MVC pattern in Spring.

> Servlet: A server-side program or specification that dynamically creates web pages using Java.

<table>
  <tr>
    <td align="center">
      <img src="https://velog.velcdn.com/images/sinyeowon/post/cfd424fe-ee98-4d96-97d4-0717a7b6d93f/image.png" width="100%" alt="Velog image" />
      Let’s find out how the server’s servlet operates when a user requests an (HTTP) API.
    </td>
  </tr>
</table>1. The user makes an HTTP Request, or API request, to the server through the client (browser).
2. The Servlet container that received the request creates HttpServletRequest and HttpServletResponse objects.
	- An object for easily using data contained in HTTP while meeting the promised HTTP specifications
3. Find out which Servlet the request is for through the set information.
4. After calling the service method in the relevant Servlet, call methods such as doGet or doPost according to the browser's request method.
5. Return the results of the called methods as is, or create a dynamic page and receive a response from the HttpServletResponse object and return it to the Client (browser).
6. When the response is completed, destroy the created HttpServletRequest and HttpServletResponse objects.

> Front Controller
- If you implement all API requests according to the Servlet operation method discussed earlier, you must implement countless Servlet classes.
-> Therefore, Spring efficiently processes API requests using the Front Controller pattern using DispatcherServlet.

<table>
  <tr>
    <td align="center">
      <img src="https://velog.velcdn.com/images/sinyeowon/post/a482201e-faca-4be2-aff7-8a8cba9761f5/image.png" width="100%" alt="Velog image" />
      Operation process of Front Controller pattern
    </td>
  </tr>
</table>

1. When an HTTP request comes in from a client (browser), the DispatcherServlet object analyzes the request.
2. The DispatcherServlet object finds the Controller through Handler mapping based on the analyzed data and delivers the request.
	Handler mapping: API path and Controller method are matched
    ex) `@GetMapping("/api/hello")`
> GET /api/hello → hello() function of HelloController
GET /user/login → login() function of UserController
GET /user/signup → signup() function in UserController
POST /user/signup → registerUser() function of UserController

-> HTTP requests can be easily processed by DispatcherServlet without directly implementing Servlet.

3. Controller -> DispatcherServlet
	- After completing the processing of the request, the controller delivers the results of the processing, that is, data ('Model') and 'View' information.
4. DispatcherServlet -> Client
	- Apply the Model to the View through ViewResolver and deliver the View to the Client as a response




### What to learn tomorrow
- Spring introductory course
- Algorithm problem 2
- Spring Advanced Course
