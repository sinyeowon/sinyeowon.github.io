---
title: "[TIL] 로깅 (Observability) 특강"
date: 2026-05-15 09:00:00 +0900
last_modified_at: 2026-06-12 00:49:00 +0900
categories: ["Spring 단기 심화", "특강"]
tags: ["Observability"]
description: "로깅 (Observability) 특강에 대한 학습 내용을 정리한 글입니다."
description_source: "excerpt"
english_url: "/en/posts/TIL-로깅-(Observability)-특강/"
notion_id: "3617788a-fc66-80c0-95da-c45526f98815"
notion_lang: "ko"
---
## 배운 내용

### Monitoring과 Observability

> **Monitoring**
> : ‘지금 문제가 있는가?’를 파악하는 것에 중점을 둠

> **Observability**
> : 시스템의 외부 출력(로그, 메트릭, 트레이스)을 통해 시스템의 내부 상태를 얼마나 잘 이해할 수 있는지를 나타내는 척도
> - ‘왜 문제가 생겼는가?’를 파악하기 위해 필요한 도구

| **구분** | **Monitoring** | **Observability** |
| --- | --- | --- |
| 핵심 질문 | 문제가 있는가? | 왜 생겼는가? |
| 관심 데이터 | 지표, 알림 | 지표, 로그, 추적 |
| 예시 상황 | 에러율 5% 초과 | PG timeout이 어디서 났는지 추적 |
| 목적 | 감지 | 원인 추적 |

### 오늘 쫓을 시나리오

![사용자가 주문 버튼을 눌렀습니다.
주문 요청은 서버에 도착했습니다.
주문 데이터도 저장됐습니다.
그런데 결제 요청에서 timeout이 났습니다.
고객센터에는 "결제가 안 됐다"는 문의가 들어왔습니다.](/assets/img/notion/TIL-로깅-(Observability)-특강/01-9e9ed5d190.png)
_사용자가 주문 버튼을 눌렀습니다.
주문 요청은 서버에 도착했습니다.
주문 데이터도 저장됐습니다.
그런데 결제 요청에서 timeout이 났습니다.
고객센터에는 "결제가 안 됐다"는 문의가 들어왔습니다._

**→ 장애 분석의 핵심 = 어디까지 성공했는지 보고, 어디서 실패했는지 좁힘**

### 로그는 왜 필요한가

운영에서 로그는 우리의 눈이며, 사고가 난 다음 현장 사진을 보고 원인을 찾는 것

- 좋은 로그는 다음 질문에 답해야 함

  | **질문** | **필요한 값** |
  | --- | --- |
  | 어떤 요청에서 났는가? | requestId, traceId |
  | 어떤 사용자의 요청인가? | userId |
  | 어떤 주문인가? | orderId |
  | 어느 서비스인가? | serviceName |
  | 어떤 에러인가? | errorCode |
  | 얼마나 걸렸는가? | elapsedMs |
  | 같은 요청의 다른 로그는 어디 있는가? | traceId |

→ 로그를 많이 찍는 것보다, **찾을 수 있게 찍는 게 핵심**

- 좋은 로그 예시

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

    구조화 로그(JSON 형식)로 남기면 더 좋음

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

    - 위 내용으로 알 수 있는 것

  | **필드** | **의미** |
  | --- | --- |
  | level | 심각도 (ERROR라서 즉시 봐야 함) |
  | service | payment-service에서 발생 |
  | traceId | 이 ID로 다른 서비스 로그까지 연결 |
  | orderId | ORD-1004 주문 |
  | userId | U-77 사용자 |
  | message | 외부 결제 API 타임아웃 |
  | elapsedMs | 3.2초 걸리다 끊김 |
  | errorCode | PG_TIMEOUT이라 외부 결제사 쪽 문제 |

        → 좋은 로그는 ‘누가, 어디서, 왜, 얼마나 걸려서 실패했는지’를 알려줌

- 좋은 로그의 5가지 조건

  | **조건** | **왜 필요한가** | **예시 필드** |
  | --- | --- | --- |
  | 식별 가능한가 | 검색해서 찾을 수 있어야 함 | traceId, requestId |
  | 맥락이 있는가 | 어떤 업무인지 알아야 함 | userId, orderId |
  | 출처가 명확한가 | 어느 서비스에서 났는지 | serviceName |
  | 원인이 분류되는가 | 통계와 알람에 쓰려면 | errorCode |
  | 시간이 측정되는가 | 성능 분석에 필요 | elapsedMs |

- **로그 레벨 - 언제 뭘 쓰는가**

  | **레벨** | **언제 쓰나** | **예시** | **알람 대상인가?** |
  | --- | --- | --- | --- |
  | ERROR | 사용자 요청이 실패함 | 결제 실패, DB 연결 끊김 | 예, 운영에서는 필수 |
  | WARN | 실패는 아니지만 비정상 | 재시도 후 성공, 임계치 근접 | 일부 하지만 운영에서는 critical한 부분 빼고는 대부분 끔 |
  | INFO | 중요한 비즈니스 이벤트 | 주문 생성, 결제 성공 | 아니오, 운영에서 끔 |
  | DEBUG | 개발 시 흐름 확인용 | 내부 값 확인 | 운영에서 끔 |

    - **ERROR -** 진짜 사람이 봐야 할 일에만 씀

    - **WARN - 패턴이 쌓이면 알람. 에러가 나타나기 전 현상으로 분류될 수 있음.  단시간에 쌓이게되면 확인해야하는 대상**

    - **INFO- 비즈니스 사건만.** 주문 생성, 결제 완료 같은 것들

    - **DEBUG- 개발환경에서만.** 디스크 문제 생김

### API 요청 흐름으로 장애 좁혀가기

장애 분석에서 가장 중요한 건 순서 → 요청과 흐름대로 추적

![image](/assets/img/notion/TIL-로깅-(Observability)-특강/02-ebf0347c9b.png)

| **단계** | **확인할 것** | **어디서 보나** |
| --- | --- | --- |
| 1 | 요청이 도착했는가 | access log |
| 2 | Controller에 진입했는가 | API 진입 로그 |
| 3 | 입력 검증에서 실패했는가 | validation error |
| 4 | 비즈니스 로직에서 실패했는가 | 도메인 예외 |
| 5 | DB 처리에서 실패했는가 | SQL exception, timeout |
| 6 | 외부 API 호출에서 실패했는가 | HTTP 5xx, timeout |
| 7 | 응답은 뭘로 나갔는가 | status code |

- 결제 실패 추적 예시

    ```markdown
    [14:23:01] POST /orders 수신
    [14:23:01] order-service: 주문 생성 시작 (orderId=ORD-1004)
    [14:23:01] order-service: 주문 저장 성공 (120ms)
    [14:23:01] order-service: payment-service 호출 시작
    [14:23:04] payment-service: 외부 PG API 호출 시작
    [14:23:07] payment-service: PG_TIMEOUT (3,200ms)
    [14:23:07] order-service: 결제 실패 응답
    ```

    ![image](/assets/img/notion/TIL-로깅-(Observability)-특강/03-fb84093d01.png)

    - 알 수 있는 것
        - 주문 저장은 성공 → DB 의심 제외

        - 결제 서비스 호출은 됨 → 네트워크 의심 제외

        - 외부 PG API에서 3.2초 끌다가 timeout → **여기가 진짜 원인**

### Metrics, Logs, Trances

> **OpenTelemetry (오픈텔레메트리, Otel)**
> : vendor-neutral 관찰성 프레임워크로, traces, metrics, logs 데이터를 만들고 수집하고 내보내는 표준

| **구분** | **한마디로** | **답하는 질문** | **예시** |
| --- | --- | --- | --- |
| Metrics | 숫자 | 얼마나 느린가? 얼마나 실패하는가? | 응답시간, 에러율 |
| Logs | 사건 기록 | 그 순간 무슨 일이 있었나? | 에러 메시지, orderId |
| Traces | 요청의 경로 | 어디 구간에서 오래 걸렸나? | Order → Payment → PG |

- **Observability와 OpenTelemetry의 관계**
    - Observability를 확보하기 위해, 애플리케이션에서 데이터를 수집해야함

    - OpenTelemetry는 그 데이터를 수집하는 가장 표준적인 수단

    → OpenTelemetry를 통해 생성된 데이터를 Datadog, Prometheus, Grafana, AWS X-Ray 등의 백엔드에서 시각화하고 분석함으로써 시스템의 Observability를 확보하는 구조

- 실무에서 원인을 찾고 분석하는 순서 - 위에서 아래로

    ![image](/assets/img/notion/TIL-로깅-(Observability)-특강/04-a674fc00ef.png)

    - Metrics - 지금 이상한가?

        ```markdown
        요청 수:        1분당 1,200건
        평균 응답시간:   250ms
        p95 응답시간:   1.8초
        에러율:        5%
        CPU 사용률:    83%
        DB 커넥션 사용률: 90%
        ```

        - 트래픽이 갑자기 늘었나?

        - 응답시간이 느려졌나?

        - 에러가 늘었나?

        - 서버 자원이 한계인가?

### 평균의 함정 & 백분위수 (p50/p95/p99)

> 응답시간은 **평균만 보면 안 됨**. 평균은 이상치(느린 소수)를 숨김
> - 예) 95명 200ms + 5명 10초 → 평균 690ms("괜찮네")처럼 보이지만, 5명은 결제/검색을 포기 중

| **지표** | **의미** | **누구의 경험** |
| --- | --- | --- |
| 평균 | 전체 평균 | 이상치에 흔들림 |
| p50 (중앙값) | 50%가 이 안에 응답 | 보통 사용자 |
| p95 | 95%가 이 안에 응답 | 느린 쪽 5% 경계 |
| p99 | 99%가 이 안에 응답 | 가장 느린 1%까지 |

- 실무에서는 보통 **p95 / p99**를 핵심 지표로 사용. SLO(서비스 수준 목표)도 보통 p95 기준

- 면접 답변: "평균보다 p95, p99를 봅니다. 평균은 이상치에 묻혀서 느린 사용자 경험이 안 보이거든요."

### Logs - 그 순간 무슨 일이 있었나

Metrics가 '수치로 이상 감지'라면, Logs는 '상황 기반으로 원인 파악'

- Metrics: "에러율이 0.1% → 8%로 올랐다" (문제 있음까지만)

- Logs: "ORD-1004 주문에서 외부 PG API가 timeout 났다" (무엇을 고칠지 결정 가능)

→ 문제는 로그 양(분당 수천 줄, 하루 수백만 줄). 그래서 **검색 키**를 박아둬야 함

| **검색 키** | **언제 쓰나** |
| --- | --- |
| traceId | 같은 요청의 모든 로그를 묶을 때 |
| requestId | 개별 요청 단위로 구분할 때 |
| userId | 특정 사용자 문의가 들어왔을 때 |
| orderId | 특정 주문 추적 |
| serviceName | 어느 서비스에서 났는지 |
| errorCode | 에러 종류별 통계 |
| elapsedMs | 느린 요청만 골라낼 때 |

### Traces - 한 요청이 어디서 시간을 쓰는지

Logs로 안 풀리는 질문: "이 요청, **어디서** 느렸지?"

- 결제 한 요청이 여러 단계를 거침: 주문 조회 → 쿠폰 검증 → 결제 요청 → 카드사 통신 → 결과 저장 → 알림

- Logs만으로는 각 단계 시간을 직접 계산해 더해야 함 (새벽 2시에 힘듦)

- Trace는 **요청이 지나간 경로 전체를 시각화**

    ```javascript
    Trace ID: trc-001
    Order Service      ━ 120ms
    Payment Service    ━━━━━━━━━━ 3,200ms
    External PG        ━━━━━━━━━━ timeout
    ```

  | **구분** | **답하는 질문** | **예시** |
  | --- | --- | --- |
  | Metrics | 지금 이상한가 | 에러율 5%로 올랐다 |
  | Traces | 어디서 느렸나 | Payment → PG 구간 3.2초 |
  | Logs | 정확히 무슨 일이 | ORD-1004에서 PG_TIMEOUT |

### MSA에서 로그가 흩어지는 문제

- 모놀리식: 서버 하나에 로그가 다 모여서 `grep`/`tail`로 끝

- MSA: 한 요청이 여러 서비스를 거침 → 로그가 여러 서버에 흩어짐

- 진짜 어려운 점: "**이 4개 서비스 로그가 같은 요청에서 나온 게 맞나?**"
    - 분당 수천 건이라 시간만으로는 구분 불가

- 해결책: 같은 요청에는 같은 표식(ID)을 → **Trace ID**

### Trace ID - 흩어진 로그를 묶는 식별자

> 요청 하나에 발급되는 **고유 식별자**. (비유: 출장 번호 하나로 KTX/호텔/영수증을 다 묶는 것)
> - 같은 요청에서 나온 로그라면 전부 같은 ID → `trc-001`로 검색하면 모든 서비스 로그가 한 화면에

- **전파 방법**: 다음 서비스를 호출할 때 traceId를 **HTTP 헤더**에 실어 보냄 (Body는 스키마 변경, URL은 지저분 → 헤더가 자연스러움)

- **표준 헤더 =** **`traceparent`** (W3C Trace Context)
    - 회사마다 헤더 이름이 다르면 연동 안 되니 표준화

    - 값 예시: `00-4bf92f...4736-00f067...02b7-01` (버전 - trace-id - parent-id - 옵션)

    - 외울 필요 없음. 도구가 자동 생성

### Span - 어느 '단계'에서 느렸는지

- traceId만으로는 '어느 요청'인지는 알지만 '그 요청의 **어느 단계**'인지는 모름

- 각 단계마다 붙이는 ID = **spanId**

  | **구분** | **답하는 질문** |
  | --- | --- |
  | traceId | 어느 요청에서 났는가 |
  | spanId | 그 요청의 어느 단계에서 났는가 |

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

### Spring Boot에서 traceId 만들기 - MDC

> **MDC** (Mapped Diagnostic Context): "지금 요청을 처리하는 스레드에 꼬리표를 달아둔다"
> - 요청 시작 시점에 한 번만 MDC에 넣어두면, 그 요청의 **모든 로그에 traceId 자동 부착**

- 사용법

    ```java
    MDC.put("traceId", UUID.randomUUID().toString()); // 1. 입구에서 넣기
    log.info("Order created. orderId={}", order.getId()); // 2. 자동 부착
    MDC.clear(); // 3. 끝나면 반드시 지우기 (메모리 누수 방지)
    ```

- `logback-spring.xml`에 `%X{traceId}` 추가하면 출력 형식에 자동 포함

- 실무에서는 **Filter**(`OncePerRequestFilter`)에서 처리
    - 헤더에 traceId 있으면 이어받고, 없으면 새로 생성 (다른 서비스에서 받은 ID 이어가기)

    - 응답 헤더에도 실어 보내면 클라이언트도 추적 가능

    - `finally`에서 반드시 `MDC.clear()` (안 지우면 다음 요청에 이전 ID가 섞임)

- ⚠️ **주의: 비동기 작업에서는 traceId가 사라짐**
    - MDC는 `ThreadLocal` 기반 → `@Async`, `CompletableFuture`의 새 스레드에는 MDC가 비어 있음

    - 별도로 traceId를 옮겨주거나, **Micrometer Tracing**(구 Spring Cloud Sleuth) 사용 시 자동 전파

    - 단, 처음엔 MDC를 직접 짜보는 게 원리 이해에 좋음

### 실무 사례 - 토스 페이먼츠 (SLASH)

- **GlobalTrace ID**: Trace ID 위에 얹는 상위 ID
    - 화면 전환마다 새 Trace ID가 생기는 문제 → 사용자 시나리오 전체(결제 정보 → 진행 → 완료)를 하나로 묶음

  | **ID 종류** | **묶는 범위** |
  | --- | --- |
  | Trace ID | 하나의 요청 |
  | GlobalTrace ID | 사용자 시나리오 전체 |

- **traceId를 프론트엔드(브라우저)에서 생성** → JS 크래시, 네트워크 끊김 같은 클라이언트 에러까지 묶임

- **도구는 역할별로 나누되 같은 ID로 묶음**: Sentry(에러) / Pinpoint(APM) / MDC(로그 전파)

- 핵심은 도구 선택이 아니라 **같은 ID로 묶는 설계**

### 로그에 절대 남기면 안 되는 정보

- 금지: 비밀번호, 주민번호, 카드번호(전체), CVC/CVV, 인증 토큰(JWT/OAuth), 세션 ID, 의료 정보, 계좌번호

- **가장 흔한 실수**: 요청 객체 통째로 찍기 `log.info("Request: {}", requestDto)` → 평문 노출

- 안전한 방식: **필요한 것만 골라 찍기** (traceId, orderId, userId, amount 등)

- 어쩔 수 없으면 **마스킹**: `1234-5678-9012-3456` → `1234-****-****-3456`, 또는 `cardLast4: "3456"`

### 실무 도구 - 자리(역할)별 이해

> 도구 이름 외우기 X, **각 도구가 어느 자리에 있는지** 이해하기 O
> - 데이터 흐름: 애플리케이션 → 수집기 → 저장소 → 시각화 → 활용

- **OpenTelemetry (OTel)**: 데이터 형식/전송 방식의 **표준**. 한 번 계측하면 저장소·분석 도구를 바꿔도 코드 수정 불필요 → 사실상 업계 표준

- **수집기**: 데이터를 받아 적절한 저장소로 전달 (필터링/마스킹 가능). OTel Collector, Fluent Bit(가벼움, k8s), Fluentd, Logstash, Vector

- **저장소** (종류별로 다름)
    - 지표: **Prometheus** (시계열, 사실상 표준)

    - 로그: **ELK**(무거움) vs **Loki**(가벼움, Grafana 진영) → 요즘 Loki 추세

    - Trace: **Jaeger**(Uber, CNCF), **Zipkin**(Twitter, 한국 자바에서 자주), 최근 **Tempo**(Grafana)

    - 에러 트래킹: **Sentry** (에러만 모아 그룹화. 한국 스타트업·중견에서 매우 흔함)

- **시각화**: **Grafana**(거의 모든 저장소 연동), **Kibana**(ELK 전용)

- **통합 SaaS**: Datadog(가장 널리), New Relic, Dynatrace → 편하지만 데이터 많아지면 비용 급증

- **클라우드 기본 제공**: AWS **CloudWatch**(신입이 가장 먼저 접할 가능성 높음), GCP Cloud Operations, Azure Monitor

- **한국에서 자주 보는 APM**: **Pinpoint**(네이버, 자바·MSA 특화), **Scouter**(LG CNS)

  | **환경** | **자주 보이는 조합** |
  | --- | --- |
  | 초기 스타트업 | Sentry + CloudWatch 또는 Datadog |
  | 중간 규모 | Sentry + 통합 SaaS |
  | 쿠버네티스 | Prometheus + Grafana + Loki + Tempo |
  | ELK 기반 | Elasticsearch + Logstash + Kibana + Beats |
  | 한국 대기업/금융 | Pinpoint 또는 Jennifer + 자체 로그 시스템 |

→ 도구는 바뀌어도 **자리는 그대로**. 핵심: **같은 요청을 묶는 ID가 있고, 여러 도구가 그 ID로 연결**

### 장애 대응 6단계

1. **요청이 들어왔는지** access log 확인 → 안 들어왔으면 Gateway/LB/인증/네트워크 의심 (코드 볼 필요 X)

2. **규모 파악**(Metrics): 에러율·p95 변화, 특정 API만인지 전체인지, 인스턴스 하나인지 클러스터 전체인지

3. **문제 요청 식별**: traceId/requestId/userId/orderId 중 하나 확보 (고객 문의가 있으면 그 사용자부터)

4. **실패 구간 좁히기**: 앞에서부터 어디까지 성공했는지 확인 (거꾸로 X)

5. **MSA면 traceId로 로그 연결**: 여러 서비스 로그를 한 번에

6. **원인 후보 정리**: 코드(스택 트레이스) / DB(slow query, 커넥션) / 외부 API(timeout, 5xx) / 네트워크 / 메시징(Consumer lag) / 리소스(CPU·메모리·디스크)

→ 원인이 좁혀지면 조치 결정 (외부 PG면 외부 연락, 내부 코드면 핫픽스)

### 전체 흐름 한 번에 (결제 timeout 시나리오)

1. **Metrics**: payment-service만 에러율 0.1%→8%, p95 250ms→3,200ms (order/coupon 정상) → 외부 의존성 의심

2. **한 요청 골라 traceId 확인**: `orderId=ORD-1004 → traceId=trc-001`

3. **traceId로 모든 서비스 로그 수집**: payment-service에서 외부 PG 호출 3.2초 후 timeout

4. **Trace 시각화**: Order 120ms(성공) / Payment 3,200ms(실패) / PG timeout

5. **결론**: 최종 원인 = 외부 결제사 응답 지연
    - 조치: ① 외부 결제사 연락 ② 실패 사용자 알림 ③ 재시도 정책 검토 ④ timeout 임계치 재검토

→ **흐름을 따라가면 분석이 빠르게 좁혀진다**

## 문제 & 오류

### Exception 객체란?

Exception 객체는 프로그램 실행 중 오류가 발생했을 때, 그 오류에 대한 상세 정보를 담고 있는 객체이다.

단순히 “에러가 발생했다”는 사실만 담는 것이 아니라, 어떤 에러가 발생했는지, 왜 발생했는지, 어느 위치에서 발생했는지를 추적할 수 있는 정보를 포함한다.

- **예시 코드**

    ```java
    try {
        paymentService.pay(orderId);
    } catch (Exception e) {
        log.error("결제 실패", e);
    }
    ```

    위 코드에서 e가 바로 Exception 객체이다.

- **Exception 객체에 담기는 정보**<br>
    Exception 객체에는 보통 다음과 같은 정보가 포함된다.

    1. 어떤 예외가 발생했는지
        - 예: NullPointerException, IllegalArgumentException

    2. 예외 메시지
        - 예: "주문 정보를 찾을 수 없습니다."

    3. 예외가 발생한 위치
        - 어느 클래스, 어느 메서드, 어느 줄에서 발생했는지

    4. 호출 흐름
        - 어떤 메서드들을 거쳐서 예외가 발생했는지

        - 이를 스택 트레이스(Stack Trace)라고 한다.

- **잘못된 로그 예시**

    ```java
    log.error("결제 실패");
    ```

    이렇게 작성하면 로그에는 단순히 “결제 실패”라는 메시지만 남는다.

    따라서 다음과 같은 정보를 알 수 없다.

    - 어떤 주문에서 실패했는지

    - 왜 실패했는지

    - 어느 코드에서 실패했는지

    - 어떤 메서드 흐름에서 문제가 발생했는지

    즉, 에러 원인을 추적하기 어렵다.

- **좋은 로그 예시**

    ```java
    java log.error("결제 실패", e);
    ```

    이렇게 Exception 객체를 함께 넘기면, 에러 메시지뿐만 아니라 스택 트레이스도 함께 로그에 남는다.

    이를 통해 개발자는 다음 정보를 확인할 수 있다.

    - 실제 발생한 예외 타입

    - 예외 메시지

    - 예외가 발생한 코드 위치

    - 예외가 전파된 메서드 호출 흐름

- **정리**<br>
    Exception 객체는 에러의 원인과 발생 위치를 추적할 수 있게 해주는 정보 덩어리이다.

    따라서 실패 로그를 남길 때는 단순히 메시지만 남기기보다, 가능하면 Exception 객체도 함께 넘겨야 한다.

### 동기 비동기 - 비동기 작업에서는 traceId가 사라짐

- **이유**: MDC는 `ThreadLocal` 기반으로 동작한다. 즉, traceId는 "그 요청을 처리하는 스레드 하나"에만 묶여 있는 메모장이다.

- `@Async`나 `CompletableFuture` 같은 비동기 작업은 **새로운 스레드**에서 실행된다. 그 스레드의 MDC는 비어 있으므로 traceId가 따라가지 않고 사라진다.

    ```java
    log.info("Before async");  // traceId=trc-001 (메인 스레드)
    CompletableFuture.runAsync(() -> {
        log.info("Inside async");  // traceId 없음 (다른 스레드)
    });
    ```

- **해결**
    - 별도로 traceId를 새 스레드로 옮겨준다 (예: 실행 전 MDC 값을 귫 넣어주는 래퍼).

    - **Micrometer Tracing**(구 Spring Cloud Sleuth)을 쓰면 비동기 traceId 전파가 자동으로 처리된다. `traceparent` 표준 헤더도 자동 생성.

    - 다만 처음엔 MDC를 직접 짜보는 게 원리 이해에 좋다 (라이브러리가 무엇을 대신해주는지 알 수 있음).
