---
layout: "post"
title: "[TIL] Special Lecture on JIRA MCP and Harness Engineering"
title_source: "manual"
date: 2026-05-08 09:00:00 +0900
last_modified_at: 2026-05-10 22:27:00 +0900
categories: ["Spring 단기 심화", "특강"]
tags: ["MCP", "GitOps", "Harness Engineering"]
description: "This post summarizes JIRA MCP, Harness Engineering, GitOps, and visibility based on a special lecture about designing AI-agent-friendly engineering environments."
description_source: "manual"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-JIRA-MCP-와-Harness-Engineering-특강/"
original_url: "/posts/TIL-JIRA-MCP-와-Harness-Engineering-특강/"
notion_id: "35a7788a-fc66-807c-a149-fbf49dee905e"
notion_lang: "en"
---
## What I studied

### MCP (Model Context Protocol)

LLM is smart, but can't do anything alone
→ To solve this problem, AI ↔ external tools must be connected, but each tool has a different API.

- Limitations of existing methods - NxM problem
    ![image](/assets/img/notion/TIL-JIRA-MCP-와-Harness-Engineering-특강/01-aa032549a0.png)

    - Integration is different so there is no standard.

    - If one side is changed, everything breaks.

    - When a new tool comes out, every AI has to create it again.

- **MCP's solution - common protocol**<br>
    : An open standard protocol released by Antropic in November 2024, defining a common language for AI models to interact with external systems.

    - N+M
        ![image](/assets/img/notion/TIL-JIRA-MCP-와-Harness-Engineering-특강/02-9f14964a53.png)

        - We had to create separate MCPs for each tool, but now we only need to create one MCP for each AI tool.

- **MCP operation structure**

  | component | role |
  | --- | --- |
  | **MCP Host** | Environment where AI operates (e.g. Claude Desktop, Cursor IDE) |
  | **MCP Client** | Module that resides in the host and communicates with the server |
  | **MCP Server** | Gateway to expose external systems (Jira, GitHub, etc.) to MCP standards |

- **Three basic units exposed by MCP**

  | unit | explanation | Jira example |
  | --- | --- | --- |
  | **Tools** | Functions that AI can call | `createIssue`, `searchIssues`, `addComment` |
  | **Resources** | Data that AI can read | Specific issue body, sprint information, board status |
  | **Prompts** | Predefined prompt templates | “Create stand-up report”, “Sprint retrospective summary” |

→ Why standards are important: Since AI has moved between tools, if AI integration standards are different for each tool, a new kind of disconnect will eventually arise.
⇒ MCP is an agreed upon promise to prevent that disconnection.

### JIRA MCP - Practical Applications

![image](/assets/img/notion/TIL-JIRA-MCP-와-Harness-Engineering-특강/03-b804d67f9b.png)

- Atlassian Remote MCP Server<br>
    : Atlassian officially announced Remote MCP Server in May 2025 (currently used as Rovo MCP Server)

    - Features

  | item | detail |
  | --- | --- |
  | **Hosting** | Cloud-based (Cloudflare infrastructure) operated by Atlassian |
  | **certification** | OAuth 2.1 or API Token |
  | **Permission Model** | Follows the same permissions users have in Jira/Confluence |
  | **Supported Products** | Jira, Confluence, Compass (Atlassian Cloud) |
  | **First Official Partner** | Anthropic Claude |

    - These days, it is widely used as a plug-in<br>
        [https://claude.com/plugins/atlassian](https://claude.com/plugins/atlassian)

### Harness Engineering - Designing the work environment of AI agents

> **Harness**
> : Refers to the entire system of constraints and feedback surrounding the AI agent, like a device that controls the power of speech and guides it in the desired direction.

This concept was formalized in Harness Engineering published by OpenAI in 2025.Previously, discussions on AI utilization focused on ‘what model to use’ and ‘how to use prompts,’ but Harness Engineering moved the focus one level higher to ‘how to design the environment in which agents work.’

[https://openai.com/ko-KR/index/harness-engineering/](https://openai.com/ko-KR/index/harness-engineering/)
  > **We needed to understand what happens when a software engineering team's primary job is no longer writing code, but rather designing the environment, specifying intent, and building a feedback loop to ensure Codex agents can do their work reliably.**

  > **The most difficult challenge today is to design environments, feedback loops, and control systems that help agents achieve our goal of building and maintaining complex, reliable software at scale**.

- **Elements that make up Harness**

  | area | specific example |
  | --- | --- |
  | **Documentation** | Project context files such as `AGENTS.md`, `CLAUDE.md` |
  | **Architectural Constraints** | Dependency layering, module boundary rules |
  | **Feedback Loop** | Linter, type checker, test suite, pre-commit hook |
  | **Life cycle management** | CI/CD pipeline, PR verification automation |
  | **Observability** | Pathway through which agents can access logs/metrics/traces |

    <details markdown="1">
    <summary>Andrej Kapathy skills</summary>

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

- **Three Core Pillars**

    1. Context Engineering - Context Design

        - From the agent's perspective, information that is not in the context is the same as not existing<br>
            ex) Design documents organized in Google Docs? → The agent cannot see / Decisions shared by Slcak? → I can’t see

        - **Project rules and knowledge must be transferred into a machine-readable format in the repository**

  | scattered knowledge | In the form of a repo |
  | --- | --- |
  | Guide to Slack’s build process | Build command section for `AGENTS.md` |
  | Wiki's API specification | API contract defined in code (OpenAPI/Pydantic) |
  | A style guide in your head | Linter rules (eslint/checkstyle) |

    2. Architectural Constraints - Architectural Constraints

        - The more freedom you give the agent, the worse the results.

        - **Forcing the dependency layer to be unidirectional** narrows the solution space that the agent can explore.

            ```plaintext
            Types → Config → Repo → Service → Runtime → UI
            └─→ 위쪽으로만 의존, 아래쪽 참조 금지
            ```

        - As the number of choices decreases, the probability of finding the right answer increases.

        - These **rules are not reviewed by humans but are mechanically verified using structural tests or linters**3. Entropy Management - Entropy Management
        - As the agent generates more code, the entropy of the code base increases.<br>
            ex) The document and code do not match, duplicate codes with similar functions increase, and unused imports pile up.

        - If left unattended, the quality of the agent's next work will continue to deteriorate → **Separate cleaning agent must be installed**

        - What a clearance agent does<br>
            <hr>

            Document ↔ Code consistency verification

            <hr>

            Pattern Violation Scan

            <hr>

            Circular dependency auditing

            <hr>

            Clean up unused code

            <hr>

- **Core Principle: Repositories are the only source of truth**<br>
    > The most important line from Harness Engineering: **“The repository must be the Single Source of Truth.”**

    - It is not just about writing good documents; it is necessary to use a Harness-friendly method.

  | Conventional method | Harness friendly method |
  | --- | --- |
  | Documenting architectural decisions in meeting minutes | Place **ADR(Architecture Decision Record)** next to your code |
  | Diagramming system relationships | Defining system relationships in code (YAML/IaC) |
  | Explain the workflow in Notion | Make your workflow an **executable script** |

    ex) 

    ![image](/assets/img/notion/TIL-JIRA-MCP-와-Harness-Engineering-특강/04-0175f95c34.png)

    ![image](/assets/img/notion/TIL-JIRA-MCP-와-Harness-Engineering-특강/05-b2e49b4152.png)

- **AGENTS.md is not an encyclopedia, but a table of contents**

    - OpenAI recommends keeping `AGENTS.md` as a table of contents of about 100 lines.

    - It only serves as a map showing the overall picture, and actual knowledge is divided and organized into the `docs/` directory.

    - Recommended structure

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

        - Enable agents to select and read only the information they need, revise the document only for changed parts, and make it easy for people to search.

- **Agent and CI/CD integration - automatic feedback loop**
    ![image](/assets/img/notion/TIL-JIRA-MCP-와-Harness-Engineering-특강/06-632dd0146f.png)

    - It is similar to human code review, but the difference is that it automates parts that can be mechanically verified.
        - When the linter warns, the agent automatically corrects it.

        - If the test fails, the agent retries- Repeat until criteria are met

    - It can already be implemented with tools such as GitHub Actions, and an example is a workflow in which an automatic code review is run when a PR is posted, and an agent creates a modified PR when a mention such as `@Claude` is added to the issue.

- **Observability - Agents must also see logs**

    - Agents must have access to logs, metrics, and traces to fix production bugs.

  | data type | What agents do |
  | --- | --- |
  | **log** | Catching error patterns, specifying when they occur |
  | **Metrics** | Find areas of poor performance |
  | **Trace** | Follow the request flow and trace the cause |

    - Data from observability tools must be opened for the agent to read → Create a log search API or connect a metric query tool to the agent (via MCP, etc.)

- **Common Mistakes**

  | mistake | why is it a problem | what should i do |
  | --- | --- | --- |
  | Write AGENTS.md ambiguously | “Maintain code quality” → Agent does not know what to do | **Testable rules** such as “Functions must have less than 50 lines, JSDoc required for public functions” |
  | No feedback loop | The agent assumes that he is correct and proceeds. | Test/linter/type checker automation required |
  | Neglecting tacit knowledge | As “you know it all” piles up, agent mistakes increase dramatically. | State the rules in your head as code/documentation |
  | Control all actions with scripts | If you kill too much autonomy, the agent's strengths disappear. | **Only provide direction** and delegate execution |
  | Make a harness once and leave it alone | The model/project evolves, but only the harness remains static. | Regularly inspected and updated |

### GitOps - A source of truth shared between people and AI

> GitOps
> : A Git repository is used as the Single Source of Truth (SSOT) of the system state, and an automated controller continuously reconciles the declarative definition of Git with the actual environment.

All settings in the operating environment must be in Git, and when Git changes, the environment changes accordingly.

- **Four Principles of GitOps**

  | principle | meaning |
  | --- | --- |
  | ① **Declarative** | Describe “what should be” rather than “how” |
  | ② **Versioned & Immutable** | All state is preserved as commits in Git |
  | ③ **Pulled Automatically** | The controller detects changes in Git and automatically applies them |
  | ④ **Continuously Reconciled** | If the environment is different from Git, it will be adjusted immediately |

- Imperative vs. declarative

    - Before - imperative

        ```bash
        # 운영자가 직접 실행
        kubectl apply -f deployment.yaml
        kubectl scale deployment myapp --replicas=5
        kubectl set image deployment/myapp myapp=myapp:v2.0
        ```

        - Problem
            - Difficult to track who did what and when

            - The procedure is different for each person.

            - Cluster state ≠ Git state (drift occurs)

    - After - declarative

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

        - When you commit to Git → the controller (Argo CD/Flux) detects it → automatically applies it to the cluster.

        - Advantages
            - Change = Git commit (with audit trail, review, and approval)

            - Rollback = `git revert` once

            - At any point in time, you only need to look at Git to see ‘exactly what the current environment is’.

- **GitOps Operation Flow**

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

- Scenario example

  | action | result |
  | --- | --- |
  | Developer commits image tag to v2.0 | Argo CD detected → deploy v2.0 to cluster |
  | Someone changed `kubectl` directly to v1.5 | Argo CD detects drift → resync to v2.0 |
  | rollback required | `git revert` → Automatically restore previous version |

- GitOps + Harness Engineering = AI-friendly infrastructure

  | side | effect |
  | --- | --- |
  | **See people and see AI** | All infrastructure status is exposed by simply reading Git |
  | **Change people and change AI** | Same procedure for both with a unified interface called PR |
  | **Change tracking is automatic** | Who (Human/AI), when, and what changed remains in Git history |
  | **Rollback is unified** | Whether it is a human-made accident or an AI-made accident, recovery is the same with `git revert`. |

### Visibility - An environment for both people and AI

> Visibility
> : The extent to which everyone on the team (and the AI agent) knows where and in what state

- Symptoms of a high-visibility team
    - **Issue → PR → Build → Deployment → Operational Metrics** are connected on one screen.

    - A new person understands the entire flow within a week

    - AI agents can make decisions based on the same information as humans

- Value chain created by tool connection
    ![image](/assets/img/notion/TIL-JIRA-MCP-와-Harness-Engineering-특강/07-c7e8b0b221.png)

    - Insights are created by automatically connecting each step

    - Once this chain is created, the following questions can be automatically answered

- Visibility equals productivity

  | side | Visibility makes a difference |
  | --- | --- |
  | **Onboarding Speed** | New team members can self-learn by following the code/document/issue/deployment flow |
  | **Incident Response Time** | From occurrence of failure → trace cause → rollback reduced to minutes |
  | **AI Utilization** | Agents can take context, improving quality of results |
  | **Decision-making speed** | No need to agree on “where are we now” every time we meet. |

### The most important thing

> **"Better environments, not better prompts, produce better results."**

The new role of engineers is not to memorize the names of tools, but to think about how to create an environment where AI can work in our team.

The role of engineers is shifting from someone who writes code directly to **a person who creates an environment where agents can work well**.

## References

### Harness Engineering

- [OpenAI — Harness Engineering (원문)](https://openai.com/index/harness-engineering/)

- [Dale Seo — Harness Engineering: AI 코딩 에이전트를 위한 환경 설계](https://daleseo.com/harness-engineering/) (Korean summary)

- [OpenAI — Unlocking the Codex Harness](https://openai.com/index/unlocking-the-codex-harness/)

- [OpenAI — Unrolling the Codex Agent Loop](https://openai.com/index/unrolling-the-codex-agent-loop/)

- [AGENTS.md 작성 가이드 (Dale Seo)](https://daleseo.com/agents-md/)

- [CLAUDE.md 작성 가이드 (Dale Seo)](https://daleseo.com/claude-code-claude-md/)

###MCP

- [Anthropic — Introducing MCP](https://www.anthropic.com/news/model-context-protocol)

- [Model Context Protocol 공식 문서](https://modelcontextprotocol.io/)

- [MCP Server SDK (TypeScript / Python)](https://github.com/modelcontextprotocol)

### JIRA MCP

- [Atlassian Remote MCP Server 발표 블로그](https://www.atlassian.com/blog/announcements/remote-mcp-server)

- [Atlassian Rovo MCP Server 공식 문서](https://support.atlassian.com/atlassian-rovo-mcp-server/)

- [Atlassian MCP Server (GitHub)](https://github.com/atlassian/atlassian-mcp-server)

- [mcp-atlassian — 커뮤니티 구현체](https://github.com/sooperset/mcp-atlassian)

### GitOps-[OpenGitOps — 4가지 원칙 정의](https://opengitops.dev/)

- [Argo CD 공식 문서](https://argo-cd.readthedocs.io/)

- [Flux 공식 문서](https://fluxcd.io/)

### Good to read together

- [Dale Seo — 스펙 주도 개발: 바이브 코딩을 넘어 AI 에이전트와 일하는 법](https://daleseo.com/spec-driven-development/)

- [Dale Seo — 코딩 에이전트는 어떻게 작동하는가](https://daleseo.com/coding-agent/)
