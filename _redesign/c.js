    // founder speak: same numbers, different coping mechanism
    const SLANG = {
      finance: { name: "cash", emoji: "💸", color: "lime" },
      tickets: { name: "fires", emoji: "🔥", color: "orange" },
      social: { name: "clout", emoji: "📈", color: "pink" },
      conversion: { name: "conversion (pls)", emoji: "🛒", color: "sky" },
      retention: { name: "they came back", emoji: "🫶", color: "lilac" },
      messages: { name: "dms", emoji: "📬", color: "yellow" },
      management: { name: "pinging the team", emoji: "🫡", color: "mint" },
      todo: { name: "side quests", emoji: "🗡️", color: "coral" }
    };
    const FLAT = { tickets: "this is fine 🙂", messages: "left on read", management: "who's on this??", todo: "touch grass later" };
    const TILTS = [-2, 1.5, -1, 2.5, -2.5, 1, -1.5, 2];
    const OPENERS = ["ngl", "lowkey", "fr", "ok so", "not gonna lie"];
    let turn = 0;

    function mood(item) {
      if (item.sign === "up") return "we're so back";
      if (item.sign === "down") return "it's so over";
      return FLAT[item.id] || "vibes tbd";
    }

    // lets the chat understand founder words before Robin's German keyword matching
    function slang(text) {
      return text.toLowerCase()
        .replace(/cash|money|runway|burn/g, "geld")
        .replace(/fire/g, "problem")
        .replace(/clout|followers|reach/g, "reichweite")
        .replace(/\bdms?\b/g, "nachricht")
        .replace(/side ?quests?/g, "todo")
        .replace(/came back|churn/g, "retention")
        .replace(/\bsales\b|\bconv\w*/g, "conversion");
    }

    function vibe(answer) {
      const opener = OPENERS[turn++ % OPENERS.length];
      const bad = /unter dem|kritisch|über der Frist|ungelesen|überfällig/i.test(answer);
      return opener + " " + answer.charAt(0).toLowerCase() + answer.slice(1) + (bad ? " 💀" : " 🚀");
    }

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
      msg.placeholder = view === "home" ? "ask the group chat…" : "ask about " + SLANG[view].name + "…";
      const words = [dash().company, "build in public", "day 287", "default alive?", "ship it", "no meetings wednesday", "ramen profitable (almost)", "we're hiring (we're not)"];
      const run = words.map((word) => "<span>" + esc(word) + "</span>").join("");
      document.getElementById("ticker").innerHTML = run + run;
    }

    function nums(item) {
      return '<span class="num">' + esc(item.value) + "</span>" +
        '<span class="what">' + esc(item.metric) + (item.delta ? ' <b class="' + (item.sign || "") + '">' + esc(item.delta) + "</b>" : "") + "</span>";
    }

    function renderTile(item, index) {
      const s = SLANG[item.id];
      const body = item.also ? '<span class="two"><span>' + nums(item) + "</span><span>" + nums(item.also) + "</span></span>" : nums(item);
      return '<a class="sticker c-' + s.color + '" href="#' + item.id + '" style="--tilt: ' + TILTS[index % TILTS.length] + 'deg">' +
        '<span class="label">' + s.emoji + " " + esc(s.name) + "</span>" + body +
        '<span class="mood">' + esc(mood(item)) + "</span></a>";
    }

    function tableHtml(table) {
      const head = table.headers.map((header, index) => '<th class="' + (table.numeric.includes(index) ? "num" : "") + '">' + esc(header) + "</th>").join("");
      const body = table.rows.map((row) => "<tr>" + row.map((cell, index) => '<td class="' + (table.numeric.includes(index) ? "num" : "") + '">' + esc(cell) + "</td>").join("") + "</tr>").join("");
      return "<table><thead><tr>" + head + "</tr></thead><tbody>" + body + "</tbody></table>";
    }

    function renderSheet(item) {
      const s = SLANG[item.id];
      const big = (it) => '<div class="big">' + nums(it) + "</div>";
      let out = '<article class="sheet c-' + s.color + '"><a class="back" href="#home">← back to the vibe</a>' +
        "<h1>" + s.emoji + " " + esc(s.name) + '</h1><p class="scribble">' + esc(mood(item)) + "</p>" +
        '<div class="bigs">' + big(item) + (item.also ? big(item.also) : "") + "</div>" +
        '<p class="tldr"><b>tl;dr</b> ' + esc(item.line) + "</p>";
      if (item.also) {
        out += "<h2>open tickets</h2>" + tableHtml(dash().sheets.tickets) +
          "<h2>actually on fire</h2>" + tableHtml(dash().sheets.problems);
      } else {
        out += tableHtml(dash().sheets[item.id]);
      }
      return out + "</article>";
    }

    function renderHome(d) {
      const ups = ORDER.filter((id) => d.tiles[id].sign === "up").length;
      const downs = ORDER.filter((id) => d.tiles[id].sign === "down").length;
      const status = ups > downs ? "lowkey cooking 🍳" : "it's giving pivot 😬";
      return '<h1 class="hey">gm, ' + esc(d.company) + ' 👋</h1><p class="sub">status: ' + status + "</p>" +
        '<div class="grid">' + ORDER.map((id, index) => renderTile(d.tiles[id], index)).join("") + "</div>";
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
