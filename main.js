// ============================================
// SURAKSHA SATHI - FRONTEND MAIN
// ============================================

const API_URL = 'http://localhost:3001/api';
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// ============================================
// AUTH HELPER
// ============================================
async function apiCall(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    }
  };
  
  if (data) options.body = JSON.stringify(data);
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'API Error');
    return result;
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

// ============================================
// DOM READY
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  try { AOS && AOS.init && AOS.init({ once: true }); } catch (e) { }

  /* ---------- NAV / PAGE SWITCH ---------- */
  const pages = {
    home: document.getElementById('page-home'),
    route: document.getElementById('page-route'),
    community: document.getElementById('page-community'),
    about: document.getElementById('page-about')
  };

  let map = null;

  function showPage(name) {
    Object.keys(pages).forEach(k => {
      pages[k].classList.toggle('hidden-page', k !== name);
      pages[k].classList.toggle('visible-page', k === name);
    });
    if (name === 'route' && map) setTimeout(() => map.invalidateSize(), 250);
    history.replaceState(null, '', '#' + name);
  }

  document.querySelectorAll('[data-nav]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = (a.getAttribute('href') || '').replace('#', '') || a.textContent.toLowerCase();
      if (target && pages[target]) showPage(target);
    });
  });

  const startHash = (location.hash || '#home').replace('#', '');
  showPage(pages[startHash] ? startHash : 'home');

  /* ---------- AUTH UI ---------- */
  function updateAuthUI() {
    const navAuth = document.getElementById('navAuth');
    if (authToken && currentUser) {
      navAuth.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-sm">${currentUser.name}</span>
          <a href="profile.html" id="profileLink" class="text-sm px-3 py-1 rounded hover:bg-white/10">Profile</a>
          <button id="logoutBtn" class="text-sm px-3 py-1 rounded hover:bg-white/10">Logout</button>
        </div>
      `;
      // Leave default link behaviour so clicking opens profile.html (do not intercept)
      document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('authToken');
        authToken = null;
        currentUser = null;
        updateAuthUI();
        showPage('home');
      });
    } else {
      navAuth.innerHTML = `
        <a href="login.html" class="text-sm px-3 py-1 rounded hover:bg-white/10">Login</a>
        <a href="signup.html" class="text-sm px-3 py-1 rounded hover:bg-white/10">Signup</a>
      `;
    }
  }

  // Load current user if logged in
  if (authToken) {
    apiCall('/user/profile')
      .then(res => {
        currentUser = res.user;
        updateAuthUI();
      })
      .catch(err => {
        console.error('Failed to load user profile:', err);
        localStorage.removeItem('authToken');
        authToken = null;
      });
  }
  updateAuthUI();

  /* ---------- MAP INIT ---------- */
  map = L.map('map').setView([30.72, 76.78], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OSM' }).addTo(map);
  const safetyLayer = L.layerGroup().addTo(map);
  const reportsLayer = L.layerGroup().addTo(map);

  // Home mini map
  try {
    const homeMiniEl = document.getElementById('home-mini-map');
    if (homeMiniEl) {
      const homeMini = L.map('home-mini-map', { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false }).setView([30.72, 76.78], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(homeMini);
      L.circle([30.721, 76.78], { color: '#10b981', fillColor: '#10b98122', radius: 180 }).addTo(homeMini);
      L.marker([30.72, 76.78]).addTo(homeMini).bindPopup('Sample Safe Zone');
    }
  } catch (e) { }

  /* ---------- LOAD SAFETY POINTS & REPORTS ---------- */
  let safetyPoints = [];
  let allReports = [];

  async function loadSafetyPoints() {
    try {
      const res = await apiCall('/safety-points');
      safetyPoints = res.points || [];
      renderSafetyPoints();
    } catch (err) {
      console.error('Failed to load safety points:', err);
    }
  }

  async function loadReports() {
    try {
      const res = await apiCall('/reports?limit=100');
      allReports = res.reports || [];
      renderReports();
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  }

  function renderSafetyPoints() {
    safetyLayer.clearLayers();
    safetyPoints.forEach(p => {
      const color = p.type === 'police' ? '#2563eb' : (p.type === 'hospital' ? '#16a34a' : (p.type === 'market' ? '#f59e0b' : '#8b5cf6'));
      const icon = L.divIcon({ className: 'rounded-full', html: `<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color}"></span>`, iconSize: [18, 18] });
      L.marker([p.lat, p.lng], { icon }).bindPopup(`<b>${p.name}</b><br/>Type: ${p.type}`).addTo(safetyLayer);
    });
  }

  function renderReports() {
    reportsLayer.clearLayers();
    const feed = document.getElementById('feedList');
    if (feed) feed.innerHTML = '';
    const count = allReports.length || 0;
    const rc = document.getElementById('reportsCount');
    if (rc) rc.innerText = count;

    (allReports.slice().reverse()).forEach(r => {
      const item = document.createElement('div');
      item.className = 'p-2 border rounded-md bg-white';
      item.innerHTML = `<div class="text-sm font-semibold">${r.type} <span class="text-xs text-slate-400">· ${new Date(r.timestamp).toLocaleString()}</span></div>
                        <div class="text-xs text-slate-600">${r.note || ''}</div>
                        <div class="text-xs text-slate-500 mt-1">by ${r.userName}</div>`;
      if (feed) feed.appendChild(item);

      const icon = L.divIcon({ html: `<span style="width:14px;height:14px;border-radius:50%;background:#ef4444;display:inline-block;box-shadow:0 0 6px #ef4444"></span>`, iconSize: [14, 14] });
      L.marker([r.lat, r.lng], { icon }).bindPopup(`<b>${r.type}</b><br/>${r.note || ''}<br/><small>by ${r.userName}</small>`).addTo(reportsLayer);
    });
  }

  loadSafetyPoints();
  loadReports();
  // Refresh reports every 30 seconds
  setInterval(loadReports, 30000);

  /* ---------- REPORT FORM ---------- */
  document.getElementById('btnReport')?.addEventListener('click', () => {
    if (!authToken) {
      alert('Please login to submit reports');
      window.location.href = 'login.html';
      return;
    }
    showReportModal();
  });

  document.getElementById('homeReportBtn')?.addEventListener('click', () => {
    if (!authToken) {
      alert('Please login to submit reports');
      window.location.href = 'login.html';
      return;
    }
    showReportModal();
  });

  function showReportModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-lg w-11/12 max-w-md p-6">
        <h2 class="text-lg font-bold mb-4">Report Unsafe Area</h2>
        <select id="reportType" class="w-full p-2 border rounded-md mb-3">
          <option value="">Select Type</option>
          <option value="assault">Assault</option>
          <option value="theft">Theft</option>
          <option value="harassment">Harassment</option>
          <option value="suspicious">Suspicious Activity</option>
          <option value="other">Other</option>
        </select>
        <textarea id="reportNote" class="w-full p-2 border rounded-md mb-3" rows="3" placeholder="Describe the incident..."></textarea>
        <div class="flex gap-3">
          <button id="useLocation" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md">📍 Use My Location</button>
          <button id="cancelReport" class="flex-1 px-4 py-2 border rounded-md">Cancel</button>
        </div>
        <button id="submitReport" class="w-full mt-3 px-4 py-2 bg-indigo-600 text-white rounded-md hidden">Submit Report</button>
        <div id="locationStatus" class="text-xs mt-2 text-center text-slate-500"></div>
      </div>
    `;
    document.body.appendChild(modal);

    let currentLat = null, currentLng = null;

    document.getElementById('useLocation').addEventListener('click', () => {
      const status = document.getElementById('locationStatus');
      status.textContent = 'Getting location...';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          currentLat = pos.coords.latitude;
          currentLng = pos.coords.longitude;
          status.textContent = `✅ Location: ${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}`;
          document.getElementById('submitReport').classList.remove('hidden');
        },
        (err) => {
          status.textContent = '❌ Location access denied';
        }
      );
    });

    document.getElementById('submitReport').addEventListener('click', async () => {
      const type = document.getElementById('reportType').value;
      const note = document.getElementById('reportNote').value;

      if (!type || !currentLat) {
        alert('Please select type and location');
        return;
      }

      try {
        const res = await apiCall('/reports', 'POST', {
          type,
          lat: currentLat,
          lng: currentLng,
          note
        });
        alert('✅ Report submitted successfully!');
        loadReports();
        // increment report stat locally and try to sync with backend
        try{
          const prevR = Number(localStorage.getItem('stat_reports') || 0) + 1;
          localStorage.setItem('stat_reports', String(prevR));
          if(authToken){ try{ apiCall('/user/profile', 'PUT', { reportsCount: prevR }).catch(()=>{}); }catch(e){} }
        }catch(e){}
        modal.remove();
      } catch (err) {
        alert('❌ Failed to submit report: ' + err.message);
      }
    });

    document.getElementById('cancelReport').addEventListener('click', () => modal.remove());
  }

  /* ---------- SOS BUTTON ---------- */
  document.getElementById('btnSOS')?.addEventListener('click', async () => {
    if (!authToken) {
      alert('Please login to use SOS');
      window.location.href = 'login.html';
      return;
    }

    const confirmed = confirm('🚨 Send SOS alert to your emergency contacts?');
    if (!confirmed) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await apiCall('/sos', 'POST', {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            message: 'I need help! Please check my location.'
          });
          alert('🚨 SOS sent! Emergency contacts have been notified.');
          // Increment alerts stat locally and best-effort sync to backend
          try{
            const prevA = Number(localStorage.getItem('stat_alerts') || 0) + 1;
            localStorage.setItem('stat_alerts', String(prevA));
            if(authToken){ try{ apiCall('/user/profile', 'PUT', { sosCount: prevA }).catch(()=>{}); }catch(e){} }
          }catch(e){}
        } catch (err) {
          alert('❌ Failed to send SOS: ' + err.message);
        }
      },
      (err) => {
        alert('❌ Please enable location access to use SOS');
      }
    );
  });

  /* ---------- ROUTE FINDER ---------- */
  let routingControl = null;
  let currentRoutes = [];

  const coordStore = { start: null, end: null };

  async function fetchPlace(q) {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=6&q=' + encodeURIComponent(q);
    const r = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    return await r.json();
  }

  function ensureSuggestBoxes() {
    ['startInput', 'endInput'].forEach(id => {
      const inp = document.getElementById(id);
      if (!inp) return;
      let box = inp.nextElementSibling;
      if (!box || !box.classList || !box.classList.contains('suggest-box')) {
        box = document.createElement('div');
        box.className = 'suggest-box mt-1 bg-white border rounded-md shadow-sm z-50 absolute w-full max-h-48 overflow-auto hidden';
        box.style.position = 'absolute';
        inp.parentNode.style.position = 'relative';
        box.style.left = '0px';
        box.style.top = (inp.offsetHeight + 6) + 'px';
        inp.parentNode.appendChild(box);
      }
    });
  }
  ensureSuggestBoxes();

  function renderSuggestions(list, box, inputKey, inputEl) {
    box.innerHTML = '';
    if (!list || list.length === 0) { box.classList.add('hidden'); return; }
    list.forEach(it => {
      const el = document.createElement('div');
      el.className = 'p-2 hover:bg-indigo-50 cursor-pointer text-sm';
      el.innerHTML = `<div class="font-medium">${it.display_name.split(',')[0]}</div><div class="text-xs text-slate-500">${it.display_name}</div>`;
      el.addEventListener('click', () => {
        inputEl.value = it.display_name.split(',')[0];
        coordStore[inputKey] = { lat: parseFloat(it.lat), lng: parseFloat(it.lon) };
        box.classList.add('hidden');
      });
      box.appendChild(el);
    });
    box.classList.remove('hidden');
  }

  ['start', 'end'].forEach(key => {
    const inputEl = document.getElementById(key + 'Input');
    if (!inputEl) return;

    const debounce = (fn, delay = 300) => {
      let t;
      return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
    };

    inputEl.addEventListener('input', debounce(async (e) => {
      const q = e.target.value.trim();
      if (q.length < 2) return;
      const box = inputEl.nextElementSibling;
      try {
        const results = await fetchPlace(q);
        renderSuggestions(results, box, key, inputEl);
      } catch (err) { }
    }));
  });

  const findBtn = document.getElementById('findRoutesBtn') || document.getElementById('btnFind');
  findBtn?.addEventListener('click', async () => {
    if (!coordStore.start || !coordStore.end) {
      alert('Please select both start and end locations');
      return;
    }

    const start = coordStore.start;
    const end = coordStore.end;

    // Clear old routes
    if (routingControl) map.removeControl(routingControl);
    routingControl = null;
    currentRoutes = [];

    // Get routes from OSRM
    routingControl = L.Routing.control({
      waypoints: [L.latLng(start.lat, start.lng), L.latLng(end.lat, end.lng)],
      router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
      showAlternatives: true,
      altLineOptions: { styles: [{ color: '#f59e0b', opacity: 0.8, weight: 6 }] },
      lineOptions: { styles: [{ color: '#10b981', opacity: 0.9, weight: 6 }] },
      addWaypoints: false,
      fitSelectedRoute: true
    }).addTo(map);

    routingControl.on('routesfound', async e => {
      const routes = e.routes || [];
      currentRoutes = routes;

      const list = document.getElementById('routesList');
      if (!list) return;
      list.innerHTML = '';

      for (let idx = 0; idx < routes.length; idx++) {
        const r = routes[idx];
        const coords = r.coordinates.map(c => ({ lat: c.lat, lng: c.lng }));

        // Calculate safety score
        let score = 3.0;
        try {
          const res = await apiCall('/routes/safety-score', 'POST', { coordinates: coords });
          score = res.score;
        } catch (err) { }

        const div = document.createElement('div');
        const distKm = (r.summary.totalDistance / 1000).toFixed(2);
        const timeMin = Math.round(r.summary.totalTime / 60);
        const color = score >= 3.5 ? 'bg-green-100 border-green-300' : (score >= 2 ? 'bg-amber-100 border-amber-300' : 'bg-red-100 border-red-300');
        div.className = `p-3 rounded-md border ${color} cursor-pointer`;
        div.innerHTML = `<div class="flex justify-between items-start">
                          <div>
                            <div class="font-semibold">Route ${idx + 1}</div>
                            <div class="text-xs text-slate-600">${distKm} km · ${timeMin} min</div>
                          </div>
                          <div class="text-right">
                            <div class="inline-flex items-center justify-center px-3 py-1 rounded-full font-semibold text-sm">${score} ⭐</div>
                            <div class="text-xs text-slate-500">safety</div>
                          </div>
                        </div>`;
        div.addEventListener('click', () => selectRoute(idx));
        list.appendChild(div);
      }
    });
  });

  function selectRoute(index) {
    if (!currentRoutes[index]) return;
    const route = currentRoutes[index];
    if (routingControl) map.removeControl(routingControl);

    // Increment local stat for safe routes taken (real-time UI update via storage events)
    try {
      const prev = Number(localStorage.getItem('stat_routes') || 0) + 1;
      localStorage.setItem('stat_routes', String(prev));
      if (authToken) {
        try { apiCall('/user/profile', 'PUT', { safeRoutesCount: prev }).catch(()=>{}); } catch(e) {}
      }
    } catch(e) { /* ignore */ }

    const coords = route.coordinates.map(c => L.latLng(c.lat, c.lng));
    const line = L.polyline(coords, { color: '#10b981', weight: 7, opacity: 0.95 }).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [60, 60] });

    setTimeout(() => {
      try { map.removeLayer(line); } catch (e) { }
      const start = route.coordinates[0];
      const end = route.coordinates[route.coordinates.length - 1];
      L.marker([start.lat, start.lng]).addTo(map).bindPopup('Start').openPopup();
      L.marker([end.lat, end.lng]).addTo(map).bindPopup('End');
    }, 900);
  }

  /* ---------- FOOTER ---------- */
  try { document.getElementById('year') && (document.getElementById('year').innerText = new Date().getFullYear()); } catch (e) { }
});
