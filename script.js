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
let auth = null;
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        console.log("Firebase Initialized");
    }
} catch (e) {
    console.log("Demo Mode (No Firebase)");
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
let showHistory = false;
let currentUser = null;

// MOCK DATA (Fallback)
const defaultNews = [{ id: "n1", title: "Minecraft Night", date: "Nov 22", badge: "SOON" }];
const defaultRules = [{ id: "r1", title: "Respect", desc: "Respect equipment.", penalty: "-1 Coin" }];
const defaultCoins = [{ id: "c1", task: "Uniform", val: "+1", type: "silver" }];
const defaultCatalog = [{ id: "cat1", name: "Star", cost: "50 Coins", tier: "tier1", icon: "fa-star", type: "standard", visible: true }];
const mockLeaderboard = [{ id: "l1", name: "Asher Cullin", points: 1250, belt: "Blue" }];

// INIT
window.onload = function() {
    const savedUser = localStorage.getItem('cn_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        enterDashboard();
        if(currentUser.isAdmin) document.getElementById('floating-admin-toggle').style.display = 'flex';
    } else {
        document.getElementById('login-view').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }
    subscribeToData();
};

// CATALOG RENDERER (UPDATED)
function renderCatalog() {
    const c = document.getElementById('catalog-feed'); if(!c) return; c.innerHTML='';
    const f = catalogData.filter(i => i.tier === currentTier && i.visible !== false);
    if(f.length===0) c.innerHTML='<p style="color:#666;">No items.</p>';
    else f.forEach(i => {
        let img = i.image && i.image.length > 5 ? `<img src="${i.image}">` : `<i class="fa-solid ${i.icon}"></i>`;
        let btnAction = `onclick="initRequest('${i.id}')"`;
        // Standard items now open the modal too, but with different fields
        c.innerHTML += `
        <div class="store-card">
            <div class="store-icon-circle">${img}</div>
            <div class="store-info"><h4>${i.name}</h4><p>${i.cost}</p></div>
            <div class="store-action"><button class="btn-req" ${btnAction}>Request</button></div>
        </div>`;
    });
}

// REQUEST FLOW (UPDATED)
function initRequest(id) { 
    currentRequestItem = catalogData.find(x => x.id === id);
    if(!currentRequestItem) return;

    document.getElementById('req-item-name').innerText = currentRequestItem.name;
    document.getElementById('req-ninja-name').value = '';
    
    const dynamicContainer = document.getElementById('req-dynamic-fields');
    dynamicContainer.innerHTML = '';
    const imgContainer = document.getElementById('req-img-container');
    const gallery = document.getElementById('req-gallery');
    gallery.style.display = 'none'; gallery.innerHTML = ''; imgContainer.innerHTML = '';

    if (currentRequestItem.image && currentRequestItem.image.length > 0) imgContainer.innerHTML = `<img id="req-main-img" src="${currentRequestItem.image}">`;
    else imgContainer.innerHTML = `<i class="fa-solid ${currentRequestItem.icon}"></i>`;

    // PREMIUM LOGIC
    if (currentRequestItem.type !== 'standard') {
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
        if(currentRequestItem.type === 'custom' || currentRequestItem.type === 'premium_custom' || currentRequestItem.type === 'custom_multi') {
            dynamicContainer.innerHTML += `<label style="color:white; display:block; margin-bottom:5px; margin-top:10px;">Tinkercad Link:</label><input type="text" id="req-link" class="admin-input" placeholder="https://...">`;
            let colorOpts = `<option value="Standard">Standard (Any)</option>`;
            FILAMENT_COLORS.forEach(c => colorOpts += `<option value="${c}">${c}</option>`);
            dynamicContainer.innerHTML += `<label style="color:white; display:block; margin-bottom:5px; margin-top:10px;">Color (Specific colors +Cost):</label><select id="req-color" class="admin-input">${colorOpts}</select>`;
            if(currentRequestItem.type === 'custom_multi') dynamicContainer.innerHTML += `<p style="color:#e74c3c; font-size:0.8rem;">* Must be under 1.5 hours print time.</p>`;
        }
    } else {
        // STANDARD LOGIC
        dynamicContainer.innerHTML += `<p style="color:#aaa; font-size:0.8rem; margin-top:10px; text-align:center;">Enter your name to show interest in this item!</p>`;
    }
    document.getElementById('req-modal').style.display = 'flex'; 
}

function submitRequest() {
    const name = document.getElementById('req-ninja-name').value;
    if(!name) return showAlert("Error", "Name required");

    if(currentRequestItem.type === 'standard') {
        // Standard Interest Logic
        incrementInterest(currentRequestItem.id);
        closeReqModal();
        return; 
    }

    // Premium Queue Logic
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

    if(db) db.collection("queue").add(req);
    else {
        queueData.push({id: "local_" + Date.now(), ...req});
        saveLocal('cn_queue', queueData);
    }
    closeReqModal();
    showAlert("Success", "Added to Queue!");
    renderQueue();
}

// --- CSV PROCESSING FUNCTION (NEW) ---
function processCSVFile() {
    const fileInput = document.getElementById('csv-file-input');
    if (fileInput.files.length === 0) {
        return showAlert("Error", "No file selected.");
    }
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split('\n');
        const batch = db ? db.batch() : null;
        let count = 0;

        // Find Header Indices
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const fnameIdx = headers.indexOf("participant first name");
        const lnameIdx = headers.indexOf("participant last name");
        const rankIdx = headers.indexOf("rank");
        const memIdx = headers.indexOf("membership");
        const userIdx = headers.indexOf("ninja username");

        if (fnameIdx === -1 || lnameIdx === -1) {
            return showAlert("Error", "Invalid CSV Format. Headers missing.");
        }

        // Process Rows
        for (let i = 1; i < lines.length; i++) {
            // Basic CSV parsing (ignoring quotes for simplicity, usually fine for names)
            const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length < 2) continue;

            const fname = cols[fnameIdx];
            const lname = cols[lnameIdx];
            const rankVal = rankIdx > -1 ? cols[rankIdx] : "";
            const memVal = memIdx > -1 ? cols[memIdx] : "";
            const userVal = userIdx > -1 ? cols[userIdx] : "";

            // 1. Username Logic
            let finalUsername = userVal;
            if (!finalUsername) {
                finalUsername = `${fname}.${lname}`.replace(/\s+/g, '.');
            }

            // 2. Program/Rank Logic
            let finalRank = "White"; // Default
            
            if (memVal.includes("CODE NINJAS: CREATE")) {
                // Extract Belt Color (e.g., "Yellow Belt" -> "Yellow")
                if(rankVal) {
                    const parts = rankVal.split(' ');
                    if(parts.length > 0) finalRank = parts[0]; 
                }
            } else if (memVal.includes("Robotics")) {
                finalRank = "Robotics"; 
            } else if (memVal.includes("AI")) {
                finalRank = "AI";
            } else if (memVal.includes("JR")) {
                finalRank = "JR";
            }

            // 3. Update Database (Add if new, or overwrite points? Usually overwrite roster props, keep points)
            // For simplicity in this batch, we set points to 0 if new, or keep if exists.
            // In a real app, we'd query by name first. Here we just ADD to local or batch.
            
            const ninjaData = {
                name: finalUsername,
                rank: finalRank,
                // points: 0 // Ideally don't overwrite points if they exist
            };
            
            if(db) {
                // We can't easily check existence in a batch without reading first.
                // Strategy: Just add to a specific collection 'roster_import' or update logic later.
                // For now: Add new doc.
                const ref = db.collection("leaderboard").doc(); // Auto-ID
                batch.set(ref, { ...ninjaData, points: 0, belt: finalRank }); 
            } else {
                leaderboardData.push({ id: "local_" + Date.now() + i, ...ninjaData, points: 0, belt: finalRank });
            }
            count++;
        }

        if(db) {
            batch.commit().then(() => showAlert("Success", `Imported ${count} Ninjas!`));
        } else {
            saveLocal('cn_leaderboard', leaderboardData);
            renderLeaderboard();
            showAlert("Success", `Imported ${count} Ninjas (Local)!`);
        }
    };

    reader.readAsText(file);
}

// --- HELPER: ICON MAPPER FOR PROGRAMS ---
// We need to update getBeltColor to handle the new programs
function getBeltColor(belt) {
    const b = (belt || 'white').toLowerCase();
    // Standard Belts
    const map = { 'white': 'var(--belt-white)', 'yellow': 'var(--belt-yellow)', 'orange': 'var(--belt-orange)', 'green': 'var(--belt-green)', 'blue': 'var(--belt-blue)', 'purple': 'var(--belt-purple)', 'brown': 'var(--belt-brown)', 'red': 'var(--belt-red)', 'black': 'var(--belt-black)' };
    if(map[b]) return map[b];
    
    // Special Programs (We return a color, but we might want to change the ICON in renderLeaderboard)
    if(b.includes('robot')) return '#e74c3c'; // Red for Robotics?
    if(b.includes('ai')) return '#9b59b6'; // Purple for AI
    if(b.includes('jr')) return '#f1c40f'; // Yellow for JR
    
    return 'var(--belt-white)';
}

// UPDATED RENDER LEADERBOARD TO SHOW SPECIAL ICONS
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
        // Dynamic Icon
        let iconClass = 'fa-user-ninja';
        if(item.belt === 'Robotics') iconClass = 'fa-robot';
        if(item.belt === 'AI') iconClass = 'fa-microchip';
        if(item.belt === 'JR') iconClass = 'fa-child';
        
        podium.innerHTML += `<div class="lb-card rank-${item.rank}"><div class="lb-badge">${item.rank}</div><div class="lb-icon" style="border-color: ${beltColor}"><i class="fa-solid ${iconClass}" style="color: ${beltColor}"></i></div><div class="lb-name">${item.name}</div><div class="lb-points">${item.points} pts</div></div>`;
    });

    sorted.slice(3).forEach((item, index) => {
        const beltColor = getBeltColor(item.belt);
        let iconClass = 'fa-user-ninja';
        if(item.belt === 'Robotics') iconClass = 'fa-robot';
        if(item.belt === 'AI') iconClass = 'fa-microchip';
        if(item.belt === 'JR') iconClass = 'fa-child';

        list.innerHTML += `<div class="lb-row"><div class="lb-row-rank">#${index + 4}</div><div class="lb-row-belt" style="border-color: ${beltColor}"><i class="fa-solid ${iconClass}" style="color: ${beltColor}"></i></div><div class="lb-row-name">${item.name}</div><div class="lb-row-points">${item.points}</div></div>`;
    });
    renderAdminLbPreview();
}

// ... (Rest of standard functions: subscribeToData, renderNews/Rules/Coins, Admin Lists, Auth, etc.) ...
// These remain identical to the previous correct implementation.
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
        refreshAll();
    }
}
function renderNews() { const c = document.getElementById('news-feed'); if(c) { c.innerHTML=''; newsData.forEach(i=>c.innerHTML+=`<div class="list-card passed"><div class="card-info"><h3>${i.title}</h3><p>${i.date}</p></div><div class="status-badge" style="color:var(--color-games)">${i.badge} ></div></div>`); } }
function renderRules() { const c = document.getElementById('rules-feed'); if(c) { c.innerHTML=''; rulesData.forEach(r=>c.innerHTML+=`<div class="list-card pending"><div class="card-info"><h3>${r.title}</h3><p>${r.desc}</p></div>${r.penalty?`<div class="status-badge" style="color:#e74c3c;border:1px solid #e74c3c;">${r.penalty}</div>`:''}</div>`); } }
function renderCoins() { const c = document.getElementById('coin-feed'); if(c) { c.innerHTML=''; coinsData.forEach(i=>c.innerHTML+=`<li class="coin-item"><span>${i.task}</span><div>${formatCoinBreakdown(i.val)}</div></li>`); } }
function renderJams() { const c = document.getElementById('jams-feed'); if(!c) return; c.innerHTML=''; jamsData.forEach(j => { let cl = 'alert', txt = 'ACTIVE >', col = 'var(--color-jams)'; if(j.status === 'waiting') { cl='pending'; txt='WAITING >'; col='#aaa'; } if(j.status === 'results') { cl='passed'; txt='RESULTS >'; col='#2ecc71'; } c.innerHTML += `<div class="list-card ${cl}" onclick="openJamModal('${j.id}')" style="cursor:pointer;"><div class="card-info"><h3>${j.title}</h3><p>${j.deadline}</p></div><div class="status-badge" style="color:${col}">${txt}</div></div>`; }); }
function renderAdminLists() { const nList=document.getElementById('admin-news-list'); if(nList){ nList.innerHTML=''; newsData.forEach(n=>nList.innerHTML+=`<div class="admin-list-wrapper"><div class="list-card passed" style="pointer-events:none; margin:0;"><div class="card-info"><h3>${n.title}</h3><p>${n.date}</p></div><div class="status-badge" style="color:var(--color-games)">${n.badge} ></div></div><button onclick="openNewsModal('${n.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteNews('${n.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div>`); } const rList=document.getElementById('admin-rules-list'); if(rList){ rList.innerHTML=''; rulesData.forEach(r=>{ const b=r.penalty?`<div class="status-badge" style="color:#e74c3c;border:1px solid #e74c3c;">${r.penalty}</div>`:''; rList.innerHTML+=`<div class="admin-list-wrapper"><div class="list-card pending" style="pointer-events:none; margin:0;"><div class="card-info"><h3>${r.title}</h3><p>${r.desc}</p></div>${b}</div><button onclick="openRulesModal('${r.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteRule('${r.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div>`; }); } const cList=document.getElementById('admin-coins-list'); if(cList){ cList.innerHTML=''; coinsData.forEach(c=>cList.innerHTML+=`<div class="admin-list-wrapper"><div style="flex-grow:1;background:#161932;padding:10px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;"><span style="color:white;font-weight:bold;">${c.task}</span><div>${formatCoinBreakdown(c.val)}</div></div><button onclick="openCoinModal('${c.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteCoin('${c.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div>`); } const catList=document.getElementById('admin-cat-list'); if(catList){ catList.innerHTML=''; const st=catalogData.filter(c=>c.type==='standard'); if(st.length>0){ catList.innerHTML+=`<div class="admin-tier-header">Interest</div>`; st.forEach(s=>catList.innerHTML+=`<div class="interest-item"><span>${s.name}</span><span class="interest-count">${s.interest||0} Requests</span></div>`); } const tiers=['tier1','tier2','tier3','tier4']; const tierNames={'tier1':'Tier 1','tier2':'Tier 2','tier3':'Tier 3','tier4':'Tier 4'}; tiers.forEach(t=>{ catList.innerHTML+=`<div class="admin-tier-header">${tierNames[t]}</div>`; let g=`<div class="admin-store-grid">`; catalogData.filter(i=>i.tier===t).forEach(i=>{ let img=i.image&&i.image.length>5?`<img src="${i.image}">`:`<i class="fa-solid ${i.icon}"></i>`; let h=i.visible===false?'hidden':''; g+=`<div class="admin-store-card ${h}"><div class="admin-store-icon">${img}</div><div style="flex-grow:1;"><h4 style="margin:0;color:white;font-size:0.9rem;">${i.name}</h4><p style="margin:0;color:#888;font-size:0.8rem;">${i.cost}</p></div><div class="admin-store-actions"><button onclick="editCatItem('${i.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteCatItem('${i.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div></div>`; }); g+=`</div>`; catList.innerHTML+=g; }); } renderAdminRequests(); const qList=document.getElementById('admin-queue-manage-list'); if(qList){ qList.innerHTML=''; queueData.filter(q=>q.status!=='Picked Up').forEach(q=>{ const id=q.id?`'${q.id}'`:`'${queueData.indexOf(q)}'`; qList.innerHTML+=`<div class="admin-list-item" style="display:block;"><div style="display:flex;justify-content:space-between;"><strong>${q.name}</strong> <span>${q.status}</span></div><div style="color:#aaa;font-size:0.8rem;">${q.item} ${q.details?'| '+q.details:''}</div><div style="margin-top:5px;"><button onclick="updateQueueStatus(${id},'Waiting for Payment')" class="admin-btn" style="width:auto;padding:2px 5px;font-size:0.7rem;background:#e74c3c;">Pay</button><button onclick="updateQueueStatus(${id},'Pending')" class="admin-btn" style="width:auto;padding:2px 5px;font-size:0.7rem;background:#555;">Pend</button><button onclick="updateQueueStatus(${id},'Printing')" class="admin-btn" style="width:auto;padding:2px 5px;font-size:0.7rem;background:#9b59b6;">Print</button><button onclick="updateQueueStatus(${id},'Ready!')" class="admin-btn" style="width:auto;padding:2px 5px;font-size:0.7rem;background:#2ecc71;">Ready</button><button onclick="updateQueueStatus(${id},'Picked Up')" class="admin-btn" style="width:auto;padding:2px 5px;font-size:0.7rem;background:#1abc9c;">Done</button></div></div>`; }); } renderAdminLbPreview(); }
function openNewsModal(id=null) { editingId=id; if(id){const i=newsData.find(n=>n.id===id); document.getElementById('news-input-title').value=i.title; document.getElementById('news-input-date').value=i.date; document.getElementById('news-input-badge').value=i.badge;}else{document.getElementById('news-input-title').value='';document.getElementById('news-input-date').value='';document.getElementById('news-input-badge').value='';} document.getElementById('news-modal').style.display='flex'; }
function closeNewsModal() { document.getElementById('news-modal').style.display = 'none'; }
function saveNews() { const t=document.getElementById('news-input-title').value; const d=document.getElementById('news-input-date').value; const b=document.getElementById('news-input-badge').value; if(t){ if(db){ if(editingId) db.collection("news").doc(editingId).update({title:t,date:d,badge:b}); else db.collection("news").add({title:t,date:d,badge:b,createdAt:Date.now()}); } else { if(editingId){const idx=newsData.findIndex(n=>n.id===editingId); newsData[idx]={id:editingId,title:t,date:d,badge:b};} else {newsData.unshift({id:"l"+Date.now(),title:t,date:d,badge:b});} saveLocal('cn_news',newsData); renderNews(); renderAdminLists(); } closeNewsModal(); showAlert("Success", "News saved!"); } }
function deleteNews(id) { showConfirm("Delete?", () => { if(db) db.collection("news").doc(id).delete(); else { newsData = newsData.filter(n => n.id !== id); saveLocal('cn_news', newsData); renderNews(); renderAdminLists(); } }); }
function openRulesModal(id=null) { editingId=id; if(id){const i=rulesData.find(r=>r.id===id); document.getElementById('rule-input-title').value=i.title; document.getElementById('rule-input-desc').value=i.desc; document.getElementById('rule-input-penalty').value=i.penalty;}else{document.getElementById('rule-input-title').value='';document.getElementById('rule-input-desc').value='';document.getElementById('rule-input-penalty').value='';} document.getElementById('rules-modal').style.display='flex'; }
function closeRulesModal() { document.getElementById('rules-modal').style.display='none'; }
function saveRule() { const title=document.getElementById('rule-input-title').value; const desc=document.getElementById('rule-input-desc').value; const penalty=document.getElementById('rule-input-penalty').value; if(title){ if(db){ if(editingId) db.collection("rules").doc(editingId).update({title,desc,penalty}); else db.collection("rules").add({title,desc,penalty,createdAt:Date.now()}); } else { if(editingId){ const idx=rulesData.findIndex(r=>r.id===editingId); if(idx>-1) rulesData[idx]={id:editingId,title,desc,penalty}; } else { rulesData.push({id:"local_"+Date.now(),title,desc,penalty}); } saveLocal('cn_rules',rulesData); renderRules(); renderAdminLists(); } closeRulesModal(); showAlert("Success", "Rule saved!"); } }
function deleteRule(id) { showConfirm("Delete?", () => { if(db) db.collection("rules").doc(id).delete(); else { rulesData = rulesData.filter(r => r.id !== id); saveLocal('cn_rules', rulesData); renderRules(); renderAdminLists(); } }); }
function openCoinModal(id=null) { editingId=id; if(id){const i=coinsData.find(c=>c.id===id); document.getElementById('coin-input-task').value=i.task; document.getElementById('coin-input-val').value=i.val;}else{document.getElementById('coin-input-task').value='';document.getElementById('coin-input-val').value='';} document.getElementById('coin-modal').style.display='flex'; }
function closeCoinModal() { document.getElementById('coin-modal').style.display='none'; }
function saveCoin() { const task=document.getElementById('coin-input-task').value; const val=document.getElementById('coin-input-val').value; if(task){ if(db){ if(editingId) db.collection("coins").doc(editingId).update({task,val}); else db.collection("coins").add({task,val}); } else { if(editingId){ const idx=coinsData.findIndex(c=>c.id===editingId); if(idx>-1) coinsData[idx]={id:editingId,task,val}; } else { coinsData.push({id:"local_"+Date.now(),task,val}); } saveLocal('cn_coins',coinsData); renderCoins(); renderAdminLists(); } closeCoinModal(); showAlert("Success", "Task saved!"); } }
function deleteCoin(id) { showConfirm("Delete?", () => { if(db) db.collection("coins").doc(id).delete(); else { coinsData = coinsData.filter(c => c.id !== id); saveLocal('cn_coins', coinsData); renderCoins(); renderAdminLists(); } }); }
function showAddCatModal() { editingCatId=null; document.getElementById('ce-name').value=''; document.getElementById('ce-cost').value=''; document.getElementById('ce-img').value=''; document.getElementById('ce-visible').checked=true; document.getElementById('cat-edit-modal').style.display='flex'; }
function editCatItem(id) { editingCatId=id; const i=catalogData.find(x=>x.id===id); if(!i)return; document.getElementById('ce-name').value=i.name; document.getElementById('ce-cost').value=i.cost; document.getElementById('ce-tier').value=i.tier; document.getElementById('ce-img').value=i.image||''; document.getElementById('ce-visible').checked=i.visible!==false; document.getElementById('ce-type').value=i.type||'standard'; toggleCatOptions(i.type); if(i.options) document.getElementById('ce-options').value=i.options.join(', '); renderVariationInputs(i.variationImages); document.getElementById('cat-edit-modal').style.display='flex'; }
function saveCatItem() { const n=document.getElementById('ce-name').value; const c=document.getElementById('ce-cost').value; const t=document.getElementById('ce-tier').value; const im=document.getElementById('ce-img').value; const vis=document.getElementById('ce-visible').checked; const type=document.getElementById('ce-type').value; let options=[], variationImages={}; if(type==='premium_variant'){ options=document.getElementById('ce-options').value.split(',').map(s=>s.trim()).filter(s=>s); document.querySelectorAll('.var-img-input').forEach(input=>{ if(input.value) variationImages[input.dataset.opt]=input.value; }); } if(n){ const d={name:n,cost:c,tier:t,icon:'fa-cube',type:type,image:im,visible:vis,options,variationImages}; if(db){ if(editingCatId) db.collection("catalog").doc(editingCatId).update(d); else db.collection("catalog").add({...d,createdAt:Date.now(),interest:0}); } else { if(editingCatId){ const idx=catalogData.findIndex(x=>x.id===editingCatId); if(idx>-1) catalogData[idx]={id:editingCatId,...d}; } else { catalogData.push({id:"local_"+Date.now(),...d,interest:0}); } saveLocal('cn_catalog',catalogData); renderCatalog(); renderAdminLists(); } closeCatModal(); } }
function deleteCatItem(id) { if(confirm("Delete?")) { if(db) db.collection("catalog").doc(id).delete(); else { catalogData=catalogData.filter(x=>x.id!==id); saveLocal('cn_catalog',catalogData); renderCatalog(); renderAdminLists(); } } }
function closeCatModal() { document.getElementById('cat-edit-modal').style.display='none'; }
function toggleCatOptions(v) { document.getElementById('ce-options-container').style.display = v === 'premium_variant' ? 'block' : 'none'; }
function renderVariationInputs(existingImages = {}) { const optStr = document.getElementById('ce-options').value; const container = document.getElementById('ce-variation-images'); container.innerHTML = ''; if (!optStr) return; const opts = optStr.split(',').map(s => s.trim()).filter(s => s); opts.forEach(opt => { const val = existingImages[opt] || ''; container.innerHTML += `<label style="color:#aaa; font-size:0.7rem;">Image for "${opt}":</label><input type="text" class="admin-input var-img-input" data-opt="${opt}" value="${val}" placeholder="https://...">`; }); }
function toggleHistoryView() { showHistory=!showHistory; const b=document.querySelector('#admin-queue .btn-edit'); if(b) b.innerText=showHistory?"Hide History":"History"; const h=document.getElementById('admin-queue-history-list'); if(h){h.style.display=showHistory?'block':'none';renderQueueHistory();} }
function renderQueueHistory() { const h=document.getElementById('history-content'); if(!h)return; h.innerHTML=''; const p=queueData.filter(q=>q.status==='Picked Up'); if(p.length===0)h.innerHTML='<p style="color:#666;font-size:0.8rem;">No history.</p>'; else p.forEach(q=>h.innerHTML+=`<div class="admin-list-item" style="opacity:0.6"><strong>${q.name}</strong> - ${q.item} <span style="font-size:0.7rem">${q.createdAt?new Date(q.createdAt).toLocaleDateString():'N/A'}</span></div>`); }
function incrementInterest(id) { if(db) db.collection("catalog").doc(id).update({interest: firebase.firestore.FieldValue.increment(1)}); else { const idx=catalogData.findIndex(x=>x.id===id); if(idx>-1){ catalogData[idx].interest=(catalogData[idx].interest||0)+1; saveLocal('cn_catalog',catalogData); renderAdminLists(); } } showAlert("Recorded","Interest logged!"); }
function updateReqImage(url, styleName) { const img = document.getElementById('req-main-img'); if(img) img.src = url; const sel = document.getElementById('req-var'); if(sel) sel.value = styleName; }
function updateReqImageFromSelect(val) { if(currentRequestItem.variationImages && currentRequestItem.variationImages[val]) { const img = document.getElementById('req-main-img'); if(img) img.src = currentRequestItem.variationImages[val]; } }
function adminSearchNinja() { const q=document.getElementById('admin-lb-search').value.toLowerCase(); const r=document.getElementById('admin-lb-results'); r.innerHTML=''; if(q.length<2)return; const m=leaderboardData.filter(n=>n.name.toLowerCase().includes(q)); m.forEach(x=>r.innerHTML+=`<div class="admin-list-item" style="cursor:pointer;" onclick="selectNinja('${x.id}','${x.name}',${x.points})">${x.name} (${x.points})</div>`); }
function selectNinja(id,n,p) { editingNinjaId=id; document.getElementById('admin-lb-edit').style.display='block'; document.getElementById('admin-lb-name').innerText=n; document.getElementById('admin-lb-current').innerText=p; }
function adminUpdatePoints() { if(!editingNinjaId)return; const adj=parseInt(document.getElementById('admin-lb-adjust').value); const cur=parseInt(document.getElementById('admin-lb-current').innerText); const newT=cur+adj; if(db) db.collection("leaderboard").doc(editingNinjaId).update({points:newT}); else { const idx=leaderboardData.findIndex(x=>x.id===editingNinjaId); if(idx>-1) leaderboardData[idx].points=newT; saveLocal('cn_leaderboard',leaderboardData); } document.getElementById('admin-lb-current').innerText=newT; document.getElementById('admin-lb-adjust').value=''; showAlert("Success","Updated!"); navigator.clipboard.writeText(newT); }
function adminAddNinja() { const name=document.getElementById('admin-lb-add-name').value; if(name){ if(db) db.collection("leaderboard").add({name,points:0,belt:"White"}); else { leaderboardData.push({id:"local_"+Date.now(),name,points:0,belt:"White"}); saveLocal('cn_leaderboard',leaderboardData); renderLeaderboard(); renderAdminLbPreview(); } document.getElementById('admin-lb-add-name').value=''; showAlert("Success","Added!"); } }
function renderAdminLbPreview() { const p=document.getElementById('admin-lb-preview-list'); if(p) { p.innerHTML=''; const s=[...leaderboardData].sort((a,b)=>b.points-a.points).slice(0,5); s.forEach((n,i)=>p.innerHTML+=`<div class="req-item"><div>#${i+1} <strong>${n.name}</strong></div><div>${n.points}</div></div>`); } }
function approveRequest(id) { const r = requestsData.find(x => x.id === id); if(r) { if(db) { db.collection("queue").add({name:r.name, item:r.item, status:"Waiting for Payment", details:r.details, createdAt:Date.now()}); db.collection("requests").doc(id).delete(); } else { queueData.push({id:"local_"+Date.now(),name:r.name,item:r.item,status:"Waiting for Payment",details:r.details}); requestsData=requestsData.filter(x=>x.id!==id); saveLocal('cn_requests',requestsData); saveLocal('cn_queue',queueData); renderAdminRequests(); renderQueue(); } } }
function deleteRequest(id) { if(db) db.collection("requests").doc(id).delete(); else { requestsData=requestsData.filter(x=>x.id!==id); saveLocal('cn_requests',requestsData); renderAdminRequests(); } }
function renderAdminRequests() { const c = document.getElementById('admin-requests-list'); if(!c) return; c.innerHTML = ''; if(requestsData.length === 0) c.innerHTML = '<p style="color:#666; padding:10px;">No pending requests.</p>'; requestsData.forEach((r) => { c.innerHTML += `<div class="req-item"><div><strong>${r.name}</strong> - ${r.item}<br><span style="color:#aaa; font-size:0.7rem;">${r.details}</span></div><div class="req-actions"><button onclick="approveRequest('${r.id}')" style="background:#27ae60; color:white; border:none;">ADD</button><button onclick="deleteRequest('${r.id}')" class="btn-danger">X</button></div></div>`; }); }
function toggleAdminLogin() { const n=document.getElementById('ninja-login-form'), a=document.getElementById('admin-login-form'); if(n.style.display==='none'){n.style.display='block';a.style.display='none';}else{n.style.display='none';a.style.display='block';} }
function attemptNinjaLogin() { const n=document.getElementById('login-username').value.trim(); if(!n)return; const u=leaderboardData.find(l=>l.name.toLowerCase()===n.toLowerCase()); if(u){currentUser=u;localStorage.setItem('cn_user',JSON.stringify(u));enterDashboard();}else document.getElementById('login-error-msg').style.display='block'; }
function attemptAdminLogin() { const e=document.getElementById('admin-email').value, p=document.getElementById('admin-pass').value; if(auth){ auth.signInWithEmailAndPassword(e,p).then(()=>{currentUser={name:"Sensei",isAdmin:true};localStorage.setItem('cn_user',JSON.stringify(currentUser));enterDashboard();document.getElementById('admin-view').classList.add('active');}).catch(err=>document.getElementById('login-error-msg').style.display='block'); } else { if(p==="@2633Ninjas"){currentUser={name:"Sensei",isAdmin:true};localStorage.setItem('cn_user',JSON.stringify(currentUser));enterDashboard();document.getElementById('admin-view').classList.add('active');}else document.getElementById('login-error-msg').style.display='block'; } }
function enterDashboard() { document.getElementById('login-view').style.display='none'; document.getElementById('main-app').style.display='flex'; document.getElementById('current-user-name').innerText=currentUser.name.split(' ')[0]; if(currentUser.isAdmin) document.getElementById('floating-admin-toggle').style.display='flex'; refreshAll(); }
function logout() { localStorage.removeItem('cn_user'); currentUser=null; if(auth)auth.signOut(); location.reload(); }
function toggleUserView() { document.getElementById('admin-view').classList.remove('active'); document.getElementById('floating-admin-toggle').style.display='flex'; }
function restoreAdminView() { document.getElementById('admin-view').classList.add('active'); }
function showAlert(t,m) { document.getElementById('alert-title').innerText=t; document.getElementById('alert-msg').innerText=m; document.getElementById('alert-modal').style.display='flex'; }
function showConfirm(m,cb) { document.getElementById('confirm-msg').innerText=m; const b=document.getElementById('confirm-yes-btn'); const n=b.cloneNode(true); b.parentNode.replaceChild(n,b); n.onclick=()=>{document.getElementById('confirm-modal').style.display='none';cb();}; document.getElementById('confirm-modal').style.display='flex'; }
function showTab(id,el) { document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active')); document.getElementById(id).classList.add('active'); document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); el.classList.add('active'); }
function filterCatalog(t,b) { currentTier=t; document.querySelectorAll('.tier-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); renderCatalog(); }
function initRequest(id) { currentRequestItem=catalogData.find(x=>x.id===id); document.getElementById('req-item-name').innerText=currentRequestItem.name; document.getElementById('req-modal').style.display='flex'; }
function closeReqModal() { document.getElementById('req-modal').style.display='none'; }
function submitRequest() { const name = document.getElementById('req-ninja-name').value; if(!name) return showAlert("Error","Name required"); let details = "Standard"; if(document.getElementById('req-color')) details = "Color: " + document.getElementById('req-color').value; const req={name, item: currentRequestItem.name, details, time: new Date().toLocaleString(), createdAt:Date.now()}; if(db) db.collection("requests").add(req); else { requestsData.push({id: "local_" + Date.now(), ...req}); saveLocal('cn_requests', requestsData); } closeReqModal(); showAlert("Success", "Sent!"); }
function openJamModal(id) { const j=jamsData.find(x=>x.id===id); if(!j)return; document.getElementById('modal-title').innerText=j.title; document.getElementById('modal-desc').innerText=`Details for ${j.title}`; document.getElementById('modal-deadline').innerText=j.deadline; document.getElementById('jam-modal').style.display='flex'; }
function closeJamModal() { document.getElementById('jam-modal').style.display='none'; }
function openGitHubUpload() { if (GITHUB_REPO_URL.includes("github.com")) window.open(GITHUB_REPO_URL.replace(/\/$/, "") + "/upload/main", '_blank'); else showAlert("Error", "Configure GITHUB_REPO_URL"); }
function handleLogoClick() { if(window.innerWidth < 768) return; clickCount++; clearTimeout(clickTimer); clickTimer = setTimeout(() => { clickCount = 0; }, 2000); if(clickCount === 3) { clickCount = 0; document.getElementById('admin-auth-modal').style.display = 'flex'; document.getElementById('admin-auth-input').focus(); } }
function closeAdminAuthModal() { document.getElementById('admin-auth-modal').style.display = 'none'; }
function submitAdminAuth() { if(document.getElementById('admin-auth-input').value==="@2633Ninjas"){ document.getElementById('admin-auth-input').value=''; closeAdminAuthModal(); currentUser = {name:"Sensei", isAdmin:true}; localStorage.setItem('cn_user',JSON.stringify(currentUser)); enterDashboard(); document.getElementById('admin-view').classList.add('active'); } else { showAlert("Error", "Access Denied"); } }
function exitAdmin() { document.getElementById('admin-view').classList.remove('active'); }
function showAdminSection(id, btn) { document.querySelectorAll('.admin-section').forEach(e => e.classList.remove('active')); document.getElementById(id).classList.add('active'); document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderAdminLists(); }
function refreshAll() { renderNews(); renderJams(); renderRules(); renderCoins(); renderCatalog(); renderQueue(); renderLeaderboard(); renderAdminLists(); }

// INIT
subscribeToData();
