(function () {
  "use strict";
  const { Game, SKINS, LEVELS, weaponForTier, clamp } = Gipfelsprung;
  const $ = id => document.getElementById(id);
  const staticMode = document.querySelector('meta[name="gipfelsprung-mode"]')?.content === "static";
  const canvas = $("game-canvas");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const keys = new Set();
  const cheatKeys = new Set();
  const controlKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD", "KeyW", "KeyF", "KeyQ", "KeyB"]);
  let overlayAction = null;
  let overlaySecondary = null;
  let toastTimer = 0;
  let lastTime = 0;
  let accumulator = 0;
  let lastCountdown = "";
  let lastHud = "";
  let currentRun = null;
  let scoreRequest = 0;
  const pendingScores = new Map();

  function renderScores(scores) {
    if (!Array.isArray(scores)) throw new Error("Der Server hat keine gültige Bestenliste geliefert.");
    $("leaderboard-rows").replaceChildren();
    scores.forEach((score, index) => {
      const row = document.createElement("tr");
      const values = [String(index + 1).padStart(2, "0"), score.name, String(score.coins),
        score.completed ? "Gipfelsieg · 5/5" : `Game over · Welt ${score.level}/5`];
      for (const value of values) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }
      $("leaderboard-rows").append(row);
    });
    $("leaderboard-table-wrap").hidden = scores.length === 0;
    $("leaderboard-empty").hidden = scores.length !== 0;
  }
  async function scoreResponse(response) {
    if (!response.ok) throw new Error(`Bestenlisten-Server meldet Fehler ${response.status}.`);
    return response.json();
  }
  async function loadScores() {
    if (staticMode) return;
    const request = ++scoreRequest;
    $("leaderboard-status").classList.remove("leaderboard-error");
    $("leaderboard-status").textContent = "Bestenliste wird geladen …";
    try {
      if (location.protocol === "file:") throw new Error("Für die zentrale Bestenliste bitte das Spiel über Spiel-starten.cmd starten.");
      const data = await scoreResponse(await fetch("/api/scores", { cache: "no-store" }));
      if (request !== scoreRequest) return;
      renderScores(data.scores);
      $("leaderboard-status").textContent = "Nach Münzen sortiert · auf diesem Spielserver gespeichert.";
    } catch (error) {
      if (request !== scoreRequest) return;
      console.error("Bestenliste konnte nicht geladen werden.", error);
      $("leaderboard-status").classList.add("leaderboard-error");
      $("leaderboard-status").textContent = "Bestenliste nicht verfügbar: " + error.message;
    }
  }
  function updateScoreFeedback() {
    if (staticMode) {
      const ended = ["gameover", "victory"].includes(game.state);
      $("overlay-score-status").hidden = !ended;
      $("overlay-score-status").textContent = "Online-Version: Dein Ergebnis wird nicht gespeichert.";
      $("overlay-retry-score").hidden = true;
      return;
    }
    const entries = [...pendingScores.values()];
    const failed = entries.filter(entry => entry.status === "failed");
    $("retry-scores").hidden = failed.length === 0;
    $("score-save-status").classList.toggle("leaderboard-error", failed.length > 0);
    $("score-save-status").textContent = failed.length
      ? `${failed.length} Ergebnis(se) noch nicht gespeichert. ${failed[0].error} Bitte erneut versuchen.`
      : entries.length ? "Ergebnis wird auf dem Spielserver gespeichert …"
        : "Ergebnisse werden nach Game-over oder Gipfelsieg gespeichert.";
    const ended = ["gameover", "victory"].includes(game.state);
    const entry = currentRun && pendingScores.get(currentRun.id);
    $("overlay-score-status").hidden = !ended;
    $("overlay-retry-score").hidden = !ended || entry?.status !== "failed";
    if (ended) {
      $("overlay-score-status").textContent = currentRun.saved
        ? "Dein Münzrekord ist auf dem Spielserver gespeichert."
        : entry?.status === "failed" ? "Nicht gespeichert: " + entry.error
          : "Dein Münzrekord wird gespeichert …";
      $("overlay-score-status").classList.toggle("leaderboard-error", entry?.status === "failed");
    }
  }
  async function saveScore(entry) {
    if (entry.status === "saving") return;
    entry.status = "saving";
    updateScoreFeedback();
    try {
      if (location.protocol === "file:") throw new Error("Bitte den lokalen Spielserver starten.");
      await scoreResponse(await fetch("/api/scores", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry.score)
      }));
      pendingScores.delete(entry.score.id);
      if (currentRun?.id === entry.score.id) currentRun.saved = true;
      void loadScores();
    } catch (error) {
      console.error("Münzrekord konnte nicht gespeichert werden.", error);
      entry.status = "failed";
      entry.error = error.message;
    }
    updateScoreFeedback();
  }
  function saveRun() {
    if (staticMode) { updateScoreFeedback(); return; }
    if (!currentRun || currentRun.saved || pendingScores.has(currentRun.id)) return;
    const entry = {
      score: { id: currentRun.id, name: currentRun.name, coins: game.coins, skin: game.skinIndex,
        level: game.levelIndex + 1, completed: game.state === "victory" },
      status: "pending", error: ""
    };
    pendingScores.set(currentRun.id, entry);
    void saveScore(entry);
  }
  function retryScores() {
    for (const entry of pendingScores.values()) if (entry.status === "failed") void saveScore(entry);
  }

  function notice(message) {
    $("notice").textContent = message;
    $("notice").hidden = false;
  }
  class Sound {
    constructor() {
      this.muted = false;
      this.context = null;
      this.nextNote = 0;
      this.note = 0;
      this.failed = false;
      this.melody = [60, 64, 67, 72, 69, 67, 64, 62, 60, 64, 67, 69, 67, 64, 62, 55];
    }
    async activate() {
      if (this.failed) return;
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) {
        this.failed = true;
        notice("Dieser Browser unterstützt kein Spielaudio. Du kannst weiterhin ohne Ton spielen.");
        return;
      }
      try {
        if (!this.context) this.context = new Audio();
        if (this.context.state === "suspended") await this.context.resume();
      } catch (error) {
        this.failed = true;
        console.error("Spielaudio konnte nicht gestartet werden.", error);
        notice("Spielaudio konnte nicht gestartet werden. Prüfe die Audiofreigabe deines Browsers. Das Spiel bleibt ohne Ton spielbar.");
      }
    }
    tone(frequency, duration = .1, type = "square", volume = .025, slide = 0) {
      if (this.muted || !this.context || this.context.state !== "running") return;
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      oscillator.connect(gain); gain.connect(this.context.destination);
      oscillator.start(now); oscillator.stop(now + duration);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }
    effect(type) {
      const effects = {
        coin: [880, .1, "sine", .055, 400], jump: [240, .13, "square", .024, 220],
        stomp: [180, .12, "triangle", .065, -100], hurt: [180, .3, "sawtooth", .035, -120],
        shoot: [530, .075, "triangle", .032, -300], weapon: [660, .35, "sine", .055, 660],
        levelComplete: [520, .65, "triangle", .055, 520], victory: [660, 1, "triangle", .06, 660],
        gameover: [220, .8, "triangle", .06, -160], bossHit: [130, .13, "square", .025, -50],
        quake: [65, .35, "triangle", .07, -30], bossDefeated: [330, .7, "triangle", .06, 660],
        ammo: [420, .18, "triangle", .04, 260], emptyAmmo: [95, .06, "triangle", .025, -20],
        bombPickup: [740, .3, "sine", .045, 500], bombThrow: [260, .15, "triangle", .035, -100],
        bombExplosion: [80, .45, "sawtooth", .04, -45]
      };
      if (effects[type]) this.tone(...effects[type]);
    }
    music(dt, playing) {
      if (!playing || this.muted) { this.nextNote = 0; return; }
      this.nextNote -= dt;
      if (this.nextNote > 0) return;
      this.nextNote = .31;
      const midi = this.melody[this.note % this.melody.length] + (game.levelIndex === 4 ? -12 : 0);
      this.tone(440 * 2 ** ((midi - 69) / 12), .24, "triangle", .017);
      if (this.note % 4 === 0) this.tone(440 * 2 ** ((midi - 24 - 69) / 12), .28, "sine", .025);
      this.note++;
    }
  }
  const sound = new Sound();
  function toast(message) {
    $("toast").textContent = message;
    $("toast").hidden = false;
    toastTimer = 3.6;
  }
  function hideOverlay() {
    $("game-overlay").hidden = true;
    overlayAction = null;
    overlaySecondary = null;
  }
  function showOverlay({ eyebrow, title, text = "", primary, action, secondary, secondaryAction, countdown = false }) {
    $("overlay-eyebrow").textContent = eyebrow;
    $("overlay-title").textContent = title;
    $("overlay-text").textContent = text;
    $("overlay-primary").hidden = !primary;
    $("overlay-primary").textContent = primary || "";
    $("overlay-secondary").hidden = !secondary;
    $("overlay-secondary").textContent = secondary || "";
    $("overlay-score-status").hidden = true;
    $("overlay-retry-score").hidden = true;
    $("game-overlay").classList.toggle("countdown", countdown);
    $("game-overlay").hidden = false;
    overlayAction = action || null;
    overlaySecondary = secondaryAction || null;
    if (primary) $("overlay-primary").focus({ preventScroll: true });
  }
  function start(skinIndex) {
    const input = $("player-name");
    input.setCustomValidity("");
    const name = input.value.trim();
    if (!name || name.length > 24 || /[\u0000-\u001f\u007f-\u009f]/.test(name)) {
      input.setCustomValidity("Bitte gib einen Spielernamen mit 1 bis 24 Zeichen ohne Steuerzeichen ein.");
      input.reportValidity();
      input.focus();
      return;
    }
    input.value = name;
    currentRun = { id: crypto.randomUUID(), name, saved: false };
    void sound.activate();
    keys.clear();
    cheatKeys.clear();
    lastCountdown = "";
    lastHud = "";
    $("menu-screen").hidden = true;
    $("play-screen").hidden = false;
    document.body.classList.add("playing");
    $("toast").hidden = true;
    toastTimer = 0;
    game.start(skinIndex);
    updateScoreFeedback();
    $("play-screen").scrollIntoView({ behavior: "instant", block: "start" });
    canvas.focus({ preventScroll: true });
  }
  function menu() {
    const focusSkin = game.skinIndex;
    game.state = "menu";
    keys.clear();
    hideOverlay();
    $("play-screen").hidden = true;
    $("menu-screen").hidden = false;
    document.body.classList.remove("playing");
    document.querySelector(`[data-skin="${focusSkin}"]`).focus({ preventScroll: true });
    $("abenteurer").scrollIntoView({ behavior: "instant", block: "center" });
  }
  function confirmMenu() {
    if (["playing", "countdown"].includes(game.state)) game.pause();
    showOverlay({
      eyebrow: "ZURÜCK ZUR FIGURENAUSWAHL?", title: "Neuer Anlauf?",
      text: "Dein laufendes Abenteuer wird beendet. Mit der nächsten Figur startest du wieder mit drei Leben in St. Gallen.",
      primary: "Figur wechseln", action: menu, secondary: "Weiterspielen",
      secondaryAction: () => { if (game.state === "paused") game.resume(); else updateStateOverlay(); }
    });
  }
  function updateStateOverlay() {
    lastCountdown = "";
    const heartText = game.levelHeart ? "+1 Herz für deine geschaffte Welt!" : "Alle drei Herzen sind voll.";
    if (game.state === "playing") {
      hideOverlay();
      canvas.focus({ preventScroll: true });
    } else if (game.state === "paused") {
      showOverlay({ eyebrow: "KURZ DURCHATMEN", title: "Bergpause.", text: "Dein Abenteuer wartet genau hier auf dich.", primary: "Weiterspielen", action: () => { void sound.activate(); game.resume(); }, secondary: "Figur wechseln", secondaryAction: confirmMenu });
    } else if (game.state === "gameover") {
      showOverlay({ eyebrow: "DREI LEBEN. VIELE GUTE SPRÜNGE.", title: "GAME OVER", text: `${game.coins} Münzen gesammelt. Jeder neue Versuch beginnt in St. Gallen – mit drei frischen Leben.`, primary: "Neustart · Level 1", action: () => start(game.skinIndex), secondary: "Figur wechseln", secondaryAction: menu });
    } else if (game.state === "levelComplete") {
      showOverlay({ eyebrow: "WELT " + String(game.levelIndex + 1).padStart(2, "0") + " GESCHAFFT", title: "Guet gmacht!", text: `${heartText} ${LEVELS[game.levelIndex + 1].name} wartet. Deine ${game.coins} Münzen, Waffen, ${game.ammo} Schüsse, ${game.bombs} Bomben und ${game.lives} Leben reisen mit.`, primary: "Weiter nach " + LEVELS[game.levelIndex + 1].name, action: () => { void sound.activate(); keys.clear(); game.nextLevel(); canvas.focus({ preventScroll: true }); } });
    } else if (game.state === "victory") {
      showOverlay({ eyebrow: "FÜNF WELTEN. EIN ECHTES GIPFELGEFÜHL.", title: "Gipfel geschafft!", text: `Der Nebelwächter ist besiegt! ${currentRun.name} hat als ${SKINS[game.skinIndex].name} die Schweiz mit ${game.coins} Münzen durchquert. ${heartText}`, primary: "Noch ein Abenteuer", action: () => start(game.skinIndex), secondary: "Figur wechseln", secondaryAction: menu });
    }
  }
  function onEvent(event) {
    sound.effect(event.type);
    if (event.type === "level") {
      $("level-name").textContent = LEVELS[event.index].name;
      $("level-number").textContent = `WELT ${String(event.index + 1).padStart(2, "0")} / 05`;
      $("level-hint").textContent = LEVELS[event.index].hint;
      $("player-label").textContent = `${currentRun.name} · ${SKINS[game.skinIndex].name.toUpperCase()} · ${String(event.index + 1).padStart(2, "0")}`;
      $("toast").hidden = true;
      toastTimer = 0;
      hideOverlay();
      lastCountdown = "";
      lastHud = "";
    }
    if (event.type === "weapon") toast("Neue Dauerwaffe: " + event.weapon.name + " · F zum Schiessen");
    if (event.type === "switchWeapon") toast("Waffe gewählt: " + event.weapon.name);
    if (event.type === "ammo") toast(`+${event.amount} Munition · ${game.ammo}/${game.maxAmmo} Schüsse`);
    if (event.type === "emptyAmmo") toast("Munition leer! Sammle ein grünes +10-Paket oder spring auf Gegner.");
    if (event.type === "bombPickup") toast("Seltene Bombe gefunden! Mit B werfen · Flächenschaden, 10 Schaden beim Boss.");
    if (event.type === "emptyBombs") toast("Keine Bombe dabei. Halte nach dem seltenen, goldenen Extra Ausschau!");
    if (event.type === "cheat") toast("Cheat aktiviert · direkt in die Alpenwelt!");
    if (event.type === "hurt" && event.lives > 0 && !event.fall) toast("Autsch! Kurz unverwundbar – spring weiter.");
    if (event.type === "respawn") { lastCountdown = ""; keys.clear(); hideOverlay(); }
    if (event.type === "boss") toast(`Der Nebelwächter! Munition auf ${game.ammo} aufgefüllt. Spring auf seinen Kopf oder schiesse.`);
    if (event.type === "bossDefeated") toast("Nebelwächter besiegt! Jetzt zur Schweizer Flagge.");
    if (["gameover", "levelComplete", "victory", "pause", "resume", "go"].includes(event.type)) {
      keys.clear();
      updateStateOverlay();
      if (["gameover", "victory"].includes(event.type)) saveRun();
    }
  }
  const game = new Game(onEvent);

  function updateHud() {
    const signature = [game.lives, game.coins, game.weaponTier, game.ammo, game.maxAmmo, game.bombs].join(":");
    if (signature !== lastHud) {
      lastHud = signature;
      $("lives").replaceChildren();
      for (let i = 0; i < 3; i++) {
        const heart = document.createElement("span");
        heart.textContent = "♥";
        heart.className = i >= game.lives ? "heart-empty" : "";
        $("lives").append(heart);
      }
      $("lives").setAttribute("aria-label", `${game.lives} von 3 Leben`);
      $("coin-count").textContent = game.coins;
      $("coin-next").textContent = ` / noch ${10 - game.coins % 10} bis zur Waffe`;
      const weapon = weaponForTier(game.weaponTier);
      $("weapon-name").textContent = weapon.name;
      $("ammo-count").textContent = `${game.ammo} / ${game.maxAmmo}`;
      $("ammo-count").classList.toggle("ammo-empty", game.ammo === 0);
      $("bomb-count").textContent = game.bombs;
    }
    $("level-progress").value = clamp(game.player.x / game.level.exit * 100, 0, 100);
    const boss = game.level.boss;
    $("boss-hud").hidden = !(boss && boss.active && boss.alive);
    if (boss) { $("boss-health").max = boss.maxHp; $("boss-health").value = boss.hp; }
    $("pause-button").disabled = !["playing", "countdown", "paused"].includes(game.state);
    $("pause-button").textContent = game.state === "paused" ? "▷ Weiter" : "Ⅱ Pause";
    if (game.state === "countdown") {
      const count = game.countdown > .7 ? String(Math.ceil(game.countdown - .7)) : "Los!";
      if (lastCountdown !== count) {
        lastCountdown = count;
        showOverlay({ eyebrow: game.level.name.toUpperCase() + " · " + (count === "Los!" ? "AUF INS ABENTEUER" : "MACH DICH BEREIT"), title: count, countdown: true });
        sound.tone(count === "Los!" ? 880 : 440, .12, "sine", .045);
      }
    }
  }

  document.querySelectorAll("[data-skin]").forEach(button => button.addEventListener("click", () => start(Number(button.dataset.skin))));
  $("player-name").addEventListener("input", () => $("player-name").setCustomValidity(""));
  $("refresh-scores").addEventListener("click", () => { void loadScores(); });
  $("retry-scores").addEventListener("click", retryScores);
  $("overlay-retry-score").addEventListener("click", retryScores);
  $("overlay-primary").addEventListener("click", () => { if (overlayAction) overlayAction(); });
  $("overlay-secondary").addEventListener("click", () => { if (overlaySecondary) overlaySecondary(); });
  $("pause-button").addEventListener("click", () => game.state === "paused" ? game.resume() : game.pause());
  $("menu-button").addEventListener("click", confirmMenu);
  $("sound-button").addEventListener("click", () => {
    sound.muted = !sound.muted;
    $("sound-label").textContent = sound.muted ? "Ton aus" : "Ton an";
    $("sound-icon").textContent = sound.muted ? "♪̸" : "♫";
    $("sound-button").setAttribute("aria-pressed", String(sound.muted));
    if (!sound.muted) { void sound.activate(); sound.tone(660, .12, "sine", .03); }
  });
  globalThis.addEventListener("keydown", event => {
    if (game.state === "menu" || event.target.closest("input, textarea, select")) return;
    if (["playing", "countdown", "paused"].includes(game.state) && ["Digit3", "Numpad3", "KeyA"].includes(event.code)) {
      cheatKeys.add(event.code);
      if (!event.repeat && cheatKeys.has("KeyA") && (cheatKeys.has("Digit3") || cheatKeys.has("Numpad3"))) {
        event.preventDefault();
        if (game.skipToAlps()) {
          keys.clear();
          canvas.focus({ preventScroll: true });
        }
        return;
      }
    }
    if (event.code === "Escape" || event.code === "KeyP") {
      event.preventDefault();
      if (!event.repeat) { if (game.state === "paused") game.resume(); else game.pause(); }
      return;
    }
    if (controlKeys.has(event.code) && ["playing", "countdown"].includes(game.state) && !event.target.closest("button, a")) {
      event.preventDefault();
      keys.add(event.code);
    }
  });
  globalThis.addEventListener("keyup", event => { keys.delete(event.code); cheatKeys.delete(event.code); });
  globalThis.addEventListener("blur", () => { keys.clear(); cheatKeys.clear(); game.pause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { keys.clear(); cheatKeys.clear(); game.pause(); } });
  canvas.addEventListener("pointerdown", () => canvas.focus({ preventScroll: true }));
  function frame(time) {
    const dt = lastTime ? Math.min((time - lastTime) / 1000, .1) : 0;
    lastTime = time;
    if (game.state !== "menu") {
      accumulator += dt;
      const input = {
        left: keys.has("ArrowLeft") || keys.has("KeyA"), right: keys.has("ArrowRight") || keys.has("KeyD"),
        jump: keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW"), fire: keys.has("KeyF"), cycle: keys.has("KeyQ"), bomb: keys.has("KeyB")
      };
      while (accumulator >= 1 / 120) { game.update(1 / 120, input); accumulator -= 1 / 120; }
      GipfelsprungArt.render(ctx, game);
      updateHud();
      if (toastTimer > 0 && game.state === "playing") { toastTimer -= dt; if (toastTimer <= 0) $("toast").hidden = true; }
      sound.music(dt, game.state === "playing");
    } else accumulator = 0;
    requestAnimationFrame(frame);
  }
  GipfelsprungArt.preview($("preview-canvas"));
  document.querySelectorAll("[data-portrait]").forEach(element => GipfelsprungArt.portrait(element, Number(element.dataset.portrait)));
  if (staticMode) {
    $("bestenliste").hidden = true;
    document.querySelector('nav a[href="#bestenliste"]').hidden = true;
    $("player-name-hint").textContent = "Dein Name wird nur in diesem Spiel angezeigt und nicht gespeichert.";
    document.querySelector('footer > span:last-child').textContent = "ONLINE. WERBEFREI. EIGENSTÄNDIG.";
    $("notice").textContent = "Online-Version ohne zentrale Bestenliste. Dein Spielername und deine Ergebnisse werden nicht an einen Spielserver übertragen.";
    $("notice").hidden = false;
  } else void loadScores();
  requestAnimationFrame(frame);
})();
