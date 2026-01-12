eriod - School's almost out!";
        }
    }
}

function parseTime(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 3600 + m * 60;
}

function formatCountdown(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

function convertTo12Hour(timeStr) {
    let [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

setInterval(updateSchoolClock, 1000);
updateSchoolClock();
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

// ---------------------- SCHOOL SCHEDULE LOGIC ----------------------

const schoolSchedule = {
    regular: [ // Mon, Wed, Thu, Fri
        { name: "Advisory", start: "08:00", end: "08:29" },
        { name: "Period 1", start: "08:33", end: "09:28" },
        { name: "Period 2", start: "09:32", end: "10:27" },
        { name: "Break", start: "10:27", end: "10:37" },
        { name: "Period 3", start: "10:41", end: "11:36" },
        { name: "Period 4", start: "11:40", end: "12:35" },
        { name: "Lunch", start: "12:35", end: "13:05" },
        { name: "Period 5", start: "13:09", end: "14:04" },
        { name: "Period 6", start: "14:08", end: "15:03" }
    ],
    tuesday: [
        { name: "Period 1", start: "08:00", end: "09:03" },
        { name: "Period 2", start: "09:07", end: "09:55" },
        { name: "Break", start: "09:55", end: "10:05" },
        { name: "Period 3", start: "10:09", end: "10:57" },
        { name: "Period 4", start: "11:01", end: "11:49" },
        { name: "Lunch", start: "11:49", end: "12:19" },
        { name: "Period 5", start: "12:23", end: "13:11" },
        { name: "Period 6", start: "13:15", end: "14:03" }
    ],
    minimum: [
        { name: "Period 1", start: "08:00", end: "08:52" },
        { name: "Period 2", start: "08:56", end: "09:33" },
        { name: "Period 3", start: "09:37", end: "10:14" },
        { name: "Brunch", start: "10:14", end: "10:44" },
        { name: "Period 4", start: "10:48", end: "11:25" },
        { name: "Period 5", start: "11:29", end: "12:06" },
        { name: "Period 6", start: "12:10", end: "12:47" }
    ]
};

// List of Minimum Day dates based on your schedule image
const minDayDates = ["2026-02-20", "2026-03-13", "2026-04-10", "2026-06-05", "2026-06-08", "2026-06-10"];

function updateSchoolClock() {
    const now = new Date();
    const day = now.getDay(); 
    const dateStr = now.toISOString().split('T')[0];
    const currentTimeSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    
    let schedule = schoolSchedule.regular;
    if (minDayDates.includes(dateStr)) schedule = schoolSchedule.minimum;
    else if (day === 2) schedule = schoolSchedule.tuesday;
    else if (day === 0 || day === 6) { // Weekend
        document.getElementById('school-clock').style.display = 'none';
        return; 
    }

    let currentEvent = null;
    let nextEvent = null;

    for (let i = 0; i < schedule.length; i++) {
        const startSecs = parseTime(schedule[i].start);
        const endSecs = parseTime(schedule[i].end);

        if (currentTimeSec >= startSecs && currentTimeSec <= endSecs) {
            currentEvent = schedule[i];
            nextEvent = schedule[i + 1] || null;
            break;
        } else if (i < schedule.length - 1) {
            const nextStart = parseTime(schedule[i+1].start);
            if (currentTimeSec > endSecs && currentTimeSec < nextStart) {
                currentEvent = { name: "Passing Period", end: schedule[i+1].start };
                nextEvent = schedule[i+1];
                break;
            }
        }
    }

    const clockEl = document.getElementById('school-clock');
    if (!currentEvent) {
        clockEl.style.display = 'none';
    } else {
        clockEl.style.display = 'block';
        document.getElementById('current-period').textContent = currentEvent.name;
        
        const targetTimeSec = parseTime(currentEvent.end);
        const diff = targetTimeSec - currentTimeSec;
        
        document.getElementById('time-remaining').textContent = formatCountdown(diff);
        
        if (nextEvent) {
            document.getElementById('next-up').textContent = `Time before ${nextEvent.name}: (${convertTo12Hour(nextEvent.start)})`;
        } else {
            document.getElementById('next-up').textContent = "Last period - School's almost out!";
        }
    }
}

function parseTime(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 3600 + m * 60;
}

function formatCountdown(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

function convertTo12Hour(timeStr) {
    let [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// Update the clock every second
setInterval(updateSchoolClock, 1000);
// Run once immediately so it doesn't wait a second to appear
updateSchoolClock();
