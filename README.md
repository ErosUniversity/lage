# unc

Dashboard-Agent für kleine Betriebe, in drei Aufmachungen plus Original und Onboarding.
Alle Seiten sind statisch und laufen so auch auf GitHub Pages.

| Seite | Pfad |
| --- | --- |
| A · Zeitung | `index.html` |
| B · Tech | `b/` (gebaut) |
| C · Founder | `c/` (gebaut) |
| Original | `original.html` |
| Welcome | `welcome/` |
| Alle nebeneinander | `versionen.html` |

B und C entstehen aus `original.html` und `_redesign/b.*`, `_redesign/c.*`:

```bash
python3 _redesign/build.py
```

## Gemeinsame Teile

- `brand.css` / `brand.js`: unc-Logo (Wortmarke und U), Klang-Schalter, Glockenton im Chat
- `bridge.js`: Chat an Grok Bot, nur wenn die Seite über `server.py` läuft
- `data.json`: Beispieldaten für den Bot, gleich wie in den Seiten

## Grok Bot anbinden

```bash
python3 server.py
```

Dann `http://127.0.0.1:8734/` öffnen. Der Chat zeigt „· Grok Bot“.

| Was | Wo |
| --- | --- |
| Dashboard, alle Versionen | `http://127.0.0.1:8734/` |
| MCP für den Bot (Werkzeuge `lage`, `bereich`, `letzter_auftrag`) | `http://127.0.0.1:8734/mcp` |
| Antwort des Bots an das Dashboard | `POST /api/ergebnis` mit `Authorization: Bearer <ERGEBNIS_TOKEN>` |

Einstellungen in `.env` (wird nicht eingecheckt):

| Variable | Bedeutung |
| --- | --- |
| `GROK_BOT_WEBHOOK_URL` | Webhook, an den Aufträge aus dem Chat gehen |
| `GROK_BOT_WEBHOOK_KEY` oder `GROK_WEBHOOK_SECRET` | Bearer-Schlüssel oder Signatur-Geheimnis für den Webhook |
| `PUBLIC_URL` | Öffentliche Adresse dieses Rechners, damit der Bot aus der Cloud antworten kann |
| `ERGEBNIS_TOKEN` | Wird beim ersten Start erzeugt |

Ohne Webhook bleiben Aufträge auf dem Rechner. Ohne Server antwortet jede Seite selbst.
