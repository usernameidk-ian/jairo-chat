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

chatInput.focus();

if (openGameBtn) {
  openGameBtn.addEventListener("click", () => {
    window.open("game.html", "_blank");
  });
}

if (isAdmin && clearChatBtn) clearChatBtn.style.display = "inline-block";

const messagesRef = db.ref("messages");
const storage = firebase.storage();

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

// ---------------------- IMAGE INPUT WITH STORAGE ----------------------
const attachBtn = document.createElement("button");
attachBtn.textContent = "📎";
attachBtn.style.marginRight = "6px";
attachBtn.title = "Attach image";
attachBtn.style.cursor = "pointer";

const chatRow = document.querySelector(".chat-input-row");
chatRow.insertBefore(attachBtn, chatInput);

const imageInput = document.createElement("input");
imageInput.type = "file";
imageInput.accept = "image/*";
imageInput.style.display = "none";

attachBtn.addEventListener("click", () => imageInput.click());

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (!file) return;

  const myTimeout = timeouts[identityKey];
  if (myTimeout && myTimeout.until > Date.now()) {
    alert("You are timed out, cannot send images right now.");
    return;
  }

  const filePath = `chat_images/${Date.now()}_${file.name}`;
  const storageRef = storage.ref(filePath);

  const uploadTask = storageRef.put(file);

  uploadTask.on(
    "state_changed",
    (snapshot) => {
      const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      console.log(`Upload is ${percent.toFixed(0)}% done`);
    },
    (error) => {
      alert("Upload failed: " + error.message);
    },
    () => {
      uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
        messagesRef.push({
          username,
          image: downloadURL,
          timestamp: Date.now(),
        });
      });
    }
  );
});

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

// ---------------------- MESSAGE RECEIVING & RENDERING ----------------------
messagesRef.on("child_added", (snapshot) => {
  const msg = snapshot.val();
  const msgKey = snapshot.key;
  const p = document.createElement("p");

  if (msg) {
    const userSpan = document.createElement("span");
    userSpan.className = "username";
    userSpan.textContent = msg.username + ":";
    userSpan.style.color = stringToColor(msg.username);
    p.appendChild(userSpan);

    if (msg.text) {
      const textSpan = document.createElement("span");
      textSpan.className = "msgtext";
      textSpan.textContent = " " + msg.text;
      p.appendChild(textSpan);
    }

    if (msg.image) {
      const img = document.createElement("img");
      img.src = msg.image;
      img.style.maxWidth = "200px";
      img.style.maxHeight = "200px";
      img.style.borderRadius = "6px";
      img.style.marginLeft = "6px";
      img.style.cursor = "pointer";
      img.title = "Click to view full image";
      img.addEventListener("click", () => window.open(msg.image, "_blank"));
      p.appendChild(img);
    }

    addAdminIcon(p, msg.username);
  }

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

messagesRef.on("child_removed", (snapshot) => {
  const key = snapshot.key;
  const msgEl = [...chatMessages.children].find((el) => el.dataset.key === key);
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

// ---------------------- MUSIC (resume on first click) ----------------------
document.addEventListener(
  "click",
  () => {
    const bgm = document.getElementById("bgm");
    if (bgm && bgm.paused) bgm.play().catch(() => {});
  },
  { once: true }
);
