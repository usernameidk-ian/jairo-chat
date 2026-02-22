// ============================================================================
//                              JAIRO CHAT SCRIPT
// ============================================================================

// ---------------------- 1. DEVICE FINGERPRINTING ----------------------
// Gives the user a unique ID to handle timeouts and drawing ownership
let deviceID = localStorage.getItem('chat_device_id');
if (!deviceID) {
  deviceID = 'dev-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  localStorage.setItem('chat_device_id', deviceID);
}
console.log("Your Device ID is:", deviceID); 

// ---------------------- 2. AUTH & ACCOUNT LOGIC ----------------------
let username = "";
let cleanName = "";
let identityKey = "";
let isAdmin = false;

// ADMIN CREDENTIALS & BADGES
const admins = {
  "bian": { password: "hehehahahehehaha", badge: "purplestar.png" },
  "jair0": { password: "67JAIRO67", badge: "jairobadge.png" }
};

const authOverlay = document.getElementById('auth-overlay');
const viewChoice = document.getElementById('auth-choice-view');
const viewLogin = document.getElementById('auth-login-view');
const viewReg = document.getElementById('auth-register-view');

// Toggle Login/Registration Views
document.getElementById('btn-show-login').onclick = () => { viewChoice.style.display='none'; viewLogin.style.display='block'; };
document.getElementById('btn-show-register').onclick = () => { viewChoice.style.display='none'; viewReg.style.display='block'; };
document.getElementById('link-to-register').onclick = () => { viewLogin.style.display='none'; viewReg.style.display='block'; };
document.getElementById('link-to-login').onclick = () => { viewReg.style.display='none'; viewLogin.style.display='block'; };

// Registration Flow
document.getElementById('btn-reg-submit').onclick = () => {
    const u = document.getElementById('reg-user').value.trim();
    const p = document.getElementById('reg-pass').value;
    const err = document.getElementById('reg-err');
    
    if(!u || !p) { err.textContent = "Fill in both fields!"; return; }
    if(admins[u.toLowerCase()]) { err.textContent = "This username is reserved!"; return; }

    const cName = u.replace(/\s+/g, "").toLowerCase();
    
    // Check if name is taken in Firebase
    db.ref('users/' + cName).once('value', snapshot => {
        if(snapshot.exists()) {
            err.textContent = "Username already taken!";
        } else {
            // Save new user
            db.ref('users/' + cName).set({ password: p, originalName: u }).then(() => {
                completeLogin(u);
            });
        }
    });
};

// Login Flow
document.getElementById('btn-login-submit').onclick = () => {
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value;
    const err = document.getElementById('login-err');
    
    if(!u || !p) { err.textContent = "Fill in both fields!"; return; }
    
    // Admin Override
    const lowerU = u.toLowerCase();
    if(admins[lowerU]) {
        if (p === admins[lowerU].password) {
            completeLogin(u, true);
        } else {
            err.textContent = "Incorrect admin password!";
        }
        return;
    }

    const cName = u.replace(/\s+/g, "").toLowerCase();
    
    // Check password against Firebase
    db.ref('users/' + cName).once('value', snapshot => {
        if(!snapshot.exists()) {
            err.textContent = "User not found! Register first.";
        } else {
            const data = snapshot.val();
            if(data.password !== p) {
                err.textContent = "Incorrect password!";
            } else {
                completeLogin(data.originalName);
            }
        }
    });
};

// Complete Login Process
function completeLogin(uname, forceAdmin = false) {
    username = uname;
    cleanName = username.replace(/\s+/g, "").toLowerCase();
    identityKey = cleanName;
    
    localStorage.setItem('chat_logged_in_user', username);
    authOverlay.style.display = 'none';
    
    // Admin UI unlocks
    if (admins[cleanName] || forceAdmin) {
        isAdmin = true;
        const toggleBtn = document.getElementById('admin-toggle');
        if(toggleBtn) toggleBtn.style.display = 'flex'; 
        const viewSuggBtn = document.getElementById('view-suggestions-btn');
        if(viewSuggBtn) viewSuggBtn.style.display = 'inline-block';
        const clearBtn = document.getElementById('clear-chat');
        if(clearBtn) clearBtn.style.display = "inline-block";
    }
}

// Auto-Login Check on Refresh
const savedUser = localStorage.getItem('chat_logged_in_user');
if(savedUser) {
    completeLogin(savedUser); // Admin logout bug fixed here!
} else {
    authOverlay.style.display = 'flex';
}

// ---------------------- 3. USER SETTINGS & VISUALS ----------------------
let myColor = localStorage.getItem("chat_username_color") || "#ffffff";
let showCursors = localStorage.getItem("chat_show_cursors") !== "false"; 

// Adds the specific badge for the Admin
function addAdminIcon(p, messageUsername) {
  const lowerName = messageUsername.toLowerCase();
  if (admins[lowerName]) {
    const icon = document.createElement("img");
    icon.src = admins[lowerName].badge;
    icon.className = "admin-icon";
    icon.alt = "admin";
    p.prepend(icon); 
  }
}

// Generates a random color based on username
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
const clearChatBtn = document.getElementById("clear-chat");
const timerEl = document.getElementById("timeout-timer");
const typingIndicator = document.getElementById("typing-indicator");
const charCounter = document.getElementById("char-counter");

// Settings & Logout Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const colorPicker = document.getElementById('color-picker');
const colorPreview = document.getElementById('color-preview');
const toggleCursorsCheckbox = document.getElementById('toggle-cursors');
const logoutBtn = document.getElementById('logout-btn');

// Suggestion Box Elements
const suggestionBtn = document.getElementById('suggestion-btn');
const suggestionModal = document.getElementById('suggestion-modal');
const closeSuggestion = document.getElementById('close-suggestion');
const suggestionInput = document.getElementById('suggestion-input');
const submitSuggestion = document.getElementById('submit-suggestion');
const suggCharCount = document.getElementById('sugg-char-count');
const adminSuggPanel = document.getElementById('admin-suggestions-panel');
const viewSuggBtn = document.getElementById('view-suggestions-btn');
const closeAdminSugg = document.getElementById('close-admin-suggestions');
const suggestionList = document.getElementById('suggestion-list');

// Misc Elements
const openGameBtn = document.getElementById("open-game");
const gifBtn = document.getElementById('gif-btn');
const emojiBtn = document.getElementById('emoji-btn');
const gifVault = document.getElementById('gif-vault');
const emojiVault = document.getElementById('emoji-vault');
const adminToggle = document.getElementById('admin-toggle');
const soundBoard = document.getElementById('admin-soundboard');
const closeSfx = document.getElementById('close-sfx');

chatInput.focus();

// ---------------------- 5. SETTINGS & LOGOUT LOGIC ----------------------
if (settingsBtn) {
  colorPicker.value = myColor;
  colorPreview.style.color = myColor;
  toggleCursorsCheckbox.checked = showCursors;

  settingsBtn.onclick = () => { settingsModal.style.display = 'flex'; };
  closeSettings.onclick = () => { settingsModal.style.display = 'none'; };

  colorPicker.addEventListener('input', (e) => {
    myColor = e.target.value;
    colorPreview.style.color = myColor;
    localStorage.setItem("chat_username_color", myColor);
  });

  toggleCursorsCheckbox.addEventListener('change', (e) => {
    showCursors = e.target.checked;
    localStorage.setItem("chat_show_cursors", showCursors);
    const layer = document.getElementById('cursor-layer');
    if (!showCursors) layer.innerHTML = ''; 
  });
  
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.style.display = 'none';
  });
}

if (logoutBtn) {
    logoutBtn.onclick = () => {
        localStorage.removeItem('chat_logged_in_user');
        location.reload(); 
    };
}

// ---------------------- 6. SUGGESTION BOX LOGIC ----------------------
if (suggestionBtn) {
    suggestionBtn.onclick = () => { suggestionModal.style.display = 'flex'; };
    closeSuggestion.onclick = () => { suggestionModal.style.display = 'none'; };
    suggestionModal.addEventListener('click', (e) => { if (e.target === suggestionModal) suggestionModal.style.display = 'none'; });

    suggestionInput.addEventListener('input', () => {
        suggCharCount.textContent = 1000 - suggestionInput.value.length;
    });

    submitSuggestion.onclick = () => {
        const text = suggestionInput.value.trim();
        if (!text) return;
        
        // 30 minute cooldown
        const lastSent = localStorage.getItem('sugg_last_sent');
        if (lastSent) {
            const diff = Date.now() - parseInt(lastSent);
            if (diff < 30 * 60 * 1000) {
                const minsLeft = Math.ceil((30 * 60 * 1000 - diff) / 60000);
                alert(`Please wait ${minsLeft} minutes before sending another suggestion.`);
                return;
            }
        }

        db.ref('suggestions').push({ username: username, text: text, timestamp: Date.now() });
        localStorage.setItem('sugg_last_sent', Date.now());
        alert("Suggestion sent! Thanks for the idea.");
        suggestionInput.value = "";
        suggestionModal.style.display = 'none';
    };
}

// ADMIN View Suggestions
if (viewSuggBtn) {
    viewSuggBtn.onclick = () => {
        adminSuggPanel.style.display = (adminSuggPanel.style.display === 'none') ? 'block' : 'none';
    };
}
if (closeAdminSugg) {
    closeAdminSugg.onclick = () => { adminSuggPanel.style.display = 'none'; };
}

db.ref('suggestions').on('child_added', (snapshot) => {
    const s = snapshot.val();
    const key = snapshot.key;
    
    const card = document.createElement('div');
    card.className = "suggestion-card";
    card.innerHTML = `
        <div class="sugg-meta">
            <span><b>${s.username}</b></span>
            <span>${new Date(s.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="sugg-text">${s.text}</div>
        <div style="text-align:right; margin-top:5px;">
            <button class="sugg-del" onclick="deleteSuggestion('${key}')">Delete</button>
        </div>
    `;
    card.id = `sugg-${key}`;
    suggestionList.prepend(card);
});

db.ref('suggestions').on('child_removed', (snapshot) => {
    const el = document.getElementById(`sugg-${snapshot.key}`);
    if(el) el.remove();
});

window.deleteSuggestion = function(key) {
    if(confirm("Delete this suggestion?")) {
        db.ref('suggestions').child(key).remove();
    }
};

// ---------------------- 7. MULTIPLAYER CURSORS ----------------------
const cursorLayer = document.getElementById('cursor-layer');
const cursorRef = db.ref('cursors');

function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function() {
        const context = this;
        const args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    }
}

document.addEventListener('mousemove', throttle((e) => {
    if (!username) return; // Don't track if not logged in
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;

    cursorRef.child(deviceID).set({
        x: x, y: y, username: username, color: myColor, timestamp: Date.now()
    });
}, 100));

cursorRef.child(deviceID).onDisconnect().remove();

cursorRef.on('value', (snapshot) => {
    if (!showCursors) return;

    const cursors = snapshot.val() || {};
    const now = Date.now();

    Object.keys(cursors).forEach(key => {
        if (key === deviceID) return; 

        const data = cursors[key];
        if (now - data.timestamp > 10000) return;

        let el = document.getElementById(`cursor-${key}`);
        
        if (!el) {
            el = document.createElement('div');
            el.id = `cursor-${key}`;
            el.className = 'live-cursor';
            el.innerHTML = `
                <svg class="cursor-svg" viewBox="0 0 24 24" fill="${data.color}">
                    <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z"/>
                </svg>
                <div class="cursor-nametag">${data.username}</div>
            `;
            cursorLayer.appendChild(el);
        }

        el.style.left = data.x + "%";
        el.style.top = data.y + "%";
        
        const svgPath = el.querySelector('path');
        if(svgPath) svgPath.setAttribute('fill', data.color);
        const nametag = el.querySelector('.cursor-nametag');
        if(nametag) nametag.textContent = data.username;
    });

    // Cleanup old cursors
    const existingIds = Object.keys(cursors).map(k => `cursor-${k}`);
    Array.from(cursorLayer.children).forEach(child => {
        const key = child.id.replace('cursor-', '');
        if (!cursors[key] || (now - cursors[key].timestamp > 10000)) {
            child.remove();
        }
    });
});

// ---------------------- 8. GAME & SOUNDBOARD LOGIC ----------------------
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

if (clearChatBtn) {
  clearChatBtn.addEventListener("click", () => {
    if (confirm("Delete all messages?")) {
      db.ref("messages").remove();
      chatMessages.innerHTML = "";
    }
  });
}

// ---------------------- 9. FIREBASE REFS & VARS ----------------------
const messagesRef = db.ref("messages");
const soundRef = db.ref("global_sfx"); 
const typingRef = db.ref("typing");

let timeouts = null; 
let timeoutInterval = null;

// NOTE: from here forward, I integrated extended admin/member/jumpscare/presence logic.
// "loadTime" used to ignore older events that predate page load:
const loadTime = Date.now();

// ------------- SFX Audio player Logic (global) -------------
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

// ---------------------- 10. GIF & EMOJI PICKERS ----------------------
const myGifs = [
  "gifs/1.gif", "gifs/2.gif", "gifs/3.gif", "gifs/4.gif", "gifs/5.gif",
  "gifs/6.gif", "gifs/7.gif", "gifs/8.gif", "gifs/9.gif", "gifs/10.gif",
  "gifs/11.gif", "gifs/12.gif", "gifs/13.gif", "gifs/14.gif", "gifs/15.gif",
  "gifs/16.gif", "gifs/17.gif", "gifs/18.gif", "gifs/19.gif", "gifs/20.gif",
  "gifs/21.gif", "gifs/22.gif", "gifs/23.gif", "gifs/24.gif", "gifs/25.gif"
];

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
      if (!username) return;
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
        color: myColor, 
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

// Close pickers on outside click
document.addEventListener('click', (event) => {
  const isClickInsideGif = gifVault.contains(event.target);
  const isClickOnGifBtn = gifBtn.contains(event.target);
  const isClickInsideEmoji = emojiVault.contains(event.target);
  const isClickOnEmojiBtn = emojiBtn.contains(event.target);

  if (!isClickInsideGif && !isClickOnGifBtn) gifVault.style.display = 'none';
  if (!isClickInsideEmoji && !isClickOnEmojiBtn) emojiVault.style.display = 'none';
});

// ---------------------- 11. CHAT LOGIC & ANTI-SPAM ----------------------
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

let spamTimestamps = [];
let isRateLimited = false;

function checkRateLimit() {
    const now = Date.now();
    spamTimestamps = spamTimestamps.filter(t => t > now - 5000);
    if (spamTimestamps.length >= 10) return true;
    spamTimestamps.push(now);
    return false;
}

sendChat.addEventListener("click", () => {
  if (!username) return; // Must be logged in
  const text = chatInput.value.trim();
  if (!text) return;

  if (text.length > MAX_CHARS) {
    alert("Message too long! Remove characters.");
    return;
  }
  if (timeouts === null) {
    console.log("Still loading data...");
    return; 
  }
  const myTimeout = timeouts[deviceID]; 
  if (myTimeout && myTimeout.until > Date.now()) {
    // normal timeout prevents sending; shadow timeouts should still allow sending
    if (myTimeout.type === 'normal') {
      alert("you're timed out.");
      return;
    }
    // if shadow type, allow sending (the message will be invisible to others)
  }
  if (isRateLimited) return;

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
    color: myColor, 
    timestamp: Date.now(),
    fingerprint: deviceID
  });
  
  chatInput.value = "";
  charCounter.textContent = MAX_CHARS; 
  typingRef.child(identityKey).remove();
});
chatInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendChat.click(); });

// ---------------------- 12. MESSAGE RENDERING ----------------------
let oldestLoadedKey = null;

function isNearBottom() {
  return chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 200;
}

// ---------------------- 13. TIMEOUTS & SOUND AUTO-PLAY ----------------------
// NOTE: This area was merged with the extended admin + presence + jumpscare logic
// The larger combined block appears lower in this file (after the members/presence code).

// ============================================================================
// ---------------------- EXTENDED ADMIN / MEMBER / PRESENCE / JUMPSCARE ----------------------
// ============================================================================

// new refs for presence, users, per-user sfx, jumpscares
const presenceRef = db.ref('presence');
const userRef = db.ref('users');
const userSfxRef = db.ref('user_sfx');
const jumpscareRef = db.ref('jumpscares');

// NOTE: timeouts, timeoutInterval, loadTime already declared above

// ------------- PRESENCE (connected / active / away) -------------
function initPresence() {
  if (!identityKey) return;
  const connectedRef = db.ref('.info/connected');
  const myPresenceRef = presenceRef.child(identityKey);
  connectedRef.on('value', snap => {
    if (snap.val() === true) {
      // initial set
      myPresenceRef.set({ state: document.visibilityState === 'visible' ? 'active' : 'away', ts: Date.now(), device: deviceID });
      myPresenceRef.onDisconnect().remove();
    } else {
      // disconnected
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!identityKey) return;
    myPresenceRef.update({ state: document.visibilityState === 'visible' ? 'active' : 'away', ts: Date.now() });
  });
}

// call initPresence on login (we wrapped completeLogin earlier? ensure we set identityKey first)
const origCompleteLogin = completeLogin;
completeLogin = function(uname, forceAdmin = false) {
  origCompleteLogin(uname, forceAdmin);
  // set user profile in DB (if not existing) and set color
  const cName = uname.replace(/\s+/g, "").toLowerCase();
  userRef.child(cName).once('value', snap => {
    if (!snap.exists()) {
      userRef.child(cName).set({ originalName: uname, created: Date.now(), color: myColor, lastDevice: deviceID });
    } else {
      // update color and lastDevice
      userRef.child(cName).update({ color: myColor, lastDevice: deviceID });
    }
  });
  identityKey = cName;
  initPresence();
  setupMemberListListener();
};

// ------------- MEMBER LIST / RENDERING -------------
function setupMemberListListener() {
  presenceRef.on('value', renderMemberList);
  userRef.on('value', renderMemberList);
  cursorRef.on('value', renderMemberList);
}

// Renders the member list inside #member-list
function renderMemberList() {
  const memberListEl = document.getElementById('member-list');
  if (!memberListEl) return;
  memberListEl.innerHTML = '';
  Promise.all([userRef.once('value'), presenceRef.once('value'), cursorRef.once('value')])
    .then(([usersSnap, presSnap, cursSnap]) => {
      const users = usersSnap.val() || {};
      const pres = presSnap.val() || {};
      const curs = cursSnap.val() || {};

      const keys = Object.keys(users).sort((a,b) => a.localeCompare(b));
      keys.forEach(k => {
        const u = users[k];
        const row = document.createElement('div');
        row.className = 'member-row';
        // icon
        const icon = document.createElement('img');
        icon.className = 'member-icon';
        icon.alt = 'icon';
        if (u.icon) icon.src = u.icon;
        else icon.src = 'defaulticon.png';
        row.appendChild(icon);

        // name and glow for admins
        const name = document.createElement('div');
        name.className = 'member-name';
        name.textContent = u.originalName || k;
        if (admins[k]) {
          name.classList.add('admin-glow'); // show glow in member list too
        }
        row.appendChild(name);

        // status emoji
        const statusSpan = document.createElement('div');
        statusSpan.className = 'member-status';
        const p = pres[k];
        const hasCursor = Object.values(curs || {}).some(c => c.username && c.username.replace(/\s+/g,'').toLowerCase() === k);
        let statusEmoji = '⚫'; // offline default
        if (p && p.state === 'active') statusEmoji = '🟢';
        else if (p && p.state === 'away') statusEmoji = '🟠';
        else if (hasCursor) statusEmoji = '🟢';
        statusSpan.textContent = statusEmoji;
        row.appendChild(statusSpan);

        // member actions
        const memberActions = document.createElement('div');
        memberActions.className = 'member-actions';

        // try to find fingerprint by cursor entries
        let matchedFingerprint = null;
        Object.keys(curs || {}).forEach(fid => {
          if (curs[fid].username && curs[fid].username.replace(/\s+/g,'').toLowerCase() === k) matchedFingerprint = fid;
        });

        // check DB timeouts
        if (timeouts && matchedFingerprint && timeouts[matchedFingerprint] && timeouts[matchedFingerprint].until > Date.now()) {
          const t = timeouts[matchedFingerprint];
          const badge = document.createElement('span');
          badge.className = 'timeout-badge';
          badge.dataset.type = t.type === 'shadow' ? 'shadow' : 'normal';
          badge.textContent = '⏳';
          const secs = Math.ceil(Math.max(0, t.until - Date.now())/1000);
          badge.title = `${secs}s remaining (${t.type})`;
          badge.onclick = (e) => {
            if (!isAdmin) return;
            e.stopPropagation();
            const newSecs = prompt(`Set new timeout seconds for ${u.originalName || k} (0 = remove):`, Math.ceil((t.until - Date.now())/1000));
            if (newSecs === null) return;
            if (isNaN(newSecs)) { alert('enter a number'); return; }
            if (parseInt(newSecs) <= 0) {
              if (matchedFingerprint) db.ref('timeouts').child(matchedFingerprint).remove();
            } else {
              const newUntil = Date.now() + parseInt(newSecs) * 1000;
              db.ref('timeouts').child(matchedFingerprint).set({ until: newUntil, originalName: u.originalName || k, type: t.type });
            }
          };
          memberActions.appendChild(badge);
        }

        // color box
        const colorBox = document.createElement('div');
        colorBox.style.width = '12px';
        colorBox.style.height = '12px';
        colorBox.style.borderRadius = '3px';
        colorBox.style.border = '1px solid #111';
        colorBox.style.background = u.color || '#ffffff';
        memberActions.appendChild(colorBox);

        // admin delete account button
        if (isAdmin) {
          const delBtn = document.createElement('span');
          delBtn.className = 'admin-delete';
          delBtn.textContent = '⛔';
          delBtn.title = `DELETE account ${u.originalName || k}`;
          delBtn.onclick = (ev) => {
            ev.stopPropagation();
            if (!confirm(`⚠️ ARE YOU SURE? This will DELETE the account "${u.originalName || k}"`)) return;
            userRef.child(k).remove();
            presenceRef.child(k).remove();
            cursorRef.once('value').then(csnap => {
              const vals = csnap.val() || {};
              Object.keys(vals).forEach(fid => {
                if (vals[fid].username && vals[fid].username.replace(/\s+/g,'').toLowerCase() === k) {
                  cursorRef.child(fid).remove();
                }
              });
            });
          };
          memberActions.appendChild(delBtn);
        }

        row.appendChild(memberActions);
        memberListEl.appendChild(row);
      });
    });
}

// toggle UI for member list
const memberToggleBtn = document.getElementById('member-list-toggle');
if (memberToggleBtn) {
  const panel = document.getElementById('member-list-panel');
  const arrow = document.getElementById('member-list-arrow');
  memberToggleBtn.onclick = () => {
    if (!panel) return;
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    arrow.textContent = panel.style.display === 'none' ? '↓' : '↑';
  };
}

// ------------- CUSTOM ICON HANDLING (settings) -------------
const customIconInput = document.getElementById('custom-icon-url');
const customIconPreview = document.getElementById('custom-icon-preview');
const customIconMsg = document.getElementById('custom-icon-msg');
if (customIconInput) {
  customIconInput.addEventListener('input', () => {
    const url = customIconInput.value.trim();
    customIconMsg.style.display = 'none';
    if (!url) { customIconPreview.innerHTML = '⚪'; localStorage.removeItem('chat_custom_icon'); return; }
    if (!url.match(/\.(png|jpg|jpeg|gif)(\?.*)?$/i) || url.length > 2000) {
      customIconMsg.style.display = 'block';
      customIconMsg.textContent = "link cant be accepted or doesnt work";
      customIconPreview.innerHTML = '⚪';
      return;
    }
    // try load
    const img = new Image();
    img.onload = () => {
      customIconPreview.innerHTML = '';
      img.style.width = '40px'; img.style.height = '40px'; img.style.borderRadius = '6px';
      customIconPreview.appendChild(img);
      customIconMsg.style.display = 'block';
      customIconMsg.textContent = 'preview OK — press Save to store';
    };
    img.onerror = () => {
      customIconPreview.innerHTML = '⚪';
      customIconMsg.style.display = 'block';
      customIconMsg.textContent = "link cant be accepted or doesnt work";
    };
    img.src = url;
  });

  // Save icon when settings are closed (simple approach)
  const closeSettingsBtn = document.getElementById('close-settings');
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      const url = customIconInput.value.trim();
      if (!url) return;
      if (!identityKey) return;
      if (!url.match(/\.(png|jpg|jpeg|gif)(\?.*)?$/i) || url.length > 2000) return;
      // save to DB for all to see
      userRef.child(identityKey).update({ icon: url });
      localStorage.setItem('chat_custom_icon', url);
    });
  }
}

// ------------- TIMEOUTS: listen + shadow logic in rendering -------------
db.ref('timeouts').on('value', (snapshot) => {
  timeouts = snapshot.val() || {};
  updateTimeoutDisplay();
});

// update timer that appears for the current device
function updateTimeoutDisplay() {
  clearInterval(timeoutInterval);
  if (!timeouts) return;
  const myStatus = timeouts[deviceID];
  const timerEl = document.getElementById('timeout-timer');
  if (!myStatus || myStatus.until <= Date.now()) {
    if (timerEl) timerEl.textContent = "";
    return;
  }
  function tick() {
    const seconds = Math.ceil(Math.max(0, myStatus.until - Date.now()) / 1000);
    if (timerEl) timerEl.textContent = seconds > 0 ? `Your device is timed out for ${seconds}s more.` : "";
    if (seconds <= 0) {
      clearInterval(timeoutInterval);
      if (timerEl) timerEl.textContent = "";
    }
  }
  tick();
  timeoutInterval = setInterval(tick, 500);
  // re-render member list so badges update
  renderMemberList();
}

// ------------- ADMIN TIMEOUT POPUP (attached to message buttons) -------------
function showAdminTimeoutPopup(anchorEl, targetFingerprint, targetName) {
  // remove old popups
  document.querySelectorAll('.admin-timeout-popup').forEach(el => el.remove());
  const rect = anchorEl.getBoundingClientRect();
  const popup = document.createElement('div');
  popup.className = 'admin-timeout-popup';
  popup.style.left = `${rect.right + 6 + window.scrollX}px`;
  popup.style.top = `${rect.top + window.scrollY}px`;
  popup.innerHTML = `
    <input id="adm-time-secs" placeholder="seconds" style="width:80px; padding:4px; border-radius:6px; border:1px solid #333;" />
    <button id="adm-normal">⏱️ Normal</button>
    <button id="adm-shadow">⛓️‍💥 Shadow</button>
  `;
  document.body.appendChild(popup);

  popup.querySelector('#adm-normal').onclick = () => {
    const v = parseInt(popup.querySelector('#adm-time-secs').value) || 60;
    const until = Date.now() + v * 1000;
    db.ref('timeouts').child(targetFingerprint).set({ until: until, originalName: targetName, type: 'normal' });
    popup.remove();
  };
  popup.querySelector('#adm-shadow').onclick = () => {
    const v = parseInt(popup.querySelector('#adm-time-secs').value) || 60;
    const until = Date.now() + v * 1000;
    db.ref('timeouts').child(targetFingerprint).set({ until: until, originalName: targetName, type: 'shadow' });
    popup.remove();
  };
  // remove when clicking elsewhere
  setTimeout(() => {
    document.addEventListener('click', function _d(e) {
      if (!popup.contains(e.target) && e.target !== anchorEl) { popup.remove(); document.removeEventListener('click', _d); }
    });
  }, 50);
}

// ------------- MESSAGE RENDERING: filter shadowed messages -------------
messagesRef.limitToLast(50).on("child_added", (snapshot) => {
  const msg = snapshot.val();
  const msgKey = snapshot.key;
  if (!msg) return;

  // If this message is from a fingerprint that is currently shadow-timed, hide it from others
  if (msg.fingerprint && timeouts && timeouts[msg.fingerprint] && timeouts[msg.fingerprint].until > Date.now()) {
    const t = timeouts[msg.fingerprint];
    if (t.type === 'shadow' && deviceID !== msg.fingerprint) {
      // skip rendering for everyone except the owner (owner still sees own messages)
      return;
    }
  }

  if (document.querySelector(`[data-key="${msgKey}"]`)) return;

  if (!oldestLoadedKey) oldestLoadedKey = msgKey;
  const p = createMessageElement_custom(msg, msgKey);
  const children = Array.from(chatMessages.children);
  const wasNearBottom = isNearBottom();

  if (children.length === 0) {
    chatMessages.appendChild(p);
  } else {
    const firstChild = children[0];
    const lastChild = children[children.length - 1];
    if (msgKey > lastChild.dataset.key) {
      chatMessages.appendChild(p);
    } else if (msgKey < firstChild.dataset.key) {
      chatMessages.insertBefore(p, firstChild);
      oldestLoadedKey = msgKey;
    } else {
      let inserted = false;
      for (let i = 0; i < children.length; i++) {
        if (msgKey < children[i].dataset.key) {
          chatMessages.insertBefore(p, children[i]);
          inserted = true;
          break;
        }
      }
      if (!inserted) chatMessages.appendChild(p);
    }
  }

  if (wasNearBottom && msgKey > (children.length ? children[children.length-1].dataset.key : "")) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  if (children.length < 2) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});

messagesRef.on("child_removed", (snapshot) => {
  const msgEl = [...chatMessages.children].find(el => el.dataset.key === snapshot.key);
  if (msgEl) msgEl.remove();
});

// Custom createMessageElement to attach admin timeout popup + delete + timeout handling
function createMessageElement_custom(msg, msgKey) {
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
    userSpan.style.color = msg.color ? msg.color : stringToColor(msg.username);

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

  // Admin Delete/Timeout Button in Chat
  if (isAdmin) {
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "❌";
    deleteBtn.className = "admin-action-btn";
    deleteBtn.onclick = () => { db.ref("messages").child(msgKey).remove(); };
    p.appendChild(deleteBtn);

    const timeoutBtn = document.createElement("button");
    timeoutBtn.textContent = "⏱️";
    timeoutBtn.className = "admin-action-btn";
    timeoutBtn.onclick = (e) => {
        e.stopPropagation();
        const targetFingerprint = msg.fingerprint;
        if (!targetFingerprint) {
            alert("Cannot timeout: This is an old message without a Device ID.");
            return;
        }
        showAdminTimeoutPopup(e.currentTarget, targetFingerprint, msg.username);
    };
    p.appendChild(timeoutBtn);
  }

  p.dataset.key = msgKey;
  return p;
}

// ------------- per-user global sound handling -------------
userSfxRef.on('value', (snap) => {
  const val = snap.val() || {};
  if (!identityKey) return;
  const mySfx = val[identityKey];
  if (mySfx && mySfx.time > loadTime) {
    const audio = document.getElementById('sfx-player');
    if (audio) {
      audio.src = (mySfx.name || 's1') + ".mp3";
      audio.play().catch(()=>{});
    }
  }
});

// ------------- SEND per-user SFX (admin) -------------
const sendUserSfxBtn = document.getElementById('send-user-sfx');
if (sendUserSfxBtn) {
  sendUserSfxBtn.onclick = () => {
    if (!isAdmin) return;
    const target = document.getElementById('sfx-target-select').value;
    const soundName = document.getElementById('sfx-select').value;
    if (!target) { alert('Pick an online user'); return; }
    userSfxRef.child(target).set({ name: soundName, time: Date.now(), from: username });
    alert(`Played ${soundName} for ${target}`);
  };
}

// populate admin online-select menus
function populateAdminSelects() {
  Promise.all([presenceRef.once('value'), userRef.once('value')]).then(([ps, us]) => {
    const pres = ps.val() || {};
    const users = us.val() || {};
    const onlineKeys = Object.keys(pres || {}).filter(k => pres[k].state === 'active' || pres[k].state === 'away');
    const sfxSelect = document.getElementById('sfx-target-select');
    const jumpsSelect = document.getElementById('jumps-target-select');
    if (!sfxSelect || !jumpsSelect) return;
    sfxSelect.innerHTML = ''; jumpsSelect.innerHTML = '';
    onlineKeys.forEach(k => {
      if (!users[k]) return;
      const opt1 = document.createElement('option'); opt1.value = k; opt1.textContent = users[k].originalName || k;
      const opt2 = opt1.cloneNode(true);
      sfxSelect.appendChild(opt1); jumpsSelect.appendChild(opt2);
    });
  });
}
presenceRef.on('value', () => { populateAdminSelects(); });

// ------------- JUMPSCARE: admin send & client receive -------------
const jumpsModal = document.getElementById('admin-jumpscare-modal');
const openAdminToggle = document.getElementById('admin-toggle');
if (openAdminToggle) {
  openAdminToggle.onclick = () => {
    if (!isAdmin) return;
    jumpsModal.style.display = jumpsModal.style.display === 'none' || jumpsModal.style.display === '' ? 'flex' : 'none';
  };
}
const closeJumps = document.getElementById('close-jumpscare-modal');
if (closeJumps) closeJumps.onclick = () => { jumpsModal.style.display = 'none'; };
document.getElementById('tab-sounds').onclick = () => { document.getElementById('admin-sounds-tab').style.display='block'; document.getElementById('admin-jumps-tab').style.display='none'; };
document.getElementById('tab-jumps').onclick = () => { document.getElementById('admin-sounds-tab').style.display='none'; document.getElementById('admin-jumps-tab').style.display='block'; };

const jumpsUrlInput = document.getElementById('jumps-url');
const jumpsPreview = document.getElementById('jumps-preview');
if (jumpsUrlInput) {
  jumpsUrlInput.addEventListener('input', () => {
    const url = jumpsUrlInput.value.trim();
    document.getElementById('jumps-err').style.display = 'none';
    if (!url.match(/\.(png|jpg|jpeg|gif)(\?.*)?$/i) || url.length > 2000) {
      jumpsPreview.innerHTML = '<span style="color:#999">Preview will appear here</span>';
      return;
    }
    const img = new Image();
    img.onload = () => {
      jumpsPreview.innerHTML = '';
      img.style.maxWidth = '100%'; img.style.maxHeight = '100%'; img.style.borderRadius='6px';
      jumpsPreview.appendChild(img);
    };
    img.onerror = () => {
      jumpsPreview.innerHTML = '<span style="color:#f88">link does not work</span>';
    };
    img.src = url;
  });
}

document.getElementById('send-jumpscare').onclick = () => {
  if (!isAdmin) return;
  const url = jumpsUrlInput.value.trim();
  const target = document.getElementById('jumps-target-select').value;
  if (!url.match(/\.(png|jpg|jpeg|gif)(\?.*)?$/i) || url.length > 2000) { document.getElementById('jumps-err').style.display='block'; document.getElementById('jumps-err').textContent='link doesn\\'t work'; return; }
  if (!target) { alert('Pick an online target'); return; }
  jumpscareRef.push({ target: target, image: url, sound: 'jumpscarenoise', time: Date.now(), from: username });
  alert(`Jumpscare sent to ${target}`);
};

// client: listen for jumpscares targeted at us
jumpscareRef.on('child_added', (snap) => {
  const ev = snap.val();
  if (!ev || !ev.time || ev.time <= loadTime) return;
  if (!identityKey) return;
  if (ev.target && ev.target === identityKey) {
    // show overlay
    let overlay = document.getElementById('jumpscare-overlay');
    if (!overlay) {
      overlay = document.createElement('div'); overlay.id = 'jumpscare-overlay'; overlay.style.display='flex';
      const img = document.createElement('img'); img.id = 'jumpscare-img';
      overlay.appendChild(img);
      document.body.appendChild(overlay);
      overlay.onclick = () => { overlay.style.display='none'; const a = document.getElementById('sfx-player'); if (a) a.pause(); };
    }
    const imgEl = document.getElementById('jumpscare-img');
    imgEl.src = ev.image;
    overlay.style.display = 'flex';
    const sfx = document.getElementById('sfx-player');
    if (sfx) {
      sfx.src = (ev.sound || 'jumpscarenoise') + ".mp3";
      sfx.play().catch(()=>{});
    } else {
      const aud = new Audio((ev.sound || 'jumpscarenoise') + ".mp3");
      aud.play().catch(()=>{});
    }
    // remove event after processed (so it doesn't trigger again)
    snap.ref.remove().catch(()=>{});
  }
});

// ensure admin selects update
presenceRef.on('value', populateAdminSelects);

// initial populate
populateAdminSelects();

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
