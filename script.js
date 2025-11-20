// --- CONFIGURATION ---
const QUEUE_CSV_URL = ""; 
const ROSTER_CSV_URL = "";
// ** IMPORTANT: Replace with your actual GitHub Repo URL to use the upload helper **
const GITHUB_REPO_URL = "https://github.com/YOUR_USERNAME/YOUR_REPO_NAME"; 

const FILAMENT_COLORS = ["Jade White", "Light Gray", "Orange", "Sunflower Yellow", "Mistletoe Green", "Cocoa Brown", "Red", "Cyan", "Cobalt Blue", "Purple", "Blue Grey", "Hot Pink", "Black", "Matte Ivory White", "Matte Lilac Purple", "Matte Mandarin Orange", "Matte Plum", "Matte Dark Red", "Matte Grass Green", "Matte Dark Blue", "Matte Ash Gray", "Matte Charcoal", "Glow in Dark Blue", "Silk Blue Hawaii", "Silk+ Gold", "Metal Iridium Gold", "Metal Copper Brown", "Metal Iron Gray"];

// --- DATA ---
const defaultNews = [{ title: "Minecraft Parents Night Out", date: "Nov 22 // Survival Mode", badge: "COMING SOON" }, { title: "Winter Belt Ceremony", date: "Dec 15 // 4:00 PM", badge: "MARK CALENDAR" }, { title: "Holiday Camp: Roblox Tycoons", date: "Dec 20-23", badge: "CAMPS" }, { title: "Dojo Closed: Christmas", date: "Dec 25", badge: "INFO" }];
const defaultJams = [{ id: "winter_jam", title: "Winter Wonderland Jam", deadline: "2025-12-20", type: "game", platform: "Scratch/MakeCode", reqs: ["Must include snow/ice", "Original artwork encouraged", "Teams of 2 allowed"], status: "active", submissions: [{ name: "Alex P.", project: "Snowball Fight", rank: null }, { name: "Sarah M.", project: "Penguin Slide", rank: null }] }, { id: "tinkercad_bridge", title: "Tinkercad Bridge Challenge", deadline: "2025-11-15", type: "3d", platform: "Tinkercad", reqs: ["Must span 10cm", "Support 500g weight", "No infill > 20%"], status: "waiting", submissions: [{ name: "Mikey", project: "Truss Bridge", rank: null }, { name: "Donny", project: "Arch Design", rank: null }] }, { id: "spooky_scratch", title: "Spooky Scratch Contest", deadline: "2025-10-31", type: "game", platform: "Scratch", reqs: ["Scary theme", "Sound effects required"], status: "results", submissions: [{ name: "Leo D.", project: "Haunted Mansion", rank: 1 }, { name: "Mia K.", project: "Ghost Hunter", rank: 2 }, { name: "Sam T.", project: "Zombie Run", rank: 3 }] }];
const defaultRules = [{ title: "Respect Equipment", desc: "Treat keyboards and mice gently.", penalty: "-1 Coin" }, { title: "No Food/Drink", desc: "Keep snacks in the lobby area.", penalty: "-1 Coin" }, { title: "Clean Station", desc: "Push in chair and tidy up.", penalty: "-1 Coin" }, { title: "No Running", desc: "Walk in the Dojo at all times.", penalty: "-1 Coin" }, { title: "Be Helpful", desc: "Help other Ninjas debug code.", penalty: "" }, { title: "Ask for Help", desc: "Raise your hand for a Sensei.", penalty: "" }];
const defaultCoins = [{ task: "Wear Ninja Shirt", val: "+1", type: "silver" }, { task: "Clean Station", val: "+1", type: "silver" }, { task: "Help a Ninja", val: "+2", type: "silver" }, { task: "Complete a Belt", val: "+5", type: "gold" }, { task: "Bring a Friend", val: "+5", type: "gold" }, { task: "Mastery Project", val: "+10", type: "obsidian" }, { task: "Black Belt Test", val: "+20", type: "obsidian" }];
const defaultCatalog = [{ name: "Ninja Star", cost: "50 Coins", tier: "tier1", icon: "fa-star", type: "standard", image: "https://via.placeholder.com/300x200.png?text=Ninja+Star" }, { name: "Key Chain", cost: "75 Coins", tier: "tier1", icon: "fa-key", type: "standard", image: "https://via.placeholder.com/300x200.png?text=Key+Chain" }, { name: "Whistle", cost: "100 Coins", tier: "tier1", icon: "fa-bullhorn", type: "standard", image: "https://via.placeholder.com/300x200.png?text=Whistle" }, { name: "Flexi-Rex", cost: "150 Coins", tier: "tier2", icon: "fa-dragon", type: "standard", image: "https://via.placeholder.com/300x200.png?text=Flexi-Rex" }, { name: "Among Us", cost: "200 Coins", tier: "tier2", icon: "fa-robot", type: "standard", image: "https://via.placeholder.com/300x200.png?text=Among+Us" }, { name: "Minecraft Pickaxe", cost: "250 Coins", tier: "tier2", icon: "fa-hammer", type: "standard", image: "https://via.placeholder.com/300x200.png?text=Pickaxe" }, { name: "Medium Custom Print", cost: "200 Coins", tier: "tier2", icon: "fa-cube", type: "custom" }, { name: "Controller Stand", cost: "350 Coins", tier: "tier3", icon: "fa-gamepad", type: "standard", image: "https://via.placeholder.com/300x200.png?text=Controller+Stand" }, { name: "Headphone Stand", cost: "400 Coins", tier: "tier3", icon: "fa-headphones", type: "standard", image: "https://via.placeholder.com/300x200.png?text=Headphone+Stand" }, { name: "Dice Tower", cost: "450 Coins", tier: "tier3", icon: "fa-dice-d20", type: "standard", image: "https://via.placeholder.com/300x200.png?text=Dice+Tower" }, { name: "Long Custom Print", cost: "400 Coins", tier: "tier3", icon: "fa-cubes", type: "custom" }, { name: "Katana", cost: "500 Coins", tier: "tier4", icon: "fa-khanda", type: "variation", options: ["Demon Slayer", "Traditional", "Sci-Fi"], image: "https://via.placeholder.com/300x200?text=Demon+Slayer+Katana", variationImages: { "Demon Slayer": "https://via.placeholder.com/300x200?text=Demon+Slayer+Katana", "Traditional": "https://via.placeholder.com/300x200?text=Traditional+Katana", "Sci-Fi": "https://via.placeholder.com/300x200?text=Sci-Fi+Katana" } }, { name: "Master Sword", cost: "550 Coins", tier: "tier4", icon: "fa-shield-halved", type: "standard", image: "https://via.placeholder.com/300x200.png?text=Master+Sword" }, { name: "Multi-Color Custom", cost: "600 Coins", tier: "tier4", icon: "fa-palette", type: "custom_multi" }];
const mockLeaderboard = [{ name: "Asher Cullin", points: 1250, belt: "Blue" }, { name: "Colton Wong", points: 1100, belt: "Green" }, { name: "Elliot Koshimizu", points: 950, belt: "Orange" }, { name: "Charlize Phung", points: 800, belt: "Yellow" }, { name: "Ryder Nguyen", points: 750, belt: "Yellow" }, { name: "Adam Feldman", points: 600, belt: "White" }, { name: "Nicholas Lapinta", points: 500, belt: "White" }, { name: "Harper Segura", points: 450, belt: "White" }, { name: "Lucas Lee", points: 300, belt: "White" }, { name: "Nikki Voong", points: 200, belt: "White" }];
const mockQueue = [{ name: "Asher C.", item: "Katana (Demon Slayer)", status: "Printing", details: "Color: Black" }, { name: "Colton W.", item: "Flexi-Rex (Red)", status: "Ready!" }, { name: "Elliot K.", item: "Among Us (Blue)", status: "Waiting to Print" }, { name: "Charlize P.", item: "Custom Print", status: "Waiting for Coins" }, { name: "Ryder N.", item: "Ninja Star", status: "Pending" }];
const mockRequests = [{ name: "Harper S.", item: "Flexi-Rex", details: "Color: Hot Pink", time: "10:30 AM" }, { name: "Lucas L.", item: "Custom Print", details: "Link: tinkercad.com/xyz | Color: Matte Dark Blue", time: "11:15 AM" }];

let newsData = JSON.parse(localStorage.getItem('cn_news')) || defaultNews;
let jamsData = JSON.parse(localStorage.getItem('cn_jams')) || defaultJams;
let rulesData = JSON.parse(localStorage.getItem('cn_rules')) || defaultRules;
let coinsData = JSON.parse(localStorage.getItem('cn_coins')) || defaultCoins;
let catalogData = JSON.parse(localStorage.getItem('cn_catalog')) || defaultCatalog;
let requestsData = JSON.parse(localStorage.getItem('cn_requests')) || mockRequests;
let queueData = mockQueue; 
let leaderboardData = mockLeaderboard;

let currentTier = 'tier1';
let currentRequestItem = null;
let clickCount = 0, clickTimer;
let editingCatIdx = -1;
let editingNinja = null;

// --- DYNAMIC COIN FORMATTER ---
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

// --- ADMIN UI LOGIC ---
function showAdminSection(id, btn) {
    document.querySelectorAll('.admin-section').forEach(e => e.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderAdminLists();
}

function renderAdminLists() {
    const nList = document.getElementById('admin-news-list'); nList.innerHTML = '';
    newsData.forEach((n, i) => nList.innerHTML += `<div class="admin-list-item"><span>${n.title}</span><div class="admin-list-actions"><button onclick="editNews(${i})" class="btn-edit">Edit</button><button onclick="deleteNews(${i})" class="btn-danger">Del</button></div></div>`);
    
    const rList = document.getElementById('admin-rules-list'); rList.innerHTML = '';
    rulesData.forEach((r, i) => rList.innerHTML += `<div class="admin-list-item"><span>${r.title}</span><div class="admin-list-actions"><button onclick="editRule(${i})" class="btn-edit">Edit</button><button onclick="deleteRule(${i})" class="btn-danger">Del</button></div></div>`);

    const cList = document.getElementById('admin-coins-list'); cList.innerHTML = '';
    coinsData.forEach((c, i) => cList.innerHTML += `<div class="admin-list-item"><span>${c.task} (${c.val})</span><div class="admin-list-actions"><button onclick="editCoin(${i})" class="btn-edit">Edit</button><button onclick="deleteCoin(${i})" class="btn-danger">Del</button></div></div>`);

    const catList = document.getElementById('admin-cat-list'); catList.innerHTML = '';
    catalogData.forEach((c, i) => catList.innerHTML += `<div class="admin-list-item"><span>${c.name} (${c.cost})</span><div class="admin-list-actions"><button onclick="editCatItem(${i})" class="btn-edit">Edit</button><button onclick="deleteCatItem(${i})" class="btn-danger">Del</button></div></div>`);

    renderAdminRequests();

    const qList = document.getElementById('admin-queue-manage-list'); qList.innerHTML = '';
    queueData.forEach((q, i) => {
        qList.innerHTML += `
        <div class="admin-list-item" style="display:block;">
            <div style="display:flex; justify-content:space-between;"><strong>${q.name}</strong> <span>${q.status}</span></div>
            <div style="color:#aaa; font-size:0.8rem;">${q.item} ${q.details ? ' | ' + q.details : ''}</div>
            <div style="margin-top:5px;">
                <button onclick="updateQueueStatus(${i}, 'Pending')" class="admin-btn" style="width:auto; padding:2px 5px; font-size:0.7rem; background:#555;">Pending</button>
                <button onclick="updateQueueStatus(${i}, 'Printing')" class="admin-btn" style="width:auto; padding:2px 5px; font-size:0.7rem; background:#9b59b6;">Printing</button>
                <button onclick="updateQueueStatus(${i}, 'Ready!')" class="admin-btn" style="width:auto; padding:2px 5px; font-size:0.7rem; background:#2ecc71;">Ready</button>
                <button onclick="updateQueueStatus(${i}, 'Picked Up')" class="admin-btn" style="width:auto; padding:2px 5px; font-size:0.7rem; background:#3498db;">Done</button>
            </div>
        </div>`;
    });
}

// --- ADMIN CRUD ---
function addNews() { const t=prompt("Title:"); const d=prompt("Date:"); const b=prompt("Badge:"); if(t){newsData.unshift({title:t,date:d,badge:b}); saveData(); renderAdminLists();}}
function editNews(i) { const t=prompt("Title:",newsData[i].title); const d=prompt("Date:",newsData[i].date); const b=prompt("Badge:",newsData[i].badge); if(t){newsData[i]={title:t,date:d,badge:b}; saveData(); renderAdminLists();}}
function deleteNews(i) { newsData.splice(i,1); saveData(); renderAdminLists(); }

function addRule() { const t=prompt("Title:"); const d=prompt("Desc:"); const p=prompt("Penalty:"); if(t){rulesData.push({title:t,desc:d,penalty:p}); saveData(); renderAdminLists();}}
function editRule(i) { const t=prompt("Title:",rulesData[i].title); const d=prompt("Desc:",rulesData[i].desc); const p=prompt("Penalty:",rulesData[i].penalty); if(t){rulesData[i]={title:t,desc:d,penalty:p}; saveData(); renderAdminLists();}}
function deleteRule(i) { rulesData.splice(i,1); saveData(); renderAdminLists(); }

function addCoin() { const t=prompt("Task:"); const v=prompt("Value (e.g. +5):"); if(t){coinsData.push({task:t,val:v}); saveData(); renderAdminLists();}}
function editCoin(i) { const t=prompt("Task:",coinsData[i].task); const v=prompt("Value:",coinsData[i].val); if(t){coinsData[i]={task:t,val:v}; saveData(); renderAdminLists();}}
function deleteCoin(i) { coinsData.splice(i,1); saveData(); renderAdminLists(); }

// CATALOG
function showAddCatModal() { editingCatIdx=-1; document.getElementById('ce-name').value=''; document.getElementById('ce-cost').value=''; document.getElementById('ce-img').value=''; document.getElementById('cat-edit-modal').style.display='flex'; }
function editCatItem(i) { editingCatIdx=i; const x=catalogData[i]; document.getElementById('ce-name').value=x.name; document.getElementById('ce-cost').value=x.cost; document.getElementById('ce-tier').value=x.tier; document.getElementById('ce-img').value=x.image||''; document.getElementById('cat-edit-modal').style.display='flex'; }
function saveCatItem() {
    const n=document.getElementById('ce-name').value; const c=document.getElementById('ce-cost').value; const t=document.getElementById('ce-tier').value; const im=document.getElementById('ce-img').value;
    if(n) { const ob={name:n,cost:c,tier:t,icon:'fa-cube',type:'standard',image:im}; if(editingCatIdx>-1) catalogData[editingCatIdx]=ob; else catalogData.push(ob); saveData(); document.getElementById('cat-edit-modal').style.display='none'; renderAdminLists(); }
}
function deleteCatItem(i) { if(confirm("Del?")) { catalogData.splice(i,1); saveData(); renderAdminLists(); } }
function closeCatModal() { document.getElementById('cat-edit-modal').style.display='none'; }

// NEW: Upload Helper Function
function openGitHubUpload() {
    if (GITHUB_REPO_URL.includes("github.com")) {
        // Construct upload URL: repo + /upload/main
        const uploadUrl = GITHUB_REPO_URL.replace(/\/$/, "") + "/upload/main"; 
        window.open(uploadUrl, '_blank');
    } else {
        alert("Please configure the GITHUB_REPO_URL in script.js first.");
    }
}

// QUEUE & REQ
function approveRequest(i) {
    const r = requestsData[i];
    queueData.push({ name: r.name, item: r.item, status: "Pending", details: r.details });
    requestsData.splice(i, 1);
    saveData();
    renderAdminLists();
}
function updateQueueStatus(i, status) { queueData[i].status = status; saveData(); renderAdminLists(); renderQueue(); }

function renderAdminRequests() {
     const c = document.getElementById('admin-requests-list'); if(!c) return; c.innerHTML = '';
     if(requestsData.length === 0) c.innerHTML = '<p style="color:#666; padding:10px;">No pending requests.</p>';
     requestsData.forEach((r,i) => {
         c.innerHTML += `
         <div class="req-item">
            <div><strong>${r.name}</strong> - ${r.item}<br><span style="color:#aaa; font-size:0.7rem;">${r.details}</span></div>
            <div class="req-actions">
                <button onclick="approveRequest(${i})" style="background:#27ae60; color:white; border:none;">ADD</button>
                <button onclick="deleteRequest(${i})" class="btn-danger">X</button>
            </div>
         </div>`;
     });
}
function deleteRequest(i) { requestsData.splice(i,1); saveData(); renderAdminRequests(); }

// --- RENDERERS ---
function renderNews() { const c=document.getElementById('news-feed'); c.innerHTML=''; newsData.forEach(i=>{ c.innerHTML+=`<div class="list-card passed"><div class="card-info"><h3>${i.title}</h3><p>${i.date}</p></div><div class="status-badge" style="color:var(--color-games)">${i.badge}></div></div>`;}); }
function renderRules() { const c=document.getElementById('rules-feed'); c.innerHTML=''; rulesData.forEach(r=>{ const b=r.penalty?`<div class="status-badge" style="color:#e74c3c; border:1px solid #e74c3c;">${r.penalty}</div>`:''; c.innerHTML+=`<div class="list-card pending"><div class="card-info"><h3>${r.title}</h3><p>${r.desc}</p></div>${b}</div>`;}); }
function renderCoins() { const c=document.getElementById('coin-feed'); c.innerHTML=''; coinsData.forEach(i=>{ c.innerHTML+=`<li class="coin-item"><span>${i.task}</span><div>${formatCoinBreakdown(i.val)}</div></li>`;}); }

function renderCatalog() {
    const c = document.getElementById('catalog-feed'); c.innerHTML='';
    const f = catalogData.filter(i => i.tier === currentTier);
    if(f.length === 0) c.innerHTML = '<p style="color:#666;">No items.</p>';
    else f.forEach(i => {
        const idx = catalogData.indexOf(i);
        let iconOrImg = `<i class="fa-solid ${i.icon}"></i>`;
        if (i.image && i.image.length > 5) iconOrImg = `<img src="${i.image}" alt="${i.name}">`;
        c.innerHTML += `<div class="store-card"><div class="store-icon-circle">${iconOrImg}</div><div class="store-info"><h4>${i.name}</h4><p>${i.cost}</p></div><div class="store-action"><button class="btn-req" onclick="initRequest(${idx})">Request</button></div></div>`;
    });
}

function renderQueue() {
     const c = document.getElementById('queue-list'); c.innerHTML='';
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

// --- LEADERBOARD ADMIN ACTIONS ---
function adminSearchNinja() {
    const q = document.getElementById('admin-lb-search').value.toLowerCase();
    const resDiv = document.getElementById('admin-lb-results');
    resDiv.innerHTML = '';
    if(q.length < 2) return;

    const matches = leaderboardData.filter(n => n.name.toLowerCase().includes(q));
    matches.forEach(m => {
        resDiv.innerHTML += `<div class="admin-list-item" style="cursor:pointer;" onclick="selectNinja('${m.name}', ${m.points})">${m.name} (${m.points})</div>`;
    });
}
function selectNinja(name, points) {
    editingNinja = leaderboardData.find(n => n.name === name);
    document.getElementById('admin-lb-edit').style.display = 'block';
    document.getElementById('admin-lb-name').innerText = name;
    document.getElementById('admin-lb-current').innerText = points;
}
function adminUpdatePoints() {
    if(!editingNinja) return;
    const adj = parseInt(document.getElementById('admin-lb-adjust').value);
    if(!isNaN(adj)) {
        editingNinja.points += adj;
        navigator.clipboard.writeText(editingNinja.points);
        alert(`Updated locally to ${editingNinja.points}.\n\nNew total copied to clipboard!\nPaste into Google Sheet.`);
        saveData();
        document.getElementById('admin-lb-current').innerText = editingNinja.points;
        document.getElementById('admin-lb-adjust').value = '';
    }
}

// --- UTILS & AUTH ---
function saveData() {
    localStorage.setItem('cn_news', JSON.stringify(newsData));
    localStorage.setItem('cn_jams', JSON.stringify(jamsData));
    localStorage.setItem('cn_rules', JSON.stringify(rulesData));
    localStorage.setItem('cn_coins', JSON.stringify(coinsData));
    localStorage.setItem('cn_catalog', JSON.stringify(catalogData));
    localStorage.setItem('cn_requests', JSON.stringify(requestsData));
    refreshAll();
}
function resetData(t) { if(confirm("Reset?")) { if(t==='news') newsData=defaultNews; saveData(); } }
function refreshAll() { renderNews(); renderJams(); renderRules(); renderCoins(); renderCatalog(); fetchQueue(); fetchLeaderboard(); renderAdminRequests(); }

function initRequest(idx) { currentRequestItem = catalogData[idx]; document.getElementById('req-item-name').innerText = currentRequestItem.name; document.getElementById('req-modal').style.display = 'flex'; }
function closeReqModal() { document.getElementById('req-modal').style.display = 'none'; }
function submitRequest() {
    const name = document.getElementById('req-ninja-name').value;
    if(!name) return alert("Name required");
    let details = "";
    if(document.getElementById('req-color')) details += "Color: " + document.getElementById('req-color').value;
    requestsData.push({name, item: currentRequestItem.name, details: details || "Standard", time: new Date().toLocaleString()});
    saveData(); closeReqModal(); alert("Sent!");
}

function handleLogoClick() {
     clickCount++; clearTimeout(clickTimer); clickTimer = setTimeout(() => { clickCount = 0; }, 2000);
     if(clickCount === 3) { clickCount = 0; document.getElementById('admin-auth-modal').style.display = 'flex'; }
}
function closeAdminAuthModal() { document.getElementById('admin-auth-modal').style.display = 'none'; }
function submitAdminAuth() {
    if(checkPass(document.getElementById('admin-auth-input').value)) { 
        document.getElementById('admin-auth-input').value = ''; // CLEARED
        closeAdminAuthModal(); 
        document.getElementById('admin-view').classList.add('active'); 
        showAdminSection('admin-home', document.querySelector('.admin-nav-btn')); 
    }
    else alert("Denied");
}
function checkPass(p) { const c=[64,50,54,51,51,78,105,110,106,97,115]; if(p.length!==c.length)return false; for(let i=0;i<p.length;i++)if(p.charCodeAt(i)!==c[i])return false; return true; }
function exitAdmin() { document.getElementById('admin-view').classList.remove('active'); }
function showTab(id, el) { document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active')); document.getElementById(id).classList.add('active'); document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); el.classList.add('active'); }
function filterCatalog(t, btn) { currentTier=t; document.querySelectorAll('.tier-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderCatalog(); }

// Placeholders for consistency
function getBeltColor(b) { return 'var(--belt-white)'; }
function renderLeaderboard() {}
function renderJams() {}
async function fetchQueue() { if(!QUEUE_CSV_URL) renderQueue(); }
async function fetchLeaderboard() {}

// Init
refreshAll();
setInterval(fetchQueue, 30000);
