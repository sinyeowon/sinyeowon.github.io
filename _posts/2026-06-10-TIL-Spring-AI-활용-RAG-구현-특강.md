---
title: "[TIL] Spring AI 활용 - RAG 구현 특강"
date: 2026-06-10 09:00:00 +0900
last_modified_at: 2026-06-11 00:56:00 +0900
categories: ["Spring 단기 심화", "특강"]
tags: ["Spring AI", "RAG"]
description: "Spring AI 활용 RAG 구현 특강에 대한 학습 내용을 정리한 글입니다."
description_source: "manual"
english_url: "/en/posts/TIL-Spring-AI-활용-RAG-구현-특강/"
notion_id: "37b7788a-fc66-8061-b853-e5bb66d0821b"
notion_lang: "ko"
---
<details markdown="1">
<summary><strong>기본 개념 (Spring AI, RAG)</strong></summary>

Spring AI와 RAG는 자주 같이 쓰이는 개념이라 함께 보면 이해가 빠릅니다.

- **Spring AI**는 Spring 진영에서 나온 프레임워크로, 자바/Spring 애플리케이션에서 AI 모델을 쉽게 다룰 수 있게 해주는 추상화 계층입니다. OpenAI, Anthropic, Azure, Ollama 같은 여러 AI 제공자를 거의 같은 코드로 호출할 수 있게 통일된 API를 제공하는 게 핵심입니다. 채팅 모델, 임베딩 모델, 이미지 생성, 벡터 저장소(Vector Store) 연동, 함수 호출(tool calling) 같은 기능을 Spring스러운 방식(빈 주입, 자동 설정 등)으로 쓸 수 있어서, JPA를 쓰듯 AI 기능을 붙일 수 있다고 생각하면 됩니다.

- **RAG(Retrieval-Augmented Generation, 검색 증강 생성)**는 LLM이 자기가 학습한 지식만으로 답하지 않고, 외부 데이터에서 관련 내용을 먼저 찾아온 뒤 그걸 참고해서 답을 만들게 하는 기법입니다. 흐름은 보통 이렇습니다:
    1. 문서를 잘게 쪼개(chunking) 임베딩으로 변환한 뒤 벡터 DB에 저장해 둡니다.

    2. 사용자가 질문하면 그 질문도 임베딩으로 바꿔서, 의미가 비슷한 문서 조각을 벡터 DB에서 검색합니다.

    3. 검색된 내용을 프롬프트에 함께 넣어 LLM에게 전달하고, 모델은 그 근거를 바탕으로 답변합니다.

    이렇게 하면 모델이 학습하지 못한 사내 문서나 최신 자료에 대해서도 답할 수 있고, 환각(없는 사실을 지어내는 현상)도 줄일 수 있습니다.

**둘의 관계**는, Spring AI가 RAG를 만들기 위한 부품들(임베딩 모델, VectorStore 추상화, 문서 로더, 프롬프트 조립용 Advisor 등)을 기본 제공한다는 점입니다. 특히 `QuestionAnswerAdvisor` 같은 걸 쓰면 "검색 → 프롬프트에 끼워넣기 → 호출" 과정을 상당 부분 자동으로 처리해줘서, 자바 환경에서 RAG 파이프라인을 비교적 적은 코드로 구성할 수 있습니다.

<details markdown="1">
<summary>예시 코드</summary>

네, Spring AI로 RAG를 구성하는 핵심 흐름을 코드로 보여드릴게요. 크게 (1) 의존성/설정 → (2) 문서 적재(ingestion) → (3) 질의(query) 세 단계로 나눠서 보겠습니다.

먼저 한 가지 짚고 넘어가면, Spring AI는 1.0 GA 전후로 API가 꽤 바뀌어 왔습니다. 아래는 1.0 기준 코드인데, 실제 버전에 따라 클래스명이나 메서드 시그니처가 조금 다를 수 있으니 마지막에 공식 문서 확인을 권합니다.

**1. 의존성 (Maven)**

OpenAI 모델 + PGVector(벡터 DB)를 쓰는 예시입니다.

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-openai</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-pgvector</artifactId>
</dependency>
```

**2. 설정 (****`application.yml`****)**

```yaml
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
      chat:
        options:
          model: gpt-4o
      embedding:
        options:
          model: text-embedding-3-small
    vectorstore:
      pgvector:
        initialize-schema: true   # 벡터 테이블 자동 생성
        dimensions: 1536          # 임베딩 모델 차원에 맞춤
```

여기까지 하면 `EmbeddingModel`, `ChatModel`, `VectorStore` 빈이 자동 설정으로 주입 준비됩니다.

**3. 문서 적재 — 문서를 쪼개서 벡터 DB에 저장**

```java
@Service
public class IngestionService {

    private final VectorStore vectorStore;

    public IngestionService(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    public void ingest(Resource pdfResource) {
        // 1) 문서 읽기 (PDF, 텍스트 등 Reader 종류 다양)
        var reader = new TikaDocumentReader(pdfResource);
        List<Document> documents = reader.get();

        // 2) 청킹: 긴 문서를 의미 단위로 잘게 분할
        var splitter = new TokenTextSplitter();
        List<Document> chunks = splitter.apply(documents);

        // 3) 임베딩 변환 + 저장 (add 내부에서 EmbeddingModel이 자동 호출됨)
        vectorStore.add(chunks);
    }
}
```

`vectorStore.add()`를 호출하면 각 청크가 임베딩 벡터로 변환되어 PGVector에 저장됩니다. 임베딩 호출을 직접 짤 필요가 없는 게 Spring AI의 편한 점입니다.

**4. 질의 — RAG 핵심 부분**

여기서 `QuestionAnswerAdvisor`가 "질문 임베딩 → 유사 문서 검색 → 프롬프트에 끼워넣기"를 자동으로 처리합니다.

```java
@Service
public class RagService {

    private final ChatClient chatClient;

    public RagService(ChatClient.Builder builder, VectorStore vectorStore) {
        this.chatClient = builder
            .defaultAdvisors(new QuestionAnswerAdvisor(vectorStore))
            .build();
    }

    public String ask(String question) {
        return chatClient.prompt()
            .user(question)
            .call()
            .content();
    }
}
```

이게 전부입니다. `ask("환불 정책이 어떻게 되나요?")`를 호출하면 내부적으로:

1. 질문을 임베딩으로 변환

2. VectorStore에서 의미가 비슷한 문서 청크를 검색

3. 검색 결과를 시스템 프롬프트에 붙여서 LLM에 전달

4. 그 근거를 바탕으로 답변 생성

이 과정이 Advisor 한 줄로 처리됩니다.

**검색 옵션을 조절하고 싶다면** Advisor 생성 시 검색 개수나 유사도 임계값을 줄 수 있습니다.

```java
new QuestionAnswerAdvisor(
    vectorStore,
    SearchRequest.builder()
        .topK(5)                  // 상위 5개 청크만 사용
        .similarityThreshold(0.7) // 유사도 0.7 이상만
        .build()
);
```

직접 더 세밀하게 제어하고 싶으면 Advisor를 안 쓰고 `vectorStore.similaritySearch()`로 검색한 뒤 프롬프트를 손수 조립하는 방식도 가능합니다.

```java
List<Document> docs = vectorStore.similaritySearch(
    SearchRequest.builder().query(question).topK(5).build()
);
String context = docs.stream()
    .map(Document::getText)
    .collect(Collectors.joining("\n\n"));
// context를 직접 프롬프트 템플릿에 넣어서 chatClient 호출
```

정리하면, Spring AI는 RAG의 정형화된 부분(임베딩, 검색, 프롬프트 조립)을 추상화해줘서, 위처럼 핵심 로직만 짜면 됩니다.

버전에 따라 패키지 경로(`org.springframework.ai.chat.client...`)나 빌더 API가 달라질 수 있으니, 실제 적용 전에 [Spring AI 공식 문서](https://docs.spring.io/spring-ai/reference/)에서 본인이 쓰는 버전을 확인하시는 게 안전합니다.

</details>

</details>

<hr>

## 배운 내용

### Spring AI 전체 개발 모델

Spring AI는 LLM을 호출하는 단순 래퍼가 아니라, Spring 애플리케이션에서 AI 모델과 외부 지식을 연결하기 위한 추상화 계층이다. 백엔드 개발자는 모델 제공자별 API를 직접 다루기보다, Sprign AI의 ChatClient, ChatModel, EmbeddingModel, VectorStore, Advisor, Tool 같은 구성요소를 조합해서 애플리케이션 구조를 만든다.

프롬프트 엔지니어링은 system, user, template, format을 분리하는 문제다. 구조화된 출력은 AI 응답을 Java 객체로 다루는 문제다. 임베딩과 벡터 저장소는 문서를 검색 가능한 형태로 바꾸는 문제다. RAG는 검색 결과를 프롬프트에 주입하는 문제다. 도구 호출은 모델이 직접 할 수 없는 일을 애플리케이션 함수로 위임하는 문제다. MCP와 Agent는 이 도구 연결과 판단 구조를 확장하는 방향이다.

```plaintext
Spring Boot 기준 패키지 예시
src/main/java/com/example/springai
├── chat
│   ├── ChatController.java
│   ├── ChatService.java
│   └── dto
├── prompt
│   └── PromptCatalog.java
├── structured
│   ├── InquiryAnalysisResponse.java
│   └── InquiryAnalysisService.java
├── rag
│   ├── DocumentIngestionService.java
│   ├── RagChatService.java
│   └── RagController.java
├── tool
│   ├── OrderTools.java
│   └── ToolChatService.java
└── agent
    └── AgentRouterService.java
```

### 백엔드 계층에서 AI를 배치하는 법

Spring AI를 서비스에 붙일 때 가장 먼저 정해야 하는 것은 “AI 호출을 어느 계층의 책임으로 볼 것인가”다. AI 호출은 단순 외부 API 호출처럼 보이지만, 실제로는 프롬프트 정책, 응답 형식, 실패 처리, 비용, 로그, 도구 권한, 문서 검색 품질이 함께 얽힌다. 그래서 별도의 AI Service 계층으로 분리하는 편이 운영에 유리하다.

Controller는 HTTP 요청과 응답을 담당한다. Application Service는 사용자의 요청이 서비스 정책상 가능한지 검증하고, 필요한 비즈니스 흐름을 결정한다. AI Service는 ChatClient, Advisor, Tool, VectorStore를 조합한다. 외부 모델, 벡터DB, 사내 API는 AI Service 뒤에 있는 외부 자원으로 본다.

```java
// 기본 요청 DTO
package com.example.springai.chat.dto;

public record ChatRequest(
        String message
) {}

// 기본 응답 DTO
package com.example.springai.chat.dto;

public record ChatResponse(
        String answer
) {}

// Controller 예시
package com.example.springai.chat;

import com.example.springai.chat.dto.ChatRequest;
import com.example.springai.chat.dto.ChatResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping
    public ChatResponse chat(@RequestBody ChatRequest request) {
        return new ChatResponse(chatService.ask(request.message()));
    }
}
```

AI 기능도 결국 HTTP 요청을 받고, 서비스 계층에서 처리하고, DTO로 응답하는 일반적인 Spring Boot 구조 안에 들어간다는 것을 먼저 봐야 한다.

### ChatClient 요청 시퀀스

ChatClient는 Spring AI에서 LLM과 대화하기 위한 대표적인 진입점이다. 공식 문서에서도 ChatClient는 AI 모델과 통신하기 위한 fluent API이며, 동기 호출과 스트리밍 호출 모델을 지원하는 방식으로 설명된다. 강의에서는 이 설명을 “Spring 개발자가 WebClient나 RestClient처럼 사용할 수 있는 AI 호출 클라이언트”라고 풀어 말하면 이해가 빠르다.

처음 예제는 복잡할 필요가 없다. user()에 사용자 메시지를 넣고, call()로 모델을 호출하고, content()로 문자열 응답을 받는다. 이때 중요한 것은 “이 단계는 아직 가장 단순한 LLM 호출”이라는 점이다. RAG도 없고, 구조화 출력도 없고, 도구 호출도 없다. 이 단순 호출을 기준선으로 만든 뒤 기능을 하나씩 얹는다.

**ChatService 예시**

```java
package com.example.springai.chat;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
public class ChatService {

    private final ChatClient chatClient;

    public ChatService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public String ask(String message) {
        return chatClient.prompt()
                .user(message)
                .call()
                .content();
    }
}
```

### Chat Model API와 ChatClient

ChatModel은 모델 호출의 더 낮은 수준 추상화이고, ChatClient는 애플리케이션 코드에서 사용하기 좋은 fluent API다. 학생들에게는 “모델 호출의 엔진은 ChatModel이고, 우리가 서비스 코드에서 주로 만지는 손잡이는 ChatClient”라고 설명할 수 있다.

실무에서는 ChatClient를 그냥 매번 새로 만들기보다, 기본 시스템 프롬프트나 공통 Advisor를 붙인 Bean으로 구성해두는 경우가 많다. 예를 들어 모든 답변을 한국어로 하게 하거나, 답변 스타일을 제한하거나, 로깅 Advisor를 붙이는 방식이다.

```java
공통 ChatClient Bean 예시
package com.example.springai.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiClientConfig {

    @Bean
    ChatClient serviceChatClient(ChatClient.Builder builder) {
        return builder
                .defaultSystem("""
                        당신은 Spring Boot 백엔드 개발자를 돕는 AI 어시스턴트입니다.
                        답변은 한국어로 작성하고, 모르는 내용은 추측하지 않습니다.
                        코드 예시는 설명 가능한 최소 단위로 제공합니다.
                        """)
                .build();
    }
}

서비스에서 Bean 주입
package com.example.springai.chat;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
public class GuideChatService {

    private final ChatClient serviceChatClient;

    public GuideChatService(ChatClient serviceChatClient) {
        this.serviceChatClient = serviceChatClient;
    }

    public String answer(String question) {
        return serviceChatClient.prompt()
                .user(question)
                .call()
                .content();
    }
}
```

### 프롬프트 엔지니어링 레이어

프롬프트 엔지니어링은 멋진 문장을 쓰는 기술이 아니다. 백엔드 관점에서는 프롬프트를 운영 가능한 입력 계약으로 만드는 일이다. 질문만 모델에 던지면 답변 품질은 매번 달라진다. 그래서 역할, 업무 맥락, 입력 변수, 출력 형식, 금지 조건을 분리해서 관리해야 한다.

```java
PromptTemplate 예시
package com.example.springai.prompt;

import java.util.Map;
import org.springframework.ai.chat.prompt.PromptTemplate;

public class PromptCatalog {

    public static String customerSupportPrompt(String product, String question) {
        var template = new PromptTemplate("""
                당신은 {product} 서비스의 고객지원 담당자입니다.
                사용자의 질문을 읽고, 다음 기준으로 답변하세요.

                기준:
                - 확인되지 않은 정책은 단정하지 않는다.
                - 사용자가 바로 할 수 있는 다음 행동을 제안한다.
                - 답변은 5문장 이내로 작성한다.

                사용자 질문:
                {question}
                """);

        return template.render(Map.of(
                "product", product,
                "question", question
        ));
    }
}

프롬프트 적용 서비스
package com.example.springai.prompt;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
public class PromptedChatService {

    private final ChatClient chatClient;

    public PromptedChatService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public String answerSupportQuestion(String product, String question) {
        String prompt = PromptCatalog.customerSupportPrompt(product, question);

        return chatClient.prompt()
                .user(prompt)
                .call()
                .content();
    }
}
```

```java
나쁜 프롬프트와 좋은 프롬프트
나쁜 예:
"이 질문에 답해줘: {question}"

좋은 예:
"너의 역할은 무엇인지, 어떤 기준으로 답해야 하는지,
출력 형식은 무엇인지, 모르면 어떻게 해야 하는지"가 포함된 프롬프트
```

### Structured Output 변환 흐름

자연어 답변은 사람이 읽기 좋지만 시스템이 처리하기 어렵다. 실무 서비스에서는 AI 응답을 화면에 보여주는 것만으로 끝나지 않는다. 응답을 DB에 저장하거나, 위험도를 기준으로 알림을 보내거나, 다음 로직을 분기하거나, Tool Calling 여부를 판단해야 한다. 이때 필요한 것이 구조화된 출력이다.

Spring AI의 Structured Output은 모델의 텍스트 출력을 Java 객체나 리스트 같은 구조로 변환하는 흐름으로 이해하면 된다. 강의에서는 “AI 응답을 DTO로 받는다”는 표현이 가장 직관적이다.

```java
분석 결과 DTO
package com.example.springai.structured;

public record InquiryAnalysisResponse(
        String intent,
        String summary,
        String riskLevel,
        String nextAction
) {}

구조화 출력 서비스 예시
package com.example.springai.structured;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
public class InquiryAnalysisService {

    private final ChatClient chatClient;

    public InquiryAnalysisService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public InquiryAnalysisResponse analyze(String message) {
        return chatClient.prompt()
                .system("""
                        고객 문의를 분석하는 분류기입니다.
                        intent는 BILLING, BUG, ACCOUNT, GENERAL 중 하나로 작성하세요.
                        riskLevel은 LOW, MEDIUM, HIGH 중 하나로 작성하세요.
                        nextAction은 담당자가 바로 실행할 수 있는 행동으로 작성하세요.
                        """)
                .user(message)
                .call()
                .entity(InquiryAnalysisResponse.class);
    }
}

예상 응답 형태
{
  "intent": "BUG",
  "summary": "사용자가 로그인 후 결제 내역을 확인하지 못하고 있다.",
  "riskLevel": "MEDIUM",
  "nextAction": "계정 ID와 결제 시각을 확인한 뒤 결제 이력 API를 조회한다."
}
```

### RAG 도입 이유

LLM 단독 답변은 모델이 이미 알고 있는 일반 지식에 의존한다. 이 방식은 사내 정책, 최신 공지, 프로젝트 문서, 고객별 데이터처럼 모델이 학습하지 않은 정보에는 약하다. 그래서 실무에서는 모델에게 “그럴듯하게 말하게” 하는 것이 아니라, 답변에 사용할 문서를 먼저 찾아서 함께 제공해야 한다.

RAG는 Retrieval Augmented Generation의 약자다. 한국어로 풀면 검색 증강 생성이다. 핵심은 모델을 다시 학습시키는 것이 아니다. 질문 시점에 관련 문서를 검색하고, 그 검색 결과를 컨텍스트로 넣어 답변을 생성하는 구조다.

**RAG가 필요한 질문 예시**

1. 우리 회사 환불 정책에서 7일 이후 환불은 어떻게 처리하나요?

2. 지난주에 업데이트된 API 인증 방식은 무엇인가요?

3. 사내 온보딩 문서 기준으로 신규 개발자가 먼저 해야 할 일은 무엇인가요?

이 질문들은 모델의 일반 지식으로 답하면 위험하다. 답변이 그럴듯해도 실제 사내 문서와 다를 수 있기 때문이다. RAG는 이런 질문에 대해 “먼저 문서를 찾고, 찾은 문서 안에서 답한다”는 구조를 만든다.

### Naive RAG: 두 개의 시퀀스

Naive RAG는 가장 기본적인 RAG 구조다. 강의에서는 Naive RAG를 “문서를 벡터로 저장하는 과정”과 “질문할 때 관련 문서를 검색하는 과정”으로 나누어 설명해야 한다. 많은 학생들이 RAG를 한 번의 API 호출로 오해하지만, 실제로는 문서 적재 시퀀스와 질문 시퀀스가 분리되어 있다.

**문서 적재 시퀀스**

문서 읽기

- > 청크 분할

- > 임베딩 생성

- > VectorStore 저장

**질문 시퀀스**

사용자 질문

- > 질문 임베딩

- > VectorStore 유사도 검색

- > 관련 문서 반환

- > 프롬프트 컨텍스트 주입

- > 답변 생성

    ```java
    문서 적재 서비스 예시
    package com.example.springai.rag;

    import java.util.List;
    import org.springframework.ai.document.Document;
    import org.springframework.ai.reader.TextReader;
    import org.springframework.ai.transformer.splitter.TokenTextSplitter;
    import org.springframework.ai.vectorstore.VectorStore;
    import org.springframework.core.io.Resource;
    import org.springframework.stereotype.Service;

    @Service
    public class DocumentIngestionService {

        private final VectorStore vectorStore;

        public DocumentIngestionService(VectorStore vectorStore) {
            this.vectorStore = vectorStore;
        }

        public void ingest(Resource resource) {
            TextReader reader = new TextReader(resource);
            List<Document> documents = reader.get();

            TokenTextSplitter splitter = new TokenTextSplitter();
            List<Document> chunks = splitter.apply(documents);

            vectorStore.add(chunks);
        }
    }
    ```

이 코드는 운영용 완성 코드가 아니라 흐름을 보여주는 예제다. 실제 서비스에서는 파일 타입별 Reader, 중복 적재 방지, 문서 버전, 메타데이터, 삭제 정책이 추가된다.

### Spring AI RAG 구성요소

DocumentReader는 문서를 읽는다. TokenTextSplitter는 긴 문서를 검색 가능한 작은 단위로 나눈다.

EmbeddingModel은 텍스트를 벡터로 바꾼다.

VectorStore는 벡터를 저장하고 검색한다.

QuestionAnswerAdvisor는 ChatClient 호출 중간에서 관련 문서를 찾아 프롬프트에 넣는다.

```java
의존성 예시
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-bom</artifactId>
            <version>${spring-ai.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-model-openai</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-advisors-vector-store</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-vector-store-pgvector</artifactId>
    </dependency>
</dependencies>

설정 예시
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
      chat:
        options:
          model: gpt-4.1-mini
      embedding:
        options:
          model: text-embedding-3-small
    vectorstore:
      pgvector:
        initialize-schema: true
```

### QuestionAnswerAdvisor 시퀀스

QuestionAnswerAdvisor는 Naive RAG를 설명하기 좋은 구성요소다. ChatClient 호출에 Advisor를 붙이면, 사용자의 질문을 기준으로 VectorStore에서 관련 문서를 찾고, 그 결과를 프롬프트 컨텍스트에 주입한 뒤 모델을 호출한다.

Advisor는 단순한 옵션이 아니라 호출 전후에 개입하는 구조다. Spring AI의 Advisor API는 요청을 보강하거나, 다음 체인으로 넘기거나, 응답을 다시 처리할 수 있는 확장 지점으로 이해하면 된다. RAG에서는 이 확장 지점이 “검색된 문서를 프롬프트에 넣는 위치”가 된다.

```java
RAG ChatService 예시
package com.example.springai.rag;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

@Service
public class RagChatService {

    private final ChatClient chatClient;

    public RagChatService(ChatClient.Builder builder, VectorStore vectorStore) {
        this.chatClient = builder
                .defaultSystem("""
                        제공된 문서 컨텍스트를 우선하여 답변하세요.
                        문서에서 근거를 찾을 수 없으면 모른다고 답하세요.
                        답변 마지막에는 참고한 근거를 짧게 요약하세요.
                        """)
                .defaultAdvisors(new QuestionAnswerAdvisor(vectorStore))
                .build();
    }

    public String askWithDocuments(String question) {
        return chatClient.prompt()
                .user(question)
                .call()
                .content();
    }
}

RAG Controller 예시
package com.example.springai.rag;

import com.example.springai.chat.dto.ChatRequest;
import com.example.springai.chat.dto.ChatResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rag")
public class RagController {

    private final RagChatService ragChatService;

    public RagController(RagChatService ragChatService) {
        this.ragChatService = ragChatService;
    }

    @PostMapping
    public ChatResponse ask(@RequestBody ChatRequest request) {
        return new ChatResponse(ragChatService.askWithDocuments(request.message()));
    }
}
```

**질문**

이 코드에서 RAG는 어디에 붙었나요?

답 :  Controller가 아니라 ChatClient 구성의 Advisor입니다.

### Naive RAG 한계

Naive RAG는 반드시 배워야 하는 기본형이지만, 운영에서는 이 구조만으로 충분하지 않은 경우가 많다. 질문이 애매하면 검색 쿼리가 약해진다. 문서 청크가 너무 크면 핵심 문장이 묻히고, 너무 작으면 문맥이 끊긴다. 유사도 검색만으로는 가장 중요한 문서가 항상 위에 오지 않는다. 검색 결과가 프롬프트에 들어가도 모델이 근거를 충분히 반영하지 않을 수 있다.

**Naive RAG 점검 체크리스트**

| 점검 항목 | 확인 질문 |
| --- | --- |
| 문서 품질 | 검색할 문서 자체가 최신인가? |
| 청크 전략 | 한 청크에 하나의 의미 단위가 들어가는가? |
| 메타데이터 | 부서, 버전, 날짜, 문서 타입을 저장했는가? |
| 검색 쿼리 | 사용자 질문을 그대로 검색해도 충분한가? |
| 응답 검증 | 답변이 검색 문서에 근거하고 있는가? |

```java
청크 메타데이터 예시
Document chunk = new Document(
        "환불은 결제일 기준 7일 이내 요청할 수 있습니다.",
        Map.of(
                "source", "refund-policy.md",
                "version", "2026-06",
                "domain", "billing"
        )
);
```

<hr>

## QnA

**Q PGVector를 사용하는 이유**

- **PGVector**
    - PostgreSQL의 확장

    - 별도의 새로운 DB가 아니라, 우리가 흔히 쓰는 관계형 DB인 PostgreSQL에 ‘벡터를 저장하고 검색하는 기능’을 추가로 붙여주는 플러그인

- 왜 벡터 저장이 따로 필요한가<br>
    RAG에서는 문서를 임베딩으로 바꾸면 `[0.013, -0.072, 0.45, ...]` 처럼 숫자가 수백~수천 개 늘어선 벡터가 됩니다. 그리고 질문이 들어오면 "이 질문 벡터와 의미가 가장 가까운 문서 벡터들"을 찾아야 하죠. 그런데 일반적인 DB의 `WHERE` 검색은 "값이 정확히 같은가"를 따지는 데 특화돼 있지, "벡터끼리 의미가 얼마나 비슷한가(거리 계산)"를 빠르게 하는 데는 맞지 않습니다.

    그래서 등장한 게 **벡터 데이터베이스**입니다. 벡터를 저장하고, 코사인 유사도나 유클리드 거리 같은 걸로 "가장 가까운 벡터 N개"를 빠르게 찾아주는 데 특화된 저장소예요. PGVector는 그 기능을 PostgreSQL 안에 넣어준 것이고요.

- PGVector를 쓰는 이유<br>
    가장 큰 이유는 **이미 PostgreSQL을 쓰고 있는 경우가 많다**는 점입니다. 새로운 인프라(별도 벡터 DB 서버)를 추가로 띄우고 운영할 필요 없이, 기존 DB에 확장만 설치하면 됩니다. 운영 부담이 줄고, 백업·모니터링·권한 관리 같은 걸 기존 PostgreSQL 체계 안에서 그대로 할 수 있죠. 또 벡터와 일반 데이터(예: 문서 제목, 작성일, 카테고리)를 **한 테이블에서 같이 다루며 조건 필터링과 벡터 검색을 함께** 할 수 있다는 것도 실무에서 큰 장점입니다.

    **다른 선택지도 있다**

    PGVector가 유일한 답은 아니고, 대표적으로 이런 것들이 있습니다.

  | 종류 | 특징 |
  | --- | --- |
  | **PGVector** | 기존 PostgreSQL 활용, 운영 단순, 중소 규모에 적합 |
  | **Chroma** | 가볍고 로컬 개발/프로토타이핑에 편함 |
  | **Milvus / Qdrant / Weaviate** | 대규모·고성능 벡터 검색에 특화된 전용 DB |
  | **Pinecone** | 관리형(서버리스) 클라우드 서비스, 운영 부담 적음 |
  | **Redis, Elasticsearch** | 기존에 쓰던 인프라에 벡터 기능 추가 |

    Spring AI는 이 대부분을 `VectorStore`라는 동일한 인터페이스로 추상화해놨기 때문에, 앞서 본 예제 코드에서 의존성과 설정만 바꾸면 PGVector → Chroma → Qdrant 식으로 갈아끼울 수 있습니다. 코드 로직은 거의 안 바뀌고요.

    **정리하면**, PGVector는 "이미 익숙한 PostgreSQL에 벡터 검색 기능을 더한 것"이고, 새로운 DB를 따로 운영하기 부담스러울 때 가장 무난하게 선택하는 출발점이라고 보면 됩니다. 처음 RAG를 만들어본다면 PGVector나 Chroma로 시작해서, 규모가 커지면 전용 벡터 DB로 옮겨가는 흐름이 일반적이에요.
