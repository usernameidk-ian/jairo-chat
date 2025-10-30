// ---------------------- USER & ADMIN SETUP ----------------------
let username = prompt("Enter your username:") || "unknown loser(anonymous)";
const adminUsername = "bian";
const adminPassword = "hehehaha123";

let password = "";
if (username === adminUsername) {
  password = prompt("Enter admin password:");
  if (password !== adminPassword) {
    alert("just kidding, you are NOT the real bian, loser. ");
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

// ---------------------- FLAPPY BIRD ----------------------
const canvas = document.getElementById("flappyCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 300;
canvas.height = 400;

let score = 0;
let best = parseInt(localStorage.getItem("bestScore")) || 0;
let pipes = [];
let gameOver = false;

const birdImg = new Image();
birdImg.src = "jairobird.png";

const pipeTopImg = new Image();
pipeTopImg.src = "pipe-top.png";

const pipeBottomImg = new Image();
pipeBottomImg.src = "pipe-bottom.png";

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
}

function drawBird() {
  ctx.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
}

function drawPipes() {
  pipes.forEach(pipe => {
    ctx.drawImage(pipeTopImg, pipe.x, pipe.top - pipeTopImg.height, pipe.width, pipe.top);
    ctx.drawImage(pipeBottomImg, pipe.x, canvas.height - pipe.bottom, pipe.width, pipe.bottom);
  });
}

function addPipe() {
  const gap = 120;
  const minHeight = 30;
  const maxHeight = canvas.height - gap - minHeight;
  const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
  const bottomHeight = canvas.height - gap - topHeight;
  pipes.push({ x: canvas.width, width: 40, top: topHeight, bottom: bottomHeight, passed: false });
}

function updateGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Bird physics
  if (!gameOver) {
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;
  }

  // Check collisions with ground/ceiling
  if (bird.y + bird.height > canvas.height || bird.y < 0) gameOver = true;

  // Move pipes & check collision
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
    }
  });

  // Remove offscreen pipes
  pipes = pipes.filter(pipe => pipe.x + pipe.width > 0);

  // Add new pipes with proper spacing
  if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - 150) {
    addPipe();
  }

  drawPipes();
  drawBird();

  document.getElementById("score").textContent = score;
  document.getElementById("best").textContent = best;

  // Game over overlay
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

// Flap / restart
function flap() {
  if (gameOver) {
    resetGame();
    return;
  }
  bird.velocity = bird.lift;
}

canvas.addEventListener("mousedown", flap);
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") flap();
});

// Start game loop
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
