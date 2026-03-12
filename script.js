let username = prompt("Enter your username:") || "unknown loser";
// Function to give each username a consistent color
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ("00" + value.toString(16)).slice(-2);
  }
  return color;
}
const userColor = stringToColor(username); 
let score = 0;
let cps = 0;

// Upgrade data
let upgrades = {
  cursor: { cost: 15, cps: 1 },
  auto: { cost: 50, cps: 2 },
  grandma: { cost: 100, cps: 5 },
  farm: { cost: 500, cps: 20 },
  factory: { cost: 2000, cps: 100 }
};

const scoreDisplay = document.getElementById("score");
const cpsDisplay = document.getElementById("cps");
const cookie = document.getElementById("cookie");

function updateDisplay() {
  scoreDisplay.textContent = score;
  cpsDisplay.textContent = cps;
  document.getElementById("buyCursor").textContent = `Cursor (+1 CPS) — Cost: ${upgrades.cursor.cost}`;
  document.getElementById("buyAuto").textContent = `Auto Clicker (+2 CPS) — Cost: ${upgrades.auto.cost}`;
  document.getElementById("buyGrandma").textContent = `Grandma (+5 CPS) — Cost: ${upgrades.grandma.cost}`;
  document.getElementById("buyFarm").textContent = `Farm (+20 CPS) — Cost: ${upgrades.farm.cost}`;
  document.getElementById("buyFactory").textContent = `Factory (+100 CPS) — Cost: ${upgrades.factory.cost}`;
}

// Click cookie
cookie.addEventListener("click", () => {
  score++;
  updateDisplay();
});

// Buy function
function buyUpgrade(type) {
  let upgrade = upgrades[type];
  if (score >= upgrade.cost) {
    score -= upgrade.cost;
    cps += upgrade.cps;
    upgrade.cost = Math.floor(upgrade.cost * 1.5);
    updateDisplay();
  }
}

// Attach events
document.getElementById("buyCursor").addEventListener("click", () => buyUpgrade("cursor"));
document.getElementById("buyAuto").addEventListener("click", () => buyUpgrade("auto"));
document.getElementById("buyGrandma").addEventListener("click", () => buyUpgrade("grandma"));
document.getElementById("buyFarm").addEventListener("click", () => buyUpgrade("farm"));
document.getElementById("buyFactory").addEventListener("click", () => buyUpgrade("factory"));

// CPS loop
setInterval(() => {
  score += cps;
  updateDisplay();
}, 1000);

// Save progress every 2s
setInterval(() => {
  localStorage.setItem("score", score);
  localStorage.setItem("cps", cps);
  localStorage.setItem("upgrades", JSON.stringify(upgrades));
}, 2000);

// Load progress on start
window.addEventListener("load", () => {
  if (localStorage.getItem("score")) {
    score = parseInt(localStorage.getItem("score"));
  }
  if (localStorage.getItem("cps")) {
    cps = parseInt(localStorage.getItem("cps"));
  }
  if (localStorage.getItem("upgrades")) {
    upgrades = JSON.parse(localStorage.getItem("upgrades"));
  }
  updateDisplay();
});

updateDisplay();

// Enable music on first click
document.addEventListener("click", () => {
  const bgm = document.getElementById("bgm");
  if (bgm.paused) {
    bgm.play().catch(() => {});
  }
}, { once: true });

// Firebase chat system
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendChat = document.getElementById("send-chat");

// Reference to "messages" in your Firebase Realtime Database
const messagesRef = db.ref("messages");

// Send message to Firebase
sendChat.addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (!text) return;

  messagesRef.push({
    text: text,
    username: username,
    timestamp: Date.now()
  });

  chatInput.value = "";
});

// Press Enter to send
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendChat.click();
});

// Listen for new messages
messagesRef.on("child_added", (snapshot) => {
  const msg = snapshot.val();
  const p = document.createElement("p");
  p.textContent = `${msg.username}: ${msg.text}`;
  
  // Color username
  p.style.color = stringToColor(msg.username);
  
  chatMessages.appendChild(p);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});
