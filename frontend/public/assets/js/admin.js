/* Admin helpers for calling the API with Supabase token and enforcing scopes */
(function(){
  const apiBase = '/api';

  async function getToken() {
    try {
      const t = localStorage.getItem('deceroacien_token');
      return t || null;
    } catch(_) { return null; }
  }

  async function apiFetch(path, options={}) {
    const token = await getToken();
    const headers = Object.assign({ 'Accept': 'application/json', 'Content-Type': 'application/json' }, options.headers || {});
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch((apiBase + path), Object.assign({}, options, { headers }));
    if (!res.ok) {
      let detail = null; try { detail = await res.json(); } catch(_){ }
      const err = new Error('HTTP ' + res.status);
      err.response = res; err.detail = detail; throw err;
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.text();
  }

  async function requireAdminScopes(requiredScopes=[]) {
    if (!window.requireAuth || !window.requireAuth()) return null;
    const token = await getToken();
    if (!token) { window.location.href = '/auth/login.html?return=' + encodeURIComponent(window.location.href); return null; }
    try {
      // verificar/provisionar
      try { await apiFetch('/auth/verify', { method: 'POST', body: null }); } catch(_){ }
      const me = await apiFetch('/auth/me');
      const scopes = me.scopes || [];
      const ok = (requiredScopes||[]).every(s => scopes.includes('*') || scopes.includes(s));
      if (!ok) {
        const el = document.getElementById('admin-alert');
        if (el) { el.style.display='block'; el.textContent = 'No tienes permisos para ver este módulo.'; }
        throw new Error('forbidden');
      }
      return me;
    } catch (e) {
      console.warn('[admin] permiso insuficiente o error:', e);
      return null;
    }
  }

  function renderTable(containerId, rows, columns) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!Array.isArray(rows) || !rows.length) { el.innerHTML = '<p class="text-gray-300">Sin datos.</p>'; return; }
    const header = '<tr>' + columns.map(c => `<th class="px-3 py-2 text-left">${c.label}</th>`).join('') + '</tr>';
    const body = rows.map(r => '<tr class="border-t border-gray-700">' + columns.map(c => `<td class="px-3 py-2">${(c.render? c.render(r[c.key], r): (r[c.key] ?? ''))}</td>`).join('') + '</tr>').join('');
    el.innerHTML = `<table class="w-full text-sm">${header}${body}</table>`;
  }

  window.AdminHelpers = { apiFetch, requireAdminScopes, renderTable };
})();
