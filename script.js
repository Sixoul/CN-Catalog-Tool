/**
 * CODE NINJAS DASHBOARD LOGIC
 * -----------------------------------------
 * Handles Authentication, Data (Firebase/Local),
 * UI Rendering, and Admin Functions.
 */

// --- CONFIGURATION ---
// UPDATE THIS VERSION NUMBER TO TRIGGER THE WELCOME MESSAGE
const APP_VERSION = "2.5";

const firebaseConfig = {
  apiKey: "AIzaSyAElu-JLX7yAJJ4vEnR4SMZGn0zf93KvCQ",
  authDomain: "codeninjas-dashboard.firebaseapp.com",
  projectId: "codeninjas-dashboard",
  storageBucket: "codeninjas-dashboard.firebasestorage.app",
  messagingSenderId: "71590347120",
  appId: "1:71590347120:web:5f53a55cd7ffc280fd8fb5"
};

// --- GLOBAL STATE ---
let db = null;
let auth = null;
let currentUser = null;

// Data Stores
let newsData = [];
let jamsData = [];
let rulesData = [];
let coinsData = [];
let catalogData = [];
let requestsData = [];
let queueData = [];
let leaderboardData = [];

// UI State
let currentTier = 'tier1';
let currentRequestItem = null;
let editingCatId = null;
let editingId = null;
let editingNinjaId = null;
let showHistory = false;
let clickCount = 0;
let clickTimer;

// Constants
const GITHUB_REPO_URL = "https://github.com/YOUR_USERNAME/YOUR_REPO_NAME"; 
const FILAMENT_COLORS = [
    "Jade White", "Light Gray", "Orange", "Sunflower Yellow", "Mistletoe Green", "Cocoa Brown", 
    "Red", "Cyan", "Cobalt Blue", "Purple", "Blue Grey", "Hot Pink", "Black", 
    "Matte Ivory White", "Matte Lilac Purple", "Matte Mandarin Orange", "Matte Plum", 
    "Matte Dark Red", "Matte Grass Green", "Matte Dark Blue", "Matte Ash Gray", "Matte Charcoal",
    "Glow in Dark Blue", "Silk Blue Hawaii", "Silk+ Gold", "Metal Iridium Gold", 
    "Metal Copper Brown", "Metal Iron Gray", "Translucent Red", "Wood Black Walnut", 
    "PETG Translucent Clear", "Flashforge Burnt Titanium", "Rock PLA Mars Red", 
    "Burgundy Red"
];

// Mock Data (Fallback)
const defaultNews = [{ id: "n1", title: "Minecraft Night", date: "Nov 22", badge: "SOON" }];
const defaultRules = [{ id: "r1", title: "General", desc: "Respect the Dojo equipment.", penalty: "-1 Coin" }];
const defaultCoins = [{ id: "c1", task: "Wear Uniform", val: "+1", type: "silver" }];
const defaultCatalog = [{ id: "cat1", name: "Star", cost: "50 Coins", tier: "tier1", icon: "fa-star", type: "standard", visible: true }];
const mockLeaderboard = [{ id: "l1", name: "Asher Cullin", points: 1250, belt: "Blue" }];


// --- INITIALIZATION ---
window.onload = function() {
    // 1. VERSION CHECK (DEBUG TOOL)
    const storedVer = localStorage.getItem('cn_app_version');
    const msgEl = document.getElementById('login-version-msg');
    
    if (storedVer !== APP_VERSION) {
        // New version detected!
        if(msgEl) {
            msgEl.innerText = `🚀 Update Detected! Welcome to v${APP_VERSION}`;
            msgEl.style.display = 'block';
        }
        // Update local storage so message doesn't show on next refresh
        localStorage.setItem('cn_app_version', APP_VERSION);
    } else {
        // Same version, hide message
        if(msgEl) msgEl.style.display = 'none';
    }

    // 2. Initialize Firebase
    try {
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            auth = firebase.auth();
            console.log("Firebase Initialized");
        }
    } catch (e) {
        console.log("Demo Mode (No Firebase):", e);
    }

    // 3. Check Login State
    const savedUser = localStorage.getItem('cn_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            enterDashboard();
        } catch (e) {
            console.error("Error parsing saved user", e);
            localStorage.removeItem('cn_user');
        }
    } else {
        document.getElementById('login-view').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }

    // 4. Load Data
    subscribeToData();
};


// --- DATA SYNC ---
function subscribeToData() {
    if (db) {
        // Firebase Listeners
        db.collection("news").orderBy("createdAt", "desc").onSnapshot(snap => { newsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderNews(); renderAdminLists(); });
        db.collection("rules").orderBy("createdAt", "asc").onSnapshot(snap => { rulesData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderRules(); renderAdminLists(); });
        // Coins: no orderBy in DB so we can manually sort in UI if needed
        db.collection("coins").onSnapshot(snap => { 
            coinsData = snap.docs.map(d => ({id: d.id, ...d.data()})); 
            // Optional: Sort by an 'order' field if you add one later.
            coinsData.sort((a, b) => (a.order || 0) - (b.order || 0));
            renderCoins(); 
            renderAdminLists(); 
        });
        db.collection("catalog").onSnapshot(snap => { catalogData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderCatalog(); renderAdminLists(); });
        db.collection("requests").orderBy("time", "desc").onSnapshot(snap => { requestsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderAdminRequests(); });
        db.collection("queue").orderBy("createdAt", "asc").onSnapshot(snap => { queueData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderQueue(); renderAdminLists(); });
        db.collection("leaderboard").onSnapshot(snap => { leaderboardData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderLeaderboard(); });
        db.collection("jams").onSnapshot(snap => { jamsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderJams(); });
    } else {
        // Local Storage Fallback
        newsData = JSON.parse(localStorage.getItem('cn_news')) || defaultNews;
        rulesData = JSON.parse(localStorage.getItem('cn_rules')) || defaultRules;
        coinsData = JSON.parse(localStorage.getItem('cn_coins')) || defaultCoins;
        catalogData = JSON.parse(localStorage.getItem('cn_catalog')) || defaultCatalog;
        requestsData = JSON.parse(localStorage.getItem('cn_requests')) || [];
        queueData = JSON.parse(localStorage.getItem('cn_queue')) || [];
        leaderboardData = JSON.parse(localStorage.getItem('cn_leaderboard')) || mockLeaderboard;
        refreshAll();
    }
}

// --- AUTHENTICATION ---

function toggleAdminLogin() { 
    const n = document.getElementById('ninja-login-form');
    const a = document.getElementById('admin-login-form');
    
    if(n.style.display === 'none') {
        n.style.display = 'block';
        a.style.display = 'none';
    } else {
        n.style.display = 'none';
        a.style.display = 'block';
        document.getElementById('admin-pass').focus();
    } 
}

function attemptNinjaLogin() { 
    const n = document.getElementById('login-username').value.trim(); 
    if(!n) return; 
    
    const u = leaderboardData.find(l => l.name.toLowerCase() === n.toLowerCase()); 
    
    if(u){
        currentUser = u;
        localStorage.setItem('cn_user', JSON.stringify(u));
        enterDashboard();
    } else {
        document.getElementById('login-error-msg').style.display = 'block';
        document.getElementById('login-error-msg').innerText = 'Ninja not found in roster.';
    } 
}

function attemptAdminLogin() { 
    const e = document.getElementById('admin-email').value; 
    const p = document.getElementById('admin-pass').value; 

    if(p === "@2633Ninjas") {
        loginAsAdmin();
        return;
    }

    if(auth) {
        auth.signInWithEmailAndPassword(e, p)
            .then(() => loginAsAdmin())
            .catch(err => {
                console.error(err);
                document.getElementById('login-error-msg').style.display = 'block';
                document.getElementById('login-error-msg').innerText = 'Access Denied.';
            });
    } else {
        document.getElementById('login-error-msg').style.display = 'block';
        document.getElementById('login-error-msg').innerText = 'Access Denied (Offline).';
    } 
}

function loginAsAdmin() {
    currentUser = { name: "Sensei", isAdmin: true };
    localStorage.setItem('cn_user', JSON.stringify(currentUser));
    enterDashboard();
    document.getElementById('admin-view').classList.add('active');
}

function logout() { 
    localStorage.removeItem('cn_user'); 
    currentUser = null; 
    if(auth) auth.signOut(); 
    location.reload(); 
}

function enterDashboard() { 
    document.getElementById('login-view').style.display = 'none'; 
    document.getElementById('main-app').style.display = 'flex'; 
    
    if(currentUser && currentUser.name) {
        document.getElementById('current-user-name').innerText = currentUser.name.split(' ')[0]; 
    }
    
    if(currentUser && currentUser.isAdmin) {
        document.getElementById('floating-admin-toggle').style.display = 'flex';
    } else {
        document.getElementById('floating-admin-toggle').style.display = 'none';
    }
    
    refreshAll(); 
}

// --- NAVIGATION LOGIC ---
function showTab(tabId, btn) {
    // 1. Hide all tab contents
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(c => c.classList.remove('active'));

    // 2. Remove 'active' class from all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(n => n.classList.remove('active'));

    // 3. Show the selected tab content
    const activeContent = document.getElementById(tabId);
    if (activeContent) {
        activeContent.classList.add('active');
    }

    // 4. Highlight the clicked nav button
    if (btn) {
        btn.classList.add('active');
    }
}

// --- USER VIEW RENDERERS ---

function refreshAll() { 
    renderNews(); renderJams(); renderRules(); renderCoins(); 
    renderCatalog(); renderQueue(); renderLeaderboard(); renderAdminLists(); 
}

function renderNews() { 
    const c = document.getElementById('news-feed'); if(!c) return; c.innerHTML=''; 
    newsData.forEach(i => c.innerHTML+=`<div class="list-card passed"><div class="card-info"><h3>${i.title}</h3><p>${i.date}</p></div><div class="status-badge" style="color:var(--color-games)">${i.badge} ></div></div>`); 
}

function renderRules() { 
    const c = document.getElementById('rules-feed'); 
    if(!c) return;
    c.innerHTML=''; 
    
    // Group by Category
    const groups = {};
    rulesData.forEach(r => {
        const cat = r.title || 'General'; // Using 'title' field as Category
        if(!groups[cat]) groups[cat] = [];
        groups[cat].push(r);
    });
    
    // Render Groups
    for (const [category, items] of Object.entries(groups)) {
        // Header
        c.innerHTML += `<h3 class="rules-group-header">${category}</h3>`;
        
        // Grid Container for items
        let gridHtml = `<div class="rules-group-grid">`;
        items.forEach(r => {
            const b = r.penalty ? `<div class="status-badge" style="color:#e74c3c;border:1px solid #e74c3c;">${r.penalty}</div>` : '';
            gridHtml += `<div class="list-card pending" style="margin:0;"><div class="card-info"><h3>${r.desc}</h3></div>${b}</div>`; 
        });
        gridHtml += `</div>`;
        c.innerHTML += gridHtml;
    }
}

function renderCoins() { 
    const c = document.getElementById('coin-feed'); if(!c) return; c.innerHTML=''; 
    coinsData.forEach(i => c.innerHTML+=`<li class="coin-item"><span>${i.task}</span><div>${formatCoinBreakdown(i.val)}</div></li>`); 
}

function filterCatalog(tier, btn) {
    currentTier = tier;
    document.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    renderCatalog();
}

function renderCatalog() { 
    const c = document.getElementById('catalog-feed'); if(!c) return; c.innerHTML=''; 
    if(!currentTier) currentTier = 'tier1';
    const f = catalogData.filter(i => i.tier === currentTier && i.visible !== false); 
    if(f.length === 0) c.innerHTML = '<p style="color:#666">No items available in this tier.</p>'; 
    else f.forEach(i => { 
        let img = i.image && i.image.length > 5 ? `<img src="${i.image}">` : `<i class="fa-solid ${i.icon}"></i>`; 
        let act = `onclick="initRequest('${i.id}')"`; 
        if(i.type === 'standard') act = `onclick="incrementInterest('${i.id}')"`; 
        c.innerHTML += `<div class="store-card"><div class="store-icon-circle">${img}</div><div class="store-info"><h4>${i.name}</h4><p>${i.cost}</p></div><div class="store-action"><button class="btn-req" ${act}>Request</button></div></div>`; 
    }); 
}

function renderQueue() { 
    const c = document.getElementById('queue-list'); if(!c) return; c.innerHTML=''; 
    let q = !showHistory ? queueData.filter(i => i.status.toLowerCase() !== 'picked up') : [...queueData].sort((a,b) => b.createdAt - a.createdAt); 
    if(q.length === 0) c.innerHTML = '<p style="color:#666;text-align:center;">Empty.</p>'; 
    else q.forEach((i,x) => { 
        let s = i.status.toLowerCase(), cl = 'status-pending', icon = 'fa-clock', cc = 'queue-card'; 
        if(s.includes('ready')){ cl='status-ready'; icon='fa-check'; cc+=' ready-pickup'; } 
        else if(s.includes('printing')){ cl='status-printing printing-anim'; icon='fa-print'; } 
        else if(s.includes('waiting')){ cl='status-waiting-print'; icon='fa-hourglass'; } 
        else if(s.includes('payment')){ cl='status-waiting-payment'; icon='fa-circle-dollar-to-slot'; } 
        c.innerHTML += `<div class="${cc}"><div class="q-left"><div class="q-number">${x+1}</div><div class="q-info"><h3>${formatName(i.name)}</h3><p>${i.item}</p></div></div><div class="q-status ${cl}">${i.status} <i class="fa-solid ${icon}"></i></div></div>`; 
    }); 
}

function renderLeaderboard() { 
    const p = document.getElementById('lb-podium'); 
    const l = document.getElementById('lb-list'); 
    if(!p || !l) return;
    p.innerHTML = ''; l.innerHTML = ''; 
    const s = [...leaderboardData].sort((a,b) => b.points - a.points); 
    const v = []; 
    if(s[1]) v.push({...s[1], rank: 2}); 
    if(s[0]) v.push({...s[0], rank: 1}); 
    if(s[2]) v.push({...s[2], rank: 3}); 
    v.forEach(i => p.innerHTML += `<div class="lb-card rank-${i.rank}"><div class="lb-badge">${i.rank}</div><div class="lb-icon" style="border-color:${getBeltColor(i.belt)}"><i class="fa-solid ${getIconClass(i.belt)}" style="color:${getBeltColor(i.belt)}"></i></div><div class="lb-name">${formatName(i.name)}</div><div class="lb-points">${i.points} pts</div></div>`); 
    s.slice(3).forEach((i,x) => l.innerHTML += `<div class="lb-row"><div class="lb-row-rank">#${x+4}</div><div class="lb-row-belt" style="border-color:${getBeltColor(i.belt)}"><i class="fa-solid ${getIconClass(i.belt)}" style="color:${getBeltColor(i.belt)}"></i></div><div class="lb-row-name">${formatName(i.name)}</div><div class="lb-row-points">${i.points}</div></div>`); 
    renderAdminLbPreview(); 
}

function renderJams() { 
    const c = document.getElementById('jams-feed'); if(!c) return; c.innerHTML=''; 
    jamsData.forEach(j => { 
        let cl = 'alert', txt = 'ACTIVE >', col = 'var(--color-jams)'; 
        if(j.status === 'waiting') { cl='pending'; txt='WAITING >'; col='#aaa'; } 
        if(j.status === 'results') { cl='passed'; txt='RESULTS >'; col='#2ecc71'; } 
        c.innerHTML += `<div class="list-card ${cl}" onclick="openJamModal('${j.id}')" style="cursor:pointer;"><div class="card-info"><h3>${j.title}</h3><p>${j.deadline}</p></div><div class="status-badge" style="color:${col}">${txt}</div></div>`; 
    }); 
}


// --- ADMIN RENDERERS & ACTIONS ---

function renderAdminLists() {
    // 1. News
    const nList = document.getElementById('admin-news-list'); 
    if(nList){ 
        nList.innerHTML=''; 
        newsData.forEach(n => nList.innerHTML += `<div class="admin-list-wrapper"><div class="list-card passed" style="pointer-events:none; margin:0;"><div class="card-info"><h3>${n.title}</h3><p>${n.date}</p></div><div class="status-badge" style="color:var(--color-games)">${n.badge} ></div></div><button onclick="openNewsModal('${n.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteNews('${n.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div>`); 
    }

    // 2. Rules (Updated Placeholders for Category)
    const rList = document.getElementById('admin-rules-list'); 
    if(rList){ 
        rList.innerHTML=''; 
        rulesData.forEach(r => { 
            const b = r.penalty ? `<div class="status-badge" style="color:#e74c3c;border:1px solid #e74c3c;">${r.penalty}</div>` : ''; 
            // Showing Category (r.title) and Rule (r.desc)
            rList.innerHTML += `<div class="admin-list-wrapper"><div class="list-card pending" style="pointer-events:none; margin:0;"><div class="card-info"><h3>${r.title}</h3><p>${r.desc}</p></div>${b}</div><button onclick="openRulesModal('${r.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteRule('${r.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div>`; 
        }); 
    }

    // 3. Coins (Added Reorder Buttons)
    const cList = document.getElementById('admin-coins-list'); 
    if(cList){ 
        cList.innerHTML=''; 
        coinsData.forEach((c, index) => {
            // Arrows
            const upBtn = index > 0 ? `<button onclick="moveCoin(${index}, -1)" class="btn-arrow">⬆</button>` : '<span class="btn-arrow-placeholder"></span>';
            const downBtn = index < coinsData.length - 1 ? `<button onclick="moveCoin(${index}, 1)" class="btn-arrow">⬇</button>` : '<span class="btn-arrow-placeholder"></span>';

            cList.innerHTML += `
            <div class="admin-list-wrapper">
                <div style="display:flex; flex-direction:column; margin-right:5px;">
                    ${upBtn}
                    ${downBtn}
                </div>
                <div style="flex-grow:1;background:#161932;padding:10px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;">
                    <span style="color:white;font-weight:bold;">${c.task}</span>
                    <div>${formatCoinBreakdown(c.val)}</div>
                </div>
                <button onclick="openCoinModal('${c.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button>
                <button onclick="deleteCoin('${c.id}')" class="btn-mini" style="background:#e74c3c;">Del</button>
            </div>`; 
        }); 
    }
    
    // 4. Interest Tracker
    const intList = document.getElementById('admin-interest-list');
    if(intList) {
        intList.innerHTML = '';
        const st = catalogData.filter(c => c.type === 'standard' && (c.interest || 0) > 0);
        if(st.length === 0) {
            intList.innerHTML = '<p style="color:#666; width:100%; text-align:center; padding:20px; font-size:0.9rem;">No active interest.</p>';
        } else {
            st.sort((a, b) => b.interest - a.interest);
            st.forEach(s => {
                let img = s.image && s.image.length > 5 ? `<img src="${s.image}">` : `<i class="fa-solid ${s.icon}"></i>`;
                intList.innerHTML += `
                <div class="interest-card-square">
                    <div class="interest-visual">${img}</div>
                    <div style="width:100%;">
                        <h4 style="margin:5px 0; color:white; font-size:0.9rem;">${s.name}</h4>
                        <div class="interest-count-badge">${s.interest} Requests</div>
                    </div>
                    <div style="width:100%;">
                        <button class="interest-reset-btn" onclick="resetInterest('${s.id}')">RESET</button>
                    </div>
                </div>`;
            });
        }
    }

    // 5. Catalog
    const catList = document.getElementById('admin-cat-list'); 
    if(catList){ 
        catList.innerHTML=''; 
        const tiers = ['tier1','tier2','tier3','tier4']; 
        const tierNames = {'tier1':'Tier 1','tier2':'Tier 2','tier3':'Tier 3','tier4':'Tier 4'}; 
        tiers.forEach(t => { 
            catList.innerHTML += `<div class="admin-tier-header">${tierNames[t]}</div>`; 
            let g = `<div class="admin-store-grid">`; 
            catalogData.filter(i => i.tier === t).forEach(i => { 
                let img = i.image && i.image.length > 5 ? `<img src="${i.image}">` : `<i class="fa-solid ${i.icon}"></i>`; 
                let h = i.visible === false ? 'hidden' : ''; 
                g += `
                <div class="admin-store-card ${h}">
                    <div class="admin-store-icon">${img}</div>
                    <div style="flex-grow:1;">
                        <h4 style="margin:0;color:white;font-size:0.9rem;">${i.name}</h4>
                        <p style="margin:0;color:#888;font-size:0.8rem;">${i.cost}</p>
                    </div>
                    <div class="admin-store-actions">
                        <button onclick="editCatItem('${i.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button>
                        <button onclick="deleteCatItem('${i.id}')" class="btn-mini" style="background:#e74c3c;">Del</button>
                    </div>
                </div>`; 
            }); 
            g += `</div>`; catList.innerHTML += g; 
        }); 
    }

    renderAdminRequests();
    renderAdminQueue();
    renderAdminLbPreview();
}

// --- COIN MOVING ---
function moveCoin(index, dir) {
    if (index + dir < 0 || index + dir >= coinsData.length) return;
    
    // Swap
    const temp = coinsData[index];
    coinsData[index] = coinsData[index + dir];
    coinsData[index + dir] = temp;
    
    // If firebase, we would usually need an 'order' field update here.
    // For now, we are manipulating the local array which works for the session.
    // If relying on LocalStorage:
    saveLocal('cn_coins', coinsData);
    
    renderAdminLists();
    renderCoins();
}


// --- ADMIN UTILS ---

function toggleAdminViewMode() { 
    const adminView = document.getElementById('admin-view');
    const floatingBtn = document.getElementById('floating-admin-toggle');
    if (adminView.classList.contains('active')) { adminView.classList.remove('active'); floatingBtn.style.display = 'flex'; } 
    else { adminView.classList.add('active'); floatingBtn.style.display = 'flex'; }
}

function showAdminSection(id, btn) { 
    document.querySelectorAll('.admin-section').forEach(e => e.classList.remove('active')); 
    document.getElementById(id).classList.add('active'); 
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active')); 
    btn.classList.add('active'); 
    renderAdminLists(); 
}

function handleLogoClick() { 
    if(window.innerWidth < 768) return; 
    clickCount++; clearTimeout(clickTimer); clickTimer = setTimeout(() => { clickCount = 0; }, 2000); 
    if(clickCount === 3) { clickCount = 0; toggleAdminLogin(); } 
}

// --- CRUD MODALS ---

// Rules Modal (Updated for Category)
function openRulesModal(id=null) { 
    editingId=id; 
    const titleInput = document.getElementById('rule-input-title');
    const descInput = document.getElementById('rule-input-desc');
    
    // Update placeholders to reflect Category change
    titleInput.placeholder = "Category (e.g. Safety)";
    descInput.placeholder = "Rule Description";
    
    if(id){
        const i=rulesData.find(r=>r.id===id); 
        titleInput.value=i.title; 
        descInput.value=i.desc; 
        document.getElementById('rule-input-penalty').value=i.penalty;
    } else {
        titleInput.value=''; 
        descInput.value=''; 
        document.getElementById('rule-input-penalty').value='';
    } 
    document.getElementById('rules-modal').style.display='flex'; 
}

// ... (Other CRUD modals remain same structure but fully included for completeness)
function closeRulesModal() { document.getElementById('rules-modal').style.display='none'; }
function saveRule() { const title=document.getElementById('rule-input-title').value; const desc=document.getElementById('rule-input-desc').value; const penalty=document.getElementById('rule-input-penalty').value; if(title){ if(db){ if(editingId) db.collection("rules").doc(editingId).update({title,desc,penalty}); else db.collection("rules").add({title,desc,penalty,createdAt:Date.now()}); } else { if(editingId){ const idx=rulesData.findIndex(r=>r.id===editingId); if(idx>-1) rulesData[idx]={id:editingId,title,desc,penalty}; } else { rulesData.push({id:"local_"+Date.now(),title,desc,penalty}); } saveLocal('cn_rules',rulesData); renderAdminLists(); renderRules(); } closeRulesModal(); showAlert("Success", "Rule saved!"); } }
function deleteRule(id) { showConfirm("Delete?", () => { if(db) db.collection("rules").doc(id).delete(); else { rulesData = rulesData.filter(r => r.id !== id); saveLocal('cn_rules', rulesData); renderAdminLists(); renderRules(); } }); }

function openCoinModal(id=null) { editingId=id; if(id){const i=coinsData.find(c=>c.id===id); document.getElementById('coin-input-task').value=i.task; document.getElementById('coin-input-val').value=i.val;}else{document.getElementById('coin-input-task').value='';document.getElementById('coin-input-val').value='';} document.getElementById('coin-modal').style.display='flex'; }
function closeCoinModal() { document.getElementById('coin-modal').style.display='none'; }
function saveCoin() { const task=document.getElementById('coin-input-task').value; const val=document.getElementById('coin-input-val').value; if(task){ if(db){ if(editingId) db.collection("coins").doc(editingId).update({task,val}); else db.collection("coins").add({task,val}); } else { if(editingId){ const idx=coinsData.findIndex(c=>c.id===editingId); if(idx>-1) coinsData[idx]={id:editingId,task,val}; } else { coinsData.push({id:"local_"+Date.now(),task,val}); } saveLocal('cn_coins',coinsData); renderAdminLists(); renderCoins(); } closeCoinModal(); showAlert("Success", "Task saved!"); } }
function deleteCoin(id) { showConfirm("Delete?", () => { if(db) db.collection("coins").doc(id).delete(); else { coinsData = coinsData.filter(c => c.id !== id); saveLocal('cn_coins', coinsData); renderAdminLists(); renderCoins(); } }); }

// ... (Catalog, News, etc) ...
function showAddCatModal() { editingCatId = null; document.getElementById('ce-name').value=''; document.getElementById('ce-cost').value=''; document.getElementById('ce-img').value=''; document.getElementById('ce-visible').checked=true; document.getElementById('cat-edit-modal').style.display='flex'; }
function editCatItem(id) { editingCatId = id; const item = catalogData.find(x => x.id === id); if (!item) return; document.getElementById('ce-name').value = item.name; document.getElementById('ce-cost').value = item.cost; document.getElementById('ce-tier').value = item.tier; document.getElementById('ce-img').value = item.image || ''; document.getElementById('ce-visible').checked = item.visible !== false; const typeSelect = document.getElementById('ce-type'); if(typeSelect) { typeSelect.value = item.type || 'standard'; toggleCatOptions(item.type); } if (item.options) document.getElementById('ce-options').value = item.options.join(', '); document.getElementById('cat-edit-modal').style.display='flex'; }
function saveCatItem() { const n = document.getElementById('ce-name').value; const c = document.getElementById('ce-cost').value; const t = document.getElementById('ce-tier').value; const im = document.getElementById('ce-img').value; const vis = document.getElementById('ce-visible').checked; const type = document.getElementById('ce-type').value; let options = []; if (type === 'premium_variant') { const optStr = document.getElementById('ce-options').value; if(optStr) options = optStr.split(',').map(s => s.trim()).filter(s => s); } if(n) { const data = {name:n, cost:c, tier:t, icon:'fa-cube', type:type, image:im, visible:vis, options: options}; if(db) { if(editingCatId) db.collection("catalog").doc(editingCatId).update(data); else db.collection("catalog").add({...data, createdAt: Date.now(), interest: 0}); } else { if(editingCatId) { const idx = catalogData.findIndex(x => x.id === editingCatId); if(idx > -1) catalogData[idx] = {id: editingCatId, ...data}; } else { catalogData.push({id: "local_" + Date.now(), ...data, interest: 0}); } saveLocal('cn_catalog', catalogData); renderCatalog(); renderAdminLists(); } closeCatModal(); } }
function deleteCatItem(id) { showConfirm("Delete?", () => { if(db) db.collection("catalog").doc(id).delete(); else { catalogData = catalogData.filter(x => x.id !== id); saveLocal('cn_catalog', catalogData); renderCatalog(); renderAdminLists(); } }); }
function closeCatModal() { document.getElementById('cat-edit-modal').style.display='none'; }
function toggleCatOptions(v) { document.getElementById('ce-options-container').style.display = v === 'premium_variant' ? 'block' : 'none'; }

function openNewsModal(id=null) { editingId=id; if(id){const i=newsData.find(n=>n.id===id); document.getElementById('news-input-title').value=i.title; document.getElementById('news-input-date').value=i.date; document.getElementById('news-input-badge').value=i.badge;}else{document.getElementById('news-input-title').value='';document.getElementById('news-input-date').value='';document.getElementById('news-input-badge').value='';} document.getElementById('news-modal').style.display='flex'; }
function closeNewsModal() { document.getElementById('news-modal').style.display = 'none'; }
function saveNews() { const t=document.getElementById('news-input-title').value; const d=document.getElementById('news-input-date').value; const b=document.getElementById('news-input-badge').value; if(t){ if(db){ if(editingId) db.collection("news").doc(editingId).update({title:t,date:d,badge:b}); else db.collection("news").add({title:t,date:d,badge:b,createdAt:Date.now()}); } else { if(editingId){const idx=newsData.findIndex(n=>n.id===editingId); newsData[idx]={id:editingId,title:t,date:d,badge:b};} else {newsData.unshift({id:"l"+Date.now(),title:t,date:d,badge:b});} saveLocal('cn_news',newsData); renderAdminLists(); renderNews(); } closeNewsModal(); showAlert("Success", "News saved!"); } }
function deleteNews(id) { showConfirm("Delete?", () => { if(db) db.collection("news").doc(id).delete(); else { newsData = newsData.filter(n => n.id !== id); saveLocal('cn_news', newsData); renderAdminLists(); renderNews(); } }); }

// ... Request Actions
function resetInterest(id) { const item = catalogData.find(x => x.id === id); if(!item) return; showConfirm("Reset count for " + item.name + "?", () => { if(db) { db.collection("catalog").doc(id).update({ interest: 0 }); } else { item.interest = 0; saveLocal('cn_catalog', catalogData); renderAdminLists(); } }); }
function approveRequest(id) { const r = requestsData.find(x => x.id === id); if(!r) return; const qItem = { name: r.name, item: r.item, details: r.details, status: "Waiting for Payment", createdAt: Date.now() }; if(db) { db.collection("queue").add(qItem); db.collection("requests").doc(id).delete(); } else { queueData.push({id: "local_q_"+Date.now(), ...qItem}); requestsData = requestsData.filter(x => x.id !== id); saveLocal('cn_queue', queueData); saveLocal('cn_requests', requestsData); refreshAll(); } }
function deleteRequest(id) { if(db) db.collection("requests").doc(id).delete(); else { requestsData = requestsData.filter(x => x.id !== id); saveLocal('cn_requests', requestsData); renderAdminRequests(); } }

function renderAdminRequests() { const c = document.getElementById('admin-requests-list'); if(!c) return; c.innerHTML = ''; const pending = requestsData.filter(r => !r.archived); if(pending.length === 0) { c.innerHTML = '<p style="color:#666; padding:10px;">No requests.</p>'; return; } pending.forEach(r => { c.innerHTML += `<div class="req-item"><div style="flex:1;"><div style="color:white; font-weight:bold;">${r.name}</div><div style="color:var(--color-catalog);">${r.item}</div><div style="color:#888; font-size:0.75rem;">${r.details}</div></div><div class="req-actions"><button onclick="approveRequest('${r.id}')" style="background:#2ecc71; color:black;">Approve</button><button onclick="deleteRequest('${r.id}')" style="background:#e74c3c; color:white;">Del</button></div></div>`; }); }
function renderAdminQueue() { const qList = document.getElementById('admin-queue-manage-list'); if(!qList) return; qList.innerHTML=''; queueData.filter(q => q.status !== 'Picked Up').forEach(q => { const id = q.id ? `'${q.id}'` : `'${queueData.indexOf(q)}'`; qList.innerHTML += `<div class="admin-list-item" style="display:block; margin-bottom:10px; background:#161932; padding:10px; border-radius:6px; border:1px solid #34495e;"><div style="display:flex;justify-content:space-between;"><strong>${q.name}</strong> <span>${q.status}</span></div><div style="color:#aaa;font-size:0.8rem;">${q.item} ${q.details ? '| '+q.details : ''}</div><div style="margin-top:5px;"><button onclick="updateQueueStatus(${id},'Waiting for Payment')" class="admin-btn" style="width:auto;padding:2px 5px;font-size:0.7rem;background:#e74c3c;">Pay</button><button onclick="updateQueueStatus(${id},'Pending')" class="admin-btn" style="width:auto;padding:2px 5px;font-size:0.7rem;background:#555;">Pend</button><button onclick="updateQueueStatus(${id},'Printing')" class="admin-btn" style="width:auto;padding:2px 5px;font-size:0.7rem;background:#9b59b6;">Print</button><button onclick="updateQueueStatus(${id},'Ready!')" class="admin-btn" style="width:auto;padding:2px 5px;font-size:0.7rem;background:#2ecc71;">Ready</button><button onclick="updateQueueStatus(${id},'Picked Up')" class="admin-btn" style="width:auto;padding:2px 5px;font-size:0.7rem;background:#1abc9c;">Done</button></div></div>`; }); }
function renderAdminLbPreview() { const c = document.getElementById('admin-lb-preview-list'); if(!c) return; c.innerHTML = ''; const sorted = [...leaderboardData].sort((a,b) => b.points - a.points); if (sorted.length === 0) { c.innerHTML = '<p style="color:#666; padding:10px;">No ninjas yet.</p>'; return; } sorted.forEach((ninja, index) => { c.innerHTML += `<div class="admin-lb-preview-row"><div class="admin-lb-rank">#${index + 1}</div><div class="admin-lb-name">${ninja.name}</div><div class="admin-lb-points">${ninja.points}</div></div>`; }); }
function openGitHubUpload() { if (GITHUB_REPO_URL.includes("github.com")) window.open(GITHUB_REPO_URL.replace(/\/$/, "") + "/upload/main", '_blank'); else showAlert("Error", "Configure GITHUB_REPO_URL"); }