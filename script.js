/**
 * CODE NINJAS DASHBOARD LOGIC
 * v3.1 - Fixed Function Order & Logic
 */

/* ==========================================================================
   1. CONFIGURATION & STATE
   ========================================================================== */
const APP_VERSION = "3.1";

const firebaseConfig = {
  apiKey: "AIzaSyAElu-JLX7yAJJ4vEnR4SMZGn0zf93KvCQ",
  authDomain: "codeninjas-dashboard.firebaseapp.com",
  projectId: "codeninjas-dashboard",
  storageBucket: "codeninjas-dashboard.firebasestorage.app",
  messagingSenderId: "71590347120",
  appId: "1:71590347120:web:5f53a55cd7ffc280fd8fb5"
};

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

// State
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

let currentTier = 'tier1';
let currentRequestItem = null;
let editingCatId = null;
let editingId = null;
let editingNinjaId = null;
let showHistory = false;
let clickCount = 0;
let clickTimer;

// Mock Data
const defaultNews = [{ id: "n1", title: "Minecraft Night", date: "Nov 22", badge: "SOON" }];
const defaultRules = [{ id: "r1", title: "General", desc: "Respect the Dojo equipment.", penalty: "-1 Coin" }];
const defaultCoins = [{ id: "c1", task: "Wear Uniform", val: "+1", type: "silver" }];
const defaultCatalog = [{ id: "cat1", name: "Star", cost: "50 Coins", tier: "tier1", icon: "fa-star", type: "standard", visible: true }];
const mockLeaderboard = [{ id: "l1", name: "Asher Cullin", points: 1250, belt: "Blue" }];


/* ==========================================================================
   2. HELPER FUNCTIONS (Must be defined first)
   ========================================================================== */
function formatName(name) {
    if (!name) return 'Ninja';
    const clean = name.replace(/\./g, ' '); 
    const parts = clean.split(' ').filter(p => p.length > 0);
    if (parts.length === 0) return 'Ninja';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${first} ${lastInitial}.`;
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

function getIconClass(belt) {
    const b = (belt||'white').toLowerCase();
    if(b.includes('robot')) return 'fa-robot';
    if(b.includes('ai')) return 'fa-microchip';
    if(b.includes('jr')) return 'fa-child';
    return 'fa-user-ninja';
}

function saveLocal(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

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

function showTab(id, el) { 
    document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active')); 
    document.getElementById(id).classList.add('active'); 
    document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); 
    el.classList.add('active'); 
}

function openGitHubUpload() { 
    if (GITHUB_REPO_URL.includes("github.com")) {
        window.open(GITHUB_REPO_URL.replace(/\/$/, "") + "/upload/main", '_blank');
    } else {
        showAlert("Error", "Configure GITHUB_REPO_URL");
    }
}


/* ==========================================================================
   3. AUTHENTICATION LOGIC
   ========================================================================== */

function toggleAdminLogin() { 
    const n = document.getElementById('ninja-login-form');
    const a = document.getElementById('admin-login-form');
    if(n.style.display === 'none') { n.style.display = 'block'; a.style.display = 'none'; } 
    else { n.style.display = 'none'; a.style.display = 'block'; document.getElementById('admin-pass').focus(); } 
}

function attemptNinjaLogin() { 
    const n = document.getElementById('login-username').value.trim(); 
    if(!n) return; 
    const u = leaderboardData.find(l => l.name.toLowerCase() === n.toLowerCase()); 
    if(u){ currentUser = u; localStorage.setItem('cn_user', JSON.stringify(u)); enterDashboard(); } 
    else { document.getElementById('login-error-msg').style.display = 'block'; document.getElementById('login-error-msg').innerText = 'Ninja not found in roster.'; } 
}

function attemptAdminLogin() { 
    const e = document.getElementById('admin-email').value; 
    const p = document.getElementById('admin-pass').value; 
    if(p === "@2633Ninjas") { loginAsAdmin(); return; }
    if(auth) {
        auth.signInWithEmailAndPassword(e, p).then(() => loginAsAdmin()).catch(err => { document.getElementById('login-error-msg').style.display = 'block'; document.getElementById('login-error-msg').innerText = 'Access Denied.'; });
    } else { document.getElementById('login-error-msg').style.display = 'block'; document.getElementById('login-error-msg').innerText = 'Access Denied (Offline).'; } 
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
   4. RENDERERS (USER VIEW)
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
    const groups = {};
    rulesData.forEach(r => {
        const cat = r.title || 'General'; 
        if(!groups[cat]) groups[cat] = [];
        groups[cat].push(r);
    });
    for (const [category, items] of Object.entries(groups)) {
        c.innerHTML += `<h3 class="rules-group-header">${category}</h3>`;
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
    const p = document.getElementById('lb-podium'); const l = document.getElementById('lb-list'); 
    if(!p || !l) return;
    p.innerHTML = ''; l.innerHTML = ''; 
    const s = [...leaderboardData].sort((a,b) => b.points - a.points); 
    const v = []; 
    if(s[1]) v.push({...s[1], rank: 2}); 
    if(s[0]) v.push