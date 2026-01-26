(function(){
  function hasDebugFlag(){
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('debug') === '1') return true;
      return localStorage.getItem('deceroacien_debug') === '1';
    } catch { return false; }
  }

  if (!hasDebugFlag()) return;

  const state = {
    logs: [],
    flags: {
      firebaseConfig: false,
      firebaseSDKReady: false,
      firebaseAuthReady: false,
      firebaseSignedIn: false,
      gisLoaded: false,
      gisInitialized: false,
      googleClientId: null,
      // Supabase & Backend
      supabaseClient: false,
      supabaseSession: false,
      supabaseEmail: null,
      tokenIssuer: null,
      provider: 'none', // supabase|firebase|none
      backendApiBase: null,
      backendMeOk: false,
      backendMeStatus: null,
      backendEnrollments: null
    },
    _gis: { injected: false, initialized: false }
  };

  // UI básica
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;bottom:12px;right:12px;width:380px;max-height:60vh;background:rgba(2,6,23,0.96);color:#e6f1ff;border:1px solid #1e2d4d;border-radius:10px;z-index:99999;box-shadow:0 10px 25px rgba(0,0,0,0.35);font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;font-size:12px;display:flex;flex-direction:column;';
  panel.innerHTML = '<div style="padding:8px 10px;border-bottom:1px solid #1e2d4d;display:flex;align-items:center;gap:8px;justify-content:space-between;">\
    <strong>Debug Auth</strong>\
    <div>\
      <button id="dbg_refresh" style="margin-right:6px;padding:4px 8px;background:#22c55e;color:#011627;border:none;border-radius:6px;cursor:pointer;">Refrescar</button>\
      <button id="dbg_copy" style="margin-right:6px;padding:4px 8px;background:#0ea5e9;color:#011627;border:none;border-radius:6px;cursor:pointer;">Copiar</button>\
      <button id="dbg_clear" style="padding:4px 8px;background:#64748b;color:#011627;border:none;border-radius:6px;cursor:pointer;">Limpiar</button>\
    </div>\
  </div>\
  <div id="dbg_status" style="padding:8px 10px;display:grid;grid-template-columns: 1fr 1fr;gap:6px;border-bottom:1px solid #1e2d4d;"></div>\
  <div id="dbg_logs" style="padding:8px 10px;overflow:auto;flex:1"></div>';
  document.addEventListener('DOMContentLoaded', ()=> document.body.appendChild(panel));

  const logsEl = panel.querySelector('#dbg_logs');
  const statusEl = panel.querySelector('#dbg_status');
  panel.querySelector('#dbg_clear').onclick = () => { state.logs.length = 0; renderLogs(); };
  panel.querySelector('#dbg_refresh').onclick = () => { runChecks().catch(()=>{}); };
  panel.querySelector('#dbg_copy').onclick = () => {
    const txt = state.logs.map(l => `[${l.level}] ${new Date(l.ts).toISOString()} ${l.msg}`).join('\n');
    navigator.clipboard.writeText(txt).catch(()=>{});
  };

  function renderStatus(){
    const b = (ok)=> `<span style="background:${ok?'#16a34a':'#ef4444'};padding:2px 6px;border-radius:9999px;color:#fff;font-weight:600;font-size:11px;">${ok?'OK':'FAIL'}</span>`;
    const cid = state.flags.googleClientId || '(no)';
    const prov = state.flags.provider;
    statusEl.innerHTML = `
      <div>FB Config: ${b(!!state.flags.firebaseConfig)}</div>
      <div>FB SDK: ${b(!!state.flags.firebaseSDKReady)}</div>
      <div>FB Auth: ${b(!!state.flags.firebaseAuthReady)}</div>
      <div>FB SignedIn: ${b(!!state.flags.firebaseSignedIn)}</div>
      <div>GIS script: ${b(!!state.flags.gisLoaded)}</div>
      <div>GIS init: ${b(!!state.flags.gisInitialized)}</div>
      <div>SB Client: ${b(!!state.flags.supabaseClient)}</div>
      <div>SB Session: ${b(!!state.flags.supabaseSession)}</div>
      <div style="grid-column:1/3">Proveedor: <strong>${prov}</strong></div>
      <div style="grid-column:1/3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">SB Email: ${state.flags.supabaseEmail||'(no)'}</div>
      <div style="grid-column:1/3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Token iss: ${state.flags.tokenIssuer||'(no)'}</div>
      <div style="grid-column:1/3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">API: ${state.flags.backendApiBase||'(no)'}</div>
      <div>me(): ${b(!!state.flags.backendMeOk)}</div>
      <div>Status: ${state.flags.backendMeStatus ?? '-'}</div>
      <div style="grid-column:1/3;">Enrollments: ${state.flags.backendEnrollments ?? '-'}</div>
      <div style="grid-column:1/3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">ClientID: ${cid}</div>
    `;
  }
  function renderLogs(){
    logsEl.innerHTML = state.logs.slice(-200).map(l => `<div><span style="opacity:.65">${new Date(l.ts).toLocaleTimeString()}</span> <strong>[${l.level}]</strong> ${l.msg}</div>`).join('');
    renderStatus();
  }
  function log(level, msg){ state.logs.push({ level, msg, ts: Date.now() }); renderLogs(); }

  // Señales iniciales
  state.flags.firebaseConfig = !!window.__FIREBASE_APP_CONFIG;
  try { state.flags.googleClientId = (window.PublicAuthConfig && window.PublicAuthConfig.googleClientId) || null; } catch {}
  renderStatus();

  // Errores globales
  window.addEventListener('error', (e)=> log('error', e.message || 'window.error'));
  window.addEventListener('unhandledrejection', (e)=> log('error', (e.reason && (e.reason.message||e.reason)) || 'unhandledrejection'));

  // Consola proxy (error/warn)
  const _err = console.error.bind(console); const _warn = console.warn.bind(console); const _log = console.log.bind(console);
  console.error = (...args)=>{ log('error', args.map(a=> typeof a==='string'?a:JSON.stringify(a)).join(' ')); _err(...args); };
  console.warn = (...args)=>{ log('warn', args.map(a=> typeof a==='string'?a:JSON.stringify(a)).join(' ')); _warn(...args); };
  console.log = (...args)=>{ log('log', args.map(a=> typeof a==='string'?a:JSON.stringify(a)).join(' ')); _log(...args); };

  // Firebase eventos
  document.addEventListener('firebase:sdk-ready', ()=>{ 
    state.flags.firebaseSDKReady = true; 
    state.flags.firebaseConfig = !!window.__FIREBASE_APP_CONFIG;
    log('log','evento firebase:sdk-ready'); 
    setTimeout(()=>{ 
      state.flags.firebaseAuthReady = !!window.__firebaseAuth; 
      try { state.flags.firebaseSignedIn = !!(window.__firebaseAuth && window.__firebaseAuth.currentUser); } catch {}
      state.flags.firebaseConfig = !!window.__FIREBASE_APP_CONFIG;
      renderStatus(); 
    }, 0); 
  });
  if (window.__firebaseAuth) { state.flags.firebaseAuthReady = true; try { state.flags.firebaseSignedIn = !!window.__firebaseAuth.currentUser; } catch {} }

  // GIS detección
  function pollGIS(attempt=0){
    const ok = (typeof google !== 'undefined') && google.accounts && google.accounts.id;
    state.flags.gisLoaded = !!ok; renderStatus();
    if (!ok) {
      // Inyectar script de GIS automáticamente en debug si no está presente
      if (!state._gis.injected && attempt >= 3) {
        injectGisScript();
      }
      if (attempt < 50) return setTimeout(()=>pollGIS(attempt+1), 200);
      log('warn','GIS no disponible tras espera.');
      return;
    }
    log('log','GIS detectado.');
    // Intentar una inicialización segura (sin prompt) para marcar init OK en debug
    safeInitGIS();
  }
  document.addEventListener('DOMContentLoaded', ()=> pollGIS());

  // Detectar initialización real de GIS envolviendo initialize/renderButton
  function hookGIS(){
    try {
      if (!window.google || !google.accounts || !google.accounts.id) return;
      if (google.accounts.id.__wrapped_dbg) return; // evitar doble wrap
      const origInit = google.accounts.id.initialize;
      const origRender = google.accounts.id.renderButton;
      google.accounts.id.initialize = function(cfg){
        state.flags.gisInitialized = true;
        if (cfg && cfg.client_id) state.flags.googleClientId = cfg.client_id;
        renderStatus();
        log('log','GIS initialize llamado');
        return origInit.apply(this, arguments);
      };
      google.accounts.id.renderButton = function(){
        log('log','GIS renderButton llamado');
        return origRender.apply(this, arguments);
      };
      google.accounts.id.__wrapped_dbg = true;
    } catch(e){ /* ignore */ }
  }
  const gisObs = new MutationObserver(hookGIS); gisObs.observe(document.documentElement, { childList:true, subtree:true });
  hookGIS();

  // Envolver handleCredentialResponse si existe (o cuando aparezca)
  function hookHCR(){
    if (!window.handleCredentialResponse || window.__hcrHooked) return;
    const orig = window.handleCredentialResponse;
    window.handleCredentialResponse = function(r){ log('log','handleCredentialResponse invocado'); try { return orig.call(this, r); } catch(e){ console.error('handleCredentialResponse error', e); throw e; } };
    window.__hcrHooked = true;
  }
  const ob = new MutationObserver(hookHCR); ob.observe(document.documentElement, { childList:true, subtree:true });
  hookHCR();

  // Mensajes útiles al iniciar
  log('log', 'Debug Auth activado. Usa ?debug=1 en la URL para ocultarlo/mostrarlo.');
  if (!state.flags.googleClientId) log('warn','PublicAuthConfig.googleClientId no definido.');

  // Utilidades: inyectar GIS script y realizar init seguro en modo debug
  function injectGisScript(){
    try {
      if (state._gis.injected) return;
      const existing = Array.from(document.scripts || []).some(s => (s.src||'').includes('accounts.google.com/gsi/client'));
      if (existing) { state._gis.injected = true; return; }
      const el = document.createElement('script');
      el.src = 'https://accounts.google.com/gsi/client?hl=es';
      el.async = true; el.defer = true;
      el.onload = ()=>{ state._gis.injected = true; log('log','GIS script inyectado (debug).'); pollGIS(); };
      el.onerror = ()=>{ log('warn','Fallo al cargar GIS script (debug).'); };
      (document.head || document.getElementsByTagName('head')[0]).appendChild(el);
    } catch(e){ /* ignore */ }
  }

  function safeInitGIS(){
    try {
      if (state._gis.initialized) return;
      if (!window.google || !google.accounts || !google.accounts.id) return;
      const clientId = state.flags.googleClientId || (window.PublicAuthConfig && window.PublicAuthConfig.googleClientId);
      if (!clientId) return;
      // Inicialización sin prompt y sin auto-select para no interferir con UX
      google.accounts.id.initialize({
        client_id: clientId,
        callback: function(){ /* no-op for debug */ },
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true
      });
      state._gis.initialized = true;
      state.flags.gisInitialized = true;
      renderStatus();
      log('log','GIS inicializado en modo debug (sin prompt).');
    } catch(e){ /* ignore */ }
  }

  // ==========
  // Supabase + Backend checks (todo-en-uno)
  // ==========
  async function runChecks(){
    try {
      log('log','[check] Iniciando verificación todo-en-uno…');
      // 1) Supabase client y sesión
      let sb = null;
      try {
        if (window.SupabaseAuth && window.SupabaseAuth.ensureSupabase) {
          sb = await window.SupabaseAuth.ensureSupabase();
          state.flags.supabaseClient = !!sb;
        } else {
          state.flags.supabaseClient = false;
        }
      } catch(e){ state.flags.supabaseClient = false; log('warn','[check] ensureSupabase falló: '+(e.message||e)); }

      let token = null; let payload = null;
      if (state.flags.supabaseClient && window.SupabaseAuth && window.SupabaseAuth.getAccessToken) {
        try { token = await window.SupabaseAuth.getAccessToken(); } catch(e){ log('warn','[check] getAccessToken falló: '+(e.message||e)); }
      }
      state.flags.supabaseSession = !!token;
      if (token) {
        try {
          const p = JSON.parse(atob(token.split('.')[1] || ''));
          payload = p;
          state.flags.tokenIssuer = p.iss || null;
          state.flags.supabaseEmail = p.email || null;
        } catch(e){ log('warn','[check] No se pudo decodificar el JWT: '+(e.message||e)); }
      } else {
        state.flags.tokenIssuer = null;
        state.flags.supabaseEmail = null;
      }

      // 2) Determinar proveedor activo
      try { state.flags.firebaseSignedIn = !!(window.__firebaseAuth && window.__firebaseAuth.currentUser); } catch {}
      state.flags.provider = state.flags.supabaseSession ? 'supabase' : (state.flags.firebaseSignedIn ? 'firebase' : 'none');

      // 3) API base y /auth/me
      const apiCfg = (window.PublicAuthConfig && window.PublicAuthConfig.api) || null;
      const apiBase = apiCfg && apiCfg.baseUrl ? apiCfg.baseUrl : (function(){
        try {
          const host = (window.location && window.location.hostname) || '';
          if (host === 'localhost' || host === '127.0.0.1') return '/api';
          if (/(^|\.)deceroacien\.app$/.test(host)) return 'https://api.deceroacien.app/api';
        } catch {}
        return '/api';
      })();
      state.flags.backendApiBase = apiBase;

      state.flags.backendMeOk = false; state.flags.backendMeStatus = null; state.flags.backendEnrollments = null;
      let usedToken = token;
      if (!usedToken && window.__firebaseAuth && window.__firebaseAuth.currentUser) {
        try { usedToken = await window.__firebaseAuth.currentUser.getIdToken(/*force*/true); } catch {}
      }
      if (usedToken) {
        try {
          const r = await fetch(apiBase.replace(/\/$/, '') + '/auth/me', { headers: { Authorization: 'Bearer ' + usedToken } });
          state.flags.backendMeStatus = r.status;
          if (r.ok) {
            const j = await r.json().catch(()=>null);
            state.flags.backendMeOk = true;
            state.flags.backendEnrollments = Array.isArray(j?.enrollments) ? j.enrollments.length : null;
            log('log','[check] /auth/me OK ('+r.status+'), enrollments='+state.flags.backendEnrollments);
          } else {
            const txt = await r.text().catch(()=> '');
            log('warn','[check] /auth/me no OK ('+r.status+'): '+ txt.slice(0,180));
          }
        } catch(e){ log('error','[check] Error llamando /auth/me: '+(e.message||e)); }
      } else {
        log('warn','[check] No hay token disponible para probar /auth/me');
      }

      renderStatus();
      log('log','[check] Verificación completada.');
    } catch(e){ log('error','[check] Error general: '+(e.message||e)); }
  }

  document.addEventListener('DOMContentLoaded', ()=>{ setTimeout(()=> runChecks().catch(()=>{}), 0); });
})();
