// ---------------------- USER & ADMIN SETUP ----------------------
let username = prompt("Enter your username:") || "unknown loser(anonymous)";

username = username.toString();
const trimmed = username.trim();            
const cleanName = trimmed.replace(/\s+/g, "").toLowerCase(); 

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
  } else {
    alert("just kidding, you are NOT the real bian, loser.");
    username = "fake bian (loser)";
  }
}

const identityKey = cleanName || username.replace(/\s+/g, "").toLowerCase();

// --- ADMIN ICON ---
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
const openGameBtn = document.getElementById("open-game");
const timerEl = document.getElementById("timeout-timer");

const gifToggle = document.getElementById('gif-toggle');
const gifMenu = document.getElementById('gif-menu');
const gifSearchInput = document.getElementById('gif-search-input');
const gifResults = document.getElementById('gif-results');

chatInput.focus();

if (openGameBtn) {
  openGameBtn.addEventListener("click", () => {
    window.open("game.html", "_blank");
  });
}

if (isAdmin && clearChatBtn) clearChatBtn.style.display = "inline-block";

const messagesRef = db.ref("messages");
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

// ---------------------- GIF SEARCH (TENOR) ----------------------
gifToggle.addEventListener('click', () => {
  gifMenu.style.display = (gifMenu.style.display === 'block') ? 'none' : 'block';
});

gifSearchInput.addEventListener('input', () => {
  const query = gifSearchInput.value.trim();
  if (query.length < 2) return;

  fetch(`https://tenor.googleapis.com/v2/search?q=${query}&key=LIVDSRZULEUB&limit=10`)
    .then(res => res.json())
    .then(data => {
      gifResults.innerHTML = '';
      data.results.forEach(gif => {
        const img = document.createElement('img');
        img.src = gif.media_formats.tinygif.url;
        img.onclick = () => {
          // AUTO-SEND GIF DIRECTLY
          messagesRef.push({ 
            text: gif.media_formats.gif.url, 
            username: username, 
            timestamp: Date.now() 
          });
          gifMenu.style.display = 'none';
          gifSearchInput.value = '';
        };
        gifResults.appendChild(img);
      });
    });
});

// ---------------------- SEND MESSAGE ----------------------
sendChat.addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (!text) return;

  const myTimeout = timeouts[identityKey];
  if (myTimeout && myTimeout.until > Date.now()) {
    alert("you are timed out.");
    return;
  }

  messagesRef.push({ text, username: username, timestamp: Date.now() });
  chatInput.value = "";
});

chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendChat.click();
});

// ---------------------- MESSAGE RECEIVING & RENDERING ----------------------
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

    // Detect if text is a GIF/Image link
    if (msg.text.match(/\.(jpeg|jpg|gif|png|webp)/i) || msg.text.includes("tenor.com")) {
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
      const choice = prompt("Timeout duration (seconds):", "30");
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
    timerEl.textContent = seconds > 0 ? `You are timed out: ${seconds}s more.` : "";
  }
  tick();
  timeoutInterval = setInterval(tick, 500);
}

document.addEventListener('click', () => {
  const bgm = document.getElementById('bgm');
  if (bgm && bgm.paused) bgm.play().catch(()=>{});
}, { once: true });
