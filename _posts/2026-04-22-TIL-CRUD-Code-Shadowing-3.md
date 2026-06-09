---
title: '[TIL] CRUD Code Shadowing 3회차'
date: 2026-04-22 10:16:15 +0900
last_modified_at: 2026-04-29 18:14:42 +0900
categories: ["Spring 단기 심화", "과제"]
tags: ['Java', 'Spring', 'TIL', '과제', '내일배움캠프']
description: "Spring Service 비즈니스 로직 분리, @Transactional(readOnly = true) 옵션 활용 조회 성능 최적화 및 데이터 변경 방지"
english_url: "/en/posts/TIL-CRUD-Code-Shadowing-3/"
---
# Controller에서 비즈니스 로직 분리하기
## OrderService
``` java
package com.sparta.assignment.order.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

import com.sparta.assignment.order.dto.OrderRequest;
import com.sparta.assignment.order.dto.OrderResponse;
import com.sparta.assignment.order.entity.Order;
import com.sparta.assignment.order.repository.OrderRepository;
import com.sparta.assignment.prduct.entity.Product;
import com.sparta.assignment.prduct.repository.ProductRepository;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    @Transactional
    public OrderResponse createOrder(OrderRequest request) {
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "해당 상품이 존재하지 않습니다. id=" + request.getProductId()
                ));

        Order order = new Order(product);
        Order saved = orderRepository.save(order);
        OrderResponse orderResponse = new OrderResponse(saved);
        return orderResponse;
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "해당 주문이 존재하지 않습니다. id=" + id
                ));
        OrderResponse orderResponse = new OrderResponse(order);
        return orderResponse;
    }

}
```
- get 종류 메서드의 경우에는 `@Transactional(readOnly = true)`를 사용하여 Transaction은 그대로 생성되지만, JPA에게 수정은 하지 않을 것이라고 힌트를 줌(변경 감지(dirty checking)을 하지 않음)
- Controller에서 `OrderResponse orderResponse = orderService.메서드명`의 형태로 결과를 받고 있기 때문에, Service에서 OrderResponse 형태를 반환해줘야함
