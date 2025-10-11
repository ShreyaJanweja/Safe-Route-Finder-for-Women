 
    // run everything after DOM ready
    document.addEventListener('DOMContentLoaded', ()=>{

      /* ---------- NAV / PAGE SWITCH ---------- */
      const pages = {
        home: document.getElementById('page-home'),
        route: document.getElementById('page-route'),
        community: document.getElementById('page-community'),
        about: document.getElementById('page-about')
      };

      // IMPORTANT: declare map early so showPage won't throw before map is created
      let map = null;

      function showPage(name){
        Object.keys(pages).forEach(k=>{
          pages[k].classList.toggle('hidden-page', k!==name);
          pages[k].classList.toggle('visible-page', k===name);
        });
        // if route page shown, invalidate map size after a moment
        if(name==='route' && map) setTimeout(()=> map.invalidateSize(), 250);
        history.replaceState(null,'', '#' + name);
      }
      // wire nav anchors
      document.querySelectorAll('[data-nav]').forEach(a=>{
        a.addEventListener('click', (e)=>{
          e.preventDefault();
          const target = (a.getAttribute('href') || '').replace('#','') || a.textContent.toLowerCase();
          if(target && pages[target]) showPage(target);
        });
      });
      // start based on hash
      const startHash = (location.hash || '#route').replace('#','');
      showPage(pages[startHash] ? startHash : 'route');

      /* ---------- HELPERS ---------- */
      function debounce(fn, delay=300){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args),delay); }; }

      /* ---------- FIREBASE / fallback ---------- */
      const firebaseConfig = {
        apiKey: "REPLACE_ME",
        authDomain: "REPLACE_ME",
        databaseURL: "REPLACE_ME",
        projectId: "REPLACE_ME",
        storageBucket: "REPLACE_ME",
        messagingSenderId: "REPLACE_ME",
        appId: "REPLACE_ME"
      };
      let db = null;
      let useLocalFallback = false;
      try{
        if(!firebaseConfig.apiKey || firebaseConfig.apiKey.includes('REPLACE_ME')) {
          useLocalFallback = true;
          console.warn('Firebase config not set — using local fallback for reports');
        } else {
          firebase.initializeApp(firebaseConfig);
          db = firebase.database();
        }
      }catch(e){ useLocalFallback = true; console.warn('Firebase init failed — fallback', e); }

      // Local fallback simple store (in-memory + localStorage)
      const localReportsKey = 'sr_reports_v1';
      function loadLocalReports(){ try{ return JSON.parse(localStorage.getItem(localReportsKey) || '[]') }catch(e){ return [] } }
      function saveLocalReport(r){ const arr = loadLocalReports(); arr.push(r); localStorage.setItem(localReportsKey, JSON.stringify(arr)); }
      function fetchLocalReports(){ return loadLocalReports(); }

      /* ---------- SAFETY POINTS ---------- */
      const safetyPoints = [
        { id: 'pol1', lat: 30.7199, lng: 76.789, type: 'police', weight: 5, label: 'Police Station' },
        { id: 'light1', lat: 30.7230, lng: 76.776, type: 'light', weight: 2, label: 'Well-lit area' },
        { id: 'unsafe1', lat: 30.7212, lng: 76.784, type: 'unsafe', weight: -3, label: 'Reported incident' }
      ];

      /* ---------- MAP INIT ---------- */
      // assign to the earlier-declared map variable
      map = L.map('map').setView([30.72, 76.78], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OSM' }).addTo(map);
      const safetyLayer = L.layerGroup().addTo(map);
      const reportsLayer = L.layerGroup().addTo(map);

      function renderSafetyPoints(){
        safetyLayer.clearLayers();
        safetyPoints.forEach(p => {
          const color = p.type === 'police' ? '#2563eb' : (p.type === 'light' ? '#16a34a' : '#ef4444');
          const icon = L.divIcon({ className:'rounded-full', html:`<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color}"></span>`, iconSize:[18,18] });
          L.marker([p.lat,p.lng], { icon }).bindPopup(`<b>${p.label}</b><br/>Type: ${p.type}`).addTo(safetyLayer);
        });
      }
      renderSafetyPoints();

      /* ---------- REPORTS (realtime if Firebase, else local) ---------- */
      let cachedReports = [];
      const reportsRef = db ? db.ref('reports') : null;

      function loadReportsAndRender(){
        if(useLocalFallback){
          cachedReports = fetchLocalReports();
          renderReports(cachedReports);
        } else {
          reportsRef.on('value', snapshot => {
            const val = snapshot.val() || {};
            cachedReports = Object.values(val);
            renderReports(cachedReports);
          });
        }
      }

      function renderReports(list){
        reportsLayer.clearLayers();
        const feed = document.getElementById('feedList'); feed.innerHTML = '';
        const count = list.length || 0;
        document.getElementById('reportsCount').innerText = count;

        (list.slice().reverse()).forEach(r => {
          const item = document.createElement('div');
          item.className = 'p-2 border rounded-md bg-white';
          item.innerHTML = `<div class="text-sm font-semibold">${r.type} <span class="text-xs text-slate-400">· ${new Date(r.ts).toLocaleString()}</span></div>
                            <div class="text-xs text-slate-600">${r.note || ''}</div>`;
          feed.appendChild(item);

          const icon = L.divIcon({ html:`<span style="width:14px;height:14px;border-radius:50%;background:#ef4444;display:inline-block;box-shadow:0 0 6px #ef4444"></span>`, iconSize:[14,14] });
          L.marker([r.lat, r.lng], { icon }).bindPopup(`<b>${r.type}</b><br/>${r.note || ''}`).addTo(reportsLayer);
        });
      }

      loadReportsAndRender();

      /* ---------- ROUTING & SCORING ---------- */
      let routingControl = null;
      let currentRoutes = [];

      function clearRoutes(){
        if(routingControl) map.removeControl(routingControl);
        routingControl = null; currentRoutes = [];
        document.getElementById('routesList').innerHTML = '';
      }

      function addRouting(s, e){
        clearRoutes();
        routingControl = L.Routing.control({
          waypoints: [L.latLng(s.lat,s.lng), L.latLng(e.lat,e.lng)],
          router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
          showAlternatives: true,
          altLineOptions: { styles:[{color:'#f59e0b', opacity:0.8, weight:6}] },
          lineOptions: { styles:[{color:'#10b981', opacity:0.9, weight:6}] },
          addWaypoints: false,
          fitSelectedRoute: true
        }).addTo(map);

        routingControl.on('routesfound', e => {
          const routes = e.routes || [];
          currentRoutes = routes;
          populateRoutesList(routes);
        });
      }

      function populateRoutesList(routes){
        const list = document.getElementById('routesList'); list.innerHTML = '';
        routes.forEach((r, idx) => {
          const coords = r.coordinates.map(c => ({ lat: c.lat, lng: c.lng }));
          const score = computeSafetyScore(coords);
          const div = document.createElement('div');
          const distKm = (r.summary.totalDistance/1000).toFixed(2);
          const timeMin = Math.round(r.summary.totalTime/60);
          const color = score >= 3.5 ? 'bg-green-100 border-green-300' : (score >= 2 ? 'bg-amber-100 border-amber-300' : 'bg-red-100 border-red-300');
          div.className = `p-3 rounded-md border ${color} cursor-pointer`;
          div.innerHTML = `<div class="flex justify-between items-start">
                            <div>
                              <div class="font-semibold">Route ${idx+1}</div>
                              <div class="text-xs text-slate-600">${distKm} km · ${timeMin} min</div>
                            </div>
                            <div class="text-right">
                              <div class="route-badge inline-flex items-center justify-center px-3 py-1 rounded-full font-semibold text-sm">${score} ⭐</div>
                              <div class="text-xs text-slate-500">safety</div>
                            </div>
                          </div>
                          <div class="mt-2 text-xs text-slate-700">Click to highlight this route on map</div>`;
          div.addEventListener('click', ()=> selectRoute(idx));
          list.appendChild(div);
        });
      }

      function selectRoute(index){
        if(!currentRoutes[index]) return;
        const route = currentRoutes[index];
        if(routingControl) map.removeControl(routingControl);

        const coords = route.coordinates.map(c => L.latLng(c.lat,c.lng));
        const score = computeSafetyScore(route.coordinates.map(c=>({lat:c.lat,lng:c.lng})));
        const line = L.polyline(coords, { color: routeScoreColor(score), weight:7, opacity:0.95 }).addTo(map);
        map.fitBounds(line.getBounds(), { padding:[60,60] });

        setTimeout(()=>{ try{ map.removeLayer(line); addRoutingMarkersFromRoute(route); }catch(e){} }, 900);
      }

      function addRoutingMarkersFromRoute(route){
        const start = route.coordinates[0];
        const end = route.coordinates[route.coordinates.length-1];
        L.marker([start.lat,start.lng]).addTo(map).bindPopup('Start').openPopup();
        L.marker([end.lat,end.lng]).addTo(map).bindPopup('End');
      }

      function routeScoreColor(score){
        if(score >= 3.5) return '#10b981';
        if(score >= 2) return '#f59e0b';
        return '#ef4444';
      }

      // computeSafetyScore - quick heuristic using safetyPoints + cachedReports
      function computeSafetyScore(coords){
        if(!coords || coords.length===0) return 3.0;
        const pts = coords.map(c => ({ lat: c.lat || c[1] || c[0], lng: c.lng || c[0] || c[1] }));
        let score = 0; let count = 0;
        pts.forEach(p => {
          safetyPoints.forEach(sp => {
            const d = map.distance([p.lat,p.lng],[sp.lat,sp.lng]) / 1000.0;
            if(d < 0.25){ score += sp.weight; }
          });
          count++;
        });
        cachedReports.forEach(r => {
          pts.forEach(p => {
            const d = map.distance([p.lat,p.lng],[r.lat,r.lng]) / 1000.0;
            if(d < 0.25) { score -= 3; }
          });
        });
        const normalized = Math.max(1, Math.min(5, ( (score / Math.max(1,count)) + 3 )));
        return Number(normalized.toFixed(2));
      }

      /* ---------- GEOCODE + AUTOCOMPLETE ---------- */
      async function fetchPlace(q){
        const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=6&q=' + encodeURIComponent(q);
        const r = await fetch(url, { headers: { 'Accept-Language':'en' } });
        return await r.json();
      }
      async function geocode(q){
        const url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(q);
        try{
          const resp = await fetch(url, { headers: { 'Accept-Language':'en' } });
          const data = await resp.json();
          if(data && data.length>0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }catch(e){ console.warn('geocode failed', e); }
        return null;
      }

      // suggestion boxes for both inputs
      function ensureSuggestBoxes(){
        ['startInput','endInput'].forEach(id=>{
          const inp = document.getElementById(id);
          if(!inp) return;
          let box = inp.nextElementSibling;
          if(!box || !box.classList || !box.classList.contains('suggest-box')){
            box = document.createElement('div');
            box.className = 'suggest-box mt-1 bg-white border rounded-md shadow-sm z-50 absolute w-full max-h-48 overflow-auto hidden';
            box.style.position = 'absolute';
            // keep box relative to parent container
            inp.parentNode.style.position = 'relative';
            box.style.left = '0px';
            box.style.top = (inp.offsetHeight + 6) + 'px';
            inp.parentNode.appendChild(box);
          }
        });
      }
      ensureSuggestBoxes();

      const coordStore = { start: null, end: null };
      function renderSuggestions(list, box, inputKey, inputEl){
        box.innerHTML = '';
        if(!list || list.length===0){ box.classList.add('hidden'); return; }
        list.forEach(it=>{
          const el = document.createElement('div');
          el.className = 'p-2 hover:bg-indigo-50 cursor-pointer text-sm';
          el.innerHTML = `<div class="font-medium">${it.display_name.split(',')[0]}</div><div class="text-xs text-slate-500">${it.display_name}</div>`;
          el.addEventListener('click', ()=>{
            inputEl.value = it.display_name.split(',')[0];
            coordStore[inputKey] = { lat: parseFloat(it.lat), lng: parseFloat(it.lon) };
            box.classList.add('hidden');
          });
          box.appendChild(el);
        });
        box.classList.remove('hidden');
      }

      ['start','end'].forEach(key=>{
        const inputEl = document.getElementById(key + 'Input');
        const box = inputEl.parentNode.querySelector('.suggest-box');
        const handler = debounce(async (e)=>{
          const q = e.target.value.trim();
          if(!q){ box.classList.add('hidden'); return; }
          try{
            const res = await fetchPlace(q);
            renderSuggestions(res, box, key, inputEl);
          }catch(e){ console.warn('suggest fail', e); box.classList.add('hidden'); }
        }, 300);
        inputEl.addEventListener('input', handler);
        // hide when clicking outside
        document.addEventListener('click', (ev)=>{ if(!inputEl.contains(ev.target) && box && !box.contains(ev.target)) box.classList.add('hidden'); });
      });

      /* ---------- Find / Center buttons ---------- */
      document.getElementById('btnFind').addEventListener('click', async ()=>{
        const sQ = document.getElementById('startInput').value.trim();
        const eQ = document.getElementById('endInput').value.trim();
        if(!sQ || !eQ){ alert('Please enter both start and destination'); return; }

        let s = coordStore.start;
        let e = coordStore.end;
        if(!s){ s = await geocode(sQ); }
        if(!e){ e = await geocode(eQ); }
        if(!s || !e){ alert('Could not find locations. Try selecting a suggestion or use more specific text.'); return; }

        if(window._tempStartMarker) map.removeLayer(window._tempStartMarker);
        if(window._tempEndMarker) map.removeLayer(window._tempEndMarker);
        window._tempStartMarker = L.marker([s.lat,s.lng]).addTo(map).bindPopup('Start').openPopup();
        window._tempEndMarker = L.marker([e.lat,e.lng]).addTo(map).bindPopup('End');

        addRouting(s,e);
      });

      document.getElementById('btnCenter').addEventListener('click', ()=> map.setView([30.72,76.78],13));

      /* ---------- Auto-run route on load if possible ---------- */
      (async function tryAutoRoute(){
        const defaultDest = 'CGC Jhanjeri';
        let destCoords = null;
        try{ destCoords = await geocode(defaultDest); }catch(e){}
        if(navigator.geolocation){
          navigator.geolocation.getCurrentPosition(async pos=>{
            const s = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            document.getElementById('startInput').value = 'My Location';
            coordStore.start = s;
            if(destCoords){
              document.getElementById('endInput').value = defaultDest.split(',')[0];
              coordStore.end = destCoords;
              setTimeout(()=> addRouting(s, destCoords), 700);
            }
            L.circleMarker([s.lat,s.lng], { radius:8, fillColor:'#3b82f6', fillOpacity:0.9, stroke:false }).addTo(map).bindPopup('You are here');
          }, async ()=>{ /* fallback */ }, { timeout: 4000 });
        } else if(destCoords){
          const s = await geocode('Chitkara University, Punjab');
          if(s){
            document.getElementById('startInput').value = 'Chitkara University';
            coordStore.start = s;
            document.getElementById('endInput').value = defaultDest.split(',')[0];
            coordStore.end = destCoords;
            setTimeout(()=> addRouting(s,destCoords), 700);
          }
        }
      })();

      /* ---------- REPORT modal ---------- */
      document.getElementById('btnReport').addEventListener('click', ()=> showReportModal());
      document.getElementById('btnOpenReport') && document.getElementById('btnOpenReport').addEventListener('click', ()=> {
        showReportModal();
        showPage('community');
      });

      function showReportModal(){
        const root = document.getElementById('modalRoot');
        root.innerHTML = `
          <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-lg w-11/12 max-w-md p-4">
              <div class="flex items-center justify-between mb-2">
                <div class="font-semibold">Report Unsafe Area</div>
                <button id="closeReport" class="text-slate-500">✕</button>
              </div>
              <div>
                <label class="text-sm">Type</label>
                <select id="repType" class="w-full mt-1 p-2 border rounded-md">
                  <option>Unsafe Area</option>
                  <option>Harassment</option>
                  <option>Theft</option>
                  <option>Other</option>
                </select>
                <label class="text-sm mt-3">Note</label>
                <textarea id="repNote" class="w-full mt-1 p-2 border rounded-md" rows="3" placeholder="Describe briefly"></textarea>
                <div class="flex items-center gap-2 mt-3">
                  <button id="useMyLoc" class="px-3 py-2 bg-indigo-600 text-white rounded-md">Use my location</button>
                  <div id="myLocStatus" class="text-sm text-slate-500"></div>
                </div>
                <div class="flex gap-2 mt-4 justify-end">
                  <button id="cancelReport" class="px-3 py-2 border rounded-md">Cancel</button>
                  <button id="submitReport" class="px-3 py-2 bg-indigo-600 text-white rounded-md">Submit</button>
                </div>
              </div>
            </div>
          </div>
        `;

        document.getElementById('closeReport').addEventListener('click', ()=> root.innerHTML='');
        document.getElementById('cancelReport').addEventListener('click', ()=> root.innerHTML='');
        document.getElementById('useMyLoc').addEventListener('click', ()=>{
          document.getElementById('myLocStatus').innerText = 'Getting location...';
          navigator.geolocation.getCurrentPosition(pos=>{
            window._reportLat = pos.coords.latitude; window._reportLng = pos.coords.longitude;
            document.getElementById('myLocStatus').innerText = 'Location set';
          }, err=>{
            document.getElementById('myLocStatus').innerText = 'Could not get location';
          });
        });

        document.getElementById('submitReport').addEventListener('click', ()=>{
          const type = document.getElementById('repType').value; const note = document.getElementById('repNote').value;
          const lat = window._reportLat || (map.getCenter && map.getCenter().lat); const lng = window._reportLng || (map.getCenter && map.getCenter().lng);
          if(!lat || !lng){ alert('Location unknown'); return; }
          const rep = { type, note, lat, lng, ts: Date.now() };
          if(useLocalFallback){
            saveLocalReport(rep);
            loadReportsAndRender();
            root.innerHTML=''; alert('Report saved locally — thank you!');
          } else {
            const newRef = reportsRef.push(); newRef.set(rep).then(()=>{
              root.innerHTML=''; alert('Report submitted — thank you!');
            }).catch(e=>{ alert('Could not submit: '+e.message); });
          }
        });
      }

      /* ---------- SOS button ---------- */
      document.getElementById('btnSOS').addEventListener('click', ()=>{
        if(!navigator.geolocation){ alert('Geolocation not supported'); return; }
        const root = document.getElementById('modalRoot');
        root.innerHTML = `<div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-lg w-11/12 max-w-sm p-4 text-center">
            <div class="text-lg font-semibold text-red-600 mb-2">Sending SOS...</div>
            <div class="text-sm text-slate-600 mb-4">We will log your alert and notify nearby community (demo)</div>
            <div id="sosInfo" class="text-sm text-slate-500">Getting location…</div>
            <div class="mt-4"><button id="closeSOS" class="px-4 py-2 bg-gray-200 rounded-md">Close</button></div>
          </div>
        </div>`;

        navigator.geolocation.getCurrentPosition(pos=>{
          const lat = pos.coords.latitude; const lng = pos.coords.longitude;
          const payload = { lat, lng, ts: Date.now(), status: 'sent' };
          if(useLocalFallback){
            saveLocalReport({ type: 'SOS', note: 'SOS alert', lat, lng, ts: Date.now() });
            document.getElementById('sosInfo').innerText = 'SOS logged locally (demo).';
            loadReportsAndRender();
          } else {
            db.ref('sos').push(payload).then(()=>{
              document.getElementById('sosInfo').innerText = 'SOS logged. Help will be notified (demo).';
            }).catch(e=>{ document.getElementById('sosInfo').innerText = 'Could not send SOS: '+e.message; });
          }
        }, err=>{ document.getElementById('sosInfo').innerText = 'Location denied or unavailable.'; });

        document.getElementById('closeSOS').addEventListener('click', ()=> document.getElementById('modalRoot').innerHTML='');
      });

      // initial render of local reports if fallback
      if(useLocalFallback) renderReports(fetchLocalReports());

    }); // DOMContentLoaded end