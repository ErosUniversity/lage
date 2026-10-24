"""Build the three redesign versions from Robin's index.html.

Only the <style> block and the fonts change; markup, data and script stay Robin's,
so whichever version wins can go back upstream as a CSS-only change.
A (Zeitung) won and now lives on its own in a/index.html with its own markup
and script changes, so only the B and C drafts are still built here.

    python3 _redesign/build.py
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
FONTS = "https://fonts.googleapis.com/css2?family="
VERSIONS = {
    "b": ("Leitstand", "JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600"),
    "c": ("Plakat", "Inter+Tight:wght@500;600;700;800;900"),
}

base = (ROOT / "index.html").read_text()
for key, (name, families) in VERSIONS.items():
    css = (ROOT / "_redesign" / f"{key}.css").read_text()
    head = (
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        f'  <link rel="stylesheet" href="{FONTS}{families}&display=swap">\n'
        "  <style>\n" + css + "  </style>"
    )
    page = re.sub(r"<style>.*?</style>", lambda _: head, base, count=1, flags=re.S)
    page = page.replace("<title>Lage</title>", f"<title>Lage · {name}</title>", 1)
    out = ROOT / key / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(page)
    print("wrote", out.relative_to(ROOT))
