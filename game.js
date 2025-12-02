// ===== BUCKSHOT ROULETTE — FULL MULTIPLAYER 3D =====
let playerName = "";
let lobbyId = "";
let isHost = false;
let myTurn = false;
let currentShellIsLive = false;

// DOM
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");
const deathOverlay = document.getElementById("deathOverlay");
const reviveOverlay = document.getElementById("reviveOverlay");

// 3D Setup
let scene, camera, renderer, controls, shotgun, dealer;
function init3D() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x110000);
  camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 100);
  camera.position.set(0, 4, 10);
  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Table
  const table = new THREE.Mesh(
    new THREE.BoxGeometry(12,0.5,10),
    new THREE.MeshStandardMaterial({color:0x002200, roughness:0.9})
  );
  table.position.y = -0.25;
  scene.add(table);

  // Shotgun (aimable)
  shotgun = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,4,16), new THREE.MeshStandardMaterial({color:0x888888}));
  barrel.rotation.z = Math.PI/2;
  barrel.position.x = 2;
  const stock = new THREE.Mesh(new THREE.BoxGeometry(2.5,0.5,0.8), new THREE.MeshStandardMaterial({color:0x8B4513}));
  stock.position.x = -0.8;
  shotgun.add(barrel, stock);
  shotgun.position.y = 0.4;
  scene.add(shotgun);

  // Creepy Dealer (hanging skull with hands)
  dealer = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.9,16,16), new THREE.MeshStandardMaterial({color:0x111111}));
  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.3,1,0.3), new THREE.MeshStandardMaterial({color:0x222222}));
  leftHand.position.set(-1.2, -0.8, 0);
  const rightHand = leftHand.clone();
  rightHand.position.x = 1.2;
  dealer.add(skull, leftHand, rightHand);
  dealer.position.set(0,5,-3);
  scene.add(dealer);

  // Lights
  scene.add(new THREE.AmbientLight(0x400000, 2));
  const redLight = new THREE.PointLight(0xff0000, 3, 20);
  redLight.position.set(0,6,0);
  scene.add(redLight);

  // Mouse aim
  document.addEventListener("mousemove", (e) => {
    const x = (e.clientX / innerWidth) * 2 - 1;
    shotgun.rotation.y = x * 0.5;
  });

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  dealer.rotation.y = Math.sin(Date.now()*0.001)*0.15;
  renderer.render(scene, camera);
}

// Death messages
const deathQuotes = ["oof..", "better luck next time..", "tsk tsk tsk..", "bruh.", "pain.", "couldn't make it huh?", "sucks to suck.", "oh well.."];
const reviveQuotes = ["but you still have a chance..", "nah, you'd win, right?", "not done yet..", "get up."];

// Join lobby
function joinLobby() {
  const lobbyRef = db.ref("buckshot_lobbies").child(lobbyId);
  lobbyRef.child("players").child(playerName).set({ lives:5, charges:5 });
  if (isHost) lobbyRef.set({ host:playerName, full:false, live:0, blank:0, turn:null, shellsLoaded:false, round:1 });

  lobbyRef.on("value", snap => {
    const data = snap.val();
    if (!data) return location.reload();

    const players = Object.keys(data.players || {});
    document.getElementById("players").textContent = players.join(" vs ");

    if (players.length === 2 && !data.full) {
      lobbyRef.update({ full:true });
      if (isHost) newRound();
    }

    const myData = data.players[playerName];
    if (myData) {
      document.getElementById("lives").innerHTML = `Charges: \( {"█".repeat(myData.charges)} ( \){myData.lives} lives)`;
    }

    document.getElementById("shells").textContent = `Shells: \( {data.live||0} live / \){data.blank||0} blank`;
    myTurn = data.turn === playerName;
    document.getElementById("selfBtn").disabled = !myTurn;
    document.getElementById("dealerBtn").disabled = !myTurn;
    document.getElementById("status").textContent = myTurn ? "YOUR TURN" : "OPPONENT'S TURN";
  });
}

// New round
function newRound() {
  const live = Math.floor(Math.random()*4)+2;
  const blank = 8 - live;
  db.ref("buckshot_lobbies").child(lobbyId).update({
    live, blank, turn: Object.keys(db.ref("buckshot_lobbies").child(lobbyId).child("players").once("value").then(s=>s.val()))[0], shellsLoaded:true
  });
}

// Shoot
function shoot(self) {
  if (!myTurn) return;
  document.getElementById("pump").play();
  shotgun.scale.set(1.1,1.1,1.1);
  setTimeout(()=>shotgun.scale.set(1,1,1),200);

  db.ref("buckshot_lobbies").child(lobbyId).once("value").then(snap => {
    const data = snap.val();
    const isLive = Math.random() < (data.live / (data.live + data.blank));

    if (isLive) {
      document.getElementById("boom").play();
      deathOverlay.style.opacity = 1;
      setTimeout(() => {
        deathOverlay.style.opacity = 0;
        document.body.style.background = "#000";
        const msg = deathQuotes[Math.floor(Math.random()*deathQuotes.length)];
        document.getElementById("status").innerHTML = `<div style="font-size:3em;color:#f00">${msg}</div>`;

        const target = self ? playerName : Object.keys(data.players).find(p=>p!==playerName);
        db.ref("buckshot_lobbies").child(lobbyId).child("players").child(target).child("lives").transaction(v => v-1);

        setTimeout(() => {
          db.ref("buckshot_lobbies").child(lobbyId).child("players").child(target).once("value").then(psnap => {
            const lives = psnap.val().lives;
            if (lives > 0) {
              document.getElementById("shock").play();
              reviveOverlay.style.opacity = 1;
              document.getElementById("status").innerHTML += `<br><br>${reviveQuotes[Math.floor(Math.random()*reviveQuotes.length)]}`;
              setTimeout(() => {
                reviveOverlay.style.opacity = 0;
                renderer.domElement.style.filter = "blur(20px)";
                setTimeout(() => renderer.domElement.style.filter = "", 3000);
              }, 1500);
            } else {
              endGame(self ? "YOU LOSE" : "YOU WIN");
            }
          });
        }, 2000);
      }, 1000);
    } else {
      document.getElementById("empty").play();
    }

    const newLive = data.live - (isLive?1:0);
    const newBlank = data.blank - (isLive?0:1);
    const nextTurn = Object.keys(data.players).find(p => p !== playerName);

    if (newLive + newBlank === 0) {
      newRound();
    } else {
      db.ref("buckshot_lobbies").child(lobbyId).update({ live:newLive, blank:newBlank, turn:nextTurn });
    }
  });
}

function endGame(msg) {
  document.getElementById("status").innerHTML = `<div style="font-size:4em;color:#f00">\( {msg}</div><br> \){deathQuotes[Math.floor(Math.random()*deathQuotes.length)]}`;
  document.getElementById("selfBtn").disabled = true;
  document.getElementById("dealerBtn").disabled = true;
}

document.getElementById("selfBtn").onclick = () => shoot(true);
document.getElementById("dealerBtn").onclick = () => shoot(false);

window.onresize = () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
};
