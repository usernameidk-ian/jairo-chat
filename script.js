// ---------------------- USER & ADMIN SETUP ----------------------
let username = prompt("Enter your username:") || "unknown loser(anonymous)";

// keep raw and trimmed variations
username = username.toString();
const trimmed = username.trim();            
const cleanName = trimmed.replace(/\s+/g, "").toLowerCase(); 

// admin credentials
const adminUsername = "bian";
const adminPassword = "hehehaha123";

let password = "";
let isAdmin = false;

// impersonation / admin logic:
if (cleanName === adminUsername && trimmed !== adminUsername) {
  alert("this username is RESERVED. go choose another name.");
  location.reload();
}

// prompt for admin password only if they entered exactly "bian"
if (trimmed === adminUsername) {
  password = prompt("Enter admin password:");
  if (password === adminPassword) {
    isAdmin = true;
    username = adminUsername;
    // SHOW THE APPLE BUTTON IF ADMIN
    const toggleBtn = document.getElementById('admin-toggle');
    if(toggleBtn) toggleBtn.style.display = 'flex'; 
  } else {
    alert("just kidding, you are NOT the real bian, loser.");
    username = "fake bian (loser)";
  }
}

const identityKey = cleanName || username.replace(/\s+/g, "").toLowerCase();

// --- ADMIN ICON FOR CHAT MESSAGES ---
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

const userColor = stringToColor(username);

// ---------------------- UI ELEMENTS & FIREBASE SETUP ----------------------
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendChat = document.getElementById("send-chat");
const clearChatBtn = document.getElementById("clear-chat");
const openGameBtn = document.getElementById("open-game");
const timerEl = document.getElementById("timeout-timer");

const gifBtn = document.getElementById('gif-btn');
const emojiBtn = document.getElementById('emoji-btn');
const gifVault = document.getElementById('gif-vault');
const emojiVault = document.getElementById('emoji-vault');

// ADMIN TOGGLE ELEMENTS
const adminToggle = document.getElementById('admin-toggle');
const soundBoard = document.getElementById('admin-soundboard');
const closeSfx = document.getElementById('close-sfx');

chatInput.focus();

if (openGameBtn) {
  openGameBtn.addEventListener("click", () => {
    window.open("game.html", "_blank");
  });
}

// Logic for the Apple Button
if (adminToggle) {
  adminToggle.onclick = () => {
    if (soundBoard.style.display === 'none' || soundBoard.style.display === '') {
      soundBoard.style.display = 'flex';
    } else {
      soundBoard.style.display = 'none';
    }
  };
}

if (closeSfx) {
  closeSfx.onclick = () => {
    soundBoard.style.display = 'none';
  };
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

// ---------------------- SOUNDBOARD LOGIC (FIXED) ----------------------

// Capture the exact time the user opened the page
const loadTime = Date.now();

window.triggerSound = function(soundName) {
  if (!isAdmin) return;
  // Send the sound AND the current time to Firebase
  soundRef.set({ name: soundName, time: Date.now() });
};

soundRef.on("value", (snapshot) => {
  const data = snapshot.val();
  // ONLY play if the sound timestamp is NEWER than when we loaded the page
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

function populateVault(container, items, isImage) {
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
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendChat.click();
});

// ---------------------- MESSAGE RECEIVING ----------------------
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
    deleteBtn.style.marginLeft = "8px";
    deleteBtn.onclick = () => { db.ref("messages").child(msgKey).remove(); };
    p.appendChild(deleteBtn);

    const timeoutBtn = document.createElement("button");
    timeoutBtn.textContent = "⏰";
    timeoutBtn.style.marginLeft = "6px";
    timeoutBtn.onclick = () => {
      const choice = prompt("Timeout duration (in seconds):", "30");
      const duration = parseInt(choice, 10) * 1000;
      if (!isNaN(duration) && duration > 0) {
        const targetClean = (msg.username || "").toString().trim().replace(/\s+/g, "").toLowerCase();
        db.ref("timeouts").child(targetClean).set({ until: Date.now() + duration, by: username });
      }
    };
    p.appendChild(timeoutBtn);
  }

  p.dataset.key = msgKey;
  chatMessages.appendChild(p);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

messagesRef.on("child_removed", (snapshot) => {
  const key = snapshot.key;
  const msgEl = [...chatMessages.children].find(el => el.dataset.key === key);
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
  if (!my || my.until <= Date.now()) {
    timerEl.textContent = "";
    return;
  }
  function tick() {
    const remaining = Math.max(0, my.until - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    timerEl.textContent = seconds > 0 ? `You are timed out for ${seconds}s more.` : "";
    if (seconds <= 0) clearInterval(timeoutInterval);
  }
  tick();
  timeoutInterval = setInterval(tick, 500);
}

// Play BGM on first interaction
document.addEventListener('click', () => {
  const bgm = document.getElementById('bgm');
  if (bgm && bgm.paused) bgm.play().catch(()=>{});
}, { once: true });
