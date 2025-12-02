// jairos turf — real FNF clone (upscroll, arrows, bop, combo, GF, stage)
// Keys: D F J K (lanes 0-3)
// Custom: change ASSETS src to your uploaded files in assets/

const CONFIG = {
  canvasId: 'gameCanvas',
  audioId: 'song',
  bpm: 120,
  lanes: 4,
  keyMap: { 'd':0, 'f':1, 'j':2, 'k':3 },
  hitWindow: 0.18,
  perfectWindow: 0.06,
  approachTime: 1.5, // Faster approach for FNF feel
  opponentLead: 0.15,
  healthMax: 100,
  healthGain: 8,
  healthLoss: 10,
  canvasWidth: 960,
  healthStart: 50
};

const ASSETS = {
  player: 'assets/player.png', // Your BF PNG
  opponent: 'assets/opponent.png', // Your Daddy PNG
  gf: 'assets/gf.png', // Your GF PNG
  background: 'assets/stage.png', // Your background PNG
  arrows: 'assets/arrows.png' // Optional arrow sheet
};

// Canvas & Audio
const canvas = document.getElementById(CONFIG.canvasId);
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.canvasWidth;
canvas.height = CONFIG.canvasHeight;
const audio = document.getElementById(CONFIG.audioId);

// UI
const scoreEl = document.getElementById('score');
const healthFill = document.getElementById('healthFill');
const judgeEl = document.getElementById('judge');
const comboEl = document.getElementById('combo');
const fsBtn = document.getElementById('fsBtn');
const backBtn = document.getElementById('backBtn');
fsBtn.onclick = () => {
  if (!document.fullscreenElement) canvas.requestFullscreen();
  else document.exitFullscreen();
};
backBtn.onclick = () => window.close();

// Mobile
const mobileOverlay = document.getElementById('mobile-warning');
const continueBtn = document.getElementById('continue-anyway');
function isMobile() { return /Mobi|Android/i.test(navigator.userAgent); }
if (isMobile()) {
  mobileOverlay.style.display = 'flex';
} else {
  mobileOverlay.style.display = 'none';
}
continueBtn.onclick = () => mobileOverlay.style.display = 'none';

// Custom chart (add your times here)
let beatmap = [];
(function generateDemo() {
  const measures = 8;
  let t = 0;
  for(let m=0;m<measures;m++){
    for(let i=0;i<8;i++){
      const lane = i % CONFIG.lanes;
      beatmap.push({ time: t + i * (60 / CONFIG.bpm / 2), lane });
    }
    t += 60 / CONFIG.bpm * 4;
  }
})();

// State
let playStarted = false;
let notes = beatmap.map(n => ({...n}));
let hitLineY = 80; // Top hit line (upscroll)
let spawnY = canvas.height - 50;
let laneWidth = 100;
let laneGap = 20;
let laneStartX = (canvas.width - (CONFIG.lanes * laneWidth + (CONFIG.lanes-1)*laneGap)) / 2;
let score = 0;
let health = CONFIG.healthStart;
let combo = 0;
let opponentHits = {};
let lastJudgeTs = 0;
let bopTime = 0;
let manualTime = 0;
let startTime = 0;
let useManualTimer = false;

// Load images
const imgCache = {};
function loadImg(src) {
  return new Promise((res) => {
    const i = new Image();
    i.onload = () => { imgCache[src] = i; res(i); };
    i.onerror = () => res(null);
    i.src = src;
  });
}
Promise.all(Object.values(ASSETS).map(loadImg));

// Note Y calc
function noteYAtTime(noteTime, currentTime) {
  const tUntilHit = noteTime - currentTime;
  const ratio = tUntilHit / CONFIG.approachTime;
  return hitLineY + (spawnY - hitLineY) * ratio;
}

// Draw frame
function drawFrame() {
  bopTime += 0.02; // Bop speed
  let now = audio.currentTime;
  if (useManualTimer) now = (Date.now() - startTime) / 1000;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Background
  const bg = imgCache[ASSETS.background];
  if (bg) ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
  else {
    ctx.fillStyle = '#12052a'; // FNF purple
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }

  // Lanes
  for(let i=0;i<CONFIG.lanes;i++){
    const x = laneStartX + i*(laneWidth + laneGap);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, 0, laneWidth, canvas.height);
    // Strum line (top hit)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, hitLineY - 4, laneWidth, 8);
  }

  // Notes
  notes.forEach((note, idx) => {
    const t = note.time;
    const y = noteYAtTime(t, now);
    if (y < hitLineY - 50 || y > spawnY + 50) return;

    const laneX = laneStartX + note.lane * (laneWidth + laneGap);
    const cx = laneX + laneWidth / 2;
    // Arrow colors
    const colors = ['#a020f0', '#00ffff', '#00ff00', '#ff0000']; // Left, down, up, right
    ctx.fillStyle = colors[note.lane];
    ctx.shadowColor = colors[note.lane];
    ctx.shadowBlur = 15;

    // Draw arrow polygon
    ctx.save();
    ctx.translate(cx, y);
    const arrowPaths = [
      [[0,-30],[30,0],[0,30],[-20,0]], // Left <
      [[-20,-20],[20,-20],[0,30]], // Down v
      [[-20,30],[20,30],[0,-20]], // Up ^
      [[0,-30],[-30,0],[0,30],[20,0]] // Right >
    ];
    ctx.beginPath();
    const path = arrowPaths[note.lane];
    ctx.moveTo(path[0][0], path[0][1]);
    path.forEach(p => ctx.lineTo(p[0], p[1]));
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Opponent hit flash
    if (!opponentHits[idx] && (t - CONFIG.opponentLead) <= now) {
      opponentHits[idx] = true;
    }
  });

  // Characters with bop
  const bop = Math.sin(bopTime * 2) * 5; // Bop amp
  const opponentX = laneStartX - 150;
  const gfX = canvas.width / 2 - 100;
  const playerX = laneStartX + CONFIG.lanes * (laneWidth + laneGap);
  // GF on speakers
  ctx.fillStyle = '#333';
  ctx.fillRect(gfX, canvas.height - 200, 200, 100); // Speaker box
  const gfImg = imgCache[ASSETS.gf];
  if (gfImg) ctx.drawImage(gfImg, gfX, canvas.height - gfImg.height - 100 + bop, gfImg.width * 0.8, gfImg.height * 0.8);
  else {
    ctx.fillStyle = '#ff69b4';
    ctx.fillRect(gfX + 50, canvas.height - 150 + bop, 100, 100);
  }
  // Opponent
  const oppImg = imgCache[ASSETS.opponent];
  if (oppImg) ctx.drawImage(oppImg, opponentX, canvas.height - oppImg.height - 50 - bop, oppImg.width * 0.8, oppImg.height * 0.8);
  else {
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(opponentX, canvas.height - 150 - bop, 100, 100);
  }
  // Player
  const plImg = imgCache[ASSETS.player];
  if (plImg) ctx.drawImage(plImg, playerX, canvas.height - plImg.height - 50 + bop, plImg.width * 0.8, plImg.height * 0.8);
  else {
    ctx.fillStyle = '#4fc3f7';
    ctx.fillRect(playerX, canvas.height - 150 + bop, 100, 100);
  }

  // Opponent flash on hit
  notes.forEach((note, idx) => {
    if (opponentHits[idx]) {
      const dt = now - (note.time - CONFIG.opponentLead);
      if (dt < 0.1) {
        const laneX = laneStartX + note.lane * (laneWidth + laneGap);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(laneX, hitLineY - 50, laneWidth, 50);
      }
    }
  });

  // HUD update
  scoreEl.innerText = score;
  healthFill.style.width = `${(health / CONFIG.healthMax) * 100}%`;
  if (Date.now() - lastJudgeTs > 800) judgeEl.textContent = '';
  comboEl.textContent = combo > 0 ? `${combo}x` : '';

  requestAnimationFrame(drawFrame);
}

// Input
const activeKeys = {};
window.addEventListener('keydown', (ev) => {
  if (ev.repeat) return;
  const k = ev.key.toLowerCase();
  if (k in CONFIG.keyMap) {
    activeKeys[k] = true;
    handlePress(CONFIG.keyMap[k]);
  }
});
window.addEventListener('keyup', (ev) => {
  const k = ev.key.toLowerCase();
  if (k in CONFIG.keyMap) activeKeys[k] = false;
});

// Press handler
function handlePress(lane) {
  const now = useManualTimer ? (Date.now() - startTime) / 1000 : audio.currentTime;
  let bestIdx = -1;
  let bestDelta = Infinity;
  notes.forEach((note, idx) => {
    if (note.__hit || note.lane !== lane) return;
    const dt = Math.abs(note.time - now);
    if (dt <= CONFIG.hitWindow && dt < bestDelta) {
      bestDelta = dt;
      bestIdx = idx;
    }
  });
  if (bestIdx >= 0) {
    notes[bestIdx].__hit = true;
    let judgement = 'Miss';
    let points = 0;
    let hGain = 0;
    if (bestDelta <= CONFIG.perfectWindow) {
      judgement = 'Sick!!';
      points = 350;
      hGain = CONFIG.healthGain;
    } else {
      judgement = 'Good';
      points = 200;
      hGain = CONFIG.healthGain * 0.5;
    }
    score += points;
    health = Math.min(CONFIG.healthMax, health + hGain);
    combo++;
    showJudge(judgement);
  } else {
    score -= 50;
    health -= CONFIG.healthLoss * 0.3;
    combo = 0;
    showJudge('Shit');
  }
  health = Math.max(0, health);
  if (health <= 0) endSong(false);
}

function showJudge(text) {
  judgeEl.textContent = text;
  lastJudgeTs = Date.now();
}

// Miss scanner
function scanMissedNotes() {
  const now = useManualTimer ? (Date.now() - startTime) / 1000 : audio.currentTime;
  notes.forEach(note => {
    if (note.__hit || note.__missed) return;
    if (now - note.time > CONFIG.hitWindow) {
      note.__missed = true;
      health -= CONFIG.healthLoss;
      combo = 0;
      showJudge('Miss');
      if (health <= 0) endSong(false);
    }
  });
}

// Song control
function startSong() {
  if (playStarted) return;
  playStarted = true;
  score = 0;
  health = CONFIG.healthStart;
  combo = 0;
  notes = beatmap.map(n => ({...n}));
  opponentHits = {};
  audio.currentTime = 0;
  audio.play().catch(() => {
    useManualTimer = true;
    startTime = Date.now();
  });
  requestAnimationFrame(drawFrame);
  scanInterval = setInterval(scanMissedNotes, 50);
}

function endSong(won) {
  audio.pause();
  clearInterval(scanInterval);
  const msg = won ? 'FC! Sick.' : 'Game Over...';
  alert(msg + '\nScore: ' + score);
  playStarted = false;
}

audio.addEventListener('ended', () => endSong(health > 0));

// Start on click
document.addEventListener('click', () => {
  if (!playStarted && confirm('Start song?')) startSong();
}, { once: true });

// Canvas click for debug press
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  for(let i=0;i<CONFIG.lanes;i++){
    const laneX = laneStartX + i*(laneWidth + laneGap);
    if (x >= laneX && x <= laneX + laneWidth) {
      handlePress(i);
      break;
    }
  }
});

// Init
drawFrame();
