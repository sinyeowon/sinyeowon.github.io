---
layout: "post"
title: "[TIL] Spring Advanced - JWT Authentication Flow"
title_source: "manual"
date: 2026-04-14 16:08:22 +0900
last_modified_at: 2026-05-01 16:34:06 +0900
categories: ["Spring 단기 심화", "Spring 강의"]
tags: ['Spring', 'TIL', '내일배움캠프']
description: "JWT (Json Web Token) concept, JSON format-based Claim storage, and cookie storage utilization"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/TIL-스프링숙련-260414/"
original_url: "/posts/TIL-스프링숙련-260414/"
source_post: "_posts/2026-04-14-TIL-스프링숙련-260414.md"
generated_lang: "en"
---
## What to do today



## What I studied
###JWT
> **JWT (Json Web Token)**
: Claim-based Web Token that stores user properties using JSON format
- Typically stores JWT using cookie storage

#### Why use JWT
1. When there is only one server
    - Session1 owns all clients’ login information.
2. When there are two or more servers
    - It may be necessary to operate two or more servers to handle high volume server traffic.
    ![Velog image](https://velog.velcdn.com/images/sinyeowon/post/ad53f0ee-c3e6-4d94-87d0-9fa49179248f/image.png)
    - Each session may have different client login information.
    	ex) Session1: Client1, Client2 / Session2: Client3
	- If an API request is made to Server2 or Server3 that does not have Client1’s login information
      - Solution:
        1. Sticky Session: Fixed request server for each client
        2. Create a session repository to store all sessions
          ![Velog image](https://velog.velcdn.com/images/sinyeowon/post/8b1bd7c5-f604-4a5f-b143-7914ed61e8f1/image.png)
          - Because session storage owns the login information of all clients, all servers can process API requests from all clients.
3. **Use JWT**
- Instead of storing login information on the server, log-in information is encrypted and stored as JWT on the client -> Authentication/authorization through JWT
  ![Velog image](https://velog.velcdn.com/images/sinyeowon/post/46ab7bca-f4bc-403e-bbff-1ef7edaa212d/image.png)
- All servers have the same Secret Key
- Encryption/forgery verification through Secret Key (when decrypting)
  ![Velog image](https://velog.velcdn.com/images/sinyeowon/post/5b09a1d7-bb86-4547-b419-441195d76396/image.png)
- Advantages:
  - Reduce server load when there are many concurrent users
  - When the client and server use different domains
    ex) Use JWT Token when logging in to Kakao OAuth2
- Disadvantages:
  - Increased implementation complexity
  - As the content contained in the JWT increases, network costs increase (client -> server)
  - There is no way to expire some of the already created JWTs
  - JWT can be manipulated when secret key is leaked
- JWT usage flow
  1. When the client successfully logs in with username and password
    a. ‘Login information’ on the server -> JWT encryption (using Secret Key)
    b. Create a cookie directly on the server and send it to the client response with JWT
      - The JWT delivery method is determined by the developer.
    
    c. JWT automatically stored in browser cookie storage
  2. Authentication method through JWT from client
    a. Every time an API request is made on the server, the JWT included in the cookie is found and used.
      
     - Since there may be multiple pieces of information contained in a cookie, the JWT is retrieved by checking if the name of one of them is the same as the name of the cookie containing the JWT.
  
    b. Server 
      - Verify whether the JWT delivered by the client is forged (using Secret Key)
      - Verify that the JWT expiration date has not expired
      - When verification is successful,
        - Get user information from JWT -> and check

### Handling JWTs
      


## Problems & Errors



## What to do tomorrow
