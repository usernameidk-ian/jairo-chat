// ---------------------- USER & ADMIN SETUP ----------------------
let username = prompt("Enter your username:") || "unknown loser(anonymous)";

// Admin info
const adminUsername = "bian";
const adminPassword = "hehehaha123";

// Check if user tries to use admin name
let password = "";
if (username === adminUsername) {
  password = prompt("Enter admin password:");
  if (password !== adminPassword) {
    alert("just kidding, you are NOT the real bian, loser. ");
    username = "fake bian (loser)";
  }
}

// Verify admin status
const isAdmin = username === adminUsername && password === adminPassword;

// Give each user a unique color based on name
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

// ---------------------- COOKIE CLICKER ----------------------
let score = 0;
let cps = 0;
let upgrades = {
  cursor: { cost: 15, cps: 1 },
  auto: { cost: 50, cps: 2 },
  grandma: { cost: 100, cps: 5 },
  farm: { cost: 500, cps: 20 },
  factory: { cost: 2000, cps: 100 },
  mine: { cost: 10000, cps: 500 },
  bank: { cost: 50000, cps: 2500 },
  lab: { cost: 200000, cps: 10000 },
  spaceStation: { cost: 1000000, cps: 50000 },
  galaxyFactory: { cost: 5000000, cps: 250000 },
  timeMachine: { cost: 20000000, cps: 1000000 },
};

const scoreDisplay = document.getElementById("score");
const cpsDisplay = document.getElementById("cps");
const cookie = document.getElementById("cookie");

function updateDisplay() {
  scoreDisplay.textContent = score.toLocaleString();
  cpsDisplay.textContent = cps.toLocaleString();
  for (const key in upgrades) {
    const btn = document.getElementById(
      "buy" + key.charAt(0).toUpperCase() + key.slice(1)
    );
    if (btn)
      btn.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)} (+${
        upgrades[key].cps
      } CPS) — Cost: ${upgrades[key].cost.toLocaleString()}`;
  }
}

// Cookie click
cookie.addEventListener("click", () => {
  score++;
  updateDisplay();
});

// Buy upgrades
function buyUpgrade(type) {
  let upgrade = upgrades[type];
  if (score >= upgrade.cost) {
    score -= upgrade.cost;
    cps += upgrade.cps;
    upgrade.cost = Math.floor(upgrade.cost * 1.5);
    updateDisplay();
  }
}

Object.keys(upgrades).forEach((name) => {
  const btn = document.getElementById(
    "buy" + name.charAt(0).toUpperCase() + name.slice(1)
  );
  if (btn) btn.addEventListener("click", () => buyUpgrade(name));
});

// CPS loop
setInterval(() => {
  score += cps;
  updateDisplay();
}, 1000);

// Save/load progress
setInterval(() => {
  localStorage.setItem("score", score);
  localStorage.setItem("cps", cps);
  localStorage.setItem("upgrades", JSON.stringify(upgrades));
}, 2000);

window.addEventListener("load", () => {
  if (localStorage.getItem("score"))
    score = parseInt(localStorage.getItem("score"));
  if (localStorage.getItem("cps")) cps = parseInt(localStorage.getItem("cps"));
  if (localStorage.getItem("upgrades"))
    upgrades = JSON.parse(localStorage.getItem("upgrades"));
  updateDisplay();
});

// ---------------------- MUSIC ----------------------
document.addEventListener(
  "click",
  () => {
    const bgm = document.getElementById("bgm");
    if (bgm.paused) bgm.play().catch(() => {});
  },
  { once: true }
);

// ---------------------- CHAT ----------------------
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendChat = document.getElementById("send-chat");
const messagesRef = db.ref("messages");
const clearChatBtn = document.getElementById("clear-chat");

// Send message
sendChat.addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (!text) return;
  messagesRef.push({ text, username, timestamp: Date.now() });
  chatInput.value = "";
});
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendChat.click();
});

// Admin features
if (isAdmin) clearChatBtn.style.display = "inline-block";
if (isAdmin)
  clearChatBtn.addEventListener("click", () => {
    if (confirm("Delete all messages?")) {
      db.ref("messages").remove();
      chatMessages.innerHTML = "";
    }
  });

// ---------------------- SHOW MESSAGES ----------------------
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

// ---------------------- GOLDEN COOKIE ----------------------
const goldenCookieContainer = document.createElement("div");
goldenCookieContainer.id = "golden-cookie-container";
document.body.appendChild(goldenCookieContainer);

function spawnGoldenCookie() {
  if (Math.random() < 0.1) {
    const bonus = Math.floor(
      Math.random() * (20000000 - 500000 + 1) + 500000
    ); // 0.5M → 20M
    const gc = document.createElement("img");
    gc.src = "golden-cookie.png";
    gc.style.width = "60px";
    gc.style.position = "absolute";
    gc.style.top = Math.random() * (window.innerHeight - 60) + "px";
    gc.style.left = Math.random() * (window.innerWidth - 60) + "px";
    gc.style.cursor = "pointer";
    gc.style.zIndex = 10000;

    let dx = (Math.random() * 2 + 1) * (Math.random() < 0.5 ? -1 : 1);
    let dy = (Math.random() * 2 + 1) * (Math.random() < 0.5 ? -1 : 1);
    const moveInterval = setInterval(() => {
      let top = parseFloat(gc.style.top);
      let left = parseFloat(gc.style.left);
      if (top + dy < 0 || top + dy > window.innerHeight - 60) dy *= -1;
      if (left + dx < 0 || left + dx > window.innerWidth - 60) dx *= -1;
      gc.style.top = top + dy + "px";
      gc.style.left = left + dx + "px";
    }, 30);

    gc.addEventListener("click", () => {
      score += bonus;
      updateDisplay();
      messagesRef.push({
        text: `✨ ${username} clicked a Golden Cookie! +${bonus.toLocaleString()} cookies!`,
        username: "System",
        timestamp: Date.now(),
      });
      clearInterval(moveInterval);
      gc.remove();
    });

    goldenCookieContainer.appendChild(gc);
    setTimeout(() => {
      clearInterval(moveInterval);
      gc.remove();
    }, 15000);
  }
}
setInterval(spawnGoldenCookie, 30000);
