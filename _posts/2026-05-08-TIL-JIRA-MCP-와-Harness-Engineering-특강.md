---
title: "[TIL] JIRA MCP 와 Harness Engineering 특강"
date: 2026-05-08 09:00:00 +0900
last_modified_at: 2026-05-10 22:27:00 +0900
categories: ["Spring 단기 심화", "특강"]
tags: ["MCP", "GitOps", "Harness Engineering"]
description: "JIRA MCP와 Harness Engineering 특강을 바탕으로 MCP 표준, AI 에이전트 작업 환경, GitOps와 가시성의 중요성을 정리한 글입니다."
description_source: "manual"
english_url: "/en/posts/TIL-JIRA-MCP-와-Harness-Engineering-특강/"
notion_id: "35a7788a-fc66-807c-a149-fbf49dee905e"
notion_lang: "ko"
---
## 공부한 내용

### MCP (Model Context Protocol)

LLM은 똑똑하지만, 혼자서는 아무것도 못 함
→ 이 문제를 해결하려면 AI ↔ 외부 도구를 연결해야 하는데, 도구마다 API가 제각각임

- 기존 방식의 한계 - NxM 문제
  ![image](/assets/img/notion/TIL-JIRA-MCP-와-Harness-Engineering-특강/01-aa032549a0.png)

  - 통합이 제각각이라 표준이 없음

  - 한쪽이 바뀌면 다 깨짐

  - 새 도구가 나오면 모든 AI에서 또 만들어야 함

- **MCP의 해법 - 공통 프로토콜**<br>
  : Antropic이 2024년 11월에 공개한 개방형 표준 프로토콜로, AI 모델이 외부 시스템과 상호작용하는 공통 언어를 정의함

  - N+M
    ![image](/assets/img/notion/TIL-JIRA-MCP-와-Harness-Engineering-특강/02-9f14964a53.png)

    - 도구들에 대해 각자의 MCP를 만들어야 했지만, 이제는 AI 도구마다 하나의 MCP만 만들면 됨

- **MCP의 동작 구조**

  | 컴포넌트 | 역할 |
  | --- | --- |
  | **MCP Host** | AI가 동작하는 환경 (예: Claude Desktop, Cursor IDE) |
  | **MCP Client** | Host 안에 있으면서 서버와 통신하는 모듈 |
  | **MCP Server** | 외부 시스템(Jira, GitHub 등)을 MCP 표준으로 노출하는 게이트웨이 |

- **MCP가 노출하는 3가지 기본 단위**

  | 단위 | 설명 | Jira 예시 |
  | --- | --- | --- |
  | **Tools** | AI가 호출할 수 있는 함수 | `createIssue`, `searchIssues`, `addComment` |
  | **Resources** | AI가 읽을 수 있는 데이터 | 특정 이슈 본문, 스프린트 정보, 보드 상태 |
  | **Prompts** | 미리 정의된 프롬프트 템플릿 | "스탠드업 리포트 생성", "스프린트 회고 요약" |

→ 표준이 중요한 이유: AI가 도구 사이를 옮겨다니며 일하게 되었기 때문에, 도구마다 AI 통합 규격이 다르면, 결국 새로운 종류의 단절이 생김
⇒ MCP는 그 단절을 막기 위한 합의된 약속

### JIRA MCP - 실제 적용

![image](/assets/img/notion/TIL-JIRA-MCP-와-Harness-Engineering-특강/03-b804d67f9b.png)

- Atlassian Remote MCP Server<br>
  : Atlassian은 2025년 5월 Remote MCP Server를 공식 발표함 (현재 Rovo MCP Server 명칭으로도 사용)

  - 특징

  | 항목 | 내용 |
  | --- | --- |
  | **호스팅** | Atlassian이 운영하는 클라우드 기반 (Cloudflare 인프라) |
  | **인증** | OAuth 2.1 또는 API Token |
  | **권한 모델** | 사용자가 Jira/Confluence에서 가진 권한을 그대로 따름 |
  | **지원 제품** | Jira, Confluence, Compass (Atlassian Cloud) |
  | **첫 공식 파트너** | Anthropic Claude |

  - 요즘에는 플러그인으로 많이 사용함<br>
    [https://claude.com/plugins/atlassian](https://claude.com/plugins/atlassian)

### Harness Engineering - AI 에이전트의 작업 환경 설계

> **Harness**
> : 말의 힘을 통제해 원하는 방향으로 이끄는 장치처럼, AI 에이전트를 둘러싸는 제약 조건과 피드백 시스템 전체를 가리킴

이 개념은 OpenAI가 2025년 발표한 Harness Engineering에서 정식화됨

이전에는 AI 활용에 대한 논의가 ‘어떤 모델을 쓸까’, ‘프롬프트를 어떻게 쓸까’에 집중했다면, Harness Engineering은 시선을 한 단계 위로 옮겨 ‘에이전트가 일하는 환경을 어떻게 설계할까’가 됨

[https://openai.com/ko-KR/index/harness-engineering/](https://openai.com/ko-KR/index/harness-engineering/)
  > **우리는 소프트웨어 엔지니어링 팀의 주된 업무가 더 이상 코드 작성에서 벗어나 환경을 설계하고, 의도를 명시하며, Codex 에이전트가 안정적인 작업을 수행할 수 있도록 피드백 루프를 구축하는 것으로 바뀔 때 어떤 변화가 발생하는지 이해해야 했습니다.**

  > **현재 가장 어려운 과제는 에이전트가 우리의 목표인 복잡하고 안정적인 소프트웨어를 대규모로 구축하고 유지관리하는 데 도움이 되는 환경, 피드백 루프, 제어 시스템을 설계하는 것입니다**.

- **Harness를 구성하는 요소**

  | 영역 | 구체적인 예시 |
  | --- | --- |
  | **문서화** | `AGENTS.md`, `CLAUDE.md` 같은 프로젝트 컨텍스트 파일 |
  | **아키텍처 제약** | 의존성 레이어링, 모듈 경계 규칙 |
  | **피드백 루프** | 린터, 타입 체커, 테스트 스위트, pre-commit hook |
  | **생명주기 관리** | CI/CD 파이프라인, PR 검증 자동화 |
  | **관측성** | 로그/메트릭/트레이스에 에이전트가 접근할 수 있는 통로 |

  <details markdown="1">
  <summary>Andrej Kapathy 스킬</summary>

    [https://github.com/forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)

    ```java
    LLM의 일반적인 코딩 실수를 줄이기 위한 행동 지침이다. 프로젝트별 지침이 있을 경우 본 가이드라인과 병합하여 사용한다.

    트레이드오프: 본 지침은 속도보다 신중함에 우선순위를 둔다. 사소한 작업은 상황에 맞게 판단한다.

    ### 1. 구현 전 사고 (Think Before Coding)
    가정하지 않는다. 모호함을 숨기지 않는다. 트레이드오프를 명확히 밝힌다.

    구현을 시작하기 전 다음을 준수한다:

    - 자신의 가정을 명시적으로 기술한다. 불확실한 경우 질문한다.

    - 해석의 여지가 여러 가지라면 임의로 선택하지 말고 대안들을 제시한다.

    - 더 간단한 접근 방식이 있다면 제안한다. 정당한 사유가 있다면 사용자의 요청에 반대 의견을 제시한다.

    - 불분명한 부분이 있다면 작업을 중단한다. 혼란스러운 부분을 구체적으로 언급하며 질문한다.

    ### 2. 단순성 우선 (Simplicity First)
    - 문제를 해결하는 최소한의 코드만 작성한다. 추측에 기반한 코드는 배제한다.

    - 요청되지 않은 기능은 추가하지 않는다.

    - 일회성 코드를 위해 추상화 계층을 만들지 않는다.

    - 요청되지 않은 유연성이나 설정 가능성을 고려하지 않는다.

    - 발생 불가능한 시나리오에 대한 예외 처리를 하지 않는다.

    - 200줄의 코드를 50줄로 줄일 수 있다면 코드를 다시 작성한다.

    - "시니어 엔지니어가 보기에 이 코드가 지나치게 복잡한가?"라고 자문한다. 그렇다면 단순화한다.

    ### 3. 정밀한 수정 (Surgical Changes)
    필요한 부분만 수정한다. 본인이 만든 코드의 뒷정리만 수행한다.

    기존 코드를 편집할 때 다음을 준수한다:

    - 인접한 코드, 주석, 포맷을 임의로 개선하지 않는다.
    - 망가지지 않은 부분을 리팩토링하지 않는다.
    - 본인의 스타일과 다르더라도 기존 스타일을 따른다.
    - 작업과 무관한 데드 코드를 발견하면 보고하되 직접 삭제하지 않는다.

    수정으로 인해 사용되지 않게 된 요소가 발생할 경우:

    - 본인의 수정으로 인해 불필요해진 임포트, 변수, 함수는 제거한다.
    - 기존에 존재하던 데드 코드는 요청이 없는 한 그대로 둔다.
    - 테스트 기준: 변경된 모든 라인은 사용자의 요청사항과 직접적으로 연결되어야 한다.

    ### 4. 목표 중심 실행 (Goal-Driven Execution)
    성공 기준을 정의한다. 검증될 때까지 반복한다.
    작업을 검증 가능한 목표로 변환한다:

    - "유효성 검사 추가" → "잘못된 입력에 대한 테스트 작성 후 통과 확인"
    - "버그 수정" → "버그를 재현하는 테스트 작성 후 통과 확인"
    - "X 리팩토링" → "리팩토링 전후의 테스트 통과 확인"

    다단계 작업의 경우 간략한 계획을 수립한다:

    1. [단계] → 검증: [확인 사항]
    2. [단계] → 검증: [확인 사항]
    3. [단계] → 검증: [확인 사항]
    성공 기준이 명확해야 독립적인 작업이 가능하다. "작동하게 만들기"와 같은 모호한 기준은 불필요한 재질의를 야기한다.

    지침 작동 확인: Diff 내 불필요한 변경 감소, 복잡성으로 인한 재작성 빈도 감소, 구현 전 질문을 통한 명확한 의사결정 증대.
    ```

  </details>

- **세 가지 핵심 기둥**

  1. Context Engineering - 컨텍스트 설계

    - 에이전트 입장에서 컨텍스트 안에 없는 정보는 존재하지 않는 것과 같음<br>
      ex) Goolge Docs에 정리해둔 설계 문서? → 에이전트는 못 봄 / Slcak에서 공유한 결정 사항? → 못 봄

    - **프로젝트의 규칙과 지식을 레포지토리 안에 기계가 읽을 수 있는 형태로 옮겨야 함**

  | 흩어진 지식 | 레포 안의 형태로 |
  | --- | --- |
  | Slack의 빌드 절차 안내 | `AGENTS.md`의 빌드 명령어 섹션 |
  | 위키의 API 명세 | 코드로 정의된 API 계약 (OpenAPI/Pydantic) |
  | 머릿속의 스타일 가이드 | 린터 규칙(eslint/checkstyle) |

  2. Architectural Constraints - 아키텍처 제약

    - 에이전트에게 자유를 많이 줄수록 결과가 더 안 좋음

    - **의존성 레이어를 단방향으로 강제**하면, 에이전트가 탐색할 수 있는 솔루션 공간이 좁아짐

      ```plaintext
      Types → Config → Repo → Service → Runtime → UI
      └─→ 위쪽으로만 의존, 아래쪽 참조 금지
      ```

    - 선택지가 줄어들기 때문에, 올바른 답을 찾을 확률이 올라감

    - 이런 **규칙은 사람이 검토하지 않고 구조적 테스트나 린터로 기계적으로 검증**

  3. Entropy Management - 엔트로피 관리
    - 에이전트가 코드를 많이 생성할수록 코드베이스의 무질서도(entropy)가 올라감<br>
      ex) 문서와 코드가 안 맞거나, 비슷한 기능의 중복 코드가 늘어나고, 안 쓰는 임포트가 쌓임

    - 방치하면 에이전트의 다음 작업 품질이 계속 떨어짐 → **별도의 정리 에이전트를 둬야함**

    - 정리 에이전트가 하는 일<br>
      <hr>

      문서 ↔ 코드 일관성 검증

      <hr>

      패턴 위반 스캔

      <hr>

      순환 의존성 감사

      <hr>

      사용되지 않는 코드 정리

      <hr>

- **핵심 원칙: 레포지토리가 유일한 진실의 원천**<br>
  > Harness Engineering의 가장 중요한 한 줄: **“레포지토리가 Single Source of Truth가 되어야 한다.”**

  - 단순히 문서를 잘 쓰자는 수준이 아니라, Harness 친화적 방식을 사용해야함

  | 기존 방식 | Harness 친화적 방식 |
  | --- | --- |
  | 아키텍처 결정을 회의록에 적기 | **ADR(Architecture Decision Record)** 을 코드 옆에 두기 |
  | 시스템 관계를 다이어그램으로 그리기 | 시스템 관계를 **코드(YAML/IaC)로 정의**하기 |
  | 워크플로우를 노션에 설명 | 워크플로우를 **실행 가능한 스크립트**로 만들기 |

  ex) 

  ![image](/assets/img/notion/TIL-JIRA-MCP-와-Harness-Engineering-특강/04-0175f95c34.png)

  ![image](/assets/img/notion/TIL-JIRA-MCP-와-Harness-Engineering-특강/05-b2e49b4152.png)

- **AGENTS.md는 백과사전이 아니라 목차**

  - OpenAI는 `AGENTS.md`를 약 100줄 정도의 짤은 목차로 유지하라고 권함

  - 전체 그림을 보여주는 맵 역할만 하고, 실제 지식은 `docs/` 디렉토리에 나눠서 정리함

  - 권장 구조

    ```markdown
    # 프로젝트 컨텍스트

    ## 빌드 & 테스트
    빌드/테스트 명령어와 CI 설정은 docs/build.md 참조

    ## 아키텍처
    시스템 구조와 의존성 레이어는 docs/architecture.md 참조

    ## 코딩 컨벤션
    코딩 스타일과 패턴은 docs/conventions.md 참조

    ## API 계약
    엔드포인트 명세는 docs/api/ 디렉토리 참조
    ```

    - 에이전트가 필요한 정보만 골라서 읽고, 변경된 부분만 해당 문서를 고치게 하고, 사람도 검색하기 쉽도록

- **에이전트와 CI/CD 통합 - 자동 피드백 루프**
  ![image](/assets/img/notion/TIL-JIRA-MCP-와-Harness-Engineering-특강/06-632dd0146f.png)

  - 사람이 코드 리뷰하는 것과 비슷하지만, 기계적으로 검증 가능한 부분을 자동화한다는 점이 다름
    - 린터가 경고하면 에이전트가 자동 수정

    - 테스트가 실패하면 에이전트가 다시 시도

    - 기준 충족까지 반복

  - GitHub Actions 같은 도구로 이미 구현 가능하며, PR이 올라오면 자동 코드 리뷰를 돌리고, 이슈에 `@Claude` 같은 멘션을 달면 에이전트가 수정 PR을 만들어주는 워크플로우가 그 예시임

- **관측성 - 에이전트도 로그를 봐야 함**

  - 에이전트가 프로덕션 버그를 고치려면 로그, 메트릭, 트레이스에 접근할 수 있어야 함

  | 데이터 종류 | 에이전트가 하는 일 |
  | --- | --- |
  | **로그** | 에러 패턴 잡아내기, 발생 시점 특정 |
  | **메트릭** | 성능 저하 구간 찾기 |
  | **트레이스** | 요청 흐름 따라가며 원인 추적 |

  - 관측성 도구의 데이터를 에이전트가 읽을 수 있게 열어줘야 함 → 로그 검색 API를 만들거나, 메트릭 쿼리 도구를 (MCP 등을 통해) 에이전트에 연결하는 식

- **흔히 저지르는 실수들**

  | 실수 | 왜 문제인가 | 어떻게 해야 하나 |
  | --- | --- | --- |
  | AGENTS.md를 모호하게 작성 | "코드 품질을 유지하세요" → 에이전트가 뭘 할지 모름 | "함수는 50줄 이하, public 함수에는 JSDoc 필수" 같은 **검증 가능한 규칙** |
  | 피드백 루프 부재 | 에이전트가 자기가 맞다고 가정하고 진행 | 테스트/린터/타입체커 자동화 필수 |
  | 암묵지 방치 | "그건 다 아는 거잖아"가 쌓이면 에이전트 실수 폭증 | 머릿속의 규칙을 코드/문서로 명시 |
  | 모든 행동을 스크립트로 통제 | 자율성을 너무 죽이면 에이전트의 강점이 사라짐 | **방향만** 잡아주고 실행은 위임 |
  | Harness 한 번 만들고 방치 | 모델/프로젝트는 진화하는데 Harness만 멈춰있음 | 정기적으로 점검하고 업데이트 |

### GitOps - 사람과 AI가 공유하는 진실의 원천

> GitOps
> : Git 저장소를 시스템 상태의 Single Source of Truth(SSOT, 유일한 진실의 원천)로 삼고, 자동화된 컨트롤러가 Git의 선언적 정의와 실제 환경을 지속적으로 일치(Reconcile)시키는 방식

운영 환경의 모든 설정은 Git에 있어야 하고, Git이 바뀌면 환경이 따라 바뀜

- **GitOps의 4가지 원칙**

  | 원칙 | 의미 |
  | --- | --- |
  | ① **선언적(Declarative)** | "어떻게(how)"가 아니라 "무엇이어야 하는지(what)" 기술 |
  | ② **버전 관리(Versioned & Immutable)** | 모든 상태는 Git에 커밋으로 보존 |
  | ③ **자동 풀(Pulled Automatically)** | 컨트롤러가 Git의 변화를 감지해 자동 적용 |
  | ④ **지속적 동기화(Continuously Reconciled)** | 환경이 Git과 다르면 즉시 맞춰줌 |

- 명령형 vs 선언형

  - Before - 명령형

    ```bash
    # 운영자가 직접 실행
    kubectl apply -f deployment.yaml
    kubectl scale deployment myapp --replicas=5
    kubectl set image deployment/myapp myapp=myapp:v2.0
    ```

    - 문제점
      - 누가 언제 뭘 했는지 추적 어려움

      - 사람마다 절차가 달라짐

      - 클러스터 상태 ≠ Git 상태 (드리프트 발생)

  - After - 선언형

    ```bash
    # Git에 commit된 desired-state.yaml
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: myapp
    spec:
      replicas: 5
      template:
        spec:
          containers:
            - name: myapp
              image: myapp:v2.0
    ```

    - Git에 commit 하면 → 컨트롤러(Argo CD/Flux)가 감지 → 클러스터에 자동 적용

    - 장점
      - 변경 = Git commit (감사 추적, 리뷰, 승인 가능)

      - 롤백 = `git revert` 한 번

      - 어떤 시점이든 ‘지금 환경이 정확히 무엇인지’ Git만 보면 됨

- **GitOps 동작 흐름**

  ```plaintext
  ┌──────────────┐                ┌──────────────────┐
  │  개발자       │  git commit    │   Git Repository │
  │              ├───────────────►│   (desired       │
  │              │                │    state)        │
  └──────────────┘                └────────┬─────────┘
                                           │ Watch
                                           ↓
                                  ┌──────────────────┐
                                  │  GitOps Agent    │
                                  │  (Argo CD/Flux)  │
                                  └────────┬─────────┘
                                           │ Sync
                                           ↓
                                  ┌──────────────────┐
                                  │  K8s Cluster     │
                                  │  (actual state)  │
                                  └──────────────────┘
                                           │
                                           │ 만약 차이 발생 시
                                           ↓
                                [Reconcile / Drift Correct]
  ```

  - 시나리오 예시

  | 행동 | 결과 |
  | --- | --- |
  | 개발자가 image 태그를 v2.0으로 commit | Argo CD가 감지 → 클러스터에 v2.0 배포 |
  | 누군가 `kubectl`로 직접 v1.5로 변경 | Argo CD가 드리프트 감지 → v2.0으로 다시 동기화 |
  | 롤백 필요 | `git revert` → 자동으로 이전 버전 복원 |

- GitOps + Harness Engineering = AI 친화적 인프라

  | 측면 | 효과 |
  | --- | --- |
  | **사람도 보고 AI도 본다** | Git만 읽으면 인프라 상태가 모두 노출 |
  | **사람도 바꾸고 AI도 바꾼다** | PR이라는 통일된 인터페이스로 둘 다 동일 절차 |
  | **변경 추적이 자동** | 누가(Human/AI), 언제, 무엇을 바꿨는지 Git 히스토리에 남음 |
  | **롤백이 통일** | 사람이 만든 사고든 AI가 만든 사고든 `git revert`로 동일하게 복구 |

### 가시성(Visibility) - 사람과 AI 모두를 위한 환경

> 가시성
> : 팀 누구나(그리고 AI 에이전트도) 지금 무엇이 어디에 어떤 상태로 있는지 알 수 있는 정도

- 가시성이 높은 팀의 증상
  - 누가 봐도 한 화면에서 **이슈 → PR → 빌드 → 배포 → 운영 메트릭**이 연결됨

  - 새로 들어온 사람이 1주일 안에 전체 흐름을 이해

  - AI 에이전트가 사람과 같은 정보로 판단 가능

- 도구 연결이 만들어내는 가치 사슬
  ![image](/assets/img/notion/TIL-JIRA-MCP-와-Harness-Engineering-특강/07-c7e8b0b221.png)

  - 각 단계를 자동으로 연결하면 통찰이 만들어짐

  - 이 사슬이 만들어지면 다음 질문에 자동으로 답할 수 있음

- 가시성이 곧 생산성

  | 측면 | 가시성이 만드는 차이 |
  | --- | --- |
  | **온보딩 속도** | 새 팀원이 코드/문서/이슈/배포 흐름을 따라가며 자가학습 가능 |
  | **사고 대응 시간** | 장애 발생 → 원인 추적 → 롤백까지 분 단위로 단축 |
  | **AI 활용도** | 에이전트가 컨텍스트를 가져갈 수 있어 결과 품질 향상 |
  | **의사결정 속도** | "지금 우리가 어디에 있나"를 매번 회의로 합의할 필요 없음 |

### 가장 중요한 것

> **"더 좋은 프롬프트가 아니라, 더 좋은 환경이 더 좋은 결과를 만든다."**

도구의 이름을 외우는 게 아니라, **AI가 우리 팀에서 일할 수 있는 환경**을 어떻게 만들지를 고민하는 것이 엔지니어의 새로운 역할

엔지니어가 코드를 직접 짜는 사람에서 → **에이전트가 잘 일할 수 있는 환경을 만드는 사람**으로 역할이 옮겨가고 있음

## 참고 자료

### Harness Engineering

- [OpenAI — Harness Engineering (원문)](https://openai.com/index/harness-engineering/)

- [Dale Seo — Harness Engineering: AI 코딩 에이전트를 위한 환경 설계](https://daleseo.com/harness-engineering/) (한글 정리)

- [OpenAI — Unlocking the Codex Harness](https://openai.com/index/unlocking-the-codex-harness/)

- [OpenAI — Unrolling the Codex Agent Loop](https://openai.com/index/unrolling-the-codex-agent-loop/)

- [AGENTS.md 작성 가이드 (Dale Seo)](https://daleseo.com/agents-md/)

- [CLAUDE.md 작성 가이드 (Dale Seo)](https://daleseo.com/claude-code-claude-md/)

### MCP

- [Anthropic — Introducing MCP](https://www.anthropic.com/news/model-context-protocol)

- [Model Context Protocol 공식 문서](https://modelcontextprotocol.io/)

- [MCP Server SDK (TypeScript / Python)](https://github.com/modelcontextprotocol)

### JIRA MCP

- [Atlassian Remote MCP Server 발표 블로그](https://www.atlassian.com/blog/announcements/remote-mcp-server)

- [Atlassian Rovo MCP Server 공식 문서](https://support.atlassian.com/atlassian-rovo-mcp-server/)

- [Atlassian MCP Server (GitHub)](https://github.com/atlassian/atlassian-mcp-server)

- [mcp-atlassian — 커뮤니티 구현체](https://github.com/sooperset/mcp-atlassian)

### GitOps

- [OpenGitOps — 4가지 원칙 정의](https://opengitops.dev/)

- [Argo CD 공식 문서](https://argo-cd.readthedocs.io/)

- [Flux 공식 문서](https://fluxcd.io/)

### 함께 읽으면 좋은 것

- [Dale Seo — 스펙 주도 개발: 바이브 코딩을 넘어 AI 에이전트와 일하는 법](https://daleseo.com/spec-driven-development/)

- [Dale Seo — 코딩 에이전트는 어떻게 작동하는가](https://daleseo.com/coding-agent/)
