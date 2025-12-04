// =========================
//  JAIRO RNG GAME - game.js
// =========================

// ---- CONFIG ----

// Rarity weights (adjust anytime)
const rarities = {
    common: 60,
    rare: 25,
    epic: 10,
    legendary: 4,
    mythical: 1
};

// List of Jairos
// Add as many as you want — these are examples
const jairoList = [
    { id: 1, name: "Default Jairo", rarity: "common", img: "jairos/default.png" },
    { id: 2, name: "Cool Jairo", rarity: "rare", img: "jairos/cool.png" },
    { id: 3, name: "Buff Jairo", rarity: "epic", img: "jairos/buff.png" },
    { id: 4, name: "Galaxy Jairo", rarity: "legendary", img: "jairos/galaxy.png" },
    { id: 5, name: "God Jairo", rarity: "mythical", img: "jairos/god.png" }
];

// Inventory (saved in localStorage)
let inventory = JSON.parse(localStorage.getItem("inventory")) || [];

// DOM Elements
const spinButton = document.getElementById("spinButton");
const overlay = document.getElementById("spinOverlay");
const spinningArea = document.getElementById("spinningArea");
const revealBox = document.getElementById("revealBox");
const revealImage = document.getElementById("revealImage");
const revealName = document.getElementById("revealName");
const duplicateNotice = document.getElementById("duplicateNotice");
const inventoryList = document.getElementById("inventoryList");


// -----------------------------
// CHOOSE RANDOM JAIRO BY RARITY
// -----------------------------
function weightedRandom() {
    let pool = [];

    for (let jairo of jairoList) {
        let weight = rarities[jairo.rarity];
        for (let i = 0; i < weight; i++) pool.push(jairo);
    }

    return pool[Math.floor(Math.random() * pool.length)];
}


// -----------------------------
// SPIN ANIMATION (BLACK OUTLINES)
// -----------------------------
function startSpin() {
    overlay.style.display = "flex";
    spinningArea.innerHTML = "";

    let spinImages = [];
    let spinInterval = 60; // more = slower

    for (let i = 0; i < 20; i++) {
        let randomJairo = jairoList[Math.floor(Math.random() * jairoList.length)];

        let img = document.createElement("img");
        img.src = randomJairo.img;
        img.classList.add("spinSilhouette");
        spinningArea.appendChild(img);

        spinImages.push(img);
    }

    return new Promise(resolve => {
        let index = 0;

        let interval = setInterval(() => {
            spinImages.forEach((img, i) => {
                img.style.opacity = (i === index) ? "1" : "0.15";
            });

            index++;
            if (index >= spinImages.length) {
                clearInterval(interval);
                resolve();
            }
        }, spinInterval);
    });
}


// -----------------------------
// REVEAL RESULT
// -----------------------------
function revealJairo(jairo, isNew) {
    revealImage.src = jairo.img;
    revealName.innerText = `${jairo.name} (${jairo.rarity.toUpperCase()})`;

    duplicateNotice.style.display = isNew ? "none" : "block";

    revealBox.style.display = "flex";
}


// -----------------------------
// INVENTORY MANAGEMENT
// -----------------------------
function addToInventory(jairo) {
    if (!inventory.includes(jairo.id)) {
        inventory.push(jairo.id);
        localStorage.setItem("inventory", JSON.stringify(inventory));
        return true; // NEW
    }
    return false; // DUPLICATE
}


// -----------------------------
// DISPLAY INVENTORY
// -----------------------------
function updateInventoryDisplay() {
    inventoryList.innerHTML = "";
    for (let id of inventory) {
        let jairo = jairoList.find(j => j.id === id);

        let item = document.createElement("div");
        item.classList.add("invItem");
        item.innerHTML = `
            <img src="${jairo.img}">
            <p>${jairo.name}</p>
            <span class="rarity">${jairo.rarity}</span>
        `;
        inventoryList.appendChild(item);
    }
}
updateInventoryDisplay();


// -----------------------------
// MAIN SPIN BUTTON LOGIC
// -----------------------------
spinButton.addEventListener("click", async () => {
    revealBox.style.display = "none";

    let result = weightedRandom();

    await startSpin();

    let isNew = addToInventory(result);

    updateInventoryDisplay();

    revealJairo(result, isNew);
});


// -----------------------------
// EXIT REVEAL SCREEN
// -----------------------------
overlay.addEventListener("click", () => {
    overlay.style.display = "none";
});
