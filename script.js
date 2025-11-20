// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAElu-JLX7yAJJ4vEnR4SMZGn0zf93KvCQ",
  authDomain: "codeninjas-dashboard.firebaseapp.com",
  projectId: "codeninjas-dashboard",
  storageBucket: "codeninjas-dashboard.firebasestorage.app",
  messagingSenderId: "71590347120",
  appId: "1:71590347120:web:5f53a55cd7ffc280fd8fb5"
};

// Initialize Firebase
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("Firebase Initialized");
} catch (e) {
    console.log("Running in Demo Mode (Local Storage)");
    db = null; // Explicitly null if failed
}

// CONSTANTS
const GITHUB_REPO_URL = "https://github.com/YOUR_USERNAME/YOUR_REPO_NAME"; 
const FILAMENT_COLORS = ["Jade White", "Light Gray", "Orange", "Sunflower Yellow", "Mistletoe Green", "Cocoa Brown", "Red", "Cyan", "Cobalt Blue", "Purple", "Blue Grey", "Hot Pink", "Black", "Matte Ivory White", "Matte Lilac Purple", "Matte Mandarin Orange", "Matte Plum", "Matte Dark Red", "Matte Grass Green", "Matte Dark Blue", "Matte Ash Gray", "Matte Charcoal", "Glow in Dark Blue", "Silk Blue Hawaii", "Silk+ Gold", "Metal Iridium Gold", "Metal Copper Brown", "Metal Iron Gray"];

// MOCK DATA
const defaultNews = [{ id: "n1", title: "Minecraft Parents Night Out", date: "Nov 22", badge: "COMING SOON" }];
const defaultRules = [{ id: "r1", title: "Respect Equipment", desc: "Treat keyboards gently.", penalty: "-1 Coin" }];
const defaultCoins = [{ id: "c1", task: "Wear Ninja Shirt", val: "+1", type: "silver" }];
const defaultCatalog = [{ id: "cat1", name: "Ninja Star", cost: "50 Coins", tier: "tier1", icon: "fa-star", type: "standard", image: "" }];
const mockLeaderboard = [{ id: "l1", name: "Asher Cullin", points: 1250, belt: "Blue" }, { id: "l2", name: "Colton Wong", points: 1100, belt: "Green" }];
const mockQueue = [{ id: "q1", name: "Asher C.", item: "Katana", status: "Printing", details: "Black" }];
const mockRequests = [{ id: "req1", name: "Harper S.", item: "Flexi-Rex", details: "Hot Pink", time: "10:30 AM" }];
const defaultJams = [{ id: "jam1", title: "Winter Jam", deadline: "2025-12-20", type: "game", platform: "Scratch", reqs: ["Snow theme"], status: "active", submissions: [] }];

// LOCAL STATE
let newsData = [], jamsData = [], rulesData = [], coinsData = [], catalogData = [], requestsData = [], queueData = [], leaderboardData = [];
let currentTier = 'tier1';
let currentRequestItem = null;
let editingCatId = null;
let editingNinjaId = null;
let clickCount = 0;
let clickTimer;

// --- DATA LOADING ---
function subscribeToData() {
    if (db) {
        // Real-time listeners
        db.collection("news").orderBy("createdAt", "desc").onSnapshot(snap => { newsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderNews(); renderAdminLists(); });
        db.collection("rules").orderBy("createdAt", "asc").onSnapshot(snap => { rulesData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderRules(); renderAdminLists(); });
        db.collection("coins").onSnapshot(snap => { coinsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderCoins(); renderAdminLists(); });
        db.collection("catalog").onSnapshot(snap => { catalogData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderCatalog(); renderAdminLists(); });
        db.collection("requests").orderBy("time", "desc").onSnapshot(snap => { requestsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderAdminRequests(); });
        db.collection("queue").orderBy("createdAt", "asc").onSnapshot(snap => { queueData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderQueue(); renderAdminLists(); });
        db.collection("leaderboard").onSnapshot(snap => { leaderboardData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderLeaderboard(); });
        db.collection("jams").onSnapshot(snap => { jamsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderJams(); });
    } else {
        // LocalStorage / Mock fallback
        console.log("Loading local data...");
        newsData = JSON.parse(localStorage.getItem('cn_news')) || defaultNews;
        rulesData = JSON.parse(localStorage.getItem('cn_rules')) || defaultRules;
        coinsData = JSON.parse(localStorage.getItem('cn_coins')) || defaultCoins;
        catalogData = JSON.parse(localStorage.getItem('cn_catalog')) || defaultCatalog;
        queueData = JSON.parse(localStorage.getItem('cn_queue')) || mockQueue;
        leaderboardData = JSON.parse(localStorage.getItem('cn_leaderboard')) || mockLeaderboard;
        requestsData = JSON.parse(localStorage.getItem('cn_requests')) || mockRequests;
        jamsData = JSON.parse(localStorage.getItem('cn_jams')) || defaultJams;
        refreshAll();
    }
}

// --- CATALOG ADMIN FUNCTIONS (Fixed) ---
function showAddCatModal() { 
    editingCatId = null; 
    document.getElementById('ce-name').value=''; 
    document.getElementById('ce-cost').value=''; 
    document.getElementById('ce-img').value=''; 
    document.getElementById('cat-edit-modal').style.display='flex'; 
}

function editCatItem(id) { 
    editingCatId = id; 
    const item = catalogData.find(x => x.id === id);
    if (!item) return;
    document.getElementById('ce-name').value = item.name; 
    document.getElementById('ce-cost').value = item.cost; 
    document.getElementById('ce-tier').value = item.tier; 
    document.getElementById('ce-img').value = item.image || ''; 
    document.getElementById('cat-edit-modal').style.display='flex'; 
}

function saveCatItem() {
    const n = document.getElementById('ce-name').value; 
    const c = document.getElementById('ce-cost').value; 
    const t = document.getElementById('ce-tier').value; 
    const im = document.getElementById('ce-img').value;
    
    if(n) { 
        const data = {name:n, cost:c, tier:t, icon:'fa-cube', type:'standard', image:im};
        
        if(db) {
            if(editingCatId) db.collection("catalog").doc(editingCatId).update(data);
            else db.collection("catalog").add({...data, createdAt: Date.now()});
        } else {
            if(editingCatId) {
                const idx = catalogData.findIndex(x => x.id === editingCatId);
                if(idx > -1) catalogData[idx] = {id: editingCatId, ...data};
            } else {
                catalogData.push({id: "local_" + Date.now(), ...data});
            }
            saveLocal('cn_catalog', catalogData);
            renderCatalog(); renderAdminLists();
        }
        closeCatModal(); 
    }
}

function deleteCatItem(id) { 
    if(confirm("Delete?")) { 
        if(db) db.collection("catalog").doc(id).delete(); 
        else {
            catalogData = catalogData.filter(x => x.id !== id);
            saveLocal('cn_catalog', catalogData);
            renderCatalog(); renderAdminLists();
        }
    } 
}

function closeCatModal() { document.getElementById('cat-edit-modal').style.display='none'; }

// --- HELPER UTILS ---
function saveLocal(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function formatCoinBreakdown(valStr) {
    if(!valStr) return '';
    if(valStr.includes('-')) return `<span class="coin-val" style="color:#e74c3c; border-color:#e74c3c;">${valStr}</span>`;
    const num = parseInt(valStr.replace(/\D/g, '')) || 0;
    if(num === 0) return `<span class="coin-val silver">0</span>`;
    
    let html = '';
    const obsidian = Math.floor(num / 25);
    let rem = num % 25;
    const gold = Math.floor(rem / 5);
    const silver = rem % 5;
    
    if(obsidian > 0) html += `<span class="coin-val obsidian" style="margin-right:4px;">${obsidian}</span>`;
    if(gold > 0) html += `<span class="coin-val gold" style="margin-right:4px;">${gold}</span>`;
    if(silver > 0) html += `<span class="coin-val silver" style="margin-right:4px;">${silver}</span>`;
    return html;
}

function getBeltColor(belt) {
    const map = { 'white': 'var(--belt-white)', 'yellow': 'var(--belt-yellow)', 'orange': 'var(--belt-orange)', 'green': 'var(--belt-green)', 'blue': 'var(--belt-blue)', 'purple': 'var(--belt-purple)', 'brown': 'var(--belt-brown)', 'red': 'var(--belt-red)', 'black': 'var(--belt-black)' };
    return map[(belt || 'white').toLowerCase()] || 'var(--belt-white)';
}

// --- RENDERERS ---
function renderNews() {
    const c = document.getElementById('news-feed'); if(!c) return; c.innerHTML = '';
    newsData.forEach(i => c.innerHTML += `<div class="list-card passed"><div class="card-info"><h3>${i.title}</h3><p>${i.date}</p></div><div class="status-badge" style="color:var(--color-games)">${i.badge} ></div></div>`);
}

function renderRules() { 
    const c = document.getElementById('rules-feed'); if(!c) return; c.innerHTML=''; 
    rulesData.forEach(r => c.innerHTML += `<div class="list-card pending"><div class="card-info"><h3>${r.title}</h3><p>${r.desc}</p></div>${r.penalty ? `<div class="status-badge" style="color:#e74c3c; border:1px solid #e74c3c;">${r.penalty}</div>` : ''}</div>`);
}

function renderCoins() {
    const c = document.getElementById('coin-feed'); if(!c) return; c.innerHTML='';
    coinsData.forEach(i => c.innerHTML += `<li class="coin-item"><span>${i.task}</span><div>${formatCoinBreakdown(i.val)}</div></li>`);
}

function renderCatalog() {
    const c = document.getElementById('catalog-feed'); if(!c) return; c.innerHTML='';
    const f = catalogData.filter(i => i.tier === currentTier);
    if(f.length===0) c.innerHTML='<p style="color:#666;">No items.</p>';
    else f.forEach(i => {
        let img = i.image && i.image.length > 5 ? `<img src="${i.image}">` : `<i class="fa-solid ${i.icon}"></i>`;
        c.innerHTML += `<div class="store-card"><div class="store-icon-circle">${img}</div><div class="store-info"><h4>${i.name}</h4><p>${i.cost}</p></div><div class="store-action"><button class="btn-req" onclick="initRequest('${i.id}')">Request</button></div></div>`;
    });
}

function renderQueue() {
     const c = document.getElementById('queue-list'); if(!c) return; c.innerHTML='';
     const q = queueData.filter(i => i.status.toLowerCase() !== 'picked up');
     if(q.length===0) c.innerHTML='<p style="color:#666;text-align:center;">Empty Queue.</p>';
     else q.forEach((i,x) => {
         let s = i.status.toLowerCase(), cl = 'status-pending', icon = 'fa-clock', style = '';
         if(s.includes('ready')) { cl='status-ready'; icon='fa-check'; style='border-left-color:#2ecc71'; }
         else if(s.includes('printing')) { cl='status-printing printing-anim'; icon='fa-print'; style='border-left-color:#9b59b6'; }
         else if(s.includes('waiting')) { cl='status-waiting-print'; icon='fa-hourglass'; style='border-left-color:#3498db'; }
         c.innerHTML += `<div class="queue-card" style="${style}"><div class="q-left"><div class="q-number">${x+1}</div><div class="q-info"><h3>${i.name}</h3><p>${i.item}</p></div></div><div class="q-status ${cl}">${i.status} <i class="fa-solid ${icon}"></i></div></div>`;
     });
}

function renderLeaderboard() {
    const podium = document.getElementById('lb-podium'); if(!podium) return; podium.innerHTML = '';
    const list = document.getElementById('lb-list'); list.innerHTML = '';
    
    const sorted = [...leaderboardData].sort((a, b) => b.points - a.points);
    const visualOrder = [];
    if(sorted[1]) visualOrder.push({...sorted[1], rank: 2});
    if(sorted[0]) visualOrder.push({...sorted[0], rank: 1});
    if(sorted[2]) visualOrder.push({...sorted[2], rank: 3});

    visualOrder.forEach(item => {
        const beltColor = getBeltColor(item.belt);
        podium.innerHTML += `<div class="lb-card rank-${item.rank}"><div class="lb-badge">${item.rank}</div><div class="lb-icon" style="border-color: ${beltColor}"><i class="fa-solid fa-user-ninja" style="color: ${beltColor}"></i></div><div class="lb-name">${item.name}</div><div class="lb-points">${item.points} pts</div></div>`;
    });

    sorted.slice(3).forEach((item, index) => {
        const beltColor = getBeltColor(item.belt);
        list.innerHTML += `<div class="lb-row"><div class="lb-row-rank">#${index + 4}</div><div class="lb-row-belt" style="border-color: ${beltColor}"><i class="fa-solid fa-user-ninja" style="color: ${beltColor}"></i></div><div class="lb-row-name">${item.name}</div><div class="lb-row-points">${item.points}</div></div>`;
    });
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

// --- ADMIN LISTS ---
function renderAdminLists() {
    const nList = document.getElementById('admin-news-list'); if(nList) {
        nList.innerHTML = '';
        newsData.forEach((n) => nList.innerHTML += `<div class="admin-list-item"><span>${n.title}</span><div class="admin-list-actions"><button onclick="openNewsModal('${n.id}')" class="btn-edit">Edit</button><button onclick="deleteNews('${n.id}')" class="btn-danger">Del</button></div></div>`);
    }
    // ... other lists logic is identical, ensuring IDs are passed as strings ...
    const catList = document.getElementById('admin-cat-list'); if(catList) {
        catList.innerHTML = '';
        catalogData.forEach((c) => catList.innerHTML += `<div class="admin-list-item"><span>${c.name}</span><div class="admin-list-actions"><button onclick="editCatItem('${c.id}')" class="btn-edit">Edit</button><button onclick="deleteCatItem('${c.id}')" class="btn-danger">Del</button></div></div>`);
    }
    
    // Queue Manage
    const qList = document.getElementById('admin-queue-manage-list'); if(qList) {
        qList.innerHTML = '';
        queueData.forEach((q) => {
            const safeId = q.id ? `'${q.id}'` : null; // Handle local vs firebase IDs
            // For local testing, we might need index if IDs aren't set. 
            // Ideally use ID everywhere.
            const callId = safeId || `'${queueData.indexOf(q)}'`; // Fallback
            
            qList.innerHTML += `
            <div class="admin-list-item" style="display:block;">
                <div style="display:flex; justify-content:space-between;"><strong>${q.name}</strong> <span>${q.status}</span></div>
                <div style="color:#aaa; font-size:0.8rem;">${q.item}</div>
                <div style="margin-top:5px;">
                     <button onclick="updateQueueStatus(${callId}, 'Printing')" class="admin-btn" style="width:auto; padding:2px 5px; font-size:0.7rem; background:#9b59b6;">Print</button>
                     <button onclick="updateQueueStatus(${callId}, 'Ready!')" class="admin-btn" style="width:auto; padding:2px 5px; font-size:0.7rem; background:#2ecc71;">Ready</button>
                     <button onclick="updateQueueStatus(${callId}, 'Picked Up')" class="admin-btn" style="width:auto; padding:2px 5px; font-size:0.7rem; background:#1abc9c;">Done</button>
                </div>
            </div>`;
        });
    }
}

// --- QUEUE LOGIC ---
function updateQueueStatus(id, status) {
    if(db) {
        if(status === 'Picked Up') db.collection("queue").doc(id).delete();
        else db.collection("queue").doc(id).update({status: status});
    } else {
        // Local Mode (id might be index string '0')
        const idx = parseInt(id);
        if(!isNaN(idx) && queueData[idx]) {
            if(status === 'Picked Up') queueData.splice(idx, 1);
            else queueData[idx].status = status;
            saveLocal('cn_queue', queueData);
            renderQueue(); renderAdminLists();
        }
    }
}

// --- UI LOGIC ---
function filterCatalog(t, btn) { currentTier=t; document.querySelectorAll('.tier-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderCatalog(); }
function showTab(id, el) {
    document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active'));
    el.classList.add('active');
}

function handleLogoClick() {
     clickCount++; clearTimeout(clickTimer); clickTimer = setTimeout(() => { clickCount = 0; }, 2000);
     if(clickCount === 3) { clickCount = 0; document.getElementById('admin-auth-modal').style.display = 'flex'; }
}
function closeAdminAuthModal() { document.getElementById('admin-auth-modal').style.display = 'none'; }
function submitAdminAuth() {
    if(document.getElementById('admin-auth-input').value === "@2633Ninjas") { 
        document.getElementById('admin-auth-input').value = ''; 
        closeAdminAuthModal(); 
        document.getElementById('admin-view').classList.add('active'); 
        showAdminSection('admin-home', document.querySelector('.admin-nav-btn')); 
    } else {
        alert("Access Denied");
    }
}
function exitAdmin() { document.getElementById('admin-view').classList.remove('active'); }

function showAdminSection(id, btn) {
    document.querySelectorAll('.admin-section').forEach(e => e.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderAdminLists();
}

function refreshAll() {
    renderNews(); renderJams(); renderRules(); renderCoins(); renderCatalog(); renderQueue(); renderLeaderboard(); renderAdminLists();
}

// REQUESTS
function initRequest(id) { 
    currentRequestItem = catalogData.find(x => x.id === id);
    document.getElementById('req-item-name').innerText = currentRequestItem.name; 
    document.getElementById('req-modal').style.display = 'flex'; 
}
function closeReqModal() { document.getElementById('req-modal').style.display = 'none'; }
function submitRequest() {
    const name = document.getElementById('req-ninja-name').value;
    if(!name) return alert("Name required");
    
    const req = {
        name, item: currentRequestItem.name, details: "Standard", time: new Date().toLocaleString()
    };

    if(db) db.collection("requests").add(req);
    else {
        requestsData.push({id: "local_" + Date.now(), ...req});
        saveLocal('cn_requests', requestsData);
    }
    closeReqModal(); alert("Sent!");
}

// JAMS
function openJamModal(id) {
    const j = jamsData.find(x=>x.id===id); if(!j) return;
    document.getElementById('modal-title').innerText=j.title;
    document.getElementById('modal-desc').innerText=`Details for ${j.title}`; // Simplified
    document.getElementById('modal-deadline').innerText=j.deadline;
    document.getElementById('jam-modal').style.display='flex';
}
function closeJamModal() { document.getElementById('jam-modal').style.display='none'; }

// START
subscribeToData();
