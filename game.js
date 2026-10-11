/* =========================================================
   MINI SHOOTER 2D — VISTA CENITAL
   WASD/Flechas: moverse | Ratón: apuntar y disparar
   Espacio / Clic derecho: habilidad especial
   ========================================================= */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
}
window.addEventListener('resize', resize);
resize();

/* ---------------- Utilidades ---------------- */
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------------- Entrada ---------------- */
const keys = {};
const mouse = { x: W / 2, y: H / 2, down: false };

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyR' && (state === 'over' || state === 'menu')) startGame();
  if ((e.code === 'Space' || e.code === 'KeyE') && state === 'playing') tryAbility();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

canvas.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
canvas.addEventListener('mousedown', e => {
  if (e.button === 0) {
    mouse.down = true;
    if (state === 'menu' || state === 'over') startGame();
  }
  if (e.button === 2 && state === 'playing') tryAbility();
});
window.addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

/* ---------------- Constantes del mundo ---------------- */
const WORLD = { w: 2600, h: 2600 };
const PLAYER_SPEED = 270;
const FIRE_COOLDOWN = 0.13;
const BULLET_SPEED = 720;
const ABILITY_KILLS = 8;      // kills necesarios para cargar la habilidad
const ABILITY_RADIUS = 260;

/* ---------------- Estado del juego ---------------- */
let state = 'menu';           // menu | playing | over
let player, bullets, enemies, particles, texts, rings;
let score, kills, abilityCharge, elapsed, spawnTimer, shake, best;
let cam = { x: 0, y: 0 };

best = Number(localStorage.getItem('shooter2d_best') || 0);

const ENEMY_TYPES = {
  grunt: { r: 15, hp: 2, speed: 78,  color: '#e35d5d', score: 10, dmg: 1 },
  runner:{ r: 11, hp: 1, speed: 165, color: '#f0a63c', score: 15, dmg: 1 },
  tank:  { r: 24, hp: 7, speed: 48,  color: '#9b5de5', score: 30, dmg: 1 },
};

function startGame() {
  state = 'playing';
  player = {
    x: WORLD.w / 2, y: WORLD.h / 2,
    r: 14, hp: 3, maxHp: 3,
    angle: 0, cooldown: 0, invuln: 0,
  };
  bullets = [];
  enemies = [];
  particles = [];
  texts = [];
  rings = [];
  score = 0;
  kills = 0;
  abilityCharge = 0;
  elapsed = 0;
  spawnTimer = 0.8;
  shake = 0;
  mouse.down = false;
}

/* ---------------- Partículas y textos ---------------- */
function burst(x, y, color, n, speed = 220, life = 0.5, size = 3) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(speed * 0.25, speed);
    particles.push({
      x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: rand(life * 0.5, life), maxLife: life,
      color, size: rand(size * 0.5, size),
    });
  }
}

function floatText(x, y, str, color = '#ffd166', size = 18) {
  texts.push({ x, y, str, color, size, life: 0.9, maxLife: 0.9 });
}

/* ---------------- Habilidad ---------------- */
function tryAbility() {
  if (abilityCharge < ABILITY_KILLS || state !== 'playing') return;
  abilityCharge = 0;
  shake = Math.max(shake, 18);
  rings.push({ x: player.x, y: player.y, r: 10, maxR: ABILITY_RADIUS, life: 0.55, maxLife: 0.55 });
  burst(player.x, player.y, '#7ae7ff', 60, 520, 0.8, 5);

  for (const e of enemies) {
    const d = Math.sqrt(dist2(e.x, e.y, player.x, player.y));
    if (d < ABILITY_RADIUS) {
      const dmg = lerp(9, 3, clamp(d / ABILITY_RADIUS, 0, 1));
      damageEnemy(e, dmg, true);
      // empujón
      const ang = Math.atan2(e.y - player.y, e.x - player.x);
      const push = (1 - d / ABILITY_RADIUS) * 260;
      e.x += Math.cos(ang) * push;
      e.y += Math.sin(ang) * push;
    }
  }
  enemies = enemies.filter(e => !e.dead);
}

/* ---------------- Enemigos ---------------- */
function spawnEnemy() {
  let type = 'grunt';
  const r = Math.random();
  if (elapsed > 30 && r < 0.18) type = 'tank';
  else if (elapsed > 12 && r < 0.45) type = 'runner';
  const base = ENEMY_TYPES[type];

  // aparece fuera de la pantalla, cerca del jugador
  let x, y;
  const margin = 90;
  for (let i = 0; i < 20; i++) {
    const side = Math.floor(rand(0, 4));
    if (side === 0) { x = cam.x - margin + rand(0, W); y = cam.y - margin; }
    else if (side === 1) { x = cam.x - margin + rand(0, W); y = cam.y + H + margin; }
    else if (side === 2) { x = cam.x - margin; y = cam.y + rand(0, H); }
    else { x = cam.x + W + margin; y = cam.y + rand(0, H); }
    x = clamp(x, 30, WORLD.w - 30);
    y = clamp(y, 30, WORLD.h - 30);
    if (dist2(x, y, player.x, player.y) > 380 * 380) break;
  }

  const grow = 1 + elapsed * 0.01; // los enemigos se vuelven más resistentes con el tiempo
  enemies.push({
    type,
    x, y,
    r: base.r,
    hp: base.hp * grow,
    maxHp: base.hp * grow,
    speed: base.speed * (1 + elapsed * 0.008),
    color: base.color,
    score: base.score,
    wobble: rand(0, Math.PI * 2),
    hit: 0,
    dead: false,
    dmg: base.dmg,
  });
}

function damageEnemy(e, dmg, silent = false) {
  e.hp -= dmg;
  e.hit = 0.12;
  if (!silent) burst(e.x, e.y, e.color, 4, 150, 0.3, 2.5);
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    kills++;
    score += e.score;
    abilityCharge = Math.min(ABILITY_KILLS, abilityCharge + 1);
    burst(e.x, e.y, e.color, 16, 300, 0.6, 3.5);
    burst(e.x, e.y, '#ffffff', 6, 220, 0.35, 2);
    floatText(e.x, e.y - e.r - 6, '+' + e.score);
    shake = Math.max(shake, 4);
    if (abilityCharge === ABILITY_KILLS) floatText(player.x, player.y - 34, '¡HABILIDAD LISTA!', '#7ae7ff', 16);
  }
}

/* ---------------- Update ---------------- */
function update(dt) {
  if (state !== 'playing') return;
  elapsed += dt;

  /* --- jugador --- */
  let dx = 0, dy = 0;
  if (keys.KeyW || keys.ArrowUp) dy -= 1;
  if (keys.KeyS || keys.ArrowDown) dy += 1;
  if (keys.KeyA || keys.ArrowLeft) dx -= 1;
  if (keys.KeyD || keys.ArrowRight) dx += 1;
  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
    player.x = clamp(player.x + dx * PLAYER_SPEED * dt, player.r, WORLD.w - player.r);
    player.y = clamp(player.y + dy * PLAYER_SPEED * dt, player.r, WORLD.h - player.r);
    if (Math.random() < 0.35) {
      particles.push({
        x: player.x - dx * 12 + rand(-4, 4), y: player.y - dy * 12 + rand(-4, 4),
        vx: -dx * 40 + rand(-20, 20), vy: -dy * 40 + rand(-20, 20),
        life: 0.3, maxLife: 0.3, color: '#4a5568', size: 2.5,
      });
    }
  }

  // cámara mira al jugador
  const tx = clamp(player.x - W / 2, 0, Math.max(0, WORLD.w - W));
  const ty = clamp(player.y - H / 2, 0, Math.max(0, WORLD.h - H));
  cam.x = lerp(cam.x, tx, 1 - Math.pow(0.001, dt));
  cam.y = lerp(cam.y, ty, 1 - Math.pow(0.001, dt));

  // apuntar
  const mwx = mouse.x + cam.x, mwy = mouse.y + cam.y;
  player.angle = Math.atan2(mwy - player.y, mwx - player.x);

  // disparar
  player.cooldown -= dt;
  if (mouse.down && player.cooldown <= 0) {
    player.cooldown = FIRE_COOLDOWN;
    const spread = rand(-0.035, 0.035);
    const a = player.angle + spread;
    bullets.push({
      x: player.x + Math.cos(a) * 20,
      y: player.y + Math.sin(a) * 20,
      vx: Math.cos(a) * BULLET_SPEED,
      vy: Math.sin(a) * BULLET_SPEED,
      life: 1.2,
    });
    particles.push({
      x: player.x + Math.cos(a) * 24, y: player.y + Math.sin(a) * 24,
      vx: Math.cos(a) * 120, vy: Math.sin(a) * 120,
      life: 0.12, maxLife: 0.12, color: '#ffe08a', size: 5,
    });
    shake = Math.max(shake, 2.2);
  }

  if (player.invuln > 0) player.invuln -= dt;

  /* --- spawn --- */
  spawnTimer -= dt;
  const interval = Math.max(0.26, 1.15 - elapsed * 0.016);
  if (spawnTimer <= 0 && enemies.length < 90) {
    spawnTimer = interval;
    spawnEnemy();
    if (elapsed > 45 && Math.random() < 0.35) spawnEnemy();
  }

  /* --- balas --- */
  for (const b of bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (Math.random() < 0.5) {
      particles.push({
        x: b.x, y: b.y, vx: 0, vy: 0,
        life: 0.15, maxLife: 0.15, color: '#ffd166', size: 2,
      });
    }
  }
  bullets = bullets.filter(b =>
    b.life > 0 && b.x > 0 && b.y > 0 && b.x < WORLD.w && b.y < WORLD.h
  );

  /* --- enemigos --- */
  for (const e of enemies) {
    e.wobble += dt * 6;
    if (e.hit > 0) e.hit -= dt;
    const ang = Math.atan2(player.y - e.y, player.x - e.x);
    e.x += Math.cos(ang) * e.speed * dt;
    e.y += Math.sin(ang) * e.speed * dt;

    // separación simple entre enemigos
    for (const o of enemies) {
      if (o === e) continue;
      const d2 = dist2(e.x, e.y, o.x, o.y);
      const min = (e.r + o.r) * 0.9;
      if (d2 < min * min && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const push = (min - d) / 2;
        const ax = (e.x - o.x) / d, ay = (e.y - o.y) / d;
        e.x += ax * push; e.y += ay * push;
        o.x -= ax * push; o.y -= ay * push;
      }
    }

    // daño al jugador
    const rr = (e.r + player.r);
    if (dist2(e.x, e.y, player.x, player.y) < rr * rr && player.invuln <= 0) {
      player.hp -= 1;
      player.invuln = 1.6;
      shake = Math.max(shake, 16);
      burst(player.x, player.y, '#ff5566', 30, 360, 0.7, 4);
      floatText(player.x, player.y - 30, '-1 VIDA', '#ff5566', 20);
      e.hp -= 2; // el choque también lastima al enemigo
      if (e.hp <= 0 && !e.dead) damageEnemy(e, 0);
      if (player.hp <= 0) {
        state = 'over';
        best = Math.max(best, score);
        localStorage.setItem('shooter2d_best', String(best));
        burst(player.x, player.y, '#ffffff', 50, 500, 1.1, 5);
        mouse.down = false;
      }
    }
  }

  /* --- colisiones bala-enemigo --- */
  for (const b of bullets) {
    if (b.life <= 0) continue;
    for (const e of enemies) {
      if (e.dead) continue;
      const rr = e.r + 4;
      if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
        b.life = 0;
        damageEnemy(e, 1);
        break;
      }
    }
  }
  bullets = bullets.filter(b => b.life > 0);
  enemies = enemies.filter(e => !e.dead);

  /* --- partículas / textos / anillos --- */
  for (const p of particles) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= Math.pow(0.02, dt); p.vy *= Math.pow(0.02, dt);
    p.life -= dt;
  }
  particles = particles.filter(p => p.life > 0);

  for (const t of texts) { t.y -= 34 * dt; t.life -= dt; }
  texts = texts.filter(t => t.life > 0);

  for (const r of rings) {
    r.life -= dt;
    r.r = lerp(r.maxR, 10, r.life / r.maxLife);
  }
  rings = rings.filter(r => r.life > 0);

  shake = Math.max(0, shake - dt * 40);
}

/* ---------------- Render ---------------- */
function circle(x, y, r, fill, stroke, lw = 2) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function drawWorld() {
  // fondo
  ctx.fillStyle = '#121722';
  ctx.fillRect(0, 0, W, H);

  // rejilla
  const grid = 80;
  const startX = -((cam.x) % grid);
  const startY = -((cam.y) % grid);
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = startX; x < W; x += grid) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = startY; y < H; y += grid) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();

  // límites del mundo
  ctx.strokeStyle = 'rgba(255,80,80,0.55)';
  ctx.lineWidth = 4;
  ctx.strokeRect(-cam.x, -cam.y, WORLD.w, WORLD.h);
}

function drawPlayer() {
  const x = player.x - cam.x, y = player.y - cam.y;
  const blink = player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0;

  // sombra
  circle(x + 3, y + 5, player.r, 'rgba(0,0,0,0.35)');

  if (!blink) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(player.angle);

    // arma
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(4, -4, 24, 8);
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(20, -3, 8, 6);

    // cuerpo
    circle(0, 0, player.r, '#48cae4', '#eafcff', 2.5);

    // dirección
    ctx.fillStyle = '#0b3954';
    ctx.beginPath();
    ctx.moveTo(10, 0); ctx.lineTo(-2, -7); ctx.lineTo(-2, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // anillo de invulnerabilidad
  if (player.invuln > 0) {
    ctx.strokeStyle = `rgba(122,231,255,${0.35 + 0.35 * Math.sin(elapsed * 18)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, player.r + 7, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawEnemies() {
  for (const e of enemies) {
    const x = e.x - cam.x, y = e.y - cam.y;
    if (x < -80 || y < -80 || x > W + 80 || y > H + 80) continue;

    circle(x + 3, y + 4, e.r, 'rgba(0,0,0,0.32)');

    const wob = Math.sin(e.wobble) * 1.5;
    const body = e.hit > 0 ? '#ffffff' : e.color;
    circle(x, y + wob * 0.2, e.r, body, 'rgba(0,0,0,0.35)', 2);

    if (e.type === 'tank') {
      circle(x, y, e.r - 6, 'rgba(0,0,0,0.25)');
    }

    // ojos
    const ang = Math.atan2(player.y - e.y, player.x - e.x);
    const ex = Math.cos(ang) * e.r * 0.35, ey = Math.sin(ang) * e.r * 0.35;
    circle(x + ex - 4, y + ey - 2, 3, '#0b0e14');
    circle(x + ex + 4, y + ey - 2, 3, '#0b0e14');

    // vida (solo si no está llena)
    if (e.hp < e.maxHp) {
      const w = e.r * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - e.r, y - e.r - 9, w, 4);
      ctx.fillStyle = '#7dff9b';
      ctx.fillRect(x - e.r, y - e.r - 9, w * (e.hp / e.maxHp), 4);
    }
  }
}

function drawBullets() {
  for (const b of bullets) {
    const x = b.x - cam.x, y = b.y - cam.y;
    ctx.save();
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 10;
    circle(x, y, 4, '#fff3c4');
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    const x = p.x - cam.x, y = p.y - cam.y;
    ctx.beginPath();
    ctx.arc(x, y, p.size * (0.4 + a * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRings() {
  for (const r of rings) {
    const a = clamp(r.life / r.maxLife, 0, 1);
    ctx.strokeStyle = `rgba(122,231,255,${a * 0.9})`;
    ctx.lineWidth = 6 * a + 1;
    ctx.beginPath();
    ctx.arc(r.x - cam.x, r.y - cam.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawTexts() {
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px Segoe UI, sans-serif';
  for (const t of texts) {
    ctx.globalAlpha = clamp(t.life / t.maxLife, 0, 1);
    ctx.fillStyle = t.color;
    ctx.fillText(t.str, t.x - cam.x, t.y - cam.y);
  }
  ctx.globalAlpha = 1;
}

function drawHUD() {
  ctx.textAlign = 'left';

  // --- Vidas ---
  for (let i = 0; i < player.maxHp; i++) {
    const x = 30 + i * 38, y = 36;
    const filled = i < player.hp;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    const s = 13;
    ctx.moveTo(0, s * 0.75);
    ctx.bezierCurveTo(-s * 1.6, -s * 0.3, -s * 0.7, -s * 1.3, 0, -s * 0.45);
    ctx.bezierCurveTo(s * 0.7, -s * 1.3, s * 1.6, -s * 0.3, 0, s * 0.75);
    ctx.closePath();
    ctx.fillStyle = filled ? '#ff4d6d' : 'rgba(255,255,255,0.12)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = filled ? '#ffd6de' : 'rgba(255,255,255,0.25)';
    ctx.stroke();
    ctx.restore();
  }

  // --- Puntaje ---
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 30px Segoe UI, sans-serif';
  ctx.fillText(String(score).padStart(6, '0'), W - 30, 44);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '14px Segoe UI, sans-serif';
  ctx.fillText(`Récord: ${best}   ·   Kills: ${kills}   ·   ${Math.floor(elapsed)}s`, W - 30, 66);

  // --- Habilidad ---
  const bw = 260, bh = 16;
  const bx = W / 2 - bw / 2, by = H - 46;
  const ready = abilityCharge >= ABILITY_KILLS;
  const pct = clamp(abilityCharge / ABILITY_KILLS, 0, 1);

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(bx - 4, by - 4, bw + 8, bh + 8, 10); ctx.fill();

  ctx.fillStyle = ready ? '#7ae7ff' : '#2b6a8f';
  roundRect(bx, by, bw * pct, bh, 7); ctx.fill();

  if (ready) {
    ctx.strokeStyle = `rgba(122,231,255,${0.5 + 0.5 * Math.sin(elapsed * 8)})`;
    ctx.lineWidth = 2;
    roundRect(bx, by, bw, bh, 7); ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.font = 'bold 13px Segoe UI, sans-serif';
  ctx.fillStyle = ready ? '#eafcff' : 'rgba(255,255,255,0.75)';
  ctx.fillText(
    ready ? '¡HABILIDAD LISTA!  [ESPACIO / CLIC DERECHO]' : `HABILIDAD  ${abilityCharge}/${ABILITY_KILLS}`,
    W / 2, by - 12
  );

  // --- Mira ---
  ctx.strokeStyle = mouse.down ? '#ff8fa3' : 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(mouse.x - 15, mouse.y); ctx.lineTo(mouse.x - 5, mouse.y);
  ctx.moveTo(mouse.x + 5, mouse.y);  ctx.lineTo(mouse.x + 15, mouse.y);
  ctx.moveTo(mouse.x, mouse.y - 15); ctx.lineTo(mouse.x, mouse.y - 5);
  ctx.moveTo(mouse.x, mouse.y + 5);  ctx.lineTo(mouse.x, mouse.y + 15);
  ctx.stroke();
}

function roundRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPanel(title, lines, button) {
  ctx.fillStyle = 'rgba(6,9,15,0.78)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';

  // viñeta de título
  ctx.font = 'bold 64px Segoe UI, sans-serif';
  ctx.fillStyle = '#48cae4';
  ctx.shadowColor = 'rgba(72,202,228,0.6)';
  ctx.shadowBlur = 24;
  ctx.fillText(title, W / 2, H / 2 - 110);
  ctx.shadowBlur = 0;

  ctx.font = '19px Segoe UI, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 - 45 + i * 30));

  const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 300);
  ctx.font = 'bold 24px Segoe UI, sans-serif';
  ctx.fillStyle = `rgba(255,209,102,${pulse})`;
  ctx.fillText(button, W / 2, H / 2 + 120);
}

function drawVignette() {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  const sx = shake > 0 ? rand(-shake, shake) : 0;
  const sy = shake > 0 ? rand(-shake, shake) : 0;
  ctx.save();
  ctx.translate(sx, sy);

  if (state === 'playing' || state === 'over') {
    drawWorld();
    drawRings();
    drawParticles();
    drawEnemies();
    drawBullets();
    drawPlayer();
    drawTexts();
    drawVignette();
    drawHUD();
  } else {
    drawWorld();
    drawVignette();
  }

  ctx.restore();

  if (state === 'menu') {
    drawPanel('MINI SHOOTER 2D', [
      'WASD / Flechas — moverse en cualquier dirección',
      'Ratón — apuntar y disparar (mantener clic izquierdo)',
      'Espacio o clic derecho — onda de choque (se carga matando enemigos)',
      'Tienes 3 vidas. Los enemigos son infinitos e infinitamente más rápidos...',
    ], '▶  HAZ CLIC PARA JUGAR');
  } else if (state === 'over') {
    drawPanel('HAS CAÍDO', [
      `Puntuación: ${score}      Récord: ${best}`,
      `Enemigos eliminados: ${kills}      Supervivencia: ${Math.floor(elapsed)} s`,
    ], '▶  HAZ CLIC O PULSA R PARA REINICIAR');
  }
}

/* ---------------- Bucle principal ---------------- */
let last = performance.now();

function step(now) {
  const dt = Math.min((now - last) / 1000, 0.033); // dt limitado para que nada "teletransporte"
  last = now;
  update(dt);
  render();
}

function loop(now) {
  step(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Respaldo: si el navegador suspende requestAnimationFrame (pestaña oculta,
// ventanas sin composición, ahorro de batería), el juego sigue avanzando.
setInterval(() => {
  const now = performance.now();
  if (!document.hidden && now - last > 250) step(now);
}, 120);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) last = performance.now(); // evita un salto de tiempo al volver
});
