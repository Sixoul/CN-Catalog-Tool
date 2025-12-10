// ui.js

/* === HELPER FUNCTIONS === */
function formatName(name) {
    if (!name) return 'Ninja';
    if (name.includes('.') && name.split(' ').length === 2 && name.split(' ')[1].length === 2) return name;
    const clean = name.replace(/\./g, ' '); 
    const parts = clean.split(' ').filter(p => p.length > 0);
    if (parts.length === 0) return 'Ninja';
    const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    let lastInitial = "";
    if (parts.length > 1) { lastInitial = " " + parts[parts.length - 1].charAt(0).toUpperCase() + "."; }
    return first + lastInitial;
}

function parseMarkdown(text, customColor) {
    if(!text) return "";
    const color = customColor || '#f1c40f';
    return text.replace(/\*\*(.*?)\*\*/g, `<span style="color:${color}; font-weight:900; text-shadow:0 0 10px ${color}80;">$1</span>`);
}

function getChallengeIcon(type) {
    switch(type) {
        case 'MakeCode Arcade': return 'fa-gamepad';
        case 'Roblox': return 'fa-vector-square';
        case 'Minecraft': return 'fa-cubes';
        case 'Robotics': return 'fa-robot';
        case '3D Printing': return 'fa-print';
        default: return 'fa-bolt';
    }
}

function formatCostDisplay(costVal) {
    const cost = parseInt(costVal) || 0;
    if (cost === 0) return "Free";
    if (cost % 5 === 0) { return `<span style="color:var(--coin-obsidian); font-weight:bold;">${cost/5} Obsidian Coin${cost/5 > 1 ? 's' : ''}</span>`; }
    if (cost > 5) { const obs = Math.floor(cost / 5); const gold = cost % 5; return `<span style="color:var(--coin-obsidian); font-weight:bold;">${obs} Obsidian</span> <span style="color:var(--coin-gold); font-weight:bold;">${gold} Gold</span>`; }
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
    if(obsVal > 0) html += `<span class="coin-val obsidian"><i class="fa-solid fa-gem"></i> ${obsVal}</span>`;
    if(goldVal > 0) html += `<span class="coin-val gold"><i class="fa-solid fa-circle"></i> ${goldVal}</span>`;
    if(silverVal > 0) html += `<span class="coin-val silver"><i class="fa-solid fa-circle"></i> ${silverVal}</span>`;
    html += `<span style="margin-left:8px; font-size:0.9rem; color:#aaa; font-weight:bold;">${num} Coins</span>`;
    return html;
}

function getBeltColor(belt) { const b = (belt || 'white').toLowerCase(); if(b.includes('jr')) return 'var(--belt-white)'; const map = { 'white': 'var(--belt-white)', 'yellow': 'var(--belt-yellow)', 'orange': 'var(--belt-orange)', 'green': 'var(--belt-green)', 'blue': 'var(--belt-blue)', 'purple': 'var(--belt-purple)', 'brown': 'var(--belt-brown)', 'red': 'var(--belt-red)', 'black': 'var(--belt-black)' }; return map[b] || 'var(--belt-white)'; }
function getIconClass(belt) { const b = (belt||'white').toLowerCase(); if(b.includes('robot')) return 'fa-robot'; if(b.includes('ai')) return 'fa-microchip'; if(b.includes('jr')) return 'fa-child'; return 'fa-user-ninja'; }

/* === TAB SWITCHING === */
function showTab(id, el) { 
    document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active')); 
    document.getElementById(id).classList.add('active'); 
    document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); 
    el.classList.add('active'); 
    
    if (db) {
        if (id === 'catalog') loadCatalog();
        else if (id === 'queue') loadQueue();
        else if (id === 'leaderboard') loadLeaderboard();
        else if (id === 'jams') loadJams();
        else if (id === 'games') loadGames();
    }
}

/* === RENDERERS === */
function renderNews() { const c = document.getElementById('news-feed'); if(!c) return; c.innerHTML=''; newsData.forEach(i => c.innerHTML+=`<div class="list-card passed"><div class="card-info"><h3>${i.title}</h3><p>${i.date}</p></div><div class="status-badge" style="color:var(--color-games)">${i.badge} ></div></div>`); }
function renderRules() { const c = document.getElementById('rules-feed'); if(!c) return; c.innerHTML=''; const groups = {}; rulesData.forEach(r => { const cat = r.title || 'General'; if(!groups[cat]) groups[cat] = []; groups[cat].push(r); }); for (const [category, items] of Object.entries(groups)) { c.innerHTML += `<h3 class="rules-group-header">${category}</h3>`; let gridHtml = `<div class="rules-group-grid">`; items.forEach(r => { const b = r.penalty ? `<div class="status-badge" style="color:#e74c3c;border:1px solid #e74c3c;">${r.penalty}</div>` : ''; gridHtml += `<div class="list-card pending" style="margin:0;"><div class="card-info"><h3>${r.desc}</h3></div>${b}</div>`; }); gridHtml += `</div>`; c.innerHTML += gridHtml; } }
function renderCoins() { const c = document.getElementById('coin-feed'); if(!c) return; c.innerHTML=''; coinsData.forEach(i => c.innerHTML+=`<li class="coin-item"><span>${i.task}</span><div>${formatCoinBreakdown(i.val)}</div></li>`); }
function filterCatalog(tier, btn) { currentTier = tier; document.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('active')); if(btn) btn.classList.add('active'); renderCatalog(); }

function renderCatalog() { 
    const c = document.getElementById('catalog-feed'); if(!c) return; c.innerHTML=''; 
    if(!currentTier) currentTier = 'tier1'; 
    const f = catalogData.filter(i => i.tier === currentTier && i.visible !== false); 
    if(f.length === 0) c.innerHTML = '<p style="color:#666">No items available in this tier.</p>'; 
    else f.forEach(i => { 
        let img = i.image && i.image.length > 5 ? `<img src="${i.image}">` : `<i class="fa-solid ${i.icon || 'fa-cube'}"></i>`; 
        let btnText = "Request"; let btnAction = `onclick="initRequest('${i.id}')"`; 
        let catBadge = ''; let specialClass = ''; 
        if(i.category === 'custom') { btnText = "Custom Print"; catBadge = `<span style="font-size:0.6rem; color:var(--color-jams); border:1px solid var(--color-jams); padding:2px 4px; border-radius:3px; margin-left:5px;">CUSTOM</span>`; } 
        else if(i.category === 'premium') { btnText = "View Options"; catBadge = `<span style="font-size:0.6rem; color:var(--color-catalog); border:1px solid var(--color-catalog); padding:2px 4px; border-radius:3px; margin-left:5px;">PREMIUM</span>`; } 
        else if(i.category === 'limited') { btnText = "Get It Now!"; catBadge = `<span class="badge-limited">LIMITED</span>`; specialClass = 'limited-card'; } 
        c.innerHTML += `<div class="store-card ${specialClass}"><div class="store-icon-circle">${img}</div><div class="store-info"><h4>${i.name} ${catBadge}</h4><p>${formatCostDisplay(i.cost)}</p><div style="font-size:0.75rem; color:#888; margin-top:4px; line-height:1.2;">${i.desc || ''}</div></div><div class="store-action"><button class="btn-req" ${btnAction}>${btnText}</button></div></div>`; 
    }); 
}

function renderQueue() {
    const c = document.getElementById('queue-list');
    if (!c) return;
    
    c.innerHTML = '';
    
    let q;
    
    // 1. Determine List & Sort Order
    if (!showHistory) {
        // Active Queue: Filter 'Picked Up', then SORT by Oldest First (Chronological)
        q = queueData.filter(i => i.status.toLowerCase() !== 'picked up');
        q.sort((a, b) => a.createdAt - b.createdAt); 
    } else {
        // History: Sort by Newest First
        q = [...queueData].sort((a, b) => b.createdAt - a.createdAt);
    }
    
    if (q.length === 0) {
        c.innerHTML = '<p style="color:#666;text-align:center;">Empty.</p>';
        return;
    }

    // 2. Render with Color Borders
    q.forEach((i, x) => {
        let s = i.status;
        let sLow = s.toLowerCase();
        let cl = 'status-pending';
        let icon = 'fa-clock';
        let cc = 'queue-card';
        let borderColor = '#444'; // Default Border

        // Determine Color & Icon based on status
        if (sLow.includes('ready')) {
            cl = 'status-ready';
            icon = 'fa-check';
            cc += ' ready-pickup'; 
            borderColor = '#2ecc71'; // Green
        } else if (sLow.includes('printing')) {
            cl = 'status-printing printing-anim';
            icon = 'fa-print';
            borderColor = '#9b59b6'; // Purple
        } else if (sLow.includes('waiting') && sLow.includes('print')) {
            cl = 'status-waiting-print';
            icon = 'fa-hourglass';
            borderColor = '#3498db'; // Blue
        } else if (sLow.includes('payment')) {
            cl = 'status-waiting-payment';
            icon = 'fa-circle-dollar-to-slot';
            borderColor = '#e74c3c'; // Red
        } else if (sLow.includes('pending')) {
            cl = 'status-pending';
            icon = 'fa-clock';
            borderColor = '#7f8c8d'; // Grey
        }

        const detHtml = i.details ? `<span style="opacity:0.6">| ${i.details}</span>` : '';
        
        c.innerHTML += `
            <div class="${cc}" style="border-left-color: ${borderColor};">
                <div class="q-left">
                    <div class="q-number">${x + 1}</div>
                    <div class="q-info">
                        <h3>${formatName(i.name)}</h3>
                        <p>${i.item} ${detHtml}</p>
                    </div>
                </div>
                <div class="q-status ${cl}">
                    ${s} <i class="fa-solid ${icon}"></i>
                </div>
            </div>`;
    });
}

// In ui.js

function renderLeaderboard() { 
    const p = document.getElementById('lb-podium'); 
    const l = document.getElementById('lb-list'); 
    if(!p || !l) return; 

    p.innerHTML = ''; 
    l.innerHTML = ''; 

    // 1. Sort all data
    const sorted = [...leaderboardData].sort((a,b) => b.points - a.points);
    
    // 2. Define "Main List" (Rank 4+)
    const isAdmin = currentUser && currentUser.isAdmin;
    const listData = isAdmin ? sorted.slice(3) : sorted.slice(3, 10);

    // 3. Render Podium (Ranks 1-3)
    const top3 = sorted.slice(0, 3);
    const podium = []; 
    if(top3[1]) podium.push({...top3[1], rank: 2}); 
    if(top3[0]) podium.push({...top3[0], rank: 1}); 
    if(top3[2]) podium.push({...top3[2], rank: 3}); 

    podium.forEach(i => {
        // Calculate Breakdown
        const num = parseInt(i.points) || 0;
        const obsVal = Math.floor(num / 25);
        const rem = num % 25;
        const goldVal = Math.floor(rem / 5);
        const silverVal = rem % 5;

        // Generate Badges HTML
        let badgesHtml = '';
        if(obsVal > 0) badgesHtml += `<span class="coin-val obsidian"><i class="fa-solid fa-gem"></i> ${obsVal}</span>`;
        if(goldVal > 0) badgesHtml += `<span class="coin-val gold"><i class="fa-solid fa-circle"></i> ${goldVal}</span>`;
        if(silverVal > 0) badgesHtml += `<span class="coin-val silver"><i class="fa-solid fa-circle"></i> ${silverVal}</span>`;
        if(num === 0) badgesHtml = `<span class="coin-val silver">0</span>`;

        // Highlight Current User
        let highlightStyle = '';
        if (currentUser && (i.username === currentUser.username || i.name === currentUser.name)) {
            highlightStyle = 'border: 2px solid var(--color-home); box-shadow: 0 0 15px var(--color-home);';
        }

        p.innerHTML += `
        <div class="lb-card rank-${i.rank}" style="${highlightStyle}">
            <div class="lb-badge">${i.rank}</div>
            <div class="lb-icon" style="border-color:${getBeltColor(i.belt)}">
                <i class="fa-solid ${getIconClass(i.belt)}" style="color:${getBeltColor(i.belt)}"></i>
            </div>
            <div class="lb-name">${formatName(i.name)}</div>
            
            <div class="podium-points-container">
                <div class="podium-badges-row">
                    ${badgesHtml}
                </div>
                <div class="podium-text-row">
                    ${num} Coins
                </div>
            </div>
        </div>`; 
    }); 

    // 4. Render List (Ranks 4+)
    listData.forEach((i, x) => { 
        const realRank = x + 4;
        let highlightStyle = '';
        if (currentUser && (i.username === currentUser.username || i.name === currentUser.name)) {
            highlightStyle = 'border: 2px solid var(--color-home); background: rgba(35, 147, 205, 0.1);';
        }

        l.innerHTML += `
        <div class="lb-row" style="${highlightStyle}">
            <div class="lb-row-rank">#${realRank}</div>
            <div class="lb-row-belt" style="border-color:${getBeltColor(i.belt)}">
                <i class="fa-solid ${getIconClass(i.belt)}" style="color:${getBeltColor(i.belt)}"></i>
            </div>
            <div class="lb-row-name">${formatName(i.name)}</div>
            <div class="lb-row-points">${formatCoinBreakdown(i.points.toString())}</div>
        </div>`; 
    }); 

    // 5. Show Current User at bottom if not in view
    if (currentUser && !isAdmin) {
        const myRankIndex = sorted.findIndex(u => (u.username === currentUser.username || u.name === currentUser.name));
        const myRank = myRankIndex + 1;

        if (myRank > 10) {
            const i = sorted[myRankIndex];
            l.innerHTML += `<div style="text-align:center; color:#666; margin: 10px 0;">...</div>`;
            l.innerHTML += `
            <div class="lb-row" style="border: 2px solid var(--color-home); background: rgba(35, 147, 205, 0.1);">
                <div class="lb-row-rank">#${myRank}</div>
                <div class="lb-row-belt" style="border-color:${getBeltColor(i.belt)}">
                    <i class="fa-solid ${getIconClass(i.belt)}" style="color:${getBeltColor(i.belt)}"></i>
                </div>
                <div class="lb-row-name">${formatName(i.name)}</div>
                <div class="lb-row-points">${formatCoinBreakdown(i.points.toString())}</div>
            </div>`;
        }
    }

    if(typeof renderAdminLbPreview === 'function') renderAdminLbPreview(); 
}

function renderChallenges() { 
    const c = document.getElementById('challenges-feed'); if (!c) return; c.innerHTML = ''; 
    if (challengesData.length === 0) { c.innerHTML = '<p style="color:#666; font-size:0.9rem; padding:10px;">No active challenges.</p>'; return; } 
    challengesData.forEach(item => { 
        const icon = getChallengeIcon(item.type); const duration = item.duration ? item.duration : 'Indefinite'; 
        c.innerHTML += `<div class="challenge-card"><i class="fa-solid ${icon} chal-icon"></i><div class="chal-info"><h4>${item.type}</h4><p>${item.desc}</p><span class="chal-time"><i class="fa-solid fa-clock"></i> ${duration}</span></div><div class="chal-reward">${item.reward}</div></div>`; 
    }); 
}

function renderGames() { 
    renderChallenges(); 
    const activeGame = gamesData.find(g => g.status === 'active'); 
    const pastGames = gamesData.filter(g => g.status === 'archived').sort((a,b) => b.createdAt - a.createdAt); 
    const heroContainer = document.getElementById('active-game-container'); 
    
    if (heroContainer) { 
        if(activeGame) { 
            // Create Button HTML if link exists
            const btnHtml = activeGame.link ? 
                `<a href="${activeGame.link}" target="_blank" style="display:inline-block; margin-top:15px; padding:10px 20px; background:var(--color-games); color:black; font-weight:bold; text-decoration:none; border-radius:6px; box-shadow:0 4px 10px rgba(0,0,0,0.3); transition:0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">PLAY NOW <i class="fa-solid fa-play" style="margin-left:5px;"></i></a>` 
                : '';

            heroContainer.innerHTML = `
            <div class="game-hero" style="background-image: url('${activeGame.image}');">
                <div class="game-hero-content">
                    <h1>${activeGame.title}</h1>
                    <p>${activeGame.desc}</p>
                    ${btnHtml}
                </div>
            </div>`; 
        } else { 
            heroContainer.innerHTML = `<div class="game-hero" style="display:flex;align-items:center;justify-content:center;background:#111;"><h2 style="color:#666;">No Game Selected</h2></div>`; 
        } 
    } 
    const lbContainer = document.getElementById('active-game-lb'); 
    if (lbContainer) { 
        if(activeGame && activeGame.scores && activeGame.scores.length > 0) { 
            lbContainer.innerHTML = ''; const sorted = [...activeGame.scores].sort((a,b) => b.score - a.score).slice(0, 10); 
            sorted.forEach((s, i) => { 
                let prizeHtml = ''; const rank = i + 1; 
                if (rank === 1) prizeHtml = `<span class="coin-val gold">3</span>`; 
                else if (rank === 2) prizeHtml = `<span class="coin-val gold">2</span>`; 
                else if (rank === 3) prizeHtml = `<span class="coin-val gold">1</span>`; 
                else if (rank >= 4 && rank <= 6) prizeHtml = `<span class="coin-val silver">4</span>`; 
                else if (rank >= 7 && rank <= 10) prizeHtml = `<span class="coin-val silver">2</span>`; 
                lbContainer.innerHTML += `<div class="game-lb-row"><div class="g-rank">#${rank}</div><div class="g-name">${formatName(s.name)}</div><div class="g-score">${s.score}</div><div class="g-prize">${prizeHtml}</div></div>`; 
            }); 
        } else { lbContainer.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">No scores yet. Be the first!</p>'; } 
    } 
    const historyList = document.getElementById('games-history-list'); 
    if (historyList) { 
        historyList.innerHTML = ''; 
        if(pastGames.length === 0) { historyList.innerHTML = '<p style="color:#666; text-align:center;">No history.</p>'; } 
        else { pastGames.forEach(g => { historyList.innerHTML += `<div class="list-card" style="margin-bottom:10px; padding:15px;"><div class="card-info"><h3 style="font-size:0.9rem;">${g.title}</h3><p style="font-size:0.7rem;">${g.month || 'Archived'}</p></div></div>`; }); } 
    } 
}

function renderJams() { 
    const track = document.getElementById('jam-carousel-track'); const pastGrid = document.getElementById('past-jams-grid'); if(!track || !pastGrid) return; 
    track.innerHTML = ''; pastGrid.innerHTML = ''; 
    const now = Date.now(); const oneWeek = 7 * 24 * 60 * 60 * 1000; const sixMonths = 180 * 24 * 60 * 60 * 1000; 
    const activeJams = []; const pastJams = []; 
    jamsData.forEach(jam => { 
        const isRevealed = jam.status === 'revealed'; const revealTime = jam.revealedAt || 0; 
        if (jam.status === 'active' || (isRevealed && (now - revealTime < oneWeek))) { activeJams.push(jam); } 
        else if (isRevealed && (now - revealTime < sixMonths)) { pastJams.push(jam); } 
    }); 
    if(activeJams.length === 0) { track.innerHTML = '<div class="jam-slide active" style="display:flex; align-items:center; justify-content:center; background:#111;"><h2 style="color:#666;">No Active Events</h2></div>'; } 
    else { 
        activeJams.forEach((jam, idx) => { 
            const isWinnerMode = jam.status === 'revealed'; const themeColor = jam.color || '#f1c40f'; let winnerHtml = ''; 
            if(isWinnerMode && jam.winners && jam.winners.length > 0) { 
                winnerHtml = `<div class="winner-overlay"><h2 class="winner-title" style="color:${themeColor}; text-shadow:0 0 20px ${themeColor}80;">🎉 WINNERS 🎉</h2><div class="winner-avatars">`; 
                jam.winners.forEach(w => { winnerHtml += `<div class="winner-card" style="border-color:${themeColor}; cursor:pointer;" onclick="viewWinner('${w.id}', event)"><i class="fa-solid fa-gamepad" style="color:${themeColor}; font-size:1.5rem; margin-bottom:5px;"></i><span style="display:block; font-size:1rem; color:white;">${w.gameTitle}</span><span style="display:block; font-size:0.7rem; color:#aaa; font-weight:normal; margin-top:2px;">by ${formatName(w.ninjaName)}</span></div>`; }); 
                winnerHtml += `</div></div>`; 
            } 
            const activeClass = idx === carouselIndex ? 'active' : ''; 
            track.innerHTML += `<div class="jam-slide ${activeClass}" onclick="openJamSubmission('${jam.id}', ${isWinnerMode})"><div class="jam-hero-image" style="background-image: url('${jam.image || ''}');"><div class="jam-top-title" style="text-shadow: 0 0 10px ${themeColor};">${jam.title}</div></div><div class="jam-content-box"><div style="position:absolute; top:-15px; left:50%; transform:translateX(-50%); background:${themeColor}; color:black; font-weight:bold; padding:4px 12px; border-radius:20px; font-size:0.8rem; text-transform:uppercase; box-shadow:0 2px 5px rgba(0,0,0,0.3);">${jam.type || 'Game Jam'} | ${jam.dates}</div><h1 class="jam-header" style="margin-top:10px;">${parseMarkdown(jam.header, themeColor)}</h1><p class="jam-desc">${jam.desc}</p><div class="jam-details" style="color:${themeColor};">${jam.details}</div></div>${winnerHtml}</div>`; 
        }); 
    } 
    if(pastJams.length === 0) { pastGrid.innerHTML = '<p style="color:#666; grid-column:span 2; text-align:center;">No history yet.</p>'; } 
    else { 
        pastJams.forEach(jam => { 
            let topWinnerName = "View Winners"; let winnerAction = ""; 
            if(jam.winners && jam.winners.length > 0) { topWinnerName = jam.winners[0].gameTitle; winnerAction = `onclick="viewWinner('${jam.winners[0].id}', event)"`; } 
            const themeColor = jam.color || '#f1c40f'; 
            pastGrid.innerHTML += `<div class="past-jam-card" ${winnerAction}><div class="pj-img" style="background-image:url('${jam.image}');"></div><div class="pj-info"><h4>${jam.title}</h4><p>Winner: <span style="color:${themeColor}; font-weight:bold;">${topWinnerName}</span></p></div></div>`; 
        }); 
    } 
}

function moveCarousel(dir) { const slides = document.querySelectorAll('.jam-slide'); if(slides.length < 2) return; slides[carouselIndex].classList.remove('active'); carouselIndex += dir; if(carouselIndex < 0) carouselIndex = slides.length - 1; if(carouselIndex >= slides.length) carouselIndex = 0; slides[carouselIndex].classList.add('active'); }

function viewWinner(submissionId, event) { 
    if(event) event.stopPropagation(); 
    let sub = jamSubmissions.find(s => s.id === submissionId); 
    if(!sub) { jamsData.forEach(j => { if(j.winners) { const found = j.winners.find(w => w.id === submissionId); if(found) sub = found; } }); } 
    if(!sub) return; 
    const jam = jamsData.find(j => j.id === sub.jamId); 
    const color = jam ? (jam.color || '#f1c40f') : '#f1c40f'; 
    document.getElementById('win-game-title').innerText = sub.gameTitle; 
    document.getElementById('win-game-title').style.color = color; 
    document.getElementById('win-ninja').innerText = `Created by ${formatName(sub.ninjaName)}`; 
    const linkBtn = document.getElementById('win-link'); 
    linkBtn.href = sub.link; 
    linkBtn.style.background = color; 
    linkBtn.style.color = (color === '#ffffff' || color === '#f1c40f') ? 'black' : 'white'; 
    document.getElementById('winner-modal').style.display = 'flex'; 
}

function openJamSubmission(jamId, isWinnerView) { 
    if(isWinnerView) return; 
    if(!currentUser) { showAlert("Log In", "Please log in to submit."); return; } 
    currentJamSubmissionId = jamId; 
    const jam = jamsData.find(j => j.id === jamId); 
    if(!jam) return; 
    document.getElementById('js-title').innerText = jam.title; 
    document.getElementById('js-title').style.color = jam.color || '#f1c40f'; 
    const btn = document.querySelector('#jam-submit-modal .btn-blue'); 
    if(btn) btn.style.background = jam.color || '#f1c40f'; 
    document.getElementById('js-game-title').value = ''; 
    document.getElementById('js-link').value = ''; 
    document.getElementById('jam-submit-modal').style.display = 'flex'; 
}