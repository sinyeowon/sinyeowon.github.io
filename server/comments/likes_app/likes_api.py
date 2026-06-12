from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
import json
import os
import re
import sqlite3


def read_int_env(name, default=0):
    try:
        return int(os.environ.get(name, str(default)))
    except ValueError:
        return default


DB_PATH = os.environ.get("LIKES_DB", "/data/likes.db")
PORT = int(os.environ.get("PORT", "8090"))
MAX_BODY_BYTES = 4096
KST = timezone(timedelta(hours=9))
VISITOR_ID_RE = re.compile(r"^[A-Za-z0-9._:-]{8,128}$")
VISITOR_TOTAL_OFFSET = read_int_env(
    "VISITOR_TOTAL_OFFSET", read_int_env("VIEW_TOTAL_OFFSET")
)
VISITOR_TODAY_OFFSET = read_int_env(
    "VISITOR_TODAY_OFFSET", read_int_env("VIEW_TODAY_OFFSET")
)
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def today_kst():
    return datetime.now(KST).strftime("%Y-%m-%d")


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


def normalize_visitor_id(value):
    if not isinstance(value, str) or not VISITOR_ID_RE.fullmatch(value):
        raise ValueError("visitor_id must be a stable anonymous id")

    return value


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
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS site_visitors (
              visitor_id TEXT PRIMARY KEY,
              first_seen_at TEXT NOT NULL,
              last_seen_at TEXT NOT NULL
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS site_visitor_days (
              visitor_id TEXT NOT NULL,
              day TEXT NOT NULL,
              first_seen_at TEXT NOT NULL,
              last_seen_at TEXT NOT NULL,
              PRIMARY KEY (visitor_id, day)
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS post_visitors (
              url TEXT NOT NULL,
              visitor_id TEXT NOT NULL,
              first_seen_at TEXT NOT NULL,
              last_seen_at TEXT NOT NULL,
              PRIMARY KEY (url, visitor_id)
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS post_visitor_days (
              url TEXT NOT NULL,
              visitor_id TEXT NOT NULL,
              day TEXT NOT NULL,
              first_seen_at TEXT NOT NULL,
              last_seen_at TEXT NOT NULL,
              PRIMARY KEY (url, visitor_id, day)
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS post_views (
              url TEXT PRIMARY KEY,
              count INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS post_view_days (
              url TEXT NOT NULL,
              day TEXT NOT NULL,
              count INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              PRIMARY KEY (url, day)
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


def get_visitor_stats(post_url, day=None):
    with connect() as db:
        return read_visitor_stats(db, post_url, day or today_kst())


def record_visit(post_url, visitor_id):
    timestamp = now_iso()
    day = today_kst()

    with connect() as db:
        db.execute(
            """
            INSERT INTO site_visitors (visitor_id, first_seen_at, last_seen_at)
            VALUES (?, ?, ?)
            ON CONFLICT(visitor_id) DO UPDATE SET
              last_seen_at = excluded.last_seen_at
            """,
            (visitor_id, timestamp, timestamp),
        )
        db.execute(
            """
            INSERT INTO site_visitor_days (visitor_id, day, first_seen_at, last_seen_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(visitor_id, day) DO UPDATE SET
              last_seen_at = excluded.last_seen_at
            """,
            (visitor_id, day, timestamp, timestamp),
        )
        db.execute(
            """
            INSERT INTO post_visitors (url, visitor_id, first_seen_at, last_seen_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(url, visitor_id) DO UPDATE SET
              last_seen_at = excluded.last_seen_at
            """,
            (post_url, visitor_id, timestamp, timestamp),
        )
        db.execute(
            """
            INSERT INTO post_visitor_days (url, visitor_id, day, first_seen_at, last_seen_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(url, visitor_id, day) DO UPDATE SET
              last_seen_at = excluded.last_seen_at
            """,
            (post_url, visitor_id, day, timestamp, timestamp),
        )

        return read_visitor_stats(db, post_url, day)


def read_visitor_stats(db, post_url, day):
    url_total = db.execute(
        "SELECT COUNT(*) FROM post_visitors WHERE url = ?",
        (post_url,),
    ).fetchone()
    url_today = db.execute(
        "SELECT COUNT(*) FROM post_visitor_days WHERE url = ? AND day = ?",
        (post_url, day),
    ).fetchone()
    site_total = db.execute(
        "SELECT COUNT(*) FROM site_visitors"
    ).fetchone()
    site_today = db.execute(
        "SELECT COUNT(*) FROM site_visitor_days WHERE day = ?",
        (day,),
    ).fetchone()

    return {
        "url": post_url,
        "date": day,
        "url_total": int(url_total[0]) if url_total else 0,
        "url_today": int(url_today[0]) if url_today else 0,
        "total": VISITOR_TOTAL_OFFSET + (int(site_total[0]) if site_total else 0),
        "today": VISITOR_TODAY_OFFSET + (int(site_today[0]) if site_today else 0),
    }


class LikesHandler(BaseHTTPRequestHandler):
    server_version = "SinyeowonStatsAPI/1.0"

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

        try:
            if parsed.path in ("/api/likes", "/api/likes/"):
                params = parse_qs(parsed.query)
                post_url = normalize_post_url(params.get("url", [""])[0])
                self.send_json(200, {"url": post_url, "count": get_count(post_url)})
                return

            if parsed.path in (
                "/api/visitors",
                "/api/visitors/",
                "/api/views",
                "/api/views/",
            ):
                params = parse_qs(parsed.query)
                post_url = normalize_post_url(params.get("url", [""])[0])
                self.send_json(200, get_visitor_stats(post_url))
                return

            self.send_json(404, {"error": "not found"})
        except ValueError as error:
            self.send_json(400, {"error": str(error)})

    def do_POST(self):
        parsed = urlparse(self.path)

        try:
            payload = self.read_json_body()

            if parsed.path in ("/api/likes", "/api/likes/"):
                post_url = normalize_post_url(payload.get("url"))
                action = payload.get("action")
                count = update_count(post_url, action)
                self.send_json(200, {"url": post_url, "count": count})
                return

            if parsed.path in (
                "/api/visitors",
                "/api/visitors/",
                "/api/views",
                "/api/views/",
            ):
                post_url = normalize_post_url(payload.get("url"))
                visitor_id = normalize_visitor_id(payload.get("visitor_id"))
                self.send_json(200, record_visit(post_url, visitor_id))
                return

            self.send_json(404, {"error": "not found"})
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
