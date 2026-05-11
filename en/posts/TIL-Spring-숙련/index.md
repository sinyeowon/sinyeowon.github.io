---
layout: "post"
title: "[TIL] Spring Advanced - JWT authentication and role management"
date: 2026-05-10 09:00:00 +0900
last_modified_at: 2026-05-11 10:25:00 +0900
categories: ["Spring 단기 심화", "Spring 강의"]
tags: ["Spring", "TIL", "내일배움캠프"]
description: "This post summarizes adding JWT dependencies, configuring the secret key, building JwtUtil, managing user roles with an enum, and creating tokens."
description_source: "manual"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-Spring-숙련/"
original_url: "/posts/TIL-Spring-숙련/"
notion_id: "35c7788a-fc66-805b-b95d-efebac969913"
notion_lang: "en"
title_source: "manual"
---
## What I studied

### Handling JWTs

- Add JWT dependency

- set jwt.secret.key to `application.properties`

>Util class
> : refers to a class that has methods that perform operations on specific parameters (parameters).
> → A class that operates as a module without depending on other objects

We plan to create a class called JwtUtil with JWT-related functions to perform JWT-related functions.

- **JWT-related features**
  1. Create JWT

  2. Save the generated JWT in Cookie

  3. Substring the JWT token contained in the cookie

  4. JWT verification

  5. Get user information from JWT

- Data required for token creation

  ```java
  // Header KEY 값
  public static final String AUTHORIZATION_HEADER = "Authorization";
  // 사용자 권한 값의 KEY
  public static final String AUTHORIZATION_KEY = "auth";
  // Token 식별자
  public static final String BEARER_PREFIX = "Bearer ";
  // 토큰 만료시간
  private final long TOKEN_TIME = 60 * 60 * 1000L; // 60분

  @Value("${jwt.secret.key}") // Base64 Encode 한 SecretKey
  private String secretKey;
  private Key key;
  private final SignatureAlgorithm signatureAlgorithm = SignatureAlgorithm.HS256;

  // 로그 설정
  public static final Logger logger = LoggerFactory.getLogger("JWT 관련 로그");

  @PostConstruct
  public void init() {
      byte[] bytes = Base64.getDecoder().decode(secretKey);
      key = Keys.hmacShaKeyFor(bytes);
  }
  ```

  - Write the Secret Key encoded in Base64 in properties and retrieve it through @Value.

  - Encrypt with the Secret Key taken when creating the JWT.
    - At this time, the encoded Secret Key is decoded and used.

    - Key is an object containing the decoded Secret Key.

    - @PostConstruct is used to prevent the mistake of calling a new request every time you use a value that only needs to be received once. 
      - Executes after calling the constructor of the JwtUtil class and injects the value into the Key field.

  - The encryption algorithm uses the HS256 algorithm.

  - Bearer indicates that a JWT or OAuth token is used.

  - Logging means recording project status or operation information in chronological order while the application is running.
    - We will proceed with logging using the Logback logging framework.

> User permission types are managed with an enum.
>
> - Used when adding a user's role to the token while creating a JWT.
>
> ```java
> public enum UserRoleEnum {
>     USER(Authority.USER),  // 사용자 권한
>     ADMIN(Authority.ADMIN);  // 관리자 권한
>
>     private final String authority;
>
>     UserRoleEnum(String authority) {
>         this.authority = authority;
>     }
>
>     public String getAuthority() {
>         return this.authority;
>     }
>
>     public static class Authority {
>         public static final String USER = "ROLE_USER";
>         public static final String ADMIN = "ROLE_ADMIN";
>     }
> }
> ```
>
> <details markdown="1">
> <summary>Code description</summary>
>
> - `UserRoleEnum` is a class that manages user roles as an enum.
>
>   - Using an enum helps prevent typos because permission values do not need to be written directly as strings.
>
>   - The current roles are `USER` and `ADMIN`.
>
> ```java
> USER(Authority.USER),
> ADMIN(Authority.ADMIN);
> ```
>
> - `USER` is a normal user role.
>
> - `ADMIN` is an administrator role.
>
> - The `authority` field stores the authority string used by Spring Security.
>
> ```java
> private final String authority;
> ```
>
> - Spring Security typically uses authority values with the `ROLE_` prefix.
>
> ```plaintext
> ROLE_USER
> ROLE_ADMIN
> ```
>
> - The enum constructor stores the authority string.
>
> ```java
> UserRoleEnum(String authority) {
>     this.authority = authority;
> }
> ```
>
> - The authority string passed while creating the enum is stored in the `authority` field.
>
> ```java
> USER("ROLE_USER")
> ADMIN("ROLE_ADMIN")
> ```
>
> - The `getAuthority()` method returns the stored authority string.
>
> ```java
> public String getAuthority() {
>     return this.authority;
> }
> ```
>
> - Example
>
> ```java
> UserRoleEnum.USER.getAuthority()
> ```
>
> ```plaintext
> ROLE_USER
> ```
>
> - The `Authority` inner class manages authority string constants.
>
> ```java
> public static class Authority {
>     public static final String USER = "ROLE_USER";
>     public static final String ADMIN = "ROLE_ADMIN";
> }
> ```
>
> - Managing authority strings as constants removes the need to write raw strings repeatedly.
>
> - This prevents typos and improves maintainability.
>
> ```java
> "ROLE_USRE" // typo-prone
> ```
>
> - Overall flow
>
>   - Enum name
>
> ```java
> UserRoleEnum.USER
> ```
>
> → Role type used in code
>
>   - Actual authority string
>
> ```java
> UserRoleEnum.USER.getAuthority()
> ```
>
> → Authority value recognized by Spring Security
>
> ```plaintext
> ROLE_USER
> ```
>
> - Summary
>
>   - `UserRoleEnum`
>     - Manages user role types as an enum.
>
>   - `Authority`
>     - Manages actual authority string constants.
>
>   - `getAuthority()`
>     - Returns the authority string used by Spring Security.
>
>   - Purpose
>     - To manage roles safely and consistently.
>
> </details>

1. Create JWT

    ```java
    // 토큰 생성
    public String createToken(String username, UserRoleEnum role) {
        Date date = new Date();

        return BEARER_PREFIX +
                Jwts.builder()
                        .setSubject(username) // 사용자 식별자값(ID)
                        .claim(AUTHORIZATION_KEY, role) // 사용자 권한
                        .setExpiration(new Date(date.getTime() + TOKEN_TIME)) // 만료 시간
                        .setIssuedAt(date) // 발급일
                        .signWith(key, signatureAlgorithm) // 암호화 알고리즘
                        .compact();
    }
    ```

    - Insert the user's identification value, i.e. ID, into the subject of the JWT.

    - Insert the user’s authorization information into the JWT. You can check it through the key value in key-value format.

    - Enter the token expiration time. It is based on ms.

    - Insert the date of issue into issuedAt.

    - Enter the key containing the secretKey value and the encryption algorithm in signWith.
      - Encrypt JWT using ket and encryption algorithm.

2. Save to JWT Cookie

    ```java
    // JWT Cookie 에 저장
    public void addJwtToCookie(String token, HttpServletResponse res) {
        try {
            token = URLEncoder.encode(token, "utf-8").replaceAll("\\+", "%20");
            // Cookie Value 에는 공백이 불가능해서 encoding 진행

            Cookie cookie = new Cookie(AUTHORIZATION_HEADER, token); // Name-Value
            cookie.setPath("/");

            // Response 객체에 Cookie 추가
            res.addCookie(cookie);
        } catch (UnsupportedEncodingException e) {
            logger.error(e.getMessage());
        }
    }
    ```

3. JWT token substring, which is the value of the received cookie

    ```java
    // JWT 토큰 substring
    public String substringToken(String tokenValue) {
        if (StringUtils.hasText(tokenValue) && tokenValue.startsWith(BEARER_PREFIX)) {
            return tokenValue.substring(7);
        }
        logger.error("Not Found Token");
        throw new NullPointerException("Not Found Token");
    }
    ```

    - Use StringUtils.hasText to check for blanks and nulls, and startsWith to check if the starting value of the token is Bearer.

    - If correct, truncate the Bearer using substring to return a pure JWT.

4. JWT verification

    ```java
    // 토큰 검증
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (SecurityException | MalformedJwtException | SignatureException e) {
            logger.error("Invalid JWT signature, 유효하지 않는 JWT 서명 입니다.");
        } catch (ExpiredJwtException e) {
            logger.error("Expired JWT token, 만료된 JWT token 입니다.");
        } catch (UnsupportedJwtException e) {
            logger.error("Unsupported JWT token, 지원되지 않는 JWT 토큰 입니다.");
        } catch (IllegalArgumentException e) {
            logger.error("JWT claims is empty, 잘못된 JWT 토큰 입니다.");
        }
        return false;
    }
    ```

    - You can use `Jwts.parserBuilder()` to parse JWT.

    - Check that the JWT has not been forged or altered by entering the secretKey (key) value.

5. Get user information from JWT

    ```java
    // 토큰에서 사용자 정보 가져오기
    public Claims getUserInfoFromToken(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
    }
    ```

    - The **Payload** part of the JWT structure contains information contained in the token.

    - A ‘piece’ of information contained here is called a claim (**claim**), and it consists of a key-value pair. A token can contain multiple claims.

    - Use `Jwts.parserBuilder()` and secretKey to retrieve JWT Claims and use the user information contained therein.
