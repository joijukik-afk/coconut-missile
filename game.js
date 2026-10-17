// ========== پرتاب موشک نارگیل ==========
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const gameOverEl = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');

const W = canvas.width;
const H = canvas.height;

// ---------- تنظیمات ----------
const MISSILE_SPEED = 7;       // سرعت موشک بازیکن
const COCONUT_SPEED = 1.6;     // سرعت سقوط نارگیل
const EXPLOSION_RADIUS = 55;   // شعاع انفجار
const SPAWN_INTERVAL = 1100;   // فاصله‌ی تولید نارگیل (میلی‌ثانیه)

// ---------- وضعیت بازی ----------
let playerMissiles = [];
let coconuts = [];
let explosions = [];
let particles = [];
let score = 0;
let lives = 3;
let gameRunning = true;
let spawnTimer = 0;
let lastTime = 0;

// ========== کلاس‌ها ==========
class PlayerMissile {
  constructor(targetX, targetY) {
    this.x = W / 2;
    this.y = H;
    this.targetX = targetX;
    this.targetY = targetY;
    this.dead = false;
    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    this.vx = Math.cos(angle) * MISSILE_SPEED;
    this.vy = Math.sin(angle) * MISSILE_SPEED;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    // اگر به هدف نزدیک شد یا از صفحه خارج شد → منفجر شو
    const dist = Math.hypot(this.x - this.targetX, this.y - this.targetY);
    if (dist < 10 || this.y < -20 || this.x < -20 || this.x > W + 20) {
      this.dead = true;
      explosions.push(new Explosion(this.x, this.y));
    }
  }

  draw() {
    ctx.save();
    ctx.shadowColor = '#ffd93d';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Coconut {
  constructor() {
    this.x = Math.random() * (W - 60) + 30;
    this.y = -30;
    this.radius = 14 + Math.random() * 6;
    this.speed = COCONUT_SPEED + Math.random() * 0.8;
    this.dead = false;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.04;
  }

  update() {
    this.y += this.speed;
    this.rotation += this.rotSpeed;
    if (this.y > H + 30) {
      this.dead = true;
      loseLife();
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // بدنه‌ی نارگیل
    const gradient = ctx.createRadialGradient(-6, -6, 4, 0, 0, this.radius);
    gradient.addColorStop(0, '#8B5E3C');
    gradient.addColorStop(1, '#4A2F1A');

    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 12;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // سه چشم نارگیل
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2A1A0E';
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(
        Math.cos(angle) * 5,
        Math.sin(angle) * 5,
        2.8,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
  }
}

class Explosion {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = EXPLOSION_RADIUS;
    this.dead = false;
    this.expanding = true;
  }

  update() {
    if (this.expanding) {
      this.radius += 3.5;
      if (this.radius >= this.maxRadius) this.expanding = false;
    } else {
      this.radius -= 2.5;
      if (this.radius <= 0) this.dead = true;
    }
  }

  draw() {
    const alpha = Math.min(1, this.radius / this.maxRadius);
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius
    );
    gradient.addColorStop(0, `rgba(255, 255, 200, ${alpha * 0.9})`);
    gradient.addColorStop(0.5, `rgba(255, 150, 50, ${alpha * 0.6})`);
    gradient.addColorStop(1, `rgba(255, 50, 50, 0)`);

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // بررسی برخورد با نارگیل
  hits(coconut) {
    const dist = Math.hypot(this.x - coconut.x, this.y - coconut.y);
    return dist < this.radius + coconut.radius;
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8;
    this.life = 1;
    this.decay = 0.02 + Math.random() * 0.03;
    this.color = color;
    this.size = 2 + Math.random() * 3;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1;
    this.life -= this.decay;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ========== توابع کمکی ==========
function spawnCoconut() {
  coconuts.push(new Coconut());
}

function loseLife() {
  lives--;
  livesEl.textContent = lives;
  if (lives <= 0) {
    endGame();
  }
}

function endGame() {
  gameRunning = false;
  finalScoreEl.textContent = score;
  gameOverEl.classList.remove('hidden');
}

function createParticles(x, y, color = '#ff9f43') {
  for (let i = 0; i < 18; i++) {
    particles.push(new Particle(x, y, color));
  }
}

// ========== حلقه‌ی بازی ==========
function gameLoop(timestamp) {
  if (!gameRunning) return;

  const delta = timestamp - lastTime;
  lastTime = timestamp;

  // --- به‌روزرسانی ---
  spawnTimer += delta;
  if (spawnTimer >= SPAWN_INTERVAL) {
    spawnTimer -= SPAWN_INTERVAL;
    spawnCoconut();
  }

  playerMissiles.forEach(m => m.update());
  coconuts.forEach(c => c.update());
  explosions.forEach(e => e.update());
  particles.forEach(p => p.update());

  // برخورد انفجار با نارگیل
  explosions.forEach(exp => {
    coconuts.forEach(coco => {
      if (!coco.dead && !exp.dead && exp.hits(coco)) {
        coco.dead = true;
        score += 10;
        scoreEl.textContent = score;
        createParticles(coco.x, coco.y, '#ff6b6b');
      }
    });
  });

  // پاکسازی
  playerMissiles = playerMissiles.filter(m => !m.dead);
  coconuts = coconuts.filter(c => !c.dead);
  explosions = explosions.filter(e => !e.dead);
  particles = particles.filter(p => p.life > 0);

  // --- رسم ---
  ctx.clearRect(0, 0, W, H);

  // خط افق / زمین
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 200, 160, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, H - 10);
  ctx.lineTo(W, H - 10);
  ctx.stroke();
  ctx.restore();

  coconuts.forEach(c => c.draw());
  playerMissiles.forEach(m => m.draw());
  explosions.forEach(e => e.draw());
  particles.forEach(p => p.draw());

  requestAnimationFrame(gameLoop);
}

// ========== ورودی بازیکن ==========
canvas.addEventListener('click', (e) => {
  if (!gameRunning) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  playerMissiles.push(new PlayerMissile(x, y));
});

// ========== ریست ==========
function resetGame() {
  playerMissiles = [];
  coconuts = [];
  explosions = [];
  particles = [];
  score = 0;
  lives = 3;
  gameRunning = true;
  spawnTimer = 0;
  lastTime = performance.now();
  scoreEl.textContent = '0';
  livesEl.textContent = '3';
  gameOverEl.classList.add('hidden');
  requestAnimationFrame(gameLoop);
}

// ========== شروع ==========
lastTime = performance.now();
requestAnimationFrame(gameLoop);
