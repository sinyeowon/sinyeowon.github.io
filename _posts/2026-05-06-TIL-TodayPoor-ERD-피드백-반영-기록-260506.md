---
title: "[TIL] TodayPoor ERD 피드백 반영 기록 - 260506"
date: 2026-05-06 09:00:00 +0900
last_modified_at: 2026-05-10 22:25:00 +0900
categories: ["GDGoC KNU", "0 to Product"]
tags: ["project"]
description: "0 to Product BE 회의 과정에서의 TIL을 작성한 글입니다."
description_source: "notion"
english_url: "/en/posts/TIL-TodayPoor-ERD-피드백-반영-기록-260506/"
notion_id: "3587788a-fc66-80b9-9579-d2a2d632a991"
notion_lang: "ko"
---
## 오늘 한 일

- 피드백 관련 논의

- 피드백 ERD 반영 및 수정

## 회의

초기 설계에서는 기능을 빠르게 반영하는 데 집중했다면, 오늘은 각 테이블과 필드가 정말 필요한지, 중복 데이터는 없는지, MVP 단계에서 과한 설계는 아닌지를 중심으로 다시 점검함

- PRD 기반 ERD 피드백 반영 및 최종 설계
  - OCR 결과 테이블 분리
    - 초기에는 `EXPENSE` 테이블 안에 `ocr_raw_text`를 함께 저장함

    - 문제
      - OCR 결과는 소비 내역 자체라기보다는, 소비 내역을 만들기 위한 분석 결과에 가까움

      - OCR 원문은 길이가 길어질 수 있고, 추후 OCR 정확도나 분석 결과를 따로 관리할 가능성도 있음

    - 해결: 그래서 `OCR_RESULT` 테이블을 분리함
      - 이렇게 분리하면 `EXPENSE`는 확정된 소비 데이터에 집중하고, `OCR_RESULT`는 분석 결과를 담당하게 되어 역할이 더 명확해짐

  - AI 프롬프트 테이블 제거
    - 처음에는 AI 기능을 고려해 `AI_PROMPT_TEMPLATE` 테이블을 추가함

    - 프롬프트 타입, 시스템 프롬프트, 유저 프롬프트 템플릿 등을 DB에서 관리하는 구조였음

    - 문제<br>
      하지만 다시 검토해보니 현재 MVP에서는 다음 기능이 없음

      - 관리자 페이지에서 프롬프트 수정

      - 프롬프트 버전 관리

      - A/B 테스트

      - 운영 중 배포 없이 프롬프트 변경

      즉, 프롬프트를 DB로 관리할 이유가 아직 명확하지 않음

    - 해결: 프롬프트는 백엔드 코드 내부에서 관리하고, AI가 생성한 결과만 DB에 저장하기로 함
      - 최종적으로는 `AI_PROMPT_TEMPLATE` 테이블을 제거하고, `AI_RESULT`만 유지

  - RANKING_RESULT의 title_text 제거
    - 초기에는 `RANKING_RESULT`에 `title_text` 필드를 둠

    - 문제
      - 하지만 `RANKING_RESULT`는 이미 `title_id`를 통해 `POOR_TITLE`을 참조하고 있어서, 타이틀 이름은 `POOR_TITLE.name`으로 가져올 수 있음

      - `title_text`를 따로 저장하면 같은 타이틀 정보가 두 군데에 중복 저장됨

    - 해결: 그래서 `title_text`는 제거하고, `RANKING_RESULT.title_id`이 `POOR_TITLE`의 name을 참조하도록 함

  - AI 결과 참조 구조 변경
    - 초기에는 `RANKING_RESULT`에 `roast_message`를 문자열로 바로 저장하려고 함

    - 문제
      - 하지만 독설 문구는 AI가 생성한 결과이므로, 랭킹 결과와 AI 결과를 분리하는 것이 더 적절하다고 판단함

    - 해결: 그래서 `RANKING_RESULT`가 `AI_RESULT`를 참조하도록 수정함

  - invite code 만료일 추가
    - 문제
      - 그룹 초대 기능을 고려했을 때, 초대 코드가 무기한 유지되는 것은 적절하지 않다고 판단

    - 해결: `GROUP` 테이블에 초대 코드 만료일을 추가
      - 이 필드를 통해 만료된 초대 코드는 사용할 수 없도록 처리할 수 있음

- 최종 ERD<br>
  <details markdown="1">
  <summary>ERD Mermaid 코드</summary>

    ```mermaid
    erDiagram
        USER ||--o{ SOCIAL_ACCOUNT : has
        USER ||--o{ GROUP_MEMBER : joins
        GROUP ||--o{ GROUP_MEMBER : has

        USER ||--o{ EXPENSE : uploads
        GROUP ||--o{ EXPENSE : contains

        EXPENSE ||--|| OCR_RESULT : has

        GROUP ||--o{ RANKING_RESULT : has
        USER ||--o{ RANKING_RESULT : ranked
        POOR_TITLE ||--o{ RANKING_RESULT : assigned

        RANKING_RESULT ||--|| AI_RESULT : has

        USER {
            UUID id PK
            string nickname
            string profile_image_url
            datetime created_at
            datetime updated_at
            datetime deleted_at
        }

        SOCIAL_ACCOUNT {
            UUID id PK
            UUID user_id FK
            enum provider
            string provider_user_id
            string email
            datetime connected_at
        }

        GROUP {
            UUID id PK
            string name
            string invite_code
            datetime invite_code_expires_at
            UUID owner_id FK
            datetime created_at
            datetime updated_at
            datetime deleted_at
        }

        GROUP_MEMBER {
            UUID id PK
            UUID user_id FK
            UUID group_id FK
            enum role
            datetime joined_at
            datetime deleted_at
        }

        EXPENSE {
            UUID id PK
            UUID user_id FK
            UUID group_id FK
            enum category
            int amount
            string merchant
            string memo
            string image_url
            enum visibility
            datetime spent_at
            datetime created_at
            datetime updated_at
            datetime deleted_at
        }

        OCR_RESULT {
            UUID id PK
            UUID expense_id FK
            text raw_text
            datetime created_at
        }

        RANKING_RESULT {
            UUID id PK
            UUID group_id FK
            UUID user_id FK
            UUID title_id FK
            UUID ai_result_id FK
            date ranking_date
            int total_amount
            int rank_no
            datetime created_at
        }

        POOR_TITLE {
            UUID id PK
            string name
            string code
            enum condition_type
        }

        AI_RESULT {
            UUID id PK
            text input_data
            text output_text
            string model_name
            int token_usage
            datetime created_at
        }
    ```

  </details>

  ![image](/assets/img/notion/TIL-TodayPoor-ERD-피드백-반영-기록-260506/01-f55d32293b.png)

## 다음 할 일

- API 명세 작성

- 프로젝트 공통 부분 설계
  - 공통 응답

  - 에러 처리

  - 코드/커밋 컨벤션
