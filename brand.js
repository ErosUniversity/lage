// Om-Branding für alle Versionen. Seiten binden brand.css und brand.js ein und markieren:
//   .om-mark         das ॐ-Zeichen, atmet beim Einschalten des Klangs
//   [data-om-sound]  den Klang-Schalter, Beschriftung aus data-on und data-off
//   [data-om-chime]  die Chat-Liste, Wert ist der Selektor für Agent-Nachrichten
// Klang: Netzbrummen (50 Hz) geht in ein Om (136,1 Hz) über. Startet nur nach Klick.
(() => {
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
    document.querySelectorAll(".om-mark").forEach((mark) => {
      mark.classList.remove("om-breathe");
      void mark.offsetWidth;
      mark.classList.add("om-breathe");
    });
  }

  buttons.forEach((button) => button.addEventListener("click", () => setSound(!on)));

  document.querySelectorAll("[data-om-chime]").forEach((list) => {
    const selector = list.dataset.omChime;
    new MutationObserver((records) => {
      const added = records.some((record) => [...record.addedNodes].some((node) => node.nodeType === 1 && node.matches(selector)));
      if (added) playChime();
    }).observe(list, { childList: true });
  });

  window.omBrand = { playOm, playChime, setSound, get on() { return on; } };
})();
