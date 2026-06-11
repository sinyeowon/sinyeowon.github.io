---
layout: "post"
title: "[TIL] Special Lecture on Logging (Observability)"
date: 2026-05-15 09:00:00 +0900
last_modified_at: 2026-06-12 00:49:00 +0900
categories: ["Spring 단기 심화", "특강"]
tags: ["Observability"]
description: "This article summarizes the contents of the special lecture on logging (Observability)."
description_source: "excerpt"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-로깅-(Observability)-특강/"
original_url: "/posts/TIL-로깅-(Observability)-특강/"
notion_id: "3617788a-fc66-80c0-95da-c45526f98815"
notion_lang: "en"
---
## What I Learned

### Monitoring and Observability

> **Monitoring**
> : Focus on understanding ‘Is there a problem now?’

> **Observability**
> : A measure of how well the internal state of the system can be understood through the system's external output (logs, metrics, traces)
> - Tools needed to figure out ‘Why did the problem occur?’

| **division** | **Monitoring** | **Observability** |
| --- | --- | --- |
| key questions | Is there a problem? | Why does it appear? |
| data of interest | indicators, notifications | Metrics, logs, tracking |
| example situation | Error rate exceeds 5% | Track where the PG timeout came from |
| purpose | detect | trace the cause |

### Scenario to pursue today

![사용자가 주문 버튼을 눌렀습니다.
주문 요청은 서버에 도착했습니다.
주문 데이터도 저장됐습니다.
그런데 결제 요청에서 timeout이 났습니다.
고객센터에는 "결제가 안 됐다"는 문의가 들어왔습니다.](/assets/img/notion/TIL-로깅-(Observability)-Special Lecture/01-9e9ed5d190.png)
_The user pressed the order button.
The order request arrived at the server.
Order data has also been saved.
However, a timeout occurred during the payment request.
We received an inquiry from our customer service center saying “Payment was not made.”_

**→ The key to failure analysis = See how far you succeeded and narrow down where you failed**

### Why do you need logs?

In operations, logs are our eyes, and after an accident occurs, we look at photos of the scene to find the cause.

- A good log should answer the following questions:

  | **question** | **Required Value** |
  | --- | --- |
  | What request did it come from? | requestId, traceId |
  | Which user is requesting this? | userId |
  | What kind of order is this? | orderId |
  | Which service? | serviceName |
  | What error is it? | errorCode |
  | How long did it take? | elapsedMs |
  | Where are the other logs for the same request? | traceId |

→ Rather than taking a lot of logs, **the key is to take pictures so that they can be found**

- Good log example

    ```markdown
    try {
        payment.process(order);
    } catch (PaymentException e) {
        log.error(
            "Payment failed. orderId={}, userId={}, errorCode={}, elapsedMs={}",
            order.getId(),
            order.getUserId(),
            e.getErrorCode(),
            elapsed,
            e  // ← Exception 객체를 마지막에 꼭 넘긴다
        );
    }
    ```

    It is better to leave a structured log (JSON format)

    ```markdown
    {
      "level": "ERROR",
      "service": "payment-service",
      "traceId": "trc-20260515-001",
      "orderId": "ORD-1004",
      "userId": "U-77",
      "message": "External payment API timeout",
      "elapsedMs": 3200,
      "errorCode": "PG_TIMEOUT"
    }
    ```

    - What you can know from the above

  | **Field** | **meaning** |
  | --- | --- |
  | level | Severity (ERROR so should be checked immediately) |
  | service | Occurs in payment-service |
  | traceId | Connect to other service logs with this ID |
  | orderId | Order ORD-1004 |
  | userId | U-77 users |
  | message | External Payment API Timeout |
  | elapsedMs | Takes 3.2 seconds and then stops |
  | errorCode | PG_TIMEOUT is a problem on the external payment company side. |

        → A good log tells you ‘who, where, why, and how long it took to fail’

- 5 conditions of a good log

  | **condition** | **Why you need it** | **Example fields** |
  | --- | --- | --- |
  | Is it identifiable? | Must be able to search and find | traceId, requestId |
  | Is there context? | You need to know what kind of work it is | userId, orderId |
  | Is the source clear? | Which service did you get it from? | serviceName |
  | Are the causes classified? | To use for statistics and alarms | errorCode |
  | Is time measured? | Required for performance analysis | elapsedMs |

- **Log level - when and what to use**

  | **Level** | **When to use** | **example** | **Is this an alarm?** |
  | --- | --- | --- | --- |
  | ERROR | User request failed | Payment failed, DB connection disconnected | Yes, required for operation |
  | WARN | Not a failure, but abnormal | Success after retry, close to threshold | There are some, but most of them are turned off except for critical parts in operation. |
  | INFO | important business event | Create order, payment successful | No, turn it off from operation |
  | DEBUG | For flow confirmation during development | Check internal value | Turn off operation |

    - **ERROR -** Only use for things that really need to be seen by people.

    - **WARN - Alarm when patterns accumulate. It can be classified as a phenomenon before an error appears.  What to check if it accumulates in a short period of time**

    - **INFO- Business events only.** Things like creating an order or completing a payment.

    - **DEBUG- Only in development environment.** Disk problem occurs.

### Narrow down faults with API request flow

The most important thing in failure analysis is order → tracking requests and flow![image](/assets/img/notion/TIL-로깅-(Observability)-Special Lecture/02-ebf0347c9b.png)

| **step** | **Make sure** | **Where can I see it** |
| --- | --- | --- |
| 1 | Has your request arrived? | access log |
| 2 | Have you entered Controller? | API entry log |
| 3 | Did input validation fail? | validation error |
| 4 | Did you fail in your business logic? | domain exception |
| 5 | Did DB processing fail? | SQL exception, timeout |
| 6 | Did an external API call fail? | HTTP 5xx, timeout |
| 7 | What was the response? | status code |

- Payment failure tracking example

    ```markdown
    [14:23:01] POST /orders 수신
    [14:23:01] order-service: 주문 생성 시작 (orderId=ORD-1004)
    [14:23:01] order-service: 주문 저장 성공 (120ms)
    [14:23:01] order-service: payment-service 호출 시작
    [14:23:04] payment-service: 외부 PG API 호출 시작
    [14:23:07] payment-service: PG_TIMEOUT (3,200ms)
    [14:23:07] order-service: 결제 실패 응답
    ```

    ![image](/assets/img/notion/TIL-로깅-(Observability)-Special Lecture/03-fb84093d01.png)

    - What you can know
        - Order saving is successful → DB suspicion excluded

        - Payment service can be called → Network suspicion excluded

        - Timeout after 3.2 seconds in external PG API → **This is the real cause**

### Metrics, Logs, Trances

> **OpenTelemetry (Otel)**
> : vendor-neutral Observability framework, a standard for creating, collecting, and exporting traces, metrics, and logs data.

| **division** | **In one word** | **Questions answered** | **example** |
| --- | --- | --- | --- |
| Metrics | number | How slow is it? How much do you fail? | Response time, error rate |
| Logs | incident record | What happened at that moment? | Error message, orderId |
| Traces | path of request | Which section took a long time? | Order → Payment → PG |

- **Relationship between Observability and OpenTelemetry**
    - To ensure observability, data must be collected from the application.

    - OpenTelemetry is the most standard means of collecting that data.

    → A structure that secures the observability of the system by visualizing and analyzing data generated through OpenTelemetry in backends such as Datadog, Prometheus, Grafana, AWS X-Ray, etc.

- The order of finding and analyzing causes in practice - from top to bottom

    ![image](/assets/img/notion/TIL-로깅-(Observability)-Special Lecture/04-a674fc00ef.png)

    - Metrics - Is this weird now?

        ```markdown
        요청 수:        1분당 1,200건
        평균 응답시간:   250ms
        p95 응답시간:   1.8초
        에러율:        5%
        CPU 사용률:    83%
        DB 커넥션 사용률: 90%
        ```

        - Has traffic suddenly increased?

        - Has the response time slowed down?

        - Have errors increased?

        - Are server resources limited?

### Pitfalls of averages & percentiles (p50/p95/p99)

> Response time **should not be viewed only as average**. Average hides outliers (slow decimals)
> - Example) 95 people 200ms + 5 people 10 seconds → It looks like an average of 690ms (“It’s okay”), but 5 people are giving up payment/search

| **characteristic** | **meaning** | **Whose Experience** |
| --- | --- | --- |
| average | overall average | Shaken by outliers |
| p50 (median) | 50% answered this question | average user |
| p95 | 95% answered this question | 5% border on the slow side |
| p99 | 99% answered this question | down to the slowest 1% |- In practice, **p95 / p99** are usually used as key indicators. SLO (Service Level Objective) is also usually based on p95

- Interview answer: "I look at p95 and p99 more than the average. The average is buried in outliers, so you don't see a slow user experience."

### Logs - What happened at that moment?

If Metrics is ‘detection of abnormalities through numbers’, Logs are ‘identification of causes based on the situation’.

- Metrics: “Error rate increased from 0.1% → 8%” (only up to the point where there is a problem)

- Logs: "ORD-1004 External PG API timeout occurred when ordering" (You can decide what to fix)

→ The problem is the amount of logs (thousands of lines per minute, millions of lines per day). So you have to hit **search key**

| **Search Key** | **When to use** |
| --- | --- |
| traceId | When grouping all logs from the same request |
| requestId | When dividing into individual requests |
| userId | When a specific user inquiry is received |
| orderId | Track specific orders |
| serviceName | Which service did you get it from? |
| errorCode | Statistics by error type |
| elapsedMs | When picking out only slow requests |

### Traces - where a request spends its time

Questions that Logs can't answer: "Why was **this request** slow?"

- A payment request goes through several steps: order inquiry → coupon verification → payment request → communication with credit card company → saving results → notification

- With logs alone, you have to manually calculate and add the time for each step (difficult at 2 a.m.)

- Trace **visualizes the entire path the request took**

    ```javascript
    Trace ID: trc-001
    Order Service      ━ 120ms
    Payment Service    ━━━━━━━━━━ 3,200ms
    External PG        ━━━━━━━━━━ timeout
    ```

  | **division** | **Questions answered** | **example** |
  | --- | --- | --- |
  | Metrics | Is it strange now? | Error rate rose to 5% |
  | Traces | Where was it slow? | Payment → PG section 3.2 seconds |
  | Logs | what exactly happened | PG_TIMEOUT in ORD-1004 |

### Log scattering issue in MSA

- Monolithic: All logs are gathered on one server and end with `grep`/`tail`

- MSA: One request passes through multiple services → logs are scattered across multiple servers

- The real difficulty: “**Are these four service logs coming from the same request?**”
    - Thousands of cases per minute, so they cannot be distinguished by time alone.

- Solution: Use the same marker (ID) for the same request → **Trace ID**

### Trace ID - An identifier that groups scattered logs together.

> **Unique identifier** issued per request. (Metaphor: Bundling all KTX/hotel/receipts with one business trip number)
> - If the logs come from the same request, they all have the same ID → If you search with `trc-001`, all service logs are displayed on one screen.

- **Propagation method**: When calling the next service, traceId is sent in **HTTP header** (Body changes schema, URL is messy → header is natural)- **Standard Header =** **`traceparent`** (W3C Trace Context)
    - If the header name is different for each company, it cannot be linked, so standardize it.

    - Example value: `00-4bf92f...4736-00f067...02b7-01` (version - trace-id - parent-id - optional)

    - No need to memorize. Tools are automatically created

### Span - At what ‘step’ was it slow?

- We know ‘which request’ it is based on traceId alone, but we don’t know ‘which step** of that request’ it is.

- ID attached to each step = **spanId**

  | **division** | **Questions answered** |
  | --- | --- |
  | traceId | What request did it come from? |
  | spanId | At what stage of the request did it occur? |

    ```javascript
    Trace ID: trc-001
    Span 1: 주문 조회   -- 20ms
    Span 2: 쿠폰 검증   -- 80ms
    Span 3: 결제 요청   ----- 3,200ms  <- 여기
      Span 3-1: 카드사 통신 ---- 3,150ms
      Span 3-2: 응답 검증   - 20ms
      Span 3-3: 결과 저장   - 30ms
    Span 4: 알림 발송   -- 90ms
    ```

### Creating traceId in Spring Boot - MDC

> **MDC** (Mapped Diagnostic Context): "Tag the thread currently handling the request."
> - You just put it in the MDC once at the start of the request, and the traceId is automatically attached to all logs of that request.

- How to use

    ```java
    MDC.put("traceId", UUID.randomUUID().toString()); // 1. 입구에서 넣기
    log.info("Order created. orderId={}", order.getId()); // 2. 자동 부착
    MDC.clear(); // 3. 끝나면 반드시 지우기 (메모리 누수 방지)
    ```

- Adding `%X{traceId}` to `logback-spring.xml` automatically includes it in the output format.

- In practice, it is processed in **Filter**(`OncePerRequestFilter`)
    - If there is a traceId in the header, it is inherited; if not, a new one is created (Continuing the ID received from another service)

    - The client can also be tracked by sending it in the response header.

    - Must be `MDC.clear()` in `finally` (if not deleted, the previous ID will be mixed in the next request)

- ⚠️ **Caution: traceId disappears in asynchronous operations**
    - MDC is based on `ThreadLocal` → MDC is empty for new threads of `@Async`, `CompletableFuture`

    - Move traceId separately or automatically propagate when using **Micrometer Tracing** (formerly Spring Cloud Sleuth)

    - However, it is better to first create MDC yourself to understand its principles.

### Practical Case - Toss Payments (SLASH)- **GlobalTrace ID**: Parent ID placed on top of Trace ID
    - Problem with a new Trace ID occurring at each screen transition → Bundle all user scenarios (payment information → progress → completion) into one

  | **ID Type** | **Binding range** |
  | --- | --- |
  | Trace ID | one request |
  | GlobalTrace ID | All user scenarios |

- **TraceId is generated in the front-end (browser)** → Even client errors such as JS crashes and network disconnections are tied up.

- **Tools are divided by role but grouped with the same ID**: Sentry (error) / Pinpoint (APM) / MDC (log propagation)

- The key is not tool selection, but **design to group with the same ID**

### Information that should never be left in logs

- Prohibited: Password, resident registration number, card number (all), CVC/CVV, authentication token (JWT/OAuth), session ID, medical information, account number

- **The most common mistake**: Recording the entire request object `log.info("Request: {}", requestDto)` → exposing the plain text

- Safe method: **Select only what you need** (traceId, orderId, userId, amount, etc.)

- If you have no choice, **masking**: `1234-5678-9012-3456` → `1234-****-****-3456`, or `cardLast4: "3456"`

### Practical tools - Understanding each position (role)

> Memorize tool names
> - Data flow: Application → Collector → Storage → Visualization → Utilization

- **OpenTelemetry (OTel)**: **Standard** for data format/transmission method. Once measured, no code modifications are required even if storage and analysis tools are changed → de facto industry standard

- **Collector**: Receives data and forwards it to the appropriate storage (possible filtering/masking). Otel Collector, Fluent Bit (light, k8s), Fluentd, Logstash, Vector

- **Storage** (varies by type)
    - Indicator: **Prometheus** (time series, de facto standard)

    - Log: **ELK** (heavy) vs **Loki** (light, Grafana faction) → Loki trend these days

    - Trace: **Jaeger** (Uber, CNCF), **Zipkin** (Twitter, often in Korean Java), recently **Tempo** (Grafana)- Error tracking: **Sentry** (collects and groups only errors. Very common in Korean startups and mid-sized companies)

- **Visualization**: **Grafana** (almost all repositories integrated), **Kibana** (ELK only)

- **Integrated SaaS**: Datadog (most widely), New Relic, Dynatrace → Convenient, but costs increase as data increases

- **Cloud built-in**: AWS **CloudWatch** (likely the first thing newbies will see), GCP Cloud Operations, Azure Monitor

- **APM** frequently seen in Korea: **Pinpoint** (Naver, specialized in Java and MSA), **Scouter** (LG CNS)

  | **environment** | **Combinations frequently seen** |
  | --- | --- |
  | early startup | Sentry + CloudWatch or Datadog |
  | medium size | Sentry + integrated SaaS |
  | Kubernetes | Prometheus + Grafana + Loki + Tempo |
  | ELK-based | Elasticsearch + Logstash + Kibana + Beats |
  | Korean conglomerate/finance | Pinpoint or Jennifer + own log system |

→ Even if the tools change, **the location remains the same**. Bottom line: **There is an ID that groups the same requests, and multiple tools connect to that ID**

### 6 steps to respond to failures

1. **Check the access log to see if the request has been received** → If not, suspect Gateway/LB/Authentication/Network (Need to see code)

2. **Understanding the scale** (Metrics): Error rate/p95 change, is it only a specific API or all, one instance or the entire cluster?

3. **Problem Request Identification**: Obtain one of traceId/requestId/userId/orderId (if there is a customer inquiry, start with that user)

4. **Narrow down the failure area**: Check how far you have succeeded from the beginning (inverted X)

5. **If MSA, connect logs by traceId**: Multiple service logs at once

6. **Summary of cause candidates**: Code (stack trace) / DB (slow query, connection) / External API (timeout, 5xx) / Network / Messaging (Consumer lag) / Resources (CPU, memory, disk)

→ Once the cause is narrowed down, action is decided (external contact if external PG, hotfix if internal code)

### Entire flow at once (payment timeout scenario)

1. **Metrics**: Payment-service only error rate 0.1%→8%, p95 250ms→3,200ms (order/coupon normal) → Suspected external dependency

2. **Select one request and check traceId**: `orderId=ORD-1004 → traceId=trc-001`3. **Collect all service logs by traceId**: Timeout after 3.2 seconds of external PG call from payment-service

4. **Trace visualization**: Order 120ms (success) / Payment 3,200ms (failure) / PG timeout

5. **Conclusion**: Final cause = Delay in response from external payment company
    - Action: ① Contact external payment company ② Notify user of failure ③ Review retry policy ④ Reexamine timeout threshold

→ **If you follow the flow, your analysis will quickly narrow down**

## Problems & Errors

### What is an Exception object?

The Exception object is an object that contains detailed information about the error when an error occurs during program execution.

It does not simply contain the fact that “an error occurred,” but also includes information that can track what error occurred, why it occurred, and where it occurred.

- **Example code**

    ```java
    try {
        paymentService.pay(orderId);
    } catch (Exception e) {
        log.error("결제 실패", e);
    }
    ```

    In the code above, e is the Exception object.

- **Information contained in Exception object**<br>
    Exception objects usually include the following information:

    1. What exception occurred
        - Example: NullPointerException, IllegalArgumentException

    2. Exception message
        - Example: "Order information not found."

    3. Where the exception occurred
        - Which class, which method, and which line occurred?

    4. Call flow
        - Through what methods did the exception occur?

        - This is called a stack trace.

- **Incorrect log example**

    ```java
    log.error("결제 실패");
    ```

    If you write like this, the message “Payment failed” will simply be left in the log.

    Therefore, the following information cannot be obtained.

    - Which spell failed?

    - Why did it fail?

    - Which code failed?

    - In which method flow did the problem occur?

    In other words, it is difficult to trace the cause of the error.

- **Good log example**

    ```java
    java log.error("결제 실패", e);
    ```

If you pass an Exception object like this, not only an error message but also a stack trace is left in the log.

    Through this, developers can check the following information:

    - The exception type that actually occurred

    - Exception message

    - Code location where the exception occurred

    - Method call flow through which exceptions are propagated

- **Summary**<br>
    An Exception object is a chunk of information that allows you to trace the cause and location of an error.

    Therefore, when leaving a failure log, rather than simply leaving a message, you should also pass an Exception object if possible.

### Synchronous Asynchronous - traceId disappears in asynchronous operations

- **Reason**: MDC operates based on `ThreadLocal`. In other words, traceId is a notepad bound to "only one thread processing that request."

- Asynchronous operations such as `@Async` or `CompletableFuture` are executed in a **new thread**. Since the MDC for that thread is empty, the traceId does not follow and disappears.

    ```java
    log.info("Before async");  // traceId=trc-001 (메인 스레드)
    CompletableFuture.runAsync(() -> {
        log.info("Inside async");  // traceId 없음 (다른 스레드)
    });
    ```

- **SOLVED**
    - Separately move the traceId to a new thread (e.g. a wrapper that adds the MDC value before execution).

    - If you use **Micrometer Tracing** (formerly Spring Cloud Sleuth), asynchronous traceId propagation is handled automatically. `traceparent` standard header is also automatically generated.

    - However, it is good to understand the principles of MDC at first (you can see what the library does instead).
