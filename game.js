/* =====================================================================
   CORRIDA DAS CORES — jogo de festa de corrida de cavalos
   Tudo roda no navegador (sem servidor): ideal para GitHub Pages.
   Seções: utilidades · dados · áudio · narrador · estado · telas ·
   configuração · pré-corrida/apostas · motor da corrida · desenho ·
   resultado · fim de campeonato · fundo animado do menu.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------------- utilidades ---------------- */
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const TAU = Math.PI * 2;
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
  function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  const money = n => "$ " + Math.round(n).toLocaleString("pt-BR");
  const signed = n => (n >= 0 ? "+" : "−") + money(Math.abs(n));
  const fmtT = t => t.toFixed(2).replace(".", ",") + " s";
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("cdc2:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("cdc2:" + k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } }
  };
  function shade(hex, f) { // f<0 escurece, f>0 clareia
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = f < 0 ? 0 : 255, p = Math.abs(f);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ---------------- dados ---------------- */
  const COLORS = [
    { id: "red", name: "Vermelho", hex: "#ff4d5e", horse: "Brasa", coat: "#7a4126", mane: "#2a1610" },
    { id: "blue", name: "Azul", hex: "#3d8bff", horse: "Trovão", coat: "#2c2523", mane: "#0f0c0b" },
    { id: "green", name: "Verde", hex: "#2fd27a", horse: "Capim-Santo", coat: "#a5582c", mane: "#5a2a12" },
    { id: "yellow", name: "Amarelo", hex: "#ffd23f", horse: "Girassol", coat: "#d3a968", mane: "#f5ead0" },
    { id: "purple", name: "Roxo", hex: "#a66bff", horse: "Ametista", coat: "#8f8d8b", mane: "#e5e3e0" },
    { id: "orange", name: "Laranja", hex: "#ff8c2b", horse: "Tangerina", coat: "#ece5d8", mane: "#b5a893" }
  ];
  const KEYS = ["A", "L", "V", "P", "Z", "M"];
  const DIFFS = { easy: "Fácil", normal: "Normal", hard: "Difícil" };
  const PRIZES = [200, 120, 70, 40, 20, 10];
  const POINTS = [10, 7, 5, 3, 2, 1];
  const START_COINS = 1000, MIN_BET = 10;

  // Superfícies especiais no chão (multiplicador de velocidade).
  const SURF = {
    mud: { m: 0.62, label: "Lama" },
    sand: { m: 0.74, label: "Areia funda" },
    water: { m: 0.8, label: "Água" },
    turbo: { m: 1.38, label: "Turbo" },
    ice: { m: 1.22, label: "Gelo liso" }
  };

  // Temas visuais das pistas.
  const THEMES = {
    day: { sky: ["#5fb2ff", "#cfeeff"], sun: { x: .82, y: .12, r: 34, c: "#fff6c9" }, far: "hills", farC: ["#7fbf7a", "#5d9f5c"], ground: "#4d9a4a", mid: "stands", track: ["#5aa64f", "#4b9443"], line: "rgba(255,255,255,.45)", dust: "#c9e3a8", clouds: true },
    desert: { sky: ["#ffb35c", "#ffe7b0"], sun: { x: .2, y: .16, r: 46, c: "#fff1c2" }, far: "dunes", farC: ["#e9b46a", "#d79a4f"], ground: "#e3b673", mid: "cacti", track: ["#e8c27f", "#dbb06a"], line: "rgba(120,70,20,.35)", dust: "#f3d9a3", haze: true },
    swamp: { sky: ["#5b6b63", "#9fb0a2"], far: "forest", farC: ["#3a4b40", "#2a3830"], ground: "#46553a", mid: "deadtrees", track: ["#6a4c31", "#5d4129"], line: "rgba(255,255,255,.22)", dust: "#7a5a3a", weather: "rain" },
    snow: { sky: ["#9fb6cf", "#e9f1f8"], far: "mountains", farC: ["#ffffff", "#8ea3bb"], ground: "#eef4fa", mid: "pines", track: ["#dbe6f1", "#cddbe9"], line: "rgba(80,110,150,.35)", dust: "#ffffff", weather: "snow" },
    sunset: { sky: ["#5b2c83", "#ff9a5a"], sun: { x: .7, y: .3, r: 52, c: "#ffcf7a" }, far: "mesas", farC: ["#8b3f55", "#5e2a45"], ground: "#a8673d", mid: "fence", track: ["#9a603a", "#8a5532"], line: "rgba(255,255,255,.3)", dust: "#c48a5a" },
    night: { sky: ["#070b24", "#1f2a5c"], moon: { x: .15, y: .14, r: 22 }, stars: true, far: "city", farC: ["#141a3a", "#0e1330"], ground: "#1f3a24", mid: "stands", track: ["#2f6a37", "#285d30"], line: "rgba(255,255,255,.4)", dust: "#9bd1a0", night: true, lights: true },
    beach: { sky: ["#49c3ff", "#bff0ff"], sun: { x: .76, y: .14, r: 38, c: "#fffbe0" }, far: "sea", farC: ["#1aa7d8", "#0b7fb4"], ground: "#f0d79c", mid: "palms", track: ["#e7c88a", "#dcb977"], line: "rgba(140,90,30,.3)", dust: "#fff0c8", clouds: true },
    country: { sky: ["#6ab8ff", "#e3f5ff"], sun: { x: .3, y: .13, r: 30, c: "#fff7d1" }, far: "hills", farC: ["#94c97d", "#6fae62"], ground: "#5fa652", mid: "trees", track: ["#62ad55", "#549c48"], line: "rgba(255,255,255,.45)", dust: "#cfe8b0", clouds: true },
    neon: { sky: ["#0b0320", "#3a0d5e"], stars: true, far: "neoncity", farC: ["#1a0b38", "#120628"], ground: "#120a26", mid: "neon", track: ["#1b1533", "#151029"], line: "rgba(0,240,255,.55)", dust: "#ff4fd8", night: true, neon: true }
  };

  const TRACKS = [
    { id: "prado", name: "Prado Verde", theme: "day", len: 100, dur: 13, vol: 1, hurdles: [], patches: [{ a: .55, b: .61, t: "turbo" }], note: "Reta curta e rápida, com uma faixa de turbo no meio." },
    { id: "dunas", name: "Dunas do Sol", theme: "desert", len: 120, dur: 16, vol: 1.1, hurdles: [.55], patches: [{ a: .28, b: .4, t: "sand" }, { a: .72, b: .8, t: "sand" }], note: "Duas faixas de areia funda e um salto entre elas." },
    { id: "pantano", name: "Pântano da Chuva", theme: "swamp", len: 90, dur: 15, vol: 1.6, hurdles: [.62], patches: [{ a: .18, b: .28, t: "mud" }, { a: .42, b: .52, t: "mud" }, { a: .78, b: .86, t: "mud" }], note: "Curta, escorregadia e cheia de lama. Muita surpresa." },
    { id: "pico", name: "Pico Nevado", theme: "snow", len: 150, dur: 19, vol: .8, hurdles: [.3, .72], patches: [{ a: .45, b: .53, t: "ice" }], note: "Longa e constante, com gelo liso e dois saltos." },
    { id: "terra", name: "Terra Batida", theme: "sunset", len: 200, dur: 24, vol: 1.2, hurdles: [.25, .62], patches: [{ a: .48, b: .54, t: "turbo" }, { a: .82, b: .87, t: "mud" }], note: "A reta longa do entardecer. Fôlego decide." },
    { id: "noturno", name: "Hipódromo Noturno", theme: "night", len: 160, dur: 20, vol: 1, hurdles: [.55], patches: [{ a: .33, b: .38, t: "turbo" }, { a: .76, b: .81, t: "turbo" }], note: "Corrida sob os refletores, com dois turbos." },
    { id: "praia", name: "Praia Dourada", theme: "beach", len: 130, dur: 17, vol: 1.1, hurdles: [.45], patches: [{ a: .24, b: .32, t: "water" }, { a: .62, b: .7, t: "water" }], note: "Areia molhada e poças d'água pelo caminho." },
    { id: "steeple", name: "Grande Steeplechase", theme: "country", len: 240, dur: 30, vol: 1, hurdles: [.12, .26, .4, .56, .7, .85], patches: [{ a: .47, b: .51, t: "water" }], note: "Seis obstáculos e um fosso d'água. Para quem tem timing." },
    { id: "neon", name: "Circuito Neon", theme: "neon", len: 140, dur: 17, vol: 1.2, hurdles: [.6], patches: [{ a: .2, b: .25, t: "turbo" }, { a: .44, b: .49, t: "turbo" }, { a: .74, b: .79, t: "turbo" }], note: "Três turbos e um salto na cidade que nunca dorme." }
  ];

  /* ---------------- áudio (WebAudio sintetizado, sem arquivos) ---------------- */
  const AU = {
    ctx: null, master: null, noise: null, on: store.get("sound", true), crowd: null, lastHoof: 0,
    init() {
      if (this.ctx || !this.on) return;
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      try {
        this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = .55; this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noise = buf;
      } catch (e) { this.ctx = null; }
    },
    resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); },
    ok() { if (!this.on) return false; this.init(); this.resume(); return !!this.ctx; },
    env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); },
    tone(f, dur, type, vol, when, slideTo) {
      if (!this.ok()) return; const c = this.ctx, t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      this.env(g, t, .01, vol || .3, dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + .05);
    },
    burst(dur, ftype, freq, vol, q, when) {
      if (!this.ok()) return; const c = this.ctx, t = c.currentTime + (when || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noise; s.playbackRate.value = rand(.8, 1.2); f.type = ftype; f.frequency.value = freq; f.Q.value = q || 1;
      this.env(g, t, .004, vol, dur); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + .05);
    },
    hoof(vol) { const n = performance.now(); if (n - this.lastHoof < 28) return; this.lastHoof = n; this.burst(.06, "lowpass", 380, vol, 1); this.tone(rand(70, 95), .07, "sine", vol * .8); },
    whip() { this.burst(.05, "highpass", 2600, .35, .7); },
    jump() { this.tone(300, .22, "triangle", .14, 0, 700); },
    land() { this.burst(.12, "lowpass", 260, .4, 1); },
    thud() { this.tone(120, .35, "sawtooth", .12, 0, 50); this.burst(.25, "lowpass", 200, .5); },
    beep(hi) { this.tone(hi ? 880 : 440, hi ? .45 : .18, "square", .12); },
    gun() { this.burst(.35, "lowpass", 1400, .9, .5); this.tone(90, .3, "sine", .4, 0, 40); },
    coin() { this.tone(988, .08, "square", .08); this.tone(1319, .18, "square", .08, .08); },
    click() { this.tone(660, .04, "triangle", .06); },
    boost() { this.tone(200, .3, "sawtooth", .07, 0, 900); },
    tired() { this.tone(260, .4, "triangle", .1, 0, 120); },
    fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, i === 5 ? .7 : .16, "triangle", .16, i * .14)); },
    sad() { [392, 370, 349, 330].forEach((f, i) => this.tone(f, .35, "triangle", .12, i * .3)); },
    cheer(dur) { this.burst(dur || 2.4, "bandpass", 1100, .35, .6); this.burst(dur || 2.4, "bandpass", 2200, .18, .8, .1); },
    crowdStart() {
      if (!this.ok() || this.crowd) return; const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noise; s.loop = true; f.type = "bandpass"; f.frequency.value = 900; f.Q.value = .5; g.gain.value = .0001;
      s.connect(f); f.connect(g); g.connect(this.master); s.start(); g.gain.exponentialRampToValueAtTime(.05, c.currentTime + 1);
      this.crowd = { s, g };
    },
    crowdLevel(v) { if (this.crowd && this.ctx) this.crowd.g.gain.setTargetAtTime(Math.max(.0001, v), this.ctx.currentTime, .3); },
    crowdStop() { if (!this.crowd) return; const { s, g } = this.crowd; this.crowd = null; try { g.gain.setTargetAtTime(.0001, this.ctx.currentTime, .3); s.stop(this.ctx.currentTime + 1.2); } catch (e) { } }
  };

  /* ---------------- narrador ---------------- */
  const NARR = {
    voice: store.get("voice", false), last: {},
    say(text, key, gap, speak) {
      const now = performance.now();
      if (key) { if (this.last[key] && now - this.last[key] < (gap || 2500)) return; this.last[key] = now; }
      const box = $("#ticker"); if (box) {
        const d = document.createElement("div"); d.textContent = text; box.appendChild(d);
        while (box.children.length > 3) box.firstChild.remove();
        setTimeout(() => d.remove(), 3300);
      }
      if (this.voice && speak !== false && "speechSynthesis" in window) {
        try {
          const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s!?,.]/gu, ""));
          u.lang = "pt-BR"; u.rate = 1.18; u.pitch = 1.05; u.volume = .9;
          const v = speechSynthesis.getVoices().find(v => /pt[-_]BR/i.test(v.lang)); if (v) u.voice = v;
          if (speechSynthesis.speaking && speechSynthesis.pending) speechSynthesis.cancel();
          speechSynthesis.speak(u);
        } catch (e) { }
      }
    },
    reset() { this.last = {}; const b = $("#ticker"); if (b) b.innerHTML = ""; try { speechSynthesis.cancel(); } catch (e) { } }
  };

  /* ---------------- estado ---------------- */
  const DEFAULT_SLOTS = [
    { type: "human", name: "Jogador 1", diff: "normal" },
    { type: "human", name: "Jogador 2", diff: "normal" },
    { type: "cpu", name: "", diff: "normal" },
    { type: "cpu", name: "", diff: "hard" },
    { type: "off", name: "", diff: "easy" },
    { type: "off", name: "", diff: "normal" }
  ];
  const cfg = store.get("cfg", null) || { slots: DEFAULT_SLOTS, mode: "bet", ctrl: "skill", len: 5 };
  if (!Array.isArray(cfg.slots) || cfg.slots.length !== 6) cfg.slots = DEFAULT_SLOTS;
  let champ = null;   // campeonato em andamento
  let race = null;    // corrida em andamento
  let pre = null;     // dados da pré-corrida (pista, raias, odds, apostas)
  let trackBag = [];

  /* ---------------- telas ---------------- */
  let current = "menu";
  function show(name) {
    current = name;
    $$(".screen").forEach(s => { s.hidden = s.id !== "s-" + name; });
    const chip = $("#round-chip");
    if (champ && ["pre", "race", "result"].includes(name)) { chip.hidden = false; const n = name === "result" ? champ.raceNo : champ.raceNo + 1; chip.textContent = champ.len > 1 ? `Corrida ${Math.max(1, n)} de ${champ.len}` : "Corrida rápida"; }
    else chip.hidden = true;
    bgAnim.active = name !== "race";
    window.scrollTo(0, 0);
  }
  function modal(id, open) { $(id).hidden = !open; }
  $$(".modal").forEach(m => m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-close]")) m.hidden = true; }));
  function confirmBox(title, text, yes) {
    $("#confirm-title").textContent = title; $("#confirm-text").textContent = text;
    $("#confirm-yes").onclick = () => { modal("#confirm", false); yes(); };
    modal("#confirm", true);
  }

  /* ---------------- barra superior ---------------- */
  function syncToggles() {
    $("#sound-btn").textContent = AU.on ? "🔊" : "🔇"; $("#sound-btn").classList.toggle("off", !AU.on);
    $("#voice-btn").classList.toggle("off", !NARR.voice);
    $("#voice-btn").title = NARR.voice ? "Narrador por voz: ligado" : "Narrador por voz: desligado";
  }
  $("#sound-btn").addEventListener("click", () => { AU.on = !AU.on; store.set("sound", AU.on); if (!AU.on) AU.crowdStop(); else AU.click(); syncToggles(); });
  $("#voice-btn").addEventListener("click", () => {
    NARR.voice = !NARR.voice; store.set("voice", NARR.voice); syncToggles();
    if (NARR.voice) NARR.say("Narrador ligado!", null, 0); else try { speechSynthesis.cancel(); } catch (e) { }
  });
  $("#help-btn").addEventListener("click", () => modal("#how", true));
  $("#menu-how").addEventListener("click", () => modal("#how", true));
  $("#home-btn").addEventListener("click", () => {
    if (current === "menu") return;
    if (champ && current !== "final") confirmBox("Sair do campeonato?", "O progresso deste campeonato será perdido.", goMenu); else goMenu();
  });
  function goMenu() { stopRace(); champ = null; renderRecords(); show("menu"); }
  syncToggles();

  /* ---------------- menu ---------------- */
  function renderRecords() {
    const rec = store.get("records", {});
    const list = TRACKS.filter(t => rec[t.id]).map(t => `<span class="rec">⏱ ${esc(t.name)}: <b>${fmtT(rec[t.id].time)}</b> · ${esc(rec[t.id].name)}</span>`);
    $("#menu-records").innerHTML = list.length ? list.join("") : "";
  }
  $("#menu-play").addEventListener("click", () => { AU.click(); renderSetup(); show("setup"); });
  $("#menu-quick").addEventListener("click", () => {
    AU.click();
    const slots = cfg.slots.map(s => ({ ...s }));
    if (slots.filter(s => s.type !== "off").length < 2) { renderSetup(); show("setup"); return; }
    startChamp({ slots, mode: "fun", ctrl: cfg.ctrl, len: 1 });
  });
  renderRecords();

  /* ---------------- configuração ---------------- */
  function seg(id, key) {
    $$(id + " button").forEach(b => {
      b.classList.toggle("on", String(cfg[key]) === b.dataset.v);
      b.onclick = () => { cfg[key] = key === "len" ? Number(b.dataset.v) : b.dataset.v; AU.click(); seg(id, key); store.set("cfg", cfg); };
    });
  }
  function renderSetup() {
    $("#setup-err").textContent = "";
    $("#slots").innerHTML = cfg.slots.map((s, i) => {
      const c = COLORS[i];
      return `<div class="slot ${s.type === "off" ? "closed" : ""}" style="--c:${c.hex}" data-i="${i}">
        <div class="slot-top"><span class="slot-dot">${i + 1}</span>
          <input class="slot-name" maxlength="14" value="${esc(s.type === "cpu" ? "CPU " + c.name : s.name || "")}" placeholder="Nome" ${s.type !== "human" ? "disabled" : ""} aria-label="Nome do jogador ${i + 1}"></div>
        <div class="slot-type">
          <button data-t="human" class="${s.type === "human" ? "on" : ""}">🙋 Jogador</button>
          <button data-t="cpu" class="${s.type === "cpu" ? "on" : ""}">🤖 CPU</button>
          <button data-t="off" class="${s.type === "off" ? "on" : ""}">— Vazio</button>
        </div>
        <div class="slot-meta">${s.type === "human" ? `<span>Tecla <span class="key">${KEYS[i]}</span> ou botão na tela</span><span>🐴 ${c.horse}</span>` :
          s.type === "cpu" ? `<div class="diff">${Object.keys(DIFFS).map(d => `<button data-d="${d}" class="${s.diff === d ? "on" : ""}">${DIFFS[d]}</button>`).join("")}</div><span>🐴 ${c.horse}</span>` :
            `<span>Vaga vazia</span>`}</div></div>`;
    }).join("");
    $$("#slots .slot").forEach(el => {
      const i = Number(el.dataset.i), s = cfg.slots[i];
      el.querySelectorAll(".slot-type button").forEach(b => b.onclick = () => {
        s.type = b.dataset.t; if (s.type === "human" && !s.name) s.name = "Jogador " + (i + 1);
        AU.click(); store.set("cfg", cfg); renderSetup();
      });
      el.querySelectorAll(".diff button").forEach(b => b.onclick = () => { s.diff = b.dataset.d; AU.click(); store.set("cfg", cfg); renderSetup(); });
      const inp = el.querySelector(".slot-name");
      inp.addEventListener("input", () => { if (s.type === "human") { s.name = inp.value; store.set("cfg", cfg); } });
    });
    seg("#opt-mode", "mode"); seg("#opt-ctrl", "ctrl"); seg("#opt-len", "len");
  }
  $("#setup-back").addEventListener("click", () => show("menu"));
  $("#setup-go").addEventListener("click", () => {
    const active = cfg.slots.filter(s => s.type !== "off");
    if (active.length < 2) { $("#setup-err").textContent = "Coloque pelo menos 2 cavalos na pista (jogadores ou CPUs)."; return; }
    cfg.slots.forEach((s, i) => { if (s.type === "human" && !s.name.trim()) s.name = "Jogador " + (i + 1); });
    store.set("cfg", cfg);
    AU.click();
    startChamp({ slots: cfg.slots.map(s => ({ ...s })), mode: cfg.mode, ctrl: cfg.ctrl, len: cfg.len });
  });

  /* ---------------- campeonato ---------------- */
  function startChamp(c) {
    champ = {
      mode: c.mode, ctrl: c.ctrl, len: c.len, raceNo: 0, history: [],
      players: c.slots.map((s, i) => s.type === "off" ? null : {
        idx: i, color: COLORS[i], human: s.type === "human", diff: s.diff,
        name: s.type === "human" ? s.name.trim().slice(0, 14) : "CPU " + COLORS[i].name,
        key: KEYS[i], coins: START_COINS, points: 0,
        st: { wins: 0, pos: [0, 0, 0, 0, 0, 0], last: 0, stumbles: 0, perfect: 0, whips: 0, falseStarts: 0, betWon: 0, betLost: 0, bestBet: 0, prizes: 0, best: null }
      }).filter(Boolean)
    };
    champ.cfgCopy = c;
    enterPre();
  }

  function nextTrack() {
    if (!trackBag.length) trackBag = shuffle(TRACKS.map(t => t.id));
    if (champ.lastTrack && trackBag[trackBag.length - 1] === champ.lastTrack && trackBag.length > 1) trackBag.unshift(trackBag.pop());
    const id = trackBag.pop(); champ.lastTrack = id;
    return TRACKS.find(t => t.id === id);
  }

  /* ---------------- pré-corrida: sorteio, forma, odds e apostas ---------------- */
  const FORM_TXT = { 2: ["Em ótima forma", "up"], 1: ["Boa forma", "up"], 0: ["Forma regular", ""], "-1": ["Meio cansado", "down"], "-2": ["Dia ruim", "down"] };
  function enterPre() {
    const track = window.__cdcForce ? TRACKS.find(t => t.id === window.__cdcForce) || nextTrack() : nextTrack();
    const lanes = shuffle(champ.players.slice());
    const info = new Map();
    champ.players.forEach(p => {
      const f = Math.round(clamp(gauss() * 1.1, -2, 2));
      const r = Math.random(), aff = r < .2 ? 1 : r < .38 ? -1 : 0;
      info.set(p, { form: f, aff, mult: (1 + f * .005) * (1 + aff * .009) });
    });
    pre = { track, lanes, info, odds: new Map(), bets: new Map() };
    computeOdds();
    champ.players.forEach(p => {
      if (champ.mode !== "bet" || p.coins < MIN_BET) { pre.bets.set(p, { horse: p, amt: 0 }); return; }
      if (p.human) pre.bets.set(p, { horse: p, amt: Math.max(MIN_BET, Math.round(p.coins * .1 / 10) * 10) });
      else {
        const own = Math.random() < .55, fav = champ.players.slice().sort((a, b) => pre.odds.get(a) - pre.odds.get(b))[0];
        const target = own ? p : Math.random() < .6 ? fav : pick(champ.players);
        pre.bets.set(p, { horse: target, amt: Math.max(MIN_BET, Math.round(p.coins * rand(.08, .25) / 5) * 5) });
      }
    });
    show("pre");
    renderPre(true);
  }

  function computeOdds() {
    const runs = 160, wins = new Map(champ.players.map(p => [p, 0]));
    for (let r = 0; r < runs; r++) {
      const sim = newRace(pre.track, pre.lanes, pre.info, "luck", false);
      let guard = 0;
      while (sim.phase !== "done" && guard++ < 4000) step(sim, 1 / 30);
      const w = sim.horses.slice().sort((a, b) => a.time - b.time)[0];
      wins.set(w.p, wins.get(w.p) + 1);
    }
    const n = champ.players.length;
    champ.players.forEach(p => {
      const prob = (wins.get(p) + 1) / (runs + n);
      pre.odds.set(p, clamp(Math.round(0.86 / prob * 10) / 10, 1.2, 30));
    });
  }

  function renderPre(spin) {
    const t = pre.track, th = THEMES[t.theme];
    const tags = [`📏 ${t.len} m`, t.hurdles.length ? `🚧 ${t.hurdles.length} ${t.hurdles.length > 1 ? "saltos" : "salto"}` : "sem saltos"]
      .concat(t.patches.map(p => SURF[p.t].label)).filter((v, i, a) => a.indexOf(v) === i);
    const rec = store.get("records", {})[t.id];
    const card = $("#track-card");
    card.style.setProperty("--g", th.ground);
    card.innerHTML = `<canvas></canvas><div class="tc-body"><div class="tc-round">${champ.len > 1 ? `Corrida ${champ.raceNo + 1} de ${champ.len}` : "Corrida rápida"}</div>
      <h2 id="tc-name">${esc(t.name)}</h2><div>${esc(t.note)}</div>
      <div class="tc-tags">${tags.map(x => `<span>${esc(x)}</span>`).join("")}${rec ? `<span>⏱ recorde ${fmtT(rec.time)} (${esc(rec.name)})</span>` : ""}</div></div>`;
    const cv = card.querySelector("canvas");
    requestAnimationFrame(() => drawPreview(cv, t));
    if (spin) {
      card.classList.add("spinning"); let k = 0; const nm = $("#tc-name");
      const iv = setInterval(() => { nm.textContent = pick(TRACKS).name; AU.click(); if (++k > 9) { clearInterval(iv); nm.textContent = t.name; card.classList.remove("spinning"); AU.tone(784, .2, "triangle", .15); } }, 85);
    }
    // grid de largada
    $("#field").innerHTML = pre.lanes.map((p, i) => {
      const inf = pre.info.get(p), ft = FORM_TXT[inf.form];
      const affTxt = inf.aff > 0 ? `<span class="tag up">Adora ${esc(surfName(t))}</span>` : inf.aff < 0 ? `<span class="tag down">Odeia ${esc(surfName(t))}</span>` : "";
      return `<div class="runner" style="--c:${p.color.hex}"><div class="gate">${i + 1}</div>
        <div class="who"><b>${esc(p.name)}</b><small>🐴 ${p.color.horse} · ${p.human ? (champ.ctrl === "skill" ? "tecla " + p.key : "jogador") : "CPU " + DIFFS[p.diff].toLowerCase()}</small></div>
        <div class="form"><span class="tag ${ft[1]}">${ft[0]}</span>${affTxt}<span class="tag odd">${pre.odds.get(p).toFixed(1).replace(".", ",")}x</span></div></div>`;
    }).join("");
    renderBets();
  }
  function surfName(t) { return { day: "grama", desert: "areia", swamp: "lama", snow: "neve", sunset: "terra", night: "grama", beach: "praia", country: "campo", neon: "asfalto" }[t.theme]; }

  function renderBets() {
    const box = $("#bet-area"); $("#bet-err").textContent = "";
    if (champ.mode !== "bet") {
      box.innerHTML = `<p class="prize-note">🏆 Modo pontos: ${POINTS.slice(0, champ.players.length).map((v, i) => `${i + 1}º = ${v}`).join(" · ")}</p>`; return;
    }
    const humans = champ.players.filter(p => p.human);
    const cpuBets = champ.players.filter(p => !p.human && pre.bets.get(p).amt > 0);
    box.innerHTML = (humans.length ? `<div class="bets">${humans.map(p => {
      const b = pre.bets.get(p), can = p.coins >= MIN_BET;
      return `<div class="bet" style="--c:${p.color.hex}" data-p="${p.idx}">
        <div class="bet-h"><b>${esc(p.name)}</b><span>${money(p.coins)}</span></div>
        ${can ? `<div class="bet-pick">${pre.lanes.map((h, i) => `<button style="--c:${h.color.hex}" data-h="${h.idx}" class="${b.horse === h ? "on" : ""}" title="${esc(h.color.horse)} (${pre.odds.get(h).toFixed(1)}x)">${i + 1}</button>`).join("")}</div>
        <div class="bet-amt"><input type="number" inputmode="numeric" min="0" max="${p.coins}" step="5" value="${b.amt}" aria-label="Valor da aposta de ${esc(p.name)}">
          <button data-q=".1">10%</button><button data-q=".25">25%</button><button data-q="1">Tudo</button><button data-q="0">Nada</button></div>
        <div class="bet-ret"></div>` : `<div class="bet-ret">Sem moedas para apostar. O cavalo ainda pode ganhar prêmio de colocação.</div>`}
      </div>`;
    }).join("")}</div>` : "") +
      `<p class="prize-note">💵 Prêmio para o dono do cavalo: ${PRIZES.slice(0, champ.players.length).map((v, i) => `${i + 1}º ${money(v)}`).join(" · ")}. Aposta mínima ${money(MIN_BET)} (ou nada).</p>` +
      (cpuBets.length ? `<p class="prize-note">🤖 ${cpuBets.map(p => { const b = pre.bets.get(p); return `${esc(p.name)} apostou ${money(b.amt)} no ${esc(b.horse.color.name)}`; }).join(" · ")}</p>` : "");
    $$("#bet-area .bet").forEach(el => {
      const p = champ.players.find(x => x.idx === Number(el.dataset.p)), b = pre.bets.get(p);
      const inp = el.querySelector("input"), ret = el.querySelector(".bet-ret");
      if (!inp) return;
      const upd = () => {
        const v = Math.floor(Number(inp.value)); b.amt = isFinite(v) ? v : 0;
        const bad = b.amt !== 0 && (b.amt < MIN_BET || b.amt > p.coins);
        inp.setAttribute("aria-invalid", bad ? "true" : "false");
        ret.innerHTML = b.amt > 0 ? `No ${esc(b.horse.color.name)} (${esc(b.horse.color.horse)}) a ${pre.odds.get(b.horse).toFixed(1).replace(".", ",")}x: se ganhar, recebe <b>${money(b.amt * pre.odds.get(b.horse))}</b>` : "Sem aposta nesta corrida.";
      };
      inp.addEventListener("input", upd);
      el.querySelectorAll(".bet-pick button").forEach(bt => bt.onclick = () => {
        b.horse = champ.players.find(x => x.idx === Number(bt.dataset.h)); AU.click();
        el.querySelectorAll(".bet-pick button").forEach(o => o.classList.toggle("on", o === bt)); upd();
      });
      el.querySelectorAll(".bet-amt button").forEach(bt => bt.onclick = () => {
        const q = Number(bt.dataset.q); inp.value = q === 0 ? 0 : Math.max(MIN_BET, Math.min(p.coins, q === 1 ? p.coins : Math.round(p.coins * q / 5) * 5)); AU.click(); upd();
      });
      upd();
    });
  }

  $("#pre-go").addEventListener("click", () => {
    if (champ.mode === "bet") {
      const bad = champ.players.filter(p => { const b = pre.bets.get(p); return b.amt !== 0 && (b.amt < MIN_BET || b.amt > p.coins || !Number.isInteger(b.amt)); });
      if (bad.length) { $("#bet-err").textContent = `Aposta inválida para ${bad.map(p => p.name).join(", ")}: use 0 ou um valor entre ${money(MIN_BET)} e o saldo.`; return; }
    }
    AU.init(); AU.click();
    startRace();
  });
  $("#pre-quit").addEventListener("click", () => confirmBox("Encerrar o campeonato?", champ.raceNo ? "Vamos direto para o placar final." : "Nenhuma corrida foi disputada ainda.", () => { if (champ.raceNo) showFinal(); else goMenu(); }));

  /* =====================================================================
     MOTOR DA CORRIDA
     x em metros (focinho do cavalo). Passo fixo; o mesmo motor roda a
     corrida ao vivo e as simulações rápidas usadas para calcular as odds.
     ===================================================================== */
  const DT = 1 / 120, REGEN = 5, WHIP_COST = 6, WHIP_GAP = .2;
  const CPU = {
    easy: { sig: .09, miss: .12, iv: .45 },
    normal: { sig: .05, miss: .05, iv: .4 },
    hard: { sig: .022, miss: .01, iv: .37 }
  };

  function newRace(track, lanes, info, ctrl, live) {
    const r = {
      track, len: track.len, v0: track.len / track.dur, live, t: 0, cd: 3.6, phase: "count", done: 0,
      hm: track.hurdles.map(f => f * track.len), patches: track.patches.map(p => ({ a: p.a * track.len, b: p.b * track.len, t: p.t })),
      slow: 1, rec: [], events: [], endT: null
    };
    r.horses = lanes.map((p, i) => {
      const human = p.human && ctrl === "skill";
      const diff = human ? null : ctrl === "luck" ? "normal" : p.diff;
      return {
        p, lane: i, x: 0, v: 0, st: 100, boostT: 0, pBoostT: 0, exT: 0, clumsyT: 0, stumT: 0, jump: null, jumpFor: -1, nextH: 0,
        phase: Math.random(), done: false, time: 0, place: 0, lastWhip: -9, falseStart: false, delay: 0, whipAnim: 0, stumbleAfter: false,
        mult: info.get(p).mult * (1 + clamp(gauss(), -2.5, 2.5) * .011), nz: [rand(.25, .7), rand(0, TAU), rand(.9, 1.6), rand(0, TAU)], sgT: 0, sgM: 0,
        human, cpu: human ? null : { diff, ...CPU[diff], push: diff === "easy" ? rand(.15, .8) : rand(.35, .6), plan: -1, tt: 0, skip: false, next: rand(0, .3) },
        stats: { whips: 0, perfect: 0, good: 0, bad: 0, stumbles: 0 }
      };
    });
    return r;
  }

  function emit(r, type, h, extra) { if (r.live) r.events.push({ type, h, ...extra }); }

  function tap(r, h) {
    if (h.done) return;
    if (r.phase === "count") {
      if (r.cd < 3.0 && !h.falseStart) { h.falseStart = true; emit(r, "false", h); }
      return;
    }
    if (r.phase !== "run" || h.delay > 0) return;
    // janela de salto: tempo até o obstáculo
    if (h.nextH < r.hm.length && h.jumpFor !== h.nextH && h.v > .5) {
      const tt = (r.hm[h.nextH] - h.x) / h.v;
      if (tt <= .45 && tt >= .03) {
        const q = tt >= .12 && tt <= .27 ? "perfect" : "good";
        h.jump = { t: 0, dur: .5, q }; h.jumpFor = h.nextH; h.stats[q]++;
        emit(r, "jump", h, { q });
        return;
      }
    }
    if (h.exT > 0) return;
    const gap = r.t - h.lastWhip; h.lastWhip = r.t;
    if (gap < WHIP_GAP) { h.st -= 3; }
    else { h.boostT = .45; h.st -= WHIP_COST; h.stats.whips++; h.whipAnim = .22; emit(r, "whip", h); }
    if (h.st <= 0) { h.st = 0; h.exT = 1.6; emit(r, "tired", h); }
  }

  function surfaceAt(r, x) { for (const p of r.patches) if (x >= p.a && x <= p.b) return p.t; return null; }

  function cpuThink(r, h) {
    const c = h.cpu;
    if (h.nextH < r.hm.length && h.jumpFor !== h.nextH) {
      if (c.plan !== h.nextH) { c.plan = h.nextH; c.skip = Math.random() < c.miss; c.tt = clamp(.195 + gauss() * c.sig, .05, .44); }
      if (!c.skip && h.v > .5 && (r.hm[h.nextH] - h.x) / h.v <= c.tt) tap(r, h);
    }
    if (r.t >= c.next) {
      c.next = r.t + c.iv * rand(.92, 1.2);
      const prog = h.x / r.len, remT = (r.len - h.x) / Math.max(1, h.v);
      const nearH = h.nextH < r.hm.length && (r.hm[h.nextH] - h.x) / Math.max(1, h.v) < .6;
      if (nearH || h.exT > 0 || h.done) return;
      let want;
      if (c.diff === "hard") want = h.st > Math.min(92, remT * (WHIP_COST / c.iv) * .5) || (prog > .9 && h.st > WHIP_COST);
      else if (c.diff === "normal") want = (prog > c.push && h.st > 10) || h.st > 97;
      else want = prog > c.push && h.st > 4 && Math.random() < .7;
      if (want) tap(r, h);
    }
  }

  function step(r, dt) {
    if (r.phase === "count") {
      r.cd -= dt;
      if (r.cd <= 0) { r.phase = "run"; r.t = 0; r.horses.forEach(h => { if (h.falseStart) h.delay = .7; }); emit(r, "go"); }
      return;
    }
    if (r.phase === "done") return;
    r.t += dt;
    const t = r.t;
    for (const h of r.horses) {
      if (h.whipAnim > 0) h.whipAnim -= dt;
      if (h.delay > 0) { h.delay -= dt; continue; }
      if (h.cpu) cpuThink(r, h);
      // obstáculo sem toque: salto ruim
      if (h.nextH < r.hm.length && h.jumpFor !== h.nextH && r.hm[h.nextH] - h.x < .3) {
        h.jump = { t: 0, dur: .55, q: "bad" }; h.jumpFor = h.nextH; h.clumsyT = .6; h.stats.bad++;
        h.stumbleAfter = Math.random() < .38; emit(r, "badjump", h);
      }
      // sorte: oscilação suave + arrancadas/quedas aleatórias de ritmo
      if (h.sgT > 0) h.sgT -= dt; else if (Math.random() < dt * .32 * r.track.vol) { h.sgT = rand(.8, 2.2); h.sgM = rand(-.1, .12); }
      let m = h.mult * (1 + r.track.vol * .05 * (Math.sin(t * h.nz[0] + h.nz[1]) + Math.sin(t * h.nz[2] + h.nz[3])) / 2) * (h.sgT > 0 ? 1 + h.sgM : 1);
      if (!h.jump) { const s = surfaceAt(r, h.x); if (s) m *= SURF[s].m; }
      if (h.boostT > 0) { m *= 1 + .14 * Math.min(1, h.boostT / .2); h.boostT -= dt; }
      if (h.pBoostT > 0) { m *= 1.12; h.pBoostT -= dt; }
      if (h.exT > 0) { m *= .8; h.exT -= dt; h.st = Math.min(100, h.st + REGEN * .6 * dt); }
      else if (t - h.lastWhip > .8) h.st = Math.min(100, h.st + REGEN * dt);
      if (h.clumsyT > 0) { m *= .55; h.clumsyT -= dt; }
      if (h.stumT > 0) { m *= .12; h.stumT -= dt; }
      if (h.done) m *= .5;
      const target = r.v0 * m;
      const rate = target > h.v ? (t < 1.5 ? 1.6 : 2.2) : 3.5;
      h.v += (target - h.v) * Math.min(1, rate * dt);
      const px = h.x; h.x += h.v * dt;
      if (h.nextH < r.hm.length && h.x > r.hm[h.nextH] + .25) h.nextH++;
      if (h.jump) {
        h.jump.t += dt;
        if (h.jump.t >= h.jump.dur) {
          if (h.jump.q === "perfect") h.pBoostT = .7;
          if (h.stumbleAfter) { h.stumT = .9; h.stats.stumbles++; h.stumbleAfter = false; emit(r, "stumble", h); }
          else emit(r, "land", h);
          h.jump = null;
        }
      }
      h.phase = (h.phase + h.v * dt / 2.7) % 1;
      if (!h.done && h.x >= r.len) {
        const frac = (h.x - r.len) / Math.max(.001, h.x - px);
        h.time = t - frac * dt; h.done = true; h.place = ++r.done; emit(r, "finish", h);
      }
    }
    // corrida termina quando todos cruzam, ou 8 s depois do vencedor (projeta o resto)
    if (r.done && r.endT == null) r.endT = t;
    if (r.done === r.horses.length || (r.endT != null && t - r.endT > 8)) {
      r.horses.filter(h => !h.done).sort((a, b) => b.x - a.x).forEach(h => {
        h.time = t + (r.len - h.x) / Math.max(1, h.v); h.done = true; h.place = ++r.done;
      });
      r.phase = "done";
    }
  }

  /* ---------------- corrida ao vivo ---------------- */
  const cv = $("#race"), ctx = cv.getContext("2d");
  let raf = 0, acc = 0, lastNow = 0, view = null, replay = null, parts = [], wx = [];
  const cam = { x: -6, vw: 22, shake: 0 };

  function startRace() {
    NARR.reset();
    race = newRace(pre.track, pre.lanes, pre.info, champ.ctrl, true);
    replay = null; parts = []; wx = [];
    cam.x = -8; cam.vw = 20; cam.shake = 0;
    show("race");
    $("#hud-track").textContent = pre.track.name;
    $("#hud-dist").textContent = pre.track.len + " m";
    buildProgress();
    buildPads();
    $("#skip-btn").hidden = true; $("#skip-btn").textContent = "Pular ⏭";
    sizeCanvas();
    AU.crowdStart();
    race.lastLeader = null; race.finalCalled = false; race.photo = false; race.cdShown = 4; race.resultAt = null;
    acc = 0; lastNow = performance.now();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    if (champ.ctrl === "skill" && champ.players.some(p => p.human)) NARR.say("Toque na sua tecla para chicotear. Espere o JÁ!", null, 0, false);
  }

  function stopRace() { cancelAnimationFrame(raf); raf = 0; AU.crowdStop(); race = null; replay = null; }

  function buildProgress() {
    const r = race;
    $("#progress").innerHTML = `<span class="flag">🏁</span>` + r.hm.map(m => `<i class="hmark" style="left:${m / r.len * 96 + 2}%"></i>`).join("") +
      r.horses.map(h => `<i class="pdot" style="--c:${h.p.color.hex}" data-l="${h.lane}"></i>`).join("");
  }
  function buildPads() {
    const pads = $("#pads");
    const humans = champ.ctrl === "skill" ? race.horses.filter(h => h.human).sort((a, b) => a.p.idx - b.p.idx) : [];
    pads.hidden = !humans.length;
    pads.innerHTML = humans.map(h => `<button class="pad" style="--c:${h.p.color.hex}" data-l="${h.lane}"><b>${esc(h.p.name)}</b><span class="key">${h.p.key}</span><span class="stam"><i style="width:100%"></i></span></button>`).join("");
    pads.querySelectorAll(".pad").forEach(b => {
      b.addEventListener("pointerdown", e => { e.preventDefault(); humanTap(Number(b.dataset.l)); });
      b.addEventListener("contextmenu", e => e.preventDefault());
    });
  }
  function humanTap(lane) {
    if (!race || replay) return;
    const h = race.horses[lane]; if (!h || !h.human) return;
    tap(race, h);
    const pad = document.querySelector(`.pad[data-l="${lane}"]`);
    if (pad) { pad.classList.add("hit"); setTimeout(() => pad.classList.remove("hit"), 90); }
  }
  document.addEventListener("keydown", e => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (current === "race" && race && !replay) {
      const k = e.key.toUpperCase(), h = race.horses.find(h => h.human && h.p.key === k);
      if (h) { e.preventDefault(); humanTap(h.lane); }
    }
    if (e.key.toLowerCase() === "m" && current !== "race" && !(e.target instanceof HTMLInputElement)) $("#sound-btn").click();
    if (e.key === "Escape") $$(".modal").forEach(m => m.hidden = true);
  });

  function sizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), r = cv.getBoundingClientRect();
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", () => { if (current === "race") sizeCanvas(); });

  function bigMsg(text, small) {
    const el = $("#big-msg"); el.hidden = false; el.classList.toggle("small", !!small);
    el.innerHTML = `<span>${esc(text)}</span>`; clearTimeout(bigMsg.t); bigMsg.t = setTimeout(() => { el.hidden = true; }, 950);
  }

  function handleEvents(r) {
    for (const ev of r.events) {
      const h = ev.h, nm = h ? h.p.name : "";
      switch (ev.type) {
        case "false": NARR.say(`${nm} queimou a largada!`, "false" + h.lane, 9e9); AU.thud(); h.p.st.falseStarts++; break;
        case "go": bigMsg("JÁ!"); AU.gun(); AU.crowdLevel(.09); break;
        case "whip": if (h.human || Math.random() < .3) AU.whip(); break;
        case "tired": if (h.human) { NARR.say(`${nm} gastou todo o fôlego!`, "tired" + h.lane, 4000); AU.tired(); } break;
        case "jump":
          AU.jump(); burst(h, ev.q === "perfect" ? "#ffd23f" : "#ffffff", 10);
          if (ev.q === "perfect") NARR.say(`Salto perfeito de ${nm}!`, "perf" + h.lane, 1800, h.human);
          break;
        case "badjump": AU.land(); if (h.human) NARR.say(`${nm} não pulou na hora!`, "bad" + h.lane, 2500, false); break;
        case "land": AU.land(); break;
        case "stumble": AU.thud(); cam.shake = .35; NARR.say(`${nm} tropeçou no obstáculo!`, "stum" + h.lane, 2000); burst(h, THEMES[r.track.theme].dust, 26); break;
        case "finish":
          if (h.place === 1) { bigMsg(h.p.color.name.toUpperCase() + "!", true); AU.cheer(3); NARR.say(`${nm} vence a corrida com ${h.p.color.horse}!`, null, 0); confetti(); $("#skip-btn").hidden = false; }
          AU.tone(1200 - h.place * 120, .15, "triangle", .1);
          break;
      }
    }
    r.events.length = 0;
  }

  function narrateLive(r) {
    if (r.phase !== "run") return;
    const order = r.horses.filter(h => !h.done || h.place === 1).sort((a, b) => b.x - a.x);
    const lead = order[0]; if (!lead) return;
    if (r.t > 1.8 && !r.done && lead !== r.lastLeader) {
      if (r.lastLeader) NARR.say(pick([`${lead.p.name} assume a ponta!`, `${lead.p.color.name} passa à frente!`, `Agora quem lidera é ${lead.p.name}!`]), "lead", 2600);
      r.lastLeader = lead;
    }
    if (!r.finalCalled && lead.x > r.len * .8 && !r.done) { r.finalCalled = true; NARR.say("Reta final! Agora é tudo ou nada!", "final", 0); AU.crowdLevel(.16); }
    // fotochart: câmera lenta quando os dois primeiros chegam juntos
    const second = order[1];
    if (!r.done && second && r.len - lead.x < 3.2 && lead.x - second.x < .55) {
      if (!r.photo) { r.photo = true; r.slow = .3; bigMsg("FOTOCHART!", true); }
    } else if (r.photo && (r.done >= 2 || (second && lead.x - second.x > 1.2))) r.slow = 1;
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dtR = Math.min(.05, (now - lastNow) / 1000); lastNow = now;
    if (replay) { replayFrame(dtR); return; }
    const r = race; if (!r) return;
    // contagem regressiva
    if (r.phase === "count") {
      const s = Math.ceil(r.cd);
      if (r.cd < 3.4 && r.cdShown === 4) { r.cdShown = 3.5; bigMsg("Preparar…", true); }
      if (s <= 3 && s >= 1 && s < r.cdShown) { r.cdShown = s; bigMsg(String(s)); AU.beep(false); }
    }
    acc += dtR * r.slow;
    let n = 0;
    while (acc >= DT && n++ < 40) {
      step(r, DT); acc -= DT;
      if (r.phase === "run" && (r.recK = (r.recK || 0) + 1) % 4 === 0) record(r);
    }
    handleEvents(r);
    narrateLive(r);
    hoofSounds(r, dtR);
    updateCam(r.horses, dtR);
    render(r, r.horses, dtR);
    updateHUD(r.horses, r.phase === "count" ? 0 : r.t);
    if (r.phase === "done" && r.resultAt == null) { r.resultAt = now + 1600; record(r); }
    if (r.resultAt != null && now > r.resultAt) finishRace();
  }

  function record(r) {
    r.rec.push({ t: r.t, h: r.horses.map(h => [h.x, h.phase, h.jump ? h.jump.t / h.jump.dur : -1, h.stumT > 0 ? 1 : 0, h.boostT > 0 || h.pBoostT > 0 ? 1 : 0, h.st, h.exT > 0 ? 1 : 0, h.whipAnim > 0 ? 1 : 0]) });
  }

  $("#skip-btn").addEventListener("click", () => {
    if (replay) { replay = null; cancelAnimationFrame(raf); show("result"); return; }
    if (!race) return;
    let g = 0; race.live = false; race.slow = 1;
    while (race.phase !== "done" && g++ < 50000) { step(race, DT); race.recK = (race.recK || 0) + 1; if (race.phase === "run" && race.recK % 4 === 0) record(race); }
    record(race); race.live = true; finishRace();
  });

  function hoofSounds(r, dt) {
    if (r.phase !== "run" || !AU.on) return;
    for (const h of r.horses) {
      if (h.jump || h.v < 1) continue;
      const k = Math.floor(h.phase * 2);
      if (h.lastK !== undefined && k !== h.lastK) { AU.hoof(.05 + (h.human ? .05 : 0)); dust(h); }
      h.lastK = k;
    }
  }

  function updateCam(hs, dt) {
    let maxX = -1e9, minX = 1e9;
    for (const h of hs) { const x = Math.min(h.x, (race || replay.r).len + 6); maxX = Math.max(maxX, x); minX = Math.min(minX, x); }
    const spread = maxX - minX;
    const narrow = cv.clientWidth < 600, tvw = clamp(spread + (narrow ? 7 : 12), narrow ? 10 : 16, narrow ? 24 : 34);
    cam.vw = lerp(cam.vw, tvw, Math.min(1, dt * 1.5));
    const tx = Math.max(maxX - cam.vw * .74, minX - 3);
    cam.x = lerp(cam.x, Math.max(-8, tx), Math.min(1, dt * 3));
    if (cam.shake > 0) cam.shake -= dt;
  }

  function updateHUD(hs, t) {
    const len = (race || replay.r).len;
    $("#hud-clock").textContent = fmtT(Math.max(0, t));
    hs.forEach(h => { const d = document.querySelector(`.pdot[data-l="${h.lane}"]`); if (d) d.style.left = (clamp(h.x / len, 0, 1) * 96 + 2) + "%"; });
    hs.forEach(h => {
      if (!h.human) return;
      const pad = document.querySelector(`.pad[data-l="${h.lane}"]`); if (!pad) return;
      pad.querySelector(".stam i").style.width = clamp(h.st, 0, 100) + "%";
      pad.classList.toggle("tired", h.exT > 0 || h.st < 20);
    });
  }

  /* ---------------- partículas ---------------- */
  function dust(h) {
    if (parts.length > 260) return;
    const th = THEMES[(race || replay.r).track.theme];
    const s = surfaceAt(race || replay.r, h.x);
    const col = s === "mud" ? "#4a3020" : s === "water" ? "#9fd8ff" : s === "turbo" ? "#ffd23f" : th.dust;
    for (let i = 0; i < 2; i++) parts.push({ x: h.x - 2.2 + rand(-.3, .3), lane: h.lane, dy: 0, vx: -rand(.5, 2), vy: -rand(10, 40), life: rand(.4, .8), max: .8, c: col, s: rand(2, 5) });
  }
  function burst(h, col, n) { for (let i = 0; i < n; i++) parts.push({ x: h.x - 1 + rand(-1, 1), lane: h.lane, dy: -rand(0, 20), vx: rand(-3, 3), vy: -rand(30, 120), life: rand(.5, 1), max: 1, c: col, s: rand(2, 5) }); }
  let confettiP = [];
  function confetti() {
    const W = cv.clientWidth;
    for (let i = 0; i < 160; i++) confettiP.push({ x: rand(0, W), y: rand(-200, -10), vx: rand(-40, 40), vy: rand(60, 180), r: rand(0, TAU), vr: rand(-6, 6), c: pick(COLORS).hex, s: rand(5, 10), life: 4 });
  }

  /* =====================================================================
     DESENHO
     ===================================================================== */
  function layout(W, H, n) {
    const tall = H > W, horY = H * (tall ? .3 : .36), top = H * (tall ? .4 : .47), bot = H * .985;
    const laneH = (bot - top) / n;
    return { W, H, horY, top, bot, laneH, n };
  }

  function render(r, hs, dt) {
    const W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    const L = layout(W, H, hs.length);
    const ppm = W / cam.vw;
    const sx = m => (m - cam.x) * ppm;
    const th = THEMES[r.track.theme], t = performance.now() / 1000;
    ctx.save();
    if (cam.shake > 0) ctx.translate(rand(-4, 4) * cam.shake * 3, rand(-3, 3) * cam.shake * 3);
    const excite = r.phase === "run" ? clamp(Math.max(...hs.map(h => h.x)) / r.len, 0, 1) : .1;
    drawScenery(ctx, L, th, cam.x, t, excite);
    drawTrack(ctx, L, th, r, sx, ppm, t);
    // raias de trás para a frente
    for (let i = 0; i < hs.length; i++) {
      const h = hs[i], ly = L.top + L.laneH * (i + .8), ps = .74 + .26 * (hs.length > 1 ? i / (hs.length - 1) : 1);
      const hl = Math.min(L.laneH * 1.85, H * .27, W * (W < 600 ? .27 : .16)) * ps;
      for (const hm of r.hm) drawHurdle(ctx, sx(hm), ly, hl, th);
      drawParticlesLane(ctx, i, sx, ly, dt);
      const k = hl / 100;
      const air = h.jump ? h.jump.t / h.jump.dur : (h.air != null ? h.air : -1);
      drawHorse(ctx, sx(h.x) - 66 * k, ly, k, {
        phase: h.phase, coat: h.p.color.coat, mane: h.p.color.mane, silk: h.p.color.hex, num: i + 1,
        air, stum: h.stumT > 0 || h.stum, boost: h.boostT > 0 || h.pBoostT > 0 || h.boost, whip: h.whipAnim > 0, still: (r.phase === "count" || h.delay > 0 || h.v < .3) && !h.done
      }, t);
      drawLabel(ctx, sx(h.x) - 40 * k, ly - 128 * k, h, r, k, t);
    }
    drawFrontRail(ctx, L, th, cam.x, ppm);
    drawWeather(ctx, L, th, dt, t);
    drawConfetti(ctx, dt, H);
    // vinheta
    const g = ctx.createRadialGradient(W / 2, H * .55, H * .3, W / 2, H * .55, W * .75);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, th.night ? "rgba(0,0,0,.45)" : "rgba(0,0,0,.22)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ----- cenário -----
  function drawScenery(c, L, th, camX, t, excite) {
    const { W, H, horY, top } = L;
    const g = c.createLinearGradient(0, 0, 0, horY + 20);
    g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    c.fillStyle = g; c.fillRect(0, 0, W, horY + 30);
    const base = camX * 40; // deslocamento do cenário em px (independente do zoom)
    if (th.stars) { c.fillStyle = "#fff"; for (let i = 0; i < 90; i++) { const x = (hash(i) * W * 1.3 - base * .02) % W, y = hash(i + 50) * horY * .9; c.globalAlpha = .3 + .7 * Math.abs(Math.sin(t * (1 + hash(i + 9) * 2) + i)); c.fillRect((x + W) % W, y, 1.6, 1.6); } c.globalAlpha = 1; }
    if (th.sun) { const s = th.sun, x = W * s.x, y = H * s.y; const sg = c.createRadialGradient(x, y, 0, x, y, s.r * 3); sg.addColorStop(0, s.c); sg.addColorStop(.33, s.c); sg.addColorStop(.34, hexA(s.c, .35)); sg.addColorStop(1, hexA(s.c, 0)); c.fillStyle = sg; c.beginPath(); c.arc(x, y, s.r * 3, 0, TAU); c.fill(); }
    if (th.moon) { const m = th.moon, x = W * m.x, y = H * m.y; c.fillStyle = "rgba(255,255,230,.15)"; c.beginPath(); c.arc(x, y, m.r * 2.4, 0, TAU); c.fill(); c.fillStyle = "#f6f3dc"; c.beginPath(); c.arc(x, y, m.r, 0, TAU); c.fill(); c.fillStyle = th.sky[0]; c.beginPath(); c.arc(x + m.r * .45, y - m.r * .2, m.r * .9, 0, TAU); c.fill(); }
    if (th.clouds) {
      c.fillStyle = "rgba(255,255,255,.85)";
      for (let i = 0; i < 6; i++) { const span = W + 300, x = ((hash(i * 3) * span - base * .05 - t * 6 * (1 + i % 3)) % span + span) % span - 150, y = horY * (.15 + hash(i * 7) * .45), s = 18 + hash(i) * 22; cloud(c, x, y, s); }
    }
    // camada distante
    farLayer(c, L, th, base * .12, t);
    // faixa intermediária
    c.fillStyle = th.ground; c.fillRect(0, horY, W, top - horY + 2);
    midLayer(c, L, th, base * .5, t, excite);
  }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  function cloud(c, x, y, s) { c.beginPath(); c.arc(x, y, s, 0, TAU); c.arc(x + s, y - s * .5, s * 1.1, 0, TAU); c.arc(x + s * 2.1, y, s * .9, 0, TAU); c.rect(x, y - s * .2, s * 2.1, s * 1); c.fill(); }

  function farLayer(c, L, th, off, t) {
    const { W, horY } = L, [c1, c2] = th.farC;
    const poly = (f, col, base) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, horY + 2); for (let x = 0; x <= W + 8; x += 8) c.lineTo(x, base - f(x + off)); c.lineTo(W, horY + 2); c.closePath(); c.fill(); };
    switch (th.far) {
      case "hills": poly(x => 34 + 22 * Math.sin(x * .004) + 12 * Math.sin(x * .011 + 1), c1, horY); poly(x => 16 + 14 * Math.sin(x * .007 + 2) + 6 * Math.sin(x * .02), c2, horY + 4); break;
      case "dunes": poly(x => 30 + 26 * Math.sin(x * .003) + 8 * Math.sin(x * .009), c1, horY); poly(x => 14 + 16 * Math.sin(x * .005 + 3), c2, horY + 4); break;
      case "forest": poly(x => 40 + 10 * Math.sin(x * .01) + 9 * Math.abs(Math.sin(x * .05)) + 6 * Math.abs(Math.sin(x * .13)), c1, horY); poly(x => 20 + 8 * Math.abs(Math.sin(x * .07 + 1)) + 5 * Math.sin(x * .02), c2, horY + 4); break;
      case "mountains": {
        const f = x => 70 + 50 * Math.abs(Math.sin(x * .0035)) + 25 * Math.abs(Math.sin(x * .011 + 1)) - 10 * Math.sin(x * .03);
        const g = c.createLinearGradient(0, horY - 150, 0, horY); g.addColorStop(0, c1); g.addColorStop(.45, "#dfe8f2"); g.addColorStop(1, c2);
        poly(f, g, horY); poly(x => 22 + 12 * Math.abs(Math.sin(x * .008 + 2)), "#b8c8d9", horY + 4); break;
      }
      case "mesas": poly(x => { const v = Math.sin(x * .004) + .4 * Math.sin(x * .013); return v > .35 ? 62 : v > -.2 ? 30 + 20 * (v + .2) : 18; }, c1, horY); poly(x => 14 + 6 * Math.sin(x * .02), c2, horY + 4); break;
      case "city": case "neoncity": {
        const neon = th.far === "neoncity";
        for (let i = Math.floor(off / 40) - 1; i < (off + W) / 40 + 1; i++) {
          const x = i * 40 - off, h = 30 + hash(i) * 90, w = 30 + hash(i + 3) * 14;
          c.fillStyle = hash(i + 1) > .5 ? c1 : c2; c.fillRect(x, horY - h, w, h + 2);
          for (let wy = horY - h + 6; wy < horY - 6; wy += 9) for (let wx2 = x + 4; wx2 < x + w - 4; wx2 += 7) {
            const on = hash(i * 31 + wy * 7 + wx2) > .55; if (!on) continue;
            c.fillStyle = neon ? (hash(wx2 + wy) > .5 ? "rgba(255,79,216,.7)" : "rgba(0,240,255,.6)") : "rgba(255,214,120,.75)"; c.fillRect(wx2, wy, 3, 4);
          }
          if (neon && hash(i + 7) > .7) { c.strokeStyle = hash(i) > .5 ? "#00f0ff" : "#ff4fd8"; c.lineWidth = 2; c.shadowColor = c.strokeStyle; c.shadowBlur = 12; c.strokeRect(x + 2, horY - h - 1, w - 4, 3); c.shadowBlur = 0; }
        }
        break;
      }
      case "sea": {
        const g = c.createLinearGradient(0, horY - 40, 0, horY); g.addColorStop(0, c1); g.addColorStop(1, c2);
        c.fillStyle = g; c.fillRect(0, horY - 40, W, 42);
        c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 1.5;
        for (let r = 0; r < 4; r++) { c.beginPath(); const y = horY - 34 + r * 9; for (let x = 0; x <= W; x += 10) c.lineTo(x, y + Math.sin((x + off * (1 + r * .3)) * .05 + t * 2 + r) * 1.5); c.stroke(); }
        if (th.sun) { c.fillStyle = "rgba(255,250,220,.5)"; for (let r = 0; r < 6; r++) c.fillRect(W * th.sun.x - 30 + Math.sin(t * 3 + r) * 8, horY - 36 + r * 6, 60 - r * 6, 2); }
        break;
      }
    }
  }

  function midLayer(c, L, th, off, t, excite) {
    const { W, horY, top } = L, gy = top - 2;
    const sw = 180;
    for (let i = Math.floor(off / sw) - 1; i <= Math.floor((off + W) / sw) + 1; i++) {
      const x = i * sw - off + hash(i * 5) * 60, r = hash(i * 13 + 2);
      switch (th.mid) {
        case "stands": stands(c, i * sw - off, gy, sw, i, t, excite, th); break;
        case "cacti": if (r > .35) cactus(c, x, gy, 26 + r * 30); if (r > .8) rock(c, x + 70, gy, 14); break;
        case "deadtrees": if (r > .3) deadTree(c, x, gy, 50 + r * 40); reeds(c, x + 60, gy); break;
        case "pines": pine(c, x, gy, 40 + r * 40); if (r > .5) pine(c, x + 50, gy, 30 + r * 30); break;
        case "fence": fenceMid(c, i * sw - off, gy, sw); if (r > .55) crowdGroup(c, x + 20, gy, t, excite, i); break;
        case "palms": if (r > .3) palm(c, x, gy, 60 + r * 40, t); if (r < .25) umbrella(c, x + 60, gy, i); break;
        case "trees": if (r > .25) tree(c, x, gy, 36 + r * 30); if (r > .7) crowdGroup(c, x + 60, gy, t, excite, i); break;
        case "neon": neonSign(c, x, gy, i, t); break;
      }
    }
    if (th.lights) for (let i = Math.floor(off / 420) - 1; i <= (off + W) / 420 + 1; i++) floodlight(c, i * 420 - off + 90, gy - 4, horY);
  }
  function stands(c, x, gy, w, i, t, excite, th) {
    const h = 64;
    c.fillStyle = th.night ? "#2a2f4a" : "#d9d4c7"; c.fillRect(x, gy - h, w + 1, h);
    c.fillStyle = th.night ? "#1a1e33" : "#9c3b3b"; c.fillRect(x - 2, gy - h - 12, w + 5, 12);
    c.fillStyle = th.night ? "#3b4266" : "#efe9dc"; for (let k = 0; k < 4; k++) c.fillRect(x + k * w / 4, gy - h - 12, 3, h + 12);
    const cols = ["#ff4d5e", "#3d8bff", "#2fd27a", "#ffd23f", "#a66bff", "#ff8c2b", "#ffffff", "#333"];
    for (let row = 0; row < 5; row++) for (let k = 0; k < 14; k++) {
      const s = i * 100 + row * 20 + k; if (hash(s) < .18) continue;
      const px = x + 6 + k * (w - 10) / 14 + row % 2 * 4, bounce = Math.max(0, Math.sin(t * (6 + hash(s) * 4) + s)) * (2 + excite * 6);
      const py = gy - h + 10 + row * 11 - bounce;
      c.fillStyle = cols[Math.floor(hash(s + 1) * cols.length)]; c.fillRect(px, py, 6, 7);
      c.fillStyle = "#f1c9a5"; c.fillRect(px + 1, py - 4, 4, 4);
    }
  }
  function crowdGroup(c, x, gy, t, excite, i) {
    for (let k = 0; k < 7; k++) { const s = i * 50 + k, b = Math.max(0, Math.sin(t * 7 + s)) * (2 + excite * 5); c.fillStyle = pick2(s); c.fillRect(x + k * 7, gy - 14 - b, 6, 10); c.fillStyle = "#e8bf98"; c.fillRect(x + k * 7 + 1, gy - 19 - b, 4, 4); }
  }
  function pick2(s) { return COLORS[Math.floor(hash(s) * COLORS.length)].hex; }
  function cactus(c, x, gy, h) { c.fillStyle = "#3f8f4c"; c.fillRect(x - 4, gy - h, 8, h); c.fillRect(x - 14, gy - h * .7, 6, h * .35); c.fillRect(x - 14, gy - h * .4, 12, 5); c.fillRect(x + 8, gy - h * .85, 6, h * .4); c.fillRect(x + 2, gy - h * .5, 12, 5); }
  function rock(c, x, gy, s) { c.fillStyle = "#b07d4c"; c.beginPath(); c.ellipse(x, gy - s * .3, s, s * .6, 0, Math.PI, 0); c.fill(); }
  function deadTree(c, x, gy, h) { c.strokeStyle = "#2b2a22"; c.lineWidth = 5; c.beginPath(); c.moveTo(x, gy); c.lineTo(x, gy - h); c.moveTo(x, gy - h * .6); c.lineTo(x - 18, gy - h * .85); c.moveTo(x, gy - h * .75); c.lineTo(x + 16, gy - h); c.stroke(); c.fillStyle = "rgba(60,80,50,.7)"; c.beginPath(); c.arc(x - 18, gy - h * .88, 9, 0, TAU); c.arc(x + 16, gy - h, 8, 0, TAU); c.fill(); }
  function reeds(c, x, gy) { c.strokeStyle = "#6f7a3c"; c.lineWidth = 2; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(x + k * 4, gy); c.lineTo(x + k * 4 + 3, gy - 14 - k % 3 * 5); c.stroke(); } }
  function pine(c, x, gy, h) { c.fillStyle = "#5a3d29"; c.fillRect(x - 3, gy - h * .25, 6, h * .25); for (let k = 0; k < 3; k++) { const w = h * (.42 - k * .1), y = gy - h * .2 - k * h * .25; c.fillStyle = "#2e5e48"; tri(c, x, y - h * .38, w, y); c.fillStyle = "#f4f8fc"; tri(c, x, y - h * .38, w * .45, y - h * .22); } }
  function tri(c, x, ty, w, by) { c.beginPath(); c.moveTo(x, ty); c.lineTo(x + w, by); c.lineTo(x - w, by); c.closePath(); c.fill(); }
  function fenceMid(c, x, gy, w) { c.fillStyle = "#6b4026"; for (let k = 0; k < w; k += 30) c.fillRect(x + k, gy - 22, 4, 22); c.fillRect(x, gy - 20, w + 2, 3); c.fillRect(x, gy - 11, w + 2, 3); }
  function palm(c, x, gy, h, t) { c.strokeStyle = "#8a6239"; c.lineWidth = 6; c.beginPath(); c.moveTo(x, gy); c.quadraticCurveTo(x + 10, gy - h * .5, x + 4, gy - h); c.stroke(); c.strokeStyle = "#2f9a52"; c.lineWidth = 5; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + Math.sin(t + x) * .05; c.beginPath(); c.moveTo(x + 4, gy - h); c.quadraticCurveTo(x + 4 + Math.cos(a) * 20, gy - h - 12, x + 4 + Math.cos(a) * 32, gy - h + 8 + Math.abs(Math.sin(a)) * 6); c.stroke(); } }
  function umbrella(c, x, gy, i) { c.strokeStyle = "#ddd"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, gy); c.lineTo(x, gy - 34); c.stroke(); c.fillStyle = pick2(i); c.beginPath(); c.arc(x, gy - 32, 20, Math.PI, 0); c.fill(); }
  function tree(c, x, gy, h) { c.fillStyle = "#6a4a2c"; c.fillRect(x - 3, gy - h * .45, 6, h * .45); c.fillStyle = "#3f8a45"; c.beginPath(); c.arc(x, gy - h * .65, h * .32, 0, TAU); c.arc(x - h * .2, gy - h * .5, h * .22, 0, TAU); c.arc(x + h * .2, gy - h * .52, h * .24, 0, TAU); c.fill(); }
  function neonSign(c, x, gy, i, t) {
    if (hash(i) < .35) return;
    const col = hash(i + 2) > .5 ? "#00f0ff" : "#ff4fd8", w = 50 + hash(i + 4) * 40, h = 24;
    c.fillStyle = "#1a1030"; c.fillRect(x + w / 2 - 2, gy - 50, 4, 50);
    c.shadowColor = col; c.shadowBlur = 14 * (.7 + .3 * Math.sin(t * 5 + i)); c.strokeStyle = col; c.lineWidth = 3; c.strokeRect(x, gy - 50 - h, w, h);
    c.fillStyle = col; c.font = "bold 12px Nunito, sans-serif"; c.textAlign = "center"; c.fillText(["CORRIDA", "NEON", "24H", "PISTA", "VAI!", "TURBO"][i % 6 < 0 ? 0 : Math.abs(i) % 6], x + w / 2, gy - 50 - h / 2 + 4); c.shadowBlur = 0;
  }
  function floodlight(c, x, gy, horY) {
    c.fillStyle = "#3a3f55"; c.fillRect(x - 2, horY - 70, 4, gy - horY + 70);
    c.fillStyle = "#fffbe0"; c.fillRect(x - 12, horY - 76, 24, 8);
    const g = c.createRadialGradient(x, horY - 72, 0, x, horY - 72, 60); g.addColorStop(0, "rgba(255,250,220,.55)"); g.addColorStop(1, "rgba(255,250,220,0)");
    c.fillStyle = g; c.beginPath(); c.arc(x, horY - 72, 60, 0, TAU); c.fill();
  }

  // ----- pista -----
  function drawTrack(c, L, th, r, sx, ppm, t) {
    const { W, top, bot, laneH, n } = L;
    const g = c.createLinearGradient(0, top, 0, bot); g.addColorStop(0, th.track[1]); g.addColorStop(1, th.track[0]);
    c.fillStyle = g; c.fillRect(0, top, W, bot - top);
    // faixas do gramado/terreno (se movem com a pista)
    const sw = 5;
    c.fillStyle = "rgba(255,255,255,.045)";
    for (let m = Math.floor(cam.x / sw) * sw; m < cam.x + cam.vw + sw; m += sw * 2) c.fillRect(sx(m), top, sw * ppm, bot - top);
    if (th.neon) { c.strokeStyle = "rgba(255,79,216,.15)"; c.lineWidth = 1; for (let m = Math.floor(cam.x); m < cam.x + cam.vw + 1; m++) { c.beginPath(); c.moveTo(sx(m), top); c.lineTo(sx(m) - 30, bot); c.stroke(); } }
    // trechos especiais
    for (const p of r.patches) {
      const a = sx(p.a), b = sx(p.b); if (b < 0 || a > W) continue;
      drawPatch(c, p.t, a, b, top, bot, laneH, n, t);
    }
    // linhas das raias
    c.strokeStyle = th.line; c.lineWidth = 2; c.setLineDash([18, 14]); c.lineDashOffset = cam.x * ppm;
    for (let i = 1; i < n; i++) { const y = top + laneH * i; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.setLineDash([]);
    if (th.neon) { c.shadowColor = "#00f0ff"; c.shadowBlur = 10; }
    // trilho de trás
    c.fillStyle = "rgba(0,0,0,.18)"; c.fillRect(0, top, W, 6);
    c.strokeStyle = th.neon ? "#00f0ff" : "#f4f3ee"; c.lineWidth = 4; c.beginPath(); c.moveTo(0, top - 14); c.lineTo(W, top - 14); c.stroke();
    c.lineWidth = 3;
    for (let m = Math.floor(cam.x / 2) * 2; m < cam.x + cam.vw + 2; m += 2) { const x = sx(m); c.beginPath(); c.moveTo(x, top - 14); c.lineTo(x, top + 2); c.stroke(); }
    c.shadowBlur = 0;
    // marcos de distância
    const step = r.len >= 160 ? 50 : 25;
    c.font = "800 12px Nunito, sans-serif"; c.textAlign = "center";
    for (let m = step; m < r.len; m += step) {
      const x = sx(m); if (x < -40 || x > W + 40) continue;
      c.fillStyle = "#fff"; c.fillRect(x - 2, top - 42, 4, 30);
      c.fillStyle = "#e03a3a"; c.fillRect(x - 18, top - 56, 36, 18);
      c.fillStyle = "#fff"; c.fillText((r.len - m) + "m", x, top - 43);
    }
    // portões de largada
    const gx = sx(0);
    if (gx > -80 && gx < W + 80) {
      const open = r.phase !== "count";
      for (let i = 0; i < n; i++) {
        const y0 = top + laneH * i + 4, y1 = top + laneH * (i + 1) - 2;
        c.fillStyle = "rgba(20,30,40,.35)"; c.fillRect(gx - 34, y0, 34, y1 - y0);
        c.fillStyle = "#e9ecef"; c.fillRect(gx - 36, y0 - 18, 4, y1 - y0 + 18); c.fillRect(gx + 2, y0 - 18, 4, y1 - y0 + 18);
        c.fillStyle = "#2f8f4e"; c.fillRect(gx - 36, y0 - 22, 42, 7);
        c.fillStyle = "#fff"; c.font = "900 10px Nunito"; c.fillText(String(i + 1), gx - 15, y0 - 16);
        c.fillStyle = "#c9302c";
        if (!open) c.fillRect(gx - 1, y0, 4, y1 - y0);
        else { c.save(); c.translate(gx + 3, y0); c.transform(1, 0, 0.0, 1, 0, 0); c.fillRect(0, 0, 16, 4); c.fillRect(0, y1 - y0 - 4, 16, 4); c.restore(); }
      }
    }
    // linha de chegada
    const fx = sx(r.len);
    if (fx > -60 && fx < W + 60) {
      const sq = Math.max(6, laneH / 6);
      for (let y = top, row = 0; y < bot; y += sq, row++) for (let k = 0; k < 2; k++) { c.fillStyle = (row + k) % 2 ? "#111" : "#fff"; c.fillRect(fx + k * sq - sq, y, sq, Math.min(sq, bot - y)); }
      c.fillStyle = "#f4f3ee"; c.fillRect(fx - 3, top - 110, 6, 110);
      c.fillStyle = "#c9302c"; c.fillRect(fx - 60, top - 128, 120, 24);
      c.fillStyle = "#fff"; c.font = "900 14px Nunito"; c.fillText("CHEGADA", fx, top - 111);
    }
  }

  function drawPatch(c, type, a, b, top, bot, laneH, n, t) {
    const w = b - a;
    c.save(); c.beginPath(); c.rect(a, top, w, bot - top); c.clip();
    if (type === "mud") {
      c.fillStyle = "#4a3020"; c.fillRect(a, top, w, bot - top);
      c.fillStyle = "rgba(30,18,10,.6)"; for (let k = 0; k < 18; k++) { c.beginPath(); c.ellipse(a + hash(k + a * .001) * w, top + hash(k * 3) * (bot - top), 10 + hash(k * 7) * 18, 4 + hash(k) * 5, 0, 0, TAU); c.fill(); }
      c.fillStyle = "rgba(255,255,255,.08)"; for (let k = 0; k < 10; k++) c.fillRect(a + hash(k * 11) * w, top + hash(k * 5) * (bot - top), 8, 2);
    } else if (type === "sand") {
      c.fillStyle = "#f0d197"; c.fillRect(a, top, w, bot - top);
      c.strokeStyle = "rgba(160,110,50,.35)"; c.lineWidth = 2;
      for (let y = top + 6; y < bot; y += 9) { c.beginPath(); for (let x = a; x <= b; x += 8) c.lineTo(x, y + Math.sin(x * .08 + y) * 2); c.stroke(); }
    } else if (type === "water") {
      c.fillStyle = "rgba(60,160,230,.75)"; c.fillRect(a, top, w, bot - top);
      c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 2;
      for (let k = 0; k < 14; k++) { const y = top + hash(k) * (bot - top), x = a + (hash(k * 3) * w + t * 20) % w; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 14, y); c.stroke(); }
    } else if (type === "ice") {
      const g = c.createLinearGradient(a, top, b, bot); g.addColorStop(0, "#bfe6ff"); g.addColorStop(1, "#e9f7ff"); c.fillStyle = g; c.fillRect(a, top, w, bot - top);
      c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 1.5; for (let k = 0; k < 12; k++) { const x = a + hash(k * 9) * w, y = top + hash(k * 4) * (bot - top); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 20, y + 8); c.stroke(); }
    } else if (type === "turbo") {
      c.fillStyle = "rgba(255,210,63,.22)"; c.fillRect(a, top, w, bot - top);
      c.fillStyle = "rgba(255,210,63,.9)";
      const sp = 34, shift = (t * 90) % sp;
      for (let i = 0; i < n; i++) { const yc = top + laneH * (i + .5); for (let x = a - sp + shift; x < b; x += sp) chevron(c, x, yc, Math.min(14, laneH * .25)); }
    }
    c.restore();
  }
  function chevron(c, x, y, s) { c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * .8, y); c.lineTo(x, y + s); c.lineTo(x + s * .45, y + s); c.lineTo(x + s * 1.25, y); c.lineTo(x + s * .45, y - s); c.closePath(); c.fill(); }

  function drawHurdle(c, x, gy, hl, th) {
    if (x < -50 || x > c.canvas.width + 50) return;
    const h = hl * .32, w = hl * .1;
    c.fillStyle = th.neon ? "#00f0ff" : "#3c7a3a";
    if (th.neon) { c.shadowColor = "#00f0ff"; c.shadowBlur = 12; }
    c.beginPath(); c.ellipse(x, gy - h * .18, w * 1.1, h * .25, 0, 0, TAU); c.fill(); // arbusto/base
    for (let k = 0; k < 3; k++) { c.fillStyle = th.neon ? (k % 2 ? "#ff4fd8" : "#00f0ff") : (k % 2 ? "#ffffff" : "#d93a3a"); c.fillRect(x - w, gy - h + k * h * .3, w * 2, h * .14); }
    c.fillStyle = "#f4f3ee"; c.fillRect(x - w - 3, gy - h - 4, 4, h + 4); c.fillRect(x + w - 1, gy - h - 4, 4, h + 4);
    c.shadowBlur = 0;
  }

  function drawFrontRail(c, L, th, camX, ppm) {
    const { W, bot } = L, sp = 2.5 * ppm * 1.15, off = (camX * 1.15 * ppm) % sp;
    c.strokeStyle = th.neon ? "#ff4fd8" : "#ffffff"; if (th.neon) { c.shadowColor = "#ff4fd8"; c.shadowBlur = 10; }
    c.lineWidth = 5; c.beginPath(); c.moveTo(0, bot - 6); c.lineTo(W, bot - 6); c.stroke();
    c.lineWidth = 4; for (let x = -off - sp; x < W + sp; x += sp) { c.beginPath(); c.moveTo(x, bot - 6); c.lineTo(x, bot + 10); c.stroke(); }
    c.shadowBlur = 0;
  }

  function drawParticlesLane(c, lane, sx, ly, dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; if (p.lane !== lane) continue;
      p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.vy += 160 * dt; p.dy += p.vy * dt; if (p.dy > 0) { p.dy = 0; p.vy *= -.3; }
      c.globalAlpha = clamp(p.life / p.max, 0, 1) * .85; c.fillStyle = p.c;
      c.beginPath(); c.arc(sx(p.x), ly + p.dy - 2, p.s, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  }

  function drawWeather(c, L, th, dt, t) {
    const { W, H } = L;
    if (!th.weather && !th.haze) return;
    if (th.weather === "snow" || th.weather === "rain") {
      while (wx.length < (th.weather === "snow" ? 120 : 160)) wx.push({ x: rand(0, W), y: rand(-H, H), s: rand(1, 3), v: th.weather === "snow" ? rand(30, 70) : rand(500, 800) });
      c.fillStyle = "rgba(255,255,255,.85)"; c.strokeStyle = "rgba(200,220,255,.45)"; c.lineWidth = 1;
      for (const p of wx) {
        p.y += p.v * dt; p.x -= (th.weather === "snow" ? 20 + Math.sin(t + p.s) * 15 : 120) * dt;
        if (p.y > H) { p.y = rand(-40, 0); p.x = rand(0, W + 100); } if (p.x < -10) p.x = W + 10;
        if (th.weather === "snow") { c.beginPath(); c.arc(p.x, p.y, p.s, 0, TAU); c.fill(); }
        else { c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - 4, p.y + 14); c.stroke(); }
      }
    }
    if (th.haze) { c.fillStyle = `rgba(255,220,150,${.05 + .03 * Math.sin(t * 2)})`; c.fillRect(0, L.horY - 30, W, 60); }
  }

  function drawConfetti(c, dt, H) {
    for (let i = confettiP.length - 1; i >= 0; i--) {
      const p = confettiP[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      if (p.life <= 0 || p.y > H + 20) { confettiP.splice(i, 1); continue; }
      c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore();
    }
  }

  function drawLabel(c, x, y, h, r, k, t) {
    const p = h.p, name = p.name;
    c.font = "900 13px Nunito, sans-serif";
    const w = Math.max(54, c.measureText(name).width + 22);
    c.fillStyle = "rgba(10,12,30,.72)"; roundRect(c, x - w / 2, y - 12, w, 22, 11); c.fill();
    c.fillStyle = p.color.hex; c.beginPath(); c.arc(x - w / 2 + 11, y - 1, 5, 0, TAU); c.fill();
    c.fillStyle = "#fff"; c.textAlign = "left"; c.fillText(name, x - w / 2 + 19, y + 4);
    c.textAlign = "center";
    if (h.human && champ && champ.ctrl === "skill") {
      c.fillStyle = "rgba(0,0,0,.45)"; c.fillRect(x - w / 2 + 4, y + 12, w - 8, 5);
      c.fillStyle = h.exT > 0 ? "#ff5d6c" : h.st < 25 ? "#ffb31f" : "#3ee08a"; c.fillRect(x - w / 2 + 4, y + 12, (w - 8) * clamp(h.st / 100, 0, 1), 5);
      // aviso de salto
      if (r.hm && h.nextH < r.hm.length && h.jumpFor !== h.nextH && h.v > .5 && !h.done) {
        const tt = (r.hm[h.nextH] - h.x) / h.v;
        if (tt < .7 && tt > .03) {
          const inPerf = tt >= .12 && tt <= .27, inWin = tt <= .45;
          c.font = "900 18px Bungee, Nunito, sans-serif";
          c.fillStyle = inPerf ? "#ffd23f" : inWin ? "#ffffff" : "rgba(255,255,255,.55)";
          c.save(); c.translate(x, y - 22); const s = inPerf ? 1.25 + .1 * Math.sin(t * 30) : 1; c.scale(s, s);
          c.lineWidth = 4; c.strokeStyle = "rgba(0,0,0,.6)"; c.strokeText("PULE!", 0, 0); c.fillText("PULE!", 0, 0); c.restore();
        }
      }
      if (h.falseStart && r.phase === "count") { c.font = "900 13px Nunito"; c.fillStyle = "#ff5d6c"; c.fillText("QUEIMOU!", x, y - 18); }
    }
    if (h.done && h.place) { c.font = "900 15px Bungee, Nunito"; c.fillStyle = h.place === 1 ? "#ffd23f" : "#fff"; c.fillText(h.place + "º", x + w / 2 + 14, y + 5); }
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  /* ----- cavalo (desenho procedural, unidades: corpo ≈ 100) ----- */
  function leg(c, hx, hy, a1, a2, l1, l2, w, col) {
    const kx = hx + Math.sin(a1) * l1, ky = hy + Math.cos(a1) * l1;
    const fx = kx + Math.sin(a2) * l2, fy = ky + Math.cos(a2) * l2;
    c.strokeStyle = col; c.lineCap = "round";
    c.lineWidth = w; c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.stroke();
    c.lineWidth = w * .62; c.beginPath(); c.moveTo(kx, ky); c.lineTo(fx, fy); c.stroke();
    c.fillStyle = "#1d1714"; c.beginPath(); c.ellipse(fx + 1.5, fy + 1, 4, 3, 0, 0, TAU); c.fill();
  }
  function legAngles(ph, off, front, P) {
    if (P.still) return front ? [.05, 0] : [-.05, .05];
    if (P.air >= 0) return front ? [1.0, -1.2] : [-.75, .5];
    const a = ph + off * TAU, s = Math.sin(a), lift = Math.max(0, Math.cos(a));
    return front ? [.12 + .62 * s, .12 + .62 * s - 1.25 * lift] : [-.08 + .55 * s, -.08 + .55 * s + 1.0 * lift];
  }
  function drawHorse(c, x, gy, k, P, t) {
    const ph = P.phase * TAU;
    const lift = P.air >= 0 ? Math.sin(Math.PI * P.air) * 34 : 0;
    // sombra
    c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.ellipse(x, gy + 1, 44 * k * (1 - lift / 110), 6 * k, 0, 0, TAU); c.fill();
    c.save(); c.translate(x, gy); c.scale(k, k);
    let bob = P.still ? 0 : -Math.abs(Math.sin(ph)) * 4, pitch = P.still ? 0 : Math.sin(ph) * .045;
    if (P.air >= 0) { bob = -lift; pitch = -(.5 - P.air) * .5; }
    if (P.stum) { bob = 5; pitch = .3; }
    c.translate(0, bob - 58); c.rotate(pitch); c.translate(0, 58);
    const coat = P.coat, far = shade(coat, -.35), mane = P.mane;
    const front = [[22, -50, 0], [15, -50, .12]], hind = [[-22, -52, .5], [-28, -52, .62]];
    // pernas do lado de lá
    let aa = legAngles(ph, front[1][2], true, P); leg(c, front[1][0], front[1][1], aa[0], aa[1], 24, 26, 9, far);
    aa = legAngles(ph, hind[1][2], false, P); leg(c, hind[1][0], hind[1][1], aa[0], aa[1], 25, 26, 11, far);
    // cauda
    const wv = Math.sin(ph * 2 + t * 3) * 5 + (P.air >= 0 ? -6 : 0);
    c.fillStyle = mane; c.beginPath(); c.moveTo(-36, -66); c.quadraticCurveTo(-56, -70 + wv, -68, -46 + wv * 1.4); c.quadraticCurveTo(-54, -52 + wv * .5, -36, -56); c.closePath(); c.fill();
    // corpo
    const g = c.createLinearGradient(0, -76, 0, -38); g.addColorStop(0, shade(coat, .12)); g.addColorStop(1, shade(coat, -.18));
    c.fillStyle = g; c.strokeStyle = "rgba(0,0,0,.35)"; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(-36, -64); c.bezierCurveTo(-22, -76, 12, -74, 26, -70); c.bezierCurveTo(40, -66, 42, -50, 33, -44);
    c.bezierCurveTo(16, -36, -16, -38, -32, -44); c.bezierCurveTo(-44, -48, -45, -60, -36, -64); c.closePath(); c.fill(); c.stroke();
    // pescoço e cabeça
    c.beginPath(); c.moveTo(18, -68); c.bezierCurveTo(26, -84, 34, -96, 42, -104); c.lineTo(50, -100); c.bezierCurveTo(46, -86, 42, -70, 38, -52); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(40, -104); c.lineTo(50, -106); c.quadraticCurveTo(62, -98, 69, -88); c.quadraticCurveTo(70, -82, 65, -81); c.quadraticCurveTo(56, -84, 47, -88); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = shade(coat, -.25); c.beginPath(); c.moveTo(43, -104); c.lineTo(45, -113); c.lineTo(49, -105); c.fill();
    c.fillStyle = "#111"; c.beginPath(); c.arc(52, -99, 1.8, 0, TAU); c.fill();
    c.beginPath(); c.arc(66, -85, 1.2, 0, TAU); c.fill();
    // crina
    c.fillStyle = mane; c.beginPath(); c.moveTo(42, -105); c.quadraticCurveTo(30, -96 + Math.sin(ph) * 2, 18, -70); c.lineTo(24, -70); c.quadraticCurveTo(34, -90, 46, -102); c.closePath(); c.fill();
    // manta com número
    c.fillStyle = P.silk; c.fillRect(-14, -74, 26, 16); c.fillStyle = "#fff"; c.font = "900 11px Nunito, sans-serif"; c.textAlign = "center"; c.fillText(String(P.num), -1, -62);
    // pernas do lado de cá
    aa = legAngles(ph, front[0][2], true, P); leg(c, front[0][0], front[0][1], aa[0], aa[1], 24, 26, 10, coat);
    aa = legAngles(ph, hind[0][2], false, P); leg(c, hind[0][0], hind[0][1], aa[0], aa[1], 25, 26, 12, coat);
    // jóquei
    const jb = P.still ? 0 : Math.sin(ph * 2) * 1.5;
    c.save(); c.translate(0, jb);
    c.strokeStyle = "#f4f1ea"; c.lineCap = "round"; c.lineWidth = 6; c.beginPath(); c.moveTo(-2, -78); c.lineTo(11, -74); c.lineTo(5, -64); c.stroke();
    c.fillStyle = "#1d1714"; c.beginPath(); c.ellipse(6, -63, 4, 2.5, 0, 0, TAU); c.fill();
    c.fillStyle = P.silk; c.beginPath(); c.moveTo(-6, -80); c.lineTo(2, -88); c.lineTo(20, -98); c.lineTo(24, -90); c.lineTo(8, -76); c.closePath(); c.fill();
    c.fillStyle = "rgba(255,255,255,.75)"; c.beginPath(); c.moveTo(4, -86); c.lineTo(14, -93); c.lineTo(16, -89); c.lineTo(6, -82); c.closePath(); c.fill();
    c.strokeStyle = P.silk; c.lineWidth = 4.5;
    if (P.whip) { c.beginPath(); c.moveTo(18, -95); c.lineTo(8, -108); c.lineTo(-4, -102); c.stroke(); c.strokeStyle = "#3b2a1c"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-4, -102); c.lineTo(-22, -84); c.stroke(); }
    else { c.beginPath(); c.moveTo(18, -95); c.lineTo(30, -90); c.lineTo(38, -92); c.stroke(); c.strokeStyle = "rgba(40,25,15,.8)"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(38, -92); c.lineTo(62, -88); c.stroke(); }
    c.fillStyle = "#f1c9a5"; c.beginPath(); c.arc(27, -101, 4, 0, TAU); c.fill();
    c.fillStyle = P.silk; c.beginPath(); c.arc(25, -104, 6.5, Math.PI * .9, Math.PI * 2.15); c.fill();
    c.fillStyle = "rgba(0,0,0,.6)"; c.fillRect(25, -105, 8, 2);
    c.restore();
    if (P.boost) { c.strokeStyle = hexA(P.silk, .7); c.lineWidth = 3; for (let i = 0; i < 4; i++) { const yy = -90 + i * 12; c.beginPath(); c.moveTo(-50 - i * 6, yy); c.lineTo(-80 - i * 8 - Math.random() * 10, yy); c.stroke(); } }
    c.restore();
  }

  /* ---------------- prévia da pista ---------------- */
  function drawPreview(canvas, track) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), r = canvas.getBoundingClientRect();
    if (!r.width) return;
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    const c = canvas.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const th = THEMES[track.theme], L = { W: r.width, H: r.height, horY: r.height * .55, top: r.height * .8, bot: r.height, laneH: r.height * .2, n: 1 };
    drawScenery(c, L, th, 3 + Math.random() * 20, 0, .3);
    const g = c.createLinearGradient(0, L.top, 0, L.bot); g.addColorStop(0, th.track[1]); g.addColorStop(1, th.track[0]);
    c.fillStyle = g; c.fillRect(0, L.top, L.W, L.bot - L.top);
    const sh = c.createLinearGradient(0, 0, L.W, 0); sh.addColorStop(0, "rgba(0,0,0,.65)"); sh.addColorStop(.7, "rgba(0,0,0,.1)"); sh.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = sh; c.fillRect(0, 0, L.W, L.H);
  }

  /* ---------------- replay ---------------- */
  function startReplay() {
    if (!champ.lastRace) return;
    const r = champ.lastRace;
    replay = { r, i: 0, t: 0, hs: r.horses.map(h => ({ p: h.p, lane: h.lane, human: false, x: 0, phase: 0, air: -1, done: false, place: 0, st: 100 })) };
    parts = []; wx = []; confettiP = []; cam.x = -8; cam.vw = 20;
    show("race"); NARR.reset();
    $("#hud-track").textContent = r.track.name + " · replay"; $("#hud-dist").textContent = r.len + " m";
    race = null; buildProgressFor(r); $("#pads").hidden = true; $("#skip-btn").hidden = false; $("#skip-btn").textContent = "Voltar ⏭";
    sizeCanvas(); lastNow = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function buildProgressFor(r) {
    $("#progress").innerHTML = `<span class="flag">🏁</span>` + r.hm.map(m => `<i class="hmark" style="left:${m / r.len * 96 + 2}%"></i>`).join("") +
      r.horses.map(h => `<i class="pdot" style="--c:${h.p.color.hex}" data-l="${h.lane}"></i>`).join("");
  }
  function replayFrame(dt) {
    const R = replay, r = R.r, rec = r.rec;
    R.t += dt;
    while (R.i < rec.length - 2 && rec[R.i + 1].t < R.t) R.i++;
    const a = rec[R.i], b = rec[Math.min(R.i + 1, rec.length - 1)], f = b.t > a.t ? clamp((R.t - a.t) / (b.t - a.t), 0, 1) : 1;
    R.hs.forEach((h, j) => {
      const A = a.h[j], B = b.h[j];
      h.x = lerp(A[0], B[0], f); h.phase = B[1]; h.air = B[2]; h.jump = null; h.stum = !!B[3]; h.boost = !!B[4]; h.st = B[5]; h.whipAnim = B[7] ? .1 : 0; h.v = 5;
      const src = r.horses[j]; h.done = h.x >= r.len; h.place = h.done ? src.place : 0;
    });
    const fake = { track: r.track, len: r.len, hm: [], patches: r.patches, phase: "run", horses: R.hs };
    fake.hm = r.hm;
    updateCam(R.hs, dt); render(fake, R.hs, dt); updateHUD(R.hs, R.t);
    if (R.t > rec[rec.length - 1].t + 1.5) { replay = null; cancelAnimationFrame(raf); show("result"); }
  }

  /* ---------------- resultado da corrida ---------------- */
  function finishRace() {
    const r = race; cancelAnimationFrame(raf); AU.crowdStop();
    const order = r.horses.slice().sort((a, b) => a.time - b.time);
    order.forEach((h, i) => h.place = i + 1);
    const n = order.length, mode = champ.mode;
    const recs = store.get("records", {}); let newRec = null;
    const lines = [];
    order.forEach((h, i) => {
      const p = h.p, st = p.st;
      st.pos[i]++; if (i === 0) st.wins++; if (i === n - 1) st.last++;
      st.stumbles += h.stats.stumbles; st.perfect += h.stats.perfect; st.whips += h.stats.whips;
      if (!st.best || h.time < st.best) st.best = h.time;
      if (mode === "fun") p.points += POINTS[i] || 0;
      else { const pz = PRIZES[i] || 0; p.coins += pz; st.prizes += pz; h.prize = pz; }
    });
    const w = order[0];
    if (!recs[r.track.id] || w.time < recs[r.track.id].time) { recs[r.track.id] = { time: w.time, name: w.p.name, color: w.p.color.id }; newRec = w; store.set("records", recs); }
    if (mode === "bet") {
      champ.players.forEach(p => {
        const b = pre.bets.get(p); if (!b || !b.amt) return;
        const won = b.horse === w.p, odd = pre.odds.get(b.horse);
        const delta = won ? Math.round(b.amt * (odd - 1)) : -b.amt;
        p.coins += delta;
        if (delta > 0) { p.st.betWon += delta; p.st.bestBet = Math.max(p.st.bestBet, delta); } else p.st.betLost += -delta;
        lines.push({ p, b, won, delta, odd });
      });
    }
    champ.history.push({ track: r.track.id, order: order.map(h => h.p.idx) });
    champ.lastRace = r; champ.lastOrder = order; champ.lastLines = lines; champ.newRec = newRec;
    champ.raceNo++;
    race = null;
    renderResult();
    show("result");
    if (order[0].p.human) AU.fanfare(); else AU.cheer(1.5);
  }

  function renderResult() {
    const order = champ.lastOrder, r = champ.lastRace, w = order[0], gapTxt = order[1] ? order[1].time - w.time : 0;
    $("#result-head").innerHTML = `<div class="rh-tag">${esc(r.track.name)} · ${r.len} m</div>
      <h2 style="color:${w.p.color.hex}">${esc(w.p.name)} venceu!</h2>
      <p>${esc(w.p.color.horse)} cruzou em ${fmtT(w.time)}${order[1] ? `, ${gapTxt < .05 ? "por um focinho" : gapTxt.toFixed(2).replace(".", ",") + " s"} à frente de ${esc(order[1].p.name)}` : ""}.${champ.newRec === w ? " 🏅 <b>Novo recorde da pista!</b>" : ""}</p>`;
    $("#finish").innerHTML = order.map((h, i) => {
      const s = h.stats, ic = [];
      if (s.perfect) ic.push(`🦘${s.perfect}`); if (s.stumbles) ic.push(`💥${s.stumbles}`); if (h.falseStart) ic.push("🚦queimou");
      if (h.human && s.whips) ic.push(`🏇${s.whips}`);
      return `<li style="--c:${h.p.color.hex};animation-delay:${i * .08}s"><span class="pos">${i + 1}º</span><span class="sw"></span>
        <span class="nm"><b>${esc(h.p.name)}</b><small>${esc(h.p.color.horse)} ${ic.join(" ")}</small></span>
        <span class="tm">${fmtT(h.time)}<small>${i ? "+" + (h.time - w.time).toFixed(2).replace(".", ",") : "vencedor"}</small></span></li>`;
    }).join("");
    const mrows = [];
    if (champ.mode === "bet") {
      order.forEach(h => { if (h.prize) mrows.push(`<div class="mrow"><span>💵 ${esc(h.p.name)} <small>prêmio de ${h.place}º lugar</small></span><span class="up">${signed(h.prize)}</span></div>`); });
      champ.lastLines.forEach(l => mrows.push(`<div class="mrow"><span>${l.won ? "🎉" : "🎟️"} ${esc(l.p.name)} <small>apostou ${money(l.b.amt)} no ${esc(l.b.horse.color.name)} (${l.odd.toFixed(1).replace(".", ",")}x)</small></span><span class="${l.delta >= 0 ? "up" : "down"}">${signed(l.delta)}</span></div>`));
      if (mrows.length) AU.coin();
    }
    $("#money").innerHTML = mrows.join("");
    renderStandings();
    const last = champ.raceNo >= champ.len;
    $("#res-next").textContent = last ? (champ.len > 1 ? "Ver o campeão 🏆" : "Ver resultado 🏆") : "Próxima corrida ▶";
    $("#res-end").hidden = last;
  }
  function standingsSorted() {
    const key = champ.mode === "bet" ? p => p.coins : p => p.points;
    return champ.players.slice().sort((a, b) => key(b) - key(a) || b.st.wins - a.st.wins || a.st.last - b.st.last);
  }
  function renderStandings() {
    const s = standingsSorted(), key = champ.mode === "bet" ? p => p.coins : p => p.points;
    const max = Math.max(1, ...s.map(key));
    $("#standings").innerHTML = s.map((p, i) => `<div class="stand" style="--c:${p.color.hex}"><span class="bar" style="width:${Math.max(2, key(p) / max * 100)}%"></span>
      <span class="p">${i + 1}º</span><span class="pl" style="--c:${p.color.hex}"><i></i>${esc(p.name)}</span><span class="v">${champ.mode === "bet" ? money(p.coins) : p.points + " pts"}</span></div>`).join("");
  }
  $("#res-next").addEventListener("click", () => { AU.click(); if (champ.raceNo >= champ.len) showFinal(); else enterPre(); });
  $("#res-replay").addEventListener("click", () => { AU.click(); startReplay(); });
  $("#res-end").addEventListener("click", () => confirmBox("Encerrar o campeonato agora?", "Vamos direto para o placar final.", showFinal));

  /* ---------------- fim de campeonato ---------------- */
  function idiotScore(p) { return p.st.last * 3 + p.st.stumbles + p.st.falseStarts * 2 + (champ.mode === "bet" ? Math.floor(p.st.betLost / 100) : 0); }
  function showFinal() {
    stopRace();
    const s = standingsSorted(), champP = s[0], bet = champ.mode === "bet";
    const humanWon = champP.human;
    $("#final-title").innerHTML = `<span style="color:${champP.color.hex}">${esc(champP.name)}</span> é ${champ.len > 1 ? "campeão" : "o vencedor"}!`;
    $("#final-sub").textContent = `${champ.raceNo} ${champ.raceNo === 1 ? "corrida disputada" : "corridas disputadas"} · ${bet ? "terminou com " + money(champP.coins) : champP.points + " pontos"}`;
    const podOrder = s.length >= 3 ? [1, 0, 2] : s.length === 2 ? [1, 0] : [0];
    const hts = [120, 170, 90];
    $("#podium").innerHTML = podOrder.map((i, k) => {
      const p = s[i]; if (!p) return "";
      return `<div class="pod" style="--c:${p.color.hex};animation-delay:${k * .15}s"><div class="ava">${i === 0 ? "👑" : "🐴"}</div><b>${esc(p.name)}</b><small>${bet ? money(p.coins) : p.points + " pts"}</small><div class="step" style="height:${hts[i === 0 ? 1 : i === 1 ? 0 : 2]}px">${i + 1}º</div></div>`;
    }).join("");
    // prêmios
    const P = champ.players, aw = [];
    const top = (f, min) => { const best = P.slice().sort((a, b) => f(b) - f(a))[0]; return f(best) > (min || 0) ? best : null; };
    const idiot = P.slice().sort((a, b) => idiotScore(b) - idiotScore(a) || b.st.last - a.st.last)[0];
    aw.push({ i: "🏆", h: "Campeão", p: champP, d: bet ? money(champP.coins) : champP.points + " pontos" });
    if (idiotScore(idiot) > 0) aw.push({ i: "🤡", h: "O Idiota", p: idiot, d: `${idiotScore(idiot)} ${idiotScore(idiot) === 1 ? "ponto" : "pontos"} de idiota`, cls: "idiot" });
    const wins = top(p => p.st.wins); if (wins) aw.push({ i: "⚡", h: "Mais vitórias", p: wins, d: wins.st.wins + (wins.st.wins === 1 ? " vitória" : " vitórias") });
    const jumper = top(p => p.st.perfect); if (jumper) aw.push({ i: "🦘", h: "Rei do salto", p: jumper, d: jumper.st.perfect + (jumper.st.perfect === 1 ? " salto perfeito" : " saltos perfeitos") });
    const whip = top(p => p.human ? p.st.whips : 0); if (whip) aw.push({ i: "🏇", h: "Mão pesada", p: whip, d: whip.st.whips + (whip.st.whips === 1 ? " chicotada" : " chicotadas") });
    if (bet) {
      const lucky = top(p => p.st.bestBet); if (lucky) aw.push({ i: "💸", h: "Aposta de ouro", p: lucky, d: "ganhou " + money(lucky.st.bestBet) + " numa só" });
      const cold = top(p => p.st.betLost); if (cold) aw.push({ i: "🥶", h: "Pé-frio", p: cold, d: "perdeu " + money(cold.st.betLost) + " em apostas" });
    }
    const fast = P.filter(p => p.st.best).sort((a, b) => a.st.best - b.st.best)[0];
    const burner = top(p => p.st.falseStarts); if (burner) aw.push({ i: "🚦", h: "Ansioso", p: burner, d: burner.st.falseStarts + (burner.st.falseStarts === 1 ? " largada queimada" : " largadas queimadas") });
    $("#awards").innerHTML = aw.map(a => `<div class="award ${a.cls || ""}" style="--c:${a.p.color.hex}"><span class="ai">${a.i}</span><h4>${a.h}</h4><b>${esc(a.p.name)}</b><small>${a.d}</small></div>`).join("");
    // tabela
    const pos = (p, k) => p.st.pos[k] || 0;
    $("#stats-table").innerHTML = `<tr><th>Jogador</th><th>Vitórias</th><th>Pódios</th><th>Últimos</th><th>🦘 Perfeitos</th><th>💥 Tropeços</th><th>🚦 Queimadas</th>${bet ? "<th>Prêmios</th><th>Apostas</th>" : ""}<th>${bet ? "Saldo" : "Pontos"}</th><th>Idiota</th></tr>` +
      s.map(p => `<tr><td><span class="pl" style="--c:${p.color.hex}"><i></i>${esc(p.name)}</span></td><td>${p.st.wins}</td><td>${pos(p, 0) + pos(p, 1) + pos(p, 2)}</td><td>${p.st.last}</td><td>${p.st.perfect}</td><td>${p.st.stumbles}</td><td>${p.st.falseStarts}</td>
        ${bet ? `<td>${money(p.st.prizes)}</td><td class="${p.st.betWon - p.st.betLost >= 0 ? "up" : "down"}">${signed(p.st.betWon - p.st.betLost)}</td>` : ""}<td><b>${bet ? money(p.coins) : p.points}</b></td><td>${idiotScore(p)}</td></tr>`).join("");
    show("final");
    if (fast) { /* reservado para estatística futura */ }
    if (humanWon) { AU.fanfare(); setTimeout(() => AU.cheer(3), 600); } else AU.sad();
    bgAnim.confetti = humanWon || s.some(p => p.human) ? 1 : 0;
  }
  $("#final-again").addEventListener("click", () => { AU.click(); startChamp(champ.cfgCopy); });
  $("#final-menu").addEventListener("click", goMenu);

  /* ---------------- fundo animado do menu ---------------- */
  const bgAnim = { active: true, confetti: 0 };
  (function bgLoop() {
    const c = $("#bg"), g = c.getContext("2d");
    const runners = COLORS.map((col, i) => ({ col, x: -i * 160 - rand(0, 80), sp: rand(70, 110), ph: Math.random() }));
    let last = performance.now();
    function fit() { const d = Math.min(2, window.devicePixelRatio || 1); c.width = innerWidth * d; c.height = innerHeight * d; g.setTransform(d, 0, 0, d, 0, 0); }
    fit(); window.addEventListener("resize", fit);
    (function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (!bgAnim.active) return;
      const W = innerWidth, H = innerHeight, t = now / 1000;
      g.clearRect(0, 0, W, H);
      // pista estilizada no rodapé
      const gy = H - 24;
      g.fillStyle = "rgba(255,255,255,.05)"; g.fillRect(0, gy - 6, W, 30);
      g.strokeStyle = "rgba(255,255,255,.08)"; g.lineWidth = 2; g.setLineDash([16, 14]); g.lineDashOffset = -t * 120; g.beginPath(); g.moveTo(0, gy); g.lineTo(W, gy); g.stroke(); g.setLineDash([]);
      runners.forEach((r, i) => {
        r.x += r.sp * dt; r.ph = (r.ph + r.sp * dt / 80) % 1;
        if (r.x > W + 120) { r.x = -140 - rand(0, 300); r.sp = rand(70, 120); }
        g.globalAlpha = .55;
        drawHorse(g, r.x, gy - 2 - (i % 3) * 3, .6, { phase: r.ph, coat: r.col.coat, mane: r.col.mane, silk: r.col.hex, num: i + 1, air: -1 }, t);
        g.globalAlpha = 1;
      });
    })(last);
  })();

  // depuração / testes automatizados
  window.__cdc = { TRACKS, get race() { return race; }, get champ() { return champ; }, step, newRace };
})();
