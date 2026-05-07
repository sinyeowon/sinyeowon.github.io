---
layout: "post"
title: "[TIL] Git & PR + CI/CD Special Lecture"
date: 2026-05-06 09:00:00 +0900
last_modified_at: 2026-05-06 15:09:00 +0900
categories: ["Spring 단기 심화"]
tags: ["Git", "CI/CD"]
description: "This article summarizes what I studied after attending a special lecture on Git & PR + CI/CD."
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-Git-&-PR-+-CI-CD-특강/"
original_url: "/posts/TIL-Git-&-PR-+-CI-CD-특강/"
notion_id: "3587788a-fc66-8089-892a-dad32b993e3a"
notion_lang: "en"
---
## What I studied

### **Git Flow branching strategy**

If you do not have a branching strategy, accidents may occur such as your work overwriting your colleague's work, unfinished code mixed in when you are about to deploy, or wanting to roll back but having no reference point.

→ Branch strategy = accident prevention device

- 5 branches of Git Flow

  | branch | Role | branch | Merge target | Lifespan |
  | --- | --- | --- | --- | --- |
  | `main` | Production code. Always available for deployment | — | — | permanent |
  | `develop` | Next release integration branch. Where all features gather | First time in main | — | permanent |
  | `feature/*` | New feature development | develop | develop | Temporary |
  | `release/*` | Ready for launch. Allow bug fixes only | develop | main + develop | Temporary |
  | `hotfix/*` | Emergency fix for operational bugs | main | main + develop | Temporary |

  ![image](/assets/img/notion/TIL-Git-&-PR-+-CI-CD-특강/01-a9615f8ef8.png)

- Github Flow and Git Flow

  | Category | Git Flow | Github Flow |
  | --- | --- | --- |
  | Branch Structure | Strict management with 5 branches | `main` • Use only `feature` (simple) |
  | suitable situation | Regular releases, version control | Web services, SaaS, CD where rapid deployment is important |
  | Well-suited domain | Mobile apps, package libraries | web service |
  | Disadvantages | complicacy. May be overkill for small teams | Difficult to operate multiple versions simultaneously |
  | Compatibility with distribution | Not compatible with rapid distribution (CD) | PR Merge = Immediate Deployment |
  | Prerequisites | — | Automated testing is an essential premise |

  > Most startups/web services start with Github Flow and expand to Git Flow as they grow.

### **PR Workflow and Code Review**- Pull Request (PR): A formal request to merge my branch work into main (or develop)

- 3 things PR does

  | Role | Description |
  | --- | --- |
  | 👀 **Code review chapter** | A space for colleagues to view changes and leave feedback |
  | 🧪 **Automatic Verification Trigger** | Run CI pipeline (automatically perform build/test) |
  | 📜 **Record change history** | Permanently preserve why/what/when you changed |

  - PR is a trigger that starts a code review and a change diary that I will read in the future.

- PR life cycle

  ```bash
  1. Branch → feature/login 같은 작업 브랜치 생성
  2. Commit & Push → 작업 내용을 원격에 푸시
  3. Open PR → GitHub UI에서 PR 생성, 리뷰어 지정
  4. Review → 코드 리뷰 + CI 검증 → 수정 → 재푸시
  5. Approve & Merge → 승인 후 머지, 브랜치 삭제

  ```

- Actual command flow

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

- How to write a good PR

  - Break it down into small pieces - 200 to 400 lines / single purpose

  - Title should be clear in one line - ex) `[FIX] 로그인 토큰 만료 시 자동 리프레시 처리`

  - Include context in the text

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

  - Self-review first - Re-read self-PR immediately after push

- Code review is not censorship
  - As a reviewer,
    - Criticize the code, but not the people

    - Ask questions first, no assumptions

    - Praise the things you did well

  - As an author,
    - Explain your intentions without being defensive.

    - If you agree, reflect, if you disagree, discuss based on the evidence.

    - Reviews will be responded to within 24 hours

    - Thank you

### **Merge and Rebase**

- Merge: Merge commit to combine two histories
  ![image](/assets/img/notion/TIL-Git-&-PR-+-CI-CD-특강/02-ac94822e48.png)

  - Preservation of history - who worked on which branch remains intact

  - Safe - existing commits are never changed

  - History becomes complicated - As merge commits accumulate, git log becomes complicated.

- Rebase: Paste my commit at the end of main
  ![image](/assets/img/notion/TIL-Git-&-PR-+-CI-CD-특강/03-e678a100d5.png)

  - History is clean - git log is in one straight line

  - No merge commits - remove noise

  - Existing commits are replaced with new commits - Collaboration is destroyed if done on a shared branch.

- When to use what (Merge & Rebase)| standards | Merge | Rebase |

  | --- | --- | --- |
  | History | Preserve as is | Organize in one line |
  | commit hash | unchanged | Newly created |
  | Conflict handling | at once | per commit |
  | Recommended Situation | **Shared branch integration** | **Clean up my local branch** |

  **→ You should never rebase a public branch that has already been pushed**

- What you should never do
  - `git push -- force` on the shared branch → completely destroys the colleague's commit

  - Where force push is safe
    - My local feature branch

    - I push it, but only I use the branch.

    - Clean up commits just before PR merge

    - After reflecting the review, squash

  - Absolutely prohibited.
    - `main` / `develop`

    - Branch pushed by multiple people

    - Merged PR branch

    - Branch with release tag

> Using `git push --force-with-lease` causes it to fail when the remote is not what I expected
> → If force push is required, always use `--force-with-lease`

### **Conflict resolution**

Conflicts occur when two branches modify the same line in the same file differently.

- Conflict markers that Git leaves in files

  ```bash
  <<<<<<< HEAD
    private final int TIMEOUT = 3000;       // 내 변경 (현재 브랜치)
  =======
    private final int TIMEOUT = 5000;       // 들어오는 변경 (다른 브랜치)
  >>>>>>> feature/api
  ```

  → Conflicts are not errors, but Git is requesting my judgment.

- 5 steps to conflict resolution

  1. Check current status - `git status`

  1. Open the file and find the marker
    Check the location of `<<<<<<<` / `=======` / `>>>>>>>` → Decide which code to use

  1. Modify to desired form

  1. Staging + Commit

    ```bash
    git add .
    git commit
    # 머지 진행 중 상태가 종료됨
    ```

  1. Test + Push

    ```bash
    npm test       # 충돌 해결로 깨진 곳이 없는지 반드시 확인
    git push
    ```

  - If it's still a mess

    ```bash
    git merge --abort   # 머지 시작 전으로 되돌림
    git rebase --abort  # rebase 중이면
    ```

### **CI/CD Pipeline Introduction**- Difference between manual deployment and automation
  ![image](/assets/img/notion/TIL-Git-&-PR-+-CI-CD-특강/04-8f8d92b96d.png)

  - After introducing CI/CD
    - Test runs automatically when PR is raised

    - main merge = automatic deployment

    - Immediate Slack notification in case of failure

    - No room for human error

    - Number of distributions ↑ / Accidents ↓

- CI/CD pipeline flow

  ![image](/assets/img/notion/TIL-Git-&-PR-+-CI-CD-특강/05-b54ee9d439.png)

  | steps | What to do |
  | --- | --- |
  | **Source** | Triggered by PR/Push event |
  | **Build** | Compilation / Packaging / Docker image creation |
  | **Test** | Unit Testing + Integration Testing + Lint |
  | **Deploy** | Stage environment deployment → Prod deployment |

  → If even one step fails, it stops immediately + notification / broken builds never advance to the next step

> **CI/CD Terminology**
>
> | Abbreviation | Full name | Meaning |
> | --- | --- | --- |
> | CI | Continuous **Integration** | Frequent code integration and automatic verification |
> | CD | Continuous **Delivery** | Stay deployable at any time (manual approval) |
> | CD | Continuous **Deployment** | If passed, automatically distributed to operation |

- Get started in 30 lines with Github Actions

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

  - What happens the moment it moves
    1. When you post a PR, GitHub automatically executes the above sequence.

    1. If even one step fails, mark x in PR

    1. Merge button is automatically disabled (when Branch Protection is set)

    1. Merge is possible only if all checks pass.

  - One step further to CD

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

    - `needs: test` — If the test fails, it will not be distributed

    - `if: github.ref == 'refs/heads/main'` — only during main merge

    - `secrets.*` — Sensitive information is stored in GitHub Secrets

## Problems & ErrorsQ. Should I use Squash merge / Rebase merge / Merge commit?

> There is no right answer. **The answer is to set a team convention and go consistently**
> - **Squash merge**: Compress PR into 1 commit / Cleanest history (most used)
>
> - **Rebase merge**: Attach PR commits to main in a row / Enable track of commit units
>
> - **Merge commit**: Merge commit creation / PR units are clearly distinguished

Q. Merge & Rebase

>![image](/assets/img/notion/TIL-Git-&-PR-+-CI-CD-특강/06-dae5302fb1.png)

![image](/assets/img/notion/TIL-Git-&-PR-+-CI-CD-특강/07-c13ae95793.png)

Q. This is my first time with CI/CD. Where do I start?

> Start with **one of the simplest workflows in GitHub Actions**.
> 1. Just run `npm test` automatically first.
>
> 1. Add builds when you get used to it
>
> 1. Then deploy
> Most people give up trying to “automate everything at once”.
