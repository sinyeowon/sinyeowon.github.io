---
title: "[TIL] Git & PR + CI/CD 특강"
date: 2026-05-06 09:00:00 +0900
last_modified_at: 2026-05-06 15:09:00 +0900
categories: ["Spring 단기 심화", "특강"]
tags: ["Git", "CI/CD"]
description: "Git & PR + CI/CD 관련 특강을 듣고 공부한 내용을 정리한 글입니다."
description_source: "notion"
english_url: "/en/posts/TIL-Git-&-PR-+-CI-CD-특강/"
notion_id: "3587788a-fc66-8089-892a-dad32b993e3a"
notion_lang: "ko"
---
## 공부한 내용

### **Git Flow 브랜치 전략**

브랜치 전략이 없다면, 내 작업이 동료 작업을 덮어쓰거나 / 배포 직전인데 미완성 코드가 섞이거나 / 롤백하고 싶은데 기준점이 없는 등의 사고가 발생할 수 있음

→ 브랜치 전략 = 사고 방지 장치

- Git Flow의 5가지 브랜치

  | 브랜치 | 역할 | 분기 | 머지 대상 | 수명 |
  | --- | --- | --- | --- | --- |
  | `main` | 운영(Production) 코드. 항상 배포 가능 상태 | — | — | 영구 |
  | `develop` | 다음 릴리즈 통합 브랜치. 모든 feature가 모이는 곳 | main에서 최초 1회 | — | 영구 |
  | `feature/*` | 새 기능 개발 | develop | develop | 임시 |
  | `release/*` | 출시 준비. 버그 수정만 허용 | develop | main + develop | 임시 |
  | `hotfix/*` | 운영 버그 긴급 수정 | main | main + develop | 임시 |

    ![image](/assets/img/notion/TIL-Git-&-PR-+-CI-CD-특강/01-a9615f8ef8.png)

- Github Flow와 Git Flow

  | 구분 | Git Flow | Github Flow |
  | --- | --- | --- |
  | 브랜치 구조 | 5개의 브랜치로 엄격하게 관리 | `main`  • `feature` 만 사용 (단순) |
  | 적합한 상황 | 정기 릴리즈, 버전 관리 | 빠른 배포가 중요한 웹 서비스, SaaS, CD |
  | 잘 맞는 도메인 | 모바일 앱, 패키지 라이브러리 | 웹 서비스 |
  | 단점 | 복잡함. 작은 팀에서는 과할 수 있음 | 다중 버전 동시 운영이 어려움 |
  | 배포와의 궁합 | 빠른 배포(CD)와 궁합이 안 맞음 | PR 머지 = 즉시 배포 |
  | 전제 조건 | — | 자동화 테스트가 필수 전제 |

> 대부분의 스타트업/웹 서비스는 Github Flow로 시작하고, 규모가 커지면 Git Flow로 확장함

### **PR 워크플로우와 코드 리뷰**

- Pull Request(PR): 내 브랜치 작업을 main(또는 develop)에 합쳐주세요 라고 공식적으로 요청하는 절차

- PR이 하는 3가지 일

  | 역할 | 설명 |
  | --- | --- |
  | 👀  **코드 리뷰의 장** | 동료가 변경사항을 보고 피드백을 남기는 공간 |
  | 🧪  **자동 검증 트리거** | CI 파이프라인 실행 (빌드/테스트 자동 수행) |
  | 📜  **변경 이력 기록** | 왜 / 무엇을 / 언제 바꿨는지 영구 보존 |

    - PR은 코드 리뷰를 시작시키는 trigger이자, 미래의 내가 읽을 변경 일기장

- PR 라이프사이클

    ```bash
    1. Branch → feature/login 같은 작업 브랜치 생성
    2. Commit & Push → 작업 내용을 원격에 푸시
    3. Open PR → GitHub UI에서 PR 생성, 리뷰어 지정
    4. Review → 코드 리뷰 + CI 검증 → 수정 → 재푸시
    5. Approve & Merge → 승인 후 머지, 브랜치 삭제

    ```

- 실제 명령어 흐름

    ```bash
    # 1. 브랜치 생성
    git checkout -b feature/login

    # 2. 커밋
    git add .
    git commit -m "feat(auth): 로그인 토큰 검증 로직 추가"

    # 3. 푸시
    git push origin feature/login

    # 4~5. 여기서부터는 GitHub/GitLab 웹 UI에서 진행
    ```

- 좋은 PR 작성법

    - 작게 쪼개기 - 200~400줄 / 단일 목적

    - 제목은 한 줄로 명확히 - ex) `[FIX] 로그인 토큰 만료 시 자동 리프레시 처리`

    - 본문에 컨텍스트를 담기

        ```bash
        ## What
        - AccessToken 만료 시 자동으로 RefreshToken으로 재발급

        ## Why
        - 사용자가 30분 후 갑자기 로그아웃되는 이슈 (#142)

        ## How
        - AxiosInterceptor에 401 응답 시 재발급 로직 추가
        - 동시 요청 race condition은 Promise 큐로 직렬화

        ## Test
        - [x] 단위 테스트 추가 (auth.spec.ts)
        - [x] QA 시나리오 통과
        - [ ] 부하 테스트는 별도 PR

        ```

    - 셀프 리뷰가 먼저 - 푸시 직후 자기 PR 한 번 다시 읽기

- 코드 리뷰는 검열이 아님
    - 리뷰어로서,
        - 코드를 비판하되 사람은 비판하면 안됨

        - 질문 먼저, 단정 금지

        - 잘한 부분도 같이 칭찬

    - 작성자로서,
        - 방어하지 말고 의도를 설명

        - 동의하면 반영, 다르면 근거로 토론

        - 리뷰 답변은 24시간 이내

        - 감사 인사

### **Merge와 Rebase**

- Merge: 두 히스토리를 합치는 머지 커밋
    ![image](/assets/img/notion/TIL-Git-&-PR-+-CI-CD-특강/02-ac94822e48.png)

    - 히스토리 보존 - 누가 어느 브랜치에서 작업했는지 그대로 남음

    - 안전함 - 기존 커밋은 절대 변경되지 않음

    - 히스토리가 복잡해짐 - 머지 커밋이 쌓이면 git log가 복잡해짐

- Rebase: 내 커밋을 main 끝에 옯겨 붙이기
    ![image](/assets/img/notion/TIL-Git-&-PR-+-CI-CD-특강/03-e678a100d5.png)

    - 히스토리가 깔끔함 - git log가 한 줄로 직선

    - 머지 커밋 없음 - 노이즈 제거

    - 기존 커밋이 새 커밋으로 교체됨 - 공유된 브랜치에 하면 협업 파괴

- 언제 뭘 사용할지 (Merge & Rebase)

  | 기준 | Merge | Rebase |
  | --- | --- | --- |
  | 히스토리 | 있는 그대로 보존 | 한 줄로 정리 |
  | 커밋 해시 | 변하지 않음 | 새로 생성됨 |
  | 충돌 처리 | 한 번에 | 커밋마다 |
  | 권장 상황 | **공유 브랜치 통합** | **내 로컬 브랜치 정리** |

    **→ 이미 푸시된 공용 브랜치를 절대 rebase 하면 안됨**

- 절대 하지 말아야 할 것
    - 공유된 브랜치에 `git push -- force` → 동료의 커밋을 통째로 날려버림

    - Force push가 안전한 곳
        - 내 로컬 feature 브랜치

        - 푸시해지만 나만 쓰는 브랜치

        - PR 머지 직전 커밋 정리

        - 리뷰 반영 후 squash

    - 절대 금지
        - `main` / `develop`

        - 여러 명이 푸시하는 브랜치

        - 머지된 PR 브랜치

        - 릴리즈 태그가 있는 브랜치

> `git push --force-with-lease` 를 사용하면 원격이 내 예상과 다를 때 실패시킴
> → Force push가 필요하면 무조건 `--force-with-lease`

### **충돌(Conflict) 해결**

충돌은 두 브랜치가 같은 파일의 같은 줄을 다르게 수정했을 때 발생

- Git이 파일에 남기는 충돌 마커

    ```bash
    # <<<<<<< HEAD
      private final int TIMEOUT = 3000;       // 내 변경 (현재 브랜치)
    # =======
      private final int TIMEOUT = 5000;       // 들어오는 변경 (다른 브랜치)
    # >>>>>>> feature/api
    ```

    → 충돌은 에러가 아니라, Git이 내 판단을 요청하는 것

- 충돌 해결 5단계

    1. 현재 상태 확인 - `git status`

    2. 파일 열어서 마커 찾기<br>
        `<<<<<<<` / `=======` / `>>>>>>>` 위치 확인 → 어느 쪽 코드를 살릴지 결정

    3. 원하는 형태로 수정

    4. 스테이징 + 커밋

        ```bash
        git add .
        git commit
        # 머지 진행 중 상태가 종료됨
        ```

    5. 테스트 + 푸시

        ```bash
        npm test       # 충돌 해결로 깨진 곳이 없는지 반드시 확인
        git push
        ```

    - 그래도 꼬였다면

        ```bash
        git merge --abort   # 머지 시작 전으로 되돌림
        git rebase --abort  # rebase 중이면
        ```

### **CI/CD 파이프라인 입문**

- 수동 배포와 자동화의 차이
    ![image](/assets/img/notion/TIL-Git-&-PR-+-CI-CD-특강/04-8f8d92b96d.png)

    - CI/CD 도입 후
        - PR 올리면 테스트 자동 실행

        - main 머지 = 자동 배포

        - 실패하면 즉시 Slack 알림

        - 사람의 실수가 들어갈 곳이 없음

        - 배포 횟수 ↑ / 사고 ↓

- CI/CD 파이프라인 흐름

    ![image](/assets/img/notion/TIL-Git-&-PR-+-CI-CD-특강/05-b54ee9d439.png)

  | 단계 | 무엇을 하나 |
  | --- | --- |
  | **Source** | PR / Push 이벤트로 트리거 |
  | **Build** | 컴파일 / 패키징 / 도커 이미지 생성 |
  | **Test** | 단위 테스트 + 통합 테스트 + 린트 |
  | **Deploy** | Stage 환경 배포 → Prod 배포 |

    → 한 단계라도 실패하면 즉시 중단 + 알림 / 깨진 빌드는 절대 다음 단계로 넘어가지 않음

> **CI/CD 용어 정리**
>
> | 약자 | 풀네임 | 의미 |
> | --- | --- | --- |
> | CI | Continuous **Integration** | 코드를 자주 통합하고 자동 검증 |
> | CD | Continuous **Delivery** | 언제든 배포 가능한 상태 유지 (수동 승인) |
> | CD | Continuous **Deployment** | 통과하면 자동으로 운영까지 배포 |

- Github Actions로 30줄 안에 시작하기<br>
    ### `.github/workflows/ci.yml`

    ```yaml
    name: CI

    on:
      push:
        branches: [main, develop]
      pull_request:
        branches: [main, develop]

    jobs:
      build-and-test:
        runs-on: ubuntu-latest
        steps:
          - name: 코드 체크아웃
            uses: actions/checkout@v4

          - name: JDK 17 설정
            uses: actions/setup-java@v4
            with:
              distribution: 'temurin'
              java-version: '17'

          - name: Gradle Wrapper 캐시
            uses: gradle/actions/setup-gradle@v3

          - name: gradlew 실행 권한 부여
            run: chmod +x ./gradlew

          - name: 테스트 실행
            run: ./gradlew test

          - name: 빌드
            run: ./gradlew build -x test

          - name: 테스트 결과 리포트
            if: always()    # 테스트가 실패해도 리포트는 업로드
            uses: actions/upload-artifact@v4
            with:
              name: test-reports
              path: build/reports/tests/test
    ```

    - 동작하는 순간 일어나는 일
        1. PR 올리면 자동으로 GitHub이 위 순서를 실행

        2. 한 단계라도 실패하면 PR에 x 표시

        3. 머지 버튼이 자동으로 비활성화 (Branch Protection 설정 시)

        4. 모든 체크가 통과해야 머지 가능

    - CD까지 한 단계 더

        ```yaml
        deploy:
          needs: build-and-test     # 위 job이 성공해야만 실행
          if: github.ref == 'refs/heads/main'
          runs-on: ubuntu-latest
          steps:
            - uses: actions/checkout@v4

            - name: JDK 17 설정
              uses: actions/setup-java@v4
              with:
                distribution: 'temurin'
                java-version: '17'

            - name: JAR 빌드
              run: ./gradlew bootJar -x test

            - name: AWS EC2로 배포
              run: ./scripts/deploy.sh build/libs/app.jar
              env:
                AWS_KEY: ${{ secrets.AWS_KEY }}
        ```

        - `needs: test` — test가 실패하면 배포 안 됨

        - `if: github.ref == 'refs/heads/main'` — main 머지일 때만

        - `secrets.*` — 민감 정보는 GitHub Secrets에 저장

## 문제 & 오류

Q. Squash merge / Rebase merge / Merge commit 중 뭘 써야 하나요?

> 정답은 없습니다. **팀 컨벤션을 정하고 일관되게** 가는 게 정답
> - **Squash merge**: PR을 1개 커밋으로 압축 / 히스토리 가장 깔끔 (가장 많이 사용)
>
> - **Rebase merge**: PR 커밋들을 일렬로 main에 붙임 / 커밋 단위 추적 가능
>
> - **Merge commit**: 머지 커밋 생성 / PR 단위가 명확히 구분됨

Q. Merge & Rebase

> ![image](/assets/img/notion/TIL-Git-&-PR-+-CI-CD-특강/06-dae5302fb1.png)

![image](/assets/img/notion/TIL-Git-&-PR-+-CI-CD-특강/07-c13ae95793.png)

Q. CI/CD 처음인데 어디서부터 시작하나요?

> **GitHub Actions의 가장 단순한 워크플로우 한 개**부터 시작하세요.
> 1. `npm test` 자동 실행만 먼저
>
> 2. 익숙해지면 빌드 추가
>
> 3. 그 다음 배포
> "한 번에 다 자동화"하려다 포기하는 경우가 가장 많습니다.
