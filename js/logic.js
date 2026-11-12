(function () {
  "use strict";

  const WIDTH = 1280;
  const HEIGHT = 640;
  const GROUND = 520;
  const GRAVITY = 1700;
  const MAX_AMMO = 20;
  const BOSS_AMMO = 35;
  const AMMO_PICKUP = 10;
  const BOMB_RADIUS = 140;
  const BOMB_DAMAGE = 10;
  const SKINS = [
    { name: "Lina", appearance: "hiker", coat: "#d95d42", light: "#ed9570", pants: "#385866", hair: "#553e2d", skin: "#e5b28a", hat: "#e5b943", pack: "#638258" },
    { name: "Noah", appearance: "hoodie", coat: "#487a88", light: "#7eaab1", pants: "#344b47", hair: "#382f2a", skin: "#bd875e", hat: "#d47146", pack: "#a7874d" },
    { name: "Mika", appearance: "climber", coat: "#d2a440", light: "#edc66a", pants: "#4b5c53", hair: "#382b30", skin: "#edc1a0", hat: "#62816b", pack: "#9b6152" },
    { name: "Maurin", appearance: "sport", coat: "#3d6298", light: "#779bd0", pants: "#313f54", hair: "#654b31", skin: "#e5b28a", hat: "#df7640", pack: "#caac64" },
    { name: "Nici", appearance: "explorer", coat: "#8a589b", light: "#b78bc4", pants: "#3c5156", hair: "#49332c", skin: "#edc1a0", hat: "#5c9e8e", pack: "#ce895c" }
  ];
  const LEVELS = [
    { name: "St. Gallen", subtitle: "Zwischen Klostertürmen und grünen Hügeln", sky: "#dce9e3", far: "#b3c9b5", near: "#86a986", ground: "#789257", earth: "#b59870", landmark: "abbey", hint: "Spring auf Gegner, um sie zu besiegen. Die Flagge ist dein Ziel." },
    { name: "Zürich", subtitle: "Über die Limmat, den Dächern entgegen", sky: "#dcecf0", far: "#b6cdd1", near: "#83aeb1", ground: "#789c75", earth: "#a19682", landmark: "zurich", hint: "Die Lücken werden breiter. Nutze die Plattformen über der Limmat." },
    { name: "Bern", subtitle: "Ein Sprung durch die Gassen der Altstadt", sky: "#eae8db", far: "#c5c8ad", near: "#9da781", ground: "#8a9b5c", earth: "#a18a69", landmark: "bern", hint: "Bleib in Bewegung. In Bern warten mehr Gegner zwischen den Lauben." },
    { name: "Luzern", subtitle: "Am Vierwaldstättersee geht es hoch hinaus", sky: "#dce9ed", far: "#b5cad0", near: "#7e9f9e", ground: "#739980", earth: "#968e79", landmark: "lucerne", hint: "Achte auf deine Landung zwischen Brücken, Stufen und Seeufer." },
    { name: "Alpen", subtitle: "Der letzte Aufstieg zum Nebelwächter", sky: "#dce4ec", far: "#bbc6d4", near: "#8e9da9", ground: "#dce6e6", earth: "#858c8c", landmark: "alps", hint: "Der Nebelwächter: Spring auf seinen Kopf, schiesse und überspringe seine Bodenwellen." }
  ];
  const WEAPONS = [
    { name: "Schneeball", color: "#f4ffff", speed: 500, damage: 1, cooldown: 0.42, size: 7, spread: [0] },
    { name: "Tannenzapfen", color: "#b77a43", speed: 540, damage: 2, cooldown: 0.48, size: 8, spread: [0] },
    { name: "Bergkristall", color: "#8de1e0", speed: 750, damage: 2, cooldown: 0.3, size: 6, spread: [0] },
    { name: "Föhnwind", color: "#d6efa5", speed: 620, damage: 1, cooldown: 0.4, size: 7, spread: [-0.14, 0, 0.14] },
    { name: "Alpenblitz", color: "#f5d671", speed: 850, damage: 3, cooldown: 0.25, size: 8, spread: [0] }
  ];

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  function weaponForTier(tier) {
    if (tier < 1) return null;
    const base = WEAPONS[(tier - 1) % WEAPONS.length];
    const rank = Math.floor((tier - 1) / WEAPONS.length) + 1;
    return { ...base, tier, rank, name: base.name + (rank > 1 ? " " + rank : ""), damage: base.damage + rank - 1 };
  }

  function buildLevel(index) {
    const config = LEVELS[index];
    if (!config) throw new RangeError("Unbekanntes Level: " + index);
    const width = 4600 + index * 400;
    const platforms = [];
    const coins = [];
    const enemies = [];
    const gaps = [];
    const gapCount = 3 + index;
    for (let i = 0; i < gapCount; i++) {
      const x = 1320 + i * 570;
      if (x + 160 < width - 1150) gaps.push({ x, w: 105 + index * 11 });
    }
    let start = 0;
    for (const gap of gaps) {
      platforms.push({ x: start, y: GROUND, w: gap.x - start, h: HEIGHT - GROUND + 150, ground: true });
      start = gap.x + gap.w;
    }
    platforms.push({ x: start, y: GROUND, w: width - start, h: HEIGHT - GROUND + 150, ground: true });
    const blocks = [
      [420, 72, 136], [770, 98, 144], [1040, 64, 112],
      [1620, 88, 140], [2180, 108, 136], [2740, 76, 144],
      [3310, 96, 130]
    ];
    if (index >= 1) blocks.push([3820, 82, 140]);
    if (index >= 2) blocks.push([4230, 106, 132]);
    if (index >= 3) blocks.push([4640, 90, 142]);
    for (const [x, h, w] of blocks) {
      if (x > width - 1050 && index === 4) continue;
      if (gaps.some(gap => x < gap.x + gap.w + 45 && x + w > gap.x - 45)) continue;
      platforms.push({ x, y: GROUND - h, w, h, ground: false });
    }
    for (const p of platforms.filter(p => !p.ground)) {
      for (let n = 0; n < 4; n++) coins.push({ x: p.x + 18 + n * 29, y: p.y - 30, collected: false });
    }
    for (let x = 180; x < width - 200; x += 71) {
      const blocked = platforms.some(p => !p.ground && x > p.x - 22 && x < p.x + p.w + 22);
      const gap = gaps.find(g => x > g.x - 15 && x < g.x + g.w + 15);
      if (blocked) continue;
      coins.push({ x, y: gap ? GROUND - 95 : GROUND - 36, collected: false });
    }
    const patrols = [];
    for (const ground of platforms.filter(p => p.ground)) {
      let spans = [{ left: Math.max(680, ground.x + 24), right: Math.min(ground.x + ground.w - 24, width - (index === 4 ? 1100 : 300)) }];
      for (const block of platforms.filter(p => !p.ground)) {
        spans = spans.flatMap(span => {
          if (block.x - 30 >= span.right || block.x + block.w + 30 <= span.left) return [span];
          return [{ left: span.left, right: block.x - 30 }, { left: block.x + block.w + 30, right: span.right }]
            .filter(part => part.left >= span.left && part.right <= span.right && part.right - part.left >= 85);
        });
      }
      patrols.push(...spans.filter(span => span.right - span.left >= 85));
    }
    const patrolLength = patrols.reduce((sum, span) => sum + span.right - span.left - 32, 0);
    const count = 6 + index * 3;
    for (let n = 0; n < count; n++) {
      let distance = (n + .5) / count * patrolLength;
      const span = patrols.find(part => {
        const length = part.right - part.left - 32;
        if (distance <= length) return true;
        distance -= length;
        return false;
      });
      if (!span) throw new Error("Für das Level fehlt eine gültige Gegnerstrecke.");
      const x = span.left + distance;
      const left = Math.max(span.left, x - 45);
      const right = Math.min(span.right - 32, x + 75);
      enemies.push({ x, y: GROUND - 32, w: 32, h: 32, left, right, dir: n % 2 ? 1 : -1, speed: 42 + index * 12, alive: true, phase: n });
    }
    const ammoPacks = [];
    for (let x = 620; x < width - 250; x += 580) {
      const gap = gaps.find(g => x > g.x - 20 && x < g.x + g.w + 20);
      const packX = gap ? gap.x + gap.w + 50 : x;
      const surface = platforms.find(p => !p.ground && packX >= p.x && packX <= p.x + p.w)
        || platforms.find(p => p.ground && packX >= p.x && packX <= p.x + p.w);
      if (!surface) throw new Error("Für das Munitionspaket fehlt ein sicherer Untergrund.");
      ammoPacks.push({ x: packX, y: surface.y - 18, collected: false });
    }
    const bombPickups = [];
    const bombCount = [2, 3, 4, 4, 5][index];
    const bombPerches = platforms.filter(p => !p.ground);
    if (bombPerches.length < bombCount) throw new Error("Für die Bomben fehlen erreichbare Plattformen.");
    for (let n = 0; n < bombCount; n++) {
      const perch = bombPerches[Math.floor((n + .5) * bombPerches.length / bombCount)];
      bombPickups.push({ x: perch.x + perch.w / 2, y: perch.y - 60, collected: false });
    }
    const boss = index === 4 ? { x: width - 630, y: GROUND - 110, w: 86, h: 110, hp: 60, maxHp: 60, vx: -195, vy: 0, timer: 1.8, warning: 0, invulnerable: 0, grounded: true, alive: true, active: false } : null;
    return { ...config, index, width, platforms, coins, ammoPacks, bombPickups, enemies, gaps, boss, exit: width - 170 };
  }

  class Game {
    constructor(onEvent = () => {}) {
      this.onEvent = onEvent;
      this.state = "menu";
      this.levelIndex = 0;
      this.skinIndex = 0;
      this.lives = 3;
      this.coins = 0;
      this.weaponTier = 1;
      this.unlockedTier = 1;
      this.ammo = MAX_AMMO;
      this.bombs = 0;
      this.camera = 0;
      this.elapsed = 0;
      this.particles = [];
      this.bullets = [];
      this.waves = [];
      this.thrownBombs = [];
      this.explosions = [];
      this.jumpWasDown = false;
      this.cycleWasDown = false;
      this.bombWasDown = false;
    }

    emit(type, detail = {}) { this.onEvent({ type, ...detail }); }

    get maxAmmo() { return this.level?.boss?.active ? BOSS_AMMO : MAX_AMMO; }

    start(skinIndex = 0) {
      if (!SKINS[skinIndex]) throw new RangeError("Unbekannte Spielfigur.");
      this.skinIndex = skinIndex;
      this.lives = 3;
      this.coins = 0;
      this.weaponTier = 1;
      this.unlockedTier = 1;
      this.ammo = MAX_AMMO;
      this.bombs = 0;
      this.elapsed = 0;
      this.loadLevel(0);
    }

    loadLevel(index) {
      this.levelIndex = index;
      this.level = buildLevel(index);
      this.levelHeart = false;
      this.player = { x: 90, y: GROUND - 44, w: 26, h: 44, vx: 0, vy: 0, facing: 1, grounded: true, invulnerable: 0, coyote: 0.1, jumpBuffer: 0, shotTimer: 0, walk: 0 };
      this.camera = 0;
      this.bullets = [];
      this.waves = [];
      this.thrownBombs = [];
      this.explosions = [];
      this.particles = [];
      this.countdown = 3.7;
      this.state = "countdown";
      this.jumpWasDown = false;
      this.cycleWasDown = false;
      this.bombWasDown = false;
      this.emit("level", { index });
    }

    nextLevel() {
      if (this.state !== "levelComplete") return;
      this.loadLevel(this.levelIndex + 1);
    }

    skipToAlps() {
      if (!["playing", "countdown", "paused"].includes(this.state) || this.levelIndex === LEVELS.length - 1) return false;
      this.loadLevel(LEVELS.length - 1);
      this.emit("cheat");
      return true;
    }

    pause() {
      if (this.state !== "playing" && this.state !== "countdown") return;
      this.resumeState = this.state;
      this.state = "paused";
      this.emit("pause");
    }

    resume() {
      if (this.state !== "paused") return;
      this.state = this.resumeState;
      this.emit("resume");
    }

    collectCoin(coin) {
      if (coin.collected) return;
      coin.collected = true;
      this.coins++;
      this.emit("coin");
      this.burst(coin.x, coin.y, "#ecc354", 5);
      const tier = 1 + Math.floor(this.coins / 10);
      if (tier > this.unlockedTier) {
        this.unlockedTier = tier;
        this.weaponTier = tier;
        this.emit("weapon", { weapon: weaponForTier(tier) });
      }
    }

    collectAmmo(pack) {
      if (pack.collected || this.ammo >= this.maxAmmo) return;
      const amount = Math.min(AMMO_PICKUP, this.maxAmmo - this.ammo);
      this.ammo += amount;
      pack.collected = true;
      this.burst(pack.x, pack.y, "#92ba83", 8);
      this.emit("ammo", { amount });
    }

    collectBomb(pickup) {
      if (pickup.collected) return;
      pickup.collected = true;
      this.bombs++;
      this.burst(pickup.x, pickup.y, "#d99554", 12);
      this.emit("bombPickup");
    }

    throwBomb() {
      if (this.state !== "playing") return;
      if (this.bombs <= 0) { this.emit("emptyBombs"); return; }
      this.bombs--;
      const p = this.player;
      this.thrownBombs.push({ x: p.x + p.w / 2 - 8, y: p.y + 12, w: 16, h: 16, vx: p.facing * 340, vy: -340, fuse: 1.1 });
      this.emit("bombThrow");
    }

    updateBombs(dt) {
      for (const blast of this.explosions) blast.life -= dt;
      this.explosions = this.explosions.filter(blast => blast.life > 0);
      for (const bomb of this.thrownBombs) {
        bomb.x += bomb.vx * dt;
        bomb.x = clamp(bomb.x, 0, this.level.width - bomb.w);
        for (const platform of this.level.platforms) {
          if (!overlap(bomb, platform)) continue;
          if (bomb.vx > 0) bomb.x = platform.x - bomb.w;
          else if (bomb.vx < 0) bomb.x = platform.x + platform.w;
          bomb.vx *= -0.35;
        }
        const previousTop = bomb.y;
        const previousBottom = bomb.y + bomb.h;
        bomb.vy += 1000 * dt;
        bomb.y += bomb.vy * dt;
        for (const platform of this.level.platforms) {
          if (!overlap(bomb, platform)) continue;
          if (bomb.vy >= 0 && previousBottom <= platform.y + .5) {
            bomb.y = platform.y - bomb.h;
            bomb.vy = 0;
            bomb.vx *= 0.75;
          } else if (bomb.vy < 0 && previousTop >= platform.y + platform.h - .5) {
            bomb.y = platform.y + platform.h;
            bomb.vy = 0;
          }
        }
        bomb.fuse -= dt;
        if (bomb.fuse <= 0) this.explodeBomb(bomb);
      }
      this.thrownBombs = this.thrownBombs.filter(bomb => bomb.fuse > 0);
    }

    explodeBomb(bomb) {
      const x = bomb.x + bomb.w / 2;
      const y = bomb.y + bomb.h / 2;
      const inRange = box => Math.hypot(x - clamp(x, box.x, box.x + box.w), y - clamp(y, box.y, box.y + box.h)) <= BOMB_RADIUS;
      for (const enemy of this.level.enemies) {
        if (!enemy.alive || !inRange(enemy)) continue;
        enemy.alive = false;
        this.burst(enemy.x + enemy.w / 2, enemy.y, "#dc9d6c");
      }
      const boss = this.level.boss;
      if (boss?.alive && boss.active && inRange(boss)) this.damageBoss(BOMB_DAMAGE, true);
      this.explosions.push({ x, y, radius: BOMB_RADIUS, life: .35 });
      this.burst(x, y, "#e5aa54", 24);
      this.emit("bombExplosion");
    }

    cycleWeapon() {
      if (this.unlockedTier <= 1) return;
      this.weaponTier = this.weaponTier % this.unlockedTier + 1;
      this.emit("switchWeapon", { weapon: weaponForTier(this.weaponTier) });
    }

    burst(x, y, color, count = 9) {
      for (let n = 0; n < count; n++) {
        const angle = n * Math.PI * 2 / count;
        this.particles.push({ x, y, vx: Math.cos(angle) * 90, vy: Math.sin(angle) * 90 - 60, life: 0.45, color, size: 4 });
      }
    }

    hurt(fall = false) {
      if (this.state !== "playing" || (!fall && this.player.invulnerable > 0)) return;
      this.lives--;
      this.emit("hurt", { lives: this.lives, fall });
      if (this.lives <= 0) {
        this.lives = 0;
        this.state = "gameover";
        this.emit("gameover");
        return;
      }
      const p = this.player;
      p.invulnerable = 2;
      if (fall) {
        p.x = 90;
        p.y = GROUND - p.h;
        p.vx = 0;
        p.vy = 0;
        p.grounded = true;
        this.camera = 0;
        this.bullets = [];
        this.waves = [];
        this.thrownBombs = [];
        this.explosions = [];
        this.countdown = 3.7;
        this.state = "countdown";
        this.emit("respawn");
      } else {
        p.vx = -p.facing * 150;
        p.vy = -260;
        p.grounded = false;
      }
    }

    fire() {
      const weapon = weaponForTier(this.weaponTier);
      const p = this.player;
      if (this.state !== "playing" || !weapon || p.shotTimer > 0) return;
      if (this.ammo <= 0) {
        p.shotTimer = 0.5;
        this.emit("emptyAmmo");
        return;
      }
      p.shotTimer = weapon.cooldown;
      this.ammo--;
      for (const angle of weapon.spread) {
        this.bullets.push({ x: p.x + p.w / 2 + p.facing * 21, y: p.y + 20, w: weapon.size * 2, h: weapon.size * 2, vx: p.facing * weapon.speed * Math.cos(angle), vy: weapon.speed * Math.sin(angle), life: 1.65, damage: weapon.damage, color: weapon.color, size: weapon.size });
      }
      this.emit("shoot");
    }

    update(dt, input = {}) {
      dt = clamp(dt, 0, 1 / 30);
      if (this.state === "countdown") {
        this.countdown -= dt;
        if (this.countdown <= 0) {
          this.state = "playing";
          this.emit("go");
        }
        return;
      }
      if (this.state !== "playing") return;
      this.elapsed += dt;
      const p = this.player;
      p.invulnerable = Math.max(0, p.invulnerable - dt);
      p.shotTimer = Math.max(0, p.shotTimer - dt);
      p.coyote = p.grounded ? 0.1 : Math.max(0, p.coyote - dt);
      if (input.jump && !this.jumpWasDown) p.jumpBuffer = 0.12;
      else p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
      this.jumpWasDown = Boolean(input.jump);
      if (input.cycle && !this.cycleWasDown) this.cycleWeapon();
      this.cycleWasDown = Boolean(input.cycle);
      const bombPressed = input.bomb && !this.bombWasDown;
      this.bombWasDown = Boolean(input.bomb);
      const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      p.vx = direction * 290;
      if (direction) p.facing = direction;
      p.walk += Math.abs(p.vx) * dt;
      if (p.jumpBuffer > 0 && p.coyote > 0) {
        p.vy = -680;
        p.grounded = false;
        p.coyote = 0;
        p.jumpBuffer = 0;
        this.emit("jump");
      }
      if (!input.jump && p.vy < -260) p.vy += 1700 * dt;
      const previousTop = p.y;
      const previousBottom = p.y + p.h;
      p.vy = Math.min(p.vy + GRAVITY * dt, 950);
      p.x += p.vx * dt;
      p.x = clamp(p.x, 0, this.level.width - p.w);
      for (const platform of this.level.platforms) {
        if (!overlap(p, platform)) continue;
        if (p.vx > 0) p.x = platform.x - p.w;
        else if (p.vx < 0) p.x = platform.x + platform.w;
      }
      p.y += p.vy * dt;
      p.grounded = false;
      for (const platform of this.level.platforms) {
        if (!overlap(p, platform)) continue;
        if (p.vy >= 0 && previousBottom <= platform.y + .5) {
          p.y = platform.y - p.h;
          p.vy = 0;
          p.grounded = true;
        } else if (p.vy < 0 && previousTop >= platform.y + platform.h - .5) {
          p.y = platform.y + platform.h;
          p.vy = 0;
        }
      }
      if (p.y > HEIGHT + 90) {
        this.hurt(true);
        return;
      }
      for (const coin of this.level.coins) {
        if (!coin.collected && overlap(p, { x: coin.x - 10, y: coin.y - 12, w: 20, h: 24 })) this.collectCoin(coin);
      }
      for (const pack of this.level.ammoPacks) {
        if (!pack.collected && overlap(p, { x: pack.x - 12, y: pack.y - 12, w: 24, h: 24 })) this.collectAmmo(pack);
      }
      for (const pickup of this.level.bombPickups) {
        if (!pickup.collected && overlap(p, { x: pickup.x - 12, y: pickup.y - 12, w: 24, h: 24 })) this.collectBomb(pickup);
      }
      for (const enemy of this.level.enemies) {
        if (!enemy.alive) continue;
        enemy.x += enemy.dir * enemy.speed * dt;
        if (enemy.x < enemy.left || enemy.x > enemy.right) {
          enemy.x = clamp(enemy.x, enemy.left, enemy.right);
          enemy.dir *= -1;
        }
        if (!overlap(p, enemy)) continue;
        if (p.vy > 0 && previousBottom <= enemy.y + 14) {
          enemy.alive = false;
          p.vy = -430;
          this.burst(enemy.x + 16, enemy.y + 15, "#dc9d6c");
          this.emit("stomp");
        } else this.hurt();
        if (this.state !== "playing") return;
      }
      if (input.fire) this.fire();
      if (bombPressed) this.throwBomb();
      this.updateBoss(dt, previousBottom);
      if (this.state !== "playing") return;
      this.updateBullets(dt);
      this.updateBombs(dt);
      for (const wave of this.waves) {
        wave.x += wave.vx * dt;
        wave.life -= dt;
        if (overlap(p, wave)) this.hurt();
      }
      this.waves = this.waves.filter(w => w.life > 0);
      for (const particle of this.particles) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 380 * dt;
        particle.life -= dt;
      }
      this.particles = this.particles.filter(particle => particle.life > 0);
      this.camera = clamp(p.x - WIDTH * 0.3, 0, this.level.width - WIDTH);
      if (this.state !== "playing") return;
      if (p.x + p.w >= this.level.exit && (!this.level.boss || !this.level.boss.alive)) {
        this.levelHeart = this.lives < 3;
        this.lives = Math.min(3, this.lives + 1);
        this.state = this.levelIndex === LEVELS.length - 1 ? "victory" : "levelComplete";
        this.emit(this.state);
      }
    }

    updateBullets(dt) {
      for (const bullet of this.bullets) {
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        bullet.life -= dt;
        const box = { x: bullet.x - bullet.size, y: bullet.y - bullet.size, w: bullet.w, h: bullet.h };
        if (this.level.platforms.some(platform => overlap(box, platform))) { bullet.life = 0; continue; }
        for (const enemy of this.level.enemies) {
          if (!enemy.alive || bullet.life <= 0 || !overlap(box, enemy)) continue;
          enemy.alive = false;
          bullet.life = 0;
          this.burst(enemy.x + 16, enemy.y, "#dc9d6c");
          this.emit("stomp");
        }
        const boss = this.level.boss;
        if (boss && boss.alive && boss.active && bullet.life > 0 && overlap(box, boss)) {
          bullet.life = 0;
          this.damageBoss(bullet.damage);
        }
      }
      this.bullets = this.bullets.filter(b => b.life > 0);
    }

    updateBoss(dt, previousBottom) {
      const boss = this.level.boss;
      if (!boss || !boss.alive) return;
      if (!boss.active && this.player.x > this.level.width - 1250) {
        boss.active = true;
        this.ammo = this.maxAmmo;
        this.emit("boss");
      }
      if (!boss.active) return;
      boss.invulnerable = Math.max(0, boss.invulnerable - dt);
      boss.timer -= dt;
      boss.warning = boss.grounded && boss.timer < 0.65 ? Math.max(0, boss.timer) : 0;
      if (boss.grounded && boss.timer <= 0) {
        boss.vy = -590;
        boss.vx = this.player.x < boss.x ? -195 : 195;
        boss.grounded = false;
        boss.timer = 2.2;
      }
      const wasGrounded = boss.grounded;
      if (!boss.grounded) {
        boss.vy += GRAVITY * dt;
        boss.y += boss.vy * dt;
        boss.x = clamp(boss.x + boss.vx * dt, this.level.width - 1000, this.level.width - 230);
        if (boss.y + boss.h >= GROUND) {
          boss.y = GROUND - boss.h;
          boss.vy = 0;
          boss.grounded = true;
          if (!wasGrounded) {
            for (const dir of [-1, 1]) this.waves.push({ x: boss.x + boss.w / 2, y: GROUND - 19, w: 30, h: 19, vx: dir * 300, life: 2.6 });
            this.emit("quake");
          }
        }
      } else {
        boss.x += (this.player.x < boss.x ? -1 : 1) * 50 * dt;
        boss.x = clamp(boss.x, this.level.width - 1000, this.level.width - 230);
      }
      if (overlap(this.player, boss)) {
        if (this.player.vy > 0 && previousBottom <= boss.y + 22) {
          this.player.vy = -570;
          this.damageBoss(2);
        } else this.hurt();
      }
    }

    damageBoss(damage, ignoreInvulnerability = false) {
      const boss = this.level.boss;
      if (!boss || !boss.alive || (boss.invulnerable > 0 && !ignoreInvulnerability)) return;
      boss.hp = Math.max(0, boss.hp - damage);
      boss.invulnerable = 0.25;
      this.burst(boss.x + boss.w / 2, boss.y + 40, "#e5c773", 12);
      this.emit("bossHit");
      if (boss.hp === 0) {
        boss.alive = false;
        this.waves = [];
        this.burst(boss.x + boss.w / 2, boss.y + 50, "#e9c873", 32);
        this.emit("bossDefeated");
      }
    }
  }

  globalThis.Gipfelsprung = { Game, LEVELS, SKINS, WIDTH, HEIGHT, GROUND, GRAVITY, MAX_AMMO, BOSS_AMMO, AMMO_PICKUP, BOMB_RADIUS, BOMB_DAMAGE, buildLevel, weaponForTier, overlap, clamp };
})();
