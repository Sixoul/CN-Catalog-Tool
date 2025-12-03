console.log("DASHBOARD SCRIPT STARTING...");

/**
 * CODE NINJAS DASHBOARD LOGIC
 * v4.9 - "First Name Last Initial" Display & Username Login
 */

/* ==========================================================================
   1. CONFIGURATION & STATE
   ========================================================================== */
const APP_VERSION = "4.9";

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

let newsData = [];
let jamsData = [];
let rulesData = [];
let coinsData = [];
let catalogData = [];
let requestsData = [];
let queueData = [];
let leaderboardData = [];
let filamentData = DEFAULT_FILAMENTS;

let currentTier = 'tier1';
let currentRequestItem = null;
let editingCatId = null;
let editingId = null;
let editingNinjaId = null;
let showHistory = false;
let clickCount = 0;
let clickTimer;
let selectedVariantIdx = 0;

// Default Mock Data
const defaultNews = [{ id: "n1", title: "Minecraft Night", date: "Nov 22", badge: "SOON" }];
const defaultRules = [{ id: "r1", title: "General", desc: "Respect the Dojo equipment.", penalty: "-1 Coin" }];
const defaultCoins = [{ id: "c1", task: "Wear Uniform", val: "+1", type: "silver" }];
const defaultCatalog = [{ id: "cat1", name: "Star", cost: "50", tier: "tier1", category: "standard", icon: "fa-star", visible: true }];
const mockLeaderboard = [{ id: "l1", name: "Asher Cullin", points: 1250, belt: "Blue", username: "asher.cullin" }];


/* ==========================================================================
   2. HELPER FUNCTIONS
   ========================================================================== */
// FORMAT: "Kane Leung" -> "Kane L."
function formatName(name) {
    if (!name) return 'Ninja';
    
    // Clean up dots or extra spaces
    const clean = name.replace(/\./g, ' '); 
    const parts = clean.split(' ').filter(p => p.length > 0);
    
    if (parts.length === 0) return 'Ninja';
    
    // Capitalize First Name
    const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    
    // Last Initial (if exists)
    let lastInitial = "";
    if (parts.length > 1) {
        // Takes the last part as the last name
        lastInitial = " " + parts[parts.length - 1].charAt(0).toUpperCase() + ".";
    }
    
    return first + lastInitial;
}

// GENERATE: "Kane Leung" -> "kane.leung" (Handles duplicates)
function generateUsername(fullName, existingData) {
    // Remove special characters, keep spaces
    const clean = fullName.replace(/[^a-zA-Z0-9 ]/g, ''); 
    const parts = clean.split(' ').filter(p => p.length > 0);
    
    if (parts.length === 0) return "ninja" + Math.floor(Math.random() * 1000);

    const first = parts[0].toLowerCase();
    // Use last part as last name, or empty if single name
    const last = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
    
    // Base pattern: first.last or just first
    let base = last ? `${first}.${last}` : first;
    
    let candidate = base;
    let counter = 1;

    // Check collision against DB
    const isTaken = (u) => existingData.some(n => (n.username || "").toLowerCase() === u);

    // If taken, append number: kane.leung1, kane.leung2...
    while (isTaken(candidate)) {
        candidate = base + counter;
        counter++;
    }
    
    return candidate;
}

function formatCostDisplay(costVal) {
    const cost = parseInt(costVal) || 0;
    if (cost === 0) return "Free";
    if (cost % 5 === 0) { 
        const obs = cost / 5; 
        return `<span style="color:var(--coin-obsidian); font-weight:bold;">${obs} Obsidian Coin${obs > 1 ? 's' : ''}</span>`; 
    }
    if (cost > 5) { 
        const obs = Math.floor(cost / 5); 
        const gold = cost % 5; 
        return `<span style="color:var(--coin-obsidian); font-weight:bold;">${obs} Obsidian</span> <span style="color:var(--coin-gold); font-weight:bold;">${gold} Gold</span>`; 
    }
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

function getBeltColor(belt) { 
    const map = { 'white': 'var(--belt-white)', 'yellow': 'var(--belt-yellow)', 'orange': 'var(--belt-orange)', 'green': 'var(--belt-green)', 'blue': 'var(--belt-blue)', 'purple': 'var(--belt-purple)', 'brown': 'var(--belt-brown)', 'red': 'var(--belt-red)', 'black': 'var(--belt-black)' }; 
    return map[(belt || 'white').toLowerCase()] || 'var(--belt-white)'; 
}

function getIconClass(belt) { 
    const b = (belt||'white').toLowerCase(); 
    if(b.includes('robot')) return 'fa-robot'; 
    if(b.includes('ai')) return 'fa-microchip'; 
    if(b.includes('jr')) return 'fa-child'; 
    return 'fa-user-ninja'; 
}

function saveLocal(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function showAlert(t, m) { document.getElementById('alert-title').innerText = t; document.getElementById('alert-msg').innerText = m; document.getElementById('alert-modal').style.display = 'flex'; }
function showConfirm(m, cb) { document.getElementById('confirm-msg').innerText = m; const b = document.getElementById('confirm-yes-btn'); const n = b.cloneNode(true); b.parentNode.replaceChild(n, b); n.onclick = () => { document.getElementById('confirm-modal').style.display = 'none'; cb(); }; document.getElementById('confirm-modal').style.display = 'flex'; }
function showTab(id, el) { document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active')); document.getElementById(id).classList.add('active'); document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); el.classList.add('active'); }


/* ==========================================================================
   3. AUTHENTICATION
   ========================================================================== */
function toggleAdminLogin() { 
    const n = document.getElementById('ninja-login-form'); 
    const a = document.getElementById('admin-login-form'); 
    if(n.style.display === 'none') { 
        n.style.display = 'block'; a.style.display = 'none'; 
    } else { 
        n.style.display = 'none'; a.style.display = 'block'; 
        document.getElementById('admin-pass').focus(); 
    } 
}

function attemptNinjaLogin() { 
    const input = document.getElementById('login-username').value.trim().toLowerCase(); 
    if(!input) return; 
    
    // Login with USERNAME (e.g. kane.leung)
    // Fallback: Check full name just in case
    const u = leaderboardData.find(l => 
        (l.username && l.username.toLowerCase() === input) || 
        (!l.username && l.name.toLowerCase() === input)
    ); 

    if(u){ 
        currentUser = u; 
        localStorage.setItem('cn_user', JSON.stringify(u)); 
        enterDashboard(); 
    } else { 
        document.getElementById('login-error-msg').style.display = 'block'; 
        document.getElementById('login-error-msg').innerText = 'Ninja not found. Try first.last'; 
    } 
}

function attemptAdminLogin() { 
    const e = document.getElementById('admin-email').value; 
    const p = document.getElementById('admin-pass').value; 
    if(p === "@2633Ninjas") { loginAsAdmin(); return; } 
    if(auth) { 
        auth.signInWithEmailAndPassword(e, p).then(() => loginAsAdmin()).catch(err => { 
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


/* ==========================================================================
   4. RENDERERS
   ========================================================================== */
function enterDashboard() { 
    document.getElementById('login-view').style.display = 'none'; 
    document.getElementById('main-app').style.display = 'flex'; 
    if(currentUser && currentUser.name) document.getElementById('current-user-name').innerText = currentUser.name.split(' ')[0]; 
    if(currentUser && currentUser.isAdmin) document.getElementById('floating-admin-toggle').style.display = 'flex'; 
    else document.getElementById('floating-admin-toggle').style.display = 'none'; 
    refreshAll(); 
}

function refreshAll() { 
    renderNews(); renderJams(); renderRules(); renderCoins(); 
    renderCatalog(); renderQueue(); renderLeaderboard(); renderAdminLists(); 
}

function renderNews() { 
    const c = document.getElementById('news-feed'); if(!c) return; c.innerHTML=''; 
    newsData.forEach(i => c.innerHTML+=`<div class="list-card passed"><div class="card-info"><h3>${i.title}</h3><p>${i.date}</p></div><div class="status-badge" style="color:var(--color-games)">${i.badge} ></div></div>`); 
}

function renderRules() { 
    const c = document.getElementById('rules-feed'); if(!c) return; c.innerHTML=''; 
    const groups = {}; rulesData.forEach(r => { const cat = r.title || 'General'; if(!groups[cat]) groups[cat] = []; groups[cat].push(r); }); 
    for (const [category, items] of Object.entries(groups)) { 
        c.innerHTML += `<h3 class="rules-group-header">${category}</h3>`; 
        let gridHtml = `<div class="rules-group-grid">`; 
        items.forEach(r => { 
            const b = r.penalty ? `<div class="status-badge" style="color:#e74c3c;border:1px solid #e74c3c;">${r.penalty}</div>` : ''; 
            gridHtml += `<div class="list-card pending" style="margin:0;"><div class="card-info"><h3>${r.desc}</h3></div>${b}</div>`; 
        }); 
        gridHtml += `</div>`; c.innerHTML += gridHtml; 
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
        let img = i.image && i.image.length > 5 ? `<img src="${i.image}">` : `<i class="fa-solid ${i.icon || 'fa-cube'}"></i>`; 
        let btnText = "Request"; let btnAction = `onclick="initRequest('${i.id}')"`; 
        let catBadge = ''; let specialClass = ''; 
        
        if(i.category === 'custom') { 
            btnText = "Custom Print"; 
            catBadge = `<span style="font-size:0.6rem; color:var(--color-jams); border:1px solid var(--color-jams); padding:2px 4px; border-radius:3px; margin-left:5px;">CUSTOM</span>`; 
        } 
        else if(i.category === 'premium') { 
            btnText = "View Options"; 
            catBadge = `<span style="font-size:0.6rem; color:var(--color-catalog); border:1px solid var(--color-catalog); padding:2px 4px; border-radius:3px; margin-left:5px;">PREMIUM</span>`; 
        } 
        else if(i.category === 'limited') { 
            btnText = "Get It Now!"; 
            catBadge = `<span class="badge-limited">LIMITED</span>`; 
            specialClass = 'limited-card'; 
        } 
        c.innerHTML += `<div class="store-card ${specialClass}"><div class="store-icon-circle">${img}</div><div class="store-info"><h4>${i.name} ${catBadge}</h4><p>${formatCostDisplay(i.cost)}</p><div style="font-size:0.75rem; color:#888; margin-top:4px; line-height:1.2;">${i.desc || ''}</div></div><div class="store-action"><button class="btn-req" ${btnAction}>${btnText}</button></div></div>`; 
    }); 
}

function renderQueue() { 
    const c = document.getElementById('queue-list'); if(!c) return; c.innerHTML=''; 
    let q = !showHistory ? queueData.filter(i => i.status.toLowerCase() !== 'picked up') : [...queueData].sort((a,b) => b.createdAt - a.createdAt); 
    if(q.length === 0) c.innerHTML = '<p style="color:#666;text-align:center;">Empty.</p>'; 
    else q.forEach((i,x) => { 
        let s = i.status, cl = 'status-pending', icon = 'fa-clock', cc = 'queue-card'; 
        const sLow = s.toLowerCase(); 
        if(sLow.includes('ready')){ cl='status-ready'; icon='fa-check'; cc+=' ready-pickup'; } 
        else if(sLow.includes('printing')){ cl='status-printing printing-anim'; icon='fa-print'; } 
        else if(sLow.includes('waiting')){ cl='status-waiting-print'; icon='fa-hourglass'; } 
        else if(sLow.includes('payment')){ cl='status-waiting-payment'; icon='fa-circle-dollar-to-slot'; } 
        else if(sLow.includes('pending')){ cl='status-pending'; icon='fa-clock'; } 
        
        // Use formatName for privacy
        c.innerHTML += `<div class="${cc}"><div class="q-left"><div class="q-number">${x+1}</div><div class="q-info"><h3>${formatName(i.name)}</h3><p>${i.item} <span style="opacity:0.6">| ${i.details}</span></p></div></div><div class="q-status ${cl}">${s} <i class="fa-solid ${icon}"></i></div></div>`; 
    }); 
}

function renderLeaderboard() { 
    const p = document.getElementById('lb-podium'); const l = document.getElementById('lb-list'); 
    if(!p || !l) return; p.innerHTML = ''; l.innerHTML = ''; 
    const s = [...leaderboardData].sort((a,b) => b.points - a.points); 
    
    const v = []; 
    if(s[1]) v.push({...s[1], rank: 2}); 
    if(s[0]) v.push({...s[0], rank: 1}); 
    if(s[2]) v.push({...s[2], rank: 3}); 
    
    // Top 3 Podium: Use formatName()
    v.forEach(i => p.innerHTML += `<div class="lb-card rank-${i.rank}"><div class="lb-badge">${i.rank}</div><div class="lb-icon" style="border-color:${getBeltColor(i.belt)}"><i class="fa-solid ${getIconClass(i.belt)}" style="color:${getBeltColor(i.belt)}"></i></div><div class="lb-name">${formatName(i.name)}</div><div class="lb-points">${i.points} pts</div></div>`); 
    
    // List: Use formatName()
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


/* ==========================================================================
   5. RENDERERS (ADMIN VIEW)
   ========================================================================== */
function renderAdminLists() { 
    renderAdminNews(); renderAdminRules(); renderAdminCoins(); 
    renderAdminCatalog(); renderAdminRequests(); renderAdminQueue(); 
    renderAdminLbPreview(); renderAdminInterest(); 
}

function renderAdminNews() { 
    const nList = document.getElementById('admin-news-list'); if(nList){ nList.innerHTML=''; newsData.forEach(n => nList.innerHTML += `<div class="admin-list-wrapper"><div class="list-card passed" style="pointer-events:none; margin:0;"><div class="card-info"><h3>${n.title}</h3><p>${n.date}</p></div><div class="status-badge" style="color:var(--color-games)">${n.badge} ></div></div><button onclick="openNewsModal('${n.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteNews('${n.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div>`); } 
}

function renderAdminRules() { 
    const rList = document.getElementById('admin-rules-list'); if(rList){ rList.innerHTML=''; rulesData.forEach(r => { const b = r.penalty ? `<div class="status-badge" style="color:#e74c3c;border:1px solid #e74c3c;">${r.penalty}</div>` : ''; rList.innerHTML += `<div class="admin-list-wrapper"><div class="list-card pending" style="pointer-events:none; margin:0;"><div class="card-info"><h3>${r.title}</h3><p>${r.desc}</p></div>${b}</div><button onclick="openRulesModal('${r.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteRule('${r.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div>`; }); } 
}

function renderAdminCoins() { 
    const cList = document.getElementById('admin-coins-list'); 
    if(cList){ 
        cList.innerHTML=''; 
        coinsData.forEach((c, index) => { 
            const upBtn = index > 0 ? `<button onclick="moveCoin(${index}, -1)" class="btn-arrow">⬆</button>` : '<span class="btn-arrow-placeholder"></span>'; 
            const downBtn = index < coinsData.length - 1 ? `<button onclick="moveCoin(${index}, 1)" class="btn-arrow">⬇</button>` : '<span class="btn-arrow-placeholder"></span>'; 
            cList.innerHTML += `<div class="admin-list-wrapper"><div style="display:flex; flex-direction:column; margin-right:5px;">${upBtn}${downBtn}</div><div style="flex-grow:1;background:#161932;padding:10px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;"><span style="color:white;font-weight:bold;">${c.task}</span><div>${formatCoinBreakdown(c.val)}</div></div><button onclick="openCoinModal('${c.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteCoin('${c.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div>`; 
        }); 
    } 
}

function renderAdminInterest() { 
    const intList = document.getElementById('admin-interest-list'); if(!intList) return; 
    intList.innerHTML = ''; 
    const st = catalogData.filter(c => (c.category === 'standard' || c.category === 'limited') && (c.interest || 0) > 0); 
    if(st.length === 0) { 
        intList.innerHTML = '<p style="color:#666; width:100%; text-align:center; padding:20px; font-size:0.9rem;">No active interest.</p>'; 
    } else { 
        st.sort((a, b) => b.interest - a.interest); 
        st.forEach(s => { 
            let img = s.image && s.image.length > 5 ? `<img src="${s.image}">` : `<i class="fa-solid ${s.icon}"></i>`; 
            intList.innerHTML += `<div class="interest-card-square"><div class="interest-visual">${img}</div><div style="width:100%;"><h4 style="margin:5px 0; color:white; font-size:0.9rem;">${s.name}</h4><div class="interest-count-badge">${s.interest} Requests</div></div><div style="width:100%;"><button class="interest-reset-btn" onclick="resetInterest('${s.id}')">RESET</button></div></div>`; 
        }); 
    } 
}

function renderAdminCatalog() { 
    const catList = document.getElementById('admin-cat-list'); if(!catList) return; 
    catList.innerHTML=''; 
    const tiers = ['tier1','tier2','tier3','tier4']; 
    const tierNames = {'tier1':'Tier 1','tier2':'Tier 2','tier3':'Tier 3','tier4':'Tier 4'}; 
    tiers.forEach(t => { 
        catList.innerHTML += `<div class="admin-tier-header">${tierNames[t]}</div>`; 
        let g = `<div class="admin-store-grid">`; 
        catalogData.filter(i => i.tier === t).forEach(i => { 
            let img = i.image && i.image.length > 5 ? `<img src="${i.image}">` : `<i class="fa-solid ${i.icon}"></i>`; 
            let h = i.visible === false ? 'hidden' : ''; 
            let typeBadge = i.category === 'custom' ? 'CUSTOM' : (i.category === 'premium' ? 'PREMIUM' : (i.category === 'limited' ? 'LIMITED' : 'STD')); 
            g += `<div class="admin-store-card ${h}"><div class="admin-store-icon">${img}</div><div style="flex-grow:1;"><h4 style="margin:0;color:white;font-size:0.9rem;">${i.name}</h4><div style="font-size:0.6rem; color:#aaa;">${typeBadge} | ${i.cost} Gold</div></div><div class="admin-store-actions"><button onclick="editCatItem('${i.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteCatItem('${i.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div></div>`; 
        }); 
        g += `</div>`; 
        catList.innerHTML += g; 
    }); 
}

function renderAdminRequests() { 
    const c = document.getElementById('admin-requests-list'); if(!c) return; 
    c.innerHTML = ''; 
    const pending = requestsData.filter(r => r.status === 'Waiting for Payment'); 
    if(pending.length === 0) { c.innerHTML = '<p style="color:#666; padding:10px;">No incoming payment requests.</p>'; return; } 
    pending.forEach(r => { 
        c.innerHTML += `<div class="req-item"><div style="flex:1;"><div style="color:white; font-weight:bold;">${r.name}</div><div style="color:var(--color-catalog); font-weight:600;">${r.item}</div><div style="color:#888; font-size:0.75rem;">${r.details}</div><div style="color:#aaa; font-size:0.7rem; margin-top:2px;">${new Date(r.createdAt).toLocaleDateString()}</div></div><div class="req-actions"><button onclick="approveRequest('${r.id}')" style="background:#2ecc71; color:black;">PAID</button><button onclick="deleteRequest('${r.id}')" style="background:#e74c3c; color:white;">DEL</button></div></div>`; 
    }); 
}

function renderAdminQueue() { 
    const qList = document.getElementById('admin-queue-manage-list'); if(!qList) return; 
    qList.innerHTML=''; 
    const activeQ = queueData.filter(q => q.status !== 'Picked Up' && q.status !== 'Waiting for Payment'); 
    activeQ.sort((a,b) => (a.paidAt || a.createdAt) - (b.paidAt || b.createdAt)); 
    activeQ.forEach(q => { 
        const id = q.id ? `'${q.id}'` : `'${queueData.indexOf(q)}'`; 
        qList.innerHTML += `<div class="admin-list-item" style="display:block; margin-bottom:10px; background:#161932; padding:10px; border-radius:6px; border:1px solid #34495e;"><div style="display:flex;justify-content:space-between;"><strong>${q.name}</strong> <span class="status-badge" style="color:white; background:#333;">${q.status}</span></div><div style="color:#aaa;font-size:0.8rem;">${q.item} ${q.details ? '| '+q.details : ''}</div><div style="margin-top:5px; display:flex; gap:5px;"><button onclick="updateQueueStatus(${id},'Pending')" class="admin-btn" style="width:auto;padding:2px 8px;font-size:0.7rem;background:#555;">Pend</button><button onclick="updateQueueStatus(${id},'Printing')" class="admin-btn" style="width:auto;padding:2px 8px;font-size:0.7rem;background:#9b59b6;">Print</button><button onclick="updateQueueStatus(${id},'Ready!')" class="admin-btn" style="width:auto;padding:2px 8px;font-size:0.7rem;background:#2ecc71;">Ready</button><button onclick="updateQueueStatus(${id},'Picked Up')" class="admin-btn" style="width:auto;padding:2px 8px;font-size:0.7rem;background:#1abc9c;">Done</button></div></div>`; 
    }); 
}

function renderAdminLbPreview() { 
    const c = document.getElementById('admin-lb-preview-list'); if(!c) return; 
    c.innerHTML = ''; 
    const sorted = [...leaderboardData].sort((a,b) => b.points - a.points); 
    if (sorted.length === 0) { c.innerHTML = '<p style="color:#666; padding:10px;">No ninjas yet.</p>'; return; } 
    sorted.forEach((ninja, index) => { 
        // Show Username in Admin view to verify it's working
        const u = ninja.username ? ` <span style="font-size:0.7rem; color:#aaa;">(${ninja.username})</span>` : '';
        c.innerHTML += `<div class="admin-lb-preview-row"><div class="admin-lb-rank">#${index + 1}</div><div class="admin-lb-name">${ninja.name}${u}</div><div class="admin-lb-points">${ninja.points}</div></div>`; 
    }); 
}


/* ==========================================================================
   6. ACTIONS & LOGIC
   ========================================================================== */
function initRequest(id) {
    currentRequestItem = catalogData.find(x => x.id === id);
    if(!currentRequestItem) return;
    
    if (currentRequestItem.category === 'standard' || currentRequestItem.category === 'limited') {
        const today = new Date().toDateString();
        const localRec = JSON.parse(localStorage.getItem('cn_std_reqs')) || { date: today, ids: [] };
        if (localRec.date !== today) { localRec.date = today; localRec.ids = []; }
        if (localRec.ids.includes(id)) { showAlert("Notice", "You already requested this today."); return; }
        if (localRec.ids.length >= 3) { showAlert("Limit Reached", "Max 3 requests per day."); return; }
        incrementInterest(id, localRec); return;
    }
    
    document.getElementById('req-item-name').innerText = currentRequestItem.name;
    const container = document.getElementById('req-dynamic-fields');
    const gallery = document.getElementById('req-gallery');
    const mainImg = document.querySelector('#req-img-container img');
    const mainIcon = document.querySelector('#req-img-container i');
    container.innerHTML = ''; gallery.innerHTML = ''; gallery.style.display = 'none';
    
    if(currentRequestItem.image) { mainImg.src = currentRequestItem.image; mainImg.style.display='block'; mainIcon.style.display='none'; } 
    else { mainImg.style.display='none'; mainIcon.style.display='block'; }
    
    if (currentRequestItem.category === 'custom') {
        const labelUrl = document.createElement('label'); labelUrl.className = 'req-label'; labelUrl.innerText = 'Tinkercad Link:';
        const inputUrl = document.createElement('input'); inputUrl.type='text'; inputUrl.id = 'req-url'; inputUrl.className = 'req-input'; inputUrl.placeholder = "https://www.tinkercad.com/...";
        container.appendChild(labelUrl); container.appendChild(inputUrl);
        
        const labelCol = document.createElement('label'); labelCol.className = 'req-label'; labelCol.innerText = 'Select Color:';
        if(currentRequestItem.colorFee && parseInt(currentRequestItem.colorFee) > 0) labelCol.innerHTML += ` <span style="color:#e74c3c; font-size:0.8rem;">(+${currentRequestItem.colorFee} Gold Fee)</span>`;
        
        const select = document.createElement('select'); select.id = 'req-color'; select.className = 'req-input';
        const optRand = document.createElement('option'); optRand.value = "Random"; optRand.innerText = "Random (No Extra Fee)"; select.appendChild(optRand);
        filamentData.forEach(color => { const opt = document.createElement('option'); opt.value = color; opt.innerText = color; select.appendChild(opt); });
        container.appendChild(labelCol); container.appendChild(select);
    } 
    else if (currentRequestItem.category === 'premium') {
        if (currentRequestItem.variations && currentRequestItem.variations.length > 0) {
            selectedVariantIdx = 0;
            const vars = currentRequestItem.variations;
            if(vars[0].image) mainImg.src = vars[0].image;
            const labelVar = document.createElement('label'); labelVar.className = 'req-label'; labelVar.innerText = 'Select Style:';
            const select = document.createElement('select'); select.id = 'req-variant'; select.className = 'req-input';
            select.onchange = (e) => updatePremiumPreview(e.target.selectedIndex);
            vars.forEach((v, idx) => { const opt = document.createElement('option'); opt.value = idx; opt.innerText = v.name; select.appendChild(opt); });
            container.appendChild(labelVar); container.appendChild(select);
            gallery.style.display = 'flex';
            vars.forEach((v, idx) => { const thumb = document.createElement('div'); thumb.className = idx === 0 ? 'req-thumb active' : 'req-thumb'; thumb.onclick = () => { document.getElementById('req-variant').selectedIndex = idx; updatePremiumPreview(idx); }; thumb.innerHTML = `<img src="${v.image || ''}">`; gallery.appendChild(thumb); });
        }
    }
    
    if(currentUser && currentUser.name !== "Sensei") { const nameInput = document.getElementById('req-ninja-name'); if(nameInput) nameInput.value = currentUser.name; }
    document.getElementById('req-modal').style.display = 'flex';
}

function updatePremiumPreview(idx) { 
    selectedVariantIdx = idx; 
    const item = currentRequestItem.variations[idx]; 
    const mainImg = document.querySelector('#req-img-container img'); 
    if(item.image) mainImg.src = item.image; 
    document.querySelectorAll('.req-thumb').forEach((t, i) => { if(i === idx) t.classList.add('active'); else t.classList.remove('active'); }); 
}

function submitRequest() { 
    const nameInput = document.getElementById('req-ninja-name'); const name = nameInput ? nameInput.value : ''; 
    if(!name) return showAlert("Error","Name required"); 
    
    let details = ""; let finalItemName = currentRequestItem.name;
    if (currentRequestItem.category === 'custom') { 
        const url = document.getElementById('req-url').value; 
        const color = document.getElementById('req-color').value; 
        if(!url) return showAlert("Error", "Tinkercad Link required"); 
        details = `Color: ${color} | Link: ${url}`; 
    } 
    else if (currentRequestItem.category === 'premium') { 
        const v = currentRequestItem.variations[selectedVariantIdx]; 
        details = `Variant: ${v.name}`; 
    }
    
    const req = { name, item: finalItemName, details, status: "Waiting for Payment", createdAt: Date.now() }; 
    if(db) { db.collection("requests").add(req); } 
    else { requestsData.push({id: "local_" + Date.now(), ...req}); saveLocal('cn_requests', requestsData); renderAdminRequests(); } 
    
    closeReqModal(); showAlert("Sent!", "Please pay the Sensei to start your print."); 
}

function closeReqModal() { document.getElementById('req-modal').style.display='none'; }

function incrementInterest(id, localRec) { 
    const item = catalogData.find(x => x.id === id); if(!item) return; 
    if(db) { 
        db.collection("catalog").doc(id).update({ interest: firebase.firestore.FieldValue.increment(1) }).then(() => { 
            localRec.ids.push(id); localStorage.setItem('cn_std_reqs', JSON.stringify(localRec)); showAlert("Requested", "Sensei notified!"); 
        }); 
    } else { 
        item.interest = (item.interest || 0) + 1; localRec.ids.push(id); localStorage.setItem('cn_std_reqs', JSON.stringify(localRec)); 
        saveLocal('cn_catalog', catalogData); renderAdminLists(); showAlert("Requested", "Sensei notified! (Local)"); 
    } 
}

function resetInterest(id) { 
    const item = catalogData.find(x => x.id === id); if(!item) return; 
    showConfirm("Reset count for " + item.name + "?", () => { 
        if(db) { db.collection("catalog").doc(id).update({ interest: 0 }); } 
        else { item.interest = 0; saveLocal('cn_catalog', catalogData); renderAdminLists(); } 
    }); 
}

function approveRequest(id) { 
    const r = requestsData.find(x => x.id === id); if(!r) return; 
    const qItem = { name: r.name, item: r.item, details: r.details, status: "Pending", createdAt: r.createdAt, paidAt: Date.now() }; 
    if(db) { db.collection("queue").add(qItem); db.collection("requests").doc(id).delete(); } 
    else { queueData.push({id: "local_q_"+Date.now(), ...qItem}); requestsData = requestsData.filter(x => x.id !== id); saveLocal('cn_queue', queueData); saveLocal('cn_requests', requestsData); refreshAll(); } 
}

function deleteRequest(id) { 
    showConfirm("Delete Request?", () => { 
        if(db) db.collection("requests").doc(id).delete(); 
        else { requestsData = requestsData.filter(x => x.id !== id); saveLocal('cn_requests', requestsData); renderAdminLists(); renderAdminRequests(); } 
    }); 
}

function updateQueueStatus(id, s) { 
    if(db){ 
        if(s==='Picked Up') db.collection("queue").doc(id).update({status:s, pickedUpAt: Date.now()}); 
        else db.collection("queue").doc(id).update({status:s}); 
    } else { 
        let idx=-1; if(typeof id==='string' && id.startsWith('local_')) idx=queueData.findIndex(x=>x.id===id); else idx=parseInt(id); 
        if(idx>-1 && queueData[idx]){ 
            queueData[idx].status = s; 
            if(s === 'Picked Up') queueData[idx].pickedUpAt = Date.now(); 
            saveLocal('cn_queue',queueData); renderQueue(); renderAdminLists(); 
        } 
    } 
}

// CRUD: CATALOG
function showAddCatModal() { 
    editingCatId = null; document.getElementById('cat-modal-title').innerText = "Add Prize"; 
    document.getElementById('ce-name').value=''; document.getElementById('ce-cost').value=''; 
    document.getElementById('ce-img').value=''; document.getElementById('ce-desc').value=''; 
    document.getElementById('ce-visible').checked=true; document.getElementById('ce-category').value='standard'; 
    document.getElementById('ce-variants-list').innerHTML = ''; 
    toggleCatOptions('standard'); document.getElementById('cat-edit-modal').style.display='flex'; 
}

function addVariantRow(name='', img='') {
    const div = document.createElement('div'); div.className = 'variant-row';
    div.innerHTML = `<input type="text" class="admin-input var-name" placeholder="Name" value="${name}" style="margin:0; flex:1;"><input type="text" class="admin-input var-img" placeholder="Image URL" value="${img}" style="margin:0; flex:2;"><button onclick="this.parentElement.remove()" class="btn-mini" style="background:#e74c3c; width:30px;">X</button>`;
    document.getElementById('ce-variants-list').appendChild(div);
}

function editCatItem(id) { 
    editingCatId = id; const item = catalogData.find(x => x.id === id); if (!item) return; 
    document.getElementById('cat-modal-title').innerText = "Edit Prize"; 
    document.getElementById('ce-name').value = item.name; document.getElementById('ce-cost').value = item.cost; 
    document.getElementById('ce-tier').value = item.tier; document.getElementById('ce-img').value = item.image || ''; 
    document.getElementById('ce-desc').value = item.desc || ''; document.getElementById('ce-visible').checked = item.visible !== false; 
    const catSelect = document.getElementById('ce-category'); catSelect.value = item.category || 'standard'; 
    toggleCatOptions(item.category); 
    if(item.colorFee) document.getElementById('ce-color-fee').value = item.colorFee;
    
    document.getElementById('ce-variants-list').innerHTML = '';
    if (item.variations) { item.variations.forEach(v => addVariantRow(v.name, v.image)); }
    document.getElementById('cat-edit-modal').style.display='flex'; 
}

function saveCatItem() { 
    const n = document.getElementById('ce-name').value; const c = document.getElementById('ce-cost').value; 
    const t = document.getElementById('ce-tier').value; const im = document.getElementById('ce-img').value; 
    const d = document.getElementById('ce-desc').value; const vis = document.getElementById('ce-visible').checked; 
    const cat = document.getElementById('ce-category').value; 
    
    let variations = []; let colorFee = 0;
    if (cat === 'premium') { 
        document.querySelectorAll('#ce-variants-list .variant-row').forEach(row => {
            const vName = row.querySelector('.var-name').value.trim();
            const vImg = row.querySelector('.var-img').value.trim();
            if(vName) variations.push({name: vName, image: vImg});
        });
    }
    if (cat === 'custom') { colorFee = document.getElementById('ce-color-fee').value; }
    
    if(n) { 
        const data = { name:n, cost:c, tier:t, icon:'fa-cube', category:cat, desc: d, image:im, visible:vis, variations: variations, colorFee: colorFee }; 
        if(db) { 
            if(editingCatId) db.collection("catalog").doc(editingCatId).update(data); 
            else db.collection("catalog").add({...data, createdAt: Date.now(), interest: 0}); 
        } else { 
            if(editingCatId) { 
                const idx = catalogData.findIndex(x => x.id === editingCatId); 
                if(idx > -1) catalogData[idx] = {id: editingCatId, ...data, interest: catalogData[idx].interest}; 
            } else { catalogData.push({id: "local_" + Date.now(), ...data, interest: 0}); } 
            saveLocal('cn_catalog', catalogData); renderCatalog(); renderAdminLists(); 
        } 
        closeCatModal(); 
    } 
}

function deleteCatItem(id) { 
    showConfirm("Delete?", () => { 
        if(db) db.collection("catalog").doc(id).delete(); 
        else { catalogData = catalogData.filter(x => x.id !== id); saveLocal('cn_catalog', catalogData); renderCatalog(); renderAdminLists(); } 
    }); 
}

function closeCatModal() { document.getElementById('cat-edit-modal').style.display='none'; }
function toggleCatOptions(v) { document.getElementById('ce-options-container').style.display = v === 'premium' ? 'block' : 'none'; document.getElementById('ce-custom-container').style.display = v === 'custom' ? 'block' : 'none'; }

// OTHER CRUD (News, Rules, Coins)
function openNewsModal(id=null) { editingId=id; if(id){const i=newsData.find(n=>n.id===id); document.getElementById('news-input-title').value=i.title; document.getElementById('news-input-date').value=i.date; document.getElementById('news-input-badge').value=i.badge;}else{document.getElementById('news-input-title').value='';document.getElementById('news-input-date').value='';document.getElementById('news-input-badge').value='';} document.getElementById('news-modal').style.display='flex'; }
function closeNewsModal() { document.getElementById('news-modal').style.display = 'none'; }
function saveNews() { const t=document.getElementById('news-input-title').value; const d=document.getElementById('news-input-date').value; const b=document.getElementById('news-input-badge').value; if(t){ if(db){ if(editingId) db.collection("news").doc(editingId).update({title:t,date:d,badge:b}); else db.collection("news").add({title:t,date:d,badge:b,createdAt:Date.now()}); } else { if(editingId){const idx=newsData.findIndex(n=>n.id===editingId); newsData[idx]={id:editingId,title:t,date:d,badge:b};} else {newsData.unshift({id:"l"+Date.now(),title:t,date:d,badge:b});} saveLocal('cn_news',newsData); renderAdminLists(); renderNews(); } closeNewsModal(); showAlert("Success", "News saved!"); } }
function deleteNews(id) { showConfirm("Delete?", () => { if(db) db.collection("news").doc(id).delete(); else { newsData = newsData.filter(n => n.id !== id); saveLocal('cn_news', newsData); renderAdminLists(); renderNews(); } }); }

function openRulesModal(id=null) { editingId=id; const ti=document.getElementById('rule-input-title'); const di=document.getElementById('rule-input-desc'); ti.placeholder="Category"; di.placeholder="Rule"; if(id){const i=rulesData.find(r=>r.id===id); ti.value=i.title; di.value=i.desc; document.getElementById('rule-input-penalty').value=i.penalty;}else{ti.value='';di.value='';document.getElementById('rule-input-penalty').value='';} document.getElementById('rules-modal').style.display='flex'; }
function closeRulesModal() { document.getElementById('rules-modal').style.display='none'; }
function saveRule() { const title=document.getElementById('rule-input-title').value; const desc=document.getElementById('rule-input-desc').value; const penalty=document.getElementById('rule-input-penalty').value; if(title){ if(db){ if(editingId) db.collection("rules").doc(editingId).update({title,desc,penalty}); else db.collection("rules").add({title,desc,penalty,createdAt:Date.now()}); } else { if(editingId){ const idx=rulesData.findIndex(r=>r.id===editingId); if(idx>-1) rulesData[idx]={id:editingId,title,desc,penalty}; } else { rulesData.push({id:"local_"+Date.now(),title,desc,penalty}); } saveLocal('cn_rules',rulesData); renderAdminLists(); renderRules(); } closeRulesModal(); showAlert("Success", "Rule saved!"); } }
function deleteRule(id) { showConfirm("Delete?", () => { if(db) db.collection("rules").doc(id).delete(); else { rulesData = rulesData.filter(r => r.id !== id); saveLocal('cn_rules', rulesData); renderAdminLists(); renderRules(); } }); }

function openCoinModal(id=null) { editingId=id; if(id){const i=coinsData.find(c=>c.id===id); document.getElementById('coin-input-task').value=i.task; document.getElementById('coin-input-val').value=i.val;}else{document.getElementById('coin-input-task').value='';document.getElementById('coin-input-val').value='';} document.getElementById('coin-modal').style.display='flex'; }
function closeCoinModal() { document.getElementById('coin-modal').style.display='none'; }
function saveCoin() { const task=document.getElementById('coin-input-task').value; const val=document.getElementById('coin-input-val').value; if(task){ if(db){ if(editingId) db.collection("coins").doc(editingId).update({task,val}); else db.collection("coins").add({task,val}); } else { if(editingId){ const idx=coinsData.findIndex(c=>c.id===editingId); if(idx>-1) coinsData[idx]={id:editingId,task,val}; } else { coinsData.push({id:"local_"+Date.now(),task,val}); } saveLocal('cn_coins',coinsData); renderAdminLists(); renderCoins(); } closeCoinModal(); showAlert("Success", "Task saved!"); } }
function deleteCoin(id) { showConfirm("Delete?", () => { if(db) db.collection("coins").doc(id).delete(); else { coinsData = coinsData.filter(c => c.id !== id); saveLocal('cn_coins', coinsData); renderAdminLists(); renderCoins(); } }); }
function moveCoin(index, dir) { if (index + dir < 0 || index + dir >= coinsData.length) return; const temp = coinsData[index]; coinsData[index] = coinsData[index + dir]; coinsData[index + dir] = temp; saveLocal('cn_coins', coinsData); renderAdminLists(); renderCoins(); }

function manageFilaments() { 
    const list = prompt("Edit Filament Colors (Comma Separated):", filamentData.join(', ')); 
    if(list) { 
        filamentData = list.split(',').map(s => s.trim()).filter(s => s); 
        if(db) { db.collection("settings").doc("filaments").set({ colors: filamentData }); } 
        else { saveLocal('cn_filaments', filamentData); } 
        showAlert("Updated", "Filament list updated."); 
    } 
}

function toggleHistoryView() { 
    showHistory = !showHistory; 
    const b = document.querySelector('#admin-queue .btn-edit'); 
    if(b) b.innerText = showHistory ? "Hide History" : "History"; 
    const h = document.getElementById('admin-queue-history-list'); 
    if(h) { h.style.display = showHistory ? 'block' : 'none'; renderQueueHistory(); } 
}

function renderQueueHistory() { 
    const h = document.getElementById('history-content'); if(!h) return; h.innerHTML = ''; 
    const p = queueData.filter(q => q.status === 'Picked Up'); 
    if(p.length === 0) h.innerHTML = '<p style="color:#666;font-size:0.8rem;">No history.</p>'; 
    else p.forEach(q => h.innerHTML += `<div class="admin-list-item" style="opacity:0.6"><strong>${q.name}</strong> - ${q.item} <span style="font-size:0.7rem">${q.createdAt ? new Date(q.createdAt).toLocaleDateString() : 'N/A'}</span></div>`); 
}

function adminSearchNinja() { 
    const q = document.getElementById('admin-lb-search').value.toLowerCase(); 
    const resDiv = document.getElementById('admin-lb-results'); resDiv.innerHTML = ''; 
    if(q.length < 2) return; 
    const found = leaderboardData.filter(n => n.name.toLowerCase().includes(q)); 
    found.slice(0, 5).forEach(n => { 
        resDiv.innerHTML += `<div style="background:#111; padding:10px; margin-bottom:5px; border-radius:4px; cursor:pointer; border:1px solid #333;" onclick="selectNinjaToEdit('${n.id}')">${n.name} <span style="color:var(--color-games); font-weight:bold;">${n.points} pts</span></div>`; 
    }); 
}

function selectNinjaToEdit(id) { 
    const n = leaderboardData.find(x => x.id === id); if(!n) return; editingNinjaId = id; 
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
    const n = leaderboardData.find(x => x.id === editingNinjaId); if(!n) return; 
    const newPoints = (n.points || 0) + val; 
    if(db) { db.collection("leaderboard").doc(editingNinjaId).update({ points: newPoints }); } 
    else { const idx = leaderboardData.findIndex(x => x.id === editingNinjaId); leaderboardData[idx].points = newPoints; saveLocal('cn_leaderboard', leaderboardData); renderLeaderboard(); } 
    document.getElementById('admin-lb-edit').style.display = 'none'; document.getElementById('admin-lb-adjust').value = ''; showAlert("Success", `Updated ${n.name} to ${newPoints} pts`); 
}

function adminAddNinja() { 
    const name = document.getElementById('admin-roster-add-name').value; if(!name) return; 
    const username = generateUsername(name, leaderboardData);
    const data = { name: name, username: username, points: 0, belt: 'White' }; 
    if(db) { db.collection("leaderboard").add(data); } 
    else { leaderboardData.push({id: "local_n_"+Date.now(), ...data}); saveLocal('cn_leaderboard', leaderboardData); renderLeaderboard(); } 
    document.getElementById('admin-roster-add-name').value = ''; 
    showAlert("Success", `Added ${name} (User: ${username})`); 
}

function processCSVFile() { 
    const fileInput = document.getElementById('csv-file-input'); 
    const file = fileInput.files[0]; 
    if (!file) { showAlert("Error", "Please select a CSV file first."); return; } 
    
    const reader = new FileReader(); 
    reader.onload = function(e) { 
        const text = e.target.result; 
        const lines = text.split('\n'); 
        let addedCount = 0; 
        
        let sessionNinjas = [...leaderboardData]; 

        lines.forEach(line => { 
            const parts = line.split(','); 
            if (parts.length > 0) { 
                let name = parts[0].trim().replace(/^"|"$/g, ''); 
                if (name && name.toLowerCase() !== 'name' && name.toLowerCase() !== 'first name') { 
                    
                    const username = generateUsername(name, sessionNinjas);
                    const alreadyExists = sessionNinjas.some(n => n.name.toLowerCase() === name.toLowerCase());

                    if (!alreadyExists) { 
                        const newNinja = { 
                            name: name, 
                            username: username, 
                            points: 0, 
                            belt: 'White', 
                            createdAt: Date.now() 
                        }; 
                        
                        if (db) { db.collection("leaderboard").add(newNinja); } 
                        else { leaderboardData.push({id: "local_n_" + Date.now() + Math.random(), ...newNinja}); } 
                        
                        sessionNinjas.push(newNinja); 
                        addedCount++; 
                    } 
                } 
            } 
        }); 
        
        if (!db) { saveLocal('cn_leaderboard', leaderboardData); renderLeaderboard(); } 
        showAlert("Sync Complete", `Added ${addedCount} new ninjas.`); 
        fileInput.value = ''; 
    }; 
    reader.readAsText(file); 
}

function clearZeroPointNinjas() {
    showConfirm("Remove all ninjas with 0 points?", () => {
        if(db) {
            const batch = db.batch();
            let count = 0;
            leaderboardData.forEach(n => {
                if(n.points === 0) {
                    const ref = db.collection("leaderboard").doc(n.id);
                    batch.delete(ref);
                    count++;
                }
            });
            batch.commit().then(() => showAlert("Cleared", `Removed ${count} entries.`));
        } else {
            const before = leaderboardData.length;
            leaderboardData = leaderboardData.filter(n => n.points > 0);
            const diff = before - leaderboardData.length;
            saveLocal('cn_leaderboard', leaderboardData);
            renderLeaderboard();
            showAlert("Cleared", `Removed ${diff} entries.`);
        }
    });
}

function openJamModal(id) { const j=jamsData.find(x=>x.id===id); if(!j)return; document.getElementById('modal-title').innerText=j.title; document.getElementById('modal-desc').innerText=`Details for ${j.title}`; document.getElementById('modal-deadline').innerText=j.deadline; document.getElementById('jam-modal').style.display='flex'; }
function closeJamModal() { document.getElementById('jam-modal').style.display='none'; }
function openGitHubUpload() { if (GITHUB_REPO_URL.includes("github.com")) window.open(GITHUB_REPO_URL.replace(/\/$/, "") + "/upload/main", '_blank'); else showAlert("Error", "Configure GITHUB_REPO_URL"); }
function toggleAdminViewMode() { const adminView = document.getElementById('admin-view'); const floatingBtn = document.getElementById('floating-admin-toggle'); if (adminView.classList.contains('active')) { adminView.classList.remove('active'); floatingBtn.style.display = 'flex'; } else { adminView.classList.add('active'); floatingBtn.style.display = 'flex'; } }
function showAdminSection(id, btn) { document.querySelectorAll('.admin-section').forEach(e => e.classList.remove('active')); document.getElementById(id).classList.add('active'); document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderAdminLists(); }
function handleLogoClick() { if(window.innerWidth < 768) return; clickCount++; clearTimeout(clickTimer); clickTimer = setTimeout(() => { clickCount = 0; }, 2000); if(clickCount === 3) { clickCount = 0; toggleAdminLogin(); } }

// --- INITIALIZATION ---
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

function subscribeToData() { 
    if (db) { 
        db.collection("news").orderBy("createdAt", "desc").onSnapshot(snap => { newsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderNews(); renderAdminLists(); }); 
        db.collection("rules").orderBy("createdAt", "asc").onSnapshot(snap => { rulesData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderRules(); renderAdminLists(); }); 
        db.collection("coins").onSnapshot(snap => { coinsData = snap.docs.map(d => ({id: d.id, ...d.data()})); coinsData.sort((a, b) => (a.order || 0) - (b.order || 0)); renderCoins(); renderAdminLists(); }); 
        db.collection("catalog").onSnapshot(snap => { catalogData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderCatalog(); renderAdminLists(); }); 
        db.collection("requests").orderBy("createdAt", "desc").onSnapshot(snap => { requestsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderAdminRequests(); }); 
        db.collection("queue").orderBy("createdAt", "asc").onSnapshot(snap => { queueData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderQueue(); renderAdminLists(); }); 
        db.collection("leaderboard").onSnapshot(snap => { leaderboardData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderLeaderboard(); }); 
        db.collection("jams").onSnapshot(snap => { jamsData = snap.docs.map(d => ({id: d.id, ...d.data()})); renderJams(); }); 
        db.collection("settings").doc("filaments").onSnapshot(doc => { if(doc.exists) { filamentData = doc.data().colors || DEFAULT_FILAMENTS; } }); 
    } else { 
        newsData = JSON.parse(localStorage.getItem('cn_news')) || defaultNews; 
        rulesData = JSON.parse(localStorage.getItem('cn_rules')) || defaultRules; 
        coinsData = JSON.parse(localStorage.getItem('cn_coins')) || defaultCoins; 
        catalogData = JSON.parse(localStorage.getItem('cn_catalog')) || defaultCatalog; 
        requestsData = JSON.parse(localStorage.getItem('cn_requests')) || []; 
        queueData = JSON.parse(localStorage.getItem('cn_queue')) || []; 
        leaderboardData = JSON.parse(localStorage.getItem('cn_leaderboard')) || mockLeaderboard; 
        jamsData = JSON.parse(localStorage.getItem('cn_jams')) || []; 
        const storedFilaments = JSON.parse(localStorage.getItem('cn_filaments')); 
        if(storedFilaments) filamentData = storedFilaments; 
        refreshAll(); 
    } 
}

console.log("DASHBOARD SCRIPT LOADED SUCCESSFULLY");