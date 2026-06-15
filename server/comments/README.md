# Comments and Likes Server

This folder contains the self-hosted pieces for anonymous comments and shared post likes.

## Deploy

1. Copy `.env.example` to `.env`.
2. Change `COMMENTS_DOMAIN`, `REMARK_URL`, `SECRET`, `ADMIN_PASSWD`, and `ALLOWED_ORIGINS`.
   Keep `AUTH_SAME_SITE=none` and `AUTH_SEND_JWT_HEADER=true` because the blog and comment server use different domains.
3. Point the `comments` DNS A record to the server.
4. Open ports `80` and `443`.
5. Run:

```sh
docker compose up -d
```

## Blog Config

After the server is reachable, update `_config.yml`:

```yml
comments:
  provider: remark42
  remark42:
    host: https://comments.example.com
    site_id: sinyeowon

post_likes:
  enabled: true
  endpoint: https://comments.example.com/api/likes
```

`SITE` in `.env` must match `comments.remark42.site_id`.
If `post_likes.endpoint` is empty, the blog uses `comments.remark42.host` plus `/api/likes`.
If `visitor_stats.endpoint` is empty, the blog uses `comments.remark42.host` plus `/api/visitors`.
Set `VISITOR_TOTAL_OFFSET` in `.env` to carry over an existing public visitor total.

## Email Notifications

Comments use Remark42's admin notification settings. Likes use the local
`likes-api` notification settings. Both share the same SMTP connection.

For Gmail, create a Google app password and set it as `SMTP_PASSWORD` in the
server `.env`; your normal Google password will not work.

```env
NOTIFY_ADMINS=email
ADMIN_SHARED_EMAIL=1oohyou@gmail.com
NOTIFY_EMAIL_FROM=1oohyou@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_TLS=false
SMTP_STARTTLS=true
SMTP_USERNAME=1oohyou@gmail.com
SMTP_PASSWORD=replace-with-gmail-app-password
NOTIFICATION_LIKES=true
NOTIFICATION_EMAIL_TO=1oohyou@gmail.com
NOTIFICATION_EMAIL_FROM=1oohyou@gmail.com
```

## Test Likes and Views API

```sh
curl "https://comments.example.com/api/likes?url=/posts/example/"
curl -X POST "https://comments.example.com/api/likes" \
  -H "Content-Type: application/json" \
  -d '{"url":"/posts/example/","action":"like"}'
curl -X POST "https://comments.example.com/api/visitors" \
  -H "Content-Type: application/json" \
  -d '{"url":"/posts/example/","visitor_id":"example-visitor-1"}'
```

## Apply UI CSS Changes

The comment widget runs inside a Remark42 iframe, so UI tweaks are served through Caddy's `/web/remark.css` and `/web/iframe.html` overrides.
After changing `Caddyfile`, `docker-compose.yml`, or files in `caddy/`, update the server files and run:

```sh
docker compose up -d
```
