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
let db = null;
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        console.log("Firebase Initialized");
    }
} catch (e) {
    console.log("Running in Demo Mode (Local Storage)");
}

// CONSTANTS
const GITHUB_REPO_URL = "https://github.com/YOUR_USERNAME/YOUR_REPO_NAME"; 
const FILAMENT_COLORS = ["Jade White", "Light Gray", "Orange", "Sunflower Yellow", "Mistletoe Green", "Cocoa Brown", "Red", "Cyan", "Cobalt Blue", "Purple", "Blue Grey", "Hot Pink", "Black", "Matte Ivory White", "Matte Lilac Purple", "Matte Mandarin Orange", "Matte Plum", "Matte Dark Red", "Matte Grass Green", "Matte Dark Blue", "Matte Ash Gray", "Matte Charcoal", "Glow in Dark Blue", "Silk Blue Hawaii", "Silk+ Gold", "Metal Iridium Gold", "Metal Copper Brown", "Metal Iron Gray"];

// LOCAL STATE
let newsData = [], jamsData = [], rulesData = [], coinsData = [], catalogData = [], requestsData = [], queueData = [], leaderboardData = [];
let currentTier = 'tier1';
let currentRequestItem = null;
let editingCatId = null;
let editingId = null; // General editing ID for News/Rules/Coins
let editingNinjaId = null;
let clickCount = 0;
let clickTimer;

// MOCK DATA (Fallback)
const defaultNews = [{ id: "n1", title: "Minecraft Parents Night Out", date: "Nov 22", badge: "COMING SOON" }];
const defaultRules = [{ id: "r1", title: "Respect Equipment", desc: "Treat keyboards gently.", penalty: "-1 Coin" }];
const defaultCoins = [{ id: "c1", task: "Wear Ninja Shirt", val: "+1", type: "silver" }];
const defaultCatalog = [{ id: "cat1", name: "Ninja Star", cost: "50 Coins", tier: "tier1", icon: "fa-star", type: "standard", image: "" }];
const mockLeaderboard = [{ id: "l1", name: "Asher Cullin", points: 1250, belt: "Blue" }, { id: "l2", name: "Colton Wong", points: 1100, belt: "Green" }];
const mockQueue = [{ id: "q1", name: "Asher C.", item: "Katana", status: "Printing", details: "Black" }];
const defaultJams = [{ id: "jam1", title: "Winter Jam", deadline: "2025-12-20", type: "game", platform: "Scratch", reqs: ["Snow theme"], status: "active", submissions: [] }];

// --- DATA LOADING ---
function subscribeToData() {
    if (db) {
        db.collection("news").orderBy("createdAt", "desc").onSnapshot(snap => { newsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderNews(); renderAdminLists(); });
        db.collection("rules").orderBy("createdAt", "asc").onSnapshot(snap => { rulesData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderRules(); renderAdminLists(); });
        db.collection("coins").onSnapshot(snap => { coinsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderCoins(); renderAdminLists(); });
        db.collection("catalog").onSnapshot(snap => { catalogData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderCatalog(); renderAdminLists(); });
        db.collection("requests").orderBy("time", "desc").onSnapshot(snap => { requestsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderAdminRequests(); });
        db.collection("queue").orderBy("createdAt", "asc").onSnapshot(snap => { queueData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderQueue(); renderAdminLists(); });
        db.collection("leaderboard").onSnapshot(snap => { leaderboardData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderLeaderboard(); });
        db.collection("jams").onSnapshot(snap => { jamsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderJams(); });
    } else {
        newsData = JSON.parse(localStorage.getItem('cn_news')) || defaultNews;
        rulesData = JSON.parse(localStorage.getItem('cn_rules')) || defaultRules;
        coinsData = JSON.parse(localStorage.getItem('cn_coins')) || defaultCoins;
        catalogData = JSON.parse(localStorage.getItem('cn_catalog')) || defaultCatalog;
        queueData = JSON.parse(localStorage.getItem('cn_queue')) || mockQueue;
        leaderboardData = JSON.parse(localStorage.getItem('cn_leaderboard')) || mockLeaderboard;
        jamsData = JSON.parse(localStorage.getItem('cn_jams')) || defaultJams;
        refreshAll();
    }
}

// --- CORE RENDERERS ---
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
         else if(s.includes('waiting to print')) { cl='status-waiting-print'; icon='fa-hourglass'; style='border-left-color:#3498db'; }
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

// --- ADMIN UI LOGIC ---
function showAdminSection(id, btn) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(e => e.classList.remove('active'));
    // Show target
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    
    // Update nav state
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    
    renderAdminLists();
}

function renderAdminLists() {
    try {
        // NEWS
        const nList = document.getElementById('admin-news-list'); 
        if(nList && Array.isArray(newsData)) {
            nList.innerHTML = '';
            newsData.forEach((n) => nList.innerHTML += `<div class="admin-list-item"><span>${n.title}</span><div class="admin-list-actions"><button onclick="openNewsModal('${n.id}')" class="btn-edit">Edit</button><button onclick="deleteNews('${n.id}')" class="btn-danger">Del</button></div></div>`);
        }

        // RULES
        const rList = document.getElementById('admin-rules-list'); 
        if(rList && Array.isArray(rulesData)) {
            rList.innerHTML = '';
            rulesData.forEach((r) => rList.innerHTML += `<div class="admin-list-item"><span>${r.title}</span><div class="admin-list-actions"><button onclick="openRulesModal('${r.id}')" class="btn-edit">Edit</button><button onclick="deleteRule('${r.id}')" class="btn-danger">Del</button></div></div>`);
        }

        // COINS
        const cList = document.getElementById('admin-coins-list'); 
        if(cList && Array.isArray(coinsData)) {
            cList.innerHTML = '';
            coinsData.forEach((c) => cList.innerHTML += `<div class="admin-list-item"><span>${c.task} (${c.val})</span><div class="admin-list-actions"><button onclick="openCoinModal('${c.id}')" class="btn-edit">Edit</button><button onclick="deleteCoin('${c.id}')" class="btn-danger">Del</button></div></div>`);
        }

        // CATALOG
        const catList = document.getElementById('admin-cat-list'); 
        if(catList && Array.isArray(catalogData)) {
            catList.innerHTML = '';
            catalogData.forEach((c) => catList.innerHTML += `<div class="admin-list-item"><span>${c.name} (${c.cost})</span><div class="admin-list-actions"><button onclick="editCatItem('${c.id}')" class="btn-edit">Edit</button><button onclick="deleteCatItem('${c.id}')" class="btn-danger">Del</button></div></div>`);
        }

        renderAdminRequests();

        // QUEUE
        const qList = document.getElementById('admin-queue-manage-list'); 
        if(qList && Array.isArray(queueData)) {
            qList.innerHTML = '';
            queueData.forEach((q, i) => {
                const idOrIndex = q.id ? `'${q.id}'` : `'${i}'`; // Fix for local items needing string index
                qList.innerHTML += `
                <div class="admin-list-item" style="display:block;">
                    <div style="display:flex; justify-content:space-between;"><strong>${q.name}</strong> <span>${q.status}</span></div>
                    <div style="color:#aaa; font-size:0.8rem;">${q.item} ${q.details ? ' | ' + q.details : ''}</div>
                    <div style="margin-top:5px;">
                        <button onclick="updateQueueStatus(${idOrIndex}, 'Pending')" class="admin-btn" style="width:auto; padding:2px 5px; font-size:0.7rem; background:#555;">Pending</button>
                        <button onclick="updateQueueStatus(${idOrIndex}, 'Printing')" class="admin-btn" style="width:auto; padding:2px 5px; font-size:0.7rem; background:#9b59b6;">Printing</button>
                        <button onclick="updateQueueStatus(${idOrIndex}, 'Ready!')" class="admin-btn" style="width:auto; padding:2px 5px; font-size:0.7rem; background:#2ecc71;">Ready</button>
                        <button onclick="updateQueueStatus(${idOrIndex}, 'Picked Up')" class="admin-btn" style="width:auto; padding:2px 5px; font-size:0.7rem; background:#1abc9c;">Done</button>
                    </div>
                </div>`;
            });
        }
    } catch (e) {
        console.error("Error rendering admin lists:", e);
    }
}

// --- REQUESTS RENDERER (Safe) ---
function renderAdminRequests() {
     const c = document.getElementById('admin-requests-list'); if(!c) return; c.innerHTML = '';
     if(!Array.isArray(requestsData) || requestsData.length === 0) {
         c.innerHTML = '<p style="color:#666; padding:10px;">No pending requests.</p>';
         return;
     }
     requestsData.forEach((r) => {
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

// --- CRUD MODALS ---
// NEWS
function openNewsModal(id=null) {
    editingId = id;
    if(id) {
        const item = newsData.find(n => n.id === id);
        if(item) {
            document.getElementById('news-input-title').value = item.title;
            document.getElementById('news-input-date').value = item.date;
            document.getElementById('news-input-badge').value = item.badge;
        }
    } else {
        document.getElementById('news-input-title').value = '';
        document.getElementById('news-input-date').value = '';
        document.getElementById('news-input-badge').value = '';
    }
    document.getElementById('news-modal').style.display = 'flex';
}
function closeNewsModal() { document.getElementById('news-modal').style.display = 'none'; }
function saveNews() {
    const title = document.getElementById('news-input-title').value;
    const date = document.getElementById('news-input-date').value;
    const badge = document.getElementById('news-input-badge').value;
    
    if(title) {
        if(db) {
            if(editingId) db.collection("news").doc(editingId).update({title, date, badge});
            else db.collection("news").add({title, date, badge, createdAt: Date.now()});
        } else {
            if(editingId) {
                const idx = newsData.findIndex(n => n.id === editingId);
                if(idx > -1) newsData[idx] = {id:editingId, title, date, badge};
            } else {
                newsData.unshift({id: "local_" + Date.now(), title, date, badge});
            }
            saveLocal('cn_news', newsData);
            renderNews(); renderAdminLists();
        }
        closeNewsModal();
        showAlert("Success", "News item saved!");
    }
}
function deleteNews(id) { 
    showConfirm("Delete this news item?", () => {
        if(db) db.collection("news").doc(id).delete();
        else {
            newsData = newsData.filter(n => n.id !== id);
            saveLocal('cn_news', newsData);
            renderNews(); renderAdminLists();
        }
    });
}

// RULES
function openRulesModal(id=null) {
    editingId = id;
    if(id) {
        const item = rulesData.find(r => r.id === id);
        if(item) {
            document.getElementById('rule-input-title').value = item.title;
            document.getElementById('rule-input-desc').value = item.desc;
            document.getElementById('rule-input-penalty').value = item.penalty;
        }
    } else {
        document.getElementById('rule-input-title').value = '';
        document.getElementById('rule-input-desc').value = '';
        document.getElementById('rule-input-penalty').value = '';
    }
    document.getElementById('rules-modal').style.display = 'flex';
}
function closeRulesModal() { document.getElementById('rules-modal').style.display = 'none'; }
function saveRule() {
    const title = document.getElementById('rule-input-title').value;
    const desc = document.getElementById('rule-input-desc').value;
    const penalty = document.getElementById('rule-input-penalty').value;
    if(title) {
        if(db) {
            if(editingId) db.collection("rules").doc(editingId).update({title, desc, penalty});
            else db.collection("rules").add({title, desc, penalty, createdAt: Date.now()});
        } else {
             if(editingId) {
                const idx = rulesData.findIndex(r => r.id === editingId);
                if(idx > -1) rulesData[idx] = {id:editingId, title, desc, penalty};
            } else {
                rulesData.push({id: "local_" + Date.now(), title, desc, penalty});
            }
            saveLocal('cn_rules', rulesData);
            renderRules(); renderAdminLists();
        }
        closeRulesModal();
        showAlert("Success", "Rule saved!");
    }
}
function deleteRule(id) {
    showConfirm("Delete this rule?", () => {
        if(db) db.collection("rules").doc(id).delete();
        else {
            rulesData = rulesData.filter(r => r.id !== id);
            saveLocal('cn_rules', rulesData);
            renderRules(); renderAdminLists();
        }
    });
}

// COINS
function openCoinModal(id=null) {
    editingId = id;
    if(id) {
        const item = coinsData.find(c => c.id === id);
        if(item) {
            document.getElementById('coin-input-task').value = item.task;
            document.getElementById('coin-input-val').value = item.val;
        }
    } else {
        document.getElementById('coin-input-task').value = '';
        document.getElementById('coin-input-val').value = '';
    }
    document.getElementById('coin-modal').style.display = 'flex';
}
function closeCoinModal() { document.getElementById('coin-modal').style.display = 'none'; }
function saveCoin() {
    const task = document.getElementById('coin-input-task').value;
    const val = document.getElementById('coin-input-val').value;
    if(task) {
        if(db) {
            if(editingId) db.collection("coins").doc(editingId).update({task, val});
            else db.collection("coins").add({task, val});
        } else {
            if(editingId) {
                const idx = coinsData.findIndex(c => c.id === editingId);
                if(idx > -1) coinsData[idx] = {id:editingId, task, val};
            } else {
                coinsData.push({id: "local_" + Date.now(), task, val});
            }
            saveLocal('cn_coins', coinsData);
            renderCoins(); renderAdminLists();
        }
        closeCoinModal();
        showAlert("Success", "Coin task saved!");
    }
}
function deleteCoin(id) {
     showConfirm("Delete this task?", () => {
        if(db) db.collection("coins").doc(id).delete();
        else {
            coinsData = coinsData.filter(c => c.id !== id);
            saveLocal('cn_coins', coinsData);
            renderCoins(); renderAdminLists();
        }
    });
}

// CATALOG ADMIN
function showAddCatModal() { editingCatId = null; document.getElementById('ce-name').value=''; document.getElementById('ce-cost').value=''; document.getElementById('ce-img').value=''; document.getElementById('cat-edit-modal').style.display='flex'; }
function editCatItem(id) { editingCatId = id; const item = catalogData.find(x => x.id === id); if (!item) return; document.getElementById('ce-name').value = item.name; document.getElementById('ce-cost').value = item.cost; document.getElementById('ce-tier').value = item.tier; document.getElementById('ce-img').value = item.image || ''; document.getElementById('cat-edit-modal').style.display='flex'; }
function saveCatItem() {
    const n=document.getElementById('ce-name').value; const c=document.getElementById('ce-cost').value; const t=document.getElementById('ce-tier').value; const im=document.getElementById('ce-img').value;
    if(n) { 
        const data = {name:n, cost:c, tier:t, icon:'fa-cube', type:'standard', image:im};
        if(db) { if(editingCatId) db.collection("catalog").doc(editingCatId).update(data); else db.collection("catalog").add({...data, createdAt: Date.now()}); } 
        else { if(editingCatId) { const idx = catalogData.findIndex(x => x.id === editingCatId); if(idx > -1) catalogData[idx] = {id: editingCatId, ...data}; } else { catalogData.push({id: "local_" + Date.now(), ...data}); } saveLocal('cn_catalog', catalogData); renderCatalog(); renderAdminLists(); }
        closeCatModal(); 
    }
}
function deleteCatItem(id) { if(confirm("Delete?")) { if(db) db.collection("catalog").doc(id).delete(); else { catalogData = catalogData.filter(x => x.id !== id); saveLocal('cn_catalog', catalogData); renderCatalog(); renderAdminLists(); } } }
function closeCatModal() { document.getElementById('cat-edit-modal').style.display='none'; }

// QUEUE & REQ
function approveRequest(id) {
    const r = requestsData.find(x => x.id === id);
    if(r) {
        if(db) { db.collection("queue").add({ name: r.name, item: r.item, status: "Pending", details: r.details, createdAt: Date.now() }); db.collection("requests").doc(id).delete(); }
        else { queueData.push({id:"local_"+Date.now(), name:r.name, item:r.item, status:"Pending", details:r.details}); requestsData = requestsData.filter(x => x.id !== id); saveLocal('cn_requests', requestsData); saveLocal('cn_queue', queueData); renderAdminRequests(); renderQueue(); }
    }
}
function deleteRequest(id) { if(db) db.collection("requests").doc(id).delete(); else { requestsData=requestsData.filter(x=>x.id!==id); saveLocal('cn_requests',requestsData); renderAdminRequests(); } }
function updateQueueStatus(id, status) {
    if(db) { if(status === 'Picked Up') db.collection("queue").doc(id).delete(); else db.collection("queue").doc(id).update({status: status}); }
    else { 
        // Parse index if ID string
        let idx = -1;
        if (typeof id === 'string' && id.startsWith('local_')) idx = queueData.findIndex(x => x.id === id);
        else idx = parseInt(id); // Handle older numeric index
        
        if(idx > -1 && queueData[idx]) {
            if(status === 'Picked Up') queueData.splice(idx, 1); else queueData[idx].status = status;
            saveLocal('cn_queue', queueData); renderQueue(); renderAdminLists();
        }
    }
}

// UTILS
function saveLocal(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function formatCoinBreakdown(valStr) { if(!valStr) return ''; if(valStr.includes('-')) return `<span class="coin-val" style="color:#e74c3c; border-color:#e74c3c;">${valStr}</span>`; const num = parseInt(valStr.replace(/\D/g, '')) || 0; if(num === 0) return `<span class="coin-val silver">0</span>`; let html = ''; const obsidian = Math.floor(num / 25); let rem = num % 25; const gold = Math.floor(rem / 5); const silver = rem % 5; if(obsidian > 0) html += `<span class="coin-val obsidian" style="margin-right:4px;">${obsidian}</span>`; if(gold > 0) html += `<span class="coin-val gold" style="margin-right:4px;">${gold}</span>`; if(silver > 0) html += `<span class="coin-val silver" style="margin-right:4px;">${silver}</span>`; return html; }
function getBeltColor(belt) { const map = { 'white': 'var(--belt-white)', 'yellow': 'var(--belt-yellow)', 'orange': 'var(--belt-orange)', 'green': 'var(--belt-green)', 'blue': 'var(--belt-blue)', 'purple': 'var(--belt-purple)', 'brown': 'var(--belt-brown)', 'red': 'var(--belt-red)', 'black': 'var(--belt-black)' }; return map[(belt || 'white').toLowerCase()] || 'var(--belt-white)'; }
function adminSearchNinja() { const q=document.getElementById('admin-lb-search').value.toLowerCase(); const r=document.getElementById('admin-lb-results'); r.innerHTML=''; if(q.length<2) return; const m=leaderboardData.filter(n=>n.name.toLowerCase().includes(q)); m.forEach(x=>r.innerHTML+=`<div class="admin-list-item" style="cursor:pointer;" onclick="selectNinja('${x.id}','${x.name}',${x.points})">${x.name} (${x.points})</div>`); }
function selectNinja(id,n,p) { editingNinjaId=id; document.getElementById('admin-lb-edit').style.display='block'; document.getElementById('admin-lb-name').innerText=n; document.getElementById('admin-lb-current').innerText=p; }
function adminUpdatePoints() { if(!editingNinjaId) return; const adj=parseInt(document.getElementById('admin-lb-adjust').value); const cur=parseInt(document.getElementById('admin-lb-current').innerText); const newT=cur+adj; if(db) db.collection("leaderboard").doc(editingNinjaId).update({points:newT}); else { const idx=leaderboardData.findIndex(x=>x.id===editingNinjaId); if(idx>-1) leaderboardData[idx].points=newT; saveLocal('cn_leaderboard',leaderboardData); } document.getElementById('admin-lb-current').innerText=newT; document.getElementById('admin-lb-adjust').value=''; showAlert("Success", "Points Updated!"); navigator.clipboard.writeText(newT); }
function refreshAll() { renderNews(); renderJams(); renderRules(); renderCoins(); renderCatalog(); renderQueue(); renderLeaderboard(); renderAdminLists(); }

// NAV & AUTH
function showTab(id, el) { document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active')); document.getElementById(id).classList.add('active'); document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); el.classList.add('active'); }
function handleLogoClick() { clickCount++; clearTimeout(clickTimer); clickTimer = setTimeout(() => { clickCount = 0; }, 2000); if(clickCount === 3) { clickCount = 0; document.getElementById('admin-auth-modal').style.display = 'flex'; document.getElementById('admin-auth-input').focus(); } }
function closeAdminAuthModal() { document.getElementById('admin-auth-modal').style.display = 'none'; }
function submitAdminAuth() { if(document.getElementById('admin-auth-input').value==="@2633Ninjas"){ document.getElementById('admin-auth-input').value=''; closeAdminAuthModal(); document.getElementById('admin-view').classList.add('active'); showAdminSection('admin-home', document.querySelector('.admin-nav-btn')); } else { showAlert("Error", "Access Denied"); } }
function exitAdmin() { document.getElementById('admin-view').classList.remove('active'); }
function filterCatalog(t, btn) { currentTier=t; document.querySelectorAll('.tier-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderCatalog(); }
function initRequest(id) { currentRequestItem=catalogData.find(x=>x.id===id); document.getElementById('req-item-name').innerText=currentRequestItem.name; document.getElementById('req-modal').style.display='flex'; }
function closeReqModal() { document.getElementById('req-modal').style.display='none'; }
function submitRequest() { const name = document.getElementById('req-ninja-name').value; if(!name) return showAlert("Error","Name required"); const req={name, item: currentRequestItem.name, details: "Standard", time: new Date().toLocaleString()}; if(db) db.collection("requests").add(req); else { requestsData.push({id: "local_" + Date.now(), ...req}); saveLocal('cn_requests', requestsData); } closeReqModal(); showAlert("Success", "Sent!"); }
function openJamModal(id) { const j=jamsData.find(x=>x.id===id); if(!j)return; document.getElementById('modal-title').innerText=j.title; document.getElementById('modal-desc').innerText=`Details for ${j.title}`; document.getElementById('modal-deadline').innerText=j.deadline; document.getElementById('jam-modal').style.display='flex'; }
function closeJamModal() { document.getElementById('jam-modal').style.display='none'; }
function openGitHubUpload() { if (GITHUB_REPO_URL.includes("github.com")) window.open(GITHUB_REPO_URL.replace(/\/$/, "") + "/upload/main", '_blank'); else showAlert("Error", "Configure GITHUB_REPO_URL"); }

// INIT
subscribeToData();
