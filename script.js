// ============================================================================
//                              JAIRO CHAT SCRIPT - FULL FIXED VERSION
// ============================================================================

// ---------------------- 1. DEVICE FINGERPRINTING ----------------------
let deviceID = localStorage.getItem('chat_device_id');
if (!deviceID) {
  deviceID = 'dev-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  localStorage.setItem('chat_device_id', deviceID);
}
console.log("Your Device ID is:", deviceID);

// ---------------------- FIREBASE REFS (must be at top so auto-login doesn't crash) ----------------------
const messagesRef = db.ref("messages");
const soundRef = db.ref("global_sfx");
const typingRef = db.ref("typing");
const presenceRef = db.ref('presence');
const targetedSfxRef = db.ref('targeted_sfx');
const jumpscaresRef = db.ref('jumpscares');
const cursorRef = db.ref('cursors');

// ---------------------- 2. AUTH & ACCOUNT LOGIC ----------------------
let username = "";
let cleanName = "";
let identityKey = "";
let isAdmin = false;

// ADMIN CREDENTIALS & BADGES
const admins = {
  "bian": { password: "joe mamaaa", badge: "purplestar.png" },
  "jair0": { password: "JAIROJAIROJUANN", badge: "jairobadge.png" },
  "Chr1stian": { password: "doesntwork", badge: "christianbadge.png" }
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
    
    db.ref('users/' + cName).once('value', snapshot => {
        if(snapshot.exists()) {
            err.textContent = "Username already taken!";
        } else {
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
    
    if (admins[cleanName] || forceAdmin) {
        isAdmin = true;
        const toggleBtn = document.getElementById('admin-toggle');
        if(toggleBtn) toggleBtn.style.display = 'flex'; 
        const viewSuggBtn = document.getElementById('view-suggestions-btn');
        if(viewSuggBtn) viewSuggBtn.style.display = 'inline-block';
        const clearBtn = document.getElementById('clear-chat');
        if(clearBtn) clearBtn.style.display = "inline-block";
    }
    
    db.ref('users/' + cleanName).once('value', snap => {
        const data = snap.val() || {};
        if (data.color) {
            myColor = data.color;
            colorPicker.value = myColor;
            colorPreview.style.color = myColor;
        }
        if (data.icon) {
            myIcon = data.icon;
            iconInput.value = myIcon;
            validateIconPreview();
        }
    });
    
    setupPresence();

    // AUTO-PRESENCE VERIFICATION: confirm our presence entry actually landed
    // with a username. If not, auto-reload (up to 3 times) so the user always
    // appears properly in the target selector for sounds/jumpscares/force-refresh.
    const presenceRetries = parseInt(sessionStorage.getItem('presence_retries') || '0');
    setTimeout(() => {
      presenceRef.child(cleanName).once('value', snap => {
        const data = snap.val();
        if (!data || !data.username) {
          if (presenceRetries < 3) {
            sessionStorage.setItem('presence_retries', String(presenceRetries + 1));
            location.reload();
          }
        } else {
          sessionStorage.removeItem('presence_retries');
        }
      });
    }, 2000);
}

// Auto-Login Check on Refresh
const savedUser = localStorage.getItem('chat_logged_in_user');
if(savedUser) {
    completeLogin(savedUser);
} else {
    authOverlay.style.display = 'flex';
}

// ---------------------- 3. USER SETTINGS & VISUALS ----------------------
let myColor = localStorage.getItem("chat_username_color") || "#ffffff";
let myIcon = null;
let showCursors = localStorage.getItem("chat_show_cursors") !== "false"; 

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

const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const colorPicker = document.getElementById('color-picker');
const colorPreview = document.getElementById('color-preview');
const toggleCursorsCheckbox = document.getElementById('toggle-cursors');
const logoutBtn = document.getElementById('logout-btn');

const iconInput = document.getElementById('icon-input');
const iconPreview = document.getElementById('icon-preview');
const iconError = document.getElementById('icon-error');
const saveIconBtn = document.getElementById('save-icon-btn');

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

const memberListBtn = document.getElementById('member-list-btn');
const memberArrow = document.getElementById('member-arrow');
const memberPanel = document.getElementById('member-list-panel');
const membersList = document.getElementById('members-list');

const openGameBtn = document.getElementById("open-game");
const gifBtn = document.getElementById('gif-btn');
const emojiBtn = document.getElementById('emoji-btn');
const gifVault = document.getElementById('gif-vault');
const emojiVault = document.getElementById('emoji-vault');
const adminToggle = document.getElementById('admin-toggle');
const soundBoard = document.getElementById('admin-soundboard');
const closeSfx = document.getElementById('close-sfx');

const tabSounds = document.getElementById('tab-sounds');
const tabJumps = document.getElementById('tab-jumps');
const soundsContent = document.getElementById('sounds-content');
const jumpsContent = document.getElementById('jumps-content');

const jumpsImage = document.getElementById('jumps-image');
const jumpsPreview = document.getElementById('jumps-preview');
const jumpsError = document.getElementById('jumps-error');
const sendJumpsBtn = document.getElementById('send-jumpscare');

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
    if (cleanName) db.ref('users/' + cleanName).update({ color: myColor });
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

  function validateIconPreview() {
    const url = iconInput.value.trim();
    iconError.textContent = ''; 
    iconPreview.innerHTML = '';
    if (!url) return;
    if (url.length > 800) { 
      iconError.textContent = "Link too long"; 
      return; 
    }
    if (!/\.(png|jpe?g|gif|webp)$/i.test(url)) { 
      iconError.textContent = "Must end with .png/.jpg/.gif/.webp"; 
      return; 
    }
    const img = new Image();
    img.onload = () => { iconPreview.innerHTML = `<img src="${url}">`; };
    img.onerror = () => { iconError.textContent = "Link can't be accepted or doesn't work"; };
    img.src = url;
  }
  iconInput.addEventListener('input', () => { 
    clearTimeout(window.iconT); 
    window.iconT = setTimeout(validateIconPreview, 600); 
  });

  saveIconBtn.onclick = () => {
    const url = iconInput.value.trim();
    if (url && !iconError.textContent && cleanName) {
      db.ref('users/' + cleanName).update({ icon: url });
      myIcon = url;
      alert("✅ Custom icon saved!");
    }
  };
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
    if (!username) return;
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

// Soundboard Tabs
if (tabSounds) {
  tabSounds.onclick = () => {
    tabSounds.classList.add('active');
    tabJumps.classList.remove('active');
    if (document.getElementById('tab-tools')) document.getElementById('tab-tools').classList.remove('active');
    soundsContent.style.display = 'flex';
    jumpsContent.style.display = 'none';
    if (document.getElementById('tools-content')) document.getElementById('tools-content').style.display = 'none';
  };
}
if (tabJumps) {
  tabJumps.onclick = () => {
    tabJumps.classList.add('active');
    tabSounds.classList.remove('active');
    if (document.getElementById('tab-tools')) document.getElementById('tab-tools').classList.remove('active');
    soundsContent.style.display = 'none';
    jumpsContent.style.display = 'flex';
    if (document.getElementById('tools-content')) document.getElementById('tools-content').style.display = 'none';
  };
}

const tabTools = document.getElementById('tab-tools');
const toolsContent = document.getElementById('tools-content');
if (tabTools) {
  tabTools.onclick = () => {
    tabTools.classList.add('active');
    tabSounds.classList.remove('active');
    tabJumps.classList.remove('active');
    soundsContent.style.display = 'none';
    jumpsContent.style.display = 'none';
    toolsContent.style.display = 'flex';
  };
}

// ---------------------- 9. FIREBASE VARS ----------------------
let timeouts = null; 
let timeoutInterval = null;
const loadTime = Date.now();

let allUsers = {};
let allPresence = {};

db.ref('users').on('value', snap => { 
  allUsers = snap.val() || {}; 
  updateMemberList(); 
});

db.ref('presence').on('value', snap => { 
  allPresence = snap.val() || {}; 
  updateMemberList(); 
});

function setupPresence() {
  if (!cleanName) return;
  presenceRef.child(cleanName).set({
    username: username,
    lastSeen: Date.now(),
    status: 'active',
    deviceID: deviceID
  });
  presenceRef.child(cleanName).onDisconnect().remove();
}

function updatePresence() {
  if (!cleanName) return;
  presenceRef.child(cleanName).update({ lastSeen: Date.now(), status: 'active' });
}

const activityThrottle = throttle(() => {
  updatePresence();
  startIdleTimer();
}, 3000);

document.addEventListener('mousemove', activityThrottle);
document.addEventListener('keydown', activityThrottle);
document.addEventListener('click', activityThrottle);

let idleTimer = null;
function startIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (cleanName) presenceRef.child(cleanName).update({ status: 'idle' });
  }, 300000);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    updatePresence();
    startIdleTimer();
  } else if (cleanName) {
    presenceRef.child(cleanName).update({ status: 'idle' });
  }
});

// Inject a sticky ✕ close button inside the panel — always reachable
// even when the school clock is blocking the Member List toggle button
const memberPanelCloseBtn = document.createElement('button');
memberPanelCloseBtn.textContent = '✕';
memberPanelCloseBtn.style.cssText = 'position:sticky;top:4px;float:right;margin:4px 8px 0 0;background:none;border:none;color:#ed4245;font-size:18px;font-weight:bold;cursor:pointer;line-height:1;z-index:55;';
memberPanelCloseBtn.title = 'Close';
memberPanelCloseBtn.onclick = (e) => {
  e.stopPropagation();
  memberPanel.style.display = 'none';
  memberArrow.textContent = '↓';
};
memberPanel.prepend(memberPanelCloseBtn);

if (memberListBtn) {
  memberListBtn.onclick = () => {
    const show = memberPanel.style.display === 'none';
    memberPanel.style.display = show ? 'block' : 'none';
    memberArrow.textContent = show ? '↑' : '↓';
  };
}

// Close member panel when clicking anywhere outside it
document.addEventListener('click', (e) => {
  if (memberPanel.style.display !== 'none' &&
      !memberPanel.contains(e.target) &&
      !memberListBtn.contains(e.target)) {
    memberPanel.style.display = 'none';
    memberArrow.textContent = '↓';
  }
}, true);

function updateMemberList() {
  membersList.innerHTML = '';
  Object.keys(allUsers).sort((a,b) => (allUsers[a].originalName||a).localeCompare(allUsers[b].originalName||b)).forEach(cKey => {
    const u = allUsers[cKey];
    const dispName = u.originalName || cKey;
    const uColor = u.color || stringToColor(dispName);
    const uIcon = u.icon;

    const pres = allPresence[cKey];
    let stat = '⚫';
    if (pres) {
      const age = Date.now() - pres.lastSeen;
      if (age < 90000) stat = pres.status === 'active' ? '🟢' : '🟠';
      else if (age < 600000) stat = '🟠';
    }

    let hasT = false, tType = 'normal', tRem = 0;
    Object.keys(timeouts || {}).forEach(d => {
      const t = timeouts[d];
      if (t && t.originalName && t.originalName.toLowerCase() === cKey && t.until > Date.now()) {
        hasT = true; 
        tType = t.type || 'normal'; 
        tRem = Math.ceil((t.until - Date.now())/1000);
      }
    });

    const item = document.createElement('div');
    item.className = 'member-item';
    item.dataset.cname = cKey;
    item.innerHTML = `
      <span class="member-status">${stat}</span>
      ${uIcon ? `<img src="${uIcon}" class="member-icon">` : ''}
      <span class="member-name" style="color:${uColor};${admins[cKey.toLowerCase()] ? 'text-shadow:0 0 8px ' + uColor + ';' : ''}">${dispName}</span>
      ${isAdmin && hasT ? `<span class="timeout-emoji" style="color: ${tType==='shadow'?'#c724c7':'#ff4444'}" title="${tRem}s left (${tType})">⏳</span>` : ''}
      ${isAdmin ? `<button class="delete-user-btn" data-cname="${cKey}" title="Delete account">⛔</button>` : ''}
    `;
    membersList.appendChild(item);
  });
}

membersList.addEventListener('click', e => {
  if (e.target.classList.contains('delete-user-btn')) {
    const cname = e.target.dataset.cname;
    const name = allUsers[cname] ? allUsers[cname].originalName : cname;
    if (confirm(`⚠️ ARE YOU SURE? This permanently DELETES "${name}"!`)) {
      db.ref('users/' + cname).remove();
      db.ref('presence/' + cname).remove();
    }
  }
  const emoji = e.target.closest('.timeout-emoji');
  if (emoji && isAdmin) {
    const item = emoji.closest('.member-item');
    const cKey = item.dataset.cname;
    const dispName = (allUsers[cKey] && allUsers[cKey].originalName) || (allPresence[cKey] && allPresence[cKey].username) || cKey;
    const dur = prompt(`New timeout seconds for ${dispName} (0 = remove):`, '60');
    if (dur !== null) {
      const ns = parseInt(dur);
      Object.keys(timeouts || {}).forEach(did => {
        if (timeouts[did] && timeouts[did].originalName && timeouts[did].originalName.toLowerCase() === cKey) {
          if (ns <= 0) db.ref('timeouts/' + did).remove();
          else db.ref('timeouts/' + did).update({until: Date.now() + ns*1000});
        }
      });
    }
  }
});

// ---------------------- 10. GIF & EMOJI PICKERS ----------------------
const myGifs = ["gifs/1.gif","gifs/2.gif","gifs/3.gif","gifs/4.gif","gifs/5.gif","gifs/6.gif","gifs/7.gif","gifs/8.gif","gifs/9.gif","gifs/10.gif","gifs/11.gif","gifs/12.gif","gifs/13.gif","gifs/14.gif","gifs/15.gif","gifs/16.gif","gifs/17.gif","gifs/18.gif","gifs/19.gif","gifs/20.gif","gifs/21.gif","gifs/22.gif","gifs/23.gif","gifs/24.gif","gifs/25.gif"];

const myEmojis = ["emojis/e1.png","emojis/e2.png","emojis/e3.png","emojis/e4.png","emojis/e5.png","emojis/e6.png","emojis/e7.png","emojis/e8.png","emojis/e9.png","emojis/e10.png"];

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
      if (myTimeout && myTimeout.until > Date.now() && myTimeout.type !== 'shadow') {
        alert("you're timed out buddy.");
        return;
      }

      messagesRef.push({ 
        text: url, 
        username: username, 
        color: myColor, 
        icon: myIcon,
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
  if (!username) return;
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
  if (myTimeout && myTimeout.until > Date.now() && myTimeout.type !== 'shadow') {
    alert("you're timed out.");
    return;
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
    icon: myIcon,
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

messagesRef.limitToLast(50).on("child_added", (snapshot) => {
  const msg = snapshot.val();
  const msgKey = snapshot.key;

  if (document.querySelector(`[data-key="${msgKey}"]`)) return;
  if (!oldestLoadedKey) oldestLoadedKey = msgKey;

  const p = createMessageElement(msg, msgKey);
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

function createMessageElement(msg, msgKey) {
  if (!isAdmin && msg.fingerprint && timeouts && timeouts[msg.fingerprint] && 
      timeouts[msg.fingerprint].until > Date.now() && 
      timeouts[msg.fingerprint].type === 'shadow' && 
      msg.fingerprint !== deviceID) {
    return document.createElement('div');
  }

  const p = document.createElement("p");

  // Shadow timeout visual: admins see the message dimmed so they know it's a ghost post.
  // The sender themselves sees it fully normally (no hint anything is wrong).
  const isShadowed = msg.fingerprint && timeouts && timeouts[msg.fingerprint] &&
      timeouts[msg.fingerprint].until > Date.now() &&
      timeouts[msg.fingerprint].type === 'shadow';
  const isMine = msg.fingerprint === deviceID;
  if (isShadowed && isAdmin) {
    p.style.opacity = '0.45';
    p.style.filter = 'grayscale(60%)';
    p.title = '🕶️ Shadow timed-out message (only you and the sender can see this)';
  }

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

    if (msg.icon) {
      const iconEl = document.createElement("img");
      iconEl.src = msg.icon;
      iconEl.style.cssText = "width:18px;height:18px;border-radius:50%;margin-right:6px;vertical-align:middle;";
      p.appendChild(iconEl);
    }

    p.appendChild(timeSpan);
    p.appendChild(userSpan);
    p.appendChild(contentDiv);
  }

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
        const duration = prompt(`Normal timeout ${msg.username} for how many seconds?`);
        if (duration && !isNaN(duration)) {
            const untilTime = Date.now() + (parseInt(duration) * 1000);
            db.ref("timeouts").child(msg.fingerprint).set({ 
                until: untilTime,
                type: "normal",
                originalName: msg.username 
            });
        }
    };
    p.appendChild(timeoutBtn);

    const shadowBtn = document.createElement("button");
    shadowBtn.textContent = "🕶️";
    shadowBtn.className = "admin-action-btn";
    shadowBtn.onclick = () => {
        const duration = prompt(`Shadow timeout ${msg.username} for how many seconds?`);
        if (duration && !isNaN(duration)) {
            const untilTime = Date.now() + (parseInt(duration) * 1000);
            db.ref("timeouts").child(msg.fingerprint).set({ 
                until: untilTime,
                type: "shadow",
                originalName: msg.username 
            });
        }
    };
    p.appendChild(shadowBtn);
  }

  p.dataset.key = msgKey;
  return p;
}

chatMessages.addEventListener("scroll", () => {
    if (chatMessages.scrollTop === 0 && oldestLoadedKey) {
        loadOldMessages();
    }
});

function loadOldMessages() {
    messagesRef.orderByKey().endBefore(oldestLoadedKey).limitToLast(50).once("value", (snapshot) => {
        if (!snapshot.exists()) return;
        const oldHeight = chatMessages.scrollHeight;
        let newOldest = oldestLoadedKey;
        const messages = [];
        snapshot.forEach(child => {
            messages.push({ key: child.key, val: child.val() });
        });
        if (messages.length > 0) newOldest = messages[0].key;

        const fragment = document.createDocumentFragment();
        messages.forEach(item => {
           const p = createMessageElement(item.val, item.key);
           fragment.appendChild(p);
        });

        chatMessages.insertBefore(fragment, chatMessages.firstChild);
        oldestLoadedKey = newOldest;
        chatMessages.scrollTop = chatMessages.scrollHeight - oldHeight;
    });
}

// ---------------------- 13. TIMEOUTS ----------------------
db.ref("timeouts").on("value", (snapshot) => {
  timeouts = snapshot.val() || {}; 
  updateTimeoutDisplay();
  updateMemberList();
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
    const isShadow = myStatus.type === 'shadow';
    timerEl.textContent = seconds > 0 
      ? (isShadow ? `` : `Your device is timed out for ${seconds}s more.`)
      : "";
    timerEl.style.color = '#ffb4b4';
    if (seconds <= 0) {
        clearInterval(timeoutInterval);
        timerEl.textContent = "";
    }
  }
  tick();
  timeoutInterval = setInterval(tick, 500);
}

// ---------------------- 14. TYPING INDICATOR ----------------------
let typeTimeout;

chatInput.addEventListener('input', () => {
  if (!username) return;
  if (timeouts && timeouts[deviceID] && timeouts[deviceID].until > Date.now() && timeouts[deviceID].type !== 'shadow') return;

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
    typingIndicator.textContent = `${currentTypers[0]} is typing ${dotStr}`;
  } else if (currentTypers.length === 2) {
    typingIndicator.textContent = `${currentTypers[0]} and ${currentTypers[1]} are typing ${dotStr}`;
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

// ---------------------- TARGETED SOUNDS & JUMPSCARES ----------------------
function showTargetSelector(callback) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '4000';
  modal.innerHTML = `
    <div class="modal-content" style="width:340px;">
      <div class="modal-header"><h3>Choose online user</h3><button style="background:none;border:none;color:#ed4245;font-size:22px;" id="close-t">✕</button></div>
      <div id="target-list" style="max-height:360px;overflow:auto;padding:10px;"></div>
    </div>`;
  document.body.appendChild(modal);

  const list = modal.querySelector('#target-list');
  const online = Object.keys(allPresence).filter(k => allPresence[k] && allPresence[k].username && Date.now() - allPresence[k].lastSeen < 180000);
  online.forEach(k => {
    const p = allPresence[k];
    const b = document.createElement('button');
    b.style = 'width:100%;padding:12px;margin:5px 0;background:#36393f;border:1px solid #4f545c;border-radius:6px;color:#fff;cursor:pointer;';
    b.textContent = p.username + (admins[k.toLowerCase()] ? ' 👑' : '');
    b.onclick = () => { modal.remove(); callback(p.username); };
    list.appendChild(b);
  });
  if (!online.length) list.innerHTML = '<p style="text-align:center;padding:30px;color:#aaa;">No one online right now</p>';

  modal.querySelector('#close-t').onclick = () => { modal.remove(); callback(null); };
  modal.onclick = e => { if (e.target === modal) { modal.remove(); callback(null); }};
}

window.targetedTriggerSound = function(name) {
  showTargetSelector(user => {
    if (user) db.ref('targeted_sfx').push({ target: user, name: name, time: Date.now() });
  });
};

jumpsImage.addEventListener('input', () => {
  clearTimeout(window.jTimer);
  window.jTimer = setTimeout(() => {
    const u = jumpsImage.value.trim();
    jumpsError.textContent = ''; jumpsPreview.innerHTML = '';
    if (!u || u.length > 800 || !/\.(png|jpe?g|gif|webp)$/i.test(u)) return;
    const img = new Image();
    img.onload = () => jumpsPreview.innerHTML = `<img src="${u}">`;
    img.onerror = () => jumpsError.textContent = "Link doesn't work";
    img.src = u;
  }, 500);
});

sendJumpsBtn.onclick = () => {
  const url = jumpsImage.value.trim();
  if (!url || jumpsError.textContent) return alert('Fix image link first');
  showTargetSelector(user => {
    if (user) db.ref('jumpscares').push({ target: user, image: url, time: Date.now() });
  });
};

jumpscaresRef.on('child_added', snap => {
  const d = snap.val();
  if (d.target === username && d.time > loadTime) triggerJumpscare(d.image);
});

function triggerJumpscare(url) {
  const ov = document.createElement('div');
  ov.style = 'position:fixed;inset:0;background:#000;z-index:99999;display:flex;align-items:center;justify-content:center;opacity:1;transition:opacity .4s;';
  const i = document.createElement('img');
  i.src = url;
  i.style = 'max-width:92vw;max-height:92vh;object-fit:contain;box-shadow:0 0 80px #ff0000;';
  ov.appendChild(i);
  document.body.appendChild(ov);

  const ja = document.getElementById('jumpscare-audio');
  if (ja) { ja.currentTime = 0; ja.play().catch(()=>{}); }

  setTimeout(() => { ov.style.opacity = '0'; setTimeout(()=>ov.remove(), 600); }, 1800);
}

targetedSfxRef.on('child_added', snap => {
  const d = snap.val();
  if (d.target === username && d.time > loadTime) {
    const s = document.getElementById('sfx-player');
    s.src = d.name + '.mp3';
    s.play().catch(()=>{});
  }
});

// ---------------------- FORCE REFRESH (ADMIN TOOL) ----------------------
// Clients listen for a force_refresh event targeting their username.
// When received, they silently reload. Admins trigger this from the Tools tab.
forceRefreshRef.on('child_added', snap => {
  const d = snap.val();
  if (d && d.target === username && d.time > loadTime) {
    snap.ref.remove();
    location.reload();
  }
});

window.forceRefreshUser = function() {
  showTargetSelector(user => {
    if (user) forceRefreshRef.push({ target: user, time: Date.now() });
  });
};
