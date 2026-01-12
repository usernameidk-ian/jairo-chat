/* ---------------------- USER & ADMIN SETUP ---------------------- */
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

/* ---------------------- FIREBASE & UI SETUP ---------------------- */
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
    soundBoard.style.display = (soundBoard.style.display === 'none') ? 'flex' : 'none';
  };
}

if (closeSfx) {
  closeSfx.onclick = () => { soundBoard.style.display = 'none'; };
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

/* ---------------------- MESSAGING ---------------------- */
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
populateVault(document.getElementById('gif-list'), myGifs);
populateVault(document.getElementById('emoji-list'), myEmojis);

gifBtn.onclick = () => { gifVault.style.display = (gifVault.style.display === 'block') ? 'none' : 'block'; emojiVault.style.display = 'none'; };
emojiBtn.onclick = () => { emojiVault.style.display = (emojiVault.style.display === 'block') ? 'none' : 'block'; gifVault.style.display = 'none'; };

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
    const del = document.createElement("button");
    del.textContent = "❌";
    del.onclick = () => { db.ref("messages").child(msgKey).remove(); };
    p.appendChild(del);
  }
  p.dataset.key = msgKey;
  chatMessages.appendChild(p);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

messagesRef.on("child_removed", (snapshot) => {
  const el = [...chatMessages.children].find(e => e.dataset.key === snapshot.key);
  if (el) el.remove();
});

/* ---------------------- SCHOOL SCHEDULE ---------------------- */
const schoolSchedule = {
    regular: [ 
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

const minDayDates = ["2026-02-20", "2026-03-13", "2026-04-10", "2026-06-05", "2026-06-08", "2026-06-10"];

function updateSchoolClock() {
    const now = new Date();
    const day = now.getDay(); 
    const dateStr = now.toISOString().split('T')[0];
    const currentTimeSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    
    // Update real-time clock text
    document.getElementById('clock-real-time').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let schedule = schoolSchedule.regular;
    if (minDayDates.includes(dateStr)) schedule = schoolSchedule.minimum;
    else if (day === 2) schedule = schoolSchedule.tuesday;
    else if (day === 0 || day === 6) { 
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
        document.getElementById('current-period').textContent = `IT IS CURRENTLY ${currentEvent.name.toUpperCase()}`;
        
        const targetTimeSec = parseTime(currentEvent.end);
        const diff = targetTimeSec - currentTimeSec;
        document.getElementById('time-remaining').textContent = formatCountdown(diff);
        
        if (nextEvent) {
            document.getElementById('next-up-label').style.display = 'block';
            document.getElementById('next-up-label').textContent = `TIME BEFORE ${nextEvent.name.toUpperCase()}:`;
        } else {
            // No next event (Last Period) - hide the middle label
            document.getElementById('next-up-label').style.display = 'none';
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

setInterval(updateSchoolClock, 1000);
updateSchoolClock();

// BGM
document.addEventListener('click', () => {
  const bgm = document.getElementById('bgm');
  if (bgm && bgm.paused) bgm.play().catch(()=>{});
}, { once: true });
