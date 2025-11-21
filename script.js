// --- FIREBASE CONFIGURATION ---
// WARNING: Ensure you restrict these keys in your Google Cloud Console if this goes public.
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
// Updated with your specific inventory
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

// LOCAL STATE
let newsData = [], jamsData = [], rulesData = [], coinsData = [], catalogData = [], requestsData = [], queueData = [], leaderboardData = [];
let currentTier = 'tier1';
let currentRequestItem = null;
let editingCatId = null;
let editingId = null; 
let editingNinjaId = null;
let showHistory = false;
let currentUser = null;
let clickCount = 0;
let clickTimer;

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
        queueData = JSON.parse(localStorage.getItem('cn_queue')) || [];
        leaderboardData = JSON.parse(localStorage.getItem('cn_leaderboard')) || mockLeaderboard;
        refreshAll();
    }
}

// --- CSV PROCESSOR ---
function processCSVFile() {
    const fileInput = document.getElementById('csv-file-input');
    if (fileInput.files.length === 0) return showAlert("Error", "No file selected.");
    
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split('\n');
        const batch = db ? db.batch() : null;
        let count = 0;
        let localBatch = [];

        if (lines.length < 2) return showAlert("Error", "Empty CSV");

        // Find Header Indices
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
        const fnameIdx = headers.indexOf("participant first name");
        const lnameIdx = headers.indexOf("participant last name");
        const rankIdx = headers.indexOf("rank");
        const memIdx = headers.indexOf("membership");
        const userIdx = headers.indexOf("ninja username");

        if (fnameIdx === -1 || lnameIdx === -1) {
            return showAlert("Error", "Invalid CSV Format. Headers missing.");
        }

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            // Split by comma, ignoring commas inside quotes
            const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            
            const clean = (val) => val ? val.replace(/^"|"$/g, '').trim() : '';
            const fname = clean(cols[fnameIdx]);
            const lname = clean(cols[lnameIdx]);
            const rankVal = rankIdx > -1 ? clean(cols[rankIdx]) : "";
            const memVal = memIdx > -1 ? clean(cols[memIdx]) : "";
            const userVal = userIdx > -1 ? clean(cols[userIdx]) : "";

            if (!fname) continue;

            let finalUsername = userVal;
            if (!finalUsername || finalUsername.length < 2) {
                finalUsername = `${fname}.${lname}`.replace(/\s+/g, '.');
            }

            let finalRank = "White"; 
            if (memVal.includes("CODE NINJAS: CREATE")) {
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

            const ninjaData = {
                name: finalUsername,
                belt: finalRank,
                // points: 0 // Keeping points as is if existing, otherwise 0
            };
            
            if(db) {
                const ref = db.collection("leaderboard").doc(); 
                batch.set(ref, { ...ninjaData, points: 0 }); 
            } else {
                localBatch.push({ id: "local_" + Date.now() + i, ...ninjaData, points: 0 });
            }
            count++;
        }

        if(db) {
            batch.commit().then(() => showAlert("Success", `Imported ${count} Ninjas!`));
        } else {
            leaderboardData = localBatch; 
            saveLocal('cn_leaderboard', leaderboardData);
            renderLeaderboard();
            showAlert("Success", `Imported ${count} Ninjas (Local)!`);
        }
    };
    reader.readAsText(file);
}

// --- CATALOG ADMIN FUNCTIONS ---
function showAddCatModal() { 
    editingCatId = null; 
    document.getElementById('ce-name').value=''; 
    document.getElementById('ce-cost').value=''; 
    document.getElementById('ce-img').value=''; 
    document.getElementById('ce-visible').checked=true; 
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
    document.getElementById('ce-visible').checked = item.visible !== false;
    
    const typeSelect = document.getElementById('ce-type');
    if(typeSelect) {
        typeSelect.value = item.type || 'standard';
        toggleCatOptions(item.type);
    }
    
    if (item.options) document.getElementById('ce-options').value = item.options.join(', ');
    
    document.getElementById('cat-edit-modal').style.display='flex'; 
}

function saveCatItem() {
    const n = document.getElementById('ce-name').value; 
    const c = document.getElementById('ce-cost').value; 
    const t = document.getElementById('ce-tier').value; 
    const im = document.getElementById('ce-img').value;
    const vis = document.getElementById('ce-visible').checked;
    const type = document.getElementById('ce-type').value;
    
    let options = [];
    if (type === 'premium_variant') {
        const optStr = document.getElementById('ce-options').value;
        if(optStr) options = optStr.split(',').map(s => s.trim()).filter(s => s);
    }
    
    if(n) { 
        const data = {name:n, cost:c, tier:t, icon:'fa-cube', type:type, image:im, visible:vis, options: options};
        
        if(db) { 
            if(editingCatId) db.collection("catalog").doc(editingCatId).update(data); 
            else db.collection("catalog").add({...data, createdAt: Date.now(), interest: 0}); 
        } else { 
            if(editingCatId) { 
                const idx = catalogData.findIndex(x => x.id === editingCatId); 
                if(idx > -1) catalogData[idx] = {id: editingCatId, ...data}; 
            } else { 
                catalogData.push({id: "local_" + Date.now(), ...data, interest: 0}); 
            } 
            saveLocal('cn_catalog', catalogData); renderCatalog(); renderAdminLists(); 
        } 
        closeCatModal(); 
    }
}

function deleteCatItem(id) { 
    showConfirm("Delete?", () => { 
        if(db) db.collection("catalog").doc(id).delete(); 
        else { 
            catalogData = catalogData.filter(x => x.id !== id); 
            saveLocal('cn_catalog', catalogData); 
            renderCatalog(); renderAdminLists(); 
        } 
    }); 
}

function closeCatModal() { document.getElementById('cat-edit-modal').style.display='none'; }
function toggleCatOptions(v) { document.getElementById('ce-options-container').style.display = v === 'premium_variant' ? 'block' : 'none'; }
function renderVariationInputs() { /* No op for simplicity unless needed */ }

// --- HELPER: FORMAT NAME (First Name + Last Initial) ---
function formatName(name) {
    if (!name) return 'Ninja';
    // Handle both "John Doe" and "john.doe" formats
    const clean = name.replace(/\./g, ' '); 
    const parts = clean.split(' ').filter(p => p.length > 0);
    
    if (parts.length === 0) return 'Ninja';
    if (parts.length === 1) return capitalize(parts[0]);
    
    const first = capitalize(parts[0]);
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    
    return `${first} ${lastInitial}.`;
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// --- RENDERERS ---
function renderNews() { 
    const c = document.getElementById('news-feed'); 
    if(c) { 
        c.innerHTML=''; 
        newsData.forEach(i => {
            c.innerHTML+=`<div class="list-card passed"><div class="card-info"><h3>${i.title}</h3><p>${i.date}</p></div><div class="status-badge" style="color:var(--color-games)">${i.badge} ></div></div>`; 
        });
    } 
}

function renderRules() { 
    const c = document.getElementById('rules-feed'); 
    if(c) { 
        c.innerHTML=''; 
        rulesData.forEach(r => {
            c.innerHTML+=`<div class="list-card pending"><div class="card-info"><h3>${r.title}</h3><p>${r.desc}</p></div>${r.penalty?`<div class="status-badge" style="color:#e74c3c;border:1px solid #e74c3c;">${r.penalty}</div>`:''}</div>`; 
        });
    } 
}

function renderCoins() { 
    const c = document.getElementById('coin-feed'); 
    if(c) { 
        c.innerHTML=''; 
        coinsData.forEach(i => {
            c.innerHTML+=`<li class="coin-item"><span>${i.task}</span><div>${formatCoinBreakdown(i.val)}</div></li>`; 
        });
    } 
}

function renderCatalog() { 
    const c = document.getElementById('catalog-feed'); 
    if(c) { 
        c.innerHTML=''; 
        // Ensure currentTier is valid
        if(!currentTier) currentTier = 'tier1';
        
        const f = catalogData.filter(i => i.tier === currentTier && i.visible !== false); 
        
        if(f.length === 0) c.innerHTML = '<p style="color:#666">No items available in this tier yet.</p>'; 
        else f.forEach(i => { 
            let img = i.image && i.image.length > 5 ? `<img src="${i.image}">` : `<i class="fa-solid ${i.icon}"></i>`; 
            let act = `onclick="initRequest('${i.id}')"`; 
            if(i.type === 'standard') act = `onclick="incrementInterest('${i.id}')"`; 
            c.innerHTML += `<div class="store-card"><div class="store-icon-circle">${img}</div><div class="store-info"><h4>${i.name}</h4><p>${i.cost}</p></div><div class="store-action"><button class="btn-req" ${act}>Request</button></div></div>`; 
        }); 
    } 
}

function renderQueue() { 
    const c = document.getElementById('queue-list'); 
    if(c) { 
        c.innerHTML=''; 
        let q = []; 
        if(!showHistory) q = queueData.filter(i => i.status.toLowerCase() !== 'picked up'); 
        else q = [...queueData].sort((a,b) => b.createdAt - a.createdAt); 
        
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
}

function renderLeaderboard() { 
    const p = document.getElementById('lb-podium'); 
    if(!p) return; 
    p.innerHTML = ''; 
    const l = document.getElementById('lb-list'); 
    l.innerHTML = ''; 
    const s = [...leaderboardData].sort((a,b) => b.points - a.points); 
    const v = []; 
    if(s[1]) v.push({...s[1], rank: 2}); 
    if(s[0]) v.push({...s[0], rank: 1}); 
    if(s[2]) v.push({...s[2], rank: 3}); 
    
    v.forEach(i => { 
        // Uses formatName() for privacy on the podium
        p.innerHTML += `<div class="lb-card rank-${i.rank}"><div class="lb-badge">${i.rank}</div><div class="lb-icon" style="border-color:${getBeltColor(i.belt)}"><i class="fa-solid ${getIconClass(i.belt)}" style="color:${getBeltColor(i.belt)}"></i></div><div class="lb-name">${formatName(i.name)}</div><div class="lb-points">${i.points} pts</div></div>`; 
    }); 
    
    s.slice(3).forEach((i,x) => { 
        // Uses formatName() for privacy in the list
        l.innerHTML += `<div class="lb-row"><div class="lb-row-rank">#${x+4}</div><div class="lb-row-belt" style="border-color:${getBeltColor(i.belt)}"><i class="fa-solid ${getIconClass(i.belt)}" style="color:${getBeltColor(i.belt)}"></i></div><div class="lb-row-name">${formatName(i.name)}</div><div class="lb-row-points">${i.points}</div></div>`; 
    }); 
    renderAdminLbPreview(); 
}

function renderJams() { 
    const c = document.getElementById('jams-feed'); 
    if(!c) return; 
    c.innerHTML=''; 
    jamsData.forEach(j => { 
        let cl = 'alert', txt = 'ACTIVE >', col = 'var(--color-jams)'; 
        if(j.status === 'waiting') { cl='pending'; txt='WAITING >'; col='#aaa'; } 
        if(j.status === 'results') { cl='passed'; txt='RESULTS >'; col='#2ecc71'; } 
        c.innerHTML += `<div class="list-card ${cl}" onclick="openJamModal('${j.id}')" style="cursor:pointer;"><div class="card-info"><h3>${j.title}</h3><p>${j.deadline}</p></div><div class="status-badge" style="color:${col}">${txt}</div></div>`; 
    }); 
}

// --- ADMIN VIEW TOGGLE ---
// Renamed from toggleUserView to handle bidirectional toggle
function toggleAdminViewMode() { 
    const adminView = document.getElementById('admin-view');
    const floatingBtn = document.getElementById('floating-admin-toggle');
    
    if (adminView.classList.contains('active')) {
        // Switch to User View
        adminView.classList.remove('active');
        floatingBtn.style.display = 'flex'; // Ensure button stays visible
    } else {
        // Switch to Admin View
        adminView.classList.add('active');
        floatingBtn.style.display = 'flex'; // Ensure button stays visible
    }
}

// --- ADMIN LISTS ---
function renderAdminLists() {
    // 1. Render News
    const nList = document.getElementById('admin-news-list'); 
    if(nList){ 
        nList.innerHTML=''; 
        newsData.forEach(n => nList.innerHTML += `<div class="admin-list-wrapper"><div class="list-card passed" style="pointer-events:none; margin:0;"><div class="card-info"><h3>${n.title}</h3><p>${n.date}</p></div><div class="status-badge" style="color:var(--color-games)">${n.badge} ></div></div><button onclick="openNewsModal('${n.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteNews('${n.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div>`); 
    }

    // 2. Render Rules
    const rList = document.getElementById('admin-rules-list'); 
    if(rList){ 
        rList.innerHTML=''; 
        rulesData.forEach(r => { 
            const b = r.penalty ? `<div class="status-badge" style="color:#e74c3c;border:1px solid #e74c3c;">${r.penalty}</div>` : ''; 
            rList.innerHTML += `<div class="admin-list-wrapper"><div class="list-card pending" style="pointer-events:none; margin:0;"><div class="card-info"><h3>${r.title}</h3><p>${r.desc}</p></div>${b}</div><button onclick="openRulesModal('${r.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteRule('${r.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div>`; 
        }); 
    }

    // 3. Render Coins
    const cList = document.getElementById('admin-coins-list'); 
    if(cList){ 
        cList.innerHTML=''; 
        coinsData.forEach(c => cList.innerHTML += `<div class="admin-list-wrapper"><div style="flex-grow:1;background:#161932;padding:10px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;"><span style="color:white;font-weight:bold;">${c.task}</span><div>${formatCoinBreakdown(c.val)}</div></div><button onclick="openCoinModal('${c.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteCoin('${c.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div>`); 
    }
    
    // 4. Render Interest Tracker (MATCHING REFERENCE IMAGE STYLE)
    const intList = document.getElementById('admin-interest-list');
    if(intList) {
        intList.innerHTML = '';
        
        // Filter items that have interest > 0
        const st = catalogData.filter(c => c.type === 'standard' && (c.interest || 0) > 0);
        
        if(st.length === 0) {
            intList.innerHTML = '<p style="color:#666; width:100%; text-align:center; padding:20px; font-size:0.9rem;">No active interest right now.</p>';
        } else {
            // Sort by highest interest
            st.sort((a, b) => b.interest - a.interest);
            
            st.forEach(s => {
                let img = s.image && s.image.length > 5 ? `<img src="${s.image}">` : `<i class="fa-solid ${s.icon}"></i>`;
                
                intList.innerHTML += `
                <div class="interest-card">
                    <div class="interest-visual">${img}</div>
                    <h4>${s.name}</h4>
                    <div class="interest-count-badge">${s.interest} Requests</div>
                    <button class="interest-reset-btn" onclick="resetInterest('${s.id}')">RESET</button>
                </div>`;
            });
        }
    }

    // 5. Render Catalog (Tiers Only - Interest Logic Removed from here)
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
            g += `</div>`; 
            catList.innerHTML += g; 
        }); 
    }

    renderAdminRequests();
    
    // 6. Render Queue Manager
    const qList = document.getElementById('admin-queue-manage-list'); 
    if(qList){ 
        qList.innerHTML=''; 
        queueData.filter(q => q.status !== 'Picked Up').forEach(q => { 
            const id = q.id ? `'${q.id}'` : `'${queueData.indexOf(q)}'`; 
            qList.innerHTML += `
            <div class="admin-list-item" style="display:block;">
                <div style="display:flex;justify-content:space-between;">
                    <strong>${q.name}</strong> 
                    <span>${q.status}</span>
                </div>
                <div style="color:#aaa;font-size:0.8rem;">${q.item} ${q.details ? '| '+q.details : ''}</div>
                <div style="margin-top:5px;">
                    <button onclick="updateQueueStatus(${id},'Waiting for Payment')" class="admin-btn" style="width:auto;padding:2px 5px;font-size:0.7rem;background:#e74c3c;">Pay</button>
                    <button onclick="updateQueueStatus(${id},'Pending')" class="admin-btn" style="width:auto;padding:2px 5px;font-size:0.7rem;background:#555;">Pend</button>
                    <button onclick="updateQueueStatus(${id},'Printing')" class="admin-btn" style="width:auto;padding:2px 5px;font-size:0.7rem;background:#9b59b6;">Print</button>
                    <button onclick="updateQueueStatus(${id},'Ready!')" class="admin-btn" style="width:auto;padding:2px 5px;font-size:0.7rem;background:#2ecc71;">Ready</button>
                    <button onclick="updateQueueStatus(${id},'Picked Up')" class="admin-btn" style="width:auto;padding:2px 5px;font-size:0.7rem;background:#1abc9c;">Done</button>
                </div>
            </div>`; 
        }); 
    }
    
    renderAdminLbPreview();
}

// --- NEW HELPER: RESET INTEREST ---
function resetInterest(id) {
    const item = catalogData.find(x => x.id === id);
    if(!item) return;
    
    showConfirm("Reset count for " + item.name + "?", () => {
        if(db) {
             db.collection("catalog").doc(id).update({ interest: 0 });
        } else {
            item.interest = 0;
            saveLocal('cn_catalog', catalogData);
            renderAdminLists();
        }
    });
}

function deleteRequest(id) {
    if(db) db.collection("requests").doc(id).delete();
    else {
        requestsData = requestsData.filter(x => x.id !== id);
        saveLocal('cn_requests', requestsData);
        renderAdminRequests();
    }
}

// CRUD & MODALS
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

function updateQueueStatus(id, s) { if(db){ if(s==='Picked Up') db.collection("queue").doc(id).delete(); else db.collection("queue").doc(id).update({status:s}); } else { let idx=-1; if(typeof id==='string' && id.startsWith('local_')) idx=queueData.findIndex(x=>x.id===id); else idx=parseInt(id); if(idx>-1 && queueData[idx]){ if(s==='Picked Up') queueData.splice(idx,1); else queueData[idx].status=s; saveLocal('cn_queue',queueData); renderQueue(); renderAdminLists(); } } }

// UTILS
function saveLocal(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function formatCoinBreakdown(valStr) { if(!valStr) return ''; if(valStr.includes('-')) return `<span class="coin-val" style="color:#e74c3c; border-color:#e74c3c;">${valStr}</span>`; const num = parseInt(valStr.replace(/\D/g, '')) || 0; if(num === 0) return `<span class="coin-val silver">0</span>`; let html = ''; const obsidian = Math.floor(num / 25); let rem = num % 25; const gold = Math.floor(rem / 5); const silver = rem % 5; if(obsidian > 0) html += `<span class="coin-val obsidian" style="margin-right:4px;">${obsidian}</span>`; if(gold > 0) html += `<span class="coin-val gold" style="margin-right:4px;">${gold}</span>`; if(silver > 0) html += `<span class="coin-val silver" style="margin-right:4px;">${silver}</span>`; return html; }
function getBeltColor(belt) { const map = { 'white': 'var(--belt-white)', 'yellow': 'var(--belt-yellow)', 'orange': 'var(--belt-orange)', 'green': 'var(--belt-green)', 'blue': 'var(--belt-blue)', 'purple': 'var(--belt-purple)', 'brown': 'var(--belt-brown)', 'red': 'var(--belt-red)', 'black': 'var(--belt-black)' }; return map[(belt || 'white').toLowerCase()] || 'var(--belt-white)'; }
function showTab(id, el) { document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active')); document.getElementById(id).classList.add('active'); document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); el.classList.add('active'); }
function handleLogoClick() { 
    if(window.innerWidth < 768) return; 
    clickCount++; 
    clearTimeout(clickTimer); 
    clickTimer = setTimeout(() => { clickCount = 0; }, 2000); 
    
    if(clickCount === 3) { 
        clickCount = 0; 
        // Direct to admin login toggle instead of separate modal
        toggleAdminLogin();
    } 
}

function exitAdmin() { document.getElementById('admin-view').classList.remove('active'); }
function showAdminSection(id, btn) { document.querySelectorAll('.admin-section').forEach(e => e.classList.remove('active')); document.getElementById(id).classList.add('active'); document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderAdminLists(); }
function refreshAll() { renderNews(); renderJams(); renderRules(); renderCoins(); renderCatalog(); renderQueue(); renderLeaderboard(); renderAdminLists(); }
function getIconClass(belt) { const b=(belt||'white').toLowerCase(); if(b.includes('robot'))return 'fa-robot'; if(b.includes('ai'))return 'fa-microchip'; if(b.includes('jr'))return 'fa-child'; return 'fa-user-ninja'; }
function openGitHubUpload() { if (GITHUB_REPO_URL.includes("github.com")) window.open(GITHUB_REPO_URL.replace(/\/$/, "") + "/upload/main", '_blank'); else showAlert("Error", "Configure GITHUB_REPO_URL"); }
function closeReqModal() { document.getElementById('req-modal').style.display='none'; }
function submitRequest() { 
    const name = document.getElementById('req-ninja-name').value; 
    if(!name) return showAlert("Error","Name required"); 
    
    let details = "Standard"; 
    if(document.getElementById('req-color')) {
        details = "Color: " + document.getElementById('req-color').value;
    }

    const req = {
        name, 
        item: currentRequestItem.name, 
        details, 
        time: new Date().toLocaleString(), 
        createdAt: Date.now()
    }; 
    
    if(db) {
        db.collection("requests").add(req);
    } else { 
        requestsData.push({id: "local_" + Date.now(), ...req}); 
        saveLocal('cn_requests', requestsData); 
    } 
    
    closeReqModal(); 
    showAlert("Success", "Sent!"); 
}

// --- NEW FUNCTIONS FOR CATALOG ---

// 1. Filter Catalog (Switch Tiers)
function filterCatalog(tier, btn) {
    currentTier = tier;
    // Update UI
    document.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    renderCatalog();
}

// 2. Increment Interest (Standard Items)
function incrementInterest(id) {
    const item = catalogData.find(x => x.id === id);
    if(!item) return;

    if(db) {
        // Firestore increment
        const ref = db.collection("catalog").doc(id);
        ref.update({
            interest: firebase.firestore.FieldValue.increment(1)
        }).then(() => {
            showAlert("Recorded", "Interest noted! We'll stock up soon.");
        }).catch(err => {
            console.error(err);
            showAlert("Error", "Could not record interest.");
        });
    } else {
        // Local increment
        item.interest = (item.interest || 0) + 1;
        saveLocal('cn_catalog', catalogData);
        renderAdminLists(); // Update admin view to show new interest count
        showAlert("Recorded", "Interest noted! (Local Mode)");
    }
}

// 3. Request Modal Init (Premium Items)
function initRequest(id) {
    currentRequestItem = catalogData.find(x => x.id === id);
    if(!currentRequestItem) return;

    document.getElementById('req-item-name').innerText = currentRequestItem.name;

    // Generate Dynamic Fields (Color Selection)
    const container = document.getElementById('req-dynamic-fields');
    container.innerHTML = ''; // Clear previous fields

    // Create Color Dropdown using user's specific filament list
    const label = document.createElement('label');
    label.className = 'req-label';
    label.innerText = 'Select Color:';
    
    const select = document.createElement('select');
    select.id = 'req-color';
    select.className = 'req-input';
    
    // Default Option
    const defaultOpt = document.createElement('option');
    defaultOpt.value = "Surprise Me";
    defaultOpt.innerText = "-- Select a Color --";
    select.appendChild(defaultOpt);

    FILAMENT_COLORS.forEach(color => {
        const opt = document.createElement('option');
        opt.value = color;
        opt.innerText = color;
        select.appendChild(opt);
    });

    container.appendChild(label);
    container.appendChild(select);

    // Auto-fill name if logged in
    if(currentUser && currentUser.name !== "Sensei") {
        document.getElementById('req-ninja-name').value = currentUser.name;
    }

    document.getElementById('req-modal').style.display = 'flex';
}

function updateReqImage(url, styleName) { const img = document.getElementById('req-main-img'); if(img) img.src = url; const sel = document.getElementById('req-var'); if(sel) sel.value = styleName; }
function updateReqImageFromSelect(val) { if(currentRequestItem.variationImages && currentRequestItem.variationImages[val]) { const img = document.getElementById('req-main-img'); if(img) img.src = currentRequestItem.variationImages[val]; } }
function openJamModal(id) { const j=jamsData.find(x=>x.id===id); if(!j)return; document.getElementById('modal-title').innerText=j.title; document.getElementById('modal-desc').innerText=`Details for ${j.title}`; document.getElementById('modal-deadline').innerText=j.deadline; document.getElementById('jam-modal').style.display='flex'; }
function closeJamModal() { document.getElementById('jam-modal').style.display='none'; }

// --- AUTH FUNCTIONS ---

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

    // 1. CHECK HARDCODED MASTER PASSWORD FIRST (Works offline/without Firebase)
    if(p === "@2633Ninjas") {
        loginAsAdmin();
        return;
    }

    // 2. ATTEMPT FIREBASE LOGIN
    if(auth) {
        auth.signInWithEmailAndPassword(e, p)
            .then(() => {
                loginAsAdmin();
            })
            .catch(err => {
                console.error("Firebase Login Failed:", err);
                document.getElementById('login-error-msg').style.display = 'block';
                document.getElementById('login-error-msg').innerText = 'Access Denied.';
            });
    } else {
        // 3. IF NO FIREBASE AND WRONG PASSWORD
        document.getElementById('login-error-msg').style.display = 'block';
        document.getElementById('login-error-msg').innerText = 'Access Denied (Offline).';
    } 
}

function loginAsAdmin() {
    currentUser = { name: "Sensei", isAdmin: true };
    localStorage.setItem('cn_user', JSON.stringify(currentUser));
    enterDashboard();
    // Force admin view open immediately on login
    document.getElementById('admin-view').classList.add('active');
}

// Updated enterDashboard to handle button display state
function enterDashboard() { 
    document.getElementById('login-view').style.display = 'none'; 
    document.getElementById('main-app').style.display = 'flex'; 
    document.getElementById('current-user-name').innerText = currentUser.name.split(' ')[0]; 
    
    if(currentUser.isAdmin) {
        document.getElementById('floating-admin-toggle').style.display = 'flex';
    } else {
        document.getElementById('floating-admin-toggle').style.display = 'none';
    }
    
    refreshAll(); 
}

function logout() { 
    localStorage.removeItem('cn_user'); 
    currentUser = null; 
    if(auth) auth.signOut(); 
    location.reload(); 
}

function toggleAdminViewMode() { 
    const adminView = document.getElementById('admin-view');
    const floatingBtn = document.getElementById('floating-admin-toggle');
    
    if (adminView.classList.contains('active')) {
        // Switch to User View
        adminView.classList.remove('active');
        floatingBtn.style.display = 'flex'; 
    } else {
        // Switch to Admin View
        adminView.classList.add('active');
        floatingBtn.style.display = 'flex'; 
    }
}

function restoreAdminView() { 
    document.getElementById('admin-view').classList.add('active'); 
}

function toggleHistoryView() { 
    showHistory = !showHistory; 
    const b = document.querySelector('#admin-queue .btn-edit'); 
    if(b) b.innerText = showHistory ? "Hide History" : "History"; 
    const h = document.getElementById('admin-queue-history-list'); 
    if(h) {
        h.style.display = showHistory ? 'block' : 'none';
        renderQueueHistory();
    } 
}

function renderQueueHistory() { 
    const h = document.getElementById('history-content'); 
    if(!h) return; 
    h.innerHTML = ''; 
    const p = queueData.filter(q => q.status === 'Picked Up'); 
    if(p.length === 0) h.innerHTML = '<p style="color:#666;font-size:0.8rem;">No history.</p>'; 
    else p.forEach(q => h.innerHTML += `<div class="admin-list-item" style="opacity:0.6"><strong>${q.name}</strong> - ${q.item} <span style="font-size:0.7rem">${q.createdAt ? new Date(q.createdAt).toLocaleDateString() : 'N/A'}</span></div>`); 
}

function showAlert(t, m) { 
    document.getElementById('alert-title').innerText = t; 
    document.getElementById('alert-msg').innerText = m; 
    document.getElementById('alert-modal').style.display = 'flex'; 
}

function showConfirm(m, cb) { 
    document.getElementById('confirm-msg').innerText = m; 
    const b = document.getElementById('confirm-yes-btn'); 
    const n = b.cloneNode(true); 
    b.parentNode.replaceChild(n, b); 
    n.onclick = () => { 
        document.getElementById('confirm-modal').style.display = 'none'; 
        cb(); 
    }; 
    document.getElementById('confirm-modal').style.display = 'flex'; 
}

// ADMIN STUDENT POINTS
function adminSearchNinja() {
    const q = document.getElementById('admin-lb-search').value.toLowerCase();
    const resDiv = document.getElementById('admin-lb-results');
    resDiv.innerHTML = '';
    
    if(q.length < 2) return;
    
    const found = leaderboardData.filter(n => n.name.toLowerCase().includes(q));
    
    found.slice(0, 5).forEach(n => {
        resDiv.innerHTML += `
            <div style="background:#111; padding:10px; margin-bottom:5px; border-radius:4px; cursor:pointer; border:1px solid #333;" onclick="selectNinjaToEdit('${n.id}')">
                ${n.name} <span style="color:var(--color-games); font-weight:bold;">${n.points} pts</span>
            </div>
        `;
    });
}

function selectNinjaToEdit(id) {
    const n = leaderboardData.find(x => x.id === id);
    if(!n) return;
    editingNinjaId = id;
    document.getElementById('admin-lb-results').innerHTML = '';
    document.getElementById('admin-lb-search').value = '';
    document.getElementById('admin-lb-edit').style.display = 'block';
    document.getElementById('admin-lb-name').innerText = n.name;
    document.getElementById('admin-lb-current').innerText = n.points;
}

function adminUpdatePoints() {
    if(!editingNinjaId) return;
    const val = parseInt(document.getElementById('admin-lb-adjust').value);
    if(isNaN(val)) return;
    
    const n = leaderboardData.find(x => x.id === editingNinjaId);
    if(!n) return;
    
    const newPoints = (n.points || 0) + val;
    
    if(db) {
        db.collection("leaderboard").doc(editingNinjaId).update({ points: newPoints });
    } else {
        const idx = leaderboardData.findIndex(x => x.id === editingNinjaId);
        leaderboardData[idx].points = newPoints;
        saveLocal('cn_leaderboard', leaderboardData);
        renderLeaderboard();
    }
    
    // Reset UI
    document.getElementById('admin-lb-edit').style.display = 'none';
    document.getElementById('admin-lb-adjust').value = '';
    showAlert("Success", `Updated ${n.name} to ${newPoints} pts`);
}

function adminAddNinja() {
    const name = document.getElementById('admin-lb-add-name').value;
    if(!name) return;
    
    const data = { name: name, points: 0, belt: 'White' };
    
    if(db) {
        db.collection("leaderboard").add(data);
    } else {
        leaderboardData.push({id: "local_n_"+Date.now(), ...data});
        saveLocal('cn_leaderboard', leaderboardData);
        renderLeaderboard();
    }
    document.getElementById('admin-lb-add-name').value = '';
    showAlert("Success", "Added " + name);
}
