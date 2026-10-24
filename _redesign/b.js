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

    function renderRow(item) {
      const sub = item.also ? item.metric + " · " + item.also.value + " " + item.also.metric : item.metric;
      return '<a class="row" href="#' + item.id + '">' +
        '<span class="row-icon" aria-hidden="true">' + esc(item.category.charAt(0)) + "</span>" +
        '<span class="row-main"><span class="row-name">' + esc(item.category) + '</span><span class="row-sub">' + esc(sub) + "</span></span>" +
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

    function renderHome(d) {
      return '<h1 class="sr">Übersicht</h1>' + renderHero(d.tiles.finance) +
        ["Lage", "Wachstum", "Handeln"].map((group) => {
          const rows = ORDER.filter((id) => id !== "finance" && GROUPS[id] === group).map((id) => renderRow(d.tiles[id])).join("");
          return '<section class="list"><h2>' + esc(group) + "</h2>" + rows + "</section>";
        }).join("");
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
