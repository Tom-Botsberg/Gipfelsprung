(function () {
  "use strict";
  const { WIDTH, HEIGHT, GROUND, SKINS, LEVELS, clamp } = Gipfelsprung;

  function rect(ctx, color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function polygon(ctx, color, points) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fill();
  }
  function cloud(ctx, x, y, size = 1) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(size, size);
    rect(ctx, "#fffef6a8", 0, 12, 100, 17);
    rect(ctx, "#fffef6a8", 14, 3, 35, 10);
    rect(ctx, "#fffef6a8", 42, -4, 33, 17);
    rect(ctx, "#fffef6a8", 75, 8, 15, 5);
    ctx.restore();
  }
  function mountain(ctx, x, baseline, width, height, color, snow) {
    const peak = x + width * 0.48;
    polygon(ctx, color, [[x, baseline], [x + width * .16, baseline - height * .32], [x + width * .26, baseline - height * .41], [peak - 17, baseline - height + 24], [peak, baseline - height], [peak + 23, baseline - height + 38], [x + width * .74, baseline - height * .5], [x + width, baseline]]);
    if (snow) {
      polygon(ctx, snow, [[peak - width * .15, baseline - height * .63], [peak - 17, baseline - height + 24], [peak, baseline - height], [peak + 23, baseline - height + 38], [peak + width * .16, baseline - height * .66], [peak + width * .065, baseline - height * .72], [peak + width * .03, baseline - height * .65], [peak - width * .02, baseline - height * .8], [peak - width * .075, baseline - height * .72]]);
    }
    polygon(ctx, "#ffffff12", [[peak, baseline - height], [x + width * .74, baseline - height * .5], [x + width, baseline], [peak + 22, baseline]]);
  }
  function tree(ctx, x, y, size = 1, snowy = false) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(size, size);
    rect(ctx, "#6b6d4e", -5, -12, 10, 28);
    polygon(ctx, "#496e59", [[-36, 0], [-17, -34], [-28, -34], [-9, -64], [-18, -64], [0, -97], [18, -64], [9, -64], [28, -34], [17, -34], [36, 0]]);
    polygon(ctx, "#638268", [[0, -97], [18, -64], [9, -64], [28, -34], [17, -34], [36, 0], [0, 0]]);
    if (snowy) {
      polygon(ctx, "#e1e9e7", [[0, -97], [-13, -74], [0, -80], [12, -74]]);
      polygon(ctx, "#e1e9e7", [[-8, -61], [-23, -42], [0, -48], [22, -42], [8, -61]]);
    }
    ctx.restore();
  }
  function windows(ctx, x, y, columns, rows, color = "#7b9389") {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        rect(ctx, color, x + col * 19, y + row * 24, 7, 12);
        rect(ctx, "#eef0db", x + col * 19 + 3, y + row * 24, 1, 12);
      }
    }
  }
  function clock(ctx, x, y, radius) {
    ctx.fillStyle = "#ece6c9";
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    rect(ctx, "#566655", x - 1, y - radius + 4, 2, radius - 4);
    rect(ctx, "#566655", x, y, radius - 4, 2);
    for (let n = 0; n < 4; n++) {
      const a = n * Math.PI / 2;
      rect(ctx, "#83917c", x + Math.cos(a) * (radius - 3) - 1, y + Math.sin(a) * (radius - 3) - 1, 2, 2);
    }
  }
  function abbey(ctx, x, y) {
    rect(ctx, "#c8ccad", x - 105, y - 100, 210, 100);
    polygon(ctx, "#978b70", [[x - 116, y - 100], [x, y - 164], [x + 116, y - 100]]);
    rect(ctx, "#dce0c7", x - 54, y - 108, 108, 108);
    windows(ctx, x - 38, y - 88, 5, 3);
    for (const dir of [-1, 1]) {
      const tx = x + dir * 90;
      rect(ctx, "#dce0c5", tx - 22, y - 181, 44, 181);
      rect(ctx, "#b2b99b", tx - 26, y - 188, 52, 10);
      rect(ctx, "#d0d6b7", tx - 18, y - 223, 36, 36);
      polygon(ctx, "#738f77", [[tx - 26, y - 223], [tx - 16, y - 241], [tx - 10, y - 253], [tx, y - 260], [tx + 10, y - 253], [tx + 16, y - 241], [tx + 26, y - 223]]);
      rect(ctx, "#647b63", tx - 2, y - 274, 4, 17);
      rect(ctx, "#647b63", tx - 7, y - 270, 14, 3);
      clock(ctx, tx, y - 201, 10);
      windows(ctx, tx - 12, y - 165, 2, 5, "#7d9279");
    }
    rect(ctx, "#7b8b72", x - 12, y - 36, 24, 36);
    polygon(ctx, "#b6c09d", [[x - 36, y - 108], [x, y - 134], [x + 36, y - 108]]);
  }
  function zurich(ctx, x, y) {
    for (const offset of [-75, 35]) {
      rect(ctx, "#c8c8b2", x + offset, y - 215, 43, 215);
      rect(ctx, "#a9b5a2", x + offset - 5, y - 226, 53, 12);
      polygon(ctx, "#9e8d77", [[x + offset - 4, y - 226], [x + offset + 21, y - 257], [x + offset + 46, y - 226]]);
      windows(ctx, x + offset + 9, y - 195, 2, 7);
    }
    rect(ctx, "#dbd8bb", x - 95, y - 116, 210, 116);
    polygon(ctx, "#a58973", [[x - 109, y - 116], [x + 10, y - 176], [x + 128, y - 116]]);
    windows(ctx, x - 70, y - 95, 9, 3);
  }
  function bern(ctx, x, y) {
    rect(ctx, "#b5b59c", x - 40, y - 198, 80, 198);
    rect(ctx, "#d5d0ae", x - 32, y - 220, 64, 30);
    polygon(ctx, "#8d7b69", [[x - 53, y - 220], [x, y - 289], [x + 53, y - 220]]);
    rect(ctx, "#768675", x - 4, y - 307, 8, 21);
    clock(ctx, x, y - 154, 26);
    rect(ctx, "#8a927a", x - 19, y - 72, 38, 72);
    clock(ctx, x, y - 86, 13);
    for (const dir of [-1, 1]) {
      const bx = x + dir * 130 - 45;
      rect(ctx, "#c1c4a8", bx, y - 114, 90, 114);
      polygon(ctx, "#a38d72", [[bx - 9, y - 114], [bx + 45, y - 149], [bx + 99, y - 114]]);
      windows(ctx, bx + 15, y - 93, 4, 3);
    }
  }
  function lucerne(ctx, x, y) {
    rect(ctx, "#b6b49b", x - 25, y - 151, 65, 151);
    polygon(ctx, "#987f6b", [[x - 38, y - 151], [x + 7, y - 218], [x + 53, y - 151]]);
    windows(ctx, x - 11, y - 124, 2, 3);
    for (let i = 0; i < 9; i++) {
      rect(ctx, "#a49b7c", x - 186 + i * 41, y - 48, 7, 70);
      rect(ctx, "#c4bb95", x - 186 + i * 41, y - 45, 37, 6);
      polygon(ctx, "#9c8369", [[x - 194 + i * 41, y - 51], [x - 168 + i * 41, y - 73], [x - 142 + i * 41, y - 51]]);
    }
    rect(ctx, "#8a937d", x - 188, y - 3, 376, 8);
  }
  function chalet(ctx, x, y) {
    rect(ctx, "#c8c3a6", x - 57, y - 78, 114, 78);
    rect(ctx, "#a19175", x - 57, y - 78, 114, 30);
    polygon(ctx, "#766d62", [[x - 73, y - 78], [x, y - 129], [x + 73, y - 78]]);
    polygon(ctx, "#edf0e7", [[x - 76, y - 80], [x, y - 134], [x + 76, y - 80], [x + 44, y - 91], [x, y - 118], [x - 44, y - 91]]);
    windows(ctx, x - 37, y - 62, 4, 2, "#6c7d72");
    rect(ctx, "#887d64", x - 8, y - 29, 16, 29);
  }
  function village(ctx, camera, level) {
    const offset = camera * 0.28;
    const styles = [abbey, zurich, bern, lucerne, chalet];
    for (let n = -1; n < 5; n++) {
      const x = n * 930 + 650 - offset;
      if (x < -350 || x > WIDTH + 350) continue;
      for (let j = -2; j < 3; j++) {
        if (j === 0) continue;
        const hx = x + j * 135;
        const roof = level.index === 4 ? "#a5afb0" : "#b39b7b";
        const h = 70 + (j + 2) % 3 * 16;
        rect(ctx, "#c4cbb0", hx - 36, 456 - h, 72, h);
        polygon(ctx, roof, [[hx - 43, 456 - h], [hx, 428 - h], [hx + 43, 456 - h]]);
        windows(ctx, hx - 23, 469 - h, 3, 2);
      }
      styles[level.index](ctx, x, 456);
    }
  }

  function background(ctx, level, camera, time = 0) {
    rect(ctx, level.sky, 0, 0, WIDTH, HEIGHT);
    rect(ctx, "#f7edd1", 1020 - camera * .025, 73, 52, 52);
    rect(ctx, "#f7edd1", 1010 - camera * .025, 83, 72, 32);
    for (let n = 0; n < 6; n++) {
      const x = ((n * 306 - camera * .06 + time * 2) % (WIDTH + 250) + WIDTH + 250) % (WIDTH + 250) - 130;
      cloud(ctx, x, 65 + (n % 3) * 47, .65 + (n % 2) * .4);
    }
    const snow = level.index === 4 ? "#f0f3f0" : "#f2f0e2";
    for (let n = -1; n < 6; n++) {
      mountain(ctx, n * 390 - camera * .08, 460, 620, 280 + (n % 3) * 45, level.far, snow);
    }
    for (let n = -1; n < 6; n++) {
      mountain(ctx, n * 370 - camera * .16, 490, 570, 140 + (n % 2) * 37, level.near, level.index === 4 ? "#dce5e4" : null);
    }
    if (level.index === 1 || level.index === 3) {
      rect(ctx, "#99bfc0", 0, 421, WIDTH, 99);
      for (let n = 0; n < 26; n++) rect(ctx, "#d7e5d461", (n * 119 - camera * .35) % WIDTH, 432 + (n % 4) * 15, 32 + n % 3 * 16, 2);
    }
    village(ctx, camera, level);
    for (let n = -1; n < 13; n++) {
      const x = n * 161 - camera * .42 % 161;
      if (n % 3 !== 0) tree(ctx, x, 505, .44 + (n % 3) * .13, level.index === 4);
    }
    if (level.index !== 1 && level.index !== 3) {
      polygon(ctx, level.index === 4 ? "#b3c2c0" : "#9cb686", [[0, 501], [250, 481], [480, 503], [700, 486], [990, 497], [1280, 475], [1280, HEIGHT], [0, HEIGHT]]);
    }
  }

  function playerSprite(ctx, x, y, skin, { facing = 1, walking = 0, airborne = false, scale = 2, faded = false } = {}) {
    ctx.save();
    ctx.globalAlpha = faded ? 0.35 : 1;
    ctx.translate(Math.round(x + 13), Math.round(y));
    ctx.scale(facing * scale, scale);
    ctx.translate(-7, 0);
    const step = airborne ? 2 : Math.floor(walking / 22) % 2 ? 2 : 0;
    if (skin.appearance === "hiker" || skin.appearance === "climber") {
      rect(ctx, skin.pack, -3, 10, 6, 9);
      rect(ctx, "#395c4b", -3, 12, 2, 5);
      if (skin.appearance === "climber") {
        rect(ctx, "#dce6d0", -4, 9, 7, 3);
        rect(ctx, skin.pack, -5, 14, 3, 5);
      }
    }
    if (skin.appearance === "explorer") {
      const swing = airborne ? -1 : step;
      rect(ctx, skin.hair, -2, 3 + swing, 6, 4);
      rect(ctx, skin.hair, -4, 5 + swing, 4, 5);
      rect(ctx, skin.hat, 0, 3 + swing, 2, 3);
    }
    rect(ctx, skin.hair, 2, 3, 10, 7);
    rect(ctx, skin.skin, 5, 4, 8, 6);
    rect(ctx, skin.skin, 12, 6, 2, 3);
    rect(ctx, "#263e35", 10, 5, 1, 2);
    rect(ctx, skin.hair, 3, 4, 3, 5);
    rect(ctx, skin.coat, 2, 10, 10, 7);
    rect(ctx, skin.light, 8, 10, 4, 7);
    rect(ctx, skin.coat, 10, 11, 4, 5);
    rect(ctx, skin.skin, 12, 15, 3, 3);
    rect(ctx, skin.pants, 3, 17, 4, 5 - step);
    rect(ctx, skin.pants, 8, 17, 4, 3 + step);
    rect(ctx, "#33463e", 2, 21 - step, 6, 2);
    rect(ctx, "#33463e", 8, 19 + step, 6, 2);
    switch (skin.appearance) {
      case "hiker":
        rect(ctx, skin.hat, 2, 0, 9, 4);
        rect(ctx, "#9d793a", 2, 3, 10, 1);
        rect(ctx, skin.hat, -1, 4, 16, 2);
        rect(ctx, "#fff1c8", 8, 0, 2, 2);
        rect(ctx, skin.hair, 1, 6, 3, 7);
        rect(ctx, skin.hair, 2, 12, 3, 3 + step);
        rect(ctx, skin.hat, 2, 14 + step, 3, 1);
        rect(ctx, "#fff1c8", 6, 10, 2, 5);
        rect(ctx, skin.pack, 3, 10, 2, 7);
        rect(ctx, "#a97d4a", 2, 22 - step, 6, 1);
        rect(ctx, "#a97d4a", 8, 20 + step, 6, 1);
        break;
      case "hoodie":
        rect(ctx, skin.coat, 0, 3, 5, 9);
        rect(ctx, skin.light, 1, 3, 3, 6);
        rect(ctx, skin.coat, 1, 11, 12, 7);
        rect(ctx, skin.light, 4, 15, 6, 2);
        rect(ctx, "#f5ebcd", 6, 11, 1, 3);
        rect(ctx, "#f5ebcd", 9, 11, 1, 3);
        rect(ctx, skin.hair, 4, 1, 8, 3);
        rect(ctx, skin.hair, 3, 0, 3, 3);
        rect(ctx, "#33463e", 4, 0, 2, 6);
        rect(ctx, skin.hat, 2, 5, 4, 4);
        rect(ctx, "#edb58a", 3, 6, 2, 2);
        rect(ctx, "#f5ebcd", 2, 21 - step, 6, 2);
        rect(ctx, "#f5ebcd", 8, 19 + step, 6, 2);
        break;
      case "climber":
        rect(ctx, skin.hat, 1, 1, 12, 4);
        rect(ctx, skin.hat, 3, -1, 8, 3);
        rect(ctx, "#e1d8b2", 6, -3, 4, 3);
        rect(ctx, "#dce8df", 1, 4, 12, 2);
        rect(ctx, "#345967", 6, 5, 8, 3);
        rect(ctx, "#b2e0df", 7, 5, 3, 2);
        rect(ctx, "#e0f1e7", 11, 5, 2, 1);
        rect(ctx, "#b34e3d", 3, 9, 10, 3);
        rect(ctx, "#d87854", -3, 10 + step, 7, 2);
        rect(ctx, "#b34e3d", -3, 11 + step, 3, 2);
        rect(ctx, skin.light, 3, 13, 9, 1);
        rect(ctx, skin.light, 3, 16, 9, 1);
        rect(ctx, "#886b48", 2, 17, 11, 2);
        rect(ctx, "#e6ce89", 7, 16, 3, 3);
        rect(ctx, "#33463e", 12, 15, 3, 3);
        break;
      case "sport":
        rect(ctx, skin.hair, 2, 1, 11, 3);
        rect(ctx, skin.hair, 3, -2, 3, 4);
        rect(ctx, skin.hair, 7, -1, 2, 3);
        rect(ctx, skin.hair, 10, 0, 2, 2);
        rect(ctx, skin.hat, 2, 3, 11, 2);
        rect(ctx, skin.hat, 0, 4, 3, 2);
        rect(ctx, "#f4eddd", 5, 10, 6, 1);
        rect(ctx, "#f4eddd", 2, 11, 2, 4);
        rect(ctx, "#f4eddd", 7, 12, 4, 1);
        rect(ctx, "#f4eddd", 9, 13, 1, 3);
        rect(ctx, skin.skin, 11, 13, 3, 3);
        rect(ctx, skin.pants, 2, 17, 11, 2);
        rect(ctx, skin.skin, 3, 19, 4, 3 - step);
        rect(ctx, skin.skin, 8, 19, 4, 1 + step);
        rect(ctx, "#f4eddd", 3, 20 - step, 4, 1);
        rect(ctx, "#f4eddd", 8, 18 + step, 4, 1);
        rect(ctx, skin.hat, 2, 22 - step, 6, 1);
        rect(ctx, skin.hat, 8, 20 + step, 6, 1);
        break;
      case "explorer":
        rect(ctx, skin.hair, 2, 1, 11, 3);
        rect(ctx, skin.hair, 4, 0, 7, 1);
        rect(ctx, skin.hair, 2, 3, 4, 5);
        rect(ctx, skin.hat, 4, 2, 9, 1);
        rect(ctx, "#e8d4a2", 11, 1, 2, 3);
        rect(ctx, "#f4eddd", 5, 10, 5, 5);
        rect(ctx, skin.coat, 0, 15, 7, 4);
        rect(ctx, skin.light, 8, 15, 5, 4);
        rect(ctx, skin.pack, 4, 11, 2, 6);
        rect(ctx, skin.pack, 0, 16, 6, 5);
        rect(ctx, "#f3d9a1", 1, 17, 4, 1);
        rect(ctx, "#f3d9a1", 2, 18, 1, 2);
        rect(ctx, skin.hat, 11, 14, 3, 2);
        break;
      default:
        throw new Error("Unbekanntes Figurenoutfit: " + skin.appearance);
    }
    ctx.restore();
  }

  function enemySprite(ctx, enemy, time) {
    const x = Math.round(enemy.x), y = Math.round(enemy.y);
    const step = Math.floor(time * 6 + enemy.phase) % 2;
    rect(ctx, "#4a635036", x - 2, y + 29, 37, 5);
    rect(ctx, "#657e67", x + 3, y + 7, 27, 21);
    rect(ctx, "#8b9b76", x + 7, y + 3, 19, 8);
    rect(ctx, "#d49761", x + 4, y + 4, 24, 5);
    rect(ctx, "#b97e51", x + 9, y, 14, 5);
    rect(ctx, "#b8c5a0", x + 7, y + 12, 21, 9);
    rect(ctx, "#29473e", x + (enemy.dir > 0 ? 17 : 9), y + 13, 3, 4);
    rect(ctx, "#29473e", x + (enemy.dir > 0 ? 24 : 16), y + 13, 3, 4);
    rect(ctx, "#3a554b", x + 5, y + 27, 8, 5 - step * 2);
    rect(ctx, "#3a554b", x + 22, y + 27, 8, 3 + step * 2);
    rect(ctx, "#d6c291", x, y + 15, 5, 7);
  }

  function bossSprite(ctx, boss, time) {
    if (boss.invulnerable > 0 && Math.floor(time * 22) % 2) ctx.globalAlpha = .5;
    const { x, y, w, h } = boss;
    rect(ctx, "#43575e24", x - 10, GROUND - 5, w + 20, 10);
    rect(ctx, "#657a82", x + 8, y + 38, w - 16, 53);
    rect(ctx, "#8ca2a4", x + 18, y + 39, w - 31, 45);
    rect(ctx, "#687e84", x - 11, y + 42, 24, 40);
    rect(ctx, "#8b9da0", x + w - 11, y + 42, 24, 40);
    rect(ctx, "#dce7e4", x - 11, y + 40, 24, 9);
    rect(ctx, "#dce7e4", x + w - 11, y + 40, 24, 9);
    rect(ctx, "#526b74", x + 10, y + 86, 24, 24);
    rect(ctx, "#526b74", x + 53, y + 86, 24, 24);
    rect(ctx, "#405b65", x + 6, y + 103, 30, 7);
    rect(ctx, "#405b65", x + 52, y + 103, 31, 7);
    rect(ctx, "#97aaab", x + 15, y + 5, 57, 34);
    rect(ctx, "#d9e3de", x + 11, y + 2, 65, 12);
    rect(ctx, "#e7ede6", x + 23, y - 6, 40, 12);
    rect(ctx, "#c7cfbc", x + 4, y - 4, 10, 25);
    rect(ctx, "#c7cfbc", x + 72, y - 4, 10, 25);
    rect(ctx, "#c7cfbc", x - 2, y - 15, 10, 17);
    rect(ctx, "#c7cfbc", x + 79, y - 15, 10, 17);
    rect(ctx, "#294f5b", x + 23, y + 19, 13, 10);
    rect(ctx, "#294f5b", x + 51, y + 19, 13, 10);
    rect(ctx, boss.warning ? "#f2ae54" : "#f5d477", x + 25, y + 20, 9, 5);
    rect(ctx, boss.warning ? "#f2ae54" : "#f5d477", x + 53, y + 20, 9, 5);
    rect(ctx, "#526e75", x + 36, y + 33, 16, 4);
    polygon(ctx, "#e5d28f", [[x + 43, y + 46], [x + 54, y + 60], [x + 43, y + 76], [x + 32, y + 60]]);
    rect(ctx, "#fff1c9", x + 41, y + 54, 4, 12);
    if (boss.warning) {
      ctx.fillStyle = "#d57148"; ctx.font = "bold 30px Segoe UI"; ctx.textAlign = "center"; ctx.fillText("!", x + w / 2, y - 30);
    }
    ctx.globalAlpha = 1;
  }

  function terrain(ctx, game) {
    const { level, camera } = game;
    for (const p of level.platforms) {
      if (p.x + p.w < camera || p.x > camera + WIDTH) continue;
      const left = Math.max(p.x, camera - 32), right = Math.min(p.x + p.w, camera + WIDTH + 32);
      rect(ctx, p.ground ? level.earth : "#aa9776", left, p.y, right - left, p.h);
      rect(ctx, p.ground ? "#ffffff15" : "#ffffff20", left, p.y + 13, right - left, 5);
      rect(ctx, level.ground, left, p.y, right - left, 10);
      rect(ctx, level.index === 4 ? "#f4f4e9" : "#a8bc79", left, p.y, right - left, 4);
      for (let x = Math.floor(left / 32) * 32; x < right; x += 32) {
        const offset = Math.abs(Math.floor(x / 32)) % 3;
        if (x >= p.x && x + 9 < p.x + p.w) {
          rect(ctx, "#6d725e30", x + 5, p.y + 27 + offset * 10, 9, 4);
          if (p.ground) rect(ctx, "#d9c59e50", x + 15, p.y + 81 + offset * 9, 12, 5);
          if (level.index !== 4) rect(ctx, "#6c8c514a", x + 9, p.y + 4, 4, 9);
        }
      }
      if (!p.ground) {
        rect(ctx, "#827a602e", p.x + p.w - 8, p.y + 10, 8, p.h - 10);
        rect(ctx, "#d2bd915e", p.x, p.y + 13, 5, p.h - 13);
      }
    }
    for (const gap of level.gaps) {
      if (gap.x > camera + WIDTH || gap.x + gap.w < camera) continue;
      rect(ctx, level.index === 4 ? "#7e9ca8" : "#84b0b4", gap.x, GROUND + 75, gap.w, 70);
      for (let j = 0; j < 5; j++) rect(ctx, "#d2e8dd75", gap.x + 10 + j * 18, GROUND + 83 + j % 2 * 18, 12, 3);
    }
  }

  function flag(ctx, x, y, locked, time) {
    rect(ctx, "#526a58", x, y - 155, 5, 155);
    rect(ctx, "#d4c7a5", x - 3, y - 159, 11, 7);
    const wave = Math.sin(time * 3) * 3;
    polygon(ctx, locked ? "#8b9b94" : "#da6148", [[x + 5, y - 150], [x + 67, y - 150 + wave], [x + 67, y - 108 + wave], [x + 5, y - 108]]);
    rect(ctx, "#fff7e6", x + 29, y - 143, 10, 27);
    rect(ctx, "#fff7e6", x + 20, y - 135, 28, 10);
    rect(ctx, "#c8c7a7", x - 12, y - 5, 31, 5);
  }

  function bombSprite(ctx, x, y, lit) {
    rect(ctx, "#e4bd70", x - 3, y - 14, 6, 6);
    rect(ctx, "#c38b49", x + 1, y - 17, 7, 4);
    rect(ctx, "#35494e", x - 8, y - 7, 16, 15);
    rect(ctx, "#35494e", x - 10, y - 3, 20, 7);
    rect(ctx, "#61777a", x - 6, y - 5, 6, 4);
    rect(ctx, "#e6bd64", x - 3, y - 1, 6, 6);
    rect(ctx, lit ? "#f5d477" : "#b48a51", x + 7, y - 20, 4, 5);
    if (lit) rect(ctx, "#e48b48", x + 10, y - 19, 3, 3);
  }

  function render(ctx, game) {
    if (!game.level) return;
    const { level, camera, player: p, elapsed: time } = game;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    background(ctx, level, camera, time);
    ctx.save();
    ctx.translate(-Math.floor(camera), 0);
    terrain(ctx, game);
    for (let n = 0; n < 14; n++) {
      const x = 245 + n * 351;
      if (x < camera - 60 || x > camera + WIDTH + 60 || level.gaps.some(g => x > g.x - 35 && x < g.x + g.w + 35) || level.platforms.some(b => !b.ground && x > b.x - 30 && x < b.x + b.w + 30)) continue;
      if (n % 4 === 0) tree(ctx, x, GROUND - 4, .55, level.index === 4);
      else {
        rect(ctx, "#6d9156", x, GROUND - 14, 3, 14);
        rect(ctx, level.index === 4 ? "#f1f0df" : "#eedeb4", x - 2, GROUND - 17, 7, 6);
        rect(ctx, "#b4aa5b", x, GROUND - 15, 3, 3);
      }
    }
    rect(ctx, "#8a7b5d", 42, GROUND - 65, 5, 65);
    rect(ctx, "#e8dfbf", 16, GROUND - 79, 94, 29);
    ctx.font = "bold 11px Segoe UI"; ctx.fillStyle = "#4f654d"; ctx.textAlign = "center";
    ctx.fillText(level.name.toUpperCase(), 63, GROUND - 60);
    for (const pickup of level.bombPickups) {
      if (pickup.collected || pickup.x < camera - 45 || pickup.x > camera + WIDTH + 45) continue;
      const y = pickup.y + Math.sin(time * 2.5) * 3;
      ctx.fillStyle = "#efcf7a40";
      ctx.beginPath(); ctx.arc(pickup.x, y - 3, 23, 0, Math.PI * 2); ctx.fill();
      bombSprite(ctx, pickup.x, y, false);
      rect(ctx, "#e4bd70", pickup.x - 27, y - 10, 4, 4);
      rect(ctx, "#e4bd70", pickup.x + 23, y + 4, 4, 4);
      ctx.font = "bold 9px Segoe UI"; ctx.fillStyle = "#88622e"; ctx.textAlign = "center";
      ctx.fillText("SELTEN · BOMBE", pickup.x, y - 30);
    }
    for (const pack of level.ammoPacks) {
      if (pack.collected || pack.x < camera - 25 || pack.x > camera + WIDTH + 25) continue;
      const y = pack.y + Math.sin(time * 3 + pack.x) * 2;
      rect(ctx, "#355e4d", pack.x - 12, y - 10, 24, 21);
      rect(ctx, "#83a77b", pack.x - 10, y - 8, 20, 17);
      rect(ctx, "#dce6c1", pack.x - 13, y - 12, 26, 5);
      rect(ctx, "#e8d39b", pack.x - 6, y - 3, 4, 10);
      rect(ctx, "#e8d39b", pack.x + 3, y - 3, 4, 10);
      ctx.font = "bold 9px Segoe UI"; ctx.fillStyle = "#355e4d"; ctx.textAlign = "center";
      ctx.fillText("+10", pack.x, y - 18);
    }
    for (const coin of level.coins) {
      if (coin.collected || coin.x < camera - 20 || coin.x > camera + WIDTH + 20) continue;
      const squeeze = .65 + Math.abs(Math.sin(time * 2.8 + coin.x * .01)) * .35;
      ctx.save(); ctx.translate(Math.round(coin.x), Math.round(coin.y + Math.sin(time * 3 + coin.x * .02) * 2)); ctx.scale(squeeze, 1);
      rect(ctx, "#ae8135", -9, -8, 18, 16); rect(ctx, "#eabd48", -7, -11, 14, 22); rect(ctx, "#f9d977", -5, -8, 9, 16); rect(ctx, "#cc9c36", 0, -5, 2, 10); rect(ctx, "#fff0a3", -5, -7, 2, 10);
      ctx.restore();
    }
    for (const enemy of level.enemies) if (enemy.alive && enemy.x > camera - 60 && enemy.x < camera + WIDTH + 60) enemySprite(ctx, enemy, time);
    flag(ctx, level.exit, GROUND, Boolean(level.boss?.alive), time);
    if (level.boss?.alive) bossSprite(ctx, level.boss, time);
    for (const wave of game.waves) {
      polygon(ctx, "#e2d29b", [[wave.x, wave.y + wave.h], [wave.x + 7, wave.y + 4], [wave.x + 13, wave.y + 9], [wave.x + 21, wave.y], [wave.x + 30, wave.y + wave.h]]);
      rect(ctx, "#f5ecc7", wave.x + 7, wave.y + 11, 13, 6);
    }
    for (const bullet of game.bullets) {
      rect(ctx, "#ffffff70", bullet.x - Math.sign(bullet.vx) * 16 - 4, bullet.y - 2, 12, 4);
      rect(ctx, bullet.color, bullet.x - bullet.size, bullet.y - bullet.size, bullet.size * 2, bullet.size * 2);
      rect(ctx, "#ffffff99", bullet.x - bullet.size + 2, bullet.y - bullet.size + 2, bullet.size - 1, 3);
    }
    for (const bomb of game.thrownBombs) bombSprite(ctx, bomb.x + bomb.w / 2, bomb.y + bomb.h / 2, true);
    rect(ctx, "#34564324", p.x - 3, p.y + p.h - 3, p.w + 6, 7);
    playerSprite(ctx, p.x, p.y - 2, SKINS[game.skinIndex], { facing: p.facing, walking: p.walk, airborne: !p.grounded, faded: p.invulnerable > 0 && Math.floor(time * 12) % 2 === 0 });
    for (const blast of game.explosions) {
      const progress = 1 - blast.life / .35;
      ctx.save();
      ctx.globalAlpha = (1 - progress) * .65;
      ctx.fillStyle = "#edc16e";
      ctx.strokeStyle = "#d67c42";
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(blast.x, blast.y, blast.radius * Math.min(1, .6 + progress), 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    for (const particle of game.particles) {
      ctx.globalAlpha = clamp(particle.life * 3, 0, 1);
      rect(ctx, particle.color, particle.x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    if (camera < 80 && game.state === "playing") {
      ctx.textAlign = "left"; ctx.font = "12px Segoe UI"; ctx.fillStyle = "#426554";
      ctx.fillText("← →  LAUFEN       LEERTASTE  SPRINGEN       F  SCHIESSEN       B  BOMBE", 35, HEIGHT - 34);
    }
    ctx.textAlign = "right"; ctx.font = "bold 10px Segoe UI"; ctx.fillStyle = "#f7f1df99";
    ctx.fillText("GIPFELSPRUNG  /  " + String(level.index + 1).padStart(2, "0"), WIDTH - 24, HEIGHT - 21);
  }

  function preview(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.save(); ctx.scale(canvas.width / WIDTH, canvas.height / HEIGHT);
    const level = { ...LEVELS[0], index: 0 };
    background(ctx, level, 0);
    rect(ctx, "#b7a481", 0, 520, WIDTH, 120);
    rect(ctx, "#8ca66d", 0, 520, WIDTH, 12);
    rect(ctx, "#b7c68b", 0, 520, WIDTH, 4);
    for (let x = 0; x < WIDTH; x += 36) {
      rect(ctx, "#7f8d5d60", x + 5, 535 + x % 4 * 3, 10, 4);
      rect(ctx, "#e5cd9d40", x + 10, 590 - x % 3 * 8, 14, 5);
    }
    tree(ctx, 110, 512, 1.1); tree(ctx, 1150, 514, .9);
    rect(ctx, "#b2a07c", 840, 451, 105, 69); rect(ctx, "#87a16a", 840, 451, 105, 9);
    rect(ctx, "#b2a07c", 975, 402, 100, 118); rect(ctx, "#87a16a", 975, 402, 100, 9);
    playerSprite(ctx, 487, 435, SKINS[0], { scale: 3.6, airborne: true });
    for (let i = 0; i < 5; i++) {
      const x = 615 + i * 55, y = 436 - Math.sin(i / 4 * Math.PI) * 60;
      rect(ctx, "#ae8135", x, y, 16, 23); rect(ctx, "#efc653", x + 2, y - 2, 12, 26); rect(ctx, "#ffe391", x + 4, y + 2, 3, 16);
    }
    flag(ctx, 1008, 402, false, 0);
    ctx.restore();
  }

  function portrait(canvas, index) {
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    rect(ctx, "#193f3515", 44, 110, 65, 5);
    playerSprite(ctx, 63, 17, SKINS[index], { scale: 4 });
    rect(ctx, "#ffffff70", 29, 45, 5, 5); rect(ctx, "#ffffff70", 27, 47, 9, 1);
    rect(ctx, "#ffffff70", 119, 72, 5, 5); rect(ctx, "#ffffff70", 117, 74, 9, 1);
  }
  globalThis.GipfelsprungArt = { render, preview, portrait, playerSprite };
})();
