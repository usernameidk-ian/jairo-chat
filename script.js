// ============================================================================
//                              JAIRO CHAT SCRIPT
// ============================================================================

// ---------------------- 1. DEVICE FINGERPRINTING ----------------------
let deviceID = localStorage.getItem('chat_device_id');
if (!deviceID) {
  deviceID = 'dev-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  localStorage.setItem('chat_device_id', deviceID);
}

// ---------------------- 2. AUTH, STATUS & ACCOUNT LOGIC ----------------------
let username = "";
let cleanName = "";
let identityKey = "";
let isAdmin = false;
let myStatus = '⚫'; 

const admins = {
  "bian": { password: "hehehahahehehaha", badge: "purplestar.png" },
  "jair0": { password: "67JAIRO67", badge: "jairobadge.png" }
};

const authOverlay = document.getElementById('auth-overlay');
const viewChoice = document.getElementById('auth-choice-view');
const viewLogin = document.getElementById('auth-login-view');
const viewReg = document.getElementById('auth-register-view');

document.getElementById('btn-show-login').onclick = () => { viewChoice.style.display='none'; viewLogin.style.display='block'; };
document.getElementById('btn-show-register').onclick = () => { viewChoice.style.display='none'; viewReg.style.display='block'; };
document.getElementById('link-to-register').onclick = () => { viewLogin.style.display='none'; viewReg.style.display='block'; };
document.getElementById('link-to-login').onclick = () => { viewReg.style.display='none'; viewLogin.style.display='block'; };

document.getElementById('btn-reg-submit').onclick = () => {
    const u = document.getElementById('reg-user').value.trim();
    const p = document.getElementById('reg-pass').value;
    const err = document.getElementById('reg-err');
    if(!u || !p) { err.textContent = "Fill in both fields!"; return; }
    if(admins[u.toLowerCase()]) { err.textContent = "This username is reserved!"; return; }
    const cName = u.replace(/\s+/g, "").toLowerCase();
    
    db.ref('users/' + cName).once('value', snapshot => {
        if(snapshot.exists()) { err.textContent = "Username already taken!"; } 
        else { db.ref('users/' + cName).set({ password: p, originalName: u }).then(() => { completeLogin(u); }); }
    });
};

document.getElementById('btn-login-submit').onclick = () => {
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value;
    const err = document.getElementById('login-err');
    if(!u || !p) { err.textContent = "Fill in both fields!"; return; }
    
    const lowerU = u.toLowerCase();
    if(admins[lowerU]) {
        if (p === admins[lowerU].password) { completeLogin(u, true); } 
        else { err.textContent = "Incorrect admin password!"; }
        return;
    }
    const cName = u.replace(/\s+/g, "").toLowerCase();
    db.ref('users/' + cName).once('value', snapshot => {
        if(!snapshot.exists()) { err.textContent = "User not found! Register first."; } 
        else {
            if(snapshot.val().password !== p) { err.textContent = "Incorrect password!"; } 
            else { completeLogin(snapshot.val().originalName); }
        }
    });
};

function completeLogin(uname, forceAdmin = false) {
    username = uname;
    cleanName = username.replace(/\s+/g, "").toLowerCase();
    identityKey = cleanName;
    localStorage.setItem('chat_logged_in_user', username);
    authOverlay.style.display = 'none';
    
    if (admins[cleanName] || forceAdmin) {
        isAdmin = true;
        document.getElementById('admin-toggle').style.display = 'flex'; 
        document.getElementById('view-suggestions-btn').style.display = 'inline-block';
        document.getElementById('clear-chat').style.display = "inline-block";
    }

    // Initialize Presence (Statuses)
    myStatus = '🟢';
    updatePresence();
    db.ref('.info/connected').on('value', snap => {
        if (snap.val()) {
            db.ref('presence/' + identityKey).onDisconnect().remove();
            updatePresence();
        }
    });
}

const savedUser = localStorage.getItem('chat_logged_in_user');
if(savedUser) { completeLogin(savedUser); } else { authOverlay.style.display = 'flex'; }

// Status Window Listeners
window.addEventListener('focus', () => { if(username){ myStatus = '🟢'; updatePresence(); } });
window.addEventListener('blur', () => { if(username){ myStatus = '🟠'; updatePresence(); } });

function updatePresence() {
    if (!identityKey) return;
    db.ref('presence/' + identityKey).set({ 
        username: username, color: myColor, icon: myCustomIcon, 
        status: myStatus, deviceID: deviceID, isAdmin: isAdmin 
    });
}

// ---------------------- 3. USER SETTINGS & ICONS ----------------------
let myColor = localStorage.getItem("chat_username_color") || "#ffffff";
let showCursors = localStorage.getItem("chat_show_cursors") !== "false"; 
let myCustomIcon = localStorage.getItem("chat_custom_icon") || "";

function addAdminIconAndGlow(userSpan, messageUsername) {
  const lowerName = messageUsername.toLowerCase();
  if (admins[lowerName]) {
    const icon = document.createElement("img");
    icon.src = admins[lowerName].badge;
    icon.className = "admin-icon";
    userSpan.parentNode.prepend(icon); 
    userSpan.classList.add("admin-glow"); // Makes the name glow based on their selected color
  }
}
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  let color = "#";
  for (let i = 0; i < 3; i++) color += ("00" + ((hash >> (i * 8)) & 0xff).toString(16)).slice(-2);
  return color;
}

// ---------------------- 4. HTML UI ELEMENTS REFS ----------------------
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendChat = document.getElementById("send-chat");
const charCounter = document.getElementById("char-counter");
const timerEl = document.getElementById("timeout-timer");

const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const colorPicker = document.getElementById('color-picker');
const colorPreview = document.getElementById('color-preview');
const customIconUrl = document.getElementById('custom-icon-url');
const customIconPreview = document.getElementById('custom-icon-preview');
const iconError = document.getElementById('icon-error');
const toggleCursorsCheckbox = document.getElementById('toggle-cursors');
const logoutBtn = document.getElementById('logout-btn');

// ---------------------- 5. SETTINGS, ICONS & LOGOUT ----------------------
colorPicker.value = myColor; colorPreview.style.color = myColor;
toggleCursorsCheckbox.checked = showCursors;
if(myCustomIcon) { customIconPreview.src = myCustomIcon; customIconPreview.style.display = 'block'; customIconUrl.value = myCustomIcon; }

settingsBtn.onclick = () => { settingsModal.style.display = 'flex'; };
closeSettings.onclick = () => { settingsModal.style.display = 'none'; };

colorPicker.addEventListener('input', (e) => {
  myColor = e.target.value; colorPreview.style.color = myColor;
  localStorage.setItem("chat_username_color", myColor); updatePresence();
});

customIconUrl.addEventListener('input', (e) => {
    const url = e.target.value.trim();
    if(url === "") {
        myCustomIcon = ""; localStorage.removeItem("chat_custom_icon");
        customIconPreview.style.display = 'none'; iconError.style.display = 'none';
        updatePresence(); return;
    }
    // Expanded to 5000 characters for long image links
    const isValid = url.match(/\.(jpeg|jpg|gif|png|webp)/i) && url.length < 5000;
    if(isValid) {
        iconError.style.display = 'none'; myCustomIcon = url;
        customIconPreview.src = url; customIconPreview.style.display = 'block';
        localStorage.setItem("chat_custom_icon", url); updatePresence();
    } else {
        iconError.style.display = 'block'; customIconPreview.style.display = 'none';
        myCustomIcon = ""; localStorage.removeItem("chat_custom_icon"); updatePresence();
    }
});

toggleCursorsCheckbox.addEventListener('change', (e) => {
  showCursors = e.target.checked; localStorage.setItem("chat_show_cursors", showCursors);
  if (!showCursors) document.getElementById('cursor-layer').innerHTML = ''; 
});

logoutBtn.onclick = () => { localStorage.removeItem('chat_logged_in_user'); db.ref('presence/'+identityKey).remove().then(()=> location.reload()); };

// ---------------------- 6. MEMBER LIST ----------------------
const memToggle = document.getElementById('toggle-member-list');
const memList = document.getElementById('member-list-content');
let onlineUsersList = [];

memToggle.onclick = () => {
    if(memList.style.display === 'none') { memList.style.display = 'block'; memToggle.textContent = 'Member List ↑'; }
    else { memList.style.display = 'none'; memToggle.textContent = 'Member List ↓'; }
};

db.ref('presence').on('value', snap => {
    memList.innerHTML = '';
    onlineUsersList = [];
    const targetSelect = document.getElementById('target-user-select');
    if(targetSelect) targetSelect.innerHTML = '<option value="all">Everyone</option>';

    snap.forEach(child => {
        const u = child.val();
        const k = child.key;
        onlineUsersList.push(u);

        // Populate the dropdown for admin sounds/jumpscares with online users
        if(isAdmin && targetSelect) {
            const opt = document.createElement('option');
            opt.value = u.deviceID; opt.textContent = u.username;
            targetSelect.appendChild(opt);
        }

        const div = document.createElement('div');
        div.className = 'member-item';
        
        // Timeout Display Logic inside Member List
        let timeoutHtml = "";
        let tData = timeouts ? timeouts[u.deviceID] : null;
        if(isAdmin && tData && tData.until > Date.now()) {
            const color = tData.type === 'shadow' ? 'purple' : 'red';
            const seconds = Math.ceil((tData.until - Date.now()) / 1000);
            timeoutHtml = `<span title="${seconds}s remaining" style="color:${color}; cursor:pointer;" onclick="editTimeout('${u.deviceID}', '${u.username}')">⏳</span>`;
        }

        const iconHtml = u.icon ? `<img src="${u.icon}" class="m-icon">` : ``;
        const delHtml = (isAdmin && !u.isAdmin) ? `<button class="admin-member-btn" onclick="deleteUserAccount('${k}')">⛔</button>` : ``;

        div.innerHTML = `
            <div class="member-info">
                <span class="m-status">${u.status}</span>
                ${iconHtml}
                <span style="color:${u.color}; font-weight:bold;">${u.username}</span>
            </div>
            <div class="member-actions">${timeoutHtml}${delHtml}</div>
        `;
        memList.appendChild(div);
    });
});

window.deleteUserAccount = function(userKey) {
    if(confirm("⚠️ARE YOU SURE? This button DELETES this account.")) {
        db.ref('users/' + userKey).remove();
        db.ref('presence/' + userKey).remove();
        alert("Account deleted.");
    }
};

window.editTimeout = function(devID, uName) {
    const duration = prompt(`Edit timeout for ${uName} (Seconds):`);
    if(duration && !isNaN(duration)) {
        const tData = timeouts[devID];
        db.ref('timeouts').child(devID).set({ until: Date.now() + (parseInt(duration)*1000), originalName: uName, type: tData.type });
    }
};

// ---------------------- 7. JUMPSCARES & TARGETED SOUNDS ----------------------
const adminToggle = document.getElementById('admin-toggle');
const soundBoard = document.getElementById('admin-soundboard');
const closeSfx = document.getElementById('close-sfx');

adminToggle.onclick = () => { soundBoard.style.display = soundBoard.style.display === 'none' ? 'block' : 'none'; };
closeSfx.onclick = () => { soundBoard.style.display = 'none'; };

document.getElementById('tab-sfx').onclick = () => {
    document.getElementById('tab-sfx').classList.add('active-tab'); document.getElementById('tab-jc').classList.remove('active-tab');
    document.getElementById('sfx-content').style.display = 'flex'; document.getElementById('jc-content').style.display = 'none';
};
document.getElementById('tab-jc').onclick = () => {
    document.getElementById('tab-jc').classList.add('active-tab'); document.getElementById('tab-sfx').classList.remove('active-tab');
    document.getElementById('jc-content').style.display = 'flex'; document.getElementById('sfx-content').style.display = 'none';
};

// Jumpscare Preview Validation
const jcUrl = document.getElementById('jc-url');
const jcPreview = document.getElementById('jc-preview');
const jcError = document.getElementById('jc-error');
jcUrl.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if(val.match(/\.(jpeg|jpg|gif|png|webp)/i)) { jcError.style.display='none'; jcPreview.src=val; jcPreview.style.display='block'; } 
    else { jcError.style.display='block'; jcPreview.style.display='none'; }
});

window.triggerCommand = function(type, payload) {
    if(!isAdmin) return;
    const target = document.getElementById('target-user-select').value;
    const cmdRef = db.ref('commands/' + target);
    cmdRef.set({ type: type, payload: payload, time: Date.now() });
};

document.getElementById('btn-send-jc').onclick = () => {
    if(jcPreview.style.display === 'none') return;
    triggerCommand('jumpscare', jcUrl.value.trim());
};

// Listen for Commands (Targeted to everyone or specifically your device)
db.ref('commands/all').on('value', snap => { processCommand(snap.val()); });
db.ref('commands/' + deviceID).on('value', snap => { processCommand(snap.val()); });

let lastCmdTime = Date.now();
function processCommand(cmd) {
    if(!cmd || cmd.time <= lastCmdTime) return;
    lastCmdTime = cmd.time;
    if(cmd.type === 'sound') {
        const sfx = document.getElementById('sfx-player');
        sfx.src = cmd.payload + ".mp3"; sfx.play().catch(()=>{});
    } else if (cmd.type === 'jumpscare') {
        const sfx = document.getElementById('sfx-player');
        sfx.src = "jumpscarenoise.mp3"; sfx.play().catch(()=>{});
        const over = document.getElementById('jumpscare-overlay');
        document.getElementById('jumpscare-img').src = cmd.payload;
        over.style.display = 'flex';
        setTimeout(() => { over.style.display = 'none'; }, 3000);
    }
}

// ---------------------- 8-9. FIREBASE REFS ----------------------
const messagesRef = db.ref("messages");
const typingRef = db.ref("typing");
let timeouts = null; 

// ---------------------- 10. GIF & EMOJI PICKERS ----------------------
const myGifs = [ "gifs/1.gif", "gifs/2.gif" /* Add more paths here if needed */ ];
const myEmojis = [ "emojis/e1.png", "emojis/e2.png" /* Add more paths here if needed */ ];

const gifBtn = document.getElementById('gif-btn');
const emojiBtn = document.getElementById('emoji-btn');
const gifVault = document.getElementById('gif-vault');
const emojiVault = document.getElementById('emoji-vault');
const gifList = document.getElementById('gif-list');
const emojiList = document.getElementById('emoji-list');

function populateVault(container, items) {
    container.innerHTML = '';
    items.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.onclick = () => {
            chatInput.value = src; // Sets input exactly to the link so it renders correctly
            chatInput.focus();
        };
        container.appendChild(img);
    });
}

if (gifBtn && gifVault) {
    gifBtn.onclick = () => {
        gifVault.style.display = gifVault.style.display === 'block' ? 'none' : 'block';
        emojiVault.style.display = 'none';
    };
    populateVault(gifList, myGifs);
}

if (emojiBtn && emojiVault) {
    emojiBtn.onclick = () => {
        emojiVault.style.display = emojiVault.style.display === 'block' ? 'none' : 'block';
        gifVault.style.display = 'none';
    };
    populateVault(emojiList, myEmojis);
}

// ---------------------- 11. CHAT LOGIC & SHADOW TIMEOUTS ----------------------
const MAX_CHARS = 2000;

sendChat.addEventListener("click", () => {
  if (!username) return;
  const text = chatInput.value.trim();
  if (!text) return;
  if (text.length > MAX_CHARS) { alert("Message too long!"); return; }

  const myTimeout = timeouts ? timeouts[deviceID] : null; 
  if (myTimeout && myTimeout.until > Date.now() && myTimeout.type === 'normal') {
    alert("you're timed out."); return;
  }
  
  // SHADOW TIMEOUT CHECK
  const isShadowed = (myTimeout && myTimeout.until > Date.now() && myTimeout.type === 'shadow');

  messagesRef.push({ 
    text: text, username: username, color: myColor, icon: myCustomIcon,
    timestamp: Date.now(), fingerprint: deviceID, shadow: isShadowed
  });
  
  chatInput.value = ""; charCounter.textContent = MAX_CHARS; 
  typingRef.child(identityKey).remove();
});
chatInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendChat.click(); });

// ---------------------- 12. MESSAGE RENDERING ----------------------
let oldestLoadedKey = null;
function isNearBottom() { return chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 200; }

messagesRef.limitToLast(50).on("child_added", (snapshot) => {
  const msg = snapshot.val();
  const msgKey = snapshot.key;
  if (document.querySelector(`[data-key="${msgKey}"]`)) return;

  // SHADOW FILTER: Hide if it's a shadow message and I am not the sender/admin
  if (msg.shadow && msg.fingerprint !== deviceID && !isAdmin) return;

  if (!oldestLoadedKey) oldestLoadedKey = msgKey;
  const p = createMessageElement(msg, msgKey);
  chatMessages.appendChild(p);
  if (isNearBottom()) chatMessages.scrollTop = chatMessages.scrollHeight;
});

messagesRef.on("child_removed", (snapshot) => {
  const msgEl = [...chatMessages.children].find(el => el.dataset.key === snapshot.key);
  if (msgEl) msgEl.remove();
});

function createMessageElement(msg, msgKey) {
  const p = document.createElement("p");
  if (msg && msg.text) {
    const ts = new Date(msg.timestamp || Date.now());
    const timeSpan = document.createElement("span");
    timeSpan.className = "timestamp";
    timeSpan.textContent = `[${ts.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}]`;

    const userSpan = document.createElement("span");
    userSpan.className = "username";
    userSpan.textContent = msg.username + ":";
    userSpan.style.color = msg.color || stringToColor(msg.username);

    // Custom Icon
    if(msg.icon) {
        const ic = document.createElement("img"); ic.src = msg.icon; ic.className = "chat-custom-icon";
        p.appendChild(ic);
    }

    addAdminIconAndGlow(userSpan, msg.username);
    
    const contentDiv = document.createElement("div");
    contentDiv.className = "msg-content";
    if (msg.text.includes("tenor.com") || msg.text.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
      const img = document.createElement("img"); img.src = msg.text; img.className = "chat-media"; contentDiv.appendChild(img);
    } else {
      const textSpan = document.createElement("span"); textSpan.className = "msgtext"; textSpan.textContent = " " + msg.text; contentDiv.appendChild(textSpan);
    }

    p.appendChild(timeSpan); p.appendChild(userSpan); p.appendChild(contentDiv);
  }

  if (isAdmin) {
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "❌"; deleteBtn.className = "admin-action-btn";
    deleteBtn.onclick = () => { db.ref("messages").child(msgKey).remove(); };
    p.appendChild(deleteBtn);

    const timeoutBox = document.createElement("div");
    timeoutBox.style.display = "inline-block"; timeoutBox.style.position = "relative";
    
    const timeoutBtn = document.createElement("button");
    timeoutBtn.textContent = "⏱️"; timeoutBtn.className = "admin-action-btn";
    timeoutBox.appendChild(timeoutBtn);

    const popover = document.createElement("div");
    popover.className = "timeout-popover"; popover.style.display = "none";
    
    const normBtn = document.createElement("button"); normBtn.textContent = "⏱️";
    const shadBtn = document.createElement("button"); shadBtn.textContent = "⛓️‍💥";
    
    const applyTimeout = (type) => {
        const duration = prompt(`How many seconds to ${type} timeout ${msg.username}?`);
        if (duration && !isNaN(duration) && msg.fingerprint) {
            db.ref("timeouts").child(msg.fingerprint).set({ until: Date.now() + (parseInt(duration)*1000), originalName: msg.username, type: type });
            popover.style.display = 'none';
        }
    };
    normBtn.onclick = () => applyTimeout('normal');
    shadBtn.onclick = () => applyTimeout('shadow');

    popover.appendChild(normBtn); popover.appendChild(shadBtn);
    timeoutBox.appendChild(popover);
    
    timeoutBtn.onclick = () => { popover.style.display = popover.style.display === 'none' ? 'flex' : 'none'; };
    p.appendChild(timeoutBox);
  }

  p.dataset.key = msgKey;
  return p;
}

// ---------------------- 13. TIMEOUT TICKER & SOUNDS ----------------------
db.ref("timeouts").on("value", (snapshot) => { timeouts = snapshot.val() || {}; updateTimeoutDisplay(); });
let timeoutInterval = null;
function updateTimeoutDisplay() {
  clearInterval(timeoutInterval);
  if (!timeouts) return; 
  const myStatus = timeouts[deviceID]; 
  // Doesn't show the timer text if it's a shadow timeout
  if (!myStatus || myStatus.until <= Date.now() || myStatus.type === 'shadow') { timerEl.textContent = ""; return; }
  
  function tick() {
    const seconds = Math.ceil((myStatus.until - Date.now()) / 1000);
    timerEl.textContent = seconds > 0 ? `Your device is timed out for ${seconds}s more.` : "";
    if (seconds <= 0) { clearInterval(timeoutInterval); timerEl.textContent = ""; }
  }
  tick(); timeoutInterval = setInterval(tick, 500);
}

// ---------------------- 14. TYPING INDICATOR ----------------------
let typeTimeout;

chatInput.addEventListener('input', () => {
  if (!username) return;
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
    if (key !== identityKey) currentTypers.push(data[key].name);
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

// ---------------------- 15. SCHOOL CLOCK ----------------------
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

const minDates = [
    "2026-02-18", "2026-02-20", 
    "2026-03-13", "2026-04-10", "2026-06-05", "2026-06-08", "2026-06-10"
];

function updateClock() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${d}`;
  
  const time = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const day = now.getDay();
  
  let sched = schedules.regular;
  
  if (minDates.includes(dateStr)) {
      sched = schedules.minimum;
  } else if (day === 2) {
      sched = schedules.tuesday;
  }

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
