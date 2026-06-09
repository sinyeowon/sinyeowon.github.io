---
title: "[TIL] 스프링 숙련 - 회원가입 구현"
title_source: "manual"
date: 2026-05-11 09:00:00 +0900
last_modified_at: 2026-06-09 01:28:00 +0900
categories: ["Spring 단기 심화", "Spring 강의"]
tags: ["Spring", "TIL", "내일배움캠프"]
description: "Spring에서 회원가입과 로그인 기능을 구현하며 계층별 역할을 정리하고, PasswordEncoder를 활용한 비밀번호 암호화·검증과 JWT 발급 및 쿠키 저장 흐름을 학습했다."
description_source: "notion"
permalink: "/posts/TIL-Spring-숙련-2026-05-11/"
english_url: "/en/posts/TIL-Spring-숙련-2026-05-11/"
notion_id: "35d7788a-fc66-8010-8d47-c4452137ba98"
notion_lang: "ko"
---
## 공부한 내용

### 회원가입 구현

- **회원가입 설계**

    ![image](/assets/img/notion/TIL-Spring-숙련/01-2179216dd3.png)

    - 회원 DB에 매핑되는 @Entity 클래스 구현

        ```java
        package com.sparta.springauth.entity;

        import jakarta.persistence.*;
        import lombok.Getter;
        import lombok.NoArgsConstructor;
        import lombok.Setter;

        @Entity
        @Getter
        @Setter
        @NoArgsConstructor
        @Table(name = "users")
        public class User {
            @Id
            @GeneratedValue(strategy = GenerationType.IDENTITY)
            private Long id;

            @Column(nullable = false, unique = true)
            private String username;

            @Column(nullable = false)
            private String password;

            @Column(nullable = false, unique = true)
            private String email;

            @Column(nullable = false)
            @Enumerated(value = EnumType.STRING)
            private UserRoleEnum role;
        }
        ```

        - `@Enumerated(value = EnumType.`*`STRING`*`)`
            - EnumType을 DB 컬럼에 저장할 때 사용하는 애너테이션입니다.

            - `EnumType.`*`STRING`* 옵션을 사용하면 Enum의 이름을 DB에 그대로 저장합니다.

            - `USER(Authority.USER)` → USER

    - 관리자 회원 가입 인가 방법
        - ‘관리자 가입 토큰’ 입력이 필요하도록: 랜덤하게 생성된 토큰 사용<br>
            ex) `"AAABnvxRVklrnYxKZ0aHgTBcXukeZygoC"`

        - 보통 현업에서는 위와 같이 권한을 부여하지 않음
            - 해커가 해당 암호를 갈취하게 되면, 관리자 권한을 쉽게 획득할 수 있기 때문

            - 실제로는,
                1. ‘관리자’ 권한을 부여할 수 있는 관리자 페이지 구현

                2. 승인자에 의한 결재 과정 구현 → 관리자 권한 부여

                처럼 구현하게 됨

- **패스워드 암호화 이해**<br>
<div class="notion-callout" markdown="1">

<div class="notion-callout-heading">
<span class="notion-callout-icon">📍</span> <span class="notion-callout-title">회원 등록 시, ‘비밀번호’는 사용자가 입력한 문자 그대로 DB에 등록하면 안됨</span>
</div>

‘정보통신망법, 개인정보보호법’에 의해 비밀번호 암호화(Encryption)가 의무임

</div>

    - 암호화 후, 패스워드 저장이 필요함
        - 평문 → (암호화 알고리즘) → 암호문
ex) “nobodynobody” → “$2a$10$..”

        - 만약 해커가 DB에 있는 앨리스의 패스워드 정보를 갈취하더라도 실제 암호를 알 수 없음

        - 그래서 복호화가 불가능한 **단방향 알고리즘 사용이 필요**함
            - **단방향 암호 알고리즘**
                - 암호화: 평문 → (암호화 알고리즘) → 암호문

                - 복호화: **불가** ~~(암호문 → (암호화 알고리즘) → 평문)~~

                - **그럼 사용자가 로그인 할 때는 암호화된 패스워드를 기억해야하는지**
                    - Password 확인 절차
                        1. 사용자가 로그인을 위해 “아이디, 패스워드 (평문)” 입력 → 서버에 로그인 요청
                            1. 서버에서 패스워드 (평문)을 암호화

                            2. 평문 → (암호화 알고리즘) → 암호문

                        2. **DB에 저장된 “아이디, 패스워드(암호문)”와 일치 여부 확인**

    - Password Matching<br>
<div class="notion-callout" markdown="1">

<div class="notion-callout-heading">
<span class="notion-callout-icon">📍</span> <span class="notion-callout-title">Spring Security라는 프레임워크에서 제공하는 비밀번호 암호화 기능을 사용</span>
</div>

Bean 수동등록 예제로 봤던 PasswordEncoder가 해당 Security에서 제공하는 비밀번호 암호화 메서드임

                사용자가 입력한 비밀번호가 암호화되어 저장된 비밀번호와 비교하여 일치여부를 확인해주는 기능도 가지고 있어 많이 사용됨

</div>

        ```java
        // 사용예시
        // 비밀번호 확인
        if(!passwordEncoder.matches("사용자가 입력한 비밀번호", "저장된 비밀번호")) {
        		   throw new IllegalAccessError("비밀번호가 일치하지 않습니다.");
         }
        ```

        - boolean matches(CharSequence rawPassword, String encodedPassword);
            - rawPassword : 사용자가 입력한 비밀번호

            - encodedPassword : 암호화되어 DB 에 저장된 비밀번호

- **회원가입 API 구현**

    ![image](/assets/img/notion/TIL-Spring-숙련/02-e63d1094c7.png)

    - SignupRequestDto

        ```java
        package com.sparta.springauth.dto;

        import lombok.Getter;
        import lombok.Setter;

        @Getter
        @Setter
        public class SignupRequestDto {
            private String username;
            private String password;
            private String email;
            private boolean admin = false;
            private String adminToken = "";
        }
        ```

    - UserService

        ```java
        package com.sparta.springauth.service;

        import java.util.Optional;

        import org.springframework.security.crypto.password.PasswordEncoder;
        import org.springframework.stereotype.Service;

        import com.sparta.springauth.dto.SignupRequestDto;
        import com.sparta.springauth.entity.User;
        import com.sparta.springauth.entity.UserRoleEnum;
        import com.sparta.springauth.repository.UserRepository;

        @Service
        public class UserService {

            private final UserRepository userRepository;
            private final PasswordEncoder passwordEncoder;

            public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
                this.userRepository = userRepository;
                this.passwordEncoder = passwordEncoder;
            }

            // ADMIN_TOKEN
            private final String ADMIN_TOKEN = "AAABnvxRVklrnYxKZ0aHgTBcXukeZygoC";

            public void signup(SignupRequestDto requestDto) {
                String username = requestDto.getUsername();
                String password = passwordEncoder.encode(requestDto.getPassword());

                // 회원 중복 확인
                Optional<User> checkUsername = userRepository.findByUsername(username);
                if (checkUsername.isPresent()) {
                    throw new IllegalArgumentException("중복된 사용자가 존재합니다.");
                }

                // email 중복확인
                String email = requestDto.getEmail();
                Optional<User> checkEmail = userRepository.findByEmail(email);
                if (checkEmail.isPresent()) {
                    throw new IllegalArgumentException("중복된 Email 입니다.");
                }

                // 사용자 ROLE 확인
                UserRoleEnum role = UserRoleEnum.USER;
                if (requestDto.isAdmin()) {
                    if (!ADMIN_TOKEN.equals(requestDto.getAdminToken())) {
                        throw new IllegalArgumentException("관리자 암호가 틀려 등록이 불가능합니다.");
                    }
                    role = UserRoleEnum.ADMIN;
                }

                // 사용자 등록
                User user = new User(username, password, email, role);
                userRepository.save(user);
            }
        }
        ```

    - UserController

        ```java
        package com.sparta.springauth.controller;

        import org.springframework.stereotype.Controller;
        import org.springframework.web.bind.annotation.GetMapping;
        import org.springframework.web.bind.annotation.PostMapping;
        import org.springframework.web.bind.annotation.RequestMapping;

        import lombok.RequiredArgsConstructor;

        import com.sparta.springauth.dto.SignupRequestDto;
        import com.sparta.springauth.service.UserService;

        @Controller
        @RequestMapping("/api")
        @RequiredArgsConstructor
        public class UserController {

            private final UserService userService;

            @GetMapping("/user/login-page")
            public String loginPage() {
                return "login";
            }

            @GetMapping("/user/signup")
            public String signupPage() {
                return "signup";
            }

            @PostMapping("/user/signup")
            public String singup(SignupRequestDto requestDto) {
                userService.signup(requestDto);

                return "redirect:/api/user/login-page";
            }
        }
        ```

    - UserRepository

        ```java
        package com.sparta.springauth.repository;

        import java.util.Optional;

        import org.springframework.data.jpa.repository.JpaRepository;

        import com.sparta.springauth.entity.User;

        public interface UserRepository extends JpaRepository<User, Long> {

            Optional<User> findByUsername(String username);

            Optional<User> findByEmail(String email);

        }
        ```

### 로그인 구현

- 로그인 API 설계
    ![image](/assets/img/notion/TIL-Spring-숙련/03-b2faf6d8de.png)

- LoginRequestDto

    ```java
    package com.sparta.springauth.dto;

    import lombok.Getter;
    import lombok.Setter;

    @Setter
    @Getter
    public class LoginRequestDto {
        private String username;
        private String password;
    }
    ```

- UserService

    ```java
    package com.sparta.springauth.service;

    import java.util.Optional;

    import jakarta.servlet.http.HttpServletResponse;

    import org.springframework.security.crypto.password.PasswordEncoder;
    import org.springframework.stereotype.Service;

    import lombok.RequiredArgsConstructor;

    import com.sparta.springauth.dto.LoginRequestDto;
    import com.sparta.springauth.dto.SignupRequestDto;
    import com.sparta.springauth.entity.User;
    import com.sparta.springauth.entity.UserRoleEnum;
    import com.sparta.springauth.jwt.JwtUtil;
    import com.sparta.springauth.repository.UserRepository;

    @Service
    @RequiredArgsConstructor
    public class UserService {

        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final JwtUtil jwtUtil;

        // ADMIN_TOKEN
        private final String ADMIN_TOKEN = "AAABnvxRVklrnYxKZ0aHgTBcXukeZygoC";

        public void signup(SignupRequestDto requestDto) {
            String username = requestDto.getUsername();
            String password = passwordEncoder.encode(requestDto.getPassword());

            // 회원 중복 확인
            Optional<User> checkUsername = userRepository.findByUsername(username);
            if (checkUsername.isPresent()) {
                throw new IllegalArgumentException("중복된 사용자가 존재합니다.");
            }

            // email 중복확인
            String email = requestDto.getEmail();
            Optional<User> checkEmail = userRepository.findByEmail(email);
            if (checkEmail.isPresent()) {
                throw new IllegalArgumentException("중복된 Email 입니다.");
            }

            // 사용자 ROLE 확인
            UserRoleEnum role = UserRoleEnum.USER;
            if (requestDto.isAdmin()) {
                if (!ADMIN_TOKEN.equals(requestDto.getAdminToken())) {
                    throw new IllegalArgumentException("관리자 암호가 틀려 등록이 불가능합니다.");
                }
                role = UserRoleEnum.ADMIN;
            }

            // 사용자 등록
            User user = new User(username, password, email, role);
            userRepository.save(user);
        }

        public void login(LoginRequestDto requestDto, HttpServletResponse res) {
            String username = requestDto.getUsername();
            String password = requestDto.getPassword();

            // 사용자 확인
            User user = userRepository.findByUsername(username).orElseThrow(
                    () -> new IllegalArgumentException("등록된 사용자가 없습니다.")
            );

            // 비밀번호 확인
            if(!passwordEncoder.matches(password, user.getPassword())) {
                throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
            }

            // JWT 생성 및 쿠키에 저장 후 Response 객체에 추가
            String token = jwtUtil.createToken(user.getUsername(), user.getRole());
            jwtUtil.addJwtToCookie(token, res);

        }
    }
    ```
