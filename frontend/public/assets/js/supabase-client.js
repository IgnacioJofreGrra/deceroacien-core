(function(w){
  let _supabase = null;
  async function ensureSupabase() {
    if (_supabase) return _supabase;
    // Reutilizar cliente ya existente si alguna otra parte lo creó
    if (w.__supabase) { _supabase = w.__supabase; return _supabase; }
    // Obtener config pública del backend (components.js ya lo hace, pero por si se llama temprano)
    if (!w.__PUBLIC_CONFIG) {
      try {
        const base = (w.PublicAuthConfig && w.PublicAuthConfig.api && w.PublicAuthConfig.api.baseUrl) || '/api';
        const r = await fetch(base.replace(/\/$/, '') + '/public-config', { cache: 'no-store' });
        w.__PUBLIC_CONFIG = r.ok ? await r.json() : {};
      } catch(_){ w.__PUBLIC_CONFIG = {}; }
    }
    const sup = w.__PUBLIC_CONFIG && w.__PUBLIC_CONFIG.supabase || {};
    if (!sup.url || !sup.anonKey) {
      console.warn('[supabase-client] Config supabase faltante en /api/public-config');
      return null;
    }
    try {
      // Cargar la librería mediante import dinámico (una sola vez)
      const mod = await import('https://esm.sh/@supabase/supabase-js@2.45.4');
      _supabase = mod.createClient(sup.url, sup.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      try { console.log('[supabase-client] Cliente creado con URL:', sup.url); } catch(_){}
      w.__supabase = _supabase;
      try {
        const storage = (w.PublicAuthConfig && w.PublicAuthConfig.storage) || { userKey: 'deceroacien_user', tokenKey: 'deceroacien_token' };
        _supabase.auth.onAuthStateChange(async (event, session) => {
          try { console.log('[supabase-client] onAuthStateChange:', event, !!session); } catch(_){ }
          try {
            if (session && session.user) {
              const u = session.user;
              const fullName = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || '';
              const [firstName, ...rest] = fullName.split(' ');
              const simpleUser = {
                id: u.id,
                email: u.email,
                firstName: firstName || null,
                lastName: rest.join(' ') || null
              };
              localStorage.setItem(storage.userKey, JSON.stringify(simpleUser));
              localStorage.setItem(storage.tokenKey, session.access_token);
              // Notificar backend
              const apiBase = (w.PublicAuthConfig && w.PublicAuthConfig.api && w.PublicAuthConfig.api.baseUrl) || '/api';
              try { await fetch(apiBase + '/auth/verify', { method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token } }); } catch(_){ }
              try { await fetch(apiBase + '/auth/me', { headers: { Authorization: 'Bearer ' + session.access_token } }); } catch(_){ }
              if (w.authManager) {
                w.authManager.currentUser = simpleUser; w.authManager.isAuthenticated = true;
              }
            } else {
              localStorage.removeItem(storage.userKey);
              localStorage.removeItem(storage.tokenKey);
              if (w.authManager) { w.authManager.currentUser = null; w.authManager.isAuthenticated = false; }
            }
          } catch(e){ console.warn('[supabase-client] onAuthStateChange error', e); }
        });
        // Log y sincronización de la sesión actual en cold start
        try {
          const s = await _supabase.auth.getSession();
          const hasSession = !!s?.data?.session;
          console.log('[supabase-client] getSession(cold):', hasSession);
          if (hasSession) {
            try {
              const session = s.data.session;
              const u = session.user;
              const fullName = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || '';
              const [firstName, ...rest] = fullName.split(' ');
              const simpleUser = {
                id: u.id,
                email: u.email,
                firstName: firstName || null,
                lastName: rest.join(' ') || null
              };
              // Persistir para el frontend (mismo esquema que onAuthStateChange)
              const storage = (w.PublicAuthConfig && w.PublicAuthConfig.storage) || { userKey: 'deceroacien_user', tokenKey: 'deceroacien_token' };
              localStorage.setItem(storage.userKey, JSON.stringify(simpleUser));
              localStorage.setItem(storage.tokenKey, session.access_token);
              if (w.authManager) {
                w.authManager.currentUser = simpleUser;
                w.authManager.isAuthenticated = true;
              }
              // Notificar a otros listeners que ya hay sesión activa
              try { window.dispatchEvent(new CustomEvent('auth:success', { detail: { provider: 'supabase', user: simpleUser } })); } catch(_){}
            } catch(e) { console.warn('[supabase-client] cold start sync error', e); }
          }
        } catch(_){ }
      } catch(_){ }
      return _supabase;
    } catch (e) {
      console.error('[supabase-client] No se pudo crear el cliente:', e);
      return null;
    }
  }

  async function signInWithGoogle() {
    const sb = await ensureSupabase();
    if (!sb) throw new Error('supabase_not_ready');
    // Redirigimos a login.html para que detectSessionInUrl procese la sesión y luego
    // la propia página redirija al dashboard con redirectIfAuthenticated()
    const redirectTo = (w.location && w.location.origin) ? `${w.location.origin}/auth/login.html` : undefined;
    const { data, error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw error; return data;
  }

  async function getAccessToken() {
    const sb = await ensureSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    try { console.log('[supabase-client] getAccessToken(): session?', !!data?.session); } catch(_){ }
    return data?.session?.access_token || null;
  }

  w.SupabaseAuth = { ensureSupabase, signInWithGoogle, getAccessToken };
})(window);
