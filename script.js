// ---------------------- USER & ADMIN SETUP ----------------------
let username = prompt("Enter your username:") || "unknown loser(anonymous)";
const adminUsername = "bian";
const adminPassword = "hehehaha123";

let password = "";
if (username === adminUsername) {
  password = prompt("Enter admin password:");
  if (password !== adminPassword) {
    alert("just kidding, you are NOT the real bian, loser.");
    username = "fake bian (loser)";
  }
}

const isAdmin = username === adminUsername && password === adminPassword;

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  let color = "#";
  for (let i = 0; i < 3; i++)
    color += ("00" + ((hash >> (i * 8)) & 0xff).toString(16)).slice(-2);
  return color;
}

const userColor = stringToColor(username);

// ---------------------- FLAPPY BIRD SETUP ----------------------
const canvas = document.getElementById("flappyCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 300;
canvas.height = 400;

let score = 0;
let best = parseInt(localStorage.getItem("bestScore")) || 0;
let pipes = [];
let gameOver = false;
let paused = false; // for video reward pauses

const birdImg = new Image();
birdImg.src = "jairobird.png";

const pipeTopImg = new Image();
pipeTopImg.src = "pipe-top.png";

const pipeBottomImg = new Image();
pipeBottomImg.src = "pipe-bottom.png";

// ---------------------- CLOUDS ----------------------
let cloudImg = new Image();
function setCloudImage(src) {
  cloudImg.src = src;
}
setCloudImage("cloud.png");

let clouds = [];
for (let i = 0; i < 3; i++) {
  clouds.push({
    x: Math.random() * canvas.width,
    y: Math.random() * (canvas.height / 2),
    width: 60 + Math.random() * 40,
    height: 30 + Math.random() * 20,
    speed: 0.5 + Math.random() * 0.5
  });
}

function drawClouds() {
  clouds.forEach(cloud => {
    ctx.globalAlpha = 0.7;
    ctx.drawImage(cloudImg, cloud.x, cloud.y, cloud.width, cloud.height);
    ctx.globalAlpha = 1.0;
  });
}

function updateClouds() {
  clouds.forEach(cloud => {
    cloud.x -= cloud.speed;
    if (cloud.x + cloud.width < 0) {
      cloud.x = canvas.width + Math.random() * 100;
      cloud.y = Math.random() * (canvas.height / 2);
    }
  });
}

// ---------------------- BIRD ----------------------
const bird = {
  x: 50,
  y: 200,
  width: 40,
  height: 40,
  velocity: 0,
  gravity: 0.5,
  lift: -8
};

function resetGame() {
  bird.y = canvas.height / 2;
  bird.velocity = 0;
  pipes = [];
  score = 0;
  gameOver = false;
  paused = false;
}

function drawBird() {
  ctx.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
}

function drawPipes() {
  pipes.forEach(pipe => {
    const topScale = pipe.top / pipeTopImg.height;
    ctx.drawImage(pipeTopImg, pipe.x, 0, pipe.width, pipeTopImg.height * topScale);

    const bottomScale = pipe.bottom / pipeBottomImg.height;
    ctx.drawImage(pipeBottomImg, pipe.x, canvas.height - pipe.bottom, pipe.width, pipeBottomImg.height * bottomScale);
  });
}

// ---------------------- PIPE SPAWNING ----------------------
function addPipe() {
  const baseGap = 160;
  const gapVariance = 20;
  const gap = baseGap + Math.random() * gapVariance;

  const minHeight = 40;
  const maxHeight = canvas.height - gap - minHeight;
  const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
  const bottomHeight = canvas.height - gap - topHeight;

  pipes.push({ x: canvas.width, width: 40, top: topHeight, bottom: bottomHeight, passed: false });
}

// ---------------------- REWARD VIDEO ----------------------
const rewardScore = 67; // score that triggers video
const rewardVideoSrc = "fastjairobutfell.mp4"; // your video file

function showRewardVideo() {
  paused = true;

  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.8)";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.zIndex = "9999";

  const video = document.createElement("video");
  video.src = rewardVideoSrc;
  video.controls = true;
  video.autoplay = true;
  video.style.width = "80%";
  video.style.maxWidth = "600px";
  video.style.borderRadius = "12px";
  overlay.appendChild(video);

  const continueBtn = document.createElement("button");
  continueBtn.textContent = "Continue Playing";
  continueBtn.style.marginTop = "20px";
  continueBtn.style.padding = "10px 20px";
  continueBtn.style.fontSize = "16px";
  continueBtn.style.borderRadius = "10px";
  continueBtn.style.cursor = "pointer";
  continueBtn.style.background = "#4CAF50";
  continueBtn.style.color = "white";

  continueBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
    startCountdown();
  });

  video.addEventListener("ended", () => {
    document.body.removeChild(overlay);
    startCountdown();
  });

  overlay.appendChild(continueBtn);
  document.body.appendChild(overlay);
}

function startCountdown() {
  let countdown = 3;
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.background = "rgba(0,0,0,0.7)";
  overlay.style.color = "white";
  overlay.style.fontSize = "50px";
  overlay.style.zIndex = "9998";
  document.body.appendChild(overlay);

  const interval = setInterval(() => {
    overlay.textContent = countdown;
    countdown--;
    if (countdown < 0) {
      clearInterval(interval);
      document.body.removeChild(overlay);
      paused = false;
    }
  }, 1000);
}

// ---------------------- GAME LOOP ----------------------
function updateGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateClouds();
  drawClouds();

  if (!gameOver && !paused) {
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;
  }

  if (bird.y + bird.height > canvas.height || bird.y < 0) gameOver = true;

  if (!paused) {
    pipes.forEach(pipe => {
      if (!gameOver) pipe.x -= 2;

      if (
        bird.x < pipe.x + pipe.width &&
        bird.x + bird.width > pipe.x &&
        (bird.y < pipe.top || bird.y + bird.height > canvas.height - pipe.bottom)
      ) gameOver = true;

      if (!pipe.passed && pipe.x + pipe.width < bird.x) {
        score++;
        pipe.passed = true;
        if (score > best) {
          best = score;
          localStorage.setItem("bestScore", best);
        }

        // trigger reward video
        if (score === rewardScore) showRewardVideo();
      }
    });

    pipes = pipes.filter(pipe => pipe.x + pipe.width > 0);
    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - 150) {
      addPipe();
    }
  }

  drawPipes();
  drawBird();

  document.getElementById("score").textContent = score;
  document.getElementById("best").textContent = best;

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Game Over!", 70, 180);
    ctx.fillText("Click or press Up/Space to restart", 10, 210);
  }

  requestAnimationFrame(updateGame);
}

// ---------------------- FLAP / RESTART ----------------------
function flap() {
  if (paused) return;
  if (gameOver) {
    resetGame();
    return;
  }
  bird.velocity = bird.lift;
}

canvas.addEventListener("mousedown", flap);

document.addEventListener("keydown", (e) => {
  if ((e.code === "Space" || e.code === "ArrowUp") && document.activeElement !== chatInput) {
    flap();
    e.preventDefault();
  }
});

// ---------------------- START ----------------------
updateGame();

// ---------------------- MUSIC ----------------------
document.addEventListener("click", () => {
  const bgm = document.getElementById("bgm");
  if (bgm.paused) bgm.play().catch(() => {});
}, { once: true });

// ---------------------- CHAT ----------------------
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendChat = document.getElementById("send-chat");
const messagesRef = db.ref("messages");
const clearChatBtn = document.getElementById("clear-chat");

sendChat.addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (!text) return;
  messagesRef.push({ text, username, timestamp: Date.now() });
  chatInput.value = "";
});
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendChat.click();
});

if (isAdmin) clearChatBtn.style.display = "inline-block";
if (isAdmin)
  clearChatBtn.addEventListener("click", () => {
    if (confirm("Delete all messages?")) {
      db.ref("messages").remove();
      chatMessages.innerHTML = "";
    }
  });

messagesRef.on("child_added", (snapshot) => {
  const msg = snapshot.val();
  const p = document.createElement("p");

  if (msg.text) {
    p.textContent = `${msg.username}: ${msg.text}`;
    p.style.color = stringToColor(msg.username);
  }

  if (isAdmin) {
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "❌";
    deleteBtn.style.marginLeft = "10px";
    deleteBtn.addEventListener("click", () => {
      messagesRef.child(snapshot.key).remove();
      p.remove();
    });
    p.appendChild(deleteBtn);
  }

  chatMessages.appendChild(p);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});
