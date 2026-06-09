---
layout: "post"
title: "[TIL] DB separation and collaboration structure concerns faced when starting the MSA project"
date: 2026-05-18 09:00:00 +0900
last_modified_at: 2026-05-21 01:22:00 +0900
categories: ["Spring 단기 심화", "숙련 프로젝트"]
tags: ["project", "MSA"]
description: "Analyzed the architectural trade-offs between schema separation and logical database separation in PostgreSQL for MSA, and established a Gradle multi-module project structure for efficient team collaboration."
description_source: "notion"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-MSA-프로젝트를-시작하며-마주한-DB-분리와-협업-구조-고민/"
original_url: "/posts/TIL-MSA-프로젝트를-시작하며-마주한-DB-분리와-협업-구조-고민/"
notion_id: "3657788a-fc66-8027-99a9-df896fed7919"
notion_lang: "en"
---
## What I did today

- Organized PostgreSQL's schema separation and logical DB separation methods based on SA feedback

- Learning DB separation standards and UUID reference method for each service in MSA structure

- Create GitHub repository and clone to IntelliJ

- Create `dev` branch and set default branch

- Invite team member collaborators

- Creation of basic folder structure for each MSA service

- Create issue/PR template

- Set `dev` branch protection rules via GitHub Ruleset

- Summary of Gradle multi-module structure and `build.gradle` role for each root/module

    <hr>

## What I Learned

### Schema separation and logical DB separation are different in PostgreSQL

At first, I thought of creating a DB within one PostgreSQL instance and dividing the schema for each service within it.

```markdown
PostgreSQL 인스턴스 1개
└── delivery_db
    ├── user_schema
    ├── hub_schema
    ├── company_schema
    ├── order_schema
    └── slack_schema
```

→ However, through the tutor's feedback, I learned that dividing it into logical DBs for each service may be more appropriate in the MSA structure.

<div class="notion-indent" markdown="1">

```markdown
PostgreSQL 인스턴스 1개
├── user_db
├── hub_db
├── company_db
├── order_db
└── slack_db
```

- Both may have one PostgreSQL server, but the dividing unit is different.
    - Schema separation is dividing areas within one DB, and logical DB separation is dividing the database itself by service within a PostgreSQL instance.

</div>

### Logical DB separation is a structure to reduce direct references between services

Even if you divide the schema, you can directly query or join tables in other schemas because they are in the same DB.

- In this way, the ordering service directly knows the table structure of the user service.

- If the column or structure of the user table changes, the order service may be affected, ultimately increasing the degree of coupling between services.

→ On the other hand, if you divide it into logical DBs, you can make each service access only its own DB.

<div class="notion-indent" markdown="1">

```markdown
User Service → user_db만 접근
Hub Service → hub_db만 접근
Company Service → company_db만 접근
Order Service → order_db만 접근
Slack Service → slack_db만 접근
```

- If you do this, it becomes difficult to directly join tables from other services, and each service becomes responsible only for its own data.

</div>

### UUID is only an identifier and does not separate the DB structure.

At first, there was a question, “Isn’t it okay to refer to it by UUID even if it is in the same DB or schema?”

- Functionally it is possible.

- For example, if you store UUID values ​​such as `user_id` and `product_id` in the order table, you can know which user and product the order refers to.

→ However, UUID is only a value to identify data, and is not a concept that separates the DB structure itself.

<div class="notion-indent" markdown="1">

```markdown
UUID = 데이터를 식별하는 방법
논리 DB = 서비스별 데이터 공간을 분리하는 방법
```

- Even in the schema separation method, it is possible to set rules such as “No direct JOIN to other schemas” and “Search for other service data through API.”

- But in the end, this is a method that relies on promises.

</div>

### Tables within the same service can be referenced

Logical DB separation is intended to prevent direct references to DBs of other services, but does not prevent references between tables within the same service.

For example, `p_hub` and `p_hub_to_hub` in `hub_db` are both data owned by the hub service, so they can refer to each other.

```plaintext
hub_db
└── public
    ├── p_hub
    └── p_hub_to_hub
```

In other words, FK or JOIN can be used between tables within the same service. However, direct FK or JOIN with the DB of another service should be avoided.

### Understand Gradle multi-module structure

The team project was decided to proceed with a structure that manages multiple microservices within one GitHub repo.

Therefore, we decided that using the Gradle multi-module structure was a natural direction.

- In the multi-module structure, `settings.gradle` and `build.gradle` are placed in the root, and individual `build.gradle` is placed in each service folder.

    ```plaintext
    hub-delivery-system
    ├── build.gradle
    ├── settings.gradle
    ├── common-module
    │   └── build.gradle
    ├── eureka-server
    │   └── build.gradle
    ├── gateway-service
    │   └── build.gradle
    ├── user-service
    │   └── build.gradle
    └── ...
    ```

- Root `build.gradle` manages all common settings such as Java version, Spring Boot version, common repository, and test settings.

    - On the other hand, `build.gradle` of each module separately manages the dependencies required for the service.

    <hr>

## Troubleshooting and concerns

### 1. I kept getting confused about schema separation and logical DB separation.

At first, I thought it would be enough to split the schema and refer to it only by UUID. However, because schema separation only divides sections within the same DB, the problem was that it was possible to directly join tables from different schemas.

In the end, the key was not “whether UUID should be used,” but “how much DB access between services can be structurally separated?” Because logical DB separation allows each service to access only its own DB, data ownership of the MSA can be expressed more clearly.

### 2. I was wondering what the scope of the initial project settings should be.

At first, I was confused whether I should just create the folder structure or whether I should also create `build.gradle`, `settings.gradle`, `Dockerfile`, and `application.yml`.

In summary, it could be dangerous for the initial setup manager to create all the files right away. This is because the settings for each service's Spring Boot project, Dockerfile, and application.yml may be different for each person in charge.

So, we decided that it would be appropriate to proceed to the following scope first.

- Create repo

- Invite team member collaborators

- Create `dev` branch and set default branch

- Create basic folder structure

- Added `.gitkeep`

- Create PR/Issue template

- GitHub Ruleset Settings

- Creation of `settings.gradle`, root `build.gradle`, and `build.gradle` basic framework for multi-module basic structureOn the other hand, `src`, `application.yml`, `Dockerfile`, and actual service codes were organized by adding them later by each service representative.

<hr>

## Today’s Summary

Today, beyond simply creating a repo, I thought a lot about how to establish the initial structure of the MSA project.

In particular, the biggest benefit was understanding the difference between schema separation and logical DB separation in DB separation method. Schema separation is also possible, but this is closer to a promise not to join directly. On the other hand, logical DB separation is a method of structurally dividing data boundaries for each service more strongly.

I also experienced the process of setting up an initial collaboration environment in a team project by creating a GitHub repo, setting up a dev branch, creating a folder structure, setting up a PR/Issue template, and GitHub Ruleset.

What I felt today is that the initial setup is not simply “creating a folder,” but is an important task that determines how team members will develop and collaborate in the future. If you set good standards in the beginning, you will be able to reduce conflicts and confusion during the later development process.
