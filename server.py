#!/usr/bin/env python3
"""Demo-Brücke zwischen dem Dashboard und Grok Bot.

Das Dashboard schickt Aufträge hierher. Wenn ein Webhook hinterlegt ist,
geht der Auftrag an Grok Bot. Grok Bot liest die Kacheln über MCP.
Eine Antwort, die der Bot an /api/ergebnis schickt, erscheint im Chatfenster.
"""

import base64
import hashlib
import hmac
import json
import os
import secrets
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
ENV_PATH = ROOT / ".env"
DATA_PATH = ROOT / "data.json"
HOST = "127.0.0.1"
PORT = 8734

PACKS = {
    "buch": "Heft & Bogen",
    "software": "Nordkap",
    "event": "Atelier Süd",
}
NAMES = {name.casefold(): key for key, name in PACKS.items()}
NAMES.update({key: key for key in PACKS})

LOCK = threading.Lock()
STATE = {"pack": "buch"}
AUFTAEGE = {}


def load_env():
    if not ENV_PATH.exists():
        return
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def ensure_token():
    if os.environ.get("ERGEBNIS_TOKEN"):
        return
    token = secrets.token_urlsafe(24)
    os.environ["ERGEBNIS_TOKEN"] = token
    existing = ENV_PATH.read_text(encoding="utf-8") if ENV_PATH.exists() else ""
    if existing and not existing.endswith("\n"):
        existing += "\n"
    ENV_PATH.write_text(existing + f"ERGEBNIS_TOKEN={token}\n", encoding="utf-8")


STATIC_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
}


def static_file(url_path):
    """Datei der Seite zu einem URL-Pfad: alle Versionen, brand.js, bridge.js, data.json.
    Versteckte Dateien (.env, .git) und alles außerhalb des Ordners bleiben gesperrt."""
    parts = [part for part in url_path.split("/") if part]
    if any(part.startswith(".") or part.startswith("_") for part in parts):
        return None
    target = ROOT.joinpath(*parts) if parts else ROOT
    if target.is_dir():
        target = target / "index.html"
    try:
        target = target.resolve(strict=True)
    except (FileNotFoundError, NotADirectoryError):
        return None
    if ROOT not in target.parents or not target.is_file() or target.suffix not in STATIC_TYPES:
        return None
    return target


def data():
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))


def pack_key(value):
    if not value:
        return STATE["pack"]
    key = NAMES.get(str(value).strip().casefold())
    if not key:
        raise KeyError(value)
    return key


def tiles_payload(key):
    pack = data()[key]
    tiles = []
    for tile_id, tile in pack["tiles"].items():
        item = {
            "id": tile_id,
            "category": tile["category"],
            "value": tile["value"],
            "metric": tile["metric"],
            "delta": tile["delta"],
            "line": tile["line"],
        }
        if tile.get("also"):
            item["also"] = tile["also"]
        tiles.append(item)
    return {"pack": key, "company": pack["company"], "tiles": tiles}


def sheet_text(key, tile_id):
    pack = data()[key]
    tile = pack["tiles"][tile_id]
    table = pack["sheets"].get(tile_id)
    lines = [f"{pack['company']} — {tile['category']}", tile["line"]]
    if tile.get("also"):
        also = tile["also"]
        lines.append(f"{also['value']} {also['metric']}, {also['delta']}")
    if tile_id == "tickets" and "problems" in pack["sheets"]:
        lines.append("")
        lines.append(table_text(pack["sheets"]["tickets"]))
        lines.append("")
        lines.append("Probleme")
        lines.append(table_text(pack["sheets"]["problems"]))
    elif table:
        lines.append("")
        lines.append(table_text(table))
    return "\n".join(lines)


def table_text(table):
    rows = [" | ".join(table["headers"])]
    rows.extend(" | ".join(str(cell) for cell in row) for row in table["rows"])
    return "\n".join(rows)


def public_base():
    return os.environ.get("PUBLIC_URL", "").rstrip("/")


def ergebnis_url():
    base = public_base() or f"http://{HOST}:{PORT}"
    return base + "/api/ergebnis"


def sign_standard(secret, body):
    raw = secret.removeprefix("whsec_")
    key = base64.b64decode(raw)
    webhook_id = "msg_" + uuid.uuid4().hex
    timestamp = str(int(time.time()))
    signed = f"{webhook_id}.{timestamp}.".encode() + body
    digest = base64.b64encode(hmac.new(key, signed, hashlib.sha256).digest()).decode()
    return {
        "Content-Type": "application/json",
        "webhook-id": webhook_id,
        "webhook-timestamp": timestamp,
        "webhook-signature": f"v1,{digest}",
    }


def forward_webhook(payload):
    url = os.environ.get("GROK_BOT_WEBHOOK_URL", "").strip()
    if not url:
        return {"weitergeleitet": False, "hinweis": "Auftrag ist gespeichert. In Grok Bot ist noch kein Webhook hinterlegt, deshalb liegt er nur hier."}
    body = json.dumps(payload, ensure_ascii=False).encode()
    bearer = os.environ.get("GROK_BOT_WEBHOOK_KEY", "").strip()
    secret = os.environ.get("GROK_WEBHOOK_SECRET", "").strip()
    if bearer:
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {bearer}"}
    elif secret:
        headers = sign_standard(secret, body)
    else:
        return {"weitergeleitet": False, "hinweis": "Auftrag ist gespeichert. Zum Webhook fehlt der Schlüssel."}
    request = Request(url, data=body, headers=headers, method="POST")
    try:
        with urlopen(request, timeout=20) as response:
            status = response.status
    except HTTPError as error:
        return {"weitergeleitet": False, "hinweis": f"Grok Bot hat den Auftrag nicht angenommen ({error.code})."}
    except URLError:
        return {"weitergeleitet": False, "hinweis": "Der Webhook von Grok Bot ist nicht erreichbar."}
    if status not in (200, 202):
        return {"weitergeleitet": False, "hinweis": f"Grok Bot hat den Auftrag nicht angenommen ({status})."}
    return {"weitergeleitet": True, "hinweis": "Auftrag ist bei Grok Bot. Die Antwort kommt dort. Schreibt der Bot zurück, erscheint sie hier."}


TOOLS = [
    {
        "name": "lage",
        "description": "Die acht Kacheln des Dashboards für einen Betrieb: Werte, Kennzahlen und der Satz dazu.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "betrieb": {
                    "type": "string",
                    "description": "buch, software, event oder der Firmenname. Leer lässt den Betrieb, der im Dashboard offen ist.",
                }
            },
        },
    },
    {
        "name": "bereich",
        "description": "Die Tabelle eines Bereichs. Bereich-Ids: finance, tickets, social, conversion, retention, messages, management, todo.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "betrieb": {"type": "string"},
                "bereich": {"type": "string"},
            },
            "required": ["bereich"],
        },
    },
    {
        "name": "letzter_auftrag",
        "description": "Der letzte Auftrag aus dem Chatfenster des Dashboards.",
        "inputSchema": {"type": "object", "properties": {}},
    },
]


def tool_result(text, error=False):
    return {"content": [{"type": "text", "text": text}], "isError": error}


def call_tool(name, arguments):
    arguments = arguments or {}
    if name == "lage":
        try:
            key = pack_key(arguments.get("betrieb"))
        except KeyError:
            return tool_result("Unbekannter Betrieb. Erlaubt sind buch, software und event.", True)
        return tool_result(json.dumps(tiles_payload(key), ensure_ascii=False, indent=2))
    if name == "bereich":
        try:
            key = pack_key(arguments.get("betrieb"))
        except KeyError:
            return tool_result("Unbekannter Betrieb.", True)
        tile_id = arguments.get("bereich", "")
        if tile_id not in data()[key]["tiles"]:
            return tool_result("Unbekannter Bereich.", True)
        return tool_result(sheet_text(key, tile_id))
    if name == "letzter_auftrag":
        with LOCK:
            if not AUFTAEGE:
                return tool_result("Im Dashboard liegt kein Auftrag.")
            latest = AUFTAEGE[next(reversed(AUFTAEGE))]
        return tool_result(json.dumps(latest, ensure_ascii=False, indent=2))
    return tool_result(f"Unbekanntes Werkzeug: {name}", True)


def rpc_result(message, result):
    return {"jsonrpc": "2.0", "id": message.get("id"), "result": result}


def rpc_error(message, code, text):
    return {"jsonrpc": "2.0", "id": message.get("id"), "error": {"code": code, "message": text}}


def handle_rpc(message):
    method = message.get("method")
    if method == "initialize":
        version = (message.get("params") or {}).get("protocolVersion") or "2025-03-26"
        return rpc_result(message, {
            "protocolVersion": version,
            "capabilities": {"tools": {"listChanged": False}},
            "serverInfo": {"name": "unc", "version": "1.0.0"},
        })
    if method and method.startswith("notifications/"):
        return None
    if method == "ping":
        return rpc_result(message, {})
    if method == "tools/list":
        return rpc_result(message, {"tools": TOOLS})
    if method == "tools/call":
        params = message.get("params") or {}
        return rpc_result(message, call_tool(params.get("name"), params.get("arguments")))
    return rpc_error(message, -32601, "Methode nicht vorhanden")


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        print(f"{self.command} {self.path} {args[1] if len(args) > 1 else ''}".rstrip())

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/mcp":
            self.send_error(405)
            return
        if path.startswith("/api/auftrag/"):
            self.send_json(self.auftrag(path.rsplit("/", 1)[-1]))
            return
        target = static_file(path)
        if target is None:
            self.send_error(404)
            return
        self.send_file(target, STATIC_TYPES[target.suffix])

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        raw = self.read_body()
        if raw is None:
            return
        if path == "/mcp":
            self.mcp(raw)
            return
        try:
            body = json.loads(raw.decode() or "{}")
        except json.JSONDecodeError:
            self.send_error(400)
            return
        if path == "/api/lage":
            try:
                STATE["pack"] = pack_key(body.get("pack") or body.get("betrieb"))
            except KeyError:
                self.send_error(400)
                return
            self.send_json({"pack": STATE["pack"]})
            return
        if path == "/api/auftrag":
            self.send_json(self.neuer_auftrag(body))
            return
        if path == "/api/ergebnis":
            self.ergebnis(body)
            return
        self.send_error(404)

    def do_DELETE(self):
        if self.path.split("?", 1)[0] == "/mcp":
            self.send_response(204)
            self.end_headers()
            return
        self.send_error(404)

    def neuer_auftrag(self, body):
        text = str(body.get("text") or "").strip()
        if not text:
            self.send_error(400)
            return {"fehler": "leer"}
        try:
            key = pack_key(body.get("pack"))
        except KeyError:
            key = STATE["pack"]
        STATE["pack"] = key
        auftrag_id = uuid.uuid4().hex[:12]
        record = {
            "id": auftrag_id,
            "text": text,
            "pack": key,
            "company": data()[key]["company"],
            "view": body.get("view") or "home",
            "kacheln": tiles_payload(key)["tiles"],
            "antwort": None,
        }
        payload = {
            "auftrag": auftrag_id,
            "text": text,
            "betrieb": record["company"],
            "bereich": record["view"],
            "kacheln": record["kacheln"],
        }
        if public_base():
            payload["ergebnis_url"] = ergebnis_url()
            payload["ergebnis_token"] = os.environ["ERGEBNIS_TOKEN"]
        weiter = forward_webhook(payload)
        record["hinweis"] = weiter["hinweis"]
        with LOCK:
            AUFTAEGE[auftrag_id] = record
        return {"id": auftrag_id, "hinweis": record["hinweis"], "weitergeleitet": weiter["weitergeleitet"]}

    def auftrag(self, auftrag_id):
        with LOCK:
            record = AUFTAEGE.get(auftrag_id)
        if not record:
            self.send_error(404)
            return {"fehler": "unbekannt"}
        return {"id": record["id"], "hinweis": record["hinweis"], "antwort": record["antwort"]}

    def ergebnis(self, body):
        expected = os.environ.get("ERGEBNIS_TOKEN", "")
        header = self.headers.get("Authorization", "")
        if header != f"Bearer {expected}":
            self.send_error(401)
            return
        text = str(body.get("text") or "").strip()
        if not text:
            self.send_error(400)
            return
        auftrag_id = body.get("auftrag")
        with LOCK:
            record = AUFTAEGE.get(auftrag_id) if auftrag_id else None
            if record is None and AUFTAEGE:
                record = AUFTAEGE[next(reversed(AUFTAEGE))]
        if record is None:
            self.send_error(404)
            return
        record["antwort"] = text
        self.send_json({"ok": True, "id": record["id"]})

    def mcp(self, raw):
        if not raw:
            self.send_empty(202)
            return
        try:
            message = json.loads(raw.decode())
        except json.JSONDecodeError:
            self.send_json(rpc_error({}, -32700, "JSON ungültig"), 400)
            return
        if isinstance(message, list):
            replies = [reply for item in message if (reply := handle_rpc(item)) is not None]
            if not replies:
                self.send_empty(202)
                return
            self.send_json(replies)
            return
        reply = handle_rpc(message)
        if reply is None:
            self.send_empty(202)
            return
        extra = {}
        if message.get("method") == "initialize":
            extra["Mcp-Session-Id"] = "lage"
        self.send_json(reply, extra=extra)

    def read_body(self):
        expect = (self.headers.get("Expect") or "").lower()
        if expect == "100-continue":
            self.wfile.write(b"HTTP/1.1 100 Continue\r\n\r\n")
            self.wfile.flush()
        if (self.headers.get("Transfer-Encoding") or "").lower() == "chunked":
            chunks = []
            while True:
                line = self.rfile.readline()
                size = int(line.split(b";", 1)[0] or b"0", 16)
                if size == 0:
                    self.rfile.readline()
                    break
                if size > 1_000_000:
                    self.send_error(413)
                    return None
                chunks.append(self.rfile.read(size))
                self.rfile.read(2)
            return b"".join(chunks)
        length = int(self.headers.get("Content-Length") or 0)
        if length > 1_000_000:
            self.send_error(413)
            return None
        return self.rfile.read(length) if length else b""

    def send_empty(self, status):
        if getattr(self, "_wrote", False):
            return
        self._wrote = True
        self.close_connection = True
        self.send_response(status)
        self.send_header("Content-Length", "0")
        self.send_header("Connection", "close")
        self.end_headers()

    def send_json(self, payload, status=200, extra=None):
        if getattr(self, "_wrote", False):
            return
        body = json.dumps(payload, ensure_ascii=False).encode()
        self._wrote = True
        self.close_connection = True
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "close")
        for key, value in (extra or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, path, content_type):
        body = path.read_bytes()
        self.close_connection = True
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(body)

    def send_error(self, code, message=None, explain=None):
        self.send_json({"fehler": message or {404: "nicht gefunden", 400: "ungültig", 401: "nicht erlaubt", 405: "nicht erlaubt", 413: "zu groß"}.get(code, "fehler")}, code)


def main():
    load_env()
    ensure_token()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Dashboard  http://{HOST}:{PORT}/")
    print(f"MCP        http://{HOST}:{PORT}/mcp")
    print(f"Ergebnis   {ergebnis_url()}")
    if not public_base():
        print("PUBLIC_URL ist leer. Grok Bot in der Cloud erreicht diesen Rechner so nicht.")
    if not os.environ.get("GROK_BOT_WEBHOOK_URL"):
        print("GROK_BOT_WEBHOOK_URL ist leer. Aufträge bleiben auf diesem Rechner.")
    server.serve_forever()


if __name__ == "__main__":
    main()
