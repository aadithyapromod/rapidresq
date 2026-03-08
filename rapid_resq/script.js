const API_BASE_URL = 'http://localhost:3000';
let refreshTimer = null;

/**
 * Handle Volunteer Login
 */
async function loginVolunteer() {
    const codeInput = document.getElementById('volunteerCode').value.trim();
    const errorMsg = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');

    if (!codeInput) {
        errorMsg.textContent = "Please enter a volunteer code.";
        errorMsg.style.display = "block";
        return;
    }

    errorMsg.style.display = "none";
    loginBtn.textContent = "Authenticating...";
    loginBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/volunteer-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ volunteerCode: codeInput })
        });

        const data = await response.json();

        if (data.success) {
            // Store code in session and redirect to dashboard
            sessionStorage.setItem('volunteerCode', codeInput.toUpperCase());
            window.location.href = 'volunteer-dashboard.html';
        } else {
            errorMsg.textContent = "Invalid Volunteer Code";
            errorMsg.style.display = "block";
        }
    } catch (error) {
        console.error("Login Error:", error);
        errorMsg.textContent = "Server connection failed.";
        errorMsg.style.display = "block";
    } finally {
        loginBtn.textContent = "Login";
        loginBtn.disabled = false;
    }
}

function logoutVolunteer() {
    sessionStorage.removeItem('volunteerCode');
    window.location.href = 'volunteer-login.html';
}

/**
 * Handle Volunteer Application
 */
async function applyVolunteer() {
    const email = document.getElementById('applyEmail').value.trim();
    const password = document.getElementById('applyPassword').value;
    const confirmPassword = document.getElementById('applyConfirmPassword').value;
    const errorMsg = document.getElementById('applyError');
    const applyBtn = document.getElementById('applyBtn');
    const applicationForm = document.getElementById('applicationForm');
    const resultBox = document.getElementById('applicationResult');
    const codeDisplay = document.getElementById('generatedCode');

    // Basic Validation
    if (!email || !password || !confirmPassword) {
        showApplyError("All fields are required.");
        return;
    }
    
    // Email basic regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showApplyError("Please enter a valid email address.");
        return;
    }

    if (password.length < 6) {
        showApplyError("Password must be at least 6 characters.");
        return;
    }

    if (password !== confirmPassword) {
        showApplyError("Passwords do not match.");
        return;
    }

    errorMsg.style.display = "none";
    applyBtn.textContent = "Applying...";
    applyBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/apply-volunteer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            applicationForm.style.display = "none";
            resultBox.style.display = "block";
            codeDisplay.textContent = data.volunteerCode;
        } else {
            showApplyError(data.message || "Application failed.");
            applyBtn.textContent = "Apply for Volunteering";
            applyBtn.disabled = false;
        }
    } catch (error) {
        console.error("Apply Error:", error);
        showApplyError("Server connection failed.");
        applyBtn.textContent = "Apply for Volunteering";
        applyBtn.disabled = false;
    }
}

function showApplyError(message) {
    const errorMsg = document.getElementById('applyError');
    errorMsg.textContent = message;
    errorMsg.style.display = "block";
}

/**
 * Handle Dashboard Data Fetching
 */
async function fetchSOSRequests() {
    try {
        const btn = document.querySelector('.refresh-btn');
        if(btn) btn.innerHTML = '<span>⏳</span> Syncing...';
        
        const response = await fetch(`${API_BASE_URL}/sos-requests`);
        if (!response.ok) throw new Error('Network response not ok');
        
        const result = await response.json();
        
        renderTable(result.data);
        updateStats(result.data);

        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(fetchSOSRequests, 10000);
        
        if(btn) setTimeout(() => { btn.innerHTML = '<span>🔄</span> Refresh Feed'; }, 500);
        
    } catch (error) {
        console.error("Dashboard Fetch Error:", error);
        const tbody = document.getElementById('tableBody');
        if(tbody) {
            tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="color:red;"><div class="empty-icon">🔌</div><h3>Backend Connection Failed</h3></div></td></tr>`;
        }
    }
}

// Helpers
const getEmojiForType = (type) => {
    const map = { 'Flood': '🌊', 'Medical': '🚑', 'Trapped': '🏗️', 'Fire': '🔥', 'Cyclone': '🌪️' };
    return map[type] || '⚠️';
};

const formatTime = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
};

function renderTable(dataArray) {
    const tbody = document.getElementById('tableBody');
    if(!tbody) return;

    if (!dataArray || dataArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">🕊️</div><h3>All Clear</h3><p>No active emergency requests.</p></div></td></tr>`;
        return;
    }

    let html = '';
    dataArray.forEach(req => {
        const isPending = req.status === 'Pending';
        const badgeClass = isPending ? 'badge-pending' : 'badge-progress';
        const statusText = isPending ? 'Pending Assignment' : `Rescue En Route`;
        const btnClass = isPending ? 'btn-accept' : 'btn-accept btn-disabled';
        const btnText = isPending ? 'Accept Mission' : 'Mission Deployed';
        const btnAction = isPending ? `onclick="acceptMission('${req.id}')"` : '';

        let locStr = 'Unknown';
        if (req.location && req.location.lat) {
            const latFmt = req.location.lat.toFixed(4);
            const lngFmt = req.location.lng.toFixed(4);
            // Added dynamic google maps outbound linking
            locStr = `<a href="https://www.google.com/maps/dir/?api=1&destination=${req.location.lat},${req.location.lng}" target="_blank" style="color:var(--primary-blue); text-decoration:none;">
                [${latFmt}, ${lngFmt}] ↗
            </a>`;
        }

        html += `
            <tr>
                <td class="cell-id">${req.id}<br><span style="font-size:0.75rem;color:#64748b;">${formatTime(req.timestamp)}</span></td>
                <td class="cell-type"><span style="font-size: 1.2rem;">${getEmojiForType(req.type)}</span> ${req.type}</td>
                <td class="cell-location"><span>📍</span> ${locStr}</td>
                <td style="font-weight:500;">${req.peopleAffected} Person(s)</td>
                <td><span class="status-badge ${badgeClass}">${statusText}</span></td>
                <td style="text-align:right;"><button class="${btnClass}" ${btnAction}>${btnText}</button></td>
            </tr>`;
    });
    tbody.innerHTML = html;
}

function updateStats(dataArray) {
    let pendingCount = 0;
    let progressCount = 0;
    dataArray.forEach(r => {
        if (r.status === 'Pending') pendingCount++;
        if (r.status === 'Rescue in Progress') progressCount++;
    });

    const elP = document.getElementById('statPending');
    const elPr = document.getElementById('statProgress');
    const elT = document.getElementById('statTotal');

    if(elP) elP.textContent = pendingCount;
    if(elPr) elPr.textContent = progressCount;
    if(elT) elT.textContent = dataArray.length;
}

async function acceptMission(reqId) {
    try {
        const response = await fetch(`${API_BASE_URL}/sos/${reqId}/accept`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        
        if (result.success) {
            showToast(`Mission Accepted!`);
            fetchSOSRequests();
        }
    } catch (error) {
        console.error('Accept mission error:', error);
        alert("Server error.");
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if(!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show') }, 3500);
}
