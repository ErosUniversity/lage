// unc-Branding für alle Versionen. Seiten binden brand.css und brand.js ein und markieren:
//   [data-unc]       das unc-Logo: "wordmark" (u n c) oder "mark" (das U), in der Textfarbe der Seite
//   [data-om-sound]  den Klang-Schalter, Beschriftung aus data-on und data-off
//   [data-om-chime]  die Chat-Liste, Wert ist der Selektor für Agent-Nachrichten
// Klang: Netzbrummen (50 Hz) geht in ein Om (136,1 Hz) über. Startet nur nach Klick.
(() => {
  // Offizielles unc-Logo, wie workspace/assets/unc-wordmark-black.svg: drei Bögen mit flachen Füßen,
  // als Linie gezeichnet. Das U allein ist das Icon.
  const LINE = '<g fill="none" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round">';
  const LETTERS = {
    u: '<path d="M-22 -12 L-26.2 -12 A14 14 0 1 1 -45.8 -12 L-50 -12"/>',
    n: '<path d="M-12 12 L-7.8 12 A14 14 0 1 1 11.8 12 L16 12"/>',
    c: '<path d="M50 14 L50 9.8 A14 14 0 1 1 50 -9.8 L50 -14"/>'
  };
  const LOGOS = {
    mark: { box: [-52.5, -14.5, 33, 29], body: LINE + LETTERS.u + "</g>" },
    wordmark: { box: [-56, -20, 112, 40], body: LINE + LETTERS.u + LETTERS.n + LETTERS.c + "</g>" }
  };
  // Versionsleiste oben auf Seiten mit <body data-versions>: die Auswahl öffnet eine andere Aufmachung
  // und behält den offenen Bereich (#finance usw.). In versionen.html (iframe) bleibt sie weg.
  const SITE = new URL(".", document.currentScript.src);
  const VERSIONS = [["index.html", "1 Newspaper"], ["b/", "2 Trade Republic"], ["c/", "3 Gen Z"], ["workspace/", "4 Workspace"], ["welcome/", "5 Workerbee"]];
  if (document.body.hasAttribute("data-versions") && window.top === window.self) {
    const here = location.pathname.replace(/index\.html$/, "");
    const options = VERSIONS.map(([path, name]) => {
      const url = new URL(path, SITE);
      const current = url.pathname.replace(/index\.html$/, "") === here;
      return '<option value="' + url.href + '"' + (current ? " selected" : "") + ">" + name + "</option>";
    });
    const known = options.some((option) => option.includes(" selected"));
    const bar = document.createElement("div");
    bar.className = "unc-versions";
    bar.innerHTML = '<span class="unc-logo" data-unc="mark" style="--unc-h: 16px"></span>' +
      '<label for="unc-version">Version</label>' +
      '<select id="unc-version">' + (known ? "" : '<option value="" selected disabled>Original</option>') + options.join("") + "</select>";
    document.body.prepend(bar);
    document.documentElement.style.setProperty("--unc-bar", bar.offsetHeight + "px");
    bar.querySelector("select").addEventListener("change", (event) => {
      if (event.target.value) location.href = event.target.value + location.hash;
    });
  }

  document.querySelectorAll("[data-unc]").forEach((el) => {
    const logo = LOGOS[el.dataset.unc];
    if (!logo) return;
    const [x, y, w, h] = logo.box;
    el.innerHTML = '<svg viewBox="' + logo.box.join(" ") + '" width="' + w + '" height="' + h + '" fill="currentColor" aria-hidden="true">' + logo.body + "</svg>";
    if (!el.hasAttribute("aria-label")) {
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", "unc");
    }
  });

  // Ladeanimation bei jedem Seitenaufruf mit Versionsleiste: das Horn (das u) rollt nach rechts,
  // wird dabei zum n und zum c und lässt an jedem Platz seinen Schatten stehen. Am Ende steht unc.
  // Klick oder Taste überspringt; bei reduzierter Bewegung erscheint nur kurz das Logo.
  document.documentElement.classList.add("unc-js");
  if (document.body.hasAttribute("data-versions") && window.top === window.self) {
    // Mitte jedes Buchstabens im Logo und das u um seine eigene Mitte gelegt.
    const SPOTS = [[-36, -2, 0], [2, 2, 180], [40, 0, 450]];
    const HORN = '<path d="M14 -10 L9.8 -10 A14 14 0 1 1 -9.8 -10 L-14 -10"/>';
    const shadow = (letter) => '<g class="unc-shadow">' + LETTERS[letter] + "</g>";
    const loader = document.createElement("div");
    loader.className = "unc-loader";
    loader.setAttribute("aria-hidden", "true");
    loader.innerHTML = '<svg viewBox="-56 -20 112 40">' +
      '<g fill="none" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round">' +
      shadow("u") + shadow("n") + shadow("c") + '<g class="unc-horn">' + HORN + "</g></g></svg>";
    document.body.append(loader);
    const shadows = loader.querySelectorAll(".unc-shadow");
    const horn = loader.querySelector(".unc-horn");
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const place = (x, y, angle) => horn.setAttribute("transform", "translate(" + x + " " + y + ") rotate(" + angle + ")");
    const LEG = 500;
    let start = null;
    let done = false;

    function finish() {
      if (done) return;
      done = true;
      shadows.forEach((s) => s.classList.add("unc-left", "unc-ink"));
      horn.style.opacity = 0;
      loader.classList.add("unc-out");
      setTimeout(() => loader.remove(), 350);
    }

    function frame(now) {
      if (done) return;
      if (start === null) start = now;
      const t = now - start;
      const leg = Math.min(1, Math.floor(t / LEG));
      if (t < 2 * LEG) {
        const [x0, y0, a0] = SPOTS[leg];
        const [x1, y1, a1] = SPOTS[leg + 1];
        const k = ease((t - leg * LEG) / LEG);
        place(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, a0 + (a1 - a0) * k);
        shadows[leg].classList.add("unc-left");
        requestAnimationFrame(frame);
        return;
      }
      place(...SPOTS[2]);
      shadows.forEach((s) => s.classList.add("unc-ink"));
      setTimeout(finish, 450);
    }

    place(...SPOTS[0]);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shadows.forEach((s) => s.classList.add("unc-left", "unc-ink"));
      horn.style.opacity = 0;
      setTimeout(finish, 500);
    } else {
      requestAnimationFrame(frame);
    }
    addEventListener("keydown", finish, { once: true });
    loader.addEventListener("click", finish);
  }

  const OM = 136.1;
  const buttons = document.querySelectorAll("[data-om-sound]");
  let audio = null;
  let master = null;
  let on = false;
  let lastChime = -1;

  function voice(type, freq, level, start, stop, into) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = level;
    osc.connect(gain).connect(into);
    osc.start(start);
    osc.stop(stop);
  }

  function envelope(peak, start, top, end) {
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0, audio.currentTime);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, top);
    gain.gain.linearRampToValueAtTime(0, end);
    gain.connect(master);
    return gain;
  }

  function playOm() {
    const now = audio.currentTime;

    const hum = audio.createBiquadFilter();
    hum.type = "lowpass";
    hum.frequency.value = 320;
    hum.connect(envelope(0.06, now, now + 0.5, now + 2.4));
    voice("sawtooth", 50, 1, now, now + 2.5, hum);

    const mouth = audio.createBiquadFilter();
    mouth.type = "lowpass";
    mouth.Q.value = 4;
    mouth.frequency.setValueAtTime(1100, now);
    mouth.frequency.setValueAtTime(1100, now + 2.6);
    mouth.frequency.linearRampToValueAtTime(600, now + 4.2);
    mouth.frequency.linearRampToValueAtTime(250, now + 5.8);
    mouth.connect(envelope(0.22, now + 0.8, now + 2.6, now + 7.5));
    voice("sawtooth", OM, 0.5, now + 0.8, now + 7.6, mouth);
    voice("sawtooth", OM * 1.004, 0.4, now + 0.8, now + 7.6, mouth);
    voice("sine", OM / 2, 0.6, now + 0.8, now + 7.6, mouth);
  }

  function playChime() {
    if (!on) return;
    const now = audio.currentTime;
    if (lastChime >= 0 && now - lastChime < 0.25) return;
    lastChime = now;
    [[OM * 4, 0.08], [OM * 4 * 2.76, 0.025]].forEach(([freq, level]) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(level, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
      osc.connect(gain).connect(master);
      osc.start(now);
      osc.stop(now + 1.5);
    });
  }

  function setSound(next) {
    on = next;
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(on));
      button.textContent = on ? button.dataset.on : button.dataset.off;
    });
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      master = audio.createGain();
      master.connect(audio.destination);
    }
    master.gain.setTargetAtTime(on ? 1 : 0, audio.currentTime, 0.08);
    if (!on) return;
    audio.resume();
    playOm();
    document.querySelectorAll("[data-unc]").forEach((mark) => {
      mark.classList.remove("unc-breathe");
      void mark.offsetWidth;
      mark.classList.add("unc-breathe");
    });
  }

  buttons.forEach((button) => button.addEventListener("click", () => setSound(!on)));

  document.querySelectorAll("[data-om-chime]").forEach((list) => {
    const selector = list.dataset.omChime;
    // Chats zeichnen oft den ganzen Verlauf neu; geklingelt wird nur, wenn eine Agent-Nachricht dazukommt.
    let seen = list.querySelectorAll(selector).length;
    new MutationObserver(() => {
      const count = list.querySelectorAll(selector).length;
      if (count > seen) playChime();
      seen = count;
    }).observe(list, { childList: true });
  });

  window.omBrand = { playOm, playChime, setSound, get on() { return on; } };
})();
