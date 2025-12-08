console.log("DASHBOARD SCRIPT STARTING...");

/**
 * CODE NINJAS DASHBOARD LOGIC
 * v8.0 - Optimized Firebase Reads & Performance
 */

/* ==========================================================================
   1. CONFIGURATION & STATE
   ========================================================================== */
const APP_VERSION = "8.0";

const firebaseConfig = {
  apiKey: "AIzaSyAElu-JLX7yAJJ4vEnR4SMZGn0zf93KvCQ",
  authDomain: "codeninjas-dashboard.firebaseapp.com",
  projectId: "codeninjas-dashboard",
  storageBucket: "codeninjas-dashboard.firebasestorage.app",
  messagingSenderId: "71590347120",
  appId: "1:71590347120:web:5f53a55cd7ffc280fd8fb5"
};

const GITHUB_REPO_URL = "https://github.com/YOUR_USERNAME/YOUR_REPO_NAME"; 

const DEFAULT_FILAMENTS = [
    "Jade White", "Light Gray", "Orange", "Sunflower Yellow", "Mistletoe Green", "Cocoa Brown", 
    "Red", "Cyan", "Cobalt Blue", "Purple", "Blue Grey", "Hot Pink", "Black",
    "Matte Ivory White", "Matte Lilac Purple", "Matte Mandarin Orange", "Matte Plum", 
    "Matte Dark Red", "Matte Grass Green", "Matte Dark Blue", "Matte Ash Gray", "Matte Charcoal",
    "Glow in Dark Blue", "Translucent Red", "Silk Blue Hawaii", "Wood Black Walnut", 
    "Metal Iridium Gold", "Metal Copper Brown", "Metal Iron Gray", "Silk+ Gold", 
    "PETG Translucent Clear", "Flashforge Burnt Titanium", "Rock PLA Mars Red", 
    "Elegoo Burgundy Red", "PLA-CF Burgundy Red", "Polylite PETG Gray"
];

// State Variables
let db = null;
let auth = null;
let currentUser = null;

// Data Stores
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
let filamentData = DEFAULT_FILAMENTS;

// UI State
let currentTier = 'tier1';
let currentRequestItem = null;
let editingCatId = null;
let editingId = null;
let editingNinjaId = null;
let editingJamId = null;
let editingChallengeId = null;
let currentJamSubmissionId = null;
let showHistory = false;
let historyLoaded = false; // New optimization flag
let clickCount = 0;
let clickTimer;
let selectedVariantIdx = 0;
let carouselIndex = 0;

// Listener Trackers (For Optimization)
let listeners = {
    news: null,
    jams: null,
    games: null,
    catalog: null,
    queue: null,
    leaderboard: null,
    challenges: null
};

// Default Mock Data
const defaultNews = [{ id: "n1", title: "Minecraft Night", date: "Nov 22", badge: "SOON" }];
const defaultRules = [{ id: "r1", title: "General", desc: "Respect the Dojo equipment.", penalty: "-1 Coin" }];
const defaultCoins = [{ id: "c1", task: "Wear Uniform", val: "+1", type: "silver" }];
const defaultCatalog = [{ id: "cat1", name: "Star", cost: "50", tier: "tier1", category: "standard", icon: "fa-star", visible: true }];
const mockLeaderboard = [{ id: "l1", name: "Asher C.", points: 1250, belt: "Blue", username: "asher.cullin" }];


/* ==========================================================================
   2. HELPER FUNCTIONS
   ========================================================================== */
function formatName(name) {
    if (!name) return 'Ninja';
    if (name.includes('.') && name.split(' ').length === 2 && name.split(' ')[1].length === 2) return name;
    const clean = name.replace(/\./g, ' '); 
    const parts = clean.split(' ').filter(p => p.length > 0);
    if (parts.length === 0) return 'Ninja';
    const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    let lastInitial = "";
    if (parts.length > 1) { lastInitial = " " + parts[parts.length - 1].charAt(0).toUpperCase() + "."; }
    return first + lastInitial;
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

function parseMarkdown(text, customColor) {
    if(!text) return "";
    const color = customColor || '#f1c40f';
    return text.replace(/\*\*(.*?)\*\*/g, `<span style="color:${color}; font-weight:900; text-shadow:0 0 10px ${color}80;">$1</span>`);
}

function getChallengeIcon(type) {
    switch(type) {
        case 'MakeCode Arcade': return 'fa-gamepad';
        case 'Roblox': return 'fa-vector-square';
        case 'Minecraft': return 'fa-cubes';
        case 'Robotics': return 'fa-robot';
        case '3D Printing': return 'fa-print';
        default: return 'fa-bolt';
    }
}

function formatCostDisplay(costVal) {
    const cost = parseInt(costVal) || 0;
    if (cost === 0) return "Free";
    if (cost % 5 === 0) { return `<span style="color:var(--coin-obsidian); font-weight:bold;">${cost/5} Obsidian Coin${cost/5 > 1 ? 's' : ''}</span>`; }
    if (cost > 5) { const obs = Math.floor(cost / 5); const gold = cost % 5; return `<span style="color:var(--coin-obsidian); font-weight:bold;">${obs} Obsidian</span> <span style="color:var(--coin-gold); font-weight:bold;">${gold} Gold</span>`; }
    return `<span style="color:var(--coin-gold); font-weight:bold;">${cost} Gold Coin${cost > 1 ? 's' : ''}</span>`;
}

function formatCoinBreakdown(valStr) {
    if(!valStr) return '';
    if(valStr.includes('-')) return `<span class="coin-val" style="color:#e74c3c; border-color:#e74c3c;">${valStr}</span>`;
    const num = parseInt(valStr.replace(/\D/g, '')) || 0;
    if(num === 0) return `<span class="coin-val silver">0</span>`;
    let html = '';
    const obsVal = Math.floor(num / 25);
    let rem = num % 25;
    const goldVal = Math.floor(rem / 5);
    const silverVal = rem % 5;
    if(obsVal > 0) html += `<span class="coin-val obsidian" style="margin-right:4px;">${obsVal}</span>`;
    if(goldVal > 0) html += `<span class="coin-val gold" style="margin-right:4px;">${goldVal}</span>`;
    if(silverVal > 0) html += `<span class="coin-val silver" style="margin-right:4px;">${silverVal}</span>`;
    return html;
}

function getBeltColor(belt) { const b = (belt || 'white').toLowerCase(); if(b.includes('jr')) return 'var(--belt-white)'; const map = { 'white': 'var(--belt-white)', 'yellow': 'var(--belt-yellow)', 'orange': 'var(--belt-orange)', 'green': 'var(--belt-green)', 'blue': 'var(--belt-blue)', 'purple': 'var(--belt-purple)', 'brown': 'var(--belt-brown)', 'red': 'var(--belt-red)', 'black': 'var(--belt-black)' }; return map[b] || 'var(--belt-white)'; }
function getIconClass(belt) { const b = (belt||'white').toLowerCase(); if(b.includes('robot')) return 'fa-robot'; if(b.includes('ai')) return 'fa-microchip'; if(b.includes('jr')) return 'fa-child'; return 'fa-user-ninja'; }
function saveLocal(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function showAlert(t, m) { document.getElementById('alert-title').innerText = t; document.getElementById('alert-msg').innerText = m; document.getElementById('alert-modal').style.display = 'flex'; }
function showConfirm(m, cb) { document.getElementById('confirm-msg').innerText = m; const b = document.getElementById('confirm-yes-btn'); const n = b.cloneNode(true); b.parentNode.replaceChild(n, b); n.onclick = () => { document.getElementById('confirm-modal').style.display = 'none'; cb(); }; document.getElementById('confirm-modal').style.display = 'flex'; }


/* ==========================================================================
   3. AUTHENTICATION & INITIALIZATION
   ========================================================================== */
function toggleAdminLogin() { const n = document.getElementById('ninja-login-form'); const a = document.getElementById('admin-login-form'); if(n.style.display === 'none') { n.style.display = 'block'; a.style.display = 'none'; } else { n.style.display = 'none'; a.style.display = 'block'; document.getElementById('admin-pass').focus(); } }
function attemptNinjaLogin() { const input = document.getElementById('login-username').value.trim().toLowerCase(); if(!input) return; const u = leaderboardData.find(l => (l.username && l.username.toLowerCase() === input) || (!l.username && l.name.toLowerCase() === input)); if(u){ currentUser = u; localStorage.setItem('cn_user', JSON.stringify(u)); enterDashboard(); } else { document.getElementById('login-error-msg').style.display = 'block'; document.getElementById('login-error-msg').innerText = 'User not found. Try username (e.g. kane.leung)'; } }
function attemptAdminLogin() { const e = document.getElementById('admin-email').value; const p = document.getElementById('admin-pass').value; if(p === "@2633Ninjas") { loginAsAdmin(); return; } if(auth) { auth.signInWithEmailAndPassword(e, p).then(() => loginAsAdmin()).catch(err => { document.getElementById('login-error-msg').style.display = 'block'; document.getElementById('login-error-msg').innerText = 'Access Denied.'; }); } else { document.getElementById('login-error-msg').style.display = 'block'; document.getElementById('login-error-msg').innerText = 'Access Denied (Offline).'; } }
function logout() { localStorage.removeItem('cn_user'); currentUser = null; if(auth) auth.signOut(); location.reload(); }

function loginAsAdmin() { 
    currentUser = { name: "Sensei", isAdmin: true }; 
    localStorage.setItem('cn_user', JSON.stringify(currentUser)); 
    enterDashboard(); 
    document.getElementById('admin-view').classList.add('active'); 
    // Optimization: Admin needs everything
    if(db) { loadCatalog(); loadQueue(); loadLeaderboard(); loadJams(); loadGames(); }
}

function enterDashboard() { document.getElementById('login-view').style.display = 'none'; document.getElementById('main-app').style.display = 'flex'; if(currentUser && currentUser.name) document.getElementById('current-user-name').innerText = currentUser.name.split(' ')[0]; if(currentUser && currentUser.isAdmin) document.getElementById('floating-admin-toggle').style.display = 'flex'; else document.getElementById('floating-admin-toggle').style.display = 'none'; refreshAll(); }
function toggleAdminViewMode() { const adminView = document.getElementById('admin-view'); const floatingBtn = document.getElementById('floating-admin-toggle'); if (adminView.classList.contains('active')) { adminView.classList.remove('active'); floatingBtn.style.display = 'flex'; } else { adminView.classList.add('active'); floatingBtn.style.display = 'flex'; } }
function showAdminSection(id, btn) { document.querySelectorAll('.admin-section').forEach(e => e.classList.remove('active')); document.getElementById(id).classList.add('active'); document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderAdminLists(); }
function handleLogoClick() { if(window.innerWidth < 768) return; clickCount++; clearTimeout(clickTimer); clickTimer = setTimeout(() => { clickCount = 0; }, 2000); if(clickCount === 3) { clickCount = 0; toggleAdminLogin(); } }

// --- TAB SWITCHING (With Lazy Loading) ---
function showTab(id, el) { 
    document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active')); 
    document.getElementById(id).classList.add('active'); 
    document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); 
    el.classList.add('active'); 
    
    // Optimization: Only load data when user visits the tab
    if (db) {
        if (id === 'catalog') loadCatalog();
        else if (id === 'queue') loadQueue();
        else if (id === 'leaderboard') loadLeaderboard();
        else if (id === 'jams') loadJams();
        else if (id === 'games') loadGames();
    }
}


/* ==========================================================================
   4. DATA LOADING & SUBSCRIPTIONS (OPTIMIZED)
   ========================================================================== */

function subscribeGlobal() {
    if (!db) return;
    // News - Limit 20
    if(!listeners.news) {
        listeners.news = db.collection("news").orderBy("createdAt", "desc").limit(20).onSnapshot(snap => { 
            newsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderNews(); if(currentUser?.isAdmin) renderAdminNews();
        });
    }
    // Settings
    db.collection("settings").doc("filaments").onSnapshot(doc => { if(doc.exists) { filamentData = doc.data().colors || DEFAULT_FILAMENTS; } });
    // Rules & Coins
    db.collection("rules").orderBy("createdAt", "asc").onSnapshot(snap => { rulesData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderRules(); if(currentUser?.isAdmin) renderAdminRules(); });
    db.collection("coins").onSnapshot(snap => { coinsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderCoins(); if(currentUser?.isAdmin) renderAdminCoins(); });
}

function loadCatalog() {
    if (!db || listeners.catalog) return;
    listeners.catalog = db.collection("catalog").onSnapshot(snap => { catalogData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderCatalog(); if(currentUser?.isAdmin) renderAdminCatalog(); });
    // If admin, load requests too
    if(currentUser?.isAdmin) {
        db.collection("requests").orderBy("createdAt", "desc").limit(50).onSnapshot(snap => { requestsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderAdminRequests(); });
    }
}

function loadQueue() {
    if (!db || listeners.queue) return;
    // Optimization: Only fetch active items. Ignore "Picked Up".
    listeners.queue = db.collection("queue").where("status", "!=", "Picked Up").orderBy("status", "asc").onSnapshot(snap => { queueData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderQueue(); if(currentUser?.isAdmin) renderAdminQueue(); });
}

function loadLeaderboard() {
    if (!db || listeners.leaderboard) return;
    listeners.leaderboard = db.collection("leaderboard").onSnapshot(snap => { leaderboardData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderLeaderboard(); if(currentUser?.isAdmin) renderAdminLbPreview(); });
}

function loadJams() {
    if (!db || listeners.jams) return;
    listeners.jams = db.collection("jams").onSnapshot(snap => { jamsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderJams(); if(currentUser?.isAdmin) renderAdminJamsList(); });
    db.collection("jamSubmissions").orderBy("createdAt", "desc").onSnapshot(snap => { jamSubmissions = snap.docs.map(d => ({id: d.id, ...d.data()})); });
}

function loadGames() {
    if (!db || listeners.games) return;
    listeners.games = db.collection("games").onSnapshot(snap => { gamesData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderGames(); if(currentUser?.isAdmin) renderAdminGames(); });
    if (!listeners.challenges) {
        listeners.challenges = db.collection("challenges").onSnapshot(snap => { challengesData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderChallenges(); if(currentUser?.isAdmin) renderAdminChallenges(); });
    }
}


/* ==========================================================================
   5. RENDERERS
   ========================================================================== */
function renderNews() { const c = document.getElementById('news-feed'); if(!c) return; c.innerHTML=''; newsData.forEach(i => c.innerHTML+=`<div class="list-card passed"><div class="card-info"><h3>${i.title}</h3><p>${i.date}</p></div><div class="status-badge" style="color:var(--color-games)">${i.badge} ></div></div>`); }
function renderRules() { const c = document.getElementById('rules-feed'); if(!c) return; c.innerHTML=''; const groups = {}; rulesData.forEach(r => { const cat = r.title || 'General'; if(!groups[cat]) groups[cat] = []; groups[cat].push(r); }); for (const [category, items] of Object.entries(groups)) { c.innerHTML += `<h3 class="rules-group-header">${category}</h3>`; let gridHtml = `<div class="rules-group-grid">`; items.forEach(r => { const b = r.penalty ? `<div class="status-badge" style="color:#e74c3c;border:1px solid #e74c3c;">${r.penalty}</div>` : ''; gridHtml += `<div class="list-card pending" style="margin:0;"><div class="card-info"><h3>${r.desc}</h3></div>${b}</div>`; }); gridHtml += `</div>`; c.innerHTML += gridHtml; } }
function renderCoins() { const c = document.getElementById('coin-feed'); if(!c) return; c.innerHTML=''; coinsData.forEach(i => c.innerHTML+=`<li class="coin-item"><span>${i.task}</span><div>${formatCoinBreakdown(i.val)}</div></li>`); }
function filterCatalog(tier, btn) { currentTier = tier; document.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('active')); if(btn) btn.classList.add('active'); renderCatalog(); }
function renderCatalog() { const c = document.getElementById('catalog-feed'); if(!c) return; c.innerHTML=''; if(!currentTier) currentTier = 'tier1'; const f = catalogData.filter(i => i.tier === currentTier && i.visible !== false); if(f.length === 0) c.innerHTML = '<p style="color:#666">No items available in this tier.</p>'; else f.forEach(i => { let img = i.image && i.image.length > 5 ? `<img src="${i.image}">` : `<i class="fa-solid ${i.icon || 'fa-cube'}"></i>`; let btnText = "Request"; let btnAction = `onclick="initRequest('${i.id}')"`; let catBadge = ''; let specialClass = ''; if(i.category === 'custom') { btnText = "Custom Print"; catBadge = `<span style="font-size:0.6rem; color:var(--color-jams); border:1px solid var(--color-jams); padding:2px 4px; border-radius:3px; margin-left:5px;">CUSTOM</span>`; } else if(i.category === 'premium') { btnText = "View Options"; catBadge = `<span style="font-size:0.6rem; color:var(--color-catalog); border:1px solid var(--color-catalog); padding:2px 4px; border-radius:3px; margin-left:5px;">PREMIUM</span>`; } else if(i.category === 'limited') { btnText = "Get It Now!"; catBadge = `<span class="badge-limited">LIMITED</span>`; specialClass = 'limited-card'; } c.innerHTML += `<div class="store-card ${specialClass}"><div class="store-icon-circle">${img}</div><div class="store-info"><h4>${i.name} ${catBadge}</h4><p>${formatCostDisplay(i.cost)}</p><div style="font-size:0.75rem; color:#888; margin-top:4px; line-height:1.2;">${i.desc || ''}</div></div><div class="store-action"><button class="btn-req" ${btnAction}>${btnText}</button></div></div>`; }); }
function renderQueue() { const c = document.getElementById('queue-list'); if(!c) return; c.innerHTML=''; let q = !showHistory ? queueData.filter(i => i.status.toLowerCase() !== 'picked up') : [...queueData].sort((a,b) => b.createdAt - a.createdAt); if(q.length === 0) c.innerHTML = '<p style="color:#666;text-align:center;">Empty.</p>'; else q.forEach((i,x) => { let s = i.status, cl = 'status-pending', icon = 'fa-clock', cc = 'queue-card'; const sLow = s.toLowerCase(); if(sLow.includes('ready')){ cl='status-ready'; icon='fa-check'; cc+=' ready-pickup'; } else if(sLow.includes('printing')){ cl='status-printing printing-anim'; icon='fa-print'; } else if(sLow.includes('waiting')){ cl='status-waiting-print'; icon='fa-hourglass'; } else if(sLow.includes('payment')){ cl='status-waiting-payment'; icon='fa-circle-dollar-to-slot'; } else if(sLow.includes('pending')){ cl='status-pending'; icon='fa-clock'; } const detHtml = i.details ? `<span style="opacity:0.6">| ${i.details}</span>` : ''; c.innerHTML += `<div class="${cc}"><div class="q-left"><div class="q-number">${x+1}</div><div class="q-info"><h3>${formatName(i.name)}</h3><p>${i.item} ${detHtml}</p></div></div><div class="q-status ${cl}">${s} <i class="fa-solid ${icon}"></i></div></div>`; }); }
function renderLeaderboard() { const p = document.getElementById('lb-podium'); const l = document.getElementById('lb-list'); if(!p || !l) return; p.innerHTML = ''; l.innerHTML = ''; const s = [...leaderboardData].sort((a,b) => b.points - a.points); const v = []; if(s[1]) v.push({...s[1], rank: 2}); if(s[0]) v.push({...s[0], rank: 1}); if(s[2]) v.push({...s[2], rank: 3}); v.forEach(i => p.innerHTML += `<div class="lb-card rank-${i.rank}"><div class="lb-badge">${i.rank}</div><div class="lb-icon" style="border-color:${getBeltColor(i.belt)}"><i class="fa-solid ${getIconClass(i.belt)}" style="color:${getBeltColor(i.belt)}"></i></div><div class="lb-name">${formatName(i.name)}</div><div class="lb-points">${i.points} pts</div></div>`); s.slice(3).forEach((i,x) => l.innerHTML += `<div class="lb-row"><div class="lb-row-rank">#${x+4}</div><div class="lb-row-belt" style="border-color:${getBeltColor(i.belt)}"><i class="fa-solid ${getIconClass(i.belt)}" style="color:${getBeltColor(i.belt)}"></i></div><div class="lb-row-name">${formatName(i.name)}</div><div class="lb-row-points">${i.points}</div></div>`); renderAdminLbPreview(); }
function renderChallenges() { const c = document.getElementById('challenges-feed'); if (!c) return; c.innerHTML = ''; if (challengesData.length === 0) { c.innerHTML = '<p style="color:#666; font-size:0.9rem; padding:10px;">No active challenges.</p>'; return; } challengesData.forEach(item => { const icon = getChallengeIcon(item.type); const duration = item.duration ? item.duration : 'Indefinite'; c.innerHTML += `<div class="challenge-card"><i class="fa-solid ${icon} chal-icon"></i><div class="chal-info"><h4>${item.type}</h4><p>${item.desc}</p><span class="chal-time"><i class="fa-solid fa-clock"></i> ${duration}</span></div><div class="chal-reward">${item.reward}</div></div>`; }); }
function renderGames() { renderChallenges(); const activeGame = gamesData.find(g => g.status === 'active'); const pastGames = gamesData.filter(g => g.status === 'archived').sort((a,b) => b.createdAt - a.createdAt); const heroContainer = document.getElementById('active-game-container'); if (heroContainer) { if(activeGame) { heroContainer.innerHTML = `<div class="game-hero" style="background-image: url('${activeGame.image}');"><div class="game-hero-content"><h1>${activeGame.title}</h1><p>${activeGame.desc}</p></div></div>`; } else { heroContainer.innerHTML = `<div class="game-hero" style="display:flex;align-items:center;justify-content:center;background:#111;"><h2 style="color:#666;">No Game Selected</h2></div>`; } } const lbContainer = document.getElementById('active-game-lb'); if (lbContainer) { if(activeGame && activeGame.scores && activeGame.scores.length > 0) { lbContainer.innerHTML = ''; const sorted = [...activeGame.scores].sort((a,b) => b.score - a.score).slice(0, 10); sorted.forEach((s, i) => { let prizeHtml = ''; const rank = i + 1; if (rank === 1) prizeHtml = `<span class="coin-val gold">3</span>`; else if (rank === 2) prizeHtml = `<span class="coin-val gold">2</span>`; else if (rank === 3) prizeHtml = `<span class="coin-val gold">1</span>`; else if (rank >= 4 && rank <= 6) prizeHtml = `<span class="coin-val silver">4</span>`; else if (rank >= 7 && rank <= 10) prizeHtml = `<span class="coin-val silver">2</span>`; lbContainer.innerHTML += `<div class="game-lb-row"><div class="g-rank">#${rank}</div><div class="g-name">${formatName(s.name)}</div><div class="g-score">${s.score}</div><div class="g-prize">${prizeHtml}</div></div>`; }); } else { lbContainer.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">No scores yet. Be the first!</p>'; } } const historyList = document.getElementById('games-history-list'); if (historyList) { historyList.innerHTML = ''; if(pastGames.length === 0) { historyList.innerHTML = '<p style="color:#666; text-align:center;">No history.</p>'; } else { pastGames.forEach(g => { historyList.innerHTML += `<div class="list-card" style="margin-bottom:10px; padding:15px;"><div class="card-info"><h3 style="font-size:0.9rem;">${g.title}</h3><p style="font-size:0.7rem;">${g.month || 'Archived'}</p></div></div>`; }); } } }
function renderJams() { const track = document.getElementById('jam-carousel-track'); const pastGrid = document.getElementById('past-jams-grid'); if(!track || !pastGrid) return; track.innerHTML = ''; pastGrid.innerHTML = ''; const now = Date.now(); const oneWeek = 7 * 24 * 60 * 60 * 1000; const sixMonths = 180 * 24 * 60 * 60 * 1000; const activeJams = []; const pastJams = []; jamsData.forEach(jam => { const isRevealed = jam.status === 'revealed'; const revealTime = jam.revealedAt || 0; if (jam.status === 'active' || (isRevealed && (now - revealTime < oneWeek))) { activeJams.push(jam); } else if (isRevealed && (now - revealTime < sixMonths)) { pastJams.push(jam); } }); if(activeJams.length === 0) { track.innerHTML = '<div class="jam-slide active" style="display:flex; align-items:center; justify-content:center; background:#111;"><h2 style="color:#666;">No Active Events</h2></div>'; } else { activeJams.forEach((jam, idx) => { const isWinnerMode = jam.status === 'revealed'; const themeColor = jam.color || '#f1c40f'; let winnerHtml = ''; if(isWinnerMode && jam.winners && jam.winners.length > 0) { winnerHtml = `<div class="winner-overlay"><h2 class="winner-title" style="color:${themeColor}; text-shadow:0 0 20px ${themeColor}80;">🎉 WINNERS 🎉</h2><div class="winner-avatars">`; jam.winners.forEach(w => { winnerHtml += `<div class="winner-card" style="border-color:${themeColor}; cursor:pointer;" onclick="viewWinner('${w.id}', event)"><i class="fa-solid fa-gamepad" style="color:${themeColor}; font-size:1.5rem; margin-bottom:5px;"></i><span style="display:block; font-size:1rem; color:white;">${w.gameTitle}</span><span style="display:block; font-size:0.7rem; color:#aaa; font-weight:normal; margin-top:2px;">by ${formatName(w.ninjaName)}</span></div>`; }); winnerHtml += `</div></div>`; } const activeClass = idx === carouselIndex ? 'active' : ''; track.innerHTML += `<div class="jam-slide ${activeClass}" onclick="openJamSubmission('${jam.id}', ${isWinnerMode})"><div class="jam-hero-image" style="background-image: url('${jam.image || ''}');"><div class="jam-top-title" style="text-shadow: 0 0 10px ${themeColor};">${jam.title}</div></div><div class="jam-content-box"><div style="position:absolute; top:-15px; left:50%; transform:translateX(-50%); background:${themeColor}; color:black; font-weight:bold; padding:4px 12px; border-radius:20px; font-size:0.8rem; text-transform:uppercase; box-shadow:0 2px 5px rgba(0,0,0,0.3);">${jam.type || 'Game Jam'} | ${jam.dates}</div><h1 class="jam-header" style="margin-top:10px;">${parseMarkdown(jam.header, themeColor)}</h1><p class="jam-desc">${jam.desc}</p><div class="jam-details" style="color:${themeColor};">${jam.details}</div></div>${winnerHtml}</div>`; }); } if(pastJams.length === 0) { pastGrid.innerHTML = '<p style="color:#666; grid-column:span 2; text-align:center;">No history yet.</p>'; } else { pastJams.forEach(jam => { let topWinnerName = "View Winners"; let winnerAction = ""; if(jam.winners && jam.winners.length > 0) { topWinnerName = jam.winners[0].gameTitle; winnerAction = `onclick="viewWinner('${jam.winners[0].id}', event)"`; } const themeColor = jam.color || '#f1c40f'; pastGrid.innerHTML += `<div class="past-jam-card" ${winnerAction}><div class="pj-img" style="background-image:url('${jam.image}');"></div><div class="pj-info"><h4>${jam.title}</h4><p>Winner: <span style="color:${themeColor}; font-weight:bold;">${topWinnerName}</span></p></div></div>`; }); } }
function moveCarousel(dir) { const slides = document.querySelectorAll('.jam-slide'); if(slides.length < 2) return; slides[carouselIndex].classList.remove('active'); carouselIndex += dir; if(carouselIndex < 0) carouselIndex = slides.length - 1; if(carouselIndex >= slides.length) carouselIndex = 0; slides[carouselIndex].classList.add('active'); }
function viewWinner(submissionId, event) { if(event) event.stopPropagation(); let sub = jamSubmissions.find(s => s.id === submissionId); if(!sub) { jamsData.forEach(j => { if(j.winners) { const found = j.winners.find(w => w.id === submissionId); if(found) sub = found; } }); } if(!sub) return; const jam = jamsData.find(j => j.id === sub.jamId); const color = jam ? (jam.color || '#f1c40f') : '#f1c40f'; document.getElementById('win-game-title').innerText = sub.gameTitle; document.getElementById('win-game-title').style.color = color; document.getElementById('win-ninja').innerText = `Created by ${formatName(sub.ninjaName)}`; const linkBtn = document.getElementById('win-link'); linkBtn.href = sub.link; linkBtn.style.background = color; linkBtn.style.color = (color === '#ffffff' || color === '#f1c40f') ? 'black' : 'white'; document.getElementById('winner-modal').style.display = 'flex'; }
function openJamSubmission(jamId, isWinnerView) { if(isWinnerView) return; if(!currentUser) { showAlert("Log In", "Please log in to submit."); return; } currentJamSubmissionId = jamId; const jam = jamsData.find(j => j.id === jamId); if(!jam) return; document.getElementById('js-title').innerText = jam.title; document.getElementById('js-title').style.color = jam.color || '#f1c40f'; const btn = document.querySelector('#jam-submit-modal .btn-blue'); if(btn) btn.style.background = jam.color || '#f1c40f'; document.getElementById('js-game-title').value = ''; document.getElementById('js-link').value = ''; document.getElementById('jam-submit-modal').style.display = 'flex'; }
function submitJamEntry() { const title = document.getElementById('js-game-title').value; const link = document.getElementById('js-link').value; if(!title || !link) return showAlert("Error", "Title and Link required."); const entry = { jamId: currentJamSubmissionId, ninjaName: currentUser.name, username: currentUser.username || currentUser.name, gameTitle: title, link: link, createdAt: Date.now() }; if(db) { db.collection("jamSubmissions").add(entry); } else { jamSubmissions.push({id:"local_sub_"+Date.now(), ...entry}); saveLocal('cn_jam_subs', jamSubmissions); } document.getElementById('jam-submit-modal').style.display = 'none'; showAlert("Success", "Good luck, Ninja!"); }

// --- ADMIN RENDERERS ---
function renderAdminLists() { renderAdminNews(); renderAdminRules(); renderAdminCoins(); renderAdminCatalog(); renderAdminRequests(); renderAdminQueue(); renderAdminLbPreview(); renderAdminInterest(); renderAdminJamsList(); renderAdminGames(); renderAdminChallenges(); }
function renderAdminNews() { const nList = document.getElementById('admin-news-list'); if(nList){ nList.innerHTML=''; newsData.forEach(n => nList.innerHTML += `<div class="admin-list-wrapper"><div class="list-card passed" style="pointer-events:none; margin:0;"><div class="card-info"><h3>${n.title}</h3><p>${n.date}</p></div><div class="status-badge" style="color:var(--color-games)">${n.badge} ></div></div><button onclick="openNewsModal('${n.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteNews('${n.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div>`); } }
function renderAdminRules() { const rList = document.getElementById('admin-rules-list'); if(rList){ rList.innerHTML=''; rulesData.forEach(r => { const b = r.penalty ? `<div class="status-badge" style="color:#e74c3c;border:1px solid #e74c3c;">${r.penalty}</div>` : ''; rList.innerHTML += `<div class="admin-list-wrapper"><div class="list-card pending" style="pointer-events:none; margin:0;"><div class="card-info"><h3>${r.title}</h3><p>${r.desc}</p></div>${b}</div><button onclick="openRulesModal('${r.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteRule('${r.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div>`; }); } }
function renderAdminCoins() { const cList = document.getElementById('admin-coins-list'); if(cList){ cList.innerHTML=''; coinsData.forEach((c, index) => { const upBtn = index > 0 ? `<button onclick="moveCoin(${index}, -1)" class="btn-arrow">⬆</button>` : '<span class="btn-arrow-placeholder"></span>'; const downBtn = index < coinsData.length - 1 ? `<button onclick="moveCoin(${index}, 1)" class="btn-arrow">⬇</button>` : '<span class="btn-arrow-placeholder"></span>'; cList.innerHTML += `<div class="admin-list-wrapper"><div style="display:flex; flex-direction:column; margin-right:5px;">${upBtn}${downBtn}</div><div style="flex-grow:1;background:#161932;padding:10px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;"><span style="color:white;font-weight:bold;">${c.task}</span><div>${formatCoinBreakdown(c.val)}</div></div><button onclick="openCoinModal('${c.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteCoin('${c.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div>`; }); } }
function renderAdminInterest() { const intList = document.getElementById('admin-interest-list'); if(!intList) return; intList.innerHTML = ''; const st = catalogData.filter(c => (c.category === 'standard' || c.category === 'limited') && (c.interest || 0) > 0); if(st.length === 0) { intList.innerHTML = '<p style="color:#666; width:100%; text-align:center; padding:20px; font-size:0.9rem;">No active interest.</p>'; } else { st.sort((a, b) => b.interest - a.interest); st.forEach(s => { let img = s.image && s.image.length > 5 ? `<img src="${s.image}">` : `<i class="fa-solid ${s.icon}"></i>`; let extraClass = s.category === 'limited' ? 'style="border:1px solid #e74c3c;"' : ''; let namePrefix = s.category === 'limited' ? '<span style="color:#e74c3c;font-size:0.7rem;">[LTD]</span> ' : ''; intList.innerHTML += `<div class="interest-card-square" ${extraClass}><div class="interest-visual">${img}</div><div style="width:100%;"><h4 style="margin:5px 0; color:white; font-size:0.9rem;">${namePrefix}${s.name}</h4><div class="interest-count-badge">${s.interest} Requests</div></div><div style="width:100%;"><button class="interest-reset-btn" onclick="resetInterest('${s.id}')">RESET</button></div></div>`; }); } }
function renderAdminCatalog() { const catList = document.getElementById('admin-cat-list'); if(!catList) return; catList.innerHTML=''; const tiers = ['tier1','tier2','tier3','tier4']; const tierNames = {'tier1':'Tier 1','tier2':'Tier 2','tier3':'Tier 3','tier4':'Tier 4'}; tiers.forEach(t => { catList.innerHTML += `<div class="admin-tier-header">${tierNames[t]}</div>`; let g = `<div class="admin-store-grid">`; catalogData.filter(i => i.tier === t).forEach(i => { let img = i.image && i.image.length > 5 ? `<img src="${i.image}">` : `<i class="fa-solid ${i.icon}"></i>`; let h = i.visible === false ? 'hidden' : ''; let typeBadge = i.category === 'custom' ? 'CUSTOM' : (i.category === 'premium' ? 'PREMIUM' : (i.category === 'limited' ? 'LIMITED' : 'STD')); g += `<div class="admin-store-card ${h}"><div class="admin-store-icon">${img}</div><div style="flex-grow:1;"><h4 style="margin:0;color:white;font-size:0.9rem;">${i.name}</h4><div style="font-size:0.6rem; color:#aaa;">${typeBadge} | ${i.cost} Gold</div></div><div class="admin-store-actions"><button onclick="editCatItem('${i.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteCatItem('${i.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div></div>`; }); g += `</div>`; catList.innerHTML += g; }); }
function renderAdminRequests() { const c = document.getElementById('admin-requests-list'); if(!c) return; c.innerHTML = ''; const pending = requestsData.filter(r => r.status === 'Waiting for Payment'); if(pending.length === 0) { c.innerHTML = '<p style="color:#666; padding:10px;">No incoming payment requests.</p>'; return; } pending.forEach(r => { c.innerHTML += `<div class="req-item"><div style="flex:1;"><div style="color:white; font-weight:bold;">${r.name}</div><div style="color:var(--color-catalog); font-weight:600;">${r.item}</div><div style="color:#888; font-size:0.75rem;">${r.details}</div><div style="color:#aaa; font-size:0.7rem; margin-top:2px;">${new Date(r.createdAt).toLocaleDateString()}</div></div><div class="req-actions"><button onclick="approveRequest('${r.id}')" style="background:#2ecc71; color:black;">PAID</button><button onclick="deleteRequest('${r.id}')" style="background:#e74c3c; color:white;">DEL</button></div></div>`; }); }
function renderAdminQueue() { const qList = document.getElementById('admin-queue-manage-list'); if(!qList) return; qList.innerHTML=''; const activeQ = queueData.filter(q => q.status !== 'Picked Up' && q.status !== 'Waiting for Payment'); activeQ.sort((a,b) => (a.paidAt || a.createdAt) - (b.paidAt || b.createdAt)); activeQ.forEach(q => { const id = q.id ? `'${q.id}'` : `'${queueData.indexOf(q)}'`; const detHtml = q.details ? `| ${q.details}` : ''; qList.innerHTML += `<div class="admin-list-item" style="display:block; margin-bottom:10px; background:#161932; padding:10px; border-radius:6px; border:1px solid #34495e;"><div style="display:flex;justify-content:space-between;"><strong>${q.name}</strong> <span class="status-badge" style="color:white; background:#333;">${q.status}</span></div><div style="color:#aaa;font-size:0.8rem;">${q.item} ${detHtml}</div><div style="margin-top:5px; display:flex; gap:5px;"><button onclick="updateQueueStatus(${id},'Pending')" class="admin-btn" style="width:auto;padding:2px 8px;font-size:0.7rem;background:#555;">Pend</button><button onclick="updateQueueStatus(${id},'Printing')" class="admin-btn" style="width:auto;padding:2px 8px;font-size:0.7rem;background:#9b59b6;">Print</button><button onclick="updateQueueStatus(${id},'Ready!')" class="admin-btn" style="width:auto;padding:2px 8px;font-size:0.7rem;background:#2ecc71;">Ready</button><button onclick="updateQueueStatus(${id},'Picked Up')" class="admin-btn" style="width:auto;padding:2px 8px;font-size:0.7rem;background:#1abc9c;">Done</button></div></div>`; }); }
function renderAdminLbPreview() { const c = document.getElementById('admin-lb-preview-list'); if(!c) return; c.innerHTML = ''; const sorted = [...leaderboardData].sort((a,b) => b.points - a.points); if (sorted.length === 0) { c.innerHTML = '<p style="color:#666; padding:10px;">No ninjas yet.</p>'; return; } sorted.forEach((ninja, index) => { const u = ninja.username ? ` <span style="font-size:0.7rem; color:#aaa;">(${ninja.username})</span>` : ''; c.innerHTML += `<div class="admin-lb-preview-row"><div class="admin-lb-rank">#${index + 1}</div><div class="admin-lb-name">${formatName(ninja.name)}${u}</div><div class="admin-lb-points">${ninja.points}</div></div>`; }); }
function renderAdminChallenges() { const list = document.getElementById('admin-challenges-list'); if(!list) return; list.innerHTML = ''; if(challengesData.length === 0) { list.innerHTML = '<p style="color:#666;">No active challenges.</p>'; return; } challengesData.forEach(c => { const icon = getChallengeIcon(c.type); list.innerHTML += `<div class="admin-list-wrapper"><div class="list-card" style="margin:0; border-left: 4px solid #3498db;"><div class="card-info"><h3><i class="fa-solid ${icon}"></i> ${c.type}</h3><p>${c.desc} (${c.reward})</p></div></div><button onclick="openChallengeModal('${c.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteChallenge('${c.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div>`; }); }
function openChallengeModal(id=null) { editingChallengeId = id; if(id) { const c = challengesData.find(x => x.id === id); document.getElementById('chal-type').value = c.type; document.getElementById('chal-desc').value = c.desc; document.getElementById('chal-reward').value = c.reward; document.getElementById('chal-duration').value = c.duration || ''; } else { document.getElementById('chal-type').value = 'MakeCode Arcade'; document.getElementById('chal-desc').value = ''; document.getElementById('chal-reward').value = ''; document.getElementById('chal-duration').value = ''; } document.getElementById('challenge-admin-modal').style.display = 'flex'; }
function saveChallenge() { const type = document.getElementById('chal-type').value; const desc = document.getElementById('chal-desc').value; const reward = document.getElementById('chal-reward').value; const duration = document.getElementById('chal-duration').value; if(!desc) return showAlert("Error", "Description required"); const data = { type, desc, reward, duration }; if(db) { if(editingChallengeId) db.collection("challenges").doc(editingChallengeId).update(data); else db.collection("challenges").add(data); } else { if(editingChallengeId) { const idx = challengesData.findIndex(c => c.id === editingChallengeId); challengesData[idx] = {...challengesData[idx], ...data}; } else { challengesData.push({id:"local_chal_"+Date.now(), ...data}); } saveLocal('cn_challenges', challengesData); renderChallenges(); renderAdminChallenges(); } document.getElementById('challenge-admin-modal').style.display = 'none'; }
function deleteChallenge(id) { showConfirm("Delete this challenge?", () => { if(db) { db.collection("challenges").doc(id).delete(); } else { challengesData = challengesData.filter(c => c.id !== id); saveLocal('cn_challenges', challengesData); renderChallenges(); renderAdminChallenges(); } }); }
function deleteJam(id) { showConfirm("Delete this Jam?", () => { if(db) { db.collection("jams").doc(id).delete(); } else { jamsData = jamsData.filter(j => j.id !== id); saveLocal('cn_jams', jamsData); renderJams(); renderAdminJamsList(); } }); }
function renderAdminJamsList() { const c = document.getElementById('admin-jams-list'); if(!c) return; c.innerHTML = ''; jamsData.forEach(j => { const color = j.color || '#2ecc71'; c.innerHTML += `<div class="admin-list-wrapper"><div class="list-card" onclick="openAdminJamModal('${j.id}')" style="margin:0; border-left-color:${color}; cursor:pointer; flex-grow:1;"><div class="card-info"><h3>${j.title}</h3><p>${j.dates}</p></div><div class="status-badge" style="color:${color}">${j.status || 'Active'}</div></div><button onclick="deleteJam('${j.id}')" class="btn-mini" style="background:#e74c3c; margin-left:10px;">Del</button></div>`; }); }
function openAdminJamModal(id=null) { editingJamId = id; document.getElementById('jam-submissions-area').style.display = 'none'; if(id) { const j = jamsData.find(x => x.id === id); document.getElementById('jam-modal-header').innerText = "Edit Jam"; document.getElementById('jam-title').value = j.title; document.getElementById('jam-dates').value = j.dates; document.getElementById('jam-type').value = j.type; document.getElementById('jam-image').value = j.image; document.getElementById('jam-header').value = j.header; document.getElementById('jam-desc').value = j.desc; document.getElementById('jam-details').value = j.details; document.getElementById('jam-color').value = j.color || '#f1c40f'; document.getElementById('jam-submissions-area').style.display = 'block'; renderJamSubmissionsList(id, j.winners || []); } else { document.getElementById('jam-modal-header').innerText = "Create Jam"; document.getElementById('jam-title').value = ''; document.getElementById('jam-dates').value = ''; document.getElementById('jam-image').value = ''; document.getElementById('jam-header').value = ''; document.getElementById('jam-desc').value = ''; document.getElementById('jam-details').value = ''; document.getElementById('jam-color').value = '#f1c40f'; } document.getElementById('jam-admin-modal').style.display = 'flex'; }
function saveJam() { const data = { title: document.getElementById('jam-title').value, dates: document.getElementById('jam-dates').value, type: document.getElementById('jam-type').value, image: document.getElementById('jam-image').value, header: document.getElementById('jam-header').value, desc: document.getElementById('jam-desc').value, details: document.getElementById('jam-details').value, color: document.getElementById('jam-color').value, status: 'active' }; if(!data.title) return; if(db) { if(editingJamId) db.collection("jams").doc(editingJamId).update(data); else db.collection("jams").add({...data, createdAt: Date.now()}); } else { if(editingJamId) { const idx = jamsData.findIndex(j=>j.id===editingJamId); jamsData[idx] = {...jamsData[idx], ...data}; } else { jamsData.push({id:"local_jam_"+Date.now(), ...data, createdAt:Date.now()}); } saveLocal('cn_jams', jamsData); renderJams(); renderAdminLists(); } document.getElementById('jam-admin-modal').style.display = 'none'; }
function renderJamSubmissionsList(jamId, currentWinners) { const list = document.getElementById('jam-subs-list'); list.innerHTML = ''; const subs = jamSubmissions.filter(s => s.jamId === jamId); if(subs.length === 0) { list.innerHTML = '<p style="color:#666;">No submissions yet.</p>'; return; } subs.forEach(s => { const isWinner = currentWinners.some(w => w.id === s.id); const check = isWinner ? 'checked' : ''; list.innerHTML += `<div style="display:flex; align-items:center; background:#111; padding:5px; margin-bottom:5px; border-radius:4px;"><input type="checkbox" class="winner-check" value="${s.id}" ${check} style="margin-right:10px;"><div style="flex-grow:1;"><div style="color:white;">${s.ninjaName}</div><div style="color:#888; font-size:0.7rem;">${s.gameTitle}</div></div><a href="${s.link}" target="_blank" style="color:var(--color-jams); font-size:0.8rem;">Link</a></div>`; }); }
function revealWinners() { if(!editingJamId) return; const checkboxes = document.querySelectorAll('.winner-check:checked'); const winnerIds = Array.from(checkboxes).map(c => c.value); const winners = jamSubmissions.filter(s => winnerIds.includes(s.id)); const update = { status: 'revealed', revealedAt: Date.now(), winners: winners }; if(db) { db.collection("jams").doc(editingJamId).update(update).then(() => showAlert("Success", "Winners Revealed!")); } else { const idx = jamsData.findIndex(j=>j.id===editingJamId); jamsData[idx] = {...jamsData[idx], ...update}; saveLocal('cn_jams', jamsData); renderJams(); showAlert("Success", "Winners Revealed (Local)!"); } document.getElementById('jam-admin-modal').style.display = 'none'; }
function renderAdminGames() { const activeGame = gamesData.find(g => g.status === 'active'); if(activeGame) { document.getElementById('ag-title').value = activeGame.title; document.getElementById('ag-image').value = activeGame.image; document.getElementById('ag-desc').value = activeGame.desc; renderAdminGameScores(activeGame); } else { document.getElementById('ag-title').value = ''; document.getElementById('ag-image').value = ''; document.getElementById('ag-desc').value = ''; document.getElementById('admin-game-scores-list').innerHTML = '<p style="color:#666;">No active game. Create one above.</p>'; } }
function saveActiveGame() { const title = document.getElementById('ag-title').value; const image = document.getElementById('ag-image').value; const desc = document.getElementById('ag-desc').value; if(!title) return showAlert("Error", "Title required."); const gameData = { title, image, desc, status: 'active', month: new Date().toLocaleString('default', { month: 'long' }) }; let activeGame = gamesData.find(g => g.status === 'active'); if(db) { if(activeGame) db.collection("games").doc(activeGame.id).update(gameData); else db.collection("games").add({ ...gameData, scores: [], createdAt: Date.now() }); } else { if(activeGame) { const idx = gamesData.indexOf(activeGame); gamesData[idx] = { ...activeGame, ...gameData }; } else { gamesData.push({ id: "local_game_"+Date.now(), ...gameData, scores: [], createdAt: Date.now() }); } saveLocal('cn_games', gamesData); renderGames(); renderAdminGames(); showAlert("Saved", "Game Updated!"); } }
function renderAdminGameScores(game) { const list = document.getElementById('admin-game-scores-list'); list.innerHTML = ''; if(!game.scores || game.scores.length === 0) return; game.scores.sort((a,b) => b.score - a.score).forEach((s, idx) => { list.innerHTML += `<div style="display:flex; justify-content:space-between; background:#111; padding:8px; margin-bottom:5px; border-radius:4px;"><span>${idx+1}. ${s.name} - <strong>${s.score}</strong></span><button onclick="deleteGameScore('${s.name}')" style="background:#e74c3c; border:none; color:white; border-radius:4px; cursor:pointer;">X</button></div>`; }); }
function addGameScore() { const name = document.getElementById('ag-score-name').value; const score = parseInt(document.getElementById('ag-score-val').value); if(!name || isNaN(score)) return; const activeGame = gamesData.find(g => g.status === 'active'); if(!activeGame) return showAlert("Error", "Create a game first."); const newScores = activeGame.scores || []; const filtered = newScores.filter(s => s.name !== name); filtered.push({ name, score }); if(db) { db.collection("games").doc(activeGame.id).update({ scores: filtered }); } else { activeGame.scores = filtered; saveLocal('cn_games', gamesData); renderGames(); renderAdminGames(); } document.getElementById('ag-score-name').value = ''; document.getElementById('ag-score-val').value = ''; }
function deleteGameScore(name) { const activeGame = gamesData.find(g => g.status === 'active'); if(!activeGame) return; const newScores = activeGame.scores.filter(s => s.name !== name); if(db) { db.collection("games").doc(activeGame.id).update({ scores: newScores }); } else { activeGame.scores = newScores; saveLocal('cn_games', gamesData); renderGames(); renderAdminGames(); } }
function archiveActiveGame() { const activeGame = gamesData.find(g => g.status === 'active'); if(!activeGame) return; showConfirm("Archive this game?", () => { if(db) { db.collection("games").doc(activeGame.id).update({ status: 'archived' }); } else { activeGame.status = 'archived'; saveLocal('cn_games', gamesData); renderGames(); renderAdminGames(); } }); }

// --- REFRESH ---
function refreshAll() { 
    renderNews(); renderJams(); renderGames(); renderRules(); renderCoins(); 
    renderCatalog(); renderQueue(); renderLeaderboard(); renderAdminLists(); 
}

console.log("DASHBOARD SCRIPT LOADED SUCCESSFULLY");