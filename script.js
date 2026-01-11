// ---------------------- USER & ADMIN SETUP ----------------------
let username = prompt("Enter your username:") || "unknown loser(anonymous)";

// keep raw and trimmed variations
username = username.toString();
const trimmed = username.trim();            // trimmed (keeps case)
const cleanName = trimmed.replace(/\s+/g, "").toLowerCase(); // normalized for checks

// admin credentials
const adminUsername = "bian";
const adminPassword = "hehehaha123";

let password = "";
let isAdmin = false;

// impersonation / admin logic:
// - only exact "bian" (case-sensitive, no extra spaces) can try to login as admin.
// - anything that normalizes to "bian" but is not exactly "bian" is reserved -> block reload.
if (cleanName === adminUsername && trimmed !== adminUsername) {
  alert("this username is RESERVED. go choose another name.");
  location.reload();
}

// prompt for admin password only if they entered exactly "bian"
if (trimmed === adminUsername) {
  password = prompt("Enter admin password:");
  if (password === adminPassword) {
    isAdmin = true;
    // normalize username to exact canonical admin
    username = adminUsername;
  } else {
    alert("just kidding, you are NOT the real bian, loser.");
    username = "fake bian (loser)";
  }
}

// For DB/timeouts we will use cleanName as the identity key (prevents bypass by spaces/case)
const identityKey = cleanName || username.replace(/\s+/g, "").toLowerCase();

// --- ADMIN ICON FOR CHAT MESSAGES ---
const adminIconSrc = "purplestar.png"; // the icon image

function addAdminIcon(p, messageUsername) {
  // Only exact "bian" gets the icon (messageUsername is the display name as stored)
  if (messageUsername === adminUsername) {
    const icon = document.createElement("img");
    icon.src = adminIconSrc;
    icon.className = "admin-icon";
    icon.alt = "admin";
    p.prepend(icon); // put the icon before username/text
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

// Media UI Elements
const mediaToggle = document.getElementById('media-toggle');
const mediaMenu = document.getElementById('media-menu');
const mediaLinkInput = document.getElementById('media-link-input');
const mediaPreview = document.getElementById('media-preview');

chatInput.focus();

// open game in new tab
if (openGameBtn) {
  openGameBtn.addEventListener("click", () => {
    window.open("game.html", "_blank");
  });
}

// show admin clear button if admin
if (isAdmin && clearChatBtn) clearChatBtn.style.display = "inline-block";

// use existing db variable (from index.html)
const messagesRef = db.ref("messages");

// timeouts keyed by normalized name
let timeouts = {};
let timeoutInterval = null;

// Admin clear chat
if (isAdmin && clearChatBtn) {
  clearChatBtn.addEventListener("click", () => {
    if (confirm("Delete all messages?")) {
      db.ref("messages").remove();
      chatMessages.innerHTML = "";
    }
  });
}

// ---------------------- MEDIA POPUP LOGIC ----------------------

// Open/Close the black box
mediaToggle.addEventListener('click', () => {
  mediaMenu.style.display = (mediaMenu.style.display === 'block') ? 'none' : 'block';
});

// Show preview in the box
mediaLinkInput.addEventListener('input', () => {
  const url = mediaLinkInput.value.trim();
  // Image check
  if (url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
    mediaPreview.innerHTML = `<img src="${url}" style="max-width:100%; border-radius:4px; margin-top:5px;"/>`;
  } 
  // Video check
  else if (url.match(/\.(mp4|webm|ogg)$/i)) {
    mediaPreview.innerHTML = `<video src="${url}" autoplay muted loop style="width:100%; border-radius:4px; margin-top:5px;"></video>`;
  } 
  else {
    mediaPreview.innerHTML = '';
  }
});

// ---------------------- SEND MESSAGE ----------------------
sendChat.addEventListener("click", () => {
  let text = chatInput.value.trim();
  const mediaLink = mediaLinkInput.value.trim();

  // If there is a media link, we prioritize that or combine them
  if (mediaLink) {
    text = mediaLink + (text ? " " + text : "");
  }

  if (!text) return;

  const myTimeout = timeouts[identityKey];
  if (myTimeout && myTimeout.until > Date.now()) {
    alert("you are timed out, refrain from chatting till ur timeout is done.");
    return;
  }

  messagesRef.push({ text, username: username, timestamp: Date.now() });
  
  // Clear everything
  chatInput.value = "";
  mediaLinkInput.value = "";
  mediaPreview.innerHTML = "";
  mediaMenu.style.display = "none";
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

    // Container for text or media
    const contentDiv = document.createElement("div");
    contentDiv.className = "msg-content";

    // Split text to check for links
    const parts = msg.text.split(" ");
    const mediaUrl = parts[0]; // Check first word for a link

    if (mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
        const img = document.createElement("img");
        img.src = mediaUrl;
        img.className = "chat-media";
        contentDiv.appendChild(img);
        
        // Add remaining text if there is any
        const remainingText = parts.slice(1).join(" ");
        if (remainingText) {
            const textSpan = document.createElement("span");
            textSpan.className = "msgtext";
            textSpan.textContent = " " + remainingText;
            contentDiv.appendChild(textSpan);
        }
    } else if (mediaUrl.match(/\.(mp4|webm|ogg)$/i)) {
        const vid = document.createElement("video");
        vid.src = mediaUrl;
        vid.className = "chat-media";
        vid.controls = true;
        contentDiv.appendChild(vid);

        const remainingText = parts.slice(1).join(" ");
        if (remainingText) {
            const textSpan = document.createElement("span");
            textSpan.className = "msgtext";
            textSpan.textContent = " " + remainingText;
            contentDiv.appendChild(textSpan);
        }
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

  // admin controls (delete/timeout)
  if (isAdmin) {
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "❌";
    deleteBtn.style.marginLeft = "8px";
    deleteBtn.title = "Delete message";
    deleteBtn.addEventListener("click", () => {
      db.ref("messages").child(msgKey).remove();
    });
    p.appendChild(deleteBtn);

    const timeoutBtn = document.createElement("button");
    timeoutBtn.textContent = "⏰";
    timeoutBtn.style.marginLeft = "6px";
    timeoutBtn.title = "Timeout user";
    timeoutBtn.addEventListener("click", () => {
      const choice = prompt("Timeout duration (in seconds):", "30");
      const duration = parseInt(choice, 10) * 1000;
      if (!isNaN(duration) && duration > 0) {
        const targetClean = (msg.username || "").toString().trim().replace(/\s+/g, "").toLowerCase();
        const until = Date.now() + duration;
        db.ref("timeouts").child(targetClean).set({ until, by: username });
      }
    });
    p.appendChild(timeoutBtn);
  }

  p.dataset.key = msgKey;
  chatMessages.appendChild(p);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// remove DOM message instantly when deleted in DB
messagesRef.on("child_removed", (snapshot) => {
  const key = snapshot.key;
  const msgEl = [...chatMessages.children].find(el => el.dataset.key === key);
  if (msgEl) msgEl.remove();
});

// ---------------------- TIMEOUTS (live) ----------------------
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
    if (seconds > 0) {
      timerEl.textContent = `You are timed out for ${seconds}s more.`;
    } else {
      timerEl.textContent = "";
      clearInterval(timeoutInterval);
    }
  }

  tick();
  timeoutInterval = setInterval(tick, 500);
}

// ---------------------- OPTIONAL: small canvas preview (left panel) ----------------------
(function miniPreview() {
  const c = document.getElementById('miniGamePreview');
  if (!c) return;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#111';
  ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle = '#FFD700';
  ctx.font = '16px Arial';
  ctx.fillText('Game preview', 10, 30);
})();

// ---------------------- MUSIC (resume on first click) ----------------------
document.addEventListener('click', () => {
  const bgm = document.getElementById('bgm');
  if (bgm && bgm.paused) bgm.play().catch(()=>{});
}, { once: true });
