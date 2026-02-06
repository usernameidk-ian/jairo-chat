// ---------------------- DEVICE FINGERPRINTING ----------------------
let deviceID = localStorage.getItem('chat_device_id');
if (!deviceID) {
  deviceID = 'dev-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  localStorage.setItem('chat_device_id', deviceID);
}
console.log("Your Device ID is:", deviceID); 

// ---------------------- USER & ADMIN SETUP ----------------------
let username = prompt("Enter your username:") || "unknown loser(anonymous)";

username = username.toString();
const trimmed = username.trim();            
const cleanName = trimmed.replace(/\s+/g, "").toLowerCase(); 

// admin credentials
const adminUsername = "bian";
const adminPassword = "hehehahahehehaha";

let isAdmin = false;

if (cleanName === adminUsername && trimmed !== adminUsername) {
  alert("this username is RESERVED. go choose another name.");
  location.reload();
}

if (trimmed === adminUsername) {
  const password = prompt("Enter admin password:");
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
const typingIndicator = document.getElementById("typing-indicator");
const charCounter = document.getElementById("char-counter");

const openGameBtn = document.getElementById("open-game");

const gifBtn = document.getElementById('gif-btn');
const emojiBtn = document.getElementById('emoji-btn');
const gifVault = document.getElementById('gif-vault');
const emojiVault = document.getElementById('emoji-vault');

const adminToggle = document.getElementById('admin-toggle');
const soundBoard = document.getElementById('admin-soundboard');
const closeSfx = document.getElementById('close-sfx');

chatInput.focus();

if (openGameBtn) {
  openGameBtn.addEventListener("click", () => {
    window.open("game.html", "_blank");
  });
}

if (adminToggle) {
  adminToggle.onclick = () => {
    soundBoard.style.display = (soundBoard.style.display === 'none' || soundBoard.style.display === '') ? 'flex' : 'none';
  };
}

if (closeSfx) closeSfx.onclick = () => soundBoard.style.display = 'none';

if (isAdmin && clearChatBtn) clearChatBtn.style.display = "inline-block";

const messagesRef = db.ref("messages");
const soundRef = db.ref("global_sfx"); 
const typingRef = db.ref("typing");

let timeouts = null; 
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
  "gifs/1.gif", "gifs/2.gif", "gifs/3.gif", "gifs/4.gif", "gifs/5.gif",
  "gifs/6.gif", "gifs/7.gif", "gifs/8.gif", "gifs/9.gif", "gifs/10.gif",
  "gifs/11.gif", "gifs/12.gif", "gifs/13.gif", "gifs/14.gif", "gifs/15.gif",
  "gifs/16.gif", "gifs/17.gif", "gifs/18.gif", "gifs/19.gif", "gifs/20.gif",
  "gifs/21.gif", "gifs/22.gif", "gifs/23.gif", "gifs/24.gif", "gifs/25.gif"
];

// UPDATED: Now points to emojis/ folder
const myEmojis = [
  "emojis/e1.png", "emojis/e2.png", "emojis/e3.png", "emojis/e4.png", "emojis/e5.png",
  "emojis/e6.png", "emojis/e7.png", "emojis/e8.png", "emojis/e9.png", "emojis/e10.png"
];

function populateVault(container, items) {
  items.forEach(url => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = "media";
    img.onclick = () => {
      if (timeouts === null) {
        alert("Connecting to server... wait a sec.");
        return;
      }
      const myTimeout = timeouts[deviceID];
      if (myTimeout && myTimeout.until > Date.now()) {
        alert("you're timed out buddy.");
        return;
      }

      messagesRef.push({ 
        text: url, 
        username: username, 
        timestamp: Date.now(),
        fingerprint: deviceID
      });
      gifVault.style.display = 'none';
      emojiVault.style.display = 'none';
      typingRef.child(identityKey).remove();
    };
    container.appendChild(img);
  });
}
populateVault(document.getElementById('gif-list'), myGifs);
populateVault(document.getElementById('emoji-list'), myEmojis);

gifBtn.onclick = () => { 
  gifVault.style.display = gifVault.style.display === 'block' ? 'none' : 'block'; 
  emojiVault.style.display = 'none'; 
};

emojiBtn.onclick = () => { 
  emojiVault.style.display = emojiVault.style.display === 'block' ? 'none' : 'block'; 
  gifVault.style.display = 'none'; 
};

document.addEventListener('click', (event) => {
  const isClickInsideGif = gifVault.contains(event.target);
  const isClickOnGifBtn = gifBtn.contains(event.target);
  const isClickInsideEmoji = emojiVault.contains(event.target);
  const isClickOnEmojiBtn = emojiBtn.contains(event.target);

  if (!isClickInsideGif && !isClickOnGifBtn) gifVault.style.display = 'none';
  if (!isClickInsideEmoji && !isClickOnEmojiBtn) emojiVault.style.display = 'none';
});

// ---------------------- CHARACTER LIMIT LOGIC ----------------------
const MAX_CHARS = 2000;

chatInput.addEventListener("input", () => {
    const currentLength = chatInput.value.length;
    const remaining = MAX_CHARS - currentLength;
    
    charCounter.textContent = remaining;
    
    if (remaining < 0) {
        charCounter.classList.add("limit-exceeded");
        sendChat.disabled = true;
    } else {
        charCounter.classList.remove("limit-exceeded");
        sendChat.disabled = false;
    }
});

// ---------------------- ANTI-SPAM (RATE LIMITING) ----------------------
let spamTimestamps = [];
let isRateLimited = false;

function checkRateLimit() {
    const now = Date.now();
    // Remove timestamps older than 5 seconds
    spamTimestamps = spamTimestamps.filter(t => t > now - 5000);
    
    if (spamTimestamps.length >= 10) {
        return true;
    }
    spamTimestamps.push(now);
    return false;
}

// ---------------------- SEND MESSAGE ----------------------
sendChat.addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (!text) return;

  // 1. Character Limit Check
  if (text.length > MAX_CHARS) {
    alert("Message too long! Remove characters.");
    return;
  }

  // 2. Loading Safety Check
  if (timeouts === null) {
    console.log("Still loading data...");
    return; 
  }

  // 3. Server Timeout Check
  const myTimeout = timeouts[deviceID]; 
  if (myTimeout && myTimeout.until > Date.now()) {
    alert("you're timed out.");
    return;
  }
  
  // 4. Local Rate Limit Check
  if (isRateLimited) return; // Already blocked

  if (checkRateLimit()) {
      isRateLimited = true;
      alert("You are being rate limited (too fast!). Cooling down for 3 seconds.");
      sendChat.disabled = true;
      chatInput.disabled = true;
      
      setTimeout(() => {
          isRateLimited = false;
          sendChat.disabled = false;
          chatInput.disabled = false;
          chatInput.focus();
      }, 3000);
      return;
  }

  messagesRef.push({ 
    text: text, 
    username: username, 
    timestamp: Date.now(),
    fingerprint: deviceID
  });
  
  chatInput.value = "";
  charCounter.textContent = MAX_CHARS; // Reset counter
  typingRef.child(identityKey).remove();
});
chatInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendChat.click(); });

// ---------------------- MESSAGES & ENDLESS SCROLL ----------------------
// Track the oldest message we currently have loaded
let oldestLoadedKey = null;

// Initial Load: Last 50 messages
// We use limitToLast(50) so we don't crash browsers with 5000 messages
messagesRef.limitToLast(50).on("child_added", (snapshot) => {
  const msg = snapshot.val();
  const msgKey = snapshot.key;
  
  // If this is the very first message we load, save its key for scrolling up later
  if (!oldestLoadedKey) oldestLoadedKey = msgKey;

  const p = createMessageElement(msg, msgKey);
  chatMessages.appendChild(p);
  
  // Auto-scroll to bottom only if we are already near the bottom
  // (Prevents snapping down if user is reading history)
  if (chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 200) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
  } else if (!oldestLoadedKey || chatMessages.children.length <= 50) {
      // Force scroll on initial load
      chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});

messagesRef.on("child_removed", (snapshot) => {
  const msgEl = [...chatMessages.children].find(el => el.dataset.key === snapshot.key);
  if (msgEl) msgEl.remove();
});

// Helper function to create the message DOM element
function createMessageElement(msg, msgKey) {
  const p = document.createElement("p");
  if (msg && msg.text) {
    const ts = msg.timestamp ? new Date(msg.timestamp) : new Date();
    const timeStr = ts.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const dateStr = ts.toLocaleDateString();
    
    const timeSpan = document.createElement("span");
    timeSpan.className = "timestamp";
    timeSpan.textContent = `[${timeStr} ${dateStr}]`;

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
    p.appendChild(timeSpan);
    p.appendChild(userSpan);
    p.appendChild(contentDiv);
  }

  // Admin Controls
  if (isAdmin) {
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "❌";
    deleteBtn.className = "admin-action-btn";
    deleteBtn.onclick = () => { db.ref("messages").child(msgKey).remove(); };
    p.appendChild(deleteBtn);

    const timeoutBtn = document.createElement("button");
    timeoutBtn.textContent = "⏱️";
    timeoutBtn.className = "admin-action-btn";
    timeoutBtn.onclick = () => {
        const duration = prompt(`How many seconds to timeout ${msg.username}?`);
        if (duration && !isNaN(duration)) {
            const targetFingerprint = msg.fingerprint; 
            if (!targetFingerprint) {
                alert("Cannot timeout: This is an old message without a Device ID.");
                return;
            }
            const untilTime = Date.now() + (parseInt(duration) * 1000);
            db.ref("timeouts").child(targetFingerprint).set({ 
                until: untilTime,
                originalName: msg.username 
            });
            alert(`Timed out device (user: ${msg.username}) for ${duration} seconds.`);
        }
    };
    p.appendChild(timeoutBtn);
  }

  p.dataset.key = msgKey;
  return p;
}

// ENDLESS SCROLL LISTENER
chatMessages.addEventListener("scroll", () => {
    // If scrolled to top and we have a key to load from
    if (chatMessages.scrollTop === 0 && oldestLoadedKey) {
        loadOldMessages();
    }
});

function loadOldMessages() {
    // Load 50 messages ending BEFORE the current oldest key
    messagesRef.orderByKey().endBefore(oldestLoadedKey).limitToLast(50).once("value", (snapshot) => {
        if (!snapshot.exists()) return; // No more messages
        
        const oldHeight = chatMessages.scrollHeight;
        const fragment = document.createDocumentFragment();
        let newOldest = oldestLoadedKey;

        // Snapshot comes in order (Old -> New), so we collect them
        // We prepend them in order before the first child
        const messages = [];
        snapshot.forEach(child => {
            messages.push({ key: child.key, val: child.val() });
        });

        if (messages.length > 0) {
            newOldest = messages[0].key; // Update the marker
        }

        messages.forEach(item => {
            const p = createMessageElement(item.val, item.key);
            fragment.appendChild(p);
        });

        // Insert at the very top
        chatMessages.insertBefore(fragment, chatMessages.firstChild);

        // Update key tracker
        oldestLoadedKey = newOldest;

        // Restore scroll position so it doesn't jump to the top
        chatMessages.scrollTop = chatMessages.scrollHeight - oldHeight;
    });
}

// ---------------------- TIMEOUTS & MUSIC ----------------------
db.ref("timeouts").on("value", (snapshot) => {
  timeouts = snapshot.val() || {}; 
  updateTimeoutDisplay();
});

function updateTimeoutDisplay() {
  clearInterval(timeoutInterval);
  if (!timeouts) return; 

  const myStatus = timeouts[deviceID]; 

  if (!myStatus || myStatus.until <= Date.now()) { 
    timerEl.textContent = ""; 
    return; 
  }
  
  function tick() {
    const seconds = Math.ceil(Math.max(0, myStatus.until - Date.now()) / 1000);
    timerEl.textContent = seconds > 0 ? `Your device is timed out for ${seconds}s more.` : "";
    if (seconds <= 0) {
        clearInterval(timeoutInterval);
        timerEl.textContent = "";
    }
  }
  tick();
  timeoutInterval = setInterval(tick, 500);
}

document.addEventListener('click', () => {
  const bgm = document.getElementById('bgm');
  if (bgm && bgm.paused) bgm.play().catch(()=>{});
}, { once: true });

// ---------------------- TYPING INDICATOR ----------------------
let typeTimeout;

chatInput.addEventListener('input', () => {
  if (timeouts && timeouts[deviceID] && timeouts[deviceID].until > Date.now()) return;

  typingRef.child(identityKey).set({ name: username, time: Date.now() });
  
  typingRef.child(identityKey).onDisconnect().remove();

  clearTimeout(typeTimeout);
  typeTimeout = setTimeout(() => {
    typingRef.child(identityKey).remove();
  }, 3000);
});

let currentTypers = [];
let dots = 1;

typingRef.on('value', (snapshot) => {
  const data = snapshot.val() || {};
  currentTypers = [];
  
  Object.keys(data).forEach(key => {
    if (key !== identityKey) { 
      currentTypers.push(data[key].name);
    }
  });
  updateTypingText();
});

setInterval(() => {
  dots++;
  if (dots > 3) dots = 1;
  updateTypingText();
}, 500);

function updateTypingText() {
  if (currentTypers.length === 0) {
    typingIndicator.textContent = "";
    typingIndicator.style.display = "none";
    return;
  }
  
  typingIndicator.style.display = "block";
  const dotStr = ".".repeat(dots);
  
  if (currentTypers.length === 1) {
    typingIndicator.textContent = `${currentTypers[0]} is typing${dotStr}`;
  } else if (currentTypers.length === 2) {
    typingIndicator.textContent = `${currentTypers[0]} and ${currentTypers[1]} are typing${dotStr}`;
  } else {
    typingIndicator.textContent = `more than 3 people are typing${dotStr}`;
  }
}

// ---------------------- SCHOOL CLOCK ----------------------
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

const minDates = ["2026-02-18", "2026-02-20", "2026-03-13", "2026-04-10", "2026-06-05", "2026-06-08", "2026-06-10"];

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
