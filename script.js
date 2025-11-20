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
let editingId = null; 
let editingNinjaId = null;
let clickCount = 0;
let clickTimer;

// MOCK DATA
const defaultNews = [{ id: "n1", title: "Minecraft Parents Night Out", date: "Nov 22", badge: "COMING SOON" }];
const defaultRules = [{ id: "r1", title: "Respect Equipment", desc: "Treat keyboards gently.", penalty: "-1 Coin" }];
const defaultCoins = [{ id: "c1", task: "Wear Ninja Shirt", val: "+1", type: "silver" }];
const defaultCatalog = [
    { id: "cat1", name: "Ninja Star", cost: "50 Coins", tier: "tier1", icon: "fa-star", type: "standard", image: "", visible: true, interest: 0 },
    { id: "cat2", name: "Medium Custom", cost: "200 Coins", tier: "tier2", icon: "fa-cube", type: "premium_custom", image: "", visible: true },
    { id: "cat3", name: "Katana", cost: "500 Coins", tier: "tier4", icon: "fa-khanda", type: "premium_variant", options: ["Demon Slayer", "Traditional"], variationImages: {}, visible: true }
];
const mockLeaderboard = [{ id: "l1", name: "Asher Cullin", points: 1250, belt: "Blue" }];
const mockQueue = [{ id: "q1", name: "Asher C.", item: "Katana", status: "Printing", details: "Black" }];
const mockRequests = [{ id: "req1", name: "Harper S.", item: "Flexi-Rex", details: "Hot Pink", time: "10:30 AM" }];
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
        requestsData = JSON.parse(localStorage.getItem('cn_requests')) || mockRequests;
        jamsData = JSON.parse(localStorage.getItem('cn_jams')) || defaultJams;
        refreshAll();
    }
}

// --- CATALOG RENDERER ---
function renderCatalog() {
    const c = document.getElementById('catalog-feed'); if(!c) return; c.innerHTML='';
    const f = catalogData.filter(i => i.tier === currentTier && i.visible !== false);
    if(f.length===0) c.innerHTML='<p style="color:#666;">No items.</p>';
    else f.forEach(i => {
        let img = i.image && i.image.length > 5 ? `<img src="${i.image}">` : `<i class="fa-solid ${i.icon}"></i>`;
        // UPDATE: All items now go through initRequest for Name Input
        c.innerHTML += `
        <div class="store-card">
            <div class="store-icon-circle">${img}</div>
            <div class="store-info"><h4>${i.name}</h4><p>${i.cost}</p></div>
            <div class="store-action"><button class="btn-req" onclick="initRequest('${i.id}')">Request</button></div>
        </div>`;
    });
}

// --- REQUEST FLOW (UPDATED) ---
function initRequest(id) { 
    currentRequestItem = catalogData.find(x => x.id === id);
    if(!currentRequestItem) return;

    document.getElementById('req-item-name').innerText = currentRequestItem.name;
    document.getElementById('req-ninja-name').value = '';
    
    // Clear dynamic fields
    const dynamicContainer = document.getElementById('req-dynamic-fields');
    dynamicContainer.innerHTML = '';
    const imgContainer = document.getElementById('req-img-container');
    const gallery = document.getElementById('req-gallery');
    gallery.style.display = 'none'; 
    gallery.innerHTML = ''; 
    imgContainer.innerHTML = '';

    // Set Image
    if (currentRequestItem.image && currentRequestItem.image.length > 0) imgContainer.innerHTML = `<img id="req-main-img" src="${currentRequestItem.image}">`;
    else imgContainer.innerHTML = `<i class="fa-solid ${currentRequestItem.icon}"></i>`;

    // Handle Premium Logic (Show extra fields)
    if (currentRequestItem.type !== 'standard') {
        
        // Variations
        if(currentRequestItem.type === 'variation' || currentRequestItem.type === 'premium_variant') {
            if (currentRequestItem.variationImages) {
                const keys = Object.keys(currentRequestItem.variationImages);
                if(keys.length > 0) {
                     gallery.style.display = 'flex';
                     if(!currentRequestItem.image) imgContainer.innerHTML = `<img id="req-main-img" src="${currentRequestItem.variationImages[keys[0]]}">`;
                     keys.forEach(key => { gallery.innerHTML += `<div class="req-thumb" onclick="updateReqImage('${currentRequestItem.variationImages[key]}', '${key}')"><img src="${currentRequestItem.variationImages[key]}"></div>`; });
                }
            }
            if (currentRequestItem.options) {
                let varOpts = '';
                currentRequestItem.options.forEach(o => varOpts += `<option value="${o}">${o}</option>`);
                dynamicContainer.innerHTML += `<label style="color:white; display:block; margin-bottom:5px; margin-top:10px;">Style:</label><select id="req-var" class="admin-input" onchange="updateReqImageFromSelect(this.value)">${varOpts}</select>`;
            }
        }

        // Customs
        if(currentRequestItem.type === 'custom' || currentRequestItem.type === 'premium_custom' || currentRequestItem.type === 'custom_multi') {
            dynamicContainer.innerHTML += `<label style="color:white; display:block; margin-bottom:5px; margin-top:10px;">Tinkercad Link:</label><input type="text" id="req-link" class="admin-input" placeholder="https://...">`;
            let colorOpts = `<option value="Standard">Standard (Any)</option>`;
            FILAMENT_COLORS.forEach(c => colorOpts += `<option value="${c}">${c}</option>`);
            dynamicContainer.innerHTML += `<label style="color:white; display:block; margin-bottom:5px; margin-top:10px;">Color (Specific colors +Cost):</label><select id="req-color" class="admin-input">${colorOpts}</select>`;
            
            if(currentRequestItem.type === 'custom_multi') {
                dynamicContainer.innerHTML += `<p style="color:#e74c3c; font-size:0.8rem;">* Must be under 1.5 hours print time.</p>`;
            }
        }
    } else {
        // Standard Item Message
        dynamicContainer.innerHTML += `<p style="color:#aaa; font-size:0.8rem; margin-top:10px; text-align:center;">Enter your name to show interest in this item!</p>`;
    }

    document.getElementById('req-modal').style.display = 'flex'; 
}

// Submit Logic (Updated for Standard vs Premium)
function submitRequest() {
    const name = document.getElementById('req-ninja-name').value;
    if(!name) return showAlert("Error", "Name required");
    
    // STANDARD ITEM LOGIC (Interest Check)
    if(currentRequestItem.type === 'standard') {
        // Check for duplicate (Local Storage on this machine)
        const storageKey = `voted_${currentRequestItem.id}`;
        // Optional: Add name to storage key to allow different ninjas on same PC? 
        // Better: Just block repeat spamming. 
        // "Require name input so we can filter" -> implies admin wants to see names.
        // Since we are just incrementing a counter, we can't filter names in the Admin view easily without a new collection.
        // Compromise: We stick to counter + local spam check.
        
        if(localStorage.getItem(storageKey) === 'true') {
             closeReqModal();
             return showAlert("Notice", "You already requested this!");
        }

        // Increment Admin Counter
        incrementInterest(currentRequestItem.id);
        localStorage.setItem(storageKey, 'true'); // Mark as voted
        closeReqModal();
        return;
    }

    // PREMIUM ITEM LOGIC (Add to Queue)
    let details = "Standard";
    if(document.getElementById('req-color')) details = "Color: " + document.getElementById('req-color').value;
    if(document.getElementById('req-link')) details += " | Link: " + document.getElementById('req-link').value;
    if(document.getElementById('req-var')) details += " | Style: " + document.getElementById('req-var').value;
    
    const req = {
        name, 
        item: currentRequestItem.name, 
        details, 
        time: new Date().toLocaleString(),
        status: "Waiting for Payment",
        createdAt: Date.now()
    };

    if(db) {
        db.collection("queue").add(req);
    } else {
        queueData.push({id: "local_" + Date.now(), ...req});
        saveLocal('cn_queue', queueData);
    }
    
    closeReqModal();
    showAlert("Success", "Added to Queue (Waiting for Payment)!");
}

// --- HELPER: INTEREST INCREMENTER ---
function incrementInterest(id) {
    if(db) {
        db.collection("catalog").doc(id).update({
            interest: firebase.firestore.FieldValue.increment(1)
        });
    } else {
        const idx = catalogData.findIndex(x => x.id === id);
        if(idx > -1) {
            catalogData[idx].interest = (catalogData[idx].interest || 0) + 1;
            saveLocal('cn_catalog', catalogData);
            renderAdminLists();
        }
    }
    showAlert("Success", "Thanks for your interest!");
}

// --- OTHER HELPERS ---
function updateReqImage(url, styleName) {
    const img = document.getElementById('req-main-img'); if(img) img.src = url;
    const sel = document.getElementById('req-var'); if(sel) sel.value = styleName;
}
function updateReqImageFromSelect(val) {
     if(currentRequestItem.variationImages && currentRequestItem.variationImages[val]) {
         const img = document.getElementById('req-main-img');
         if(img) img.src = currentRequestItem.variationImages[val];
     }
}
function closeReqModal() { document.getElementById('req-modal').style.display = 'none'; }

// --- QUEUE RENDERER ---
function renderQueue() {
     const c = document.getElementById('queue-list'); if(!c) return; c.innerHTML='';
     const q = queueData.filter(i => i.status.toLowerCase() !== 'picked up');
     if(q.length===0) c.innerHTML='<p style="color:#666;text-align:center;">Empty Queue.</p>';
     else q.forEach((i,x) => {
         let s = i.status.toLowerCase(), cl = 'status-pending', icon = 'fa-clock', cardClass = 'queue-card';
         if(s.includes('ready')) { cl='status-ready'; icon='fa-check'; cardClass += ' ready-pickup'; }
         else if(s.includes('printing')) { cl='status-printing printing-anim'; icon='fa-print'; }
         else if(s.includes('waiting to print')) { cl='status-waiting-print'; icon='fa-hourglass'; }
         else if(s.includes('payment')) { cl='status-waiting-payment'; icon='fa-circle-dollar-to-slot'; }
         c.innerHTML += `
         <div class="${cardClass}">
            <div class="q-left">
                <div class="q-number">${x+1}</div>
                <div class="q-info"><h3>${i.name}</h3><p>${i.item}</p></div>
            </div>
            <div class="q-status ${cl}">${i.status} <i class="fa-solid ${icon}"></i></div>
         </div>`;
     });
}

// --- ADMIN LISTS (Includes Interest Tracker) ---
function renderAdminLists() {
    // ... News/Rules/Coins renderers (same as before) ...
    const nList = document.getElementById('admin-news-list'); if(nList) { nList.innerHTML = ''; newsData.forEach(n => nList.innerHTML += `<div class="admin-list-wrapper"><div class="list-card passed" style="pointer-events:none; margin:0;"><div class="card-info"><h3>${n.title}</h3><p>${n.date}</p></div><div class="status-badge" style="color:var(--color-games)">${n.badge} ></div></div><button onclick="openNewsModal('${n.id}')" class="btn-mini" style="background:#f39c12; color:black;"><i class="fa-solid fa-pen"></i></button><button onclick="deleteNews('${n.id}')" class="btn-mini" style="background:#e74c3c;"><i class="fa-solid fa-trash"></i></button></div>`); }
    const rList = document.getElementById('admin-rules-list'); if(rList) { rList.innerHTML = ''; rulesData.forEach(r => { const badge = r.penalty ? `<div class="status-badge" style="color:#e74c3c; border:1px solid #e74c3c;">${r.penalty}</div>` : ''; rList.innerHTML += `<div class="admin-list-wrapper"><div class="list-card pending" style="pointer-events:none; margin:0;"><div class="card-info"><h3>${r.title}</h3><p>${r.desc}</p></div>${badge}</div><button onclick="openRulesModal('${r.id}')" class="btn-mini" style="background:#f39c12; color:black;"><i class="fa-solid fa-pen"></i></button><button onclick="deleteRule('${r.id}')" class="btn-mini" style="background:#e74c3c;"><i class="fa-solid fa-trash"></i></button></div>`; }); }
    const cList = document.getElementById('admin-coins-list'); if(cList) { cList.innerHTML = ''; coinsData.forEach(c => cList.innerHTML += `<div class="admin-list-wrapper"><div style="flex-grow:1; background:#161932; padding:10px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;"><span style="color:white; font-weight:bold;">${c.task}</span><div>${formatCoinBreakdown(c.val)}</div></div><button onclick="openCoinModal('${c.id}')" class="btn-mini" style="background:#f39c12; color:black;"><i class="fa-solid fa-pen"></i></button><button onclick="deleteCoin('${c.id}')" class="btn-mini" style="background:#e74c3c;"><i class="fa-solid fa-trash"></i></button></div>`); }

    // CATALOG ADMIN
    const catList = document.getElementById('admin-cat-list'); if(catList) {
        catList.innerHTML = '';
        // Standard Items Interest Tracker
        const standardItems = catalogData.filter(c => c.type === 'standard');
        if(standardItems.length > 0) {
            catList.innerHTML += `<div class="admin-tier-header">Interest Tracker</div>`;
            standardItems.forEach(s => {
                catList.innerHTML += `<div class="interest-item"><span>${s.name}</span><span class="interest-count">${s.interest || 0} Requests</span></div>`;
            });
        }
        // Regular Editing
        const tiers = ['tier1', 'tier2', 'tier3', 'tier4'];
        const tierNames = {'tier1':'Tier 1', 'tier2':'Tier 2', 'tier3':'Tier 3', 'tier4':'Tier 4'};
        tiers.forEach(tier => {
            catList.innerHTML += `<div class="admin-tier-header">${tierNames[tier]}</div>`;
            let gridHtml = `<div class="admin-store-grid">`;
            const items = catalogData.filter(i => i.tier === tier);
            items.forEach(i => {
                let img = i.image && i.image.length > 5 ? `<img src="${i.image}">` : `<i class="fa-solid ${i.icon}"></i>`;
                let hiddenClass = i.visible === false ? 'hidden' : '';
                gridHtml += `<div class="admin-store-card ${hiddenClass}"><div class="admin-store-icon">${img}</div><div style="flex-grow:1;"><h4 style="margin:0; color:white; font-size:0.9rem;">${i.name}</h4><p style="margin:0; color:#888; font-size:0.8rem;">${i.cost}</p></div><div class="admin-store-actions"><button onclick="editCatItem('${i.id}')" class="btn-mini" style="background:#f39c12; color:black;">Edit</button><button onclick="deleteCatItem('${i.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div></div>`;
            });
            gridHtml += `</div>`;
            catList.innerHTML += gridHtml;
        });
    }
    
    renderAdminRequests();
    
    const qList = document.getElementById('admin-queue-manage-list'); if(qList) {
        qList.innerHTML = '';
        queueData.forEach(q => {
            const idOrIndex = q.id ? `'${q.id}'` : `'${queueData.indexOf(q)}'`;
            qList.innerHTML += `
            <div class="admin-list-item" style="display:block;">
                <div style="display:flex; justify-content:space-between;"><strong>${q.name}</strong> <span>${q.status}</span></div>
                <div style="color:#aaa; font-size:0.8rem;">${q.item} ${q.details ? ' | ' + q.details : ''}</div>
                <div style="margin-top:5px;">
                    <button onclick="updateQueueStatus(${idOrIndex}, 'Waiting for Payment')" class="admin-btn" style="width:auto; padding:2px 5px; font-size:0.7rem; background:#e74c3c;">Payment</button>
                    <button onclick="updateQueueStatus(${idOrIndex}, 'Pending')" class="admin-btn" style="width:auto; padding:2px 5px; font-size:0.7rem; background:#555;">Pending</button>
                    <button onclick="updateQueueStatus(${idOrIndex}, 'Printing')" class="admin-btn" style="width:auto; padding:2px 5px; font-size:0.7rem; background:#9b59b6;">Printing</button>
                    <button onclick="updateQueueStatus(${idOrIndex}, 'Ready!')" class="admin-btn" style="width:auto; padding:2px 5px; font-size:0.7rem; background:#2ecc71;">Ready</button>
                    <button onclick="updateQueueStatus(${idOrIndex}, 'Picked Up')" class="admin-btn" style="width:auto; padding:2px 5px; font-size:0.7rem; background:#1abc9c;">Done</button>
                </div>
            </div>`;
        });
    }
    renderAdminLbPreview();
}

// --- UTILS & REST OF FUNCTIONS (Keeping file complete) ---
function saveLocal(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function formatCoinBreakdown(valStr) { if(!valStr) return ''; if(valStr.includes('-')) return `<span class="coin-val" style="color:#e74c3c; border-color:#e74c3c;">${valStr}</span>`; const num = parseInt(valStr.replace(/\D/g, '')) || 0; if(num === 0) return `<span class="coin-val silver">0</span>`; let html = ''; const obsidian = Math.floor(num / 25); let rem = num % 25; const gold = Math.floor(rem / 5); const silver = rem % 5; if(obsidian > 0) html += `<span class="coin-val obsidian" style="margin-right:4px;">${obsidian}</span>`; if(gold > 0) html += `<span class="coin-val gold" style="margin-right:4px;">${gold}</span>`; if(silver > 0) html += `<span class="coin-val silver" style="margin-right:4px;">${silver}</span>`; return html; }
function getBeltColor(belt) { const map = { 'white': 'var(--belt-white)', 'yellow': 'var(--belt-yellow)', 'orange': 'var(--belt-orange)', 'green': 'var(--belt-green)', 'blue': 'var(--belt-blue)', 'purple': 'var(--belt-purple)', 'brown': 'var(--belt-brown)', 'red': 'var(--belt-red)', 'black': 'var(--belt-black)' }; return map[(belt || 'white').toLowerCase()] || 'var(--belt-white)'; }
function showTab(id, el) { document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active')); document.getElementById(id).classList.add('active'); document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); el.classList.add('active'); }
function handleLogoClick() { clickCount++; clearTimeout(clickTimer); clickTimer = setTimeout(() => { clickCount = 0; }, 2000); if(clickCount === 3) { clickCount = 0; document.getElementById('admin-auth-modal').style.display = 'flex'; document.getElementById('admin-auth-input').focus(); } }
function closeAdminAuthModal() { document.getElementById('admin-auth-modal').style.display = 'none'; }
function submitAdminAuth() { if(document.getElementById('admin-auth-input').value==="@2633Ninjas"){ document.getElementById('admin-auth-input').value=''; closeAdminAuthModal(); document.getElementById('admin-view').classList.add('active'); showAdminSection('admin-home', document.querySelector('.admin-nav-btn')); } else { showAlert("Error", "Access Denied"); } }
function exitAdmin() { document.getElementById('admin-view').classList.remove('active'); }
function showAdminSection(id, btn) { document.querySelectorAll('.admin-section').forEach(e => e.classList.remove('active')); document.getElementById(id).classList.add('active'); document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderAdminLists(); }
function filterCatalog(t, btn) { currentTier=t; document.querySelectorAll('.tier-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderCatalog(); }
function openGitHubUpload() { if (GITHUB_REPO_URL.includes("github.com")) window.open(GITHUB_REPO_URL.replace(/\/$/, "") + "/upload/main", '_blank'); else showAlert("Error", "Configure GITHUB_REPO_URL"); }
function openJamModal(id) { const j=jamsData.find(x=>x.id===id); if(!j)return; document.getElementById('modal-title').innerText=j.title; document.getElementById('modal-desc').innerText=`Details for ${j.title}`; document.getElementById('modal-deadline').innerText=j.deadline; document.getElementById('jam-modal').style.display='flex'; }
function closeJamModal() { document.getElementById('jam-modal').style.display='none'; }
function showAlert(t,m) { document.getElementById('alert-title').innerText=t; document.getElementById('alert-msg').innerText=m; document.getElementById('alert-modal').style.display='flex'; }
function showConfirm(m,cb) { document.getElementById('confirm-msg').innerText=m; const b=document.getElementById('confirm-yes-btn'); const n=b.cloneNode(true); b.parentNode.replaceChild(n,b); n.onclick=()=>{document.getElementById('confirm-modal').style.display='none';cb();}; document.getElementById('confirm-modal').style.display='flex'; }
// NEWS CRUD
function openNewsModal(id=null) { editingId=id; if(id){const i=newsData.find(n=>n.id===id); document.getElementById('news-input-title').value=i.title; document.getElementById('news-input-date').value=i.date; document.getElementById('news-input-badge').value=i.badge;}else{document.getElementById('news-input-title').value='';document.getElementById('news-input-date').value='';document.getElementById('news-input-badge').value='';} document.getElementById('news-modal').style.display='flex'; }
function closeNewsModal() { document.getElementById('news-modal').style.display = 'none'; }
function saveNews() { const t=document.getElementById('news-input-title').value; const d=document.getElementById('news-input-date').value; const b=document.getElementById('news-input-badge').value; if(t){ if(db){ if(editingId) db.collection("news").doc(editingId).update({title:t,date:d,badge:b}); else db.collection("news").add({title:t,date:d,badge:b,createdAt:Date.now()}); } else { if(editingId){const idx=newsData.findIndex(n=>n.id===editingId); newsData[idx]={id:editingId,title:t,date:d,badge:b};} else {newsData.unshift({id:"l"+Date.now(),title:t,date:d,badge:b});} saveLocal('cn_news',newsData); renderNews(); renderAdminLists(); } closeNewsModal(); showAlert("Success", "News saved!"); } }
function deleteNews(id) { showConfirm("Delete?", () => { if(db) db.collection("news").doc(id).delete(); else { newsData = newsData.filter(n => n.id !== id); saveLocal('cn_news', newsData); renderNews(); renderAdminLists(); } }); }
// RULES CRUD
function openRulesModal(id=null) { editingId=id; if(id){const i=rulesData.find(r=>r.id===id); document.getElementById('rule-input-title').value=i.title; document.getElementById('rule-input-desc').value=i.desc; document.getElementById('rule-input-penalty').value=i.penalty;}else{document.getElementById('rule-input-title').value='';document.getElementById('rule-input-desc').value='';document.getElementById('rule-input-penalty').value='';} document.getElementById('rules-modal').style.display='flex'; }
function closeRulesModal() { document.getElementById('rules-modal').style.display='none'; }
function saveRule() { const title=document.getElementById('rule-input-title').value; const desc=document.getElementById('rule-input-desc').value; const penalty=document.getElementById('rule-input-penalty').value; if(title){ if(db){ if(editingId) db.collection("rules").doc(editingId).update({title,desc,penalty}); else db.collection("rules").add({title,desc,penalty,createdAt:Date.now()}); } else { if(editingId){ const idx=rulesData.findIndex(r=>r.id===editingId); if(idx>-1) rulesData[idx]={id:editingId,title,desc,penalty}; } else { rulesData.push({id:"local_"+Date.now(),title,desc,penalty}); } saveLocal('cn_rules',rulesData); renderRules(); renderAdminLists(); } closeRulesModal(); showAlert("Success", "Rule saved!"); } }
function deleteRule(id) { showConfirm("Delete?", () => { if(db) db.collection("rules").doc(id).delete(); else { rulesData = rulesData.filter(r => r.id !== id); saveLocal('cn_rules', rulesData); renderRules(); renderAdminLists(); } }); }
// COIN CRUD
function openCoinModal(id=null) { editingId=id; if(id){const i=coinsData.find(c=>c.id===id); document.getElementById('coin-input-task').value=i.task; document.getElementById('coin-input-val').value=i.val;}else{document.getElementById('coin-input-task').value='';document.getElementById('coin-input-val').value='';} document.getElementById('coin-modal').style.display='flex'; }
function closeCoinModal() { document.getElementById('coin-modal').style.display='none'; }
function saveCoin() { const task=document.getElementById('coin-input-task').value; const val=document.getElementById('coin-input-val').value; if(task){ if(db){ if(editingId) db.collection("coins").doc(editingId).update({task,val}); else db.collection("coins").add({task,val}); } else { if(editingId){ const idx=coinsData.findIndex(c=>c.id===editingId); if(idx>-1) coinsData[idx]={id:editingId,task,val}; } else { coinsData.push({id:"local_"+Date.now(),task,val}); } saveLocal('cn_coins',coinsData); renderCoins(); renderAdminLists(); } closeCoinModal(); showAlert("Success", "Saved!"); } }
function deleteCoin(id) { showConfirm("Delete?", () => { if(db) db.collection("coins").doc(id).delete(); else { coinsData = coinsData.filter(c => c.id !== id); saveLocal('cn_coins', coinsData); renderCoins(); renderAdminLists(); } }); }
// CATALOG CRUD
function showAddCatModal() { editingCatId=null; document.getElementById('ce-name').value=''; document.getElementById('ce-cost').value=''; document.getElementById('ce-img').value=''; document.getElementById('ce-visible').checked=true; document.getElementById('cat-edit-modal').style.display='flex'; }
function editCatItem(id) { editingCatId=id; const i=catalogData.find(x=>x.id===id); if(!i)return; document.getElementById('ce-name').value=i.name; document.getElementById('ce-cost').value=i.cost; document.getElementById('ce-tier').value=i.tier; document.getElementById('ce-img').value=i.image||''; document.getElementById('ce-visible').checked=i.visible!==false; document.getElementById('cat-edit-modal').style.display='flex'; }
function saveCatItem() { const n=document.getElementById('ce-name').value; const c=document.getElementById('ce-cost').value; const t=document.getElementById('ce-tier').value; const im=document.getElementById('ce-img').value; const vis=document.getElementById('ce-visible').checked; if(n){ const d={name:n,cost:c,tier:t,icon:'fa-cube',type:'standard',image:im,visible:vis}; if(db){ if(editingCatId) db.collection("catalog").doc(editingCatId).update(d); else db.collection("catalog").add({...d,createdAt:Date.now()}); } else { if(editingCatId){ const idx=catalogData.findIndex(x=>x.id===editingCatId); if(idx>-1) catalogData[idx]={id:editingCatId,...d}; } else { catalogData.push({id:"local_"+Date.now(),...d}); } saveLocal('cn_catalog',catalogData); renderCatalog(); renderAdminLists(); } closeCatModal(); } }
function deleteCatItem(id) { showConfirm("Delete?",()=>{ if(db) db.collection("catalog").doc(id).delete(); else { catalogData=catalogData.filter(x=>x.id!==id); saveLocal('cn_catalog',catalogData); renderCatalog(); renderAdminLists(); } }); }
function closeCatModal() { document.getElementById('cat-edit-modal').style.display='none'; }
// QUEUE ACTIONS
function approveRequest(id) { const r = requestsData.find(x => x.id === id); if(r) { if(db) { db.collection("queue").add({name:r.name, item:r.item, status:"Pending", details:r.details, createdAt:Date.now()}); db.collection("requests").doc(id).delete(); } else { queueData.push({id:"local_"+Date.now(),name:r.name,item:r.item,status:"Pending",details:r.details}); requestsData=requestsData.filter(x=>x.id!==id); saveLocal('cn_requests',requestsData); saveLocal('cn_queue',queueData); renderAdminRequests(); renderQueue(); } } }
function deleteRequest(id) { if(db) db.collection("requests").doc(id).delete(); else { requestsData=requestsData.filter(x=>x.id!==id); saveLocal('cn_requests',requestsData); renderAdminRequests(); } }
function updateQueueStatus(id, s) { if(db){ if(s==='Picked Up') db.collection("queue").doc(id).delete(); else db.collection("queue").doc(id).update({status:s}); } else { let idx=-1; if(typeof id==='string' && id.startsWith('local_')) idx=queueData.findIndex(x=>x.id===id); else idx=parseInt(id); if(idx>-1 && queueData[idx]){ if(s==='Picked Up') queueData.splice(idx,1); else queueData[idx].status=s; saveLocal('cn_queue',queueData); renderQueue(); renderAdminLists(); } } }
function renderAdminRequests() { const c = document.getElementById('admin-requests-list'); if(!c) return; c.innerHTML = ''; if(requestsData.length === 0) c.innerHTML = '<p style="color:#666; padding:10px;">No pending requests.</p>'; requestsData.forEach(r => { c.innerHTML += `<div class="req-item"><div><strong>${r.name}</strong> - ${r.item}<br><span style="color:#aaa; font-size:0.7rem;">${r.details}</span></div><div class="req-actions"><button onclick="approveRequest('${r.id}')" style="background:#27ae60; color:white; border:none;">ADD</button><button onclick="deleteRequest('${r.id}')" class="btn-danger">X</button></div></div>`; }); }
// LB
function adminSearchNinja() { const q=document.getElementById('admin-lb-search').value.toLowerCase(); const r=document.getElementById('admin-lb-results'); r.innerHTML=''; if(q.length<2)return; const m=leaderboardData.filter(n=>n.name.toLowerCase().includes(q)); m.forEach(x=>r.innerHTML+=`<div class="admin-list-item" style="cursor:pointer;" onclick="selectNinja('${x.id}','${x.name}',${x.points})">${x.name} (${x.points})</div>`); }
function selectNinja(id,n,p) { editingNinjaId=id; document.getElementById('admin-lb-edit').style.display='block'; document.getElementById('admin-lb-name').innerText=n; document.getElementById('admin-lb-current').innerText=p; }
function adminUpdatePoints() { if(!editingNinjaId) return; const adj=parseInt(document.getElementById('admin-lb-adjust').value); const cur=parseInt(document.getElementById('admin-lb-current').innerText); const newT=cur+adj; if(db) db.collection("leaderboard").doc(editingNinjaId).update({points:newT}); else { const idx=leaderboardData.findIndex(x=>x.id===editingNinjaId); if(idx>-1) leaderboardData[idx].points=newT; saveLocal('cn_leaderboard',leaderboardData); } document.getElementById('admin-lb-current').innerText=newT; document.getElementById('admin-lb-adjust').value=''; showAlert("Success", "Points Updated!"); navigator.clipboard.writeText(newT); }
function adminAddNinja() { const name = document.getElementById('admin-lb-add-name').value; if(name) { if(db) db.collection("leaderboard").add({name, points: 0, belt: "White"}); else { leaderboardData.push({id:"local_"+Date.now(), name, points:0, belt:"White"}); saveLocal('cn_leaderboard', leaderboardData); renderLeaderboard(); renderAdminLbPreview(); } document.getElementById('admin-lb-add-name').value = ''; showAlert("Success", "Ninja Added!"); } }
function renderAdminLbPreview() { const p=document.getElementById('admin-lb-preview-list'); if(p) { p.innerHTML=''; const s=[...leaderboardData].sort((a,b)=>b.points-a.points).slice(0,5); s.forEach((n,i)=>p.innerHTML+=`<div class="req-item"><div>#${i+1} <strong>${n.name}</strong></div><div>${n.points}</div></div>`); } }

// INIT
subscribeToData();
