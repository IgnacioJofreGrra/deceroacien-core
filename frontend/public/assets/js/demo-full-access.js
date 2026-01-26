/* Demo Full Access Utilities
 * Esta utilidad se carga SOLO en la rama feature/full-access-demo
 * Objetivo: garantizar un usuario full-access con todos los entitlements y un modelo de progreso.
 */
(function(){
  // Demo agnóstico de email: se aplica a cualquier usuario autenticado (Google o método propio)
  // Sin auto-crear usuario ni forzar una sesión específica

  const ENTITLEMENTS_KEY = 'deceroacien_entitlements';
  const PROGRESS_KEY = 'deceroacien_progress';
  const USER_KEY = 'deceroacien_user';

  // Lista base de entitlements conocida (se extenderá dinámicamente si aparecen nuevos data-entitlement)
  // Nota: En producción cada producto (academy / de cero a cien / camino dorado) es independiente.
  // Aquí en la demo full-access concedemos todos para mostrar el catálogo completo simultáneamente.
  const BASE_ENTITLEMENTS = [
    'formacion.semilla', // Bonus gratuito para usuarios registrados
    'course.pmv','course.pmf','course.growth','course.ceo', // Academy
    'membership.pro',
    'product.deceroacien','product.camino_dorado', // Productos independientes (no derivan cursos automáticamente)
    'decero.fase1','decero.fase2','decero.fase3','decero.fase4','decero.fase5',
    'camino.fase1','camino.fase2','camino.fase3','camino.fase4','camino.fase5',
    'fase_1_ecd','fase_2_ecd','fase_3_ecd','fase_4_ecd','fase_5_ecd', // Camino Dorado fases/herramientas
    'bootcamp.pmv','bootcamp.pmf','bootcamp.growth','bootcamp.ceo', // alias internos si se usan
    'bundle.full',
    'tool.canvas','tool.mapa-estrategia','tool.metricas'
  ];

  function log(...args){ console.log('[FULL-DEMO]', ...args); }

  function getCurrentUserOrNull(){
    // 1) Si hay authManager y usuario autenticado, úsalo
    if (window.authManager && typeof window.authManager.isUserAuthenticated === 'function'){
      try {
        if (window.authManager.isUserAuthenticated()){
          const u = window.authManager.getCurrentUser ? window.authManager.getCurrentUser() : window.authManager.currentUser;
          if (u) return u;
        }
      } catch(_){ /* noop */ }
    }
    // 2) Fallback: si existe usuario en localStorage (del flujo propio), úsalo tal cual
    const user = safeParse(localStorage.getItem(USER_KEY));
    return user || null;
  }

  function syncAuthManagerIfNeeded(user){
    // No fuerces estado si ya hay autenticación real; solo sincroniza si el authManager existe y no tiene usuario
    if (!user) return;
    if(window.authManager){
      try {
        const hasUser = typeof window.authManager.isUserAuthenticated === 'function' && window.authManager.isUserAuthenticated();
        if (!hasUser && !window.authManager.currentUser){
          window.authManager.currentUser = user;
          window.authManager.isAuthenticated = true;
        }
      } catch(e){ console.warn('[FULL-DEMO] No se pudo sincronizar authManager', e); }
    } else {
      // Reintentar pronto si aún no existe
      setTimeout(()=>syncAuthManagerIfNeeded(user), 100);
    }
  }

  function collectEntitlementsFromDOM(){
    const set = new Set(BASE_ENTITLEMENTS);
    const attrSelectors = ['[data-entitlement]','[data-entitlement-any]'];
    attrSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        const attr = el.getAttribute(sel.replace(/[\[\]]/g,''));
        if(!attr) return;
        // separar por espacios o comas
        attr.split(/[ ,]+/).forEach(token => { if(token.trim()) set.add(token.trim()); });
      });
    });
    return Array.from(set).sort();
  }

  function ensureEntitlements(){
    const existing = safeParse(localStorage.getItem(ENTITLEMENTS_KEY)) || [];
    const discovered = collectEntitlementsFromDOM();
    const merged = Array.from(new Set([ ...existing, ...discovered ]));
    localStorage.setItem(ENTITLEMENTS_KEY, JSON.stringify(merged));
    window.DemoFullAccessEntitlements = merged;
    log('Entitlements asegurados', merged);
    // Broadcast manual
    window.dispatchEvent(new Event('deceroacien_entitlements_updated'));
    return merged;
  }

  function defaultProgressModel(){
    // Progreso real inicial (sin datos demo)
    const fases = ['fase_1_ecd','fase_2_ecd','fase_3_ecd','fase_4_ecd','fase_5_ecd']
      .reduce((acc,f,i)=>{acc[f]={completed: 0,total: i===0?12:10,lastUpdated:new Date().toISOString()};return acc;},{});
    const cursos = {
      'course.pmv': { completed: 0, total: 20 },
      'course.pmf': { completed: 0, total: 20 },
      'course.growth': { completed: 0, total: 15 },
      'course.ceo': { completed: 0, total: 12 }
    };
    const herramientas = {
      'tool.canvas': false,
      'tool.mapa-estrategia': false,
      'tool.metricas': false
    };
    return { fases: fases, cursos: cursos, herramientas: herramientas, version: 1, updatedAt: new Date().toISOString() };
  }

  function ensureProgress(){
    let progress = safeParse(localStorage.getItem(PROGRESS_KEY));
    if(!progress || typeof progress !== 'object'){
      progress = defaultProgressModel();
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    }
    window.ProgressModel = buildProgressAPI(progress);
    return progress;
  }

  function buildProgressAPI(state){
    function persist(){ state.updatedAt = new Date().toISOString(); localStorage.setItem(PROGRESS_KEY, JSON.stringify(state)); dispatch(); }
    function dispatch(){ window.dispatchEvent(new CustomEvent('progress:updated',{ detail: { state } })); }
    return {
      getState: ()=>JSON.parse(JSON.stringify(state)),
      markCompleted(id){
        // id puede ser 'fase_1_ecd:modulo_1' o 'course.pmv:leccion_3'
        const [entity, sub] = id.split(':');
        if(state.fases[entity]){
          if(state.fases[entity].completed < state.fases[entity].total){ state.fases[entity].completed++; persist(); }
          return;
        }
        if(state.cursos[entity]){
          if(state.cursos[entity].completed < state.cursos[entity].total){ state.cursos[entity].completed++; persist(); }
          return;
        }
        if(state.herramientas[entity] === false){ state.herramientas[entity] = true; persist(); return; }
        console.warn('ID no reconocido para progreso:', id);
      },
      set(entity, data){
        if(state.fases[entity]){ Object.assign(state.fases[entity], data); persist(); return; }
        if(state.cursos[entity]){ Object.assign(state.cursos[entity], data); persist(); return; }
        if(state.herramientas[entity] !== undefined){ state.herramientas[entity] = data; persist(); return; }
        console.warn('Entidad desconocida', entity);
      },
      reset(){ const fresh = defaultProgressModel(); Object.assign(state, fresh); persist(); },
    };
  }

  function safeParse(str){ try { return JSON.parse(str); } catch(_){ return null; } }

  // Mapeo de IDs internos a nombres amigables
  function getFriendlyNames() {
    return {
      fases: {
        'fase_1_ecd': 'Validación y PMV',
        'fase_2_ecd': 'PMF y Crecimiento',
        'fase_3_ecd': 'Escalamiento',
        'fase_4_ecd': 'Optimización',
        'fase_5_ecd': 'Expansión'
      },
      cursos: {
        'course.pmv': 'Bootcamp PMV',
        'course.pmf': 'Bootcamp PMF',
        'course.growth': 'Bootcamp Growth',
        'course.ceo': 'Masterclass CEO'
      },
      herramientas: {
        'tool.canvas': 'Canvas de Modelo de Negocio',
        'tool.mapa-estrategia': 'Mapa de Estrategia',
        'tool.metricas': 'Tablero de Métricas'
      }
    };
  }

  function renderProgressIfContainer(){
    const container = document.querySelector('[data-progress-dashboard]');
    if(!container) return;
    const state = window.ProgressModel.getState();
    const friendlyNames = getFriendlyNames();
    function pct(obj){ return obj.total ? Math.round((obj.completed/obj.total)*100) : 0; }
    
    // Filtrar solo elementos con progreso real (> 0) o herramientas completadas
    const hasRealProgress = Object.values(state.fases).some(v => v.completed > 0) ||
                           Object.values(state.cursos).some(v => v.completed > 0) ||
                           Object.values(state.herramientas).some(v => v === true);
    
    let html = '<div class="space-y-6">';
    html += '<h2 class="text-xl font-bold">Progreso Global</h2>';
    
    if (!hasRealProgress) {
      html += '<div class="text-gray-400 text-center py-8">Aún no has comenzado ningún programa. ¡Explora nuestro contenido para empezar!</div>';
    } else {
      html += '<div class="grid md:grid-cols-2 gap-6">';
      
      // Fases (solo mostrar las que tienen progreso)
      const fasesConProgreso = Object.entries(state.fases).filter(([k,v]) => v.completed > 0);
      if (fasesConProgreso.length > 0) {
        html += '<div><h3 class="font-semibold mb-2">Fases</h3><div class="space-y-2">';
        fasesConProgreso.forEach(([k,v])=>{ 
          const friendlyName = friendlyNames.fases[k] || k;
          html += progressBar(friendlyName,pct(v), v.completed + '/' + v.total); 
        });
        html += '</div></div>';
      }
      
      // Cursos (solo mostrar los que tienen progreso)
      const cursosConProgreso = Object.entries(state.cursos).filter(([k,v]) => v.completed > 0);
      if (cursosConProgreso.length > 0) {
        html += '<div><h3 class="font-semibold mb-2">Cursos</h3><div class="space-y-2">';
        cursosConProgreso.forEach(([k,v])=>{ 
          const friendlyName = friendlyNames.cursos[k] || k;
          html += progressBar(friendlyName,pct(v), v.completed + '/' + v.total); 
        });
        html += '</div></div>';
      }
      
      html += '</div>';
      
      // Herramientas (solo mostrar las completadas)
      const herramientasCompletadas = Object.entries(state.herramientas).filter(([k,v]) => v === true);
      if (herramientasCompletadas.length > 0) {
        html += '<div><h3 class="font-semibold mb-2">Herramientas</h3><div class="flex flex-wrap gap-2">';
        herramientasCompletadas.forEach(([k,v])=>{ 
          const friendlyName = friendlyNames.herramientas[k] || k;
          html += `<span class="px-3 py-1 rounded text-sm bg-green-600">${friendlyName} ✓</span>`; 
        });
        html += '</div></div>';
      }
    }

    html += '</div>';
    container.innerHTML = html;
  }

  function progressBar(label, pct, detail){
    return `<div><div class="flex justify-between text-xs mb-1"><span>${label}</span><span>${pct}% (${detail})</span></div><div class="w-full h-2 bg-slate-700 rounded"><div class="h-2 bg-emerald-500 rounded" style="width:${pct}%;"></div></div></div>`;
  }

  function addDebugShortcuts(){
    document.addEventListener('keydown', e => {
      if(e.shiftKey && e.key.toLowerCase() === 'p'){
        e.preventDefault();
        openDebugPanel();
      }
    });
  }
  function openDebugPanel(){
    let panel = document.getElementById('progress-debug-panel');
    if(panel){ panel.remove(); }
    const state = window.ProgressModel.getState();
    panel = document.createElement('div');
    panel.id = 'progress-debug-panel';
    panel.style.position='fixed';panel.style.top='1rem';panel.style.right='1rem';panel.style.zIndex=9999;panel.style.width='320px';
    panel.className='bg-slate-900/95 backdrop-blur border border-slate-700 rounded-lg p-4 text-xs space-y-3 shadow-xl';
    panel.innerHTML = `<div class="flex justify-between items-center"><strong>Debug Progreso</strong><button id="closeDbg" class="text-slate-400 hover:text-white">×</button></div>
    <div class="space-y-2 max-h-64 overflow-auto text-[11px] font-mono" id="dbgBody"></div>
    <div class="flex gap-2"><button id="dbgReset" class="px-2 py-1 bg-slate-700 rounded">Reset</button><button id="dbgClose" class="px-2 py-1 bg-slate-700 rounded">Cerrar</button></div>`;
    document.body.appendChild(panel);
    function refresh(){
      const st = window.ProgressModel.getState();
      document.getElementById('dbgBody').textContent = JSON.stringify(st,null,2);
      renderProgressIfContainer();
    }
    refresh();
    panel.querySelector('#dbgReset').onclick = ()=>{ window.ProgressModel.reset(); refresh(); };
    panel.querySelector('#dbgClose').onclick = panel.querySelector('#closeDbg').onclick = ()=>panel.remove();
  }

  // Paso 1: asegurar el usuario DEMO inmediatamente (antes de que components.js llame requireAuth)
  const earlyUser = getCurrentUserOrNull();
  // Sincroniza solo si hace falta (no sobreescribir sesiones reales)
  syncAuthManagerIfNeeded(earlyUser);
  // Marcamos autenticado lo antes posible
  // (syncAuthManager ya se llamó dentro de ensureDemoUser)

  // Paso 2: diferir operaciones que requieren DOM completo
  function renderRecentActivityIfContainer(){
    const container = document.querySelector('[data-recent-activity]');
    if(!container) return;
    
    // Por ahora, solo mostrar mensaje de placeholder hasta que se implemente actividad real
    const hasActivity = false; // TODO: implementar sistema de tracking de actividad real
    
    if (!hasActivity) {
      container.innerHTML = `
        <div class="text-gray-400 text-center py-8">
          Aún no tienes actividad reciente. ¡Comienza explorando nuestros programas y herramientas!
        </div>
      `;
    } else {
      // TODO: Renderizar actividad real del usuario
      container.innerHTML = '<div class="space-y-4" id="activity-list"></div>';
    }
  }

  function bootstrapLate(){
    ensureEntitlements(); // ahora el DOM está disponible para detectar data-entitlement
    ensureProgress();
    renderProgressIfContainer();
    renderRecentActivityIfContainer();
    addDebugShortcuts();
  window.dispatchEvent(new CustomEvent('fullaccess:ready',{ detail: { user: getCurrentUserOrNull() } }));
    window.addEventListener('progress:updated', renderProgressIfContainer);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bootstrapLate);
  } else {
    bootstrapLate();
  }
})();
