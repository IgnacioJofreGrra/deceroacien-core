(function(){
  function buildSidebar(){
    const links = [
      { href: '/admin/index.html', label: 'Dashboard', icon: 'fa-solid fa-chart-line' },
      { href: '/admin/usuarios.html', label: 'Usuarios', icon: 'fa-solid fa-users' },
      { href: '/admin/instituciones.html', label: 'Instituciones', icon: 'fa-solid fa-building' },
      { href: '/admin/calendario.html', label: 'Calendario', icon: 'fa-regular fa-calendar-days' },
      { href: '/admin/cursos.html', label: 'Cursos', icon: 'fa-solid fa-book' },
      { href: '/admin/parametros.html', label: 'Parámetros', icon: 'fa-solid fa-sliders' }
    ];
    const p = (location.pathname || '').toLowerCase();
    const nav = document.createElement('nav');
    nav.className = 'grid grid-cols-2 sm:grid-cols-3 lg:block gap-2';
    links.forEach(l => {
      const a = document.createElement('a');
      a.href = l.href;
      const active = p.endsWith(l.href.toLowerCase());
      a.className = 'flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-700/60 ' + (active ? 'bg-slate-700/60 text-emerald-300' : 'text-gray-200');
      a.innerHTML = `<i class="${l.icon} w-5 text-center"></i><span>${l.label}</span>`;
      nav.appendChild(a);
    });
    const aside = document.createElement('aside');
    aside.className = 'bg-slate-800/60 border-b border-slate-700 lg:border-b-0 lg:border-r w-full lg:w-64 p-4 top-0 z-10';
    const badge = document.createElement('div');
    badge.className = 'flex items-center justify-between mb-3';
    badge.innerHTML = '<span class="text-sm uppercase tracking-wider text-emerald-300">DE CERO A CIEN</span><span class="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-300 border border-emerald-500/30">Admin</span>';
    aside.appendChild(badge);
    aside.appendChild(nav);
    return aside;
  }

  function getLocalUser(){
    try {
      const raw = localStorage.getItem('deceroacien_user');
      return raw ? JSON.parse(raw) : null;
  } catch { return null; }
  }

  async function resolveUser(){
    const u = getLocalUser();
    if (u) return u;
    try {
      if (window.AdminHelpers && typeof window.AdminHelpers.apiFetch === 'function') {
        const me = await window.AdminHelpers.apiFetch('/auth/me');
        return (me && me.user) || null;
      }
    } catch {}
    return null;
  }

  function wrapLayout(){
    const main = document.querySelector('main');
    if (!main) return; // página no compatible
    // Si ya existe shell, no duplicar
    if (document.getElementById('admin-shell')) return;
    const shell = document.createElement('div');
    shell.id = 'admin-shell';
    shell.className = 'min-h-screen lg:flex';

    const aside = buildSidebar();
    const contentWrap = document.createElement('div');
    contentWrap.className = 'flex-1';

    // Insertar shell antes del main y mover main dentro
    const parent = main.parentNode;
    parent.insertBefore(shell, main);
    shell.appendChild(aside);
    shell.appendChild(contentWrap);
    contentWrap.appendChild(main);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wrapLayout);
  } else {
    wrapLayout();
  }

  // Reaccionar al cierre de sesión en otra pestaña
  window.addEventListener('storage', (ev) => {
    if (!ev) return;
    if (ev.key === 'deceroacien_logout_broadcast') {
      try { if (window.requireAuth && !window.requireAuth()) return; } catch { }
      // Si estamos en admin y hay logout, redirigimos a login
      const here = String(window.location.pathname || '');
      if (here.startsWith('/admin/')) {
        const ret = encodeURIComponent(window.location.href);
        window.location.href = '/auth/login.html?return=' + ret;
      }
    }
  });
})();
