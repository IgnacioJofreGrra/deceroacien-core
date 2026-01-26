/**
 * Sistema de Entitlements (accesos por compra)
 * - Gating por data-atributos sin bloquear la carga de la página
 * - Integración ligera con AuthManager si está disponible
 * - Pensado para conectarse a MercadoPago/Stripe más adelante
 *
 * Uso en HTML:
 * <section data-entitlement="course.pmv">
 *   <div data-when="granted">...contenido protegido...</div>
 *   <div data-when="denied">...mensaje alternativo/CTA (opcional)...</div>
 * </section>
 *
 * Atributos soportados:
 * - data-entitlement="id1 id2"           → acceso si tiene cualquiera (modo ANY por defecto)
 * - data-entitlement-any="id1,id2"       → igual que arriba explícito
 * - data-entitlement-all="id1,id2"       → requiere todos
 * - data-cta-override="/ruta"            → reemplaza el destino por defecto del CTA
 * - data-cta-label="Texto CTA"           → reemplaza el texto por defecto del CTA
 */
(function (w) {
  const STORAGE_KEY = 'deceroacien_entitlements';

  // Derivaciones internas (solo dentro del mismo producto, NO cruzadas entre suites)
  // Al comprar el producto macro se otorgan sus fases internas.
  const DERIVED_ENTITLEMENTS = {
    'product.deceroacien': ['decero.fase1','decero.fase2','decero.fase3','decero.fase4','decero.fase5'],
    'product.camino_dorado': ['camino.fase1','camino.fase2','camino.fase3','camino.fase4','camino.fase5']
  };

  // Mapa de productos → CTA por defecto (ajustable)
  const PRODUCT_CTAS = {
  'course.pmv': { href: '/academy-fases/bootcamp-pmv.html', label: 'Comprar Programa PMV' },
  'course.pmf': { href: '/academy-fases/bootcamp-pmf.html', label: 'Comprar Programa PMF' },
  'course.growth': { href: '/academy-fases/bootcamp-growth.html', label: 'Comprar Programa Growth' },
  'course.ceo': { href: '/masterclass-ceo.html', label: 'Comprar Masterclass CEO' },
  'membership.pro': { href: '/academy-fases/index.html', label: 'Unirme a la Membresía' },
  'test.clp500': { href: '/pago-prueba.html', label: 'Comprar prueba $500' },
  // Nuevos productos macro
  'product.deceroacien': { href: '/de-cero-a-cien.html', label: 'Comprar De Cero a Cien' },
  'product.camino_dorado': { href: '/camino-dorado.html', label: 'Comprar Camino Dorado' }
  };

  // CTAs para fases internas (apuntan al producto principal). Facilita mostrar botón correcto si se usa data-entitlement="decero.fase1" etc.
  ['1','2','3','4','5'].forEach(n => {
    PRODUCT_CTAS['decero.fase'+n] = { href: '/de-cero-a-cien.html', label: 'Comprar De Cero a Cien' };
    PRODUCT_CTAS['camino.fase'+n] = { href: '/camino-dorado.html', label: 'Comprar Camino Dorado' };
  });

  function readEntitlements() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      const base = Array.isArray(arr) ? arr : [];
      // Expandir sólo derivaciones internas del mismo producto
      const expanded = new Set(base);
      base.forEach(id => {
        const derived = DERIVED_ENTITLEMENTS[id];
        if (derived) derived.forEach(d => expanded.add(d));
      });
      return Array.from(expanded);
    } catch (e) { return []; }
  }

  function writeEntitlements(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set(list))));
    } catch (e) {}
  }

  const Entitlements = {
    getAll() { return readEntitlements(); },
    has(id) { return readEntitlements().includes(String(id)); },
    hasAny(ids) { return ids.some(id => Entitlements.has(id)); },
    hasAll(ids) { return ids.every(id => Entitlements.has(id)); },
    grant(id) { const cur = readEntitlements(); cur.push(String(id)); writeEntitlements(cur); broadcastUpdate(); },
    revoke(id) { const cur = readEntitlements().filter(x => x !== String(id)); writeEntitlements(cur); broadcastUpdate(); },
    setAll(ids) { writeEntitlements(ids.map(String)); broadcastUpdate(); }
  };

  // Broadcast simple entre pestañas
  function broadcastUpdate() {
    try {
      localStorage.setItem('deceroacien_entitlements_updated', Date.now().toString());
    } catch (_) {}
  }

  // Render del gating
  function applyGating(root = document) {
    const blocks = root.querySelectorAll('[data-entitlement], [data-entitlement-any], [data-entitlement-all]');
    if (!blocks.length) return;

    const isLogged = !!(w.authManager && w.authManager.isUserAuthenticated && w.authManager.isUserAuthenticated());
    // Conjunto efectivo y almacenado para distinguir derivaciones
    const storedRaw = (function(){ try { const r=localStorage.getItem(STORAGE_KEY); const a=JSON.parse(r||'[]'); return Array.isArray(a)?a:[];} catch(_){return [];} })();
    const effective = new Set(readEntitlements());
    const storedSet = new Set(storedRaw);

    blocks.forEach(block => {
      const anyAttr = block.getAttribute('data-entitlement-any');
      const allAttr = block.getAttribute('data-entitlement-all');
      const entAttr = block.getAttribute('data-entitlement');

      let mode = 'any';
      let ids = [];

      if (allAttr) { mode = 'all'; ids = allAttr.split(/[\s,]+/).filter(Boolean); }
      else if (anyAttr) { mode = 'any'; ids = anyAttr.split(/[\s,]+/).filter(Boolean); }
      else if (entAttr) { mode = 'any'; ids = entAttr.split(/[\s,]+/).filter(Boolean); }

      const granted = (mode === 'all') ? Entitlements.hasAll(ids) : Entitlements.hasAny(ids);

      const grantedEl = block.querySelector('[data-when="granted"]');
      const deniedEl = block.querySelector('[data-when="denied"]');

      if (granted) {
        if (deniedEl) deniedEl.classList.add('hidden');
        if (grantedEl) grantedEl.classList.remove('hidden');
        block.classList.remove('opacity-60');
        // Badge si todos los ids vienen concedidos por derivación (ninguno aparece almacenado directamente)
        const allDerived = ids.every(id => effective.has(id) && !storedSet.has(id));
        if(allDerived){
          let badge = block.querySelector('.entitlement-derived-badge');
            if(!badge){
              badge = document.createElement('div');
              badge.className='entitlement-derived-badge text-[10px] tracking-wide inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-600/70 text-white border border-indigo-300/30 ml-2';
              badge.innerHTML = '<span>Incluido por compra completa</span>';
              // Insertar al principio del grantedEl o del bloque
              const target = grantedEl || block;
              target.insertBefore(badge, target.firstChild);
              badge.title = 'Este acceso proviene de un entitlement macro (ej. producto completo)';
            }
        }
      } else {
        // No acceso: ocultar granted y mostrar denied; si no hay denied, generar CTA por defecto
        if (grantedEl) grantedEl.classList.add('hidden');
        if (deniedEl) {
          const isEmpty = deniedEl.childElementCount === 0 && (deniedEl.textContent || '').trim() === '';
          if (isEmpty) {
            const cta = buildDefaultCTA(block, ids, isLogged);
            deniedEl.appendChild(cta);
          }
          deniedEl.classList.remove('hidden');
        } else {
          const cta = buildDefaultCTA(block, ids, isLogged);
          // Vaciar y poner sólo CTA sustituto visual
          block.innerHTML = '';
          block.appendChild(cta);
        }
        block.classList.add('opacity-60');
      }
    });
  }

  function buildDefaultCTA(block, ids, isLogged) {
    // Elegir el primer id para CTA por defecto
    const first = ids[0];
    const overrideHref = block.getAttribute('data-cta-override');
    const overrideLabel = block.getAttribute('data-cta-label');
  const map = PRODUCT_CTAS[first] || { href: '/academy-fases/index.html', label: 'Ver programas disponibles' };
    const href = overrideHref || map.href;
    const label = overrideLabel || map.label;

    const wrapper = document.createElement('div');
    wrapper.className = 'bg-slate-800/60 border border-gray-700 rounded-lg p-6 text-center';
    wrapper.innerHTML = `
      <p class="text-sm text-gray-300">Este contenido está disponible para alumnos con acceso activo.</p>
      <div class="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
        ${isLogged ? '' : `<a href="/auth/login.html?return=${encodeURIComponent(location.href)}" class="cta-button">Iniciar sesión</a>`}
        <a href="${href}" class="cta-button">${label}</a>
      </div>
    `;
    return wrapper;
  }

  // Exponer generador de CTA para overlays externos si fuese necesario
  w.__decero_buildCTA = function (ids, { isLogged = false, attrs = {} } = {}) {
    const fake = document.createElement('div');
    if (attrs && typeof attrs === 'object') {
      Object.entries(attrs).forEach(([k, v]) => fake.setAttribute(k, v));
    }
    return buildDefaultCTA(fake, ids, isLogged);
  };

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => applyGating());
    } else {
      applyGating();
    }

    // Reaplicar cuando cambien entitlements en otra pestaña
    window.addEventListener('storage', (e) => {
      if (e.key === 'deceroacien_entitlements_updated') {
        applyGating();
      }
    });

    // Si el estado de auth se inicializa tarde, reintentar gating un par de veces
    setTimeout(applyGating, 500);
    setTimeout(applyGating, 1500);

  // Auto-guard por carpeta/ruta
  setTimeout(function() { try { w.applyPathAutoGuard && w.applyPathAutoGuard(); } catch(_){} }, 100);
  }

  // API pública
  w.entitlements = Entitlements;
  w.applyEntitlementsGating = applyGating;
  w.paymentEntitlements = {
    // Stub genérico para integrar proveedores (MercadoPago/Stripe)
    grantAfterCheckout: function ({ items = [] } = {}) {
      // items: array de productIds como 'course.pmv', 'membership.pro', etc.
      if (!Array.isArray(items)) return;
      const cur = new Set(readEntitlements());
      items.forEach(id => cur.add(String(id)));
      writeEntitlements(Array.from(cur));
      broadcastUpdate();
      applyGating();
      w.applyPathAutoGuard();
    }
  };

  init();

  // Panel debug (Shift + E): muestra entitlements almacenados vs efectivos
  function openEntitlementsDebug(){
    let existing = document.getElementById('entitlements-debug-panel');
    if(existing) existing.remove();
    const panel=document.createElement('div');
    panel.id='entitlements-debug-panel';
    panel.className='fixed bottom-4 right-4 w-[360px] max-h-[70vh] overflow-auto text-xs font-mono bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl p-4 z-[99999] space-y-3';
    const stored = (function(){ try { const r=localStorage.getItem(STORAGE_KEY); const a=JSON.parse(r||'[]'); return Array.isArray(a)?a:[];} catch(_){return [];} })();
    const effectiveList = readEntitlements();
    const derivedOnly = effectiveList.filter(e => !stored.includes(e));
    panel.innerHTML=`<div class='flex justify-between items-center'><strong>Entitlements Debug</strong><button id='closeEDbg' class='text-slate-400 hover:text-white'>×</button></div>
      <div class='space-y-2'>
        <div><span class='font-semibold'>Stored (${stored.length}):</span><pre class='mt-1 whitespace-pre-wrap break-all'>${stored.join(', ')||'—'}</pre></div>
        <div><span class='font-semibold'>Effective (${effectiveList.length}):</span><pre class='mt-1 whitespace-pre-wrap break-all'>${effectiveList.join(', ')||'—'}</pre></div>
        <div><span class='font-semibold'>Derived Only (${derivedOnly.length}):</span><pre class='mt-1 whitespace-pre-wrap break-all'>${derivedOnly.join(', ')||'—'}</pre></div>
      </div>
      <div class='flex gap-2 pt-2'>
        <button id='refreshEDbg' class='px-2 py-1 rounded bg-slate-700 hover:bg-slate-600'>Refrescar</button>
        <button id='closeBtnEDbg' class='px-2 py-1 rounded bg-slate-700 hover:bg-slate-600'>Cerrar</button>
        <button id='clearEDbg' class='ml-auto px-2 py-1 rounded bg-red-700/70 hover:bg-red-600'>Limpiar (stored)</button>
      </div>`;
    document.body.appendChild(panel);
    panel.querySelector('#closeEDbg').onclick = panel.querySelector('#closeBtnEDbg').onclick = ()=>panel.remove();
    panel.querySelector('#refreshEDbg').onclick = ()=>{ panel.remove(); openEntitlementsDebug(); };
    panel.querySelector('#clearEDbg').onclick = ()=>{ localStorage.removeItem(STORAGE_KEY); broadcastUpdate(); panel.remove(); openEntitlementsDebug(); };
  }
  document.addEventListener('keydown', e=>{ if(e.shiftKey && e.key.toLowerCase()==='e'){ openEntitlementsDebug(); }});
})(window);

// =============================
// Helpers: Auto-guard por ruta y URL params
// =============================
(function (w) {
  const PATH_GUARD = [
    // Academy (mantiene course.*)
    { test: /\/fase_1_ecd\//i, required: ['course.pmv'] },
    { test: /\/fase_2_ecd\//i, required: ['course.pmv'] },
    { test: /\/fase_3_ecd\//i, required: ['course.pmf'] },
    { test: /\/fase_4_ecd\//i, required: ['course.growth'] },
    { test: /\/fase_5_ecd\//i, required: ['course.ceo'] },
    // Camino Dorado (granular camino.faseX). Respetar index libre, sólo bloquear archivos internos
    { test: /\/camino-dorado-fases\/fase-1-ecd\/(?!index\.html)([^/?#]+)/i, required: ['camino.fase1'] },
    { test: /\/camino-dorado-fases\/fase-2-ecd\/(?!index\.html)([^/?#]+)/i, required: ['camino.fase2'] },
    { test: /\/camino-dorado-fases\/fase-3-ecd\/(?!index\.html)([^/?#]+)/i, required: ['camino.fase3'] },
    { test: /\/camino-dorado-fases\/fase-4-ecd\/(?!index\.html)([^/?#]+)/i, required: ['camino.fase4'] },
    { test: /\/camino-dorado-fases\/fase-5-ecd\/(?!index\.html)([^/?#]+)/i, required: ['camino.fase5'] },
  // De Cero a Cien (granular decero.faseX) — soporta legacy y canónico
  { test: /\/(de-cero-a-cien-fases\/)?fase[-_]1[-_]de0a100\//i, required: ['decero.fase1'] },
  { test: /\/(de-cero-a-cien-fases\/)?fase[-_]2[-_]de0a100\//i, required: ['decero.fase2'] },
  { test: /\/(de-cero-a-cien-fases\/)?fase[-_]3[-_]de0a100\//i, required: ['decero.fase3'] },
  { test: /\/(de-cero-a-cien-fases\/)?fase[-_]4[-_]de0a100\//i, required: ['decero.fase4'] },
  { test: /\/(de-cero-a-cien-fases\/)?fase[-_]5[-_]de0a100\//i, required: ['decero.fase5'] },
  ];

  function parseQuery() {
    try {
      const q = new URLSearchParams(w.location.search || '');
      const map = {};
      q.forEach((v, k) => map[k] = v);
      return map;
    } catch { return {}; }
  }

  w.grantFromURLParams = async function grantFromURLParams() {
    const q = parseQuery();
    // Ejemplos soportados: ?grant=course.pmv | ?entitlement=membership.pro | ?grants=course.pmv,course.pmf
    const grants = q.grant || q.entitlement || q.grants;
    if (!grants) return;
    const list = String(grants).split(/[\s,]+/).filter(Boolean);
    if (!list.length) return;

    const hasSignature = !!(q.sig && q.t);
    const isDev = !!(w.Environment && w.Environment.isDevelopment);

    async function applyGrant(ids) {
      const cur = new Set((w.entitlements && w.entitlements.getAll && w.entitlements.getAll()) || []);
      ids.forEach(id => cur.add(String(id)));
      try { localStorage.setItem('deceroacien_entitlements', JSON.stringify(Array.from(cur))); } catch {}
      try { localStorage.setItem('deceroacien_entitlements_updated', Date.now().toString()); } catch {}
      if (w.applyEntitlementsGating) w.applyEntitlementsGating();
      // Limpiar la URL
      try {
        const url = new URL(w.location.href);
        ['grant','grants','entitlement','sig','t','ref'].forEach(k => url.searchParams.delete(k));
        history.replaceState({}, '', url.toString());
      } catch {}
    }

    if (hasSignature && !isDev) {
      try {
  const qs = new URLSearchParams({ grant: list[0], t: q.t, ref: q.ref || '', sig: q.sig }).toString();
  const api = (w.PublicAuthConfig && w.PublicAuthConfig.api) || {};
  const endpoint = (api.baseUrl ? (api.baseUrl + '/mp/verify-grant') : '/api/mp/verify-grant');
  const resp = await fetch(`${endpoint}?${qs}`);
        const data = await resp.json();
        if (data && data.ok) {
          await applyGrant(list);
        } else {
          console.warn('Grant ignorado: firma inválida o expirada');
        }
      } catch (e) {
        console.warn('No se pudo verificar firma del grant');
      }
    } else {
      // Desarrollo: permitir grants manuales por URL
      await applyGrant(list);
    }
  };

  w.applyPathAutoGuard = function applyPathAutoGuard() {
    const path = (w.location && w.location.pathname) || '';
    const rule = PATH_GUARD.find(r => r.test.test(path));
    if (!rule) return; // ruta libre
    const hasAccess = (w.entitlements && w.entitlements.hasAll && w.entitlements.hasAll(rule.required));
    if (hasAccess) return;

    // Bloquear con overlay de CTA sin eliminar el DOM original
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '9999';
    overlay.style.backdropFilter = 'blur(3px)';
    overlay.className = 'bg-slate-900/90 flex items-center justify-center p-6';

    const cta = (function () {
      // Reutiliza el generador de CTA por defecto tomando el primer id requerido
      const fake = document.createElement('div');
      const id = rule.required[0];
      const isLogged = !!(w.authManager && w.authManager.isUserAuthenticated && w.authManager.isUserAuthenticated());
      const node = (typeof buildDefaultCTA === 'function')
        ? buildDefaultCTA(fake, [id], isLogged)
        : (function () {
            const d = document.createElement('div');
            d.className = 'bg-slate-800/60 border border-gray-700 rounded-lg p-6 text-center';
            d.innerHTML = '<p class="text-sm text-gray-300">Contenido disponible para alumnos con acceso activo.</p>';
            return d;
          })();
      const wrapper = document.createElement('div');
      wrapper.className = 'max-w-md w-full';
      wrapper.appendChild(node);
      return wrapper;
    })();

    overlay.appendChild(cta);
    document.body.appendChild(overlay);
  };

  // Inicializar después de que todas las funciones estén definidas
  setTimeout(function() {
    // Otorgar entitlements por query string (retorno de checkout)
    try {
      if (typeof w.grantFromURLParams === 'function') {
        w.grantFromURLParams();
      }
    } catch(_) {}
  }, 50);
})(window);
