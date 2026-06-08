---
layout: "post"
title: "[TIL] Spring Basics - Quiz Review"
title_source: "manual"
date: 2026-04-17 09:00:00 +0900
last_modified_at: 2026-05-12 12:15:00 +0900
categories: ["Spring 단기 심화", "특강"]
tags: ["Spring"]
description: "DispatcherServlet: Receives all requests first, finds the appropriate Controller, and connects to it."
description_source: "manual"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-Spring-기초-퀴즈-복습/"
original_url: "/posts/TIL-Spring-기초-퀴즈-복습/"
notion_id: "35e7788a-fc66-80d0-8238-e7b6d699f7e3"
notion_lang: "en"
---
- DispatcherServlet: Receives all requests first, finds the appropriate Controller, and connects to it.

- @RestController: @Controller + @ResponseBody

- @RequestBody
    - Converts the JSON in the request body to a Java object → This conversion is performed internally by the Jackson library.

- DI (Dependency Injection): A method in which Spring identifies dependency relationships between beans and automatically injects necessary objects.

- singleton: default bean scope in Spring
    - Create one object and share it across containers

    - If you store each user’s state in an instance variable, other users’ data will be mixed during simultaneous access.

- The most core difference between @Controller and @RestController
    - @Controller interprets the method return value as a view name and renders HTML, and @RestController is @Controller+@ResponseBody, so the return value is converted to JSON, etc. and written directly in the response body.

- When a method with @Transaction is called with this.method() within the same class,
    - @Transactional operates as a proxy pattern, so if you call this with this inside the same class, the transaction will not be applied because it does not go through the proxy.

    - Proxy pattern: A structure that inserts a proxy object in place of a real object.
        - Instead of processing it yourself, someone else handles it for you.

        - In the actual call, the proxy is called first → transaction starts → real method execution → success (commit) / failure (rollback)
⇒ In other words, a structure that intercepts and executes transaction processing.

- @Transactional(readOnly = true)
    - readOnly=true creates a transaction but gives a read-only hint.

    - This does not mean that the transaction itself is not created.

- Special features of @Repository
    - In addition to bean registration, it has an additional function to automatically convert exceptions different for each DB technology to Spring's DataAccessException layer.- Since @RestController already includes @ResponseBody, using both at the same time is redundant, but there is no problem with operation → It may confuse readers.

- DispatcherServlet: A component that first receives all HTTP requests in Spring MVC and connects them to the appropriate Controller.

- IoC (Inversion of Control): A structure in which the developer does not create objects directly but is managed by the Spring container instead.
    - Originally, developers created and managed objects, but since the Spring container manages them instead, it is said that control has been reversed.

- Use @PathVariable when getting a value from a URL path, @RequestParam when getting a value from a query string, and use @RequestBody when receiving the request body JSON as an object.

- Controller
    - Reasons to keep it thin
        - To increase maintainability and reusability by separating business logic

        - Controller is only responsible for request/response processing

    - What the controller must do
        1. Get a request

        2. Request data conversion
            - Convert to DTO

        3. Service call
            - Business logic is delegated to Service

        4. Return response
            - Return results as JSON/HTTP response

            - Includes status codes (200, 404, etc.)

- When a POST /api/members request arrives at the server, the entire flow from DispatcherServlet to DB storage and response
    1. A request arrives at DispatcherServlet.

    2. Find the Controller method that matches the URL (/api/members) through HandlerMapping.

    3. Execute the corresponding Controller method through HandlerAdapter.

    4. Convert request data (@RequestBody) to DTO object.

    5. Controller calls Service.

    6. Service performs business logic and calls Repository.7. Repository stores data in DB.

    8. The result is returned to Service → Controller.

    9. Controller generates response data.

    10. DispatcherServlet returns an HTTP response (JSON, etc.) to the client.

- What it means to say that the annotation ‘does nothing on its own’
    - Annotations are just metadata attached to code, and they themselves do not directly execute logic.

    - In reality, a framework such as Spring reads and interprets the annotation and performs the necessary actions.

    - Annotations are directives, and the actual working entities are Spring internal components such as Spring container, DispatcherServlet, HandlerMapping, and proxy.
