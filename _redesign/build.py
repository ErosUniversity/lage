"""Build the B and C redesign drafts from Robin's original page (original.html).

A (Zeitung) is the main page, index.html, and is edited by hand.
B and C keep Robin's data and chat logic; each one swaps in
  _redesign/<key>.css   the whole <style> block
  _redesign/<key>.js    the render functions (renderNav up to applyHash)
and a few markup or wording replacements listed below.

    python3 _redesign/build.py
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
FONTS = "https://fonts.googleapis.com/css2?family="
JS_START = "    function renderNav() {"
JS_END = "    function applyHash() {"

THEME_JS = """    const themeBtn = document.getElementById("theme");
    function setTheme(light) {
      document.documentElement.dataset.theme = light ? "light" : "dark";
      themeBtn.setAttribute("aria-pressed", String(light));
      themeBtn.textContent = light ? "Dunkel" : "Hell";
      try { localStorage.setItem("lage-b-theme", light ? "light" : "dark"); } catch (e) {}
    }
    let startLight = false;
    try { startLight = localStorage.getItem("lage-b-theme") === "light"; } catch (e) {}
    setTheme(startLight);
    themeBtn.addEventListener("click", () => setTheme(document.documentElement.dataset.theme !== "light"));

    applyHash();
  </script>"""

VERSIONS = {
    "b": {
        "name": "Tech",
        "fonts": "Inter:wght@400;500;600;700",
        "replace": [
            ('<p class="note">Beispieldaten</p>',
             '<div class="rail-foot"><button type="button" class="theme-btn" id="theme" aria-pressed="false">Hell</button><p class="note">Beispieldaten</p></div>'),
            ("    applyHash();\n  </script>", THEME_JS),
        ],
    },
    "c": {
        "name": "Founder",
        "fonts": "Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Permanent+Marker",
        "replace": [
            ('<p class="brand-kicker">Lage</p>', '<p class="brand-kicker">lage <span>(pre-seed energy)</span></p>'),
            ('aria-selected="true">Buchladen</button>', 'aria-selected="true">bookshop 📚</button>'),
            ('aria-selected="false">Software</button>', 'aria-selected="false">saas 💻</button>'),
            ('aria-selected="false">Event</button>', 'aria-selected="false">events 🪩</button>'),
            ('href="#home">Übersicht</a>', 'href="#home">the vibe ✨</a>'),
            ('<p class="group-label">Lage</p>', '<p class="group-label">status</p>'),
            ('<p class="group-label">Wachstum</p>', '<p class="group-label">growth</p>'),
            ('<p class="group-label">Handeln</p>', '<p class="group-label">do stuff</p>'),
            ('href="#finance">Finance</a>', 'href="#finance">cash 💸</a>'),
            ('href="#tickets">Tickets &amp; Probleme</a>', 'href="#tickets">fires 🔥</a>'),
            ('href="#social">Social Media</a>', 'href="#social">clout 📈</a>'),
            ('href="#conversion">Conversion</a>', 'href="#conversion">conversion 🛒</a>'),
            ('href="#retention">Retention</a>', 'href="#retention">they came back 🫶</a>'),
            ('href="#messages">Nachrichten</a>', 'href="#messages">dms 📬</a>'),
            ('href="#management">Management</a>', 'href="#management">team 🫡</a>'),
            ('href="#todo">To-do</a>', 'href="#todo">side quests 🗡️</a>'),
            ('<p class="note">Beispieldaten</p>', '<p class="note">fake data, real feelings</p>'),
            ('id="menu">Menü</button>', 'id="menu">menu</button>'),
            ('<div class="chat-head">Chat</div>', '<div class="chat-head"><span>founders 🧃</span><small>3 members</small></div>'),
            ("    <main>\n", '    <main>\n      <div class="ticker" aria-hidden="true"><div class="ticker-track" id="ticker"></div></div>\n'),
            ('text: answerFor(trimmed) }', 'text: vibe(answerFor(slang(trimmed))) }'),
        ],
    },
}

base = (ROOT / "original.html").read_text()
for key, v in VERSIONS.items():
    css = (ROOT / "_redesign" / f"{key}.css").read_text()
    js = (ROOT / "_redesign" / f"{key}.js").read_text()
    head = (
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        f'  <link rel="stylesheet" href="{FONTS}{v["fonts"]}&display=swap">\n'
        "  <style>\n" + css + "  </style>"
    )
    page = re.sub(r"<style>.*?</style>", lambda _: head, base, count=1, flags=re.S)
    page = page.replace("<title>Lage</title>", f'<title>Lage · {v["name"]}</title>', 1)
    a, b = page.index(JS_START), page.index(JS_END)
    page = page[:a] + js.rstrip("\n") + "\n\n" + page[b:]
    for old, new in v["replace"]:
        assert page.count(old) == 1, f"{key}: {old!r} found {page.count(old)} times"
        page = page.replace(old, new)
    out = ROOT / key / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(page)
    print("wrote", out.relative_to(ROOT))
