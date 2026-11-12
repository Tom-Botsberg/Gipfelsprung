(function () {
  "use strict";
  const { Game, LEVELS, SKINS, GROUND, GRAVITY, MAX_AMMO, BOSS_AMMO, BOMB_RADIUS, BOMB_DAMAGE, buildLevel, weaponForTier } = Gipfelsprung;
  let passed = 0, failed = 0;
  const results = [];
  function assert(value, message) { if (!value) throw new Error(message); }
  function equal(actual, expected, message = "") { assert(actual === expected, `${message} Erwartet: ${expected}, erhalten: ${actual}`); }
  function test(name, fn) {
    const item = document.createElement("li");
    try { fn(); passed++; item.className = "pass"; item.textContent = "OK – " + name; results.push({ name, passed: true }); }
    catch (error) { failed++; item.className = "fail"; item.textContent = "FEHLER – " + name + ": " + error.message; results.push({ name, passed: false, error: error.message }); }
    document.getElementById("results").append(item);
  }
  function ready(index = 0) {
    const game = new Game();
    game.start();
    if (index) game.loadLevel(index);
    game.state = "playing";
    return game;
  }
  function tick(game, seconds, input = {}) {
    for (let n = 0; n < Math.ceil(seconds * 120); n++) game.update(1 / 120, input);
  }

  test("Alle fünf Skins, inklusive Maurin und Nici, starten mit drei Leben", () => {
    equal(SKINS.length, 5); equal(SKINS[3].name, "Maurin"); equal(SKINS[4].name, "Nici");
    SKINS.forEach((skin, index) => {
      const game = new Game(); game.start(index);
      equal(game.skinIndex, index); equal(game.lives, 3); equal(game.levelIndex, 0); equal(game.coins, 0); equal(game.state, "countdown");
    });
  });
  function spritePixels(skin, options = {}) {
    const canvas = document.createElement("canvas");
    canvas.width = 96; canvas.height = 96;
    const ctx = canvas.getContext("2d");
    GipfelsprungArt.playerSprite(ctx, 32, 24, skin, options);
    return ctx.getImageData(0, 0, 96, 96).data;
  }
  test("Alle Skins haben eigene Silhouetten statt nur anderer Farben", () => {
    for (const pose of [{}, { walking: 22 }, { airborne: true }]) {
      const silhouettes = SKINS.map(skin => spritePixels(skin, pose).filter((value, index) => index % 4 === 3).join(","));
      equal(new Set(silhouettes).size, 5, "Alle fünf Umrisse müssen auch in Bewegung verschieden sein.");
    }
  });
  test("Outfits bleiben selbst mit identischer Farbpalette unterscheidbar", () => {
    const sprites = SKINS.map(skin => spritePixels({ ...SKINS[0], appearance: skin.appearance }).join(","));
    equal(new Set(sprites).size, 5);
  });
  test("Alle Outfits werden korrekt gespiegelt und bei Schaden transparent", () => {
    SKINS.forEach(skin => {
      const right = spritePixels(skin), left = spritePixels(skin, { facing: -1 });
      const faded = spritePixels(skin, { faded: true });
      for (let y = 0; y < 96; y++) {
        for (let x = 0; x < 90; x++) {
          const index = (y * 96 + x) * 4;
          const mirror = (y * 96 + 89 - x) * 4;
          for (let channel = 0; channel < 4; channel++) {
            equal(left[index + channel], right[mirror + channel], skin.name + ": Blickrichtung.");
          }
          if (right[index + 3]) assert(faded[index + 3] > 0 && faded[index + 3] < right[index + 3], skin.name + ": Schadensblinken.");
        }
      }
    });
  });
  test("Verschiedene Outfits behalten identische Kollisionen und Sprungphysik", () => {
    const positions = SKINS.map((skin, index) => {
      const game = new Game(); game.start(index); game.state = "playing";
      tick(game, .35, { right: true, jump: true });
      return [game.player.x, game.player.y, game.player.vy, game.player.w, game.player.h].join(",");
    });
    equal(new Set(positions).size, 1);
  });
  test("Countdown blockiert Bewegung und dauert 3–2–1–Los", () => {
    const game = new Game(); game.start(); const x = game.player.x;
    tick(game, 3, { right: true }); equal(game.state, "countdown"); equal(game.player.x, x);
    tick(game, .72); equal(game.state, "playing");
  });
  test("Alpen-Cheat überspringt direkt zu Level 5 und erhält den Spielstand", () => {
    for (let index = 0; index < 4; index++) {
      const events = [];
      const game = new Game(event => events.push(event.type));
      game.start(3); game.loadLevel(index); game.state = "playing";
      game.lives = 2; game.coins = 27; game.weaponTier = 3; game.unlockedTier = 3; game.ammo = 7; game.elapsed = 45;
      events.length = 0;
      assert(game.skipToAlps(), "Cheat muss ausgeführt werden.");
      equal(game.levelIndex, 4); equal(game.state, "countdown"); equal(game.player.x, 90);
      equal(game.skinIndex, 3); equal(game.lives, 2); equal(game.coins, 27); equal(game.weaponTier, 3);
      equal(game.unlockedTier, 3); equal(game.ammo, 7); equal(game.elapsed, 45);
      assert(game.level.boss.alive, "Boss muss bereitstehen.");
      assert(!game.levelHeart, "Überspringen darf kein Zusatzherz geben.");
      equal(events.join(","), "level,cheat", "Überspringen darf keinen Weltabschluss oder Rekord auslösen.");
    }
  });
  test("Alpen-Cheat funktioniert während Countdown und Pause", () => {
    const game = new Game(); game.start(); assert(game.skipToAlps(), "Cheat während Countdown.");
    game.start(); game.pause(); assert(game.skipToAlps(), "Cheat während Pause.");
    equal(game.levelIndex, 4); equal(game.state, "countdown");
  });
  test("Alpen-Cheat startet Level 5 nicht erneut und überschreibt kein Spielende", () => {
    const game = ready(4); const level = game.level; game.level.boss.hp = 7; game.player.x = 700;
    assert(!game.skipToAlps(), "Bereits in den Alpen: kein Neustart.");
    equal(game.level, level); equal(game.level.boss.hp, 7); equal(game.player.x, 700);
    for (const state of ["menu", "gameover", "victory", "levelComplete"]) {
      const other = ready(); other.state = state;
      assert(!other.skipToAlps(), "Cheat im Zustand " + state + " muss inaktiv bleiben.");
      equal(other.state, state); equal(other.levelIndex, 0);
    }
  });
  test("Bewegung, Sprung und Landung funktionieren", () => {
    const game = ready();
    tick(game, .25, { right: true }); assert(game.player.x > 150, "Laufen muss bewegen.");
    const y = game.player.y; tick(game, .18, { jump: true }); assert(game.player.y < y - 70, "Sprung muss Höhe gewinnen.");
    tick(game, 1); equal(game.player.y + game.player.h, GROUND); assert(game.player.grounded, "Figur muss landen.");
  });
  test("Ein gehaltener Sprung führt nicht zum automatischen Dauerspringen", () => {
    const game = ready(); tick(game, 1.8, { jump: true });
    assert(game.player.grounded, "Ohne erneutes Drücken muss die Figur am Boden bleiben.");
  });
  test("Erstes Hindernis kann erreicht, übersprungen und oben betreten werden", () => {
    const game = ready();
    game.player.x = 345;
    tick(game, .38, { right: true, jump: true });
    tick(game, .4);
    equal(game.player.y + game.player.h, GROUND - 72, "Landung auf erstem Hindernis.");
    assert(game.player.grounded, "Auf Hindernis stehen.");
  });
  test("Zehn Münzen schalten exakt eine Dauerwaffe frei", () => {
    const game = ready();
    for (let n = 0; n < 9; n++) game.collectCoin(game.level.coins[n]);
    equal(game.unlockedTier, 1); equal(game.coins, 9);
    game.collectCoin(game.level.coins[9]); equal(game.unlockedTier, 2); equal(game.weaponTier, 2);
    game.collectCoin(game.level.coins[9]); equal(game.coins, 10, "Münze darf nur einmal zählen.");
    for (let n = 10; n < 20; n++) game.collectCoin(game.level.coins[n]);
    equal(game.unlockedTier, 3); equal(game.weaponTier, 3);
  });
  test("Weitere zehn Münzen geben auch nach fünf Waffen neue Varianten", () => {
    for (let tier = 1; tier <= 40; tier++) {
      const weapon = weaponForTier(tier);
      equal(weapon.tier, tier); assert(weapon.damage > 0, "Schaden muss positiv sein.");
      if (tier > 5) assert(weapon.name !== weaponForTier(tier - 5).name, "Variante braucht eigenen Namen.");
    }
  });
  test("Schneebälle sind sofort verfügbar, genau 20 Schüsse verbrauchen den Vorrat", () => {
    const game = ready(); equal(game.ammo, MAX_AMMO); equal(weaponForTier(game.weaponTier).name, "Schneeball");
    for (let n = 0; n < 20; n++) { game.player.shotTimer = 0; game.fire(); }
    equal(game.bullets.length, 20); equal(game.ammo, 0);
    game.player.shotTimer = 0; game.fire(); equal(game.bullets.length, 20); equal(game.ammo, 0);
  });
  test("Waffen teilen Munition; Freischalten und Wechsel füllen nicht nach", () => {
    const game = ready(); game.fire(); equal(game.ammo, 19);
    for (let n = 0; n < 20; n++) game.collectCoin(game.level.coins[n]);
    equal(game.weaponTier, 3); equal(game.ammo, 19); equal(game.coins, 20);
    game.cycleWeapon(); equal(game.weaponTier, 1); game.cycleWeapon(); equal(game.weaponTier, 2); equal(game.ammo, 19);
  });
  test("Abklingzeit und Pause verbrauchen keine zusätzlichen Schüsse", () => {
    const game = ready(); game.fire(); game.fire(); equal(game.ammo, 19);
    game.pause(); game.player.shotTimer = 0; game.fire(); equal(game.ammo, 19);
    game.resume(); game.fire(); equal(game.ammo, 18);
  });
  test("Föhnwind kostet trotz drei Projektilen nur einen Schuss", () => {
    const game = ready(); game.weaponTier = 4; game.unlockedTier = 4; game.fire();
    equal(game.bullets.length, 3); equal(game.ammo, 19);
  });
  test("Munitionspakete geben zehn Schüsse, bleiben bei vollem Vorrat liegen und zählen einmal", () => {
    const game = ready(); const [first, second] = game.level.ammoPacks;
    game.collectAmmo(first); assert(!first.collected, "Volles Magazin darf Paket nicht verbrauchen.");
    game.ammo = 14; game.collectAmmo(first); equal(game.ammo, 20); assert(first.collected, "Paket muss gesammelt sein.");
    game.ammo = 0; game.collectAmmo(first); equal(game.ammo, 0);
    game.collectAmmo(second); equal(game.ammo, 10); equal(game.coins, 0);
  });
  test("Berühren eines Munitionspakets lädt den Vorrat nach", () => {
    const game = ready(); const pack = game.level.ammoPacks[0]; game.ammo = 3;
    game.player.x = pack.x - 12; game.update(1 / 120);
    equal(game.ammo, 13); assert(pack.collected, "Paket muss beim Berühren eingesammelt werden.");
  });
  test("Jede Welt hat die gewünschte Bombenzahl auf verschiedenen erreichbaren Plattformen", () => {
    let total = 0;
    LEVELS.forEach((config, index) => {
      const level = buildLevel(index);
      equal(level.bombPickups.length, [2, 3, 4, 4, 5][index], config.name + ": Bombenzahl.");
      equal(new Set(level.bombPickups.map(pickup => pickup.x)).size, level.bombPickups.length, "Bomben müssen auf verschiedenen Plattformen verteilt sein.");
      total += level.bombPickups.length;
      assert(level.bombPickups.length < level.ammoPacks.length, "Bomben müssen seltener als Munition sein.");
      for (const pickup of level.bombPickups) {
        const perch = level.platforms.find(p => !p.ground && pickup.x > p.x && pickup.x < p.x + p.w);
        assert(perch && pickup.y === perch.y - 60, "Bombe muss über einer erreichbaren Plattform liegen.");
        const game = ready(index); game.level.enemies.forEach(enemy => { enemy.alive = false; });
        game.player.x = pickup.x - game.player.w / 2; game.player.y = perch.y - game.player.h;
        tick(game, .15, { jump: true }); equal(game.bombs, 1, "Bombe muss tatsächlich durch einen Sprung einsammelbar sein.");
      }
    });
    equal(total, 18);
  });
  test("Bomben werden bei Berührung einmalig eingesammelt, ohne Münzen oder Munition zu ändern", () => {
    const game = ready(1), pickup = game.level.bombPickups[0];
    game.level.coins = [];
    game.player.x = pickup.x - 12; game.player.y = pickup.y - 20;
    game.update(1 / 120); equal(game.bombs, 1); assert(pickup.collected, "Bombe muss gesammelt sein.");
    game.collectBomb(pickup); equal(game.bombs, 1); equal(game.ammo, 20); equal(game.coins, 0);
  });
  test("B wirft genau eine Bombe pro Tastendruck und verbraucht keine Schussmunition", () => {
    const game = ready(); game.bombs = 2;
    tick(game, .2, { bomb: true }); equal(game.bombs, 1); equal(game.thrownBombs.length, 1);
    game.update(1 / 120, {}); game.update(1 / 120, { bomb: true });
    equal(game.bombs, 0); equal(game.thrownBombs.length, 2); equal(game.ammo, 20);
    game.update(1 / 120, {}); game.update(1 / 120, { bomb: true }); equal(game.thrownBombs.length, 2);
  });
  test("Bomben fliegen in Blickrichtung und können auch ohne Munition geworfen werden", () => {
    for (const facing of [-1, 1]) {
      const game = ready(); game.bombs = 1; game.ammo = 0; game.player.facing = facing;
      game.throwBomb(); equal(game.bombs, 0); equal(Math.sign(game.thrownBombs[0].vx), facing);
      assert(game.thrownBombs[0].vy < 0, "Wurf beginnt nach oben.");
      equal(game.ammo, 0);
    }
  });
  test("Pause und Countdown blockieren Bombenwürfe und frieren den Zünder ein", () => {
    const game = ready(); game.bombs = 2; game.throwBomb(); const bomb = game.thrownBombs[0];
    game.pause(); game.throwBomb(); tick(game, 1.5, { bomb: true });
    equal(game.bombs, 1); equal(bomb.fuse, 1.1); equal(game.explosions.length, 0);
    game.resume(); tick(game, 1.15); equal(game.thrownBombs.length, 0); equal(game.explosions.length, 1);
    game.loadLevel(0); game.throwBomb(); equal(game.bombs, 1); equal(game.thrownBombs.length, 0);
  });
  test("Geworfene Bombe landet auf Terrain und explodiert nach genau 1,1 Sekunden", () => {
    const events = [], game = new Game(event => events.push(event.type));
    game.start(); game.state = "playing"; game.bombs = 1; game.throwBomb();
    const bomb = game.thrownBombs[0];
    for (let n = 0; n < 120; n++) game.updateBombs(1 / 120);
    equal(game.thrownBombs.length, 1); assert(bomb.y + bomb.h <= GROUND, "Bombe darf nicht durch den Boden fallen.");
    for (let n = 0; n < 13; n++) game.updateBombs(1 / 120);
    equal(game.thrownBombs.length, 0); equal(game.explosions.length, 1);
    equal(events.filter(event => event === "bombExplosion").length, 1, "Explosion darf nur einmal auslösen.");
    for (let n = 0; n < 60; n++) game.updateBombs(1 / 120);
    equal(game.explosions.length, 0);
  });
  test("Bomben prallen an Hindernissen ab statt durch Wände zu fliegen", () => {
    const game = ready(); game.player.x = 390; game.bombs = 1; game.throwBomb();
    game.updateBombs(1 / 60); game.updateBombs(1 / 60);
    assert(game.thrownBombs[0].vx < 0, "Wandkontakt muss die Flugrichtung umkehren.");
    assert(game.thrownBombs[0].x + game.thrownBombs[0].w <= 420, "Bombe darf nicht in der Wand stecken.");
  });
  test("Explosion besiegt alle Gegner im Kreis, nicht aber entfernte Gegner oder den Spieler", () => {
    const game = ready();
    game.level.enemies = [
      { x: 90, y: 470, w: 32, h: 32, alive: true },
      { x: 200, y: 470, w: 32, h: 32, alive: true },
      { x: 100 + BOMB_RADIUS + 1, y: 490, w: 32, h: 32, alive: true },
      { x: 100 + BOMB_RADIUS - 10, y: 490 + BOMB_RADIUS - 10, w: 32, h: 32, alive: true }
    ];
    game.explodeBomb({ x: 92, y: 482, w: 16, h: 16 });
    assert(!game.level.enemies[0].alive && !game.level.enemies[1].alive, "Beide nahen Gegner müssen besiegt sein.");
    assert(game.level.enemies[2].alive && game.level.enemies[3].alive, "Radius muss kreisförmig begrenzt sein.");
    equal(game.lives, 3);
  });
  test("Bomben verursachen zehn Boss-Schaden auch während Trefferblinken, aber nicht ausser Reichweite", () => {
    const game = ready(4), boss = game.level.boss;
    const bomb = { x: boss.x + 30, y: boss.y + 35, w: 16, h: 16 };
    game.explodeBomb(bomb); equal(boss.hp, 60, "Inaktiver Boss darf nicht verletzt werden.");
    boss.active = true; boss.invulnerable = .2;
    game.explodeBomb(bomb); equal(boss.hp, 60 - BOMB_DAMAGE);
    game.explodeBomb({ ...bomb, x: boss.x - BOMB_RADIUS - 30 }); equal(boss.hp, 50);
    boss.hp = 5; game.explodeBomb(bomb); equal(boss.hp, 0); assert(!boss.alive, "Bombe kann den Boss besiegen.");
  });
  test("Bombenvorrat bleibt bei Sturz, Levelwechsel und Cheat erhalten, wird beim Neustart zurückgesetzt", () => {
    const game = ready(1), pickup = game.level.bombPickups[0];
    game.collectBomb(pickup); game.bombs = 2; game.throwBomb();
    game.hurt(true); equal(game.bombs, 1); equal(game.thrownBombs.length, 0); assert(pickup.collected, "Kein doppeltes Einsammeln nach Sturz.");
    game.state = "levelComplete"; game.nextLevel(); equal(game.bombs, 1);
    game.state = "playing"; game.skipToAlps(); equal(game.bombs, 1);
    game.start(); equal(game.bombs, 0); equal(game.thrownBombs.length, 0); equal(game.explosions.length, 0);
  });
  test("Seitlicher Kontakt kostet ein Leben und gewährt kurz Unverwundbarkeit", () => {
    const game = ready(); const x = game.player.x;
    game.hurt(); equal(game.lives, 2); equal(game.state, "playing"); equal(game.player.x, x);
    game.hurt(); equal(game.lives, 2);
    tick(game, 2.1); game.hurt(); equal(game.lives, 1);
  });
  test("Erst bei null Leben erscheint Game over", () => {
    const game = ready();
    for (let n = 0; n < 3; n++) { game.player.invulnerable = 0; game.hurt(); }
    equal(game.state, "gameover"); equal(game.lives, 0);
    game.hurt(); equal(game.lives, 0);
  });
  test("Neustart nach Game over setzt Welt, Münzen, Waffen und Leben zurück", () => {
    const game = ready(3); game.coins = 30; game.unlockedTier = 3; game.weaponTier = 3;
    game.lives = 1; game.hurt(); equal(game.state, "gameover"); game.start(2);
    equal(game.levelIndex, 0); equal(game.lives, 3); equal(game.coins, 0); equal(game.weaponTier, 1); equal(game.unlockedTier, 1); equal(game.ammo, 20); equal(game.skinIndex, 2);
  });
  test("Sturz startet aktuelles Level neu, Münzen können nicht doppelt zählen", () => {
    const game = ready(2); const coin = game.level.coins[0]; game.collectCoin(coin);
    const pack = game.level.ammoPacks[0]; game.ammo = 0; game.collectAmmo(pack); game.ammo = 4;
    game.player.y = 760; game.update(1 / 120);
    equal(game.levelIndex, 2); equal(game.lives, 2); equal(game.state, "countdown"); equal(game.player.x, 90); equal(game.coins, 1);
    assert(coin.collected, "Gesammelte Münze bleibt gesammelt.");
    assert(pack.collected, "Munitionspaket bleibt gesammelt."); equal(game.ammo, 4);
  });
  test("Gegner werden durch Draufspringen besiegt", () => {
    const game = ready(); const enemy = game.level.enemies[0]; assert(enemy, "Level braucht Gegner.");
    game.player.x = enemy.x; game.player.y = enemy.y - game.player.h - 2; game.player.vy = 330; game.player.grounded = false;
    game.update(1 / 120);
    assert(!enemy.alive, "Gegner muss besiegt sein."); assert(game.player.vy < 0, "Figur muss abprallen."); equal(game.lives, 3);
  });
  test("Ein Projektil besiegt einen normalen Gegner", () => {
    const game = ready(); const enemy = game.level.enemies[0];
    game.bullets.push({ x: enemy.x + 13, y: enemy.y + 14, w: 12, h: 12, size: 6, vx: 0, vy: 0, damage: 1, life: 1 });
    game.updateBullets(1 / 120); assert(!enemy.alive, "Projektil muss treffen."); equal(game.bullets.length, 0);
  });
  test("Pause friert Position, Countdown und Gegner ein", () => {
    const game = ready(); const enemyX = game.level.enemies[0].x; const playerX = game.player.x;
    game.pause(); tick(game, 1, { right: true, jump: true }); equal(game.player.x, playerX); equal(game.level.enemies[0].x, enemyX);
    game.resume(); equal(game.state, "playing");
    game.loadLevel(0); const count = game.countdown; game.pause(); tick(game, 1); equal(game.countdown, count);
    game.resume(); equal(game.state, "countdown");
  });
  test("Fünf Welten haben eigene Kulissen, zunehmende Lücken und erreichbare Ziele", () => {
    const jumpHeight = 680 ** 2 / (2 * GRAVITY);
    const jumpRange = 290 * 680 * 2 / GRAVITY;
    let lastGap = 0;
    LEVELS.forEach((config, index) => {
      const level = buildLevel(index);
      equal(level.name, config.name); assert(level.coins.length >= 50, "Genug Münzen.");
      equal(level.enemies.length, 6 + index * 3, "Steigende Gegnerzahl."); assert(level.gaps.length >= lastGap, "Steigende Schwierigkeit."); lastGap = level.gaps.length;
      for (const gap of level.gaps) assert(gap.w < jumpRange - 30, "Lücke muss überspringbar sein.");
      for (const platform of level.platforms.filter(p => !p.ground)) assert(GROUND - platform.y < jumpHeight - 15, "Plattform muss erreichbar sein.");
      assert(level.ammoPacks.length >= 6, "Jede Welt braucht verteilte Munition.");
      for (const pack of level.ammoPacks) {
        assert(!level.gaps.some(gap => pack.x >= gap.x && pack.x <= gap.x + gap.w), "Munition darf nicht über einem Abgrund liegen.");
        const surface = level.platforms.find(p => pack.x >= p.x && pack.x <= p.x + p.w && pack.y === p.y - 18);
        assert(surface, "Munition muss erreichbar auf einer Plattform liegen.");
      }
      const endGround = level.platforms.find(p => p.ground && level.exit >= p.x && level.exit <= p.x + p.w);
      assert(endGround, "Zielflagge muss auf festem Boden stehen.");
      equal(Boolean(level.boss), index === 4);
    });
  });
  test("Levelabschluss gibt ein Herz; Wechsel nimmt Münzen, Waffen und Munition mit", () => {
    const game = ready(); game.coins = 20; game.unlockedTier = 3; game.weaponTier = 3; game.lives = 2; game.ammo = 7;
    game.player.x = game.level.exit; game.update(1 / 120); equal(game.state, "levelComplete");
    equal(game.lives, 3); assert(game.levelHeart, "Zusatzherz muss angezeigt werden.");
    game.nextLevel(); equal(game.levelIndex, 1); equal(game.lives, 3); equal(game.coins, 20); equal(game.weaponTier, 3); equal(game.ammo, 7);
  });
  test("Jede Welt, inklusive Alpen, gibt genau ein Herz und niemals mehr als drei", () => {
    LEVELS.forEach((level, index) => {
      for (const initial of [1, 2, 3]) {
        const game = ready(index); game.lives = initial;
        if (game.level.boss) game.level.boss.alive = false;
        game.player.x = game.level.exit; game.update(1 / 120);
        equal(game.lives, Math.min(3, initial + 1)); equal(game.levelHeart, initial < 3);
        tick(game, 1); equal(game.lives, Math.min(3, initial + 1), "Warten darf kein weiteres Herz geben.");
      }
    });
  });
  test("Endgegner aktiviert sich erst in der Arena und sperrt das Ziel", () => {
    const game = ready(4); const boss = game.level.boss;
    tick(game, 1); assert(!boss.active, "Boss wartet auf Spieler.");
    game.player.x = game.level.width - 1100; game.update(1 / 120); assert(boss.active, "Boss muss aktiv werden.");
    game.player.x = game.level.exit; game.update(1 / 120); equal(game.state, "playing");
  });
  test("Erst beim Beginn des Bosskampfs wird Munition einmalig auf 35 aufgefüllt", () => {
    for (const remaining of [0, 7, 20]) {
      const game = ready(4); game.ammo = remaining;
      equal(game.maxAmmo, 20); game.update(1 / 120); equal(game.ammo, remaining);
      game.player.x = game.level.width - 1100; game.update(1 / 120);
      equal(game.ammo, 35); equal(game.maxAmmo, BOSS_AMMO);
      game.fire(); equal(game.ammo, 34); game.update(1 / 120); equal(game.ammo, 34, "Kein dauerhaftes Auffüllen.");
    }
  });
  test("Im Bosskampf sind genau 35 Schüsse ohne Nachladen möglich", () => {
    const game = ready(4); game.player.x = game.level.width - 1100; game.update(1 / 120);
    for (let n = 0; n < 35; n++) { game.player.shotTimer = 0; game.fire(); }
    equal(game.ammo, 0); equal(game.bullets.length, 35);
    game.player.shotTimer = 0; game.fire(); equal(game.ammo, 0); equal(game.bullets.length, 35);
  });
  test("Munitionspakete beachten das Bosslimit von 35 und das normale Limit von 20", () => {
    const game = ready(4); game.player.x = game.level.width - 1100; game.update(1 / 120);
    const [first, second, third] = game.level.ammoPacks;
    game.collectAmmo(first); assert(!first.collected, "Volles Bossmagazin darf kein Paket verbrauchen.");
    game.ammo = 24; game.collectAmmo(first); equal(game.ammo, 34);
    game.collectAmmo(second); equal(game.ammo, 35);
    game.collectAmmo(third); assert(!third.collected, "35 ist die Obergrenze.");
    game.start(); equal(game.ammo, 20); equal(game.maxAmmo, 20);
    game.collectAmmo(game.level.ammoPacks[0]); equal(game.ammo, 20);
  });
  test("Ein Sturz im Bosskampf behält Munition ohne erneutes Gratisauffüllen", () => {
    const game = ready(4); game.player.x = game.level.width - 1100; game.update(1 / 120);
    game.ammo = 8; game.hurt(true); equal(game.ammo, 8); equal(game.maxAmmo, 35);
    game.countdown = 0; game.update(1 / 120); game.player.x = game.level.width - 1100; game.update(1 / 120);
    equal(game.ammo, 8); equal(game.maxAmmo, 35); equal(game.lives, 2);
    game.level.boss.alive = false; equal(game.maxAmmo, 35, "Restmunition bleibt nach dem Boss-Sieg nutzbar.");
  });
  test("Boss hat 60 Lebenspunkte und überlebt 20 Schneeballtreffer", () => {
    const game = ready(4); const boss = game.level.boss;
    equal(boss.hp, 60); equal(boss.maxHp, 60);
    for (let n = 0; n < 20; n++) { boss.invulnerable = 0; game.damageBoss(1); }
    equal(boss.hp, 40); assert(boss.alive, "Ein anfänglicher Munitionsvorrat darf den Boss nicht sofort besiegen.");
  });
  test("Boss verfolgt schneller und erzeugt schnellere, weiterhin überspringbare Wellen", () => {
    const game = ready(4); const boss = game.level.boss; boss.active = true;
    const x = boss.x;
    for (let n = 0; n < 60; n++) game.updateBoss(1 / 120, 0);
    assert(Math.abs(x - boss.x - 25) < .001, "Verfolgung muss 50 Pixel pro Sekunde erreichen.");
    boss.timer = 0; game.updateBoss(1 / 120, 0);
    equal(Math.abs(boss.vx), 195);
    for (let n = 0; n < 120 && !boss.grounded; n++) game.updateBoss(1 / 120, 0);
    assert(boss.grounded, "Boss muss wieder landen.");
    equal(game.waves.length, 2);
    assert(game.waves.every(wave => Math.abs(wave.vx) === 300 && wave.h === 19), "Bodenwellen müssen schneller, aber überspringbar sein.");
  });
  test("Boss beginnt nach 1,8 Sekunden und springt danach alle 2,2 Sekunden", () => {
    const game = ready(4); const boss = game.level.boss; boss.active = true;
    const takeoffs = [];
    for (let n = 1; n <= 600; n++) {
      const grounded = boss.grounded;
      game.updateBoss(1 / 120, 0);
      if (grounded && !boss.grounded) takeoffs.push(n / 120);
    }
    assert(takeoffs.length >= 2, "Boss muss mindestens zweimal angreifen.");
    assert(Math.abs(takeoffs[0] - 1.8) <= 1 / 120 + .001, "Erster Angriff muss nach 1,8 Sekunden starten.");
    assert(Math.abs(takeoffs[1] - takeoffs[0] - 2.2) <= 1 / 120 + .001, "Angriffsabstand muss 2,2 Sekunden betragen.");
  });
  test("Boss-Sprung kündigt sich an und erzeugt überspringbare Bodenwellen", () => {
    const game = ready(4); const boss = game.level.boss;
    game.player.x = game.level.width - 1100; boss.active = true; boss.timer = .3;
    game.updateBoss(.01, 0); assert(boss.warning > 0, "Warnung vor Sprung.");
    boss.timer = 0; game.updateBoss(.01, 0); assert(!boss.grounded && boss.vy < 0, "Boss muss springen.");
    for (let n = 0; n < 100; n++) game.updateBoss(1 / 120, 0);
    assert(game.waves.length >= 2, "Landung muss Bodenwellen erzeugen.");
    assert(game.waves.every(wave => wave.h < 25), "Wellen sind überspringbar.");
  });
  test("Endgegner kann per Kopfsprung und Projektil verletzt werden", () => {
    const game = ready(4); const boss = game.level.boss; boss.active = true;
    game.player.x = boss.x + 10; game.player.y = boss.y - game.player.h - 1; game.player.vy = 300; game.player.grounded = false;
    game.update(1 / 120); assert(boss.hp < boss.maxHp, "Kopfsprung verursacht Schaden.");
    boss.invulnerable = 0; const hp = boss.hp;
    game.bullets.push({ x: boss.x + 40, y: boss.y + 40, w: 14, h: 14, size: 7, vx: 0, vy: 0, damage: 3, life: 1 });
    game.updateBullets(1 / 120); equal(boss.hp, hp - 3);
  });
  test("Nach Boss-Sieg wird die Flagge freigegeben und das Spiel gewonnen", () => {
    const game = ready(4); const boss = game.level.boss; boss.active = true;
    for (let n = 0; n < boss.maxHp / 2; n++) { boss.invulnerable = 0; game.damageBoss(2); }
    equal(boss.hp, 0); assert(!boss.alive, "Boss muss besiegt sein."); equal(game.waves.length, 0);
    game.player.x = game.level.exit; game.update(1 / 120); equal(game.state, "victory");
  });
  test("Alle fünf Welten lassen sich vom Start bis zur Flagge durchspielen", () => {
    LEVELS.forEach((config, index) => {
      const game = ready(index);
      game.level.enemies.forEach(e => { e.alive = false; });
      if (game.level.boss) game.level.boss.alive = false;
      let jumps = 0;
      for (let n = 0; n < 120 * 50 && game.state === "playing"; n++) {
        const p = game.player;
        const obstacle = game.level.platforms.some(platform => !platform.ground && platform.x >= p.x + p.w && platform.x - p.x - p.w < 65);
        const gap = game.level.gaps.some(g => g.x > p.x && g.x - p.x - p.w < 64);
        const jump = p.grounded && !game.jumpWasDown && (obstacle || gap);
        if (jump) jumps++;
        game.update(1 / 120, { right: true, jump: jump || (!p.grounded && game.jumpWasDown) });
      }
      assert(["levelComplete", "victory"].includes(game.state), `${config.name}: Ziel nicht erreicht (${game.state}, x=${Math.round(game.player.x)}, y=${Math.round(game.player.y)}).`);
      equal(game.lives, 3, config.name + ": Kein unvermeidbarer Sturz."); assert(jumps >= 4, "Hindernisse erfordern Sprünge.");
    });
  });
  document.getElementById("summary").textContent = `${passed} bestanden, ${failed} fehlgeschlagen.`;
  document.title = `${failed ? "FEHLER" : "OK"} – ${passed}/${passed + failed} Gipfelsprung-Tests`;
  globalThis.testResults = { passed, failed, tests: results };
})();
