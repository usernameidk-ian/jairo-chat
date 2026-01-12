// ---------------------- USER & ADMIN SETUP ----------------------
let username = prompt("Enter your username:") || "unknown loser(anonymous)";

username = username.toString();
const trimmed = username.trim();            
const cleanName = trimmed.replace(/\s+/g, "").toLowerCase(); 

// admin credentials
const adminUsername = "bian";
const adminPassword = "hehehaha123";

let password = "";
let isAdmin = false;

if (cleanName === adminUsername && trimmed !== adminUsername) {
  alert("this username is RESERVED. go choose another name.");
  location.reload();
}

if (trimmed === adminUsername) {
  password = prompt("Enter admin password:");
  if (password === adminPassword) {
    isAdmin = true;
    username = adminUsername;
    const toggleBtn = document.getElementById('admin-toggle');
    if(toggleBtn) toggleBtn.style.display = 'flex'; 
  } else {
    alert("just kidding, you are NOT the real bian, loser.");
    username = "fake bian (loser)";
  }
}

const identityKey = cleanName || username.replace(/\s+/g, "").toLowerCase();

const adminIconSrc = "purplestar.png"; 

function addAdminIcon(p, messageUsername) {
  if (messageUsername === adminUsername) {
    const icon = document.createElement("img");
    icon.src = adminIconSrc;
    icon.className = "admin-icon";
    icon.alt = "admin";
    p.prepend(icon); 
  }
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  let color = "#";
  for (let i = 0; i < 3; i++) color += ("00" + ((hash >> (i * 8)) & 0xff).toString(16)).slice(-2);
  return color;
}

// ---------------------- UI ELEMENTS & FIREBASE SETUP ----------------------
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendChat = document.getElementById("send-chat");
const clearChatBtn = document.getElementById("clear-chat");
const timerEl = document.getElementById("timeout-timer");

const gifBtn = document.getElementById('gif-btn');
const emojiBtn = document.getElementById('emoji-btn');
const gifVault = document.getElementById('gif-vault');
const emojiVault = document.getElementById('emoji-vault');

const adminToggle = document.getElementById('admin-toggle');
const soundBoard = document.getElementById('admin-soundboard');
const closeSfx = document.getElementById('close-sfx');

chatInput.focus();

if (adminToggle) {
  adminToggle.onclick = () => {
    soundBoard.style.display = (soundBoard.style.display === 'none' || soundBoard.style.display === '') ? 'flex' : 'none';
  };
}

if (closeSfx) closeSfx.onclick = () => soundBoard.style.display = 'none';

// open game in new tab
if (openGameBtn) {
  openGameBtn.addEventListener("click", () => {
    window.open("game.html", "_blank");
  });
}

if (isAdmin && clearChatBtn) clearChatBtn.style.display = "inline-block";

const messagesRef = db.ref("messages");
const soundRef = db.ref("global_sfx"); 

let timeouts = {};
let timeoutInterval = null;

if (isAdmin && clearChatBtn) {
  clearChatBtn.addEventListener("click", () => {
    if (confirm("Delete all messages?")) {
      db.ref("messages").remove();
      chatMessages.innerHTML = "";
    }
  });
}

// ---------------------- SOUNDBOARD LOGIC ----------------------
const loadTime = Date.now();

window.triggerSound = function(soundName) {
  if (!isAdmin) return;
  soundRef.set({ name: soundName, time: Date.now() });
};

soundRef.on("value", (snapshot) => {
  const data = snapshot.val();
  if (data && data.time > loadTime) {
    const sfx = document.getElementById('sfx-player');
    sfx.src = data.name + ".mp3";
    sfx.play().catch(() => {});
  }
});

// ---------------------- GIF & EMOJI LISTS ----------------------
const myGifs = [
  "https://tenor.com/view/ishowspeed-yapping-i-stand-at-the-end-of-my-days-i-have-sinned-at-the-end-of-my-days-speed-talking-gif-17714085846938483931.gif",
  "https://tenor.com/view/speed-ishowspeed-ishowspeed-jump-jump-at-camera-gif-13692130268687196891.gif",
  "https://tenor.com/view/ishowspeed-hey-calming-down-funny-fortnite-gif-14401934564791130107.gif",
  "https://tenor.com/view/speed-shock-scared-scary-speed-covering-mouth-ishowspeed-gif-9313694227637759402.gif",
  "https://tenor.com/view/ishowspeed-speed-clueless-acting-as-if-he-understands-speed-clueless-gif-9460732332464534725.gif"
];

const myEmojis = ["e1.png", "e2.png", "e3.png", "e4.png", "e5.png"];

function populateVault(container, items) {
  items.forEach(url => {
    const img = document.createElement('img');
    img.src = url;
    img.onclick = () => {
      messagesRef.push({ text: url, username: username, timestamp: Date.now() });
      gifVault.style.display = 'none';
      emojiVault.style.display = 'none';
    };
    container.appendChild(img);
  });
}
populateVault(document.getElementById('gif-list'), myGifs, true);
populateVault(document.getElementById('emoji-list'), myEmojis, true);

gifBtn.onclick = () => { gifVault.style.display = gifVault.style.display === 'block' ? 'none' : 'block'; emojiVault.style.display = 'none'; };
emojiBtn.onclick = () => { emojiVault.style.display = emojiVault.style.display === 'block' ? 'none' : 'block'; gifVault.style.display = 'none'; };

// ---------------------- SEND MESSAGE ----------------------
sendChat.addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (!text) return;
  const myTimeout = timeouts[identityKey];
  if (myTimeout && myTimeout.until > Date.now()) {
    alert("you are timed out, refrain from chatting till ur timeout is done.");
    return;
  }
  messagesRef.push({ text, username: username, timestamp: Date.now() });
  chatInput.value = "";
});
chatInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendChat.click(); });

messagesRef.on("child_added", (snapshot) => {
  const msg = snapshot.val();
  const msgKey = snapshot.key;
  const p = document.createElement("p");
  if (msg && msg.text) {
    const userSpan = document.createElement("span");
    userSpan.className = "username";
    userSpan.textContent = msg.username + ":";
    userSpan.style.color = stringToColor(msg.username);
    const contentDiv = document.createElement("div");
    contentDiv.className = "msg-content";
    if (msg.text.includes("tenor.com") || msg.text.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
      const img = document.createElement("img");
      img.src = msg.text;
      img.className = "chat-media";
      contentDiv.appendChild(img);
    } else {
      const textSpan = document.createElement("span");
      textSpan.className = "msgtext";
      textSpan.textContent = " " + msg.text;
      contentDiv.appendChild(textSpan);
    }
    addAdminIcon(p, msg.username);
    p.appendChild(userSpan);
    p.appendChild(contentDiv);
  }
  if (isAdmin) {
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "❌";
    deleteBtn.onclick = () => { db.ref("messages").child(msgKey).remove(); };
    p.appendChild(deleteBtn);
  }
  p.dataset.key = msgKey;
  chatMessages.appendChild(p);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

messagesRef.on("child_removed", (snapshot) => {
  const msgEl = [...chatMessages.children].find(el => el.dataset.key === snapshot.key);
  if (msgEl) msgEl.remove();
});

// ---------------------- TIMEOUTS & MUSIC ----------------------
db.ref("timeouts").on("value", (snapshot) => {
  timeouts = snapshot.val() || {};
  updateTimeoutDisplay();
});

function updateTimeoutDisplay() {
  clearInterval(timeoutInterval);
  const my = timeouts[identityKey];
  if (!my || my.until <= Date.now()) { timerEl.textContent = ""; return; }
  function tick() {
    const seconds = Math.ceil(Math.max(0, my.until - Date.now()) / 1000);
    timerEl.textContent = seconds > 0 ? `You are timed out for ${seconds}s more.` : "";
    if (seconds <= 0) clearInterval(timeoutInterval);
  }
  tick();
  timeoutInterval = setInterval(tick, 500);
}

document.addEventListener('click', () => {
  const bgm = document.getElementById('bgm');
  if (bgm && bgm.paused) bgm.play().catch(()=>{});
}, { once: true });

// ---------------------- SCHOOL CLOCK LOGIC ----------------------
// Schedules from
const schedules = {
  regular: [
    { n: "ADVISORY", s: "08:00", e: "08:29" },
    { n: "PERIOD 1", s: "08:33", e: "09:28" },
    { n: "PERIOD 2", s: "09:32", e: "10:27" },
    { n: "BREAK", s: "10:27", e: "10:37" },
    { n: "PERIOD 3", s: "10:41", e: "11:36" },
    { n: "PERIOD 4", s: "11:40", e: "12:35" },
    { n: "LUNCH", s: "12:35", e: "13:05" },
    { n: "PERIOD 5", s: "13:09", e: "14:04" },
    { n: "PERIOD 6", s: "14:08", e: "15:03" }
  ],
  tuesday: [
    { n: "PERIOD 1", s: "08:00", e: "09:03" },
    { n: "PERIOD 2", s: "09:07", e: "09:55" },
    { n: "BREAK", s: "09:55", e: "10:05" },
    { n: "PERIOD 3", s: "10:09", e: "10:57" },
    { n: "PERIOD 4", s: "11:01", e: "11:49" },
    { n: "LUNCH", s: "11:49", e: "12:19" },
    { n: "PERIOD 5", s: "12:23", e: "13:11" },
    { n: "PERIOD 6", s: "13:15", e: "14:03" }
  ],
  minimum: [
    { n: "PERIOD 1", s: "08:00", e: "08:52" },
    { n: "PERIOD 2", s: "08:56", e: "09:33" },
    { n: "PERIOD 3", s: "09:37", e: "10:14" },
    { n: "BRUNCH", s: "10:14", e: "10:44" },
    { n: "PERIOD 4", s: "10:48", e: "11:25" },
    { n: "PERIOD 5", s: "11:29", e: "12:06" },
    { n: "PERIOD 6", s: "12:10", e: "12:47" }
  ]
};

const minDates = ["2025-09-05", "2025-10-24", "2025-11-21", "2025-12-19", "2026-02-20", "2026-03-13", "2026-04-10", "2026-06-05", "2026-06-08", "2026-06-10"];

function updateClock() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const time = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const day = now.getDay();
  
  let sched = schedules.regular;
  if (minDates.includes(dateStr)) sched = schedules.minimum;
  else if (day === 2) sched = schedules.tuesday;

  const startLimit = parseTime("07:55");
  const endLimit = parseTime(sched[sched.length - 1].e);

  const clockEl = document.getElementById('school-clock');
  // Disappear on weekends or outside school hours
  if (day === 0 || day === 6 || time < startLimit || time > endLimit) {
    clockEl.style.display = 'none';
    return;
  }

  clockEl.style.display = 'block';
  let current = null, next = null;

  for (let i = 0; i < sched.length; i++) {
    let s = parseTime(sched[i].s), e = parseTime(sched[i].e);
    if (time >= s && time < e) {
      current = sched[i];
      next = sched[i+1] || null;
      break;
    } else if (i < sched.length - 1) {
      let nextS = parseTime(sched[i+1].s);
      if (time >= e && time < nextS) {
        current = { n: "PASSING PERIOD", e: sched[i+1].s };
        next = sched[i+1];
        break;
      }
    }
  }

  if (current) {
    document.getElementById('current-name').textContent = current.n;
    const target = parseTime(current.e);
    document.getElementById('timer-display').textContent = formatTimer(target - time);
    document.getElementById('next-name').textContent = next ? next.n : "SCHOOL ENDS";
  }
}

function parseTime(t) { const [h, m] = t.split(':').map(Number); return h * 3600 + m * 60; }
function formatTimer(s) { return Math.floor(s/60) + ":" + (s%60).toString().padStart(2, '0'); }

setInterval(updateClock, 1000);
updateClock();
