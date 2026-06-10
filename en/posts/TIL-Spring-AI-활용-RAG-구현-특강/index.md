---
layout: "post"
title: "[TIL] Utilizing Spring AI - Special lecture on RAG implementation"
date: 2026-06-10 09:00:00 +0900
last_modified_at: 2026-06-11 00:38:00 +0900
categories: ["Spring 단기 심화", "특강"]
tags: ["Spring AI", "RAG"]
description: "This article summarizes the contents of the special lecture on RAG implementation using Spring AI."
description_source: "excerpt"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-Spring-AI-활용-RAG-구현-특강/"
original_url: "/posts/TIL-Spring-AI-활용-RAG-구현-특강/"
notion_id: "37b7788a-fc66-8061-b853-e5bb66d0821b"
notion_lang: "en"
---
<details markdown="1">
<summary><strong>Basic concepts (Spring AI, RAG)</strong></summary>

Spring AI and RAG are concepts that are often used together, so they are easier to understand when viewed together.

- **Spring AI** is a framework from the Spring camp and is an abstraction layer that makes it easy to handle AI models in Java/Spring applications. The key is to provide a unified API so that multiple AI providers such as OpenAI, Anthropic, Azure, and Ollama can be called with almost the same code. Functions such as chat model, embedding model, image creation, vector store linking, and function calling can be used in a Spring-like manner (bean injection, automatic configuration, etc.), so you can think of it as adding AI functions like using JPA.

- **RAG (Retrieval-Augmented Generation)** is a technique that allows LLM to first find relevant content from external data and then refer to it to create an answer, rather than answering with only the knowledge it has learned. The flow is usually like this:
    1. Chunk the document, convert it into embeddings, and save it in the vector DB.

    2. When the user asks a question, the question is converted into an embedding and document fragments with similar meaning are searched in the vector database.

    3. The searched content is included in the prompt and delivered to the LLM, and the model answers based on the evidence.

    This allows the model to respond to in-house documents or up-to-date data that it has not learned, and reduces hallucinations (the phenomenon of making up facts that do not exist).

**The relationship between the two** is that Spring AI provides by default the parts for creating a RAG (embedding model, VectorStore abstraction, document loader, advisor for prompt assembly, etc.). In particular, if you use something like `QuestionAnswerAdvisor`, much of the “search → insert into prompt → call” process is automatically processed, allowing you to configure the RAG pipeline in a Java environment with relatively little code.

<details markdown="1">
<summary>Example code</summary>Yes, I will show you the core flow of configuring RAG with Spring AI in code. Let’s roughly divide it into three steps: (1) dependency/setting → (2) document loading → (3) query.

First of all, let's point out one thing: Spring AI's API has changed quite a bit since around 1.0 GA. Below is the 1.0 standard code, but the class name or method signature may be slightly different depending on the actual version, so we recommend checking the official documentation at the end.

**1. Dependencies (Maven)**

This is an example of using OpenAI model + PGVector (vector DB).

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

**2. Settings (****`application.yml`****)**

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

At this point, the `EmbeddingModel`, `ChatModel`, and `VectorStore` beans are ready for injection with automatic configuration.

**3. Loading documents — splitting documents and saving them to vector database**

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

By calling `vectorStore.add()`, each chunk is converted to an embedding vector and stored in a PGVector. What's convenient about Spring AI is that you don't have to make embedding calls yourself.

**4. Query — RAG core part**

Here, `QuestionAnswerAdvisor` automatically handles “Embedding question → Search similar documents → Insert into prompt”.

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

This is it. When you call `ask("환불 정책이 어떻게 되나요?")`, internally:

1. Convert the question into an embedding

2. Search for document chunks with similar meaning in VectorStore

3. Paste the search results into the system prompt and send them to LLM

4. Generate an answer based on the evidence

This process is done in one line by Advisor.

**If you want to adjust the search options**, you can specify the number of searches or similarity threshold when creating an advisor.

```java
new QuestionAnswerAdvisor(
    vectorStore,
    SearchRequest.builder()
        .topK(5)                  // 상위 5개 청크만 사용
        .similarityThreshold(0.7) // 유사도 0.7 이상만
        .build()
);
```

If you want more detailed control, you can search for `vectorStore.similaritySearch()` without using Advisor and assemble the prompt yourself.

```java
List<Document> docs = vectorStore.similaritySearch(
    SearchRequest.builder().query(question).topK(5).build()
);
String context = docs.stream()
    .map(Document::getText)
    .collect(Collectors.joining("\n\n"));
// context를 직접 프롬프트 템플릿에 넣어서 chatClient 호출
```

In summary, Spring AI abstracts the standardized parts of RAG (embedding, search, prompt assembly), so you only need to write the core logic as above.

The package path (`org.springframework.ai.chat.client...`) or builder API may vary depending on the version, so it is safe to check the version you use at [Spring AI 공식 문서](https://docs.spring.io/spring-ai/reference/) before actual application.

</details>

</details>

## What I Learned

### Spring AI overall development model

Spring AI is not a simple wrapper that calls LLM, but is an abstraction layer for connecting AI models and external knowledge in Spring applications. Rather than directly handling the API for each model provider, back-end developers create an application structure by combining components such as Sprign AI's ChatClient, ChatModel, EmbeddingModel, VectorStore, Advisor, and Tool.

Prompt engineering is a matter of separating system, user, template, and format. Structured output is a matter of treating AI responses as Java objects. Embedding and vector storage are a matter of converting documents into a searchable form. RAG is a matter of injecting search results into a prompt. Tool invocation is a matter of delegating work that the model cannot do directly to an application function. MCP and Agent aim to expand this tool connection and decision structure.

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

### How to deploy AI in the backend layer

The first thing to decide when attaching Spring AI to a service is “Which layer will be responsible for AI calls?” AI calls may seem like simple external API calls, but in reality they involve prompt policies, response formats, failure handling, costs, logs, tool permissions, and document retrieval quality. Therefore, it is more advantageous for operation to separate it into a separate AI Service layer.

Controller is responsible for HTTP requests and responses. Application Service verifies whether the user's request is possible according to the service policy and determines the necessary business flow. AI Service combines ChatClient, Advisor, Tool, and VectorStore. External models, vector DB, and internal API are viewed as external resources behind the AI ​​Service.
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

We must first see that the AI function ultimately falls within the general Spring Boot structure of receiving an HTTP request, processing it at the service layer, and responding with a DTO.

### ChatClient request sequence

ChatClient is the representative entry point for talking to LLM in Spring AI. The official documentation also explains that ChatClient is a fluent API for communicating with AI models and supports synchronous call and streaming call models. In the lecture, this explanation is easier to understand if it is explained as “an AI call client that Spring developers can use like WebClient or RestClient.”

The first example doesn't need to be complicated. Enter a user message in user(), call the model with call(), and receive a string response with content(). What is important here is that “this step is still the simplest LLM call.” There is no RAG, no structured output, and no tool calls. Make this simple call the baseline and then add functions one by one.

**ChatService example**

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

### Chat Model API and ChatClient

ChatModel is a lower-level abstraction of model calls, and ChatClient is a fluent API that is great for use in application code. You can explain to students, “The engine of model calls is ChatModel, and the handle we mainly touch in the service code is ChatClient.”

In practice, ChatClient is often configured as a bean with a basic system prompt or a common advisor, rather than just creating a new one each time. For example, all answers may be in Korean, the answer style may be limited, or a logging advisor may be added.

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

### Prompt Engineering Layer

Prompt engineering is not the art of writing nice sentences. From a backend perspective, it's about turning the prompt into an operational input contract. If you just ask a question to the model, the quality of the answer changes every time. Therefore, roles, work contexts, input variables, output formats, and prohibition conditions must be managed separately.

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

### Structured Output conversion flow

Natural language answers are easy for humans to read, but difficult for systems to process. In practical services, it does not end with just showing the AI ​​response on the screen. You need to save the response in the DB, send a notification based on risk, branch to the next logic, or determine whether to make a tool call. What is needed at this time is structured output.

Spring AI's Structured Output can be understood as a flow that converts a model's text output into a structure such as a Java object or list. In the lecture, the expression “Receive AI response as DTO” is the most intuitive.

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

### Reasons for introducing RAG

The LLM-only answer relies on general knowledge that the model already knows. This method is weak for information that the model did not learn, such as company policies, latest notices, project documents, and customer-specific data. So, in practice, rather than asking the model to “speak plausibly,” you should first find and provide documents to use in the answer.

RAG stands for Retrieval Augmented Generation. If you translate it into Korean, it means creating search augmentation. The key is not to retrain the model. It is a structure that searches related documents at the time of the question and generates an answer by putting the search results into context.

**Example questions requiring RAG**

1. How does our company’s refund policy handle refunds after 7 days?

2. What API authentication method was updated last week?

3. Based on the in-house onboarding document, what should a new developer do first?

These questions are dangerous to answer using general knowledge of the model. Even if the answer is plausible, it may be different from the actual in-house document. RAG creates a structure for these questions: “First find a document, then answer within the found document.”

### Naive RAG: two sequences

Naive RAG is the most basic RAG structure. In lectures, Naive RAG should be explained by dividing it into “the process of storing documents as vectors” and “the process of searching related documents when asking a question.” Many students misunderstand RAG as a single API call, but in reality, the document loading sequence and question sequence are separate.

**Document loading sequence**

Read the document

- > Chunk splitting

- > Create embedding

- > Save VectorStore

**Question Sequence**user questions

- > Question embedding

- > VectorStore similarity search

- > Return related documents

- > Prompt context injection

- > Create answer

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

This code is not a complete code for operation, but an example showing the flow. In the actual service, Reader for each file type, duplicate loading prevention, document version, metadata, and deletion policy are added.

### Spring AI RAG components

DocumentReader reads documents. TokenTextSplitter splits long documents into smaller, searchable chunks.

EmbeddingModel turns text into a vector.

VectorStore stores and retrieves vectors.

QuestionAnswerAdvisor finds relevant documents in the middle of the ChatClient call and places them in the prompt.

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

### QuestionAnswerAdvisor sequence

QuestionAnswerAdvisor is a good component to explain Naive RAG. When you attach Advisor to a ChatClient call, related documents are found in VectorStore based on the user's question, the results are injected into the prompt context, and the model is called.

Advisor is not just an option, but a structure that intervenes before and after the call. Spring AI's Advisor API can be understood as an extension point that can augment a request, pass it to the next chain, or reprocess the response. In RAG, this extension point is “where the retrieved document is placed in the prompt.”

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

**Question**

Where is RAG attached in this code?

Answer: Not the Controller, but the Advisor in the ChatClient configuration.

### Naive RAG limits

Naive RAG is a basic structure that must be learned, but in many cases, this structure alone is not enough for operation. If your question is vague, your search query will be weak. If the document chunk is too large, key sentences will be buried, and if the document chunk is too small, the context will be lost. Similarity search alone does not always bring the most important documents to the top. Even if search results are entered in the prompt, the model may not sufficiently reflect the evidence.

**Naive RAG Inspection Checklist**

| Check items | confirmation question |
| --- | --- |
| document quality | Is the document to be searched up-to-date? |
| chunk strategy | Does one chunk contain one unit of meaning? |
| metadata | Did you save the department, version, date, and document type? |
| search query | Is it enough to search user questions as is? |
| Response validation | Is the answer based on the searched document? |
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
