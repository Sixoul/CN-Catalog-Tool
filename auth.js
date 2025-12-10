// auth.js

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
    const input = document.getElementById('login-username').value.trim().toLowerCase(); 
    if(!input) return; 
    // Uses global leaderboardData
    const u = leaderboardData.find(l => (l.username && l.username.toLowerCase() === input) || (!l.username && l.name.toLowerCase() === input)); 
    if(u){ 
        currentUser = u; 
        localStorage.setItem('cn_user', JSON.stringify(u)); 
        enterDashboard(); 
    } else { 
        document.getElementById('login-error-msg').style.display = 'block'; 
        document.getElementById('login-error-msg').innerText = 'User not found. Try username (e.g. kane.leung)'; 
    } 
}

function attemptAdminLogin() { 
    const e = document.getElementById('admin-email').value; 
    const p = document.getElementById('admin-pass').value; 
    if(p === "@2633Ninjas") { 
        loginAsAdmin(); 
        return; 
    } 
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

function logout() { 
    localStorage.removeItem('cn_user'); 
    currentUser = null; 
    if(auth) auth.signOut(); 
    location.reload(); 
}

function loginAsAdmin() { 
    currentUser = { name: "Sensei", isAdmin: true }; 
    localStorage.setItem('cn_user', JSON.stringify(currentUser)); 
    enterDashboard(); 
    document.getElementById('admin-view').classList.add('active'); 
    if(db) { 
        loadCatalog(); loadQueue(); loadLeaderboard(); loadJams(); loadGames(); 
    }
}

function enterDashboard() { 
    document.getElementById('login-view').style.display = 'none'; 
    document.getElementById('main-app').style.display = 'flex'; 
    if(currentUser && currentUser.name) document.getElementById('current-user-name').innerText = currentUser.name.split(' ')[0]; 
    if(currentUser && currentUser.isAdmin) document.getElementById('floating-admin-toggle').style.display = 'flex'; 
    else document.getElementById('floating-admin-toggle').style.display = 'none'; 
    refreshAll(); 
}