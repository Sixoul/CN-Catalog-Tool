// main.js

console.log("DASHBOARD STARTING...");

/* ================= VARIABLES ================= */
let db = null;
let auth = null;
let currentUser = null;

let newsData = [];
let jamsData = [];
let jamSubmissions = [];
let gamesData = [];
let challengesData = [];
let rulesData = [];
let coinsData = [];
let catalogData = [];
let requestsData = [];
let queueData = [];
let leaderboardData = [];
let filamentData = DEFAULT_FILAMENTS; // from config.js

let currentTier = 'tier1';
let currentRequestItem = null;
// Admin editing state
let editingCatId = null;
let editingId = null;
let editingNinjaId = null;
let editingJamId = null;
let editingChallengeId = null;
let currentJamSubmissionId = null;

let showHistory = false;
let historyLoaded = false;
let clickCount = 0;
let clickTimer;
let selectedVariantIdx = 0;
let carouselIndex = 0;

let listeners = {
    news: null, jams: null, games: null, catalog: null, queue: null, leaderboard: null, challenges: null
};

/* ================= UTILS ================= */
function parseCSVLine(text) {
    let results = []; let entry = []; let inQuote = false;
    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        if (char === '"') { inQuote = !inQuote; } 
        else if (char === ',' && !inQuote) { results.push(entry.join('')); entry = []; } 
        else { entry.push(char); }
    }
    results.push(entry.join(''));
    return results.map(r => r.trim().replace(/^"|"$/g, '').trim()); 
}

function generateUsername(baseName, existingData) {
    let clean = baseName.replace(/[^a-zA-Z0-9.]/g, '').toLowerCase(); 
    if (!clean) clean = "ninja" + Math.floor(Math.random() * 1000);
    let candidate = clean;
    let counter = 1;
    const isTaken = (u) => existingData.some(n => (n.username || "").toLowerCase() === u);
    while (isTaken(candidate)) { candidate = clean + counter; counter++; }
    return candidate;
}

function saveLocal(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function showAlert(t, m) { document.getElementById('alert-title').innerText = t; document.getElementById('alert-msg').innerText = m; document.getElementById('alert-modal').style.display = 'flex'; }
/* ================= HELPER: CUSTOM CONFIRM MODAL ================= */
function showConfirm(msg, callback, type = 'danger') {
    const modal = document.getElementById('confirm-modal');
    // Get inner elements to style
    const content = modal.querySelector('.modal-content');
    const header = modal.querySelector('.modal-header');
    const title = header.querySelector('h2');
    const yesBtn = document.getElementById('confirm-yes-btn');

    // Define Colors
    const colorRed = '#e74c3c';
    const colorGreen = '#2ecc71';

    // Apply Theme
    if (type === 'success') {
        content.style.borderColor = colorGreen;
        header.style.borderBottomColor = colorGreen;
        yesBtn.style.backgroundColor = colorGreen;
        title.innerText = "Confirm Payment";
        yesBtn.innerText = "APPROVE";
    } else {
        // Default / Danger
        content.style.borderColor = colorRed;
        header.style.borderBottomColor = colorRed;
        yesBtn.style.backgroundColor = colorRed;
        title.innerText = "Confirm Action";
        yesBtn.innerText = "YES";
    }

    // Set Message
    document.getElementById('confirm-msg').innerText = msg;

    // Reset Button Listener (Clone to remove old listeners)
    const newBtn = yesBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newBtn, yesBtn);
    
    newBtn.onclick = () => {
        modal.style.display = 'none';
        callback();
    };

    modal.style.display = 'flex';
}function handleLogoClick() { if(window.innerWidth < 768) return; clickCount++; clearTimeout(clickTimer); clickTimer = setTimeout(() => { clickCount = 0; }, 2000); if(clickCount === 3) { clickCount = 0; toggleAdminLogin(); } }
function toggleAdminViewMode() { const adminView = document.getElementById('admin-view'); const floatingBtn = document.getElementById('floating-admin-toggle'); if (adminView.classList.contains('active')) { adminView.classList.remove('active'); floatingBtn.style.display = 'flex'; } else { adminView.classList.add('active'); floatingBtn.style.display = 'flex'; } }
function showAdminSection(id, btn) { document.querySelectorAll('.admin-section').forEach(e => e.classList.remove('active')); document.getElementById(id).classList.add('active'); document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderAdminLists(); }

/* ================= DATA LOADING ================= */
function subscribeToData() { 
    if (db) { 
        subscribeGlobal();
    } else { 
        // Load local mock data if no DB
        newsData = JSON.parse(localStorage.getItem('cn_news')) || defaultNews; 
        rulesData = JSON.parse(localStorage.getItem('cn_rules')) || defaultRules; 
        coinsData = JSON.parse(localStorage.getItem('cn_coins')) || defaultCoins; 
        catalogData = JSON.parse(localStorage.getItem('cn_catalog')) || defaultCatalog; 
        requestsData = JSON.parse(localStorage.getItem('cn_requests')) || []; 
        queueData = JSON.parse(localStorage.getItem('cn_queue')) || []; 
        leaderboardData = JSON.parse(localStorage.getItem('cn_leaderboard')) || mockLeaderboard; 
        jamsData = JSON.parse(localStorage.getItem('cn_jams')) || []; 
        jamSubmissions = JSON.parse(localStorage.getItem('cn_jam_subs')) || [];
        gamesData = JSON.parse(localStorage.getItem('cn_games')) || [];
        challengesData = JSON.parse(localStorage.getItem('cn_challenges')) || []; 
        const storedFilaments = JSON.parse(localStorage.getItem('cn_filaments')); 
        if(storedFilaments) filamentData = storedFilaments; 
        refreshAll(); 
    } 
}

function subscribeGlobal() {
    if (!db) return;
    if(!listeners.news) {
        listeners.news = db.collection("news").orderBy("createdAt", "desc").limit(20).onSnapshot(snap => { 
            newsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderNews(); if(currentUser?.isAdmin) renderAdminNews();
        });
    }
    db.collection("settings").doc("filaments").onSnapshot(doc => { if(doc.exists) { filamentData = doc.data().colors || DEFAULT_FILAMENTS; } });
    db.collection("rules").orderBy("createdAt", "asc").onSnapshot(snap => { rulesData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderRules(); if(currentUser?.isAdmin) renderAdminRules(); });
    db.collection("coins").onSnapshot(snap => { coinsData = snap.docs.map(d => ({id: d.id, ...d.data()})); coinsData.sort((a, b) => (a.order || 0) - (b.order || 0)); renderCoins(); if(currentUser?.isAdmin) renderAdminCoins(); });
    // Jams & Games are loaded globally in this version for simplicity
    db.collection("jams").onSnapshot(snap => { jamsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderJams(); renderAdminJamsList(); });
    db.collection("jamSubmissions").onSnapshot(snap => { jamSubmissions = snap.docs.map(d => ({id: d.id, ...d.data()})); });
    db.collection("games").onSnapshot(snap => { gamesData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderGames(); renderAdminGames(); });
    db.collection("challenges").onSnapshot(snap => { challengesData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderChallenges(); renderAdminChallenges(); });
    
    // Initial Load of other tabs
    loadLeaderboard();
}

function loadCatalog() {
    if (!db || listeners.catalog) return;
    listeners.catalog = db.collection("catalog").onSnapshot(snap => { catalogData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderCatalog(); if(currentUser?.isAdmin) renderAdminCatalog(); });
    if(currentUser?.isAdmin) {
        db.collection("requests").orderBy("createdAt", "desc").limit(50).onSnapshot(snap => { requestsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderAdminRequests(); });
    }
}

function loadQueue() {
    if (!db || listeners.queue) return;
    listeners.queue = db.collection("queue").where("status", "!=", "Picked Up").orderBy("status", "asc").onSnapshot(snap => { queueData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderQueue(); if(currentUser?.isAdmin) renderAdminQueue(); });
}

function loadLeaderboard() {
    if (!db || listeners.leaderboard) return;
    listeners.leaderboard = db.collection("leaderboard").onSnapshot(snap => { leaderboardData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderLeaderboard(); if(currentUser?.isAdmin) renderAdminLbPreview(); });
}

function loadJams() { /* Jams loaded in subscribeGlobal */ }
function loadGames() { /* Games loaded in subscribeGlobal */ }

function refreshAll() { 
    renderNews(); renderJams(); renderGames(); renderRules(); renderCoins(); 
    renderCatalog(); renderQueue(); renderLeaderboard(); renderAdminLists(); 
}

/* ================= STARTUP ================= */
window.onload = function() { 
    console.log("Window loaded. Initializing...");
    const storedVer = localStorage.getItem('cn_app_version'); 
    const msgEl = document.getElementById('login-version-msg'); 
    if (storedVer !== APP_VERSION) { 
        if(msgEl) { msgEl.innerText = `🚀 Update Detected! Welcome to v${APP_VERSION}`; msgEl.style.display = 'block'; } 
        localStorage.setItem('cn_app_version', APP_VERSION); 
    } else { if(msgEl) msgEl.style.display = 'none'; } 
    
    try { 
        if (typeof firebase !== 'undefined') { 
            firebase.initializeApp(firebaseConfig); 
            db = firebase.firestore(); 
            auth = firebase.auth(); 
            console.log("Firebase Initialized"); 
        } 
    } catch (e) { console.log("Demo Mode (No Firebase):", e); } 
    
    const savedUser = localStorage.getItem('cn_user'); 
    if (savedUser) { 
        try { currentUser = JSON.parse(savedUser); enterDashboard(); } 
        catch (e) { console.error("Error parsing user", e); localStorage.removeItem('cn_user'); } 
    } else { 
        document.getElementById('login-view').style.display = 'flex'; 
        document.getElementById('main-app').style.display = 'none'; 
    } 
    subscribeToData(); 
};

/* ================= REQUEST MODAL LOGIC ================= */

function initRequest(id) {
    if (!currentUser) { showAlert("Login Required", "Please log in to make requests."); return; }
    
    // Find item
    const item = catalogData.find(i => i.id === id);
    if (!item) return;

    currentRequestItem = item;
    selectedVariantIdx = 0; // Reset variant selection

    // Get Modal Elements
    const modal = document.getElementById('req-modal');
    const imgContainer = document.getElementById('req-img-container');
    const gallery = document.getElementById('req-gallery');
    const nameField = document.getElementById('req-item-name');
    const ninjaField = document.getElementById('req-ninja-name');
    const dynFields = document.getElementById('req-dynamic-fields');
    const submitBtn = modal.querySelector('.btn-blue');

    // Pre-fill Basic Info
    nameField.innerText = item.name;
    ninjaField.value = currentUser.name; 
    gallery.innerHTML = ''; 
    dynFields.innerHTML = ''; 
    
    // Setup Main Image
    let mainImg = item.image || '';
    if (item.category === 'premium' && item.variations && item.variations.length > 0) {
        mainImg = item.variations[0].image || item.image;
    }
    
    if (mainImg) {
        imgContainer.innerHTML = `<img src="${mainImg}" style="width:100%; height:100%; object-fit:contain;">`;
    } else {
        imgContainer.innerHTML = `<i class="fa-solid fa-cube" style="font-size:4rem; color:#333;"></i>`;
    }

    // --- HELPER: BUILD COLOR OPTIONS ---
    let colorOptionsHtml = '<option value="Default/No Preference">-- Select a Color (Optional) --</option>';
    if (typeof filamentData !== 'undefined' && Array.isArray(filamentData)) {
        filamentData.forEach(c => {
            colorOptionsHtml += `<option value="${c}">${c}</option>`;
        });
    }

    // --- HELPER: FEE TEXT ---
    // Only generate the warning if there is actually a fee > 0
    const feeVal = parseInt(item.colorFee) || 0;
    let feeWarningHtml = '';
    
    if (feeVal > 0) {
        feeWarningHtml = `
            <div style="background:rgba(231, 76, 60, 0.2); border:1px solid #e74c3c; padding:10px; margin-top:10px; border-radius:5px; color:#ffcccc; font-size:0.85rem; text-align:center;">
                <i class="fa-solid fa-triangle-exclamation"></i> <strong>Note:</strong> Custom colors require an extra <strong>${feeVal} Gold Coin</strong> fee!
            </div>`;
    }

    // --- LOGIC PER CATEGORY ---

    // 1. STANDARD / LIMITED (Interest Tracker)
    if (item.category === 'standard' || item.category === 'limited') {
        submitBtn.innerText = "I'm Interested!";
        submitBtn.onclick = submitInterest;
        submitBtn.style.background = "var(--color-queue)";
        
        dynFields.innerHTML = `
            <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px; text-align:center;">
                <p style="color:white; margin-top:0;">Vote for this item!</p>
                <p style="color:#aaa; font-size:0.85rem;">If enough Ninjas request this, Sensei will add it to the print queue.</p>
            </div>
        `;
    } 
    // 2. CUSTOM (URL & Name Input & Color Dropdown)
    else if (item.category === 'custom') {
        submitBtn.innerText = "Submit Print Request";
        submitBtn.onclick = submitRequest;
        submitBtn.style.background = "var(--color-catalog)";

        dynFields.innerHTML = `
            <label class="req-label">Model Name (e.g. Spongebob Flexi):</label>
            <input type="text" id="req-custom-name" class="req-input" placeholder="Enter the name of the object...">
            
            <label class="req-label">Model URL (Thingiverse/Printables):</label>
            <input type="text" id="req-custom-url" class="req-input" placeholder="Paste the link here...">
            
            <label class="req-label">Color Preference:</label>
            <select id="req-custom-color" class="req-input">${colorOptionsHtml}</select>

            ${feeWarningHtml}
        `;
    } 
    // 3. PREMIUM (Variants & Color Dropdown)
    else if (item.category === 'premium') {
        submitBtn.innerText = "Request Print";
        submitBtn.onclick = submitRequest;
        submitBtn.style.background = "var(--color-catalog)";
        
        // Variant Thumbnails
        if (item.variations && item.variations.length > 0) {
            item.variations.forEach((v, idx) => {
                const active = idx === 0 ? 'active' : '';
                gallery.innerHTML += `<div class="req-thumb ${active}" onclick="selectVariant(${idx}, '${v.image}')"><img src="${v.image}"></div>`;
            });
            dynFields.innerHTML += `<p id="selected-variant-name" style="color:var(--color-catalog); text-align:center; font-weight:bold; margin-bottom:15px;">Selected: ${item.variations[0].name}</p>`;
        } else {
             dynFields.innerHTML += `<p style="color:#aaa; margin-bottom:15px;">Standard ${item.name}</p>`;
        }

        // Color Selector for Premium
        dynFields.innerHTML += `
            <label class="req-label">Color Preference (Optional):</label>
            <select id="req-custom-color" class="req-input">${colorOptionsHtml}</select>

            ${feeWarningHtml}
        `;
    }

    modal.style.display = 'flex';
}

function submitInterest() {
    if (!currentRequestItem) return;
    const newInterest = (currentRequestItem.interest || 0) + 1;
    if (db) {
        db.collection("catalog").doc(currentRequestItem.id).update({ interest: newInterest });
    } else {
        currentRequestItem.interest = newInterest;
        saveLocal('cn_catalog', catalogData);
        if(typeof renderCatalog === 'function') renderCatalog();
        if(typeof renderAdminInterest === 'function') renderAdminInterest();
    }
    closeReqModal();
    showAlert("Interest Recorded", "Thanks for your vote! Sensei will print more soon if there is enough interest.");
}

function submitRequest() {
    if (!currentUser || !currentRequestItem) return;
    
    const ninjaName = document.getElementById('req-ninja-name').value || currentUser.name;
    
    let requestData = {
        userId: currentUser.username || currentUser.name,
        name: ninjaName,
        createdAt: Date.now(),
        status: "Waiting for Payment"
    };

    // Helper to get color if it exists in DOM
    const colorSelect = document.getElementById('req-custom-color');
    const selectedColor = (colorSelect && colorSelect.value !== "Default/No Preference") ? colorSelect.value : null;

    // CUSTOM
    if (currentRequestItem.category === 'custom') {
        const url = document.getElementById('req-custom-url').value;
        const modelName = document.getElementById('req-custom-name').value;
        
        if (!url || !modelName) { 
            alert("Please provide both the Name and URL."); 
            return; 
        }
        
        requestData.item = modelName; 
        requestData.details = `URL: ${url}`;
        if(selectedColor) requestData.details += ` | Color: ${selectedColor}`;
        requestData.cost = "Custom Fee"; 
    } 
    // PREMIUM / STANDARD
    else {
        let variantName = currentRequestItem.name;
        let variantImg = currentRequestItem.image;
        
        if (currentRequestItem.category === 'premium' && currentRequestItem.variations && currentRequestItem.variations.length > 0) {
            const v = currentRequestItem.variations[selectedVariantIdx];
            variantName = `${currentRequestItem.name} (${v.name})`;
            variantImg = v.image;
        }
        
        requestData.item = variantName;
        requestData.details = currentRequestItem.category === 'premium' ? "Premium Print" : "Standard Request";
        if(selectedColor) requestData.details += ` | Color: ${selectedColor}`;
        
        requestData.image = variantImg;
        requestData.cost = currentRequestItem.cost;
    }

    if (db) {
        db.collection("requests").add(requestData);
    } else {
        requestsData.push({id: "local_req_"+Date.now(), ...requestData});
        saveLocal('cn_requests', requestsData);
        if(typeof renderAdminRequests === 'function') renderAdminRequests();
    }

    closeReqModal();
    showAlert("Request Sent", "Your request has been submitted to Sensei!");
}

function selectVariant(idx, imgUrl) {
    selectedVariantIdx = idx;
    
    // Update main image
    const imgContainer = document.getElementById('req-img-container');
    if(imgUrl) {
        imgContainer.innerHTML = `<img src="${imgUrl}" style="width:100%; height:100%; object-fit:contain;">`;
    }
    
    // Update thumbnails UI
    document.querySelectorAll('.req-thumb').forEach((el, i) => {
        if (i === idx) el.classList.add('active');
        else el.classList.remove('active');
    });
    
    // Update text label
    if (currentRequestItem && currentRequestItem.variations && currentRequestItem.variations[idx]) {
        const v = currentRequestItem.variations[idx];
        const label = document.getElementById('selected-variant-name');
        if(label) label.innerText = `Selected: ${v.name}`;
    }
}

function closeReqModal() {
    document.getElementById('req-modal').style.display = 'none';
}