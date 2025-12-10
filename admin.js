// admin.js

/* === MAIN ADMIN RENDERER === */
function renderAdminLists() { 
    renderAdminNews(); renderAdminRules(); renderAdminCoins(); 
    renderAdminCatalog(); renderAdminRequests(); renderAdminQueue(); 
    renderAdminLbPreview(); renderAdminInterest(); 
    renderAdminJamsList(); renderAdminGames(); renderAdminChallenges(); 
}

/* === NEWS, RULES, COINS === */
function renderAdminNews() { const nList = document.getElementById('admin-news-list'); if(nList){ nList.innerHTML=''; newsData.forEach(n => nList.innerHTML += `<div class="admin-list-wrapper"><div class="list-card passed" style="pointer-events:none; margin:0;"><div class="card-info"><h3>${n.title}</h3><p>${n.date}</p></div><div class="status-badge" style="color:var(--color-games)">${n.badge} ></div></div><button onclick="openNewsModal('${n.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteNews('${n.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div>`); } }
function openNewsModal(id=null) { editingId=id; if(id){const i=newsData.find(n=>n.id===id); document.getElementById('news-input-title').value=i.title; document.getElementById('news-input-date').value=i.date; document.getElementById('news-input-badge').value=i.badge;}else{document.getElementById('news-input-title').value='';document.getElementById('news-input-date').value='';document.getElementById('news-input-badge').value='';} document.getElementById('news-modal').style.display='flex'; }
function closeNewsModal() { document.getElementById('news-modal').style.display = 'none'; }
function saveNews() { const t=document.getElementById('news-input-title').value; const d=document.getElementById('news-input-date').value; const b=document.getElementById('news-input-badge').value; if(t){ if(db){ if(editingId) db.collection("news").doc(editingId).update({title:t,date:d,badge:b}); else db.collection("news").add({title:t,date:d,badge:b,createdAt:Date.now()}); } else { if(editingId){const idx=newsData.findIndex(n=>n.id===editingId); newsData[idx]={id:editingId,title:t,date:d,badge:b};} else {newsData.unshift({id:"l"+Date.now(),title:t,date:d,badge:b});} saveLocal('cn_news',newsData); renderAdminLists(); renderNews(); } closeNewsModal(); showAlert("Success", "News saved!"); } }
function deleteNews(id) { showConfirm("Delete?", () => { if(db) db.collection("news").doc(id).delete(); else { newsData = newsData.filter(n => n.id !== id); saveLocal('cn_news', newsData); renderAdminLists(); renderNews(); } }); }

function renderAdminRules() { const rList = document.getElementById('admin-rules-list'); if(rList){ rList.innerHTML=''; rulesData.forEach(r => { const b = r.penalty ? `<div class="status-badge" style="color:#e74c3c;border:1px solid #e74c3c;">${r.penalty}</div>` : ''; rList.innerHTML += `<div class="admin-list-wrapper"><div class="list-card pending" style="pointer-events:none; margin:0;"><div class="card-info"><h3>${r.title}</h3><p>${r.desc}</p></div>${b}</div><button onclick="openRulesModal('${r.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteRule('${r.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div>`; }); } }
function openRulesModal(id=null) { editingId=id; const ti=document.getElementById('rule-input-title'); const di=document.getElementById('rule-input-desc'); ti.placeholder="Category"; di.placeholder="Rule"; if(id){const i=rulesData.find(r=>r.id===id); ti.value=i.title; di.value=i.desc; document.getElementById('rule-input-penalty').value=i.penalty;}else{ti.value='';di.value='';document.getElementById('rule-input-penalty').value='';} document.getElementById('rules-modal').style.display='flex'; }
function closeRulesModal() { document.getElementById('rules-modal').style.display='none'; }
function saveRule() { const title=document.getElementById('rule-input-title').value; const desc=document.getElementById('rule-input-desc').value; const penalty=document.getElementById('rule-input-penalty').value; if(title){ if(db){ if(editingId) db.collection("rules").doc(editingId).update({title,desc,penalty}); else db.collection("rules").add({title,desc,penalty,createdAt:Date.now()}); } else { if(editingId){ const idx=rulesData.findIndex(r=>r.id===editingId); if(idx>-1) rulesData[idx]={id:editingId,title,desc,penalty}; } else { rulesData.push({id:"local_"+Date.now(),title,desc,penalty}); } saveLocal('cn_rules',rulesData); renderAdminLists(); renderRules(); } closeRulesModal(); showAlert("Success", "Rule saved!"); } }
function deleteRule(id) { showConfirm("Delete?", () => { if(db) db.collection("rules").doc(id).delete(); else { rulesData = rulesData.filter(r => r.id !== id); saveLocal('cn_rules', rulesData); renderAdminLists(); renderRules(); } }); }

function renderAdminCoins() { const cList = document.getElementById('admin-coins-list'); if(cList){ cList.innerHTML=''; coinsData.forEach((c, index) => { const upBtn = index > 0 ? `<button onclick="moveCoin(${index}, -1)" class="btn-arrow">⬆</button>` : '<span class="btn-arrow-placeholder"></span>'; const downBtn = index < coinsData.length - 1 ? `<button onclick="moveCoin(${index}, 1)" class="btn-arrow">⬇</button>` : '<span class="btn-arrow-placeholder"></span>'; cList.innerHTML += `<div class="admin-list-wrapper"><div style="display:flex; flex-direction:column; margin-right:5px;">${upBtn}${downBtn}</div><div style="flex-grow:1;background:#161932;padding:10px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;"><span style="color:white;font-weight:bold;">${c.task}</span><div>${formatCoinBreakdown(c.val)}</div></div><button onclick="openCoinModal('${c.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteCoin('${c.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div>`; }); } }
function openCoinModal(id=null) { editingId=id; if(id){const i=coinsData.find(c=>c.id===id); document.getElementById('coin-input-task').value=i.task; document.getElementById('coin-input-val').value=i.val;}else{document.getElementById('coin-input-task').value='';document.getElementById('coin-input-val').value='';} document.getElementById('coin-modal').style.display='flex'; }
function closeCoinModal() { document.getElementById('coin-modal').style.display='none'; }
function saveCoin() { const task=document.getElementById('coin-input-task').value; const val=document.getElementById('coin-input-val').value; if(task){ if(db){ if(editingId) db.collection("coins").doc(editingId).update({task,val}); else db.collection("coins").add({task,val}); } else { if(editingId){ const idx=coinsData.findIndex(c=>c.id===editingId); if(idx>-1) coinsData[idx]={id:editingId,task,val}; } else { coinsData.push({id:"local_"+Date.now(),task,val}); } saveLocal('cn_coins',coinsData); renderAdminLists(); renderCoins(); } closeCoinModal(); showAlert("Success", "Task saved!"); } }
function deleteCoin(id) { showConfirm("Delete?", () => { if(db) db.collection("coins").doc(id).delete(); else { coinsData = coinsData.filter(c => c.id !== id); saveLocal('cn_coins', coinsData); renderAdminLists(); renderCoins(); } }); }
function moveCoin(index, dir) { if (index + dir < 0 || index + dir >= coinsData.length) return; const temp = coinsData[index]; coinsData[index] = coinsData[index + dir]; coinsData[index + dir] = temp; saveLocal('cn_coins', coinsData); renderAdminLists(); renderCoins(); }

/* === CATALOG & INTEREST === */
function renderAdminCatalog() { const catList = document.getElementById('admin-cat-list'); if(!catList) return; catList.innerHTML=''; const tiers = ['tier1','tier2','tier3','tier4']; const tierNames = {'tier1':'Tier 1','tier2':'Tier 2','tier3':'Tier 3','tier4':'Tier 4'}; tiers.forEach(t => { catList.innerHTML += `<div class="admin-tier-header">${tierNames[t]}</div>`; let g = `<div class="admin-store-grid">`; catalogData.filter(i => i.tier === t).forEach(i => { let img = i.image && i.image.length > 5 ? `<img src="${i.image}">` : `<i class="fa-solid ${i.icon}"></i>`; let h = i.visible === false ? 'hidden' : ''; let typeBadge = i.category === 'custom' ? 'CUSTOM' : (i.category === 'premium' ? 'PREMIUM' : (i.category === 'limited' ? 'LIMITED' : 'STD')); g += `<div class="admin-store-card ${h}"><div class="admin-store-icon">${img}</div><div style="flex-grow:1;"><h4 style="margin:0;color:white;font-size:0.9rem;">${i.name}</h4><div style="font-size:0.6rem; color:#aaa;">${typeBadge} | ${i.cost} Gold</div></div><div class="admin-store-actions"><button onclick="editCatItem('${i.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteCatItem('${i.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div></div>`; }); g += `</div>`; catList.innerHTML += g; }); }
function showAddCatModal() { editingCatId = null; document.getElementById('cat-modal-title').innerText = "Add Prize"; document.getElementById('ce-name').value=''; document.getElementById('ce-cost').value=''; document.getElementById('ce-img').value=''; document.getElementById('ce-desc').value=''; document.getElementById('ce-visible').checked=true; document.getElementById('ce-category').value='standard'; document.getElementById('ce-variants-list').innerHTML = ''; document.getElementById('ce-prem-color-check').checked = false; document.getElementById('ce-prem-color-fee').value = ''; document.getElementById('ce-prem-fee-wrap').style.display = 'none'; toggleCatOptions('standard'); document.getElementById('cat-edit-modal').style.display='flex'; }
function addVariantRow(name='', img='') { const div = document.createElement('div'); div.className = 'variant-row'; div.innerHTML = `<input type="text" class="admin-input var-name" placeholder="Name" value="${name}" style="margin:0; flex:1;"><input type="text" class="admin-input var-img" placeholder="Image URL" value="${img}" style="margin:0; flex:2;"><button onclick="this.parentElement.remove()" class="btn-mini" style="background:#e74c3c; width:30px;">X</button>`; document.getElementById('ce-variants-list').appendChild(div); }
function editCatItem(id) { editingCatId = id; const item = catalogData.find(x => x.id === id); if (!item) return; document.getElementById('cat-modal-title').innerText = "Edit Prize"; document.getElementById('ce-name').value = item.name; document.getElementById('ce-cost').value = item.cost; document.getElementById('ce-tier').value = item.tier; document.getElementById('ce-img').value = item.image || ''; document.getElementById('ce-desc').value = item.desc || ''; document.getElementById('ce-visible').checked = item.visible !== false; const catSelect = document.getElementById('ce-category'); catSelect.value = item.category || 'standard'; toggleCatOptions(item.category); if(item.colorFee) { document.getElementById('ce-color-fee').value = item.colorFee; document.getElementById('ce-prem-color-fee').value = item.colorFee; } if(item.category === 'premium') { const hasColor = item.colorSelection === true; document.getElementById('ce-prem-color-check').checked = hasColor; document.getElementById('ce-prem-fee-wrap').style.display = hasColor ? 'block' : 'none'; } document.getElementById('ce-variants-list').innerHTML = ''; if (item.variations) { item.variations.forEach(v => addVariantRow(v.name, v.image)); } document.getElementById('cat-edit-modal').style.display='flex'; }
function saveCatItem() { const n = document.getElementById('ce-name').value; const c = document.getElementById('ce-cost').value; const t = document.getElementById('ce-tier').value; const im = document.getElementById('ce-img').value; const d = document.getElementById('ce-desc').value; const vis = document.getElementById('ce-visible').checked; const cat = document.getElementById('ce-category').value; let variations = []; let colorFee = 0; let colorSelection = false; if (cat === 'premium') { document.querySelectorAll('#ce-variants-list .variant-row').forEach(row => { const vName = row.querySelector('.var-name').value.trim(); const vImg = row.querySelector('.var-img').value.trim(); if(vName) variations.push({name: vName, image: vImg}); }); colorSelection = document.getElementById('ce-prem-color-check').checked; if(colorSelection) { colorFee = document.getElementById('ce-prem-color-fee').value; } } if (cat === 'custom') { colorFee = document.getElementById('ce-color-fee').value; } if(n) { const data = { name:n, cost:c, tier:t, icon:'fa-cube', category:cat, desc: d, image:im, visible:vis, variations: variations, colorFee: colorFee, colorSelection: colorSelection }; if(db) { if(editingCatId) db.collection("catalog").doc(editingCatId).update(data); else db.collection("catalog").add({...data, createdAt: Date.now(), interest: 0}); } else { if(editingCatId) { const idx = catalogData.findIndex(x => x.id === editingCatId); if(idx > -1) catalogData[idx] = {id: editingCatId, ...data, interest: catalogData[idx].interest}; } else { catalogData.push({id: "local_" + Date.now(), ...data, interest: 0}); } saveLocal('cn_catalog', catalogData); renderCatalog(); renderAdminLists(); } closeCatModal(); } }
function deleteCatItem(id) { showConfirm("Delete?", () => { if(db) db.collection("catalog").doc(id).delete(); else { catalogData = catalogData.filter(x => x.id !== id); saveLocal('cn_catalog', catalogData); renderCatalog(); renderAdminLists(); } }); }
function closeCatModal() { document.getElementById('cat-edit-modal').style.display='none'; }
function toggleCatOptions(v) { document.getElementById('ce-options-container').style.display = v === 'premium' ? 'block' : 'none'; document.getElementById('ce-custom-container').style.display = v === 'custom' ? 'block' : 'none'; }
function renderAdminInterest() { const intList = document.getElementById('admin-interest-list'); if(!intList) return; intList.innerHTML = ''; const st = catalogData.filter(c => (c.category === 'standard' || c.category === 'limited') && (c.interest || 0) > 0); if(st.length === 0) { intList.innerHTML = '<p style="color:#666; width:100%; text-align:center; padding:20px; font-size:0.9rem;">No active interest.</p>'; } else { st.sort((a, b) => b.interest - a.interest); st.forEach(s => { let img = s.image && s.image.length > 5 ? `<img src="${s.image}">` : `<i class="fa-solid ${s.icon}"></i>`; let extraClass = s.category === 'limited' ? 'style="border:1px solid #e74c3c;"' : ''; let namePrefix = s.category === 'limited' ? '<span style="color:#e74c3c;font-size:0.7rem;">[LTD]</span> ' : ''; intList.innerHTML += `<div class="interest-card-square" ${extraClass}><div class="interest-visual">${img}</div><div style="width:100%;"><h4 style="margin:5px 0; color:white; font-size:0.9rem;">${namePrefix}${s.name}</h4><div class="interest-count-badge">${s.interest} Requests</div></div><div style="width:100%;"><button class="interest-reset-btn" onclick="resetInterest('${s.id}')">RESET</button></div></div>`; }); } }

/* === QUEUE & REQUESTS === */
function renderAdminRequests() { const c = document.getElementById('admin-requests-list'); if(!c) return; c.innerHTML = ''; const pending = requestsData.filter(r => r.status === 'Waiting for Payment'); if(pending.length === 0) { c.innerHTML = '<p style="color:#666; padding:10px;">No incoming payment requests.</p>'; return; } pending.forEach(r => { c.innerHTML += `<div class="req-item"><div style="flex:1;"><div style="color:white; font-weight:bold;">${r.name}</div><div style="color:var(--color-catalog); font-weight:600;">${r.item}</div><div style="color:#888; font-size:0.75rem;">${r.details}</div><div style="color:#aaa; font-size:0.7rem; margin-top:2px;">${new Date(r.createdAt).toLocaleDateString()}</div></div><div class="req-actions"><button onclick="approveRequest('${r.id}')" style="background:#2ecc71; color:black;">PAID</button><button onclick="deleteRequest('${r.id}')" style="background:#e74c3c; color:white;">DEL</button></div></div>`; }); }
function renderAdminQueue() {
    const qList = document.getElementById('admin-queue-manage-list');
    if (!qList) return;
    
    qList.innerHTML = '';

    // Filter active items
    const activeQ = queueData.filter(q => 
        q.status !== 'Picked Up' && q.status !== 'Waiting for Payment'
    );

    // Sort Chronologically (Oldest First)
    activeQ.sort((a, b) => a.createdAt - b.createdAt);

    if (activeQ.length === 0) {
        qList.innerHTML = '<p style="color:#666; padding:10px;">Queue is empty.</p>';
        return;
    }

    activeQ.forEach(q => {
        const id = q.id ? `'${q.id}'` : `'${queueData.indexOf(q)}'`;
        const detHtml = q.details ? `| ${q.details}` : '';
        
        // Determine Color
        let colorCode = '#444'; 
        const s = q.status.toLowerCase();
        
        if (s.includes('ready')) {
            colorCode = '#2ecc71'; // Green
        } else if (s.includes('printing')) {
            colorCode = '#9b59b6'; // Purple
        } else if (s.includes('pending')) {
            colorCode = '#7f8c8d'; // Gray
        } else if (s.includes('waiting')) {
            colorCode = '#3498db'; // Blue
        }

        // Added border-left: 4px solid ${colorCode} to the style attribute
        qList.innerHTML += `
            <div class="admin-list-item" style="display:block; margin-bottom:10px; background:#161932; padding:10px; border-radius:6px; border:1px solid #34495e; border-left: 4px solid ${colorCode};">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${q.name}</strong> 
                    <span class="status-badge" style="color:white; background:${colorCode};">${q.status}</span>
                </div>
                <div style="color:#aaa; font-size:0.8rem;">
                    ${q.item} ${detHtml}
                </div>
                <div style="margin-top:5px; display:flex; gap:5px;">
                    <button onclick="updateQueueStatus(${id},'Pending')" class="admin-btn" style="width:auto; padding:2px 8px; font-size:0.7rem; background:#555;">Pend</button>
                    <button onclick="updateQueueStatus(${id},'Printing')" class="admin-btn" style="width:auto; padding:2px 8px; font-size:0.7rem; background:#9b59b6;">Print</button>
                    <button onclick="updateQueueStatus(${id},'Ready!')" class="admin-btn" style="width:auto; padding:2px 8px; font-size:0.7rem; background:#2ecc71;">Ready</button>
                    <button onclick="updateQueueStatus(${id},'Picked Up')" class="admin-btn" style="width:auto; padding:2px 8px; font-size:0.7rem; background:#1abc9c;">Done</button>
                </div>
            </div>
        `;
    });
}
function toggleHistoryView() { showHistory = !showHistory; const b = document.querySelector('#admin-queue .btn-edit'); if(b) b.innerText = showHistory ? "Hide History" : "History"; const h = document.getElementById('admin-queue-history-list'); if(h) { h.style.display = showHistory ? 'block' : 'none'; renderQueueHistory(); } }
function renderQueueHistory() { const h = document.getElementById('history-content'); if(!h) return; h.innerHTML = ''; const p = queueData.filter(q => q.status === 'Picked Up'); if(p.length === 0) h.innerHTML = '<p style="color:#666;font-size:0.8rem;">No history.</p>'; else p.forEach(q => { const detHtml = q.details ? ` - ${q.details}` : ''; h.innerHTML += `<div class="admin-list-item" style="opacity:0.6"><strong>${q.name}</strong> - ${q.item} ${detHtml} <span style="font-size:0.7rem">${q.createdAt ? new Date(q.createdAt).toLocaleDateString() : 'N/A'}</span></div>`; }); }

/* === ROSTER & LEADERBOARD === */
function renderAdminLbPreview() { const c = document.getElementById('admin-lb-preview-list'); if(!c) return; c.innerHTML = ''; const sorted = [...leaderboardData].sort((a,b) => b.points - a.points); if (sorted.length === 0) { c.innerHTML = '<p style="color:#666; padding:10px;">No ninjas yet.</p>'; return; } sorted.forEach((ninja, index) => { const u = ninja.username ? ` <span style="font-size:0.7rem; color:#aaa;">(${ninja.username})</span>` : ''; c.innerHTML += `<div class="admin-lb-preview-row"><div class="admin-lb-rank">#${index + 1}</div><div class="admin-lb-name">${formatName(ninja.name)}${u}</div><div class="admin-lb-points">${ninja.points}</div></div>`; }); }
function adminSearchNinja() { const q = document.getElementById('admin-lb-search').value.toLowerCase(); const resDiv = document.getElementById('admin-lb-results'); resDiv.innerHTML = ''; if(q.length < 2) return; const found = leaderboardData.filter(n => n.name.toLowerCase().includes(q) || (n.username && n.username.toLowerCase().includes(q))); found.slice(0, 5).forEach(n => { const u = n.username ? ` (${n.username})` : ''; resDiv.innerHTML += `<div style="background:#111; padding:10px; margin-bottom:5px; border-radius:4px; cursor:pointer; border:1px solid #333;" onclick="selectNinjaToEdit('${n.id}')">${formatName(n.name)} <span style="color:#888; font-size:0.8rem;">${u}</span> <span style="color:var(--color-games); font-weight:bold; float:right;">${n.points} pts</span></div>`; }); }
function selectNinjaToEdit(id) { const n = leaderboardData.find(x => x.id === id); if(!n) return; editingNinjaId = id; document.getElementById('admin-lb-results').innerHTML = ''; document.getElementById('admin-lb-search').value = ''; document.getElementById('admin-lb-edit').style.display = 'block'; document.getElementById('admin-lb-name').innerText = formatName(n.name) + (n.username ? ` (${n.username})` : ''); document.getElementById('admin-lb-current').innerText = n.points; document.getElementById('admin-lb-obsidian').value = ''; document.getElementById('admin-lb-gold').value = ''; document.getElementById('admin-lb-silver').value = ''; }
function adminUpdatePoints() { if(!editingNinjaId) return; const obs = parseInt(document.getElementById('admin-lb-obsidian').value) || 0; const gold = parseInt(document.getElementById('admin-lb-gold').value) || 0; const silver = parseInt(document.getElementById('admin-lb-silver').value) || 0; const val = (obs * 25) + (gold * 5) + (silver * 1); if(val === 0 && !confirm("Update points by 0?")) return; const n = leaderboardData.find(x => x.id === editingNinjaId); if(!n) return; const newPoints = (n.points || 0) + val; if(db) { db.collection("leaderboard").doc(editingNinjaId).update({ points: newPoints }); } else { const idx = leaderboardData.findIndex(x => x.id === editingNinjaId); leaderboardData[idx].points = newPoints; saveLocal('cn_leaderboard', leaderboardData); renderLeaderboard(); } document.getElementById('admin-lb-edit').style.display = 'none'; document.getElementById('admin-lb-obsidian').value = ''; document.getElementById('admin-lb-gold').value = ''; document.getElementById('admin-lb-silver').value = ''; showAlert("Success", `Updated ${formatName(n.name)} to ${newPoints} pts`); }
function adminAddNinja() { const name = document.getElementById('admin-roster-add-name').value; if(!name) return; const formatted = formatName(name); const username = generateUsername(name, leaderboardData); const data = { name: formatted, username: username, points: 0, belt: 'White' }; if(db) { db.collection("leaderboard").add(data); } else { leaderboardData.push({id: "local_n_"+Date.now(), ...data}); saveLocal('cn_leaderboard', leaderboardData); renderLeaderboard(); } document.getElementById('admin-roster-add-name').value = ''; showAlert("Success", `Added ${formatted} (User: ${username})`); }
function processCSVFile() { const fileInput = document.getElementById('csv-file-input'); const file = fileInput.files[0]; if (!file) { showAlert("Error", "Please select a CSV file first."); return; } const reader = new FileReader(); reader.onload = function(e) { const text = e.target.result; const lines = text.split('\n'); if (lines.length < 2) { showAlert("Error", "CSV is empty or missing headers."); return; } const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase()); const idxFirst = headers.indexOf('participant first name'); const idxLast = headers.indexOf('participant last name'); const idxRank = headers.indexOf('rank'); const idxMem = headers.indexOf('membership'); const idxUser = headers.indexOf('ninja username'); if (idxFirst === -1 || idxLast === -1) { showAlert("Error", "CSV missing 'Participant First Name' or 'Participant Last Name'"); return; } let addedCount = 0; let sessionNinjas = [...leaderboardData]; for (let i = 1; i < lines.length; i++) { const line = lines[i].trim(); if (!line) continue; const parts = parseCSVLine(line); const getVal = (idx) => (idx !== -1 && idx < parts.length) ? parts[idx] : ""; const fName = getVal(idxFirst); const lName = getVal(idxLast); if (!fName) continue; const displayName = formatName(fName + " " + lName); let belt = getVal(idxRank); if (!belt) { const mem = getVal(idxMem).toLowerCase(); if (mem.includes('jr')) belt = "JR White"; else if (mem.includes('robotics')) belt = "Robotics"; else if (mem.includes('ai academy')) belt = "AI"; else belt = "White"; } let username = getVal(idxUser); if (!username) { username = generateUsername(fName + "." + lName, sessionNinjas); } const exists = sessionNinjas.some(n => (n.username && n.username.toLowerCase() === username.toLowerCase()) || n.name === displayName); if (!exists) { const newNinja = { name: displayName, username: username, points: 0, belt: belt, createdAt: Date.now() }; if (db) { db.collection("leaderboard").add(newNinja); } else { leaderboardData.push({id: "local_n_" + Date.now() + Math.random(), ...newNinja}); } sessionNinjas.push(newNinja); addedCount++; } } if (!db) { saveLocal('cn_leaderboard', leaderboardData); renderLeaderboard(); } showAlert("Sync Complete", `Added ${addedCount} new ninjas.`); fileInput.value = ''; }; reader.readAsText(file); }
function clearZeroPointNinjas() { showConfirm("Remove all ninjas with 0 points?", () => { if(db) { const batch = db.batch(); let count = 0; leaderboardData.forEach(n => { if(n.points === 0) { const ref = db.collection("leaderboard").doc(n.id); batch.delete(ref); count++; } }); batch.commit().then(() => showAlert("Cleared", `Removed ${count} entries.`)); } else { const before = leaderboardData.length; leaderboardData = leaderboardData.filter(n => n.points > 0); const diff = before - leaderboardData.length; saveLocal('cn_leaderboard', leaderboardData); renderLeaderboard(); showAlert("Cleared", `Removed ${diff} entries.`); } }); }

/* === JAMS & CHALLENGES === */
function renderAdminJamsList() { const c = document.getElementById('admin-jams-list'); if(!c) return; c.innerHTML = ''; jamsData.forEach(j => { const color = j.color || '#2ecc71'; c.innerHTML += `<div class="admin-list-wrapper"><div class="list-card" onclick="openAdminJamModal('${j.id}')" style="margin:0; border-left-color:${color}; cursor:pointer; flex-grow:1;"><div class="card-info"><h3>${j.title}</h3><p>${j.dates}</p></div><div class="status-badge" style="color:${color}">${j.status || 'Active'}</div></div><button onclick="deleteJam('${j.id}')" class="btn-mini" style="background:#e74c3c; margin-left:10px;">Del</button></div>`; }); }
function openAdminJamModal(id=null) { editingJamId = id; document.getElementById('jam-submissions-area').style.display = 'none'; if(id) { const j = jamsData.find(x => x.id === id); document.getElementById('jam-modal-header').innerText = "Edit Jam"; document.getElementById('jam-title').value = j.title; document.getElementById('jam-dates').value = j.dates; document.getElementById('jam-type').value = j.type; document.getElementById('jam-image').value = j.image; document.getElementById('jam-header').value = j.header; document.getElementById('jam-desc').value = j.desc; document.getElementById('jam-details').value = j.details; document.getElementById('jam-color').value = j.color || '#f1c40f'; document.getElementById('jam-submissions-area').style.display = 'block'; renderJamSubmissionsList(id, j.winners || []); } else { document.getElementById('jam-modal-header').innerText = "Create Jam"; document.getElementById('jam-title').value = ''; document.getElementById('jam-dates').value = ''; document.getElementById('jam-image').value = ''; document.getElementById('jam-header').value = ''; document.getElementById('jam-desc').value = ''; document.getElementById('jam-details').value = ''; document.getElementById('jam-color').value = '#f1c40f'; } document.getElementById('jam-admin-modal').style.display = 'flex'; }
function saveJam() { const data = { title: document.getElementById('jam-title').value, dates: document.getElementById('jam-dates').value, type: document.getElementById('jam-type').value, image: document.getElementById('jam-image').value, header: document.getElementById('jam-header').value, desc: document.getElementById('jam-desc').value, details: document.getElementById('jam-details').value, color: document.getElementById('jam-color').value, status: 'active' }; if(!data.title) return; if(db) { if(editingJamId) db.collection("jams").doc(editingJamId).update(data); else db.collection("jams").add({...data, createdAt: Date.now()}); } else { if(editingJamId) { const idx = jamsData.findIndex(j=>j.id===editingJamId); jamsData[idx] = {...jamsData[idx], ...data}; } else { jamsData.push({id:"local_jam_"+Date.now(), ...data, createdAt:Date.now()}); } saveLocal('cn_jams', jamsData); renderJams(); renderAdminLists(); } document.getElementById('jam-admin-modal').style.display = 'none'; }
function deleteJam(id) { showConfirm("Delete this Jam?", () => { if(db) { db.collection("jams").doc(id).delete(); } else { jamsData = jamsData.filter(j => j.id !== id); saveLocal('cn_jams', jamsData); renderJams(); renderAdminJamsList(); } }); }
function renderJamSubmissionsList(jamId, currentWinners) { const list = document.getElementById('jam-subs-list'); list.innerHTML = ''; const subs = jamSubmissions.filter(s => s.jamId === jamId); if(subs.length === 0) { list.innerHTML = '<p style="color:#666;">No submissions yet.</p>'; return; } subs.forEach(s => { const isWinner = currentWinners.some(w => w.id === s.id); const check = isWinner ? 'checked' : ''; list.innerHTML += `<div style="display:flex; align-items:center; background:#111; padding:5px; margin-bottom:5px; border-radius:4px;"><input type="checkbox" class="winner-check" value="${s.id}" ${check} style="margin-right:10px;"><div style="flex-grow:1;"><div style="color:white;">${s.ninjaName}</div><div style="color:#888; font-size:0.7rem;">${s.gameTitle}</div></div><a href="${s.link}" target="_blank" style="color:var(--color-jams); font-size:0.8rem;">Link</a></div>`; }); }
function revealWinners() { if(!editingJamId) return; const checkboxes = document.querySelectorAll('.winner-check:checked'); const winnerIds = Array.from(checkboxes).map(c => c.value); const winners = jamSubmissions.filter(s => winnerIds.includes(s.id)); const update = { status: 'revealed', revealedAt: Date.now(), winners: winners }; if(db) { db.collection("jams").doc(editingJamId).update(update).then(() => showAlert("Success", "Winners Revealed!")); } else { const idx = jamsData.findIndex(j=>j.id===editingJamId); jamsData[idx] = {...jamsData[idx], ...update}; saveLocal('cn_jams', jamsData); renderJams(); showAlert("Success", "Winners Revealed (Local)!"); } document.getElementById('jam-admin-modal').style.display = 'none'; }

function renderAdminChallenges() { const list = document.getElementById('admin-challenges-list'); if(!list) return; list.innerHTML = ''; if(challengesData.length === 0) { list.innerHTML = '<p style="color:#666;">No active challenges.</p>'; return; } challengesData.forEach(c => { const icon = getChallengeIcon(c.type); list.innerHTML += `<div class="admin-list-wrapper"><div class="list-card" style="margin:0; border-left: 4px solid #3498db;"><div class="card-info"><h3><i class="fa-solid ${icon}"></i> ${c.type}</h3><p>${c.desc} (${c.reward})</p></div></div><button onclick="openChallengeModal('${c.id}')" class="btn-mini" style="background:#f39c12;color:black;">Edit</button><button onclick="deleteChallenge('${c.id}')" class="btn-mini" style="background:#e74c3c;">Del</button></div>`; }); }
function openChallengeModal(id=null) { editingChallengeId = id; if(id) { const c = challengesData.find(x => x.id === id); document.getElementById('chal-type').value = c.type; document.getElementById('chal-desc').value = c.desc; document.getElementById('chal-reward').value = c.reward; document.getElementById('chal-duration').value = c.duration || ''; } else { document.getElementById('chal-type').value = 'MakeCode Arcade'; document.getElementById('chal-desc').value = ''; document.getElementById('chal-reward').value = ''; document.getElementById('chal-duration').value = ''; } document.getElementById('challenge-admin-modal').style.display = 'flex'; }
function saveChallenge() { const type = document.getElementById('chal-type').value; const desc = document.getElementById('chal-desc').value; const reward = document.getElementById('chal-reward').value; const duration = document.getElementById('chal-duration').value; if(!desc) return showAlert("Error", "Description required"); const data = { type, desc, reward, duration }; if(db) { if(editingChallengeId) db.collection("challenges").doc(editingChallengeId).update(data); else db.collection("challenges").add(data); } else { if(editingChallengeId) { const idx = challengesData.findIndex(c => c.id === editingChallengeId); challengesData[idx] = {...challengesData[idx], ...data}; } else { challengesData.push({id:"local_chal_"+Date.now(), ...data}); } saveLocal('cn_challenges', challengesData); renderChallenges(); renderAdminChallenges(); } document.getElementById('challenge-admin-modal').style.display = 'none'; }
function deleteChallenge(id) { showConfirm("Delete this challenge?", () => { if(db) { db.collection("challenges").doc(id).delete(); } else { challengesData = challengesData.filter(c => c.id !== id); saveLocal('cn_challenges', challengesData); renderChallenges(); renderAdminChallenges(); } }); }

function renderAdminGames() {
    const activeGame = gamesData.find(g => g.status === 'active');
    if(activeGame) {
        document.getElementById('ag-title').value = activeGame.title;
        document.getElementById('ag-image').value = activeGame.image;
        document.getElementById('ag-desc').value = activeGame.desc;
        document.getElementById('ag-link').value = activeGame.link || ''; // Load Link
        renderAdminGameScores(activeGame);
    } else {
        document.getElementById('ag-title').value = '';
        document.getElementById('ag-image').value = '';
        document.getElementById('ag-desc').value = '';
        document.getElementById('ag-link').value = ''; // Clear Link
        document.getElementById('admin-game-scores-list').innerHTML = '<p style="color:#666;">No active game. Create one above.</p>';
    }
}

function saveActiveGame() {
    const title = document.getElementById('ag-title').value;
    const image = document.getElementById('ag-image').value;
    const desc = document.getElementById('ag-desc').value;
    const link = document.getElementById('ag-link').value; // Get Link

    if(!title) return showAlert("Error", "Title required.");

    // Add link to data object
    const gameData = { title, image, desc, link, status: 'active', month: new Date().toLocaleString('default', { month: 'long' }) };
    
    let activeGame = gamesData.find(g => g.status === 'active');
    if(db) {
        if(activeGame) db.collection("games").doc(activeGame.id).update(gameData);
        else db.collection("games").add({ ...gameData, scores: [], createdAt: Date.now() });
    } else {
        if(activeGame) {
            const idx = gamesData.indexOf(activeGame);
            gamesData[idx] = { ...activeGame, ...gameData };
        } else {
            gamesData.push({ id: "local_game_"+Date.now(), ...gameData, scores: [], createdAt: Date.now() });
        }
        saveLocal('cn_games', gamesData);
        renderGames();
        renderAdminGames();
        showAlert("Saved", "Game Updated!");
    }
}function renderAdminGameScores(game) { const list = document.getElementById('admin-game-scores-list'); list.innerHTML = ''; if(!game.scores || game.scores.length === 0) return; game.scores.sort((a,b) => b.score - a.score).forEach((s, idx) => { list.innerHTML += `<div style="display:flex; justify-content:space-between; background:#111; padding:8px; margin-bottom:5px; border-radius:4px;"><span>${idx+1}. ${s.name} - <strong>${s.score}</strong></span><button onclick="deleteGameScore('${s.name}')" style="background:#e74c3c; border:none; color:white; border-radius:4px; cursor:pointer;">X</button></div>`; }); }
function addGameScore() { const name = document.getElementById('ag-score-name').value; const score = parseInt(document.getElementById('ag-score-val').value); if(!name || isNaN(score)) return; const activeGame = gamesData.find(g => g.status === 'active'); if(!activeGame) return showAlert("Error", "Create a game first."); const newScores = activeGame.scores || []; const filtered = newScores.filter(s => s.name !== name); filtered.push({ name, score }); if(db) { db.collection("games").doc(activeGame.id).update({ scores: filtered }); } else { activeGame.scores = filtered; saveLocal('cn_games', gamesData); renderGames(); renderAdminGames(); } document.getElementById('ag-score-name').value = ''; document.getElementById('ag-score-val').value = ''; }
function deleteGameScore(name) { const activeGame = gamesData.find(g => g.status === 'active'); if(!activeGame) return; const newScores = activeGame.scores.filter(s => s.name !== name); if(db) { db.collection("games").doc(activeGame.id).update({ scores: newScores }); } else { activeGame.scores = newScores; saveLocal('cn_games', gamesData); renderGames(); renderAdminGames(); } }
function archiveActiveGame() { const activeGame = gamesData.find(g => g.status === 'active'); if(!activeGame) return; showConfirm("Archive this game? It will move to history.", () => { if(db) { db.collection("games").doc(activeGame.id).update({ status: 'archived' }); } else { activeGame.status = 'archived'; saveLocal('cn_games', gamesData); renderGames(); renderAdminGames(); } }); }

/* === SYSTEM === */
function manageFilaments() { const list = prompt("Edit Filament Colors (Comma Separated):", filamentData.join(', ')); if(list) { filamentData = list.split(',').map(s => s.trim()).filter(s => s); if(db) { db.collection("settings").doc("filaments").set({ colors: filamentData }); } else { saveLocal('cn_filaments', filamentData); } showAlert("Updated", "Filament list updated."); } }
function openGitHubUpload() { if (GITHUB_REPO_URL.includes("github.com")) window.open(GITHUB_REPO_URL.replace(/\/$/, "") + "/upload/main", '_blank'); else showAlert("Error", "Configure GITHUB_REPO_URL"); }
function openJamModal(id) { const j=jamsData.find(x=>x.id===id); if(!j)return; document.getElementById('modal-title').innerText=j.title; document.getElementById('modal-desc').innerText=`Details for ${j.title}`; document.getElementById('modal-deadline').innerText=j.deadline; document.getElementById('jam-modal').style.display='flex'; }
function closeJamModal() { document.getElementById('jam-modal').style.display='none'; }

/* ================= QUEUE MANAGEMENT ================= */

// Manually add an item to the queue (Admin Side)
function adminAddQueueItem() {
    const name = prompt("Ninja Name:");
    if(!name) return;
    const item = prompt("Item Name / Description:");
    if(!item) return;
    const details = prompt("Details (Color/Link) [Optional]:") || "";

    const queueItem = {
        name: name,
        item: item,
        details: details,
        status: "Pending",
        createdAt: Date.now(),
        addedByAdmin: true, // TRACKING FLAG
        adminAddedAt: new Date().toISOString() // Time tracking
    };

    if(db) {
        db.collection("queue").add(queueItem);
    } else {
        queueData.push({id: "local_q_"+Date.now(), ...queueItem});
        saveLocal('cn_queue', queueData);
        renderAdminQueue();
        renderQueue();
    }
    showAlert("Success", "Item added to queue.");
}

// Move a Request -> Queue
function approveRequest(id) {
    const req = requestsData.find(r => r.id === id);
    if (!req) return;

    // Use custom modal with 'success' (Green) theme
    showConfirm(`Mark request for ${req.item} by ${req.name} as PAID?`, () => {
        
        const queueItem = {
            name: req.name,
            item: req.item,
            details: req.details || '',
            status: "Pending",
            createdAt: Date.now(), // Reset time so it joins end of queue
            paidAt: Date.now(),
            originRequestId: id
        };

        if (db) {
            // Add to Queue
            db.collection("queue").add(queueItem)
                .then(() => {
                    // Delete from Requests
                    db.collection("requests").doc(id).delete();
                });
        } else {
            // Local fallback
            queueData.push({id: "local_q_"+Date.now(), ...queueItem});
            requestsData = requestsData.filter(r => r.id !== id);
            saveLocal('cn_queue', queueData);
            saveLocal('cn_requests', requestsData);
            renderAdminLists();
        }
        
    }, 'success');
}

function deleteRequest(id) {
    if(confirm("Delete this request?")) {
        if(db) db.collection("requests").doc(id).delete();
        else {
            requestsData = requestsData.filter(r => r.id !== id);
            saveLocal('cn_requests', requestsData);
            renderAdminRequests();
        }
    }
}

function updateQueueStatus(id, status) {
    // If id is string, use it. If number (index), find object.
    let docId = id;
    if (typeof id === 'number' && !db) {
       docId = queueData[id].id;
    }

    if(db) {
        db.collection("queue").doc(docId).update({ status: status });
    } else {
        const item = queueData.find(q => q.id === docId);
        if(item) item.status = status;
        saveLocal('cn_queue', queueData);
        renderQueue();
        renderAdminQueue();
    }
}

function resetInterest(id) {
    if(!confirm("Reset interest count for this item?")) return;
    
    if(db) {
        db.collection("catalog").doc(id).update({ interest: 0 });
    } else {
        const item = catalogData.find(c => c.id === id);
        if(item) item.interest = 0;
        saveLocal('cn_catalog', catalogData);
        renderAdminInterest();
    }
}