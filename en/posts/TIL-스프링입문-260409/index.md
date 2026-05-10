---
layout: "post"
title: "[TIL] Spring Basics - Request Data Handling"
title_source: "manual"
date: 2026-04-09 23:27:21 +0900
last_modified_at: 2026-04-11 12:20:16 +0900
categories: ["Spring 단기 심화", "Spring 강의"]
tags: ['Spring', 'TIL', '내일배움캠프']
description: "This is a TIL that summarizes how to receive request data using Path Variable and Request Param from Spring."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-스프링입문-260409/"
original_url: "/posts/TIL-스프링입문-260409/"
source_post: "_posts/2026-04-09-TIL-스프링입문-260409.md"
generated_lang: "en"
---
### What to do today


### What I studied
#### Path Variable and Request Param
- When sending an HTTP request from the client (browser) to the server, data can be sent together.

> **Path Variable method**
: You can add the data you want to send to the server to the URL path.
🌐 GET http://localhost:8080/hello/request/star/Robbie/age/95
``` java
// [Request sample]
// GET http://localhost:8080/hello/request/star/Robbie/age/95
@GetMapping("/star/{name}/age/{age}")
@ResponseBody
public String helloRequestPath(@PathVariable String name, @PathVariable int age)
{
    return String.format("Hello, @PathVariable.<br> name = %s, age = %d", name, age);
}
```

> **Request Param method**
: You can add the data you want to send to the server using `?` and `&` at the end of the URL path.
🌐 GET http://localhost:8080/hello/request/form/param?name=Robbie&age=95
``` java
// [Request sample]
// GET http://localhost:8080/hello/request/form/param?name=Robbie&age=95
@GetMapping("/form/param")
@ResponseBody
public String helloGetRequestParam(@RequestParam String name, @RequestParam int age) {
    return String.format("Hello, @RequestParam.<br> name = %s, age = %d", name, age);
}
```
**form tag POST**
: You can send an HTTP request using the POST method using the HTML form tag.
🌐 POST http://localhost:8080/hello/request/form/param
- At this time, the data is delivered to the server in the form of `name=Robbie&age=95` in the HTTP body.
``` html
<form method="POST" action="/hello/request/form/model">
  <div>
    이름: <input name="name" type="text">
  </div>
  <div>
    나이: <input name="age" type="text">
  </div>
  <button>전송</button>
</form>
```
``` java
// [Request sample]
// POST http://localhost:8080/hello/request/form/param
// Header
//  Content type: application/x-www-form-urlencoded
// Body
//  name=Robbie&age=95
@PostMapping("/form/param")
@ResponseBody
public String helloPostRequestParam(@RequestParam String name, @RequestParam int age) {
    return String.format("Hello, @RequestParam.<br> name = %s, age = %d", name, age);
}
```

- `@RequestParam` can be omitted
-`@RequestParam(required = false)`
	
    - If the required option is set to false, an error will not occur even if the corresponding value is not included in the values received from the client.
    - The variable that did not receive a value from the client is initialized to null.
    (If `required = false` is not set, an error occurs)

#### How to process HTTP data as objects
> **`@ModelAttribute`**
- form tag POST
🌐 POST http://localhost:8080/hello/request/form/model
``` java
// [Request sample]
// POST http://localhost:8080/hello/request/form/model
// Header
//  Content type: application/x-www-form-urlencoded
// Body
//  name=Robbie&age=95
@PostMapping("/form/model")
@ResponseBody
public String helloRequestBodyForm(@ModelAttribute Star star) {
    return String.format("Hello, @ModelAttribute.<br> (name = %s, age = %d) ", star.name, star.age);
}
```
	- You can send an HTTP request using the POST method using the HTML form tag.
	-> At this time, the data is delivered to the server in the form of `name=Robbie&age=95` in the HTTP body.
	- After using the `@ModelAttribute` annotation, body data is declared as an object to receive `Star star`.
- Query String method
🌐 GET http://localhost:8080/hello/request/form/param/model?name=Robbie&age=95
``` java
// [Request sample]
// GET http://localhost:8080/hello/request/form/param/model?name=Robbie&age=95
@GetMapping("/form/param/model")
@ResponseBody
public String helloRequestParam(@ModelAttribute Star star) {
    return String.format("Hello, @ModelAttribute.<br> (name = %s, age = %d) ", star.name, star.age);
}
```
	- If there are only two pieces of data like `?name=Robbie&age=95`, it is okay, but if there are multiple pieces of data, it may be difficult to receive them one by one with the `@RequestParam` annotation.
    -> At this time, you can receive data as a Java object by using `@ModelAttribute`.
    	- The `Star` object declared in the parameter is created and contains the value of `name & age` requested through the overloaded constructor or Setter method.

- `@ModelAttribute` can be omitted.
- **Both `@ModelAttribute` and `@RequestParam` can be omitted. How to distinguish them in Spring**
	- Spring considers the parameter as `@RequestParam` if it is SimpleType; otherwise, it determines that `@ModelAttribute` is omitted.
    
> **`@RequestBody`**
- When sending JSON data to the server in the HTTP Body, the body data can be delivered as a Java object.
- Body JSON data
🌐 POST http://localhost:8080/hello/request/form/json
``` java
// [Request sample]
// POST http://localhost:8080/hello/request/form/json
// Header
//  Content type: application/json
// Body
//  {"name":"Robbie","age":"95"}
@PostMapping("/form/json")
@ResponseBody
public String helloPostRequestJson(@RequestBody Star star) {
    return String.format("Hello, @RequestBody.<br> (name = %s, age = %d) ", star.name, star.age);
}
```
- When data is delivered to the server in the form of `{"name":"Robbie","age";"95"}` `JSON` in the HTTP Body, the data can be received in object form using the `@RequestBody` annotation.

- **Things to keep in mind when receiving data as an object**
	- A set or get method or overloaded constructor is required to insert data into the field of the object.

#### 



### Issues & Errors


### What to do tomorrow
