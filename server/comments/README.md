# Comments and Likes Server

This folder contains the self-hosted pieces for anonymous comments and shared post likes.

## Deploy

1. Copy `.env.example` to `.env`.
2. Change `COMMENTS_DOMAIN`, `REMARK_URL`, `SECRET`, `ADMIN_PASSWD`, and `ALLOWED_ORIGINS`.
   Keep `AUTH_SAME_SITE=none` because the blog and comment server use different domains.
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

## Test Likes API

```sh
curl "https://comments.example.com/api/likes?url=/posts/example/"
curl -X POST "https://comments.example.com/api/likes" \
  -H "Content-Type: application/json" \
  -d '{"url":"/posts/example/","action":"like"}'
```

## Apply UI CSS Changes

The comment widget runs inside a Remark42 iframe, so UI tweaks are served through Caddy's `/web/remark.css` override.
After changing `Caddyfile`, `docker-compose.yml`, or `caddy/remark.css`, update the server files and run:

```sh
docker compose up -d
```
