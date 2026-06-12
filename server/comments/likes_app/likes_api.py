from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
import json
import os
import sqlite3


DB_PATH = os.environ.get("LIKES_DB", "/data/likes.db")
PORT = int(os.environ.get("PORT", "8090"))
MAX_BODY_BYTES = 4096
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def connect():
    return sqlite3.connect(DB_PATH, timeout=10)


def normalize_post_url(value):
    if not isinstance(value, str):
        raise ValueError("url must be a string")

    parsed = urlparse(value)
    path = parsed.path if parsed.scheme or parsed.netloc else value

    if not path.startswith("/") or len(path) > 512:
        raise ValueError("url must be an absolute path")

    return path


def ensure_schema():
    directory = os.path.dirname(DB_PATH)

    if directory:
        os.makedirs(directory, exist_ok=True)

    with connect() as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS post_likes (
              url TEXT PRIMARY KEY,
              count INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
            """
        )


def get_count(post_url):
    with connect() as db:
        row = db.execute(
            "SELECT count FROM post_likes WHERE url = ?",
            (post_url,),
        ).fetchone()

    return int(row[0]) if row else 0


def update_count(post_url, action):
    timestamp = now_iso()

    with connect() as db:
        db.execute(
            """
            INSERT OR IGNORE INTO post_likes (url, count, created_at, updated_at)
            VALUES (?, 0, ?, ?)
            """,
            (post_url, timestamp, timestamp),
        )

        if action == "like":
            db.execute(
                """
                UPDATE post_likes
                SET count = count + 1, updated_at = ?
                WHERE url = ?
                """,
                (timestamp, post_url),
            )
        elif action == "unlike":
            db.execute(
                """
                UPDATE post_likes
                SET count = CASE WHEN count > 0 THEN count - 1 ELSE 0 END,
                    updated_at = ?
                WHERE url = ?
                """,
                (timestamp, post_url),
            )
        else:
            raise ValueError("action must be like or unlike")

        row = db.execute(
            "SELECT count FROM post_likes WHERE url = ?",
            (post_url,),
        ).fetchone()

    return int(row[0]) if row else 0


class LikesHandler(BaseHTTPRequestHandler):
    server_version = "SinyeowonLikesAPI/1.0"

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/healthz":
            self.send_json(200, {"ok": True})
            return

        if parsed.path not in ("/api/likes", "/api/likes/"):
            self.send_json(404, {"error": "not found"})
            return

        try:
            params = parse_qs(parsed.query)
            post_url = normalize_post_url(params.get("url", [""])[0])
            self.send_json(200, {"url": post_url, "count": get_count(post_url)})
        except ValueError as error:
            self.send_json(400, {"error": str(error)})

    def do_POST(self):
        parsed = urlparse(self.path)

        if parsed.path not in ("/api/likes", "/api/likes/"):
            self.send_json(404, {"error": "not found"})
            return

        try:
            payload = self.read_json_body()
            post_url = normalize_post_url(payload.get("url"))
            action = payload.get("action")
            count = update_count(post_url, action)
            self.send_json(200, {"url": post_url, "count": count})
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
        except json.JSONDecodeError:
            self.send_json(400, {"error": "invalid json"})

    def read_json_body(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise ValueError("invalid content length") from error

        if content_length <= 0 or content_length > MAX_BODY_BYTES:
            raise ValueError("invalid request body")

        return json.loads(self.rfile.read(content_length).decode("utf-8"))

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_cors_headers(self):
        origin = self.headers.get("Origin")

        if "*" in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", "*")
        elif origin and origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")

    def log_message(self, format, *args):
        print("%s - %s" % (self.address_string(), format % args), flush=True)


if __name__ == "__main__":
    ensure_schema()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), LikesHandler)
    print(f"likes-api listening on :{PORT}", flush=True)
    server.serve_forever()
