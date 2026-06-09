---
layout: "post"
title: "[TIL] Special lecture on MSA data consistency"
date: 2026-06-06 09:00:00 +0900
last_modified_at: 2026-06-09 01:14:00 +0900
categories: ["Spring 단기 심화", "특강"]
tags: ["Saga", "MSA"]
description: "We understand distributed transaction problems and data consistency issues that occur in the MSA environment, and summarize the concepts of Saga pattern, compensation transaction, Orchestration/Choreography method, and Outbox pattern to solve them."
description_source: "notion"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-MSA-데이터-정합성-특강/"
original_url: "/posts/TIL-MSA-데이터-정합성-특강/"
notion_id: "3777788a-fc66-80f4-a537-c548b64af50d"
notion_lang: "en"
---
## What I Learned

### 1. Complexity of distributed transactions

#### (1) Transactions in monolithic vs. problems in microservices

In Multiple Microservices, for example, Order, Invoice, Payment, Shipping, etc. are composed of different services and DBs and collaborate.

- For monolithic applications
    - Since only one database is accessed, transactions can be easily managed using declarative transactions (@Transactional, etc.) provided by frameworks such as Spring.

    - All data is in one place, so commit/rollback logic is simple.

- In case of microservice environment
    - Since each service uses a separate DB or message broker, multiple services are linked to one business logic.

    - Applying traditional distributed transactions (2PC, etc.) is subject to several limitations.
        - Latest technologies such as many NoSQL DBs, Kafka, and RabbitMQ do not support 2PC transactions such as XA.

#### (2) 2PC/XA protocol limit

- Traditional distributed transaction using XA protocol (2PC)
    - In theory, it is possible to commit/rollback multiple resources simultaneously, but the latest NoSQL message brokers often do not support it, and it is difficult to apply in heterogeneous environments.

    - All participating nodes must be ‘always available’, which reduces the overall availability of the system.

→ As a result, it is difficult to easily process distributed transactions in a microservice environment, and alternative approaches such as **Saga pattern** have become widely used.

### 2. Concept and necessity of Sage pattern

#### (1) Why Saga is the solution?

- Alternative to distributed transactions
    - In a microservice environment where traditional 2PC is difficult to apply, each service is responsible only for **local transactions**, and controls the entire flow through events or orchestrator when each step succeeds/failures.

- Local transaction + compensation transaction
    - If a failure occurs at the point where one step is committed and then moved to the next step, consistency is adjusted with logic to ‘revert (compensate)’ already committed work.

#### (2) How Saga works: step-by-step local transactions and compensating transactions![어떤 단계(T4)에서 실패가 발생하면, 이미 완료된 T1, T2, T3의 작업을 역순으로 취소(Undo)해야 함을 보여주는 그림](/assets/img/notion/TIL-MSA-데이터-정합성-특강/01-e9dc727800.png)
_Figure showing that if a failure occurs at a certain stage (T4), the already completed tasks of T1, T2, and T3 must be undone in reverse order._

Example) In the e-commerce ordering process, inventory decreases → If the final authorization (Authorize) fails at the end of payment, a compensation transaction to “restore inventory” is performed.

#### (3) Example of e-commerce order, differences from ACID (isolation issue)

- **Placing an Order** → **Creating an Invoice** → **Payment** → **Shipping**

- In monolithic, transactions were easily processed in one DB, but when separated into microservices, multiple DB/service linkages are required.

- Traditional ACID transactions guarantee ‘Isolation’, but in Saga, each step is committed, so intermediate states can be exposed to the outside.

### 3. Orchestration-based Saga

#### (1) Centralized Orchestrator and Command/Reply

In **Orchestration-based Saga**, there is a central **Orchestrator** that directs the order (flow) of all local transactions. The orchestrator sends **Command** messages such as “Pay now” or “Send delivery now” to each service, and the service returns a **Reply** event after completing the task.

![image](/assets/img/notion/TIL-MSA-데이터-정합성-특강/02-d3c16d5cdd.png)

1. When an order (Order Service) is created (1), the central Saga orchestrator accepts it and instructs “payment processing” (3)

2. When you receive the payment completion event (4), instruct “delivery” (5)

3. Final update of order status after confirming delivery completion (6) (7)

4. If an error occurs along the way, the orchestrator triggers a compensation transaction to revert what has already been committed.

#### (2) Orchestration-based advantages and disadvantages

- Advantages
    1. **Simpler Dependencies**
        - All flows are managed by Orchestrator → No circular dependency

    2. **Loose Coupling**
        - Since each service only needs to respond to commands given by the Orchestrator, direct calls between services are reduced.3. **Strengthen separation of concerns**
        - Entire business logic (flow control) is gathered in Orchestrator, and each service focuses on local transactions

- Disadvantages
    1. **Centralization of business logic**
        - If excessive logic is placed on the Orchestrator, there is a risk that it will become an “overly smart” central system and each service will become simple.

        - Since it can be a single point of failure (SPoF), HA (High Availability) configuration must be considered.
            - Since the Orchestrator directs the entire process, even if the service is fine, if the Orchestrator dies, order processing will not even start.

            - HA → High availability, a structure that allows another child to take over even if one dies.
                - For example, instead of having just one Orchestrator, have several.

    2. **Performance Issue**
        - Since all requests go through the Orchestrator, latency is added, and throughput limits depend on Orchestrator performance.
            - Since it goes through one more time like `주문 서비스 → Orchestrator → 결제 서비스`, in the middle case, time is added and latency increases.

            - If a lot of requests come in, a single orchestrator coordinates them all, so processing can become a bottleneck.
                - Total throughput may be tied to Orchestrator performance

### 4. Choreography-based Sage

#### (1) Event publication/subscription method

In **Choreography-based Saga**, each service publishes and subscribes to **events** and proceeds to the next step on its own, without an Orchestrator.

![image](/assets/img/notion/TIL-MSA-데이터-정합성-특강/03-1d6a8fe8fa.png)

1. Order Service issues `OrderCreated` event

2. Payment Service subscribes to this and proceeds with payment. If successful, `PaymentSucceeded` event is issued.

3. Shipping Service subscribes again, executes delivery, and issues `ShippingArranged` event.4. In case of payment failure, the flow is completed by issuing an order cancellation event as a compensation transaction.

#### (2) OutBox pattern & event

![image](/assets/img/notion/TIL-MSA-데이터-정합성-특강/04-cd49619c2c.png)

- **Atomic (Atomic) Guarantee**: Outbox table technique can be used to bundle “DB change” and “event issue” into one local transaction.

    - For example, when an order service creates an order, it must store order data in the DB and send events to a message broker such as Kafka.
        - The problem is that these two may succeed separately → Then, there is an order in the DB, but other services do not receive the ‘order created’ event, so they do not know that an order has been created, and the delivery service may not create the delivery.

        - The opposite is also possible (Kafka event issuance success, DB storage failure) → There is no order in the actual DB, but other services may mistakenly believe that an order has been created.

    - So use the OutBox table
        - Event publication schedule table

        - Rather than sending the event directly to Kafka, I first store the event record in my DB.

        → In other words, order storage and event storage are processed together in the DB.

    - Kafka issuance is
        - Later, a separate process reads the outbox table and issues an event to Kafka → if successful, changes the outbox status to SENT (from PENDING)

        

<div class="notion-callout" markdown="1">

<div class="notion-callout-heading">
<span class="notion-callout-icon">📍</span> <span class="notion-callout-title"></span>
</div>

</div>

- **Correlation IDs**: Events include common identifiers such as `orderId`, allowing other services to determine which transaction/order the event is associated with.
    - Common identifier for tracking purposes

    - Used to check whether events occurring between services come from the same order.

    - For example, in order flow, orderId can be used as Correlation Id.

        

<div class="notion-callout" markdown="1">

<div class="notion-callout-heading">
<span class="notion-callout-icon">📍</span> <span class="notion-callout-title"></span>
</div>

</div>

<div class="notion-callout" markdown="1">

<div class="notion-callout-heading">
<span class="notion-callout-icon">📍</span> <span class="notion-callout-title"></span>
</div>

</div>

#### (3) Choreography Advantages/Disadvantages

- Advantages
    - **No single point of failure (SPOF)**
        - There is no central orchestrator, so one point of failure does not stop the whole thing.

    - **Scalability**
        - Even if event-based services increase, it is relatively easy to add new features by simply adding a subscription.

- Disadvantages
    - **Event flow distribution**
        - The entire business logic is divided into multiple service events, increasing the difficulty of debugging/management.

    - **Event sequence, overlap, cycle**
        - Ensure order, logic to avoid processing the same event multiple times, circular references, etc. must be carefully designed.

### 5. Orchestration vs. Choreography: Comparison from Saga Perspective

```plaintext
[오케스트레이션 기반 Saga]

1) 순서 제어 및 보상 트랜잭션을 중앙 Orchestrator가 담당
2) 서비스 간 결합도 낮음, 전체 흐름 한눈에 파악 쉬움
3) 단일 장애점(SPoF), Orchestrator 로직 과부하 위험

[코레오그래피 기반 Saga]

1) 이벤트 발행/구독으로 상호작용
2) 중앙 집중 구성이 없어 장애 전파 위험 감소, 유연성 높음
3) 이벤트 흐름이 복잡해지면 관리/디버깅 어려움
```

Both methods are representative techniques for implementing the Saga pattern in a microservice environment, and can be appropriately selected or mixed depending on **organizational culture or system scale**.

### 6. Orchestration vs. Choreography: Application across microservice collaboration models

Beyond Saga, an **overall** comparison of two approaches, **Orchestration** and **Choreography**, when microservices collaborate (including general inter-service collaboration patterns in addition to microservice transactions)

#### (1) General overview

- **Orchestration**
    - **Central Orchestrator** mediates all calls and responses

    - Service coupling is low and the domain boundary is clear, so the test scope is clear.

- **Choreography**
    - **Point-to-point** communication where each service exchanges messages directly

    - Service dependencies are intertwined and complex, and failover scenarios can be difficult.

#### (2) Real-life examples such as Netflix Conductor

- **Netflix Conductor**:
    - Microservice orchestration tool released as open source by Netflix- Centrally define/control the execution flow (workflow) of multiple microservices

In addition, there are various Orchestrator tools such as **Camunda, Zeebe, and AWS Step Functions**, and each has differences in performance/operability/failure response methods.

## Example source code

**Sample code** to simply demonstrate **Orchestration-based** SAGA pattern with **Spring Boot + Kafka**.

To configure MSA (microservice) in an actual operating environment, each service (order, payment, delivery, etc.) must be separated into **separate project** or **separate application**, and DB, repository, configuration files, etc. must be divided separately.

Here we'll simply mock it up inside **one Spring Boot application**, just to give you a taste of what the SAGA (orchestration) flow and code structure looks like.

<div class="notion-indent" markdown="1">

Execution flow summary

1. User calls POST /orders?productName=AAA&quantity=2&price=10000

2. OrderService: Save Order (status = PAYMENT_PENDING) in DB and issue OrderCreatedEvent(orderId, amount) → order-events topic.

3. (Practice) PaymentService: Subscribe to order-events → Payment attempt → Issue success/failure events (PaymentCompletedEvent, PaymentFailedEvent) to the payment-events topic.

(Sample) Here, simulatePayment(orderId) is randomly called with PaymentServiceSimulator to force an event to be issued.

1.OrderOrchestrator

Upon receiving PaymentCompletedEvent → OrderStatus = PAID → Issue a shipping request event (shipping-events)

When receiving PaymentFailedEvent → OrderStatus = PAYMENT_FAILED → CANCELLED

When receiving ShippingCompletedEvent → OrderStatus = COMPLETED

</div>> Note: The code below has been simplified as much as possible for learning purposes, and all exception handling, transactions, security, and test codes have been omitted. Please note that in practice, more elaborate design and additional settings are required.

<details markdown="1">
<summary>**Project Structure**</summary>

```javascript
└─ src
   ├─ main
   │   ├─ java
   │   │   └─ com.example.sagasample
   │   │       ├─ SagasampleApplication.java
   │   │       ├─ config
   │   │       │   ├─ KafkaConsumerConfig.java
   │   │       │   └─ KafkaProducerConfig.java
   │   │       ├─ controller
   │   │       │   └─ OrderController.java
   │   │       ├─ domain
   │   │       │   ├─ Order.java
   │   │       │   ├─ OrderStatus.java
   │   │       │   └─ PaymentStatus.java
   │   │       ├─ events
   │   │       │   ├─ OrderCreatedEvent.java
   │   │       │   ├─ PaymentCompletedEvent.java
   │   │       │   ├─ PaymentFailedEvent.java
   │   │       │   └─ ShippingCompletedEvent.java
   │   │       ├─ repository
   │   │       │   └─ OrderRepository.java
   │   │       ├─ service
   │   │       │   ├─ OrderOrchestrator.java
   │   │       │   ├─ OrderService.java
   │   │       │   └─ PaymentServiceSimulator.java
   │   │       └─ ...
   │   └─ resources
   │       └─ application.yml
   └─ test
       └─ ...
```

</details>

<details markdown="1">
<summary>**`application.yml`**</summary>

```javascript
server:
  port: 8080

spring:
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: saga-example-group
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.trusted.packages: "*"
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
```

</details>

<details markdown="1">
<summary>**Kafka producer/consumer configuration (simple example)**</summary>

In the example, Spring Boot's automatic configuration (Spring for Apache Kafka) is utilized to its full potential, so there is not much additional configuration.

Caution: In actual operation, a strategy for topic creation permissions, number of partitions, etc. is required.

```javascript
package com.example.sagasample.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class KafkaTopicConfig {

    // 필요한 토픽들을 미리 생성 (자동 생성 옵션이 꺼져 있는 환경이라면)
    @Bean
    public NewTopic orderTopic() {
        return new NewTopic("order-events", 3, (short)1);
    }

    @Bean
    public NewTopic paymentTopic() {
        return new NewTopic("payment-events", 3, (short)1);
    }

    @Bean
    public NewTopic shippingTopic() {
        return new NewTopic("shipping-events", 3, (short)1);
    }
}
package com.example.sagasample.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;

@EnableKafka
@Configuration
public class KafkaConsumerConfig {
    // 추가적인 Consumer 설정이 필요하다면 Bean 등록
}

package com.example.sagasample.config;

import org.springframework.context.annotation.Configuration;

@Configuration
public class KafkaProducerConfig {
    // Producer에 대한 추가 Bean 설정이 필요한 경우
}
```

</details>

<details markdown="1">
<summary>**Domain and event classes**</summary>

### **3-1) Order domain (entity)**

```java
package com.example.sagasample.domain;

import javax.persistence.*;

@Entity
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String productName;
    private int quantity;
    private int price;

    @Enumerated(EnumType.STRING)
    private OrderStatus orderStatus;

    public Order() { }

    public Order(String productName, int quantity, int price) {
        this.productName = productName;
        this.quantity = quantity;
        this.price = price;
        this.orderStatus = OrderStatus.CREATED;// 최초 주문 생성 시점
    }

// getter / setter ...

    public void setOrderStatus(OrderStatus status) {
        this.orderStatus = status;
    }

// 기타 편의 메소드 ...
}
```

```java
package com.example.sagasample.domain;

public enum OrderStatus {
    CREATED,// 주문 생성됨
    PAYMENT_PENDING,// 결제 진행 중
    PAYMENT_FAILED,// 결제 실패
    PAID,// 결제 완료
    SHIPPING,// 배송 중
    COMPLETED,// 배송 완료(주문 최종 완료)
    CANCELLED// 주문 취소됨 (보상 트랜잭션)
}
```

### **3-2) Event Object (Kafka Message Payload)**

- **OrderCreatedEvent**: Event notifying the order service -> payment service that “order has been created”

- **PaymentCompletedEvent** / **PaymentFailedEvent**: Payment service -> Notify payment result to order/orchestrator

- **ShippingCompletedEvent**: Shipping completion event (just simulated here)

    ```java
    package com.example.sagasample.events;

    public class PaymentCompletedEvent {
        private Long orderId;
    // 결제 후 필요한 데이터public PaymentCompletedEvent() {}
        public PaymentCompletedEvent(Long orderId) {
            this.orderId = orderId;
        }
    }
    ```

    ```java
    package com.example.sagasample.events;

    public class PaymentFailedEvent {
        private Long orderId;
        private String reason;

        public PaymentFailedEvent() {}
        public PaymentFailedEvent(Long orderId, String reason) {
            this.orderId = orderId;
            this.reason = reason;
        }
    }
    ```

    ```java
    package com.example.sagasample.events;

    public class ShippingCompletedEvent {
        private Long orderId;

        public ShippingCompletedEvent() {}
        public ShippingCompletedEvent(Long orderId) {
            this.orderId = orderId;
        }
    // getter, setter
    }
    ```

</details>

<details markdown="1">
<summary>**Repository**</summary>

```javascript
package com.example.sagasample.repository;

import com.example.sagasample.domain.Order;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, Long> {
}
```

</details><details markdown="1">
<summary>**Orchestrator & Service**</summary>

### **5-1) OrderService**

- When creating **Order**, save **`Order`** entity in DB, change status to **`PAYMENT_PENDING`** and issue **OrderCreatedEvent**

- Logic for receiving external results such as payment/delivery is processed in **OrderOrchestrator** (or processed together within the same service)

    ```java
    ckage com.example.sagasample.service;

    import com.example.sagasample.domain.Order;
    import com.example.sagasample.domain.OrderStatus;
    import com.example.sagasample.events.OrderCreatedEvent;
    import com.example.sagasample.repository.OrderRepository;
    import org.springframework.kafka.core.KafkaTemplate;
    import org.springframework.stereotype.Service;
    import org.springframework.transaction.annotation.Transactional;

    @Service
    public class OrderService {

        private final OrderRepository orderRepository;
        private final KafkaTemplate<String, Object> kafkaTemplate;// JSON 직렬화/역직렬화private static final String ORDER_TOPIC = "order-events";

        public OrderService(OrderRepository orderRepository,
                            KafkaTemplate<String, Object> kafkaTemplate) {
            this.orderRepository = orderRepository;
            this.kafkaTemplate = kafkaTemplate;
        }

        @Transactional
        public Order createOrder(String productName, int quantity, int price) {
    // 1) Order 저장Order newOrder = new Order(productName, quantity, price);
            newOrder.setOrderStatus(OrderStatus.PAYMENT_PENDING);

            orderRepository.save(newOrder);

    // 2) Kafka로 이벤트 발행 (결제 서비스가 이 이벤트를 듣는다고 가정)OrderCreatedEvent event = new OrderCreatedEvent(newOrder.getId(), price * quantity);
            kafkaTemplate.send(ORDER_TOPIC, event);

            return newOrder;
        }

        @Transactional
        public void updateOrderStatus(Long orderId, OrderStatus status) {
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new RuntimeException("Order not found"));
            order.setOrderStatus(status);
            orderRepository.save(order);
        }
    }
    ```

> Note: In reality, @Transactional scope, compensation transaction when an error occurs, Outbox pattern, etc. may be more complex.

### **5-2) OrderOrchestrator (Orchestration Logic)**

- Receive **PaymentCompletedEvent**, **PaymentFailedEvent**, **ShippingCompletedEvent**, etc. from Kafka Consumer, and update **Order** status accordingly or perform **compensation logic** (payment cancellation, order cancellation, etc.).

- Here, **delivery logic** can be processed together, or an event can be issued as a “delivery service” if necessary.

    ```java
    package com.example.sagasample.service;

    import com.example.sagasample.domain.OrderStatus;
    import com.example.sagasample.events.PaymentCompletedEvent;
    import com.example.sagasample.events.PaymentFailedEvent;
    import com.example.sagasample.events.ShippingCompletedEvent;
    import org.springframework.kafka.annotation.KafkaListener;
    import org.springframework.stereotype.Service;
    import org.springframework.transaction.annotation.Transactional;

    @Service
    public class OrderOrchestrator {

        private final OrderService orderService;
        private final KafkaPublisher kafkaPublisher;// 이벤트 발행(배송 요청 등) 담당 클래스 예시

        public OrderOrchestrator(OrderService orderService,
                                 KafkaPublisher kafkaPublisher) {
            this.orderService = orderService;
            this.kafkaPublisher = kafkaPublisher;
        }

    /**
         * 결제 성공 이벤트 수신
         */@KafkaListener(topics = "payment-events", groupId = "saga-example-group",
                       containerFactory = "kafkaListenerContainerFactory")
        @Transactional
        public void handlePaymentCompleted(PaymentCompletedEvent event) {
    // 1) 주문 상태를 'PAID' 로 변경
            orderService.updateOrderStatus(event.getOrderId(), OrderStatus.PAID);

    // 2) 배송 서비스로 배송 요청 이벤트 발행 (예: shipping-events)
            kafkaPublisher.sendShippingRequest(event.getOrderId());
        }

    /**
         * 결제 실패 이벤트 수신
         */@KafkaListener(topics = "payment-events", groupId = "saga-example-group",
                       containerFactory = "kafkaListenerContainerFactory")
        @Transactional
        public void handlePaymentFailed(PaymentFailedEvent event) {
    // 1) 주문 상태를 'PAYMENT_FAILED' 로 변경
            orderService.updateOrderStatus(event.getOrderId(), OrderStatus.PAYMENT_FAILED);

    // 2) 비즈니스 로직에 따라 주문 취소, 재시도 로직, 고객 알림 등 수행// 여기서는 간단히 주문을 취소한다고 가정
            orderService.updateOrderStatus(event.getOrderId(), OrderStatus.CANCELLED);
        }

    /**
         * 배송 완료 이벤트 수신
         */@KafkaListener(topics = "shipping-events", groupId = "saga-example-group",
                       containerFactory = "kafkaListenerContainerFactory")
        @Transactional
        public void handleShippingCompleted(ShippingCompletedEvent event) {
    // 1) 주문 상태를 'COMPLETED' 로 업데이트
            orderService.updateOrderStatus(event.getOrderId(), OrderStatus.COMPLETED);
        }
    }
    ```

- Instead of branching by event type from one **`@KafkaListener`** method, the above code processed **methods separately**.

- Since **`PaymentCompletedEvent`** and **`PaymentFailedEvent`** come from the same topic (**`payment-events`**), they can actually be distinguished using container settings or message fields (T-type separators).

### **5-3) Simple KafkaPublisher example**

```java
package com.example.sagasample.service;

import com.example.sagasample.events.ShippingCompletedEvent;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class KafkaPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public KafkaPublisher(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void sendShippingRequest(Long orderId) {
// 실제로는 "배송 요청" 이벤트를 만들어 shipping-events 토픽으로 보냄// 예: ShippingRequestEvent 라는 별도 이벤트가 있을 수도 있음// 여기서는 "곧 배송 완료 이벤트가 날아온다고 치자" 정도로 간단화// 실제로는 배송 서비스가 ShippingRequestEvent 를 받고, 배송 후 ShippingCompletedEvent 를 발행
        System.out.println(">>> Sending shipping request for orderId = " + orderId);
// shipping-request 이벤트 발행// kafkaTemplate.send("shipping-events", new ShippingRequestEvent(orderId));// (시뮬레이션) 바로 "배송 완료" 이벤트를 발행
        kafkaTemplate.send("shipping-events", new ShippingCompletedEvent(orderId));
    }
}
```

> In reality, a separate shipping service exists, and the service must receive a ShippingRequestEvent, perform shipping logic, and then issue a ShippingCompletedEvent. Here, as a sample, we simply simulated the flow of “Delivery Request → Immediately Issue Delivery Completion Event”.</details>

<details markdown="1">
<summary>**Controller example**</summary>

```javascript
package com.example.sagasample.controller;

import com.example.sagasample.domain.Order;
import com.example.sagasample.service.OrderService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/orders")
public class OrderController {
    
    private final OrderService orderService;
    
    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public Order createOrder(@RequestParam String productName,
                             @RequestParam int quantity,
                             @RequestParam int price) {
        return orderService.createOrder(productName, quantity, price);
    }
    
    // 주문 조회, 상태 확인 등등...
}
```

</details>

<details markdown="1">
<summary>**Payment simulator example**</summary>

In reality, **`PaymentService`** should exist as a **separate microservice**.

Here we will create a simple “payment simulator” to mimic the event.

```java
package com.example.sagasample.service;

import com.example.sagasample.events.PaymentCompletedEvent;
import com.example.sagasample.events.PaymentFailedEvent;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.Random;

@Service
public class PaymentServiceSimulator {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private static final String PAYMENT_TOPIC = "payment-events";
    private final Random random = new Random();

    public PaymentServiceSimulator(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

// 실제로는 PaymentService가 order-events를 Subscribe 한 뒤// 결제를 시도하고, 성공/실패 이벤트를 발행해야 함.// 여기서는 간단히 API로 호출해서 시뮬레이션해볼 수 있도록 작성.public void simulatePayment(Long orderId) {
        boolean success = random.nextBoolean();// 50% 확률로 결제 실패

        if (success) {
            PaymentCompletedEvent event = new PaymentCompletedEvent(orderId);
            kafkaTemplate.send(PAYMENT_TOPIC, event);
            System.out.println(">>> Payment success event fired: " + orderId);
        } else {
            PaymentFailedEvent event = new PaymentFailedEvent(orderId, "Card limit exceeded");
            kafkaTemplate.send(PAYMENT_TOPIC, event);
            System.out.println(">>> Payment failed event fired: " + orderId);
        }
    }
}
```

> In practice, PaymentService must receive OrderCreatedEvent with @KafkaListener, perform payment, and then issue PaymentCompletedEvent or PaymentFailedEvent.

</details>

<details markdown="1">
<summary>**To summarize**</summary>

- If each service is separated,
    1. **OrderService** issues an event on topic **`order-events`**

    2. **PaymentService** subscribes to **`order-events`** → performs payment → issues **`payment-events`**

    3. **OrderOrchestrator** (or Consumer within the same OrderService) subscribes to **`payment-events`** → Issues the next step (delivery event)

    4. **ShippingService** subscribes to **`shipping-events`** → processes delivery → issues **`ShippingCompletedEvent`**

    5. The orchestrator again receives **`ShippingCompletedEvent`** and changes the status to Final Completed.

- **Compensation** examples (order cancellation, payment cancellation, inventory rollback, etc.) must additionally implement “Inventory Restore” or “Payment Cancellation API Call” at the point of **PaymentFailedEvent** or **Shipping Failure**.- **Idempotency**, **Outbox pattern**, **DLQ (Dead Letter Queue)** processing, **Retry**, etc. are essential factors to consider in actual operation.

**In practice**:

- Completely separate **each service** (separate Git repository, separate DB, separate distribution)

- Further refinement of **Error and Compensation Transaction** logic

- Establish a **Testing & Monitoring** (distributed tracing, log collection, etc.) system

- **Message Schema** (Avro/Protobuf/JSON) and **Backward/Forward Compatibility**

- **Topic partition and consumer group** design<br>
    etc. will be further considered.

We hope the example code will help you quickly try out the SAGA pattern during your **self-study** or **Proof of Concept (PoC)** phase.

</details>

<hr>

## Q&A

<details markdown="1">
<summary>**1. RabbitMQ vs Kafka, what is the difference and how should it be applied to the Saga pattern?**</summary>

**Q**

- How does the method of applying the SAGA pattern differ when comparing RabbitMQ and Kafka? (The lecture only covers RabbitMQ, so I am curious about the application of Kafka.)

- I would like to know which of the two message brokers is best to use in which situation.

**A**

- **Architectural differences**
    - **RabbitMQ**: A traditional message queue, where consumers take messages from the queue when they come in. Messages can be delivered flexibly through concepts such as routing keys, exchanges, and queues. Typically suitable for 'Command' style messaging.

    - **Kafka**: Distributed Commit Log structure. When a message is written to a topic, multiple consumer groups subscribe to it. Strengths in streaming processing, large data processing, and event sourcing.

- **Considerations when applying Saga pattern**
    - **RabbitMQ-based**
        - It is easy to place more emphasis on ‘consistency’ of processing rather than ensuring the ‘order’ of messages. Although consumption is done in the order entered into the queue, if the queue is not distributed, consideration must be given to single point (broker) failure.- Compensation transactions can be processed through message retry logic and DLQ (Dead Letter Queue) settings.

    - **Kafka-based**
        - Large quantities of messages can be processed scalably through partitioning.

        - Messages recorded in the topic are read by the consumer while managing the offset, so the timing of reprocessing or failure recovery can be precisely controlled (offset rollback, etc.).

        - Much better suited to architectures such as event sourcing, CQRS, streaming analytics, etc.

- **Conclusion**
    - RabbitMQ can be easy to use for simple imperative message passing and relatively low transactions per second (TPS).

    - If you consider event-driven, high throughput, event sourcing/CQRS, etc., Kafka is often more suitable.

    - SAGA itself is not significantly dependent on the message broker, but Kafka has significant advantages in terms of a reprocessing mechanism to ensure **eventual consistency**, idempotency for event duplication, and a failure recovery strategy.

</details>

<details markdown="1">
<summary>**2. Orchestration Saga vs Choreography Saga, when should you choose which method?**</summary>

**Q**

- When should I use Orchestration-based, and when should I use Choreography-based?

- Both methods will have pros and cons, but how should we set the standard?

**A**

- **Choreography**
    - Based on events, each service publishes and subscribes to mutual events to proceed to the next step.

    - Advantageous when the scale is small or the event flow is simple.

    - When inter-service dependencies grow and event flow becomes more complex, an “Event Explosion” may occur.

    - Structure of exchanging events on its own without a ‘separate centralized orchestrator’.

- **Orchestration**
    - There is an “Orchestrator” that centrally controls the process flow.

    - Each service performs tasks in the order instructed by the orchestrator and reports the results as events (or callbacks).- As the logic becomes more complex, the role of the orchestrator becomes more important, and there is a possibility that the service may become a single point of failure.

    - If the event flow is complex or has many steps, logic management can be relatively easy (since the flow is managed centrally).

- **Selection criteria**
    - **Coupling between services**: Choreography can be light and fast when simply 2 or 3 services are connected. However, when five or more domains are intertwined and the number of steps increases, orchestration is advantageous for maintenance.

    - **Workflow Complexity**: If multiple steps are mixed sequentially/parallel and error handling logic is diverse, centralized control through Orchestration.

    - **Development/Operation Convenience**: The difference is that Choreography requires a good understanding of events, and Orchestration requires well-designed centralized logic. Select based on team capabilities and architectural direction.

</details>

<details markdown="1">
<summary>**3. How should compensation transactions be processed and reprocessed in case of failure?**</summary>

**Q**

- What should I do when a compensation transaction fails?

- I am curious about how to design DLQ or retry logic, and what is the response plan when compensation transactions may fail in succession.

- I have already issued a message after committing. How should I handle the issued message in a rollback situation?

**A**

1. **Concept of compensation transaction**
    - After a forward transaction is successful, if an error occurs, the ‘reverse operation’ is performed to reverse it.

    - Example: If delivery fails in the **`주문 생성 → 결제 성공`** situation, ‘payment cancellation’ can be a compensation transaction.

2. **Reprocessing when compensation transaction fails**
    - **Retry Policy**: Retry up to a certain number of times. If the number of retries is exceeded, DLQ or administrator intervention is required.

    - **DLQ (Dead Letter Queue) or compensation-only topic**: If messages for compensation transactions continue to fail, operate a separate queue/topic to store for later manual confirmation.- **Outbox pattern**: A pattern for atomically processing local transactions and event publishing. Events are first stored in the DB table (Outbox), and a separate process forwards the events in the table to the message broker to prevent inconsistencies between publish and commit.

3. **Rollback processing for already published messages**
    - **Idempotency guaranteed**: Designed so that the message consumption side does not perform logic more than once even if the same message comes multiple times.

    - **Issuing a ‘compensation’ message**: Instead of simply canceling the previous message, a new event is issued to restore the state, allowing the consumer side to perform cancellation or correction logic.

    - **Transaction boundary redesign**: If it is important business logic, thoroughly synchronize the point of issuing messages with the local transaction (commit). Or consider the Outbox pattern.

</details>

<details markdown="1">
<summary>**4. How do you solve the problem of message duplication and message order guarantee?**</summary>

**Q**

- How do I solve the problem of receiving duplicate messages or getting the order mixed?

- Especially in a Kafka environment, as partitioning increases, it becomes difficult to guarantee order. How do you handle this?

**A**

- **Idempotency**
    - How to respond to duplicate messages on the consumer side:
        1. Check whether the event has already been processed based on **business key** (order number, payment number, etc.).

        2. **Deduplication Store**: Stores processed event IDs in Redis or DB and ignores duplicates.

    - In Kafka, the same message is not duplicated through **offset commit**, but since it can be read again during failure recovery, idempotent processing is necessary.

- **Ordering**
    - Kafka guarantees message order within the **same partition**, but when **partitioning** occurs, global order is not guaranteed.

    - If global order is really needed, use only one partition, or group partitions based on a specific key to ensure order only for that key.

    - If it is difficult to absolutely match the order, event design should be reconsidered from the perspective of ultimate consistency (‘event-driven’ + ‘state machine’).</details>

<details markdown="1">
<summary>**5. Kafka partition and topic concepts are difficult. How should I understand and set it?**</summary>

**Q**

- Kafka topics and partition concepts are too difficult. By what criteria should the number of partitions be determined?

**A**

- **Topic**: Category or channel of the message.

- **Partition**: A unit that physically divides a topic. Plays a big role in parallel processing and scalability.

- **Based on partition number setting**
    - **Number of consumers**: The number of partitions must be appropriately set to enable maximum parallel consumption within the consumer group (number of partitions ≥ number of consumer threads).

    - **Expected traffic**: As the number of messages to be processed per second increases, scalability (Throughput) increases by increasing the partition.

    - **Message order**: When increasing partitions, order is guaranteed only on a partition-by-partition basis.

- **Practical Tips**
    - Rather than setting the partition too small from the beginning, it is better to set it a little generously and plan for topic leader balancing (re-partitioning) during operation.

    - Partition distribution varies depending on how the message key is set (Partition Key), which affects the strategy to ensure equal distribution and order of data.

</details>

<details markdown="1">
<summary>**6. When implementing a complex structure using the Choreography method, how do you handle the problem of increasing dependency between services and compensation transactions in case of failure?**</summary>

**Q**

- Choreography becomes complicated with too many events coming and going. How do you manage this?

- I wonder if compensation transaction processing in the event of a failure is only possible on an event basis.

**A**

- **Problems that occur in Choreography**
    - Event explosion: When multiple services publish/subscribe to each other's events, the business logic flow may become invisible or it may become difficult to understand the order.

    - As the number of event handlers for each service increases, it becomes difficult to understand the flow in one place and debugging becomes difficult.

- **Management Strategy**
    - **Domain event design**: Clear definition and standardization of events issued by each domain. Strictly determine “What events are issued under what circumstances?”- **Event Tracing (Logging/Tracing)**: Track the flow of events with a centralized logging/tracing system (e.g. ELK, Zipkin, etc.).

    - **Compensation transaction**: Reverse event is issued again based on the event, or a separate compensation process receives the event and restores the state.

- **When to switch to Orchestration**
    - If the number of services/domains increases and the branching of event flows becomes complicated, it is time to consider Orchestration.

    - Choreography is easy for small scale, simple flow, and rapid expansion, but management becomes difficult as complexity increases.

</details>

<details markdown="1">
<summary>**7. How should compensation transactions be managed when updating?**</summary>

**Q**

- In the case of Create/Delete, rollback is relatively simple, but for Update, rollback is possible only if the previous state is saved. Where should I store my old data?

**A**

- **Pre-state storage strategy**
    1. **Event Sourcing**: Events can be accumulated and returned to a specific point in time when necessary.

    2. **Snapshot + Event**: As data becomes more complex, take a snapshot at a specific point in time and then play back the event to restore the state.

    3. **History Table**: When using RDB, store previous data in a separate history table when updating and refer to it during rollback.

- **Caution**
    - If the data is frequently updated, the recording capacity can increase rapidly, so a method of storing version information only for essential fields that require compensation transactions is sometimes chosen.

    - Storing all previous states in too much detail increases system complexity, so it is important to find a compromise depending on the characteristics of the service domain.

</details>

<details markdown="1">
<summary>**8. Are there any data consistency issues if the SAGA rollback order is arbitrarily changed?**</summary>

**Q**

- Example: Order (request) → Inventory (synchronous) → Payment (asynchronous) → Delivery (asynchronous) was processed in the following order, but in case of delivery failure, the rollback order was inventory restoration (synchronous) → Order status change → Payment cancellation (asynchronous).- I wonder if there will be any problems if the rollback order is different for each service. How should SAGA determine rollback priorities?

**A**

- **The order in the forward transaction** and **the order in the compensation transaction** do not necessarily have to be reversed, but **data integrity** and **business requirements** must be taken into consideration.

- **Key Considerations**
    1. **Business importance**: If the requirement that “inventory” be restored first makes business sense, it is correct to restore inventory first.

    2. **Data Consistency**: If other services are rolled back before a specific service is rolled back, other errors or logical conflicts may occur in the intermediate state (a payment has been canceled but inventory has not yet been restored, which may affect other orders).

    3. When controlling this order in an orchestrator** or **individual service**, thoroughly design retry logic in case of failure.

- Clean up
    - The order of compensation transactions does not necessarily have to be ‘the reverse order of the forward order’, but ‘an order that can be safely reversed in terms of business logic’ must be considered. If an error occurs in an intermediate state, it must be retried again or separate monitoring and error handling are required.

</details>

<details markdown="1">
<summary>**9. Applying CQRS and Saga together becomes too complicated. To what extent is it managed in practice?**</summary>

**Q**

- Trying to introduce CQRS (read/write separation) + Saga (distributed transaction) + event sourcing made it too complicated. To what extent is it applied in practice?

- I wonder if I should make a simple function like CRUD this complicated.

**A**

- **Practical application level**
    - Implementing all services with event sourcing + CQRS is burdensome.

    - A mixed strategy is often used in which CQRS & Saga is applied only to core domains (order, payment, inventory, etc.) with high business impact, and the rest consists of relatively simple CRUD.

    - Introduction of ‘appropriate level’ is important. If productivity decreases due to excessive introduction of architecture, maintenance costs increase.

- **Gradual introduction method**
    1. **First, domain separation and DB separation**: Securing a certain degree of independence of individual services, which is the basic premise of MSA.2. **Maintain loose dependencies between services through event publishing (or REST API)**: Apply Saga only where it is absolutely necessary.

    3. **Partially apply CQRS depending on need**: Introduce first only for services with a high query load or when event sourcing is required.

    4. **Establish a monitoring/testing strategy**: As it is a distributed transaction, reprocessing logic must be prepared in advance in case of failure.

</details>

<details markdown="1">
<summary>**10. How to test SAGA pattern?**</summary>

**Q**

- It seems that integration testing between services is necessary to test distributed transactions. What method do you use?

**A**

- **Integration Test**
    - Launch each service and message broker (Kafka/RabbitMQ, etc.) using Docker, etc., and then proceed with scenario testing.

    - Normal processing scenarios, partial failure scenarios (payment failure, delivery failure, etc.), compensation transaction failure scenarios, etc. must all be included.

- **Measurement and Monitoring**
    - Since distributed transactions involve multiple services/queues, visualize the transaction path with distributed tracing tools such as Zipkin and Jaeger.

    - Check the event log to see how messages are being retried/compensated when an error occurs.

- **Continuous Integration (CI) & Continuous Deployment (CD)**
    - Run automated integration tests whenever changes are made to ensure that the SAGA scenario is not broken.

</details>

<details markdown="1">
<summary>**11. I am curious about the problems and solutions encountered when applying the SAGA pattern in actual service (business).**</summary>

**Q**

- I would like to hear about problems or errors that occurred in practice and how to solve them.

- In practice, I am curious about how it is implemented at the code level and how monitoring/logging is done.

**A**

- **Cases of major failures**
    - **Duplicate message processing failure**: Idempotence processing is not performed properly, resulting in duplicate payments/duplicate orders. → ​Resolved through **duplicate check based on transaction ID** and DB Lock/Unique restrictions.- **Infinite compensation transaction failure**: When the payment cancellation API fails several times and DLQ accumulates, but this is missed in operation. → ​Response with **DLQ monitoring system** or periodic alarms.

    - **Orchestrator failure**: The entire transaction flow is interrupted due to the central orchestrator service being down. → **High availability (HA) configuration** + Event reprocessing design in case of failure.

- **Solutions and operational strategies**
    - **Monitoring/Alarm**: Monitor event success/failure counts at each stage, and receive real-time alerts via Slack, text, etc. when a certain threshold is exceeded.

    - **Idempotent Consumer**: Prevent duplicate processing of the same event. Must apply to domains that involve monetary transactions such as payment/inventory/points.

    - **Replay logic**: Use Kafka offset or DB Outbox to replay compensation transactions or specific events.

    - **Documentation of failure response**: Since failures occur in various aspects in a distributed environment, document failure scenarios and prepare in advance.

</details>

<details markdown="1">
<summary>**12. As the number of distributed transactions increases in MSA, there are many things to think about, such as failure response, high availability, scalability, and data consistency. What approach is best?**</summary>

**Q**

- When switching to MSA, there are more keywords to consider. How should I prioritize and respond to each?

**A**

1. **Domain-first design**
    - Thoroughly design distributed transactions starting from the domain where business logic is the most important.

    - Domains that do not generate many transactions are processed with simple API calls, and event-based/saga patterns are applied only to core domains.

2. **Separation of concerns**
    - “Scalability, failure response, and data consistency” are approached by dividing them into infrastructure and architecture-level issues and service internal logic issues, respectively.

    - Example: Kafka or RabbitMQ cluster configuration, monitoring, alarm, and log collection are first stabilized in terms of DevOps/infrastructure.

3. **Gradual improvement**
    - If you try to do everything well at once, complexity explodes.

    - Introduce transaction boundaries, event issue-consumption, and compensation transaction logic step by step, gradually adding CQRS and event sourcing.</details>

<details markdown="1">
<summary>**13. What are the key points to consider when applying the Saga pattern?**</summary>

**Q**

- If you apply the Saga pattern in practice, what are the parts or key considerations that are easy to miss?

**A**

1. **Data Idempotency and Redundancy Processing**
    - In a distributed environment, events may occur repeatedly or out of order, so safety devices are needed at the consumption end.

2. **Design of Compensation Transaction**
    - Clearly define in advance which method, from which stage, and in which order to roll back in case of failure.

3. **Orchestration vs. Choreography**
    - Decide which method to take based on domain size, event complexity, and team capabilities.

4. **Monitoring failures and exceptions**
    - Prepare specifically how to detect and recover from failures such as DLQ, retry logic, and outbox patterns.

5. **Testing and Operations Strategy**
    - A good integrated testing, distributed tracing, and logging/monitoring environment must be established to quickly identify the cause of an actual failure.

</details>

<details markdown="1">
<summary>**14. When even compensation transactions can fail, are there any additional alternatives other than the Outbox pattern?**</summary>

**Q**

- In addition to simply redirecting the message in the ‘compensation’ direction, you must also consider the possibility that the compensation transaction itself may fail again.

- First of all, I came up with DLQ (Dead Letter Queue) and retry logic, and I know the Outbox pattern, but are there any additional patterns or solutions that can be used?

**A**

The Outbox pattern is a very useful pattern for reducing message loss by atomically combining **event publication** and **local transaction**. However, if the compensation transaction itself fails repeatedly, a one-level higher orchestration/monitoring/reprocessing strategy is required. (See example below)

<hr>

### **1) Orchestrator + State Machine Management**

- **Orchestration Saga** has been further strengthened so that the central orchestrator (or Saga Manager) tracks the status of each step and also manages the status of compensation transactions separately in case of failure.- Uses the concept of **state machine (or workflow) to record at which stage the current transaction was retried, how many times it was retried, and for what reason it failed.
    - Example) By introducing external **workflow/orchestration engines** such as Camunda, Zeebe, Netflix Conductor, Temporal.io, etc., even compensation failures can be managed in detail.

- If the compensation transaction continues to fail, it may finally be converted to a state requiring **human (operator) intervention** and a monitoring alarm may sound.

    <hr>

### **2) TCC (Try-Confirm/Cancel) Pattern**

- **TCC** is one of the **distributed transaction guarantee techniques** similar to the Saga pattern.
    1. **Try**: Reserve resources in advance (temporarily hold them)

    2. **Confirm**: Actual commit

    3. **Cancel**: Compensation/Cancellation

    - Consists of logic.

- The actual resource is fixed (held) at the moment the resource is reserved (Try) at each stage, so a certain degree of **idempotence** is guaranteed when canceling at the subsequent **Cancel** stage.

- If resources such as payment/inventory can be clearly “held”, using TCC helps reduce retry problems that occur when compensation transactions fail.
    - For example, in the payment process, the payment amount is not completely removed, but is placed in “approval pending” status for a certain period of time (session), and then Confirm at the time of confirmation and Cancel at the time of cancellation.

    <hr>

### **3) Retry + DLQ + Monitoring**

- Even if the **Message Loss** problem has already been reduced with the Outbox pattern, there is a possibility of failure on the side that consumes the message (compensation transaction execution).

- **Retry policy** (exponential backoff, maximum number of retries, etc.) + **DLQ (Dead Letter Queue)** must be set.
    1. **Single retry**: Retry up to n times.

    2. **Move to DLQ**: Move to DLQ after n failures.

    3. **Monitoring/Alarm**: When the number of messages accumulated in DLQ increases, an alarm is sent via Slack, email, SMS, etc.

    4. **Manual Intervention**: The operator checks the message and decides whether to reprocess it (Replay) or abort it completely (Manual Cancel).> Tip It is also commonly used to record the compensation transaction success/failure/number of retries by adding a “processing status” field to the Outbox table (or event table). Tracking the status within the DB has the advantage of allowing operators to directly check and attempt reprocessing through a web dashboard or SQL query.

    <hr>

### **4) Event Sourcing + CQRS**

- By recording all state changes as events through **event sourcing**, when a data consistency problem occurs due to a compensation transaction failure, you can go back to a specific point in time and attempt reprocessing (Replay) or reconstruct the problem part.

- When applied together with **CQRS**, the write (command) and read (query) models are separated, and the query model can be designed in such a way that only the final consistency is required even if the compensation transaction is re-executed.

- However, since event sourcing significantly increases operation and maintenance complexity, a strategy of gradually introducing it only to core domains that are absolutely necessary in actual projects is recommended.

    <hr>

### **5) Special EndPoint or Administrator tools for reprocessing**

- There may be situations where you want to **reprocess** (Replay) an event that has already been issued or a reward failure event.
    - Example) “Delivery Cancellation” transaction continues to fail due to network failure -> Accumulated in DLQ -> This message must be processed again after the failure is resolved.

- In times like this,
    1. **Manually move the DLQ message** back to **normal queue** (or topic), or

    2. You can trigger “reprocessing” through **special API** (for administrators) or **console**.

- If the compensation transaction itself still fails, the DB may ultimately be modified through **human intervention**, or a scenario such as “Cancel this order completely and reorder” may be provided in accordance with business policy.

</details>

<hr>

## References<a class="notion-mention" href="https://devocean.sk.com/blog/techBoardDetail.do?ID=165445&boardType=techBlog&ref=codenary">https://devocean.sk.com/blog/techBoardDetail.do?ID=165445&boardType=techBlog&ref=codenary</a>

<a class="notion-mention" href="https://www.youtube.com/watch?v=amTJyIE1wO0&feature=youtu.be">https://www.youtube.com/watch?v=amTJyIE1wO0&feature=youtu.be</a>

<a class="notion-mention" href="https://www.youtube.com/watch?v=xpwRTu47fqY">https://www.youtube.com/watch?v=xpwRTu47fqY</a>
