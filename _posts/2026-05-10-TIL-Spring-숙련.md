---
title: "[TIL] 스프링 숙련 - JWT 인증과 권한 관리"
title_source: "manual"
date: 2026-05-10 09:00:00 +0900
last_modified_at: 2026-06-09 01:27:00 +0900
categories: ["Spring 단기 심화", "Spring 강의"]
tags: ["Spring", "TIL", "내일배움캠프"]
description: "Spring에서 JWT 인증을 구현하는 흐름을 정리하며 JwtUtil을 통한 토큰 생성, 쿠키 저장, Bearer 토큰 처리, 검증, Claims 추출 방법과 UserRoleEnum을 활용한 권한 관리 방식을 학습했다."
description_source: "notion"
english_url: "/en/posts/TIL-Spring-숙련/"
notion_id: "35c7788a-fc66-805b-b95d-efebac969913"
notion_lang: "ko"
---
## 공부한 내용

### JWT 다루기

- JWT dependency 추가하기

- `application.properties`에 jwt.secret.key 설정

#### JWT Util 만들기

> Util 클래스
> : 특정 매개 변수(파라미터)에 대한 작업을 수행하는 메서드들이 존재하는 클래스를 뜻함
> → 다른 객체에 의존하지 않고, 하나의 모듈로서 동작하는 클래스

JWT 관련 기능들을 가진 JwtUtil이라는 클래스를 만들어 JWT 관련 기능을 수행시킬 예정

- **JWT 관련 기능**
    1. JWT 생성

    2. 생성된 JWT를 Cookie에 저장

    3. Cookie에 들어있던 JWT 토큰을 Substring

    4. JWT 검증

    5. JWT에서 사용자 정보 가져오기

- 토큰 생성에 필요한 데이터

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

    - Base64로 Encode된 Secret Key를 properties에 작성해두고 @Value를 통해 가져옵니다.

    - JWT를 생성할 때 가져온 Secret Key로 암호화합니다.
        - 이때 Encode된 Secret Key를 Decode 해서 사용합니다.

        - Key는 Decode된 Secret Key를 담는 객체입니다.

        - @PostConstruct는 딱 한 번만 받아오면 되는 값을 사용 할 때마다 요청을 새로 호출하는 실수를 방지하기 위해 사용됩니다. 
            - JwtUtil 클래스의 생성자 호출 이후에 실행되어 Key 필드에 값을 주입 해줍니다.

    - 암호화 알고리즘은 HS256 알고리즘을 사용합니다.

    - Bearer 란 JWT 혹은 OAuth에 대한 토큰을 사용한다는 표시입니다.
        - Bearer이란<br>
            <a class="notion-mention" href="https://docs.tosspayments.com/resources/glossary/bearer-auth">https://docs.tosspayments.com/resources/glossary/bearer-auth</a>

    - 로깅이란 애플리케이션이 동작하는 동안 프로젝트의 상태나 동작 정보를 시간순으로 기록하는 것을 의미합니다.
        - 우리는 Logback 로깅 프레임워크를 사용해서 로깅을 진행하도록 하겠습니다.

    

<div class="notion-callout" markdown="1">

<div class="notion-callout-heading">
<span class="notion-callout-icon">📍</span> <span class="notion-callout-title"></span>
</div>

</div>

1. JWT 생성

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

    - JWT의 subject에 사용자의 식별값 즉, ID를 넣습니다.

    - JWT에 사용자의 권한 정보를 넣습니다. key-value 형식으로 key 값을 통해 확인할 수 있습니다.

    - 토큰 만료시간을 넣습니다. ms 기준입니다.

    - issuedAt에 발급일을 넣습니다.

    - signWith에 secretKey 값을 담고있는 key와 암호화 알고리즘을 값을 넣어줍니다.
        - ket와 암호화 알고리즘을 사용하여 JWT를 암호화합니다.

2. JWT Cookie에 저장

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

3. 받아온 Cookie의 Value인 JWT 토큰 substring

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

    - StringUtils.hasText를 사용하여 공백, null을 확인하고 startsWith을 사용하여 토큰의 시작값이 Bearer이 맞는지 확인합니다.

    - 맞다면 순수 JWT를 반환하기 위해 substring을 사용하여 Bearer을 잘라냅니다.

4. JWT 검증

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

    - `Jwts.parserBuilder()` 를 사용하여 JWT를 파싱할 수 있습니다.

    - JWT가 위변조되지 않았는지 secretKey(key)값을 넣어 확인합니다.

5. JWT에서 사용자 정보 가져오기

    ```java
    // 토큰에서 사용자 정보 가져오기
    public Claims getUserInfoFromToken(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
    }
    ```

    - JWT의 구조 중 **Payload** 부분에는 토큰에 담긴 정보가 들어있습니다. 

    - 여기에 담긴 정보의 한 ‘조각’ 을 클레임(**claim**) 이라고 부르고, 이는 key-value 의 한 쌍으로 이뤄져있습니다. 토큰에는 여러개의 클레임 들을 넣을 수 있습니다.

    - `Jwts.parserBuilder()` 와 secretKey를 사용하여 JWT의 Claims를 가져와 담겨 있는 사용자의 정보를 사용합니다.
