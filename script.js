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
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// CONSTANTS
const GITHUB_REPO_URL = "https://github.com/YOUR_USERNAME/YOUR_REPO_NAME"; // Update this later
const FILAMENT_COLORS = ["Jade White", "Light Gray", "Orange", "Sunflower Yellow", "Mistletoe Green", "Cocoa Brown", "Red", "Cyan", "Cobalt Blue", "Purple", "Blue Grey", "Hot Pink", "Black", "Matte Ivory White", "Matte Lilac Purple", "Matte Mandarin Orange", "Matte Plum", "Matte Dark Red", "Matte Grass Green", "Matte Dark Blue", "Matte Ash Gray", "Matte Charcoal", "Glow in Dark Blue", "Silk Blue Hawaii", "Silk+ Gold", "Metal Iridium Gold", "Metal Copper Brown", "Metal Iron Gray"];

// LOCAL STATE
let newsData = [];
let jamsData = [];
let rulesData = [];
let coinsData = [];
let catalogData = [];
let requestsData = [];
let queueData = []; 
let leaderboardData = [];

// --- REAL-TIME LISTENERS ---
// This connects your local arrays to the cloud database
function subscribeToData() {
    db.collection("news").orderBy("createdAt", "desc").onSnapshot(snap => { 
        newsData = snap.docs.map(d => ({id: d.id, ...d.data()})); 
        renderNews(); renderAdminLists(); 
    });
    db.collection("rules").orderBy("createdAt", "asc").onSnapshot(snap => { 
        rulesData = snap.docs.map(d => ({id: d.id, ...d.data()})); 
        renderRules(); renderAdminLists(); 
    });
    db.collection("coins").onSnapshot(snap => { 
        coinsData = snap.docs.map(d => ({id: d.id, ...d.data()})); 
        renderCoins(); renderAdminLists(); 
    });
    db.collection("catalog").onSnapshot(snap => { 
        catalogData = snap.docs.map(d => ({id: d.id, ...d.data()})); 
        renderCatalog(); renderAdminLists(); 
    });
    db.collection("requests").orderBy("time", "desc").onSnapshot(snap => { 
        requestsData = snap.docs.map(d => ({id: d.id, ...d.data()})); 
        renderAdminRequests(); 
    });
    db.collection("queue").orderBy("createdAt", "asc").onSnapshot(snap => { 
        queueData = snap.docs.map(d => ({id: d.id, ...d.data()})); 
        renderQueue(); renderAdminLists(); 
    });
    db.collection("leaderboard").onSnapshot(snap => { 
        leaderboardData = snap.docs.map(d => ({id: d.id, ...d.data()})); 
        renderLeaderboard(); 
    });
    db.collection("jams").onSnapshot(snap => { 
        jamsData = snap.docs.map(d => ({id: d.id, ...d.data()})); 
        renderJams(); 
    });
}

// --- CORE FUNCTIONS (CRUD) ---

// NEWS
function renderNews() {
    const container = document.getElementById('news-feed'); container.innerHTML = '';
    if(newsData.length === 0) container.innerHTML = '<p style="color:#666; text-align:center;">No news yet.</p>';
    newsData.forEach(item => {
        container.innerHTML += `<div class="list-card passed"><div class="card-info"><h3>${item.title}</h3><p>${item.date}</p></div><div class="status-badge" style="color: var(--color-games)">${item.badge} ></div></div>`;
    });
}
function addNews() { 
    const t = prompt("Title:"); const d = prompt("Date:"); const b = prompt("Badge:");
    if(t) db.collection("news").add({title:t, date:d, badge:b, createdAt: Date.now()});
}
function editNews(id) {
    const item = newsData.find(n => n.id === id);
    const t = prompt("Title:", item.title); const d = prompt("Date:", item.date); const b = prompt("Badge:", item.badge);
    if(t) db.collection("news").doc(id).update({title:t, date:d, badge:b});
}
function deleteNews(id) { if(confirm("Delete?")) db.collection("news").doc(id).delete(); }


// RULES
function renderRules() { 
    const c = document.getElementById('rules-feed'); c.innerHTML=''; 
    if(rulesData.length === 0) c.innerHTML = '<p style="color:#666; text-align:center;">No rules set.</p>';
    rulesData.forEach(r => {
         const b = r.penalty ? `<div class="status-badge" style="color:#e74c3c; border:1px solid #e74c3c;">${r.penalty}</div>` : '';
         c.innerHTML += `<div class="list-card pending"><div class="card-info"><h3>${r.title}</h3><p>${r.desc}</p></div>${b}</div>`;
    });
}
function addRule() { const t=prompt("Title:"); const d=prompt("Desc:"); const p=prompt("Penalty:"); if(t) db.collection("rules").add({title:t, desc:d, penalty:p, createdAt: Date.now()}); }
function editRule(id) { const r = rulesData.find(x => x.id === id); const t=prompt("Title:",r.title); const d=prompt("Desc:",r.desc); const p=prompt("Penalty:",r.penalty); if(t) db.collection("rules").doc(id).update({title:t, desc:d, penalty:p}); }
function deleteRule(id) { if(confirm("Delete?")) db.collection("rules").doc(id).delete(); }

// COINS
function renderCoins() {
    const c = document.getElementById('coin-feed'); c.innerHTML='';
    coinsData.forEach(i => c.innerHTML += `<li class="coin-item"><span>${i.task}</span><div>${formatCoinBreakdown(i.val)}</div></li>`);
}
function addCoin() { const t=prompt("Task:"); const v=prompt("Value (e.g. +5):"); if(t) db.collection("coins").add({task:t, val:v}); }
function editCoin(id) { const c = coinsData.find(x => x.id === id); const t=prompt("Task:",c.task); const v=prompt("Value:",c.val); if(t) db.collection("coins").doc(id).update({task:t, val:v}); }
function deleteCoin(id) { db.collection("coins").doc(id).delete(); }

// CATALOG
let currentTier = 'tier1';
let editingCatId = null;

function renderCatalog() {
    const c = document.getElementById('catalog-feed'); c.innerHTML='';
    const f = catalogData.filter(i => i.tier === currentTier);
    if(f.length === 0) c.innerHTML = '<p style="color:#666;">No items.</p>';
    else f.forEach(i => {
        let iconOrImg = `<i class="fa-solid ${i.icon}"></i>`;
        if (i.image && i.image.length > 5) iconOrImg = `<img src="${i.image}" alt="${i.name}">`;
        c.innerHTML += `<div class="store-card"><div class="store-icon-circle">${iconOrImg}</div><div class="store-info"><h4>${i.name}</h4><p>${i.cost}</p></div><div class="store-action"><button class="btn-req" onclick="initRequest('${i.id}')">Request</button></div></div>`;
    });
}
function filterCatalog(t, btn) { currentTier=t; document.querySelectorAll('.tier-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderCatalog(); }

// CATALOG ADMIN
function showAddCatModal() { editingCatId = null; document.getElementById('ce-name').value=''; document.getElementById('ce-cost').value=''; document.getElementById('ce-img').value=''; document.getElementById('cat-edit-modal').style.display='flex'; }
function editCatItem(id) { 
    editingCatId = id; 
    const item = catalogData.find(x => x.id === id);
    document.getElementById('ce-name').value = item.name;
    document.getElementById('ce-cost').value = item.cost;
    document.getElementById('ce-tier').value = item.tier;
    document.getElementById('ce-img').value = item.image || '';
    document.getElementById('cat-edit-modal').style.display='flex'; 
}
function saveCatItem() {
    const n=document.getElementById('ce-name').value; 
    const c=document.getElementById('ce-cost').value; 
    const t=document.getElementById('ce-tier').value; 
    const im=document.getElementById('ce-img').value;
    if(n) { 
        const data = {name:n, cost:c, tier:t, icon:'fa-cube', type:'standard', image:im};
        if(editingCatId) db.collection("catalog").doc(editingCatId).update(data);
        else db.collection("catalog").add(data);
        document.getElementById('cat-edit-modal').style.display='none'; 
    }
}
function deleteCatItem(id) { if(confirm("Delete?")) db.collection("catalog").doc(id).delete(); }
function closeCatModal() { document.getElementById('cat-edit-modal').style.display='none'; }


// QUEUE & REQUESTS
function renderQueue() {
     const c = document.getElementById('queue-list'); c.innerHTML='';
     // Filter active items
     const q = queueData.filter(i => i.status.toLowerCase() !== 'picked up');
     if(q.length===0) c.innerHTML='<p style="color:#666;text-align:center;">Empty Queue.</p>';
     else q.forEach((i,x) => {
         let s = i.status.toLowerCase(), cl = 'status-pending', icon = 'fa-clock', style = '';
         if(s.includes('ready')) { cl='status-ready'; icon='fa-check'; style='border-left-color:#2ecc71'; }
         else if(s.includes('printing')) { cl='status-printing printing-anim'; icon='fa-print'; style='border-left-color:#9b59b6'; }
         else if(s.includes('waiting to print')) { cl='status-waiting-print'; icon='fa-hourglass'; style='border-left-color:#3498db'; }
         c.innerHTML += `<div class="queue-card" style="${style}"><div class="q-left"><div class="q-number">${x+1}</div><div class="q-info"><h3>${i.name}</h3><p>${i.item}</p></div></div><div class="q-status ${cl}">${i.status} <i class="fa-solid ${icon}"></i></div></div>`;
     });
}

function renderAdminRequests() {
     const c = document.getElementById('admin-requests-list'); if(!c) return; c.innerHTML = '';
     if(requestsData.length === 0) c.innerHTML = '<p style="color:#666; padding:10px;">No pending requests.</p>';
     requestsData.forEach(r => {
         c.innerHTML += `
         <div class="req-item">
            <div><strong>${r.name}</strong> - ${r.item}<br><span style="color:#aaa; font-size:0.7rem;">${r.details}</span></div>
            <div class="req-actions">
                <button onclick="approveRequest('${r.id}')" style="background:#27ae60; color:white; border:none;">ADD</button>
                <button onclick="deleteRequest('${r.id}')" class="btn-danger">X</button>
            </div>
         </div>`;
     });
}

function approveRequest(id) {
    const r = requestsData.find(x => x.id === id);
    if(r) {
        // Add to Queue
        db.collection("queue").add({ name: r.name, item: r.item, status: "Pending", details: r.details, createdAt: Date.now() });
        // Remove from Requests
        db.collection("requests").doc(id).delete();
    }
}

function deleteRequest(id) { db.collection("requests").doc(id).delete(); }

function updateQueueStatus(index, status) { 
    const item = queueData[index];
    if(item && item.id) {
        if(status === 'Picked Up') db.collection("queue").doc(item.id).delete();
        else db.collection("queue").doc(item.id).update({status: status});
    }
}

// CLIENT REQUEST FLOW
let currentRequestItemId = null;

function initRequest(id) { 
    currentRequestItemId = id; 
    const item = catalogData.find(x => x.id === id);
    document.getElementById('req-item-name').innerText = item.name; 
    document.getElementById('req-modal').style.display = 'flex'; 
}

function submitRequest() {
    const name = document.getElementById('req-ninja-name').value;
    if(!name) return alert("Name required");
    const item = catalogData.find(x => x.id === currentRequestItemId);
    
    let details = "Standard";
    // Check if dynamic fields exist (simplified for now)
    if(document.getElementById('req-color')) details = "Color: " + document.getElementById('req-color').value;
    
    db.collection("requests").add({
        name, 
        item: item.name, 
        details, 
        time: new Date().toLocaleString()
    });
    
    document.getElementById('req-modal').style.display = 'none';
    alert("✅ Request Sent!");
}

// LEADERBOARD & SYNC
function renderLeaderboard() {
    const podium = document.getElementById('lb-podium'); podium.innerHTML = '';
    const list = document.getElementById('lb-list'); list.innerHTML = '';
    
    const sorted = [...leaderboardData].sort((a, b) => b.points - a.points);
    
    // Podium
    const visualOrder = [];
    if(sorted[1]) visualOrder.push({...sorted[1], rank: 2});
    if(sorted[0]) visualOrder.push({...sorted[0], rank: 1});
    if(sorted[2]) visualOrder.push({...sorted[2], rank: 3});

    visualOrder.forEach(item => {
        const beltColor = getBeltColor(item.belt || 'white');
        podium.innerHTML += `<div class="lb-card rank-${item.rank}"><div class="lb-badge">${item.rank}</div><div class="lb-icon" style="border-color: ${beltColor}"><i class="fa-solid fa-user-ninja" style="color: ${beltColor}"></i></div><div class="lb-name">${item.name}</div><div class="lb-points">${item.points} pts</div></div>`;
    });

    // List
    sorted.slice(3).forEach((item, index) => {
        const beltColor = getBeltColor(item.belt || 'white');
        list.innerHTML += `<div class="lb-row"><div class="lb-row-rank">#${index + 4}</div><div class="lb-row-belt" style="border-color: ${beltColor}"><i class="fa-solid fa-user-ninja" style="color: ${beltColor}"></i></div><div class="lb-row-name">${item.name}</div><div class="lb-row-points">${item.points}</div></div>`;
    });
}

function importLeaderboardCSV() {
    const csv = document.getElementById('csv-import-area').value;
    if(!csv) return alert("Paste CSV data first!");
    
    const lines = csv.split('\n');
    const batch = db.batch();
    
    let count = 0;
    lines.forEach(line => {
        const cols = line.split(',');
        if(cols.length >= 2) {
            const name = cols[0].trim();
            const points = parseInt(cols[1].trim()) || 0;
            const belt = cols[2] ? cols[2].trim() : 'White';
            
            // Note: In real app, query for existing user to update.
            // Here we create new docs. Use with caution or clear DB first.
            const newRef = db.collection("leaderboard").doc(); 
            batch.set(newRef, { name, points, belt });
            count++;
        }
    });
    
    batch.commit().then(() => {
        alert(`Imported ${count} ninjas!`);
        document.getElementById('csv-import-area').value = '';
    });
}

function adminSearchNinja() {
    const q = document.getElementById('admin-lb-search').value.toLowerCase();
    const resDiv = document.getElementById('admin-lb-results');
    resDiv.innerHTML = '';
    if(q.length < 2) return;
    const matches = leaderboardData.filter(n => n.name.toLowerCase().includes(q));
    matches.forEach(m => {
        resDiv.innerHTML += `<div class="admin-list-item" style="cursor:pointer;" onclick="selectNinja('${m.id}', '${m.name}', ${m.points})">${m.name} (${m.points})</div>`;
    });
}

let editingNinjaId = null;
function selectNinja(id, name, points) {
    editingNinjaId = id;
    document.getElementById('admin-lb-edit').style.display = 'block';
    document.getElementById('admin-lb-name').innerText = name;
    document.getElementById('admin-lb-current').innerText = points;
}

function adminUpdatePoints() {
    if(!editingNinjaId) return;
    const adj = parseInt(document.getElementById('admin-lb-adjust').value);
    const current = parseInt(document.getElementById('admin-lb-current').innerText);
    const newTotal = current + adj;
    
    db.collection("leaderboard").doc(editingNinjaId).update({ points: newTotal });
    document.getElementById('admin-lb-current').innerText = newTotal;
    document.getElementById('admin-lb-adjust').value = '';
}


// UTILS
function formatCoinBreakdown(valStr) {
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
    return map[belt.toLowerCase()] || 'var(--belt-white)';
}

// AUTH & NAV
let clickCount = 0;
let clickTimer; // Must define globally so clearTimeout works

function handleLogoClick() {
     clickCount++; 
     clearTimeout(clickTimer); 
     clickTimer = setTimeout(() => { clickCount = 0; }, 2000);
     if(clickCount === 3) { clickCount = 0; document.getElementById('admin-auth-modal').style.display = 'flex'; }
}
function closeAdminAuthModal() { document.getElementById('admin-auth-modal').style.display = 'none'; }
function submitAdminAuth() {
    if(document.getElementById('admin-auth-input').value === "@2633Ninjas") { 
        document.getElementById('admin-auth-input').value = ''; 
        closeAdminAuthModal(); 
        document.getElementById('admin-view').classList.add('active'); 
        showAdminSection('admin-home', document.querySelector('.admin-nav-btn')); 
    }
    else alert("Denied");
}
function exitAdmin() { document.getElementById('admin-view').classList.remove('active'); }
function showTab(id, el) { document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active')); document.getElementById(id).classList.add('active'); document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); el.classList.add('active'); }
function closeReqModal() { document.getElementById('req-modal').style.display = 'none'; }
function closeJamModal() { document.getElementById('jam-modal').style.display = 'none'; }
function openGitHubUpload() { if (GITHUB_REPO_URL.includes("github.com")) window.open(GITHUB_REPO_URL.replace(/\/$/, "") + "/upload/main", '_blank'); else alert("Configure GITHUB_REPO_URL"); }

// START
subscribeToData();
