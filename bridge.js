// Grok-Bot-Brücke für alle Dashboards. Läuft die Seite über server.py, geht der Chat an Grok Bot:
// Auftrag an /api/auftrag, Antwort kommt über /api/ergebnis und wird hier alle 2 s abgeholt.
// Der Betrieb, der im Dashboard offen ist, wird an /api/lage gemeldet, damit der Bot die richtigen Kacheln liest.
// Ohne Server (z. B. GitHub Pages) bleibt alles wie vorher: die Seite antwortet selbst.
// Nutzt die globalen Namen der Seiten: pack, view, messages, renderThread, submitText, msg, fit, sendBtn.
(() => {
  const local = window.submitText;
  let active = false;

  function publishPack(next) {
    return fetch("/api/lage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pack: next })
    }).then((res) => res.ok).catch(() => false);
  }

  function watch(id) {
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      if (tries > 60) {
        clearInterval(timer);
        return;
      }
      try {
        const res = await fetch("/api/auftrag/" + id);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.antwort || messages.some((entry) => entry.id === id)) return;
        clearInterval(timer);
        messages.push({ role: "agent", text: data.antwort, id });
        renderThread();
      } catch (error) {
        clearInterval(timer);
      }
    }, 2000);
  }

  async function toBot(text) {
    const trimmed = text.trim();
    if (!active) return local(text);
    if (!trimmed) return;
    messages.push({ role: "user", text: trimmed });
    msg.value = "";
    fit();
    sendBtn.disabled = true;
    renderThread();
    try {
      const res = await fetch("/api/auftrag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, pack, view })
      });
      if (!res.ok) throw new Error("auftrag " + res.status);
      const data = await res.json();
      messages.push({ role: "agent", text: data.hinweis });
      renderThread();
      if (data.id) watch(data.id);
    } catch (error) {
      messages.pop();
      local(trimmed);
    }
  }

  window.submitText = toBot;

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pack]");
    if (button && active) publishPack(button.dataset.pack);
  });

  publishPack(pack).then((ok) => {
    if (!ok) return;
    active = true;
    document.head.insertAdjacentHTML("beforeend", "<style>.msg-agent { white-space: pre-wrap; } .bot-on { opacity: 0.6; font-weight: 400; }</style>");
    const head = document.querySelector(".chat-head");
    if (head) head.insertAdjacentHTML("beforeend", ' <span class="bot-on">· Grok Bot</span>');
  });
})();
