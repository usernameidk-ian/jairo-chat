// jairos turf — tiny FNF-like (desktop only)
// Keys: D F J K  (lanes 0..3)
// Up-scroll: notes move upwards to hit line near top
// Single song, 120 BPM demo chart. Add your images in 'assets/' folder if desired.

// ---------- CONFIG ----------
const CONFIG = {
  canvasId: 'gameCanvas',
  audioId: 'song',
  bpm: 120,
  lanes: 4,
  keyMap: { 'd':0, 'f':1, 'j':2, 'k':3 },
  hitWindow: 0.18,        // seconds for hit
  perfectWindow: 0.06,
  approachTime: 2.0,      // seconds from spawn to hit (time for a note to travel)
  opponentLead: 0.35,     // opponent "plays" this many seconds before player
  healthMax: 100,
  healthGain: 6,
  healthLoss: 8,
  canvasWidth: 960,
  canvasHeight: 640
};

// ---------- ASSET FILENAMES (optional custom PNGs) ----------
const ASSETS = {
  player: 'assets/player.png',        // optional
  opponent: 'assets/opponent.png',    // optional
  note: 'assets/note.png',            // optional (normal)
  noteBlue: 'assets/note-blue.png'    // optional (power)
};

// ---------- Canvas & Audio ----------
const canvas = document.getElementById(CONFIG.canvasId);
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.canvasWidth;
canvas.height = CONFIG.canvasHeight;
const audio = document.getElementById(CONFIG.audioId);

// ---------- UI ----------
const scoreEl = document.getElementById('score');
const healthFill = document.getElementById('healthFill');
const judgeEl = document.getElementById('judge');
const fsBtn = document.getElementById('fsBtn');
const backBtn = document.getElementById('backBtn');

fsBtn.onclick = () => {
  if (!document.fullscreenElement) canvas.requestFullscreen().catch(()=>{});
  else document.exitFullscreen();
};
backBtn.onclick = () => window.close();

// ---------- mobile warning handling ----------
const mobileOverlay = document.getElementById('mobile-warning');
const continueBtn = document.getElementById('continue-anyway');
function isMobile() {
  return /Mobi|Android/i.test(navigator.userAgent);
}
if (isMobile()) {
  mobileOverlay.style.display = 'flex';
} else {
  mobileOverlay.style.display = 'none';
}
continueBtn && (continueBtn.onclick = () => mobileOverlay.style.display = 'none');

// ---------- simple beatmap (demo) ----------
// Generate a simple repeating pattern at 120bpm so you can test.
// Each beat divided into 4 -> 120bpm = 2 beats/sec -> 4 notes per beat produce dense notes.
// You will likely replace this with an actual chart later.
const beatsPerSec = CONFIG.bpm / 60;
const secondsPerBeat = 60 / CONFIG.bpm;

// demo: 16 measures of a simple pattern
let beatmap = [];
(function generateDemo() {
  const measures = 8;
  let t = 0;
  for(let m=0;m<measures;m++){
    // pattern: lanes 0,1,2,3 on consecutive 1/2-beats
    for(let i=0;i<8;i++){
      const lane = i % CONFIG.lanes;
      beatmap.push({ time: t + i * (secondsPerBeat/2), lane });
    }
    t += secondsPerBeat * 4; // 4 beats per measure
  }
})();

// You can also manually specify absolute times:
// beatmap = [{time:1.5,lane:0}, {time:2.0,lane:2}, ...]

// ---------- playback & notes state ----------
let playStarted = false;
let notes = beatmap.map(n => Object.assign({}, n)); // copy
let hitLineY = 110; // target Y (near top) where notes should be hit
let spawnY = canvas.height + 40;
let laneWidth = 120;
let laneGap = 30;
let laneStartX = (canvas.width - (CONFIG.lanes * laneWidth + (CONFIG.lanes-1)*laneGap)) / 2;
let score = 0;
let health = CONFIG.healthMax * 0.5;

// active judgments display timer
let lastJudgeTs = 0;

// load images if available (optional)
const imgCache = {};
function loadImg(src){ return new Promise((res)=>{ const i=new Image(); i.onload=()=>{imgCache[src]=i;res(i)}; i.onerror=()=>res(null); i.src=src; }) }
Promise.all(Object.values(ASSETS).map(s=>loadImg(s))).then(()=>{/* images loaded if present */});

// convert note time -> screen Y
function noteYAtTime(noteTime, currentTime) {
  // time until hit
  const tUntilHit = noteTime - currentTime;
  const approach = CONFIG.approachTime;
  // when tUntilHit == 0 => y = hitLineY
  // when tUntilHit == approach => y = spawnY
  const ratio = (tUntilHit + 0) / approach; // 1 at spawn, 0 at hit
  return hitLineY + ratio * (spawnY - hitLineY);
}

// opponent will "play" notes for animation; we record opponent hits to animate
let opponentHits = {}; // key by index -> true when opponent passed

// main loop
function drawFrame() {
  const now = audio.currentTime;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // background
  ctx.fillStyle = '#08121a';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // draw lanes
  for(let i=0;i<CONFIG.lanes;i++){
    const x = laneStartX + i*(laneWidth + laneGap);
    // lane background
    ctx.fillStyle = '#0e1b23';
    roundRect(ctx, x, 80, laneWidth, canvas.height-160, 6, true, false);
    // lane hit zone marker
    ctx.fillStyle = '#162832';
    ctx.fillRect(x, hitLineY-6, laneWidth, 6);
    // draw lane letter
    ctx.fillStyle = '#99aab5';
    ctx.font = '18px Arial';
    ctx.fillText(Object.keys(CONFIG.keyMap)[i] ? Object.keys(CONFIG.keyMap)[i].toUpperCase() : '', x + laneWidth/2 - 6, canvas.height - 30);
  }

  // draw notes (player's notes are those timed for the audio)
  notes.forEach((note, idx) => {
    const t = note.time;
    const y = noteYAtTime(t, now);
    // skip notes that are past (a bit beyond)
    if (y < hitLineY - 200) return;
    if (y > spawnY + 40) return;

    const laneX = laneStartX + note.lane*(laneWidth + laneGap);
    const cx = laneX + laneWidth/2;
    // draw note sprite if available:
    const sprite = imgCache[ASSETS.note];
    if (sprite) {
      const s = 42;
      ctx.drawImage(sprite, cx - s/2, y - s/2, s, s);
    } else {
      // fallback: circle
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath();
      ctx.arc(cx, y, 18, 0, Math.PI*2);
      ctx.fill();
    }

    // opponent "lead" visual: if note time - opponentLead < now and not yet registered, mark hit
    if (!opponentHits[idx] && (t - CONFIG.opponentLead) <= now) {
      opponentHits[idx] = true;
    }
  });

  // draw opponent (left) & player (right)
  const opponentX = laneStartX - 120;
  const playerX = laneStartX + (CONFIG.lanes-1)*(laneWidth+laneGap) + laneWidth + 40;
  // opponent sprite (optional)
  const oppImg = imgCache[ASSETS.opponent];
  if (oppImg) ctx.drawImage(oppImg, opponentX-20, hitLineY-60, 80, 80);
  else {
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(opponentX-8, hitLineY-56, 60, 60);
  }
  // player
  const plImg = imgCache[ASSETS.player];
  if (plImg) ctx.drawImage(plImg, playerX-20, hitLineY-60, 80, 80);
  else {
    ctx.fillStyle = '#4fc3f7';
    ctx.fillRect(playerX-8, hitLineY-56, 60, 60);
  }

  // animate opponent hits (flash lane when opponentHits true and note near hit)
  notes.forEach((note, idx) => {
    if (!opponentHits[idx]) return;
    const t = note.time - CONFIG.opponentLead;
    const dt = now - t;
    if (Math.abs(dt) < 0.12) {
      const laneX = laneStartX + note.lane*(laneWidth + laneGap);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(laneX, hitLineY-80, laneWidth, 80);
    }
  });

  // HUD: health, score, last judge
  scoreEl.innerText = score;
  healthFill.style.width = Math.max(0, Math.min(100, (health/CONFIG.healthMax)*100)) + '%';

  // clear judgement after 800ms
  if (Date.now() - lastJudgeTs > 800) judgeEl.textContent = '';

  requestAnimationFrame(drawFrame);
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  if (typeof r === 'undefined') r = 5;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// ---------- input handling ----------
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

// handle a player press on lane (0..3)
function handlePress(lane) {
  // find nearest hittable note in that lane within hitWindow
  const now = audio.currentTime;
  const window = CONFIG.hitWindow;
  // find notes not yet judged and whose time is within window
  let bestIdx = -1;
  let bestDelta = 1e9;
  notes.forEach((note, idx) => {
    if (note.__hit) return;
    if (note.lane !== lane) return;
    const dt = Math.abs(note.time - now);
    if (dt <= window && dt < bestDelta) { bestDelta = dt; bestIdx = idx; }
  });
  if (bestIdx >= 0) {
    const note = notes[bestIdx];
    note.__hit = true;
    // judge
    let judgement = 'Miss';
    if (bestDelta <= CONFIG.perfectWindow) {
      judgement = 'Perfect';
      score += 300;
      health = Math.min(CONFIG.healthMax, health + CONFIG.healthGain);
    } else {
      judgement = 'Good';
      score += 100;
      health = Math.min(CONFIG.healthMax, health + CONFIG.healthGain * 0.6);
    }
    showJudge(judgement);
  } else {
    // missed key press
    score = Math.max(0, score - 10);
    health -= CONFIG.healthLoss * 0.25;
    showJudge('Miss');
  }
  // clamp health
  if (health <= 0) {
    endSong(false);
  }
}

function showJudge(text) {
  judgeEl.textContent = text;
  lastJudgeTs = Date.now();
}

// ---------- automatic "miss" marking for notes that passed ----------
function scanMissedNotes() {
  const now = audio.currentTime;
  notes.forEach(note => {
    if (note.__hit || note.__missed) return;
    if ((now - note.time) > CONFIG.hitWindow) {
      // missed
      note.__missed = true;
      health -= CONFIG.healthLoss;
      showJudge('Miss');
      if (health <= 0) endSong(false);
    }
  });
}

// ---------- song control ----------
function startSong() {
  if (playStarted) return;
  playStarted = true;
  // reset state
  score = 0;
  health = CONFIG.healthMax * 0.6;
  notes.forEach(n => { delete n.__hit; delete n.__missed; });
  opponentHits = {};
  audio.currentTime = 0;
  audio.play().catch(()=>{ /* autoplay blocked — user must click */ });
  requestAnimationFrame(drawFrame);
  scanInterval = setInterval(scanMissedNotes, 100);
}

function endSong(won) {
  // stop audio
  if (audio && !audio.paused) audio.pause();
  clearInterval(scanInterval);
  const msg = won ? 'Song complete! Nice.' : 'You lost...';
  alert(msg + '\nScore: ' + score);
  playStarted = false;
}

// start on first user interaction (must be triggered by user gesture for audio on many browsers)
document.addEventListener('click', function onFirst() {
  if (!playStarted) {
    // show instruction then start
    if (confirm('Start song (jairos turf demo)?')) startSong();
  }
  document.removeEventListener('click', onFirst);
});

// end when audio ends
audio.addEventListener('ended', () => {
  // determine win by remaining health > threshold
  endSong(health > 10);
});

// scan loop ref
let scanInterval = null;

// ---------- small debugging: click/tap lane on canvas ----------
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  // detect lane
  for(let i=0;i<CONFIG.lanes;i++){
    const laneX = laneStartX + i*(laneWidth + laneGap);
    if (x >= laneX && x <= laneX + laneWidth) {
      handlePress(i);
      break;
    }
  }
});

// ---------- utility: load/replace beatmap helper (if you want to paste your chart) ----------
window.loadBeatmap = function(newMap) {
  // newMap: [{time:seconds, lane:0..3}, ...]
  notes = newMap.map(n => ({time: n.time, lane: n.lane}));
}

// ---------- init draw once ----------
drawFrame();
