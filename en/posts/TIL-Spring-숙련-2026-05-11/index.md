---
layout: "post"
title: "[TIL] Spring Skills - Membership Registration Implementation"
title_source: "manual"
date: 2026-05-11 09:00:00 +0900
last_modified_at: 2026-05-12 12:34:00 +0900
categories: ["Spring 단기 심화", "Spring 강의"]
tags: ["Spring", "TIL", "내일배움캠프"]
description: "This article summarizes the member entity, permission enum, administrator sign-up token, PasswordEncoder-based password encryption, and member sign-up API implementation flow."
description_source: "manual"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-Spring-숙련-2026-05-11/"
original_url: "/posts/TIL-Spring-숙련-2026-05-11/"
notion_id: "35d7788a-fc66-8010-8d47-c4452137ba98"
notion_lang: "en"
---
## What I studied

### Membership registration implementation

- **Membership registration design**

    ![image](/assets/img/notion/TIL-Spring-숙련/01-2179216dd3.png)

    - Implement @Entity class mapped to member DB

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
            - This is an annotation used when storing EnumType in a DB column.

            - If you use the `EnumType.`*`STRING`* options, the name of the enum is stored in the DB as is.

            - `USER(Authority.USER)` → USER

    - How to authorize administrator membership
        - Requires entry of ‘administrator sign-up token’: Use of randomly generated tokens<br>
            ex) `"AAABnvxRVklrnYxKZ0aHgTBcXukeZygoC"`

        - Usually, in the field, the above authority is not granted.
            - If a hacker steals the password, he or she can easily obtain administrator privileges.

            - Actually,
                1. Implementation of an administrator page that can grant ‘administrator’ privileges

                2. Implementation of approval process by approver → Grant administrator authority

                Implemented like this:

- **Understanding Password Encryption**<br>
    > When registering as a member, the ‘password’ must not be registered in the DB exactly as it was entered by the user.
    > Password encryption is mandatory under the ‘Information and Communications Network Act and Personal Information Protection Act’

    - After encryption, password storage is required.
        - Plaintext → (Encryption algorithm) → Ciphertext
ex) “nobodynobody” → “$2a$10$..”

        - Even if a hacker steals Alice’s password information in the DB, the actual password cannot be known.

        - Therefore, decryption is impossible **one-way algorithm must be used**
            - **One-way encryption algorithm**
                - Encryption: Plaintext → (Encryption algorithm) → Ciphertext- Decryption: **Not possible** ~~(ciphertext → (encryption algorithm) → plaintext)~~

                - **Then, does the user have to remember the encrypted password when logging in?**
                    - Password confirmation procedure
                        1. User enters “ID, password (plain text)” to log in → Request to log in to server
                            1. Encrypt the password (plaintext) on the server

                            2. Plaintext → (Encryption algorithm) → Ciphertext

                        2. **Check whether it matches the “ID, password (ciphertext)” stored in the DB**

    - Password Matching<br>
        > Use the password encryption function provided by a framework called Spring Security.
        > PasswordEncoder, which we saw as an example of manual bean registration, is a password encryption method provided by the security.
        >
        > It is also widely used as it has a function that compares the password entered by the user with the encrypted and stored password to check whether it matches.

        ```java
        // 사용예시
        // 비밀번호 확인
        if(!passwordEncoder.matches("사용자가 입력한 비밀번호", "저장된 비밀번호")) {
        		   throw new IllegalAccessError("비밀번호가 일치하지 않습니다.");
         }
        ```

        - boolean matches(CharSequence rawPassword, String encodedPassword);
            - rawPassword: Password entered by the user

            - encodedPassword: Password encrypted and stored in DB

- **Implementation of membership registration API**

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

### Login implementation- Login API design
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
