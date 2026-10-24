    function renderNav() {
      document.querySelectorAll(".nav-btn").forEach((link) => {
        const id = link.getAttribute("href").slice(1);
        if (id === view) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
      document.querySelectorAll("[data-pack]").forEach((button) => {
        button.setAttribute("aria-selected", button.dataset.pack === pack ? "true" : "false");
      });
      document.getElementById("company").textContent = dash().company;
      document.getElementById("top-company").textContent = dash().company;
      const place = view === "home" ? "zum Unternehmen" : "zu " + dash().tiles[view].category;
      msg.placeholder = "Frage " + place;
    }

    // "42.800 €" → 42800, "−18.000 €" → -18000, "4,2 %" → 4.2
    function num(text) {
      const n = parseFloat(String(text).replace(/[^\d,−+-]/g, "").replace("−", "-").replace(",", "."));
      return isNaN(n) ? null : n;
    }

    function deltaChip(item) {
      if (!item.delta) return "";
      return '<span class="delta ' + (item.sign || "flat") + '">' + esc(item.delta) + "</span>";
    }

    // only two real points exist (last month, today), so the line joins exactly those
    function spark(item) {
      const now = num(item.value);
      const change = num(item.delta);
      if (now === null || change === null) return "";
      const up = change >= 0;
      const from = up ? 68 : 12;
      const to = up ? 12 : 68;
      return '<div class="spark ' + (up ? "up" : "down") + '">' +
        '<svg viewBox="0 0 300 80" preserveAspectRatio="none" aria-hidden="true">' +
        '<path d="M0 ' + from + " C 140 " + from + ", 160 " + to + ", 300 " + to + '"/></svg>' +
        '<div class="spark-axis"><span>Vormonat · ' + esc((now - change).toLocaleString("de-DE")) + " €</span><span>Heute</span></div></div>";
    }

    function renderHero(item) {
      return '<a class="hero" href="#finance">' +
        '<span class="hero-label">' + esc(item.metric) + "</span>" +
        '<span class="hero-value">' + esc(item.value) + "</span>" +
        '<span class="hero-delta">' + deltaChip(item) + '<span class="hero-since">seit Vormonat</span></span>' +
        spark(item) + "</a>";
    }

    // +50 %, −6,7 %, ±0 %
    function pct(change) {
      if (change === 0) return "±0 %";
      const abs = Math.abs(change * 100);
      return (change > 0 ? "+" : "−") + String(abs >= 10 ? Math.round(abs) : abs.toFixed(1)).replace(".", ",") + " %";
    }

    // bar length is the change relative to the biggest mover in the list
    function moveBar(change, max) {
      const width = max ? Math.max(3, Math.round((Math.abs(change) / max) * 100)) : 3;
      return '<span class="move"><span class="move-track"><span class="move-bar" style="width: ' + width + '%"></span></span>' +
        '<span class="move-pct">' + pct(change) + "</span></span>";
    }

    function renderRow(item, size, change, max) {
      const sub = item.also ? item.metric + " · " + item.also.value + " " + item.also.metric : item.metric;
      return '<a class="row row-' + size + '" href="#' + item.id + '">' +
        '<span class="row-icon" aria-hidden="true">' + esc(item.category.charAt(0)) + "</span>" +
        '<span class="row-main"><span class="row-name">' + esc(item.category) + '</span><span class="row-sub">' + esc(sub) + "</span>" +
        moveBar(change, max) + "</span>" +
        '<span class="row-end"><span class="row-value">' + esc(item.value) + "</span>" + deltaChip(item) + "</span></a>";
    }

    function tableHtml(table) {
      const head = table.headers.map((header, index) => '<th class="' + (table.numeric.includes(index) ? "num" : "") + '">' + esc(header) + "</th>").join("");
      const body = table.rows.map((row) => "<tr>" + row.map((cell, index) => '<td class="' + (table.numeric.includes(index) ? "num" : "") + '">' + esc(cell) + "</td>").join("") + "</tr>").join("");
      return "<table><thead><tr>" + head + "</tr></thead><tbody>" + body + "</tbody></table>";
    }

    function renderSheet(item) {
      const stat = (it) => '<div class="stat"><p class="sheet-value">' + esc(it.value) + '</p><p class="sheet-metric">' + esc(it.metric) + " " + deltaChip(it) + "</p></div>";
      let out = '<article class="sheet"><a class="back" href="#home">‹ Übersicht</a>' +
        '<p class="sheet-kicker">' + esc(GROUPS[item.id]) + "</p><h1>" + esc(item.category) + "</h1>" +
        (item.also ? '<div class="stats">' + stat(item) + stat(item.also) + "</div>" : stat(item)) +
        (item.id === "finance" ? spark(item) : "") +
        '<p class="sheet-line">' + esc(item.line) + "</p>";
      if (item.also) {
        out += '<h2 class="sheet-kicker">Tickets</h2>' + tableHtml(dash().sheets.tickets) +
          '<h2 class="sheet-kicker">Probleme</h2>' + tableHtml(dash().sheets.problems);
      } else {
        out += tableHtml(dash().sheets[item.id]);
      }
      return out + "</article>";
    }

    // finance stays the hero; the other positions are sorted and sized by how much they moved
    function renderHome(d) {
      const ids = ORDER.filter((id) => id !== "finance").sort((a, b) => Math.abs(d.change[b]) - Math.abs(d.change[a]));
      const max = Math.abs(d.change[ids[0]]);
      const size = (rank) => (rank < 2 ? "l" : rank < 4 ? "m" : "s");
      return '<h1 class="sr">Übersicht</h1>' + renderHero(d.tiles.finance) +
        '<section class="list"><h2>Größte Bewegung</h2>' +
        ids.map((id, rank) => renderRow(d.tiles[id], size(rank), d.change[id], max)).join("") + "</section>";
    }

    function renderStage() {
      const d = dash();
      stage.innerHTML = view === "home" ? renderHome(d) : renderSheet(d.tiles[view]);
      renderNav();
    }

    function renderThread() {
      thread.innerHTML = messages.map((entry) => '<div class="msg-' + entry.role + '">' + esc(entry.text) + "</div>").join("");
      thread.scrollTop = thread.scrollHeight;
    }
