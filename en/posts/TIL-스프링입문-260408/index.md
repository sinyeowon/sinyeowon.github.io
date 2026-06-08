---
layout: "post"
title: "[TIL] Spring Basics - Controllers and HTTP Mapping"
title_source: "manual"
date: 2026-04-08 23:38:16 +0900
last_modified_at: 2026-04-09 23:53:21 +0900
categories: ["Spring 단기 심화", "Spring 강의"]
tags: ['Spring', 'TIL', '내일배움캠프']
description: "@Controller Enables the class to perform the role of Controller Spring MVC creates a Front Controller pattern for efficient API processing."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-스프링입문-260408/"
original_url: "/posts/TIL-스프링입문-260408/"
source_post: "_posts/2026-04-08-TIL-스프링입문-260408.md"
generated_lang: "en"
---
### What to do today


### What I studied
#### `@Controller`
- Enables the class to perform the role of Controller
- Spring MVC creates a Front Controller pattern for efficient API processing.
- There is no need to create a file for each API, and APIs with similar characteristics are managed with one controller.

> @GET, @POST, @PUT, @DELETE
Annotations mapped to each HTTP Method
``` java
@GetMapping("/api/get")
@ResponseBody
public String get() {
    return "GET Method 요청";
}
```

> @RequestMapping
Shortens duplicate URLs
``` java
@Controller
@RequestMapping("/api")
public class HelloController {
    @GetMapping("/hello")
    @ResponseBody
    public String hello() {
        return "Hello World!";
    }
    @GetMapping("/get")
    @ResponseBody
    public String get() {
        return "GET Method 요청";
    }
    @PostMapping("/post")
    @ResponseBody
    public String post() {
        return "POST Method 요청";
    }
    @PutMapping("/put")
    @ResponseBody
    public String put() {
        return "PUT Method 요청";
    }
    @DeleteMapping("/delete")
    @ResponseBody
    public String delete() {
        return "DELETE Method 요청";
    }
}
```

#### Static and dynamic pages
- static pages
	`/resources/static/파일이름.html`
    - When an html file is requested directly from the SpringBoot server, the html file is found in the static folder and returned.
    - It can also be returned through the Controller, but there is no need to return an already completed static HTML file through the Controller.
    	``` java
		@GetMapping("/static-hello")
		public String hello() {
    				return "hello.html";
		}
		```
-Redirect
	- If you want to process HTML files in the static folder through the Controller while applying the template engine (thymeleaf), you can return the redirect request as a string and the request will be re-executed to return the files in the static folder.
    ``` java
		@GetMapping("/html/redirect")
		public String htmlStatic() {
    				return "redirect:/hello.html";
		}
	
    ```
- Dynamic pages
`/resources/templates/파일이름.html`
  - The simplest method is to directly call the html file in the static folder.
  - If you want to prevent direct access from an external browser or want to control it through a controller in a specific situation,
  - This can be processed by adding the corresponding static html file to the **templates folder** and returning the** "file name" string**, which is the name of the html file (**`.html` can be omitted!**)
  
  - Dynamic page processing process
  	1. Process client request from Controller to Model
    2. Passing View and Model to Template engine (Thymeleaf)
    	- View: Dynamic HTML file
        - Model: Information to apply to View
    3. Template engine
    	- Apply Model to View -> Create dynamic web page
    4. Delivers View (dynamic web page, HTML) to Client (browser)


#### How to return data to Client
- Front-end and back-end develop separately -> Loosely coupled method adopted
- Rather than having the server directly return a view (html/css), the server prefers to return only specific information that matches the request.
- We plan to proceed by manipulating and reflecting HTML in the browser through an API that requests JSON data.
> How to return JSON data
- In SpringBoot with the template engine (Thyemleaf), when a string is returned from the Controller, the `.html` file for the string is found and returned in the templates folder.
-> **So, if you want to return JSON data rather than an HTML file to the browser, you must add the `@ResponseBody` annotation to the method**
	- In `@Controller`, the return value is interpreted as "HTML file name" by default.
    - If there is a `@ResponseBody`, Spring interprets it as not looking for a view, but just sending the data as a response.
    
  	``` java
		@ResponseBody
		@GetMapping("/json")
		public Star test() {
    		return new Star("Robbie", 95);
		}
	```
- When the return value is String
	Since Java does not support the JSON type, it must be converted to a String type in JSON format before use.
- When the return value is a Java class other than String
	"Java object -> Convert to JSON"
    **Spring automatically converts Java objects to JSON**
    
> **@RestController**
@Controller + @ResponseBody
- Using @RestController, you can add the @ResponseBody annotation to all methods of the class.

#### What is Jackson?
>Jackson Library
: Library that processes `JSON` data structure
- Object can be converted to String of type `JSON`.
- JSON type String can be converted to Object

- Because Spring provides an API related to `Jackson`, you can automatically process `JSON` data without writing source code yourself.
- When you need to process `JSON` data directly, you can use **`ObjectMapper` from the Jackson library**
-Object to JSON
	- To convert an Object to a `JSON` type String, the get method of the Object is required.
``` java
@Test
@DisplayName("Object To JSON : get Method 필요")
void test1() throws JsonProcessingException {
    Star star = new Star("Robbie", 95);

    ObjectMapper objectMapper = new ObjectMapper(); // Jackson 라이브러리의 ObjectMapper
    String json = objectMapper.writeValueAsString(star);
    // objectMapper의 writeValueAsString 메서드를 사용하여 변환할 수 있음
    // 파라미터에 JSON으로 변환시킬 Object의 객체를 주면 됨

    System.out.println("json = " + json);
}
```
	
-JSON to Object
	- In order to convert a `JSON` type String to an Object, the Object requires a default constructor and a get or set method.
``` java
@Test
@DisplayName("JSON To Object : 기본 생성자 & (get OR set) Method 필요")
void test2() throws JsonProcessingException {
    String json = "{\"name\":\"Robbie\",\"age\":95}"; // JSON 타입의 String

    ObjectMapper objectMapper = new ObjectMapper(); // Jackson 라이브러리의 ObjectMapper

    Star star = objectMapper.readValue(json, Star.class);
    // objectMapper의 readValue 메서드를 사용해 변환
    // 첫 번째 파라미터는 JSON 타입의 String, 두 번째 파라미터에는 변환할 Object의 class 타입을 줌
    System.out.println("star.getName() = " + star.getName());
}
```

### Issues & Errors


### What to do tomorrow
