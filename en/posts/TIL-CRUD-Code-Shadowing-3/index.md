---
layout: "post"
title: "[TIL] CRUD Code Shadowing 3rd session"
date: 2026-04-22 10:16:15 +0900
last_modified_at: 2026-04-29 18:14:42 +0900
categories: ["Spring 단기 심화", "과제"]
tags: ['Java', 'Spring', 'TIL', '과제', '내일배움캠프']
description: "Separate business logic from Controller ## OrderService"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-CRUD-Code-Shadowing-3/"
original_url: "/posts/TIL-CRUD-Code-Shadowing-3/"
source_post: "_posts/2026-04-22-TIL-CRUD-Code-Shadowing-3.md"
generated_lang: "en"
---
# Separate business logic from Controller
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
- In the case of the get type method, the Transaction is created as is using `@Transactional(readOnly = true)`, but a hint is given to JPA that no modification will be made (no change detection (dirty checking)).
- Since the Controller is receiving results in the form of `OrderResponse orderResponse = orderService.메서드명`, the Service must return the OrderResponse form.
