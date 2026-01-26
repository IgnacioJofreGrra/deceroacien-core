/**
 * Gating Auditor (cliente)
 * Objetivo: detectar inconsistencias en páginas con contenido protegido.
 *
 * Capacidades:
 *  - Auditoría de la página actual (estructura de data-entitlement, bloques granted/denied, orden de scripts).
 *  - Auditoría profunda opcional: recorre index de fases, extrae enlaces internos y audita cada HTML.
 *  - Reporte agregado + listado de issues por URL.
 *  - Atajo: Shift + G abre auditor rápido sobre la página actual.
 *
 * Uso rápido en consola:
 *   GatingAuditor.auditCurrent();            // Audita documento actual
 *   GatingAuditor.runDeep();                // Intenta auditar todas las fases conocidas
 *   GatingAuditor.runDeep({ verbose: true });// Modo detallado
 */
(function (w) {
  if (w.GatingAuditor) return; // evitar doble inclusión

  const PROTECTED_PATTERNS = [
    /\/camino-dorado-fases\/fase-[1-5]-ecd\/(?!index\.html).+\.html/i,
    // De Cero a Cien (canónico con guiones y legacy con guion bajo)
    /\/(?:de-cero-a-cien-fases\/)?fase-[1-5]-de0a100\/(?!index\.html).+\.html/i,
    /\/(?:de-cero-a-cien-fases\/)?fase_[1-5]_de0a100\/(?!index\.html).+\.html/i
  ];

  // Index pages (desde aquí se intentará descubrir herramientas enlazadas)
  const PHASE_INDEX_PAGES = [
    '/camino-dorado-fases/fase-1-ecd/index.html',
    '/camino-dorado-fases/fase-2-ecd/index.html',
    '/camino-dorado-fases/fase-3-ecd/index.html',
    '/camino-dorado-fases/fase-4-ecd/index.html',
    '/camino-dorado-fases/fase-5-ecd/index.html',
    // Canónico
    '/de-cero-a-cien-fases/fase-1-de0a100/index.html',
    '/de-cero-a-cien-fases/fase-2-de0a100/index.html',
    '/de-cero-a-cien-fases/fase-3-de0a100/index.html',
    '/de-cero-a-cien-fases/fase-4-de0a100/index.html',
    '/de-cero-a-cien-fases/fase-5-de0a100/index.html',
    // Legacy (mientras existan)
    '/de-cero-a-cien-fases/fase_1_de0a100/index.html',
    '/de-cero-a-cien-fases/fase_2_de0a100/index.html',
    '/de-cero-a-cien-fases/fase_3_de0a100/index.html',
    '/de-cero-a-cien-fases/fase_4_de0a100/index.html',
    '/de-cero-a-cien-fases/fase_5_de0a100/index.html'
  ];

  function isLikelyProtectedPath(path) {
    return PROTECTED_PATTERNS.some(r => r.test(path));
  }

  function collectScriptOrder(doc) {
    const scripts = Array.from(doc.querySelectorAll('script[src]'))
      .map(s => ({ src: s.getAttribute('src'), el: s }));
    const idxComponents = scripts.findIndex(s => /components\.js($|\?)/.test(s.src || ''));
    const idxEntitlements = scripts.findIndex(s => /entitlements\.js($|\?)/.test(s.src || ''));
    return { scripts, idxComponents, idxEntitlements };
  }

  function auditDocument(doc, url) {
    const issues = [];
    const path = (function(){ try { return new URL(url, location.origin).pathname; } catch { return url || location.pathname; } })();
    const protectedExpected = isLikelyProtectedPath(path);

    // 1. Estructura de gating
    const gatingBlocks = Array.from(doc.querySelectorAll('[data-entitlement],[data-entitlement-any],[data-entitlement-all]'));
    if (protectedExpected && gatingBlocks.length === 0) {
      issues.push('Página parece protegida pero no se encontró ningún bloque con data-entitlement.');
    }

    gatingBlocks.forEach((block, i) => {
      const hasGranted = !!block.querySelector('[data-when="granted"]');
      const hasDenied = !!block.querySelector('[data-when="denied"]');
      if (!hasGranted) issues.push(`Bloque #${i+1} (${extractIds(block)}) sin sub-bloque [data-when="granted"]`);
      if (!hasDenied) issues.push(`Bloque #${i+1} (${extractIds(block)}) sin sub-bloque [data-when="denied"] (placeholder vacío recomendado).`);
      // Heurística: wrapper principal debería ser <main data-entitlement> en herramientas
      if (i === 0 && protectedExpected && block.tagName.toLowerCase() !== 'main') {
        issues.push('Primer bloque de gating no es <main>; se recomienda para consistencia.');
      }
    });

    // 2. Orden de scripts
    const { idxComponents, idxEntitlements } = collectScriptOrder(doc);
    if (idxComponents === -1) issues.push('No se incluyó components.js (debe ir antes de entitlements.js).');
    if (idxEntitlements === -1) issues.push('No se incluyó entitlements.js.');
    if (idxComponents !== -1 && idxEntitlements !== -1 && idxEntitlements < idxComponents) {
      issues.push(`Orden de scripts incorrecto: entitlements.js (index ${idxEntitlements}) cargado antes que components.js (index ${idxComponents}).`);
    }

    // 3. Detección de badges derivados duplicados
    const derivedBadges = doc.querySelectorAll('.entitlement-derived-badge');
    if (derivedBadges.length > gatingBlocks.length) {
      issues.push('Cantidad de badges "Incluido por compra completa" mayor que bloques de gating (posible duplicación).');
    }

    return {
      url,
      path,
      protectedExpected,
      gatingBlocks: gatingBlocks.length,
      issues,
      ok: issues.length === 0
    };
  }

  function extractIds(block){
    const a = block.getAttribute('data-entitlement') || '';
    const b = block.getAttribute('data-entitlement-any') || '';
    const c = block.getAttribute('data-entitlement-all') || '';
    return (a||b||c||'').trim();
  }

  // Auditoría del documento actual
  function auditCurrent() {
    const res = auditDocument(document, location.href);
    reportResults([res], { context: 'current' });
    return res;
  }

  function reportResults(results, { context = 'batch' } = {}) {
    const total = results.length;
    const issues = results.reduce((acc,r)=>acc + r.issues.length, 0);
    const failing = results.filter(r=>!r.ok).length;
    const ok = total - failing;
    console.group(`Gating Auditor (${context}) ▶ páginas: ${total} | OK: ${ok} | Con issues: ${failing} | Issues totales: ${issues}`);
    results.forEach(r => {
      if (r.ok) {
        console.log('✔', r.path, `(bloques: ${r.gatingBlocks})`);
      } else {
        console.groupCollapsed('✖ ' + r.path + ` (bloques: ${r.gatingBlocks})`);
        r.issues.forEach(i => console.warn(' -', i));
        console.groupEnd();
      }
    });
    console.groupEnd();
  }

  async function fetchText(url){
    try { const resp = await fetch(url, { cache: 'no-store' }); if(!resp.ok) throw new Error(resp.status); return await resp.text(); } catch(e){ return null; }
  }

  async function discoverToolsFromIndex(indexUrl){
    const html = await fetchText(indexUrl);
    if(!html) return [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const basePath = (new URL(indexUrl, location.origin)).pathname.replace(/index\.html$/,'');
      const links = Array.from(doc.querySelectorAll('a[href]'))
        .map(a => a.getAttribute('href'))
        .filter(h => h && !h.startsWith('http') && !h.startsWith('#'))
        .map(h => new URL(h, indexUrl).pathname)
        .filter(p => p.startsWith(basePath) && p !== indexUrl && /\.html$/i.test(p) && !/index\.html$/i.test(p));
      return Array.from(new Set(links));
    } catch { return []; }
  }

  async function runDeep({ verbose = false } = {}) {
    const results = [];
    const allPages = new Set();
    // 1. añadir página actual si protegida
    allPages.add(location.pathname);
    // 2. Descubrir páginas desde cada index
    for (const idx of PHASE_INDEX_PAGES) {
      const tools = await discoverToolsFromIndex(idx);
      tools.forEach(t => allPages.add(t));
      if (verbose) console.info('[auditor] Descubiertas', tools.length, 'páginas desde', idx);
    }
    // 3. Auditar cada página
    for (const p of Array.from(allPages)) {
      const html = await fetchText(p);
      if(!html){
        results.push({ url: p, path: p, protectedExpected: isLikelyProtectedPath(p), gatingBlocks: 0, issues: ['No se pudo obtener el HTML (fetch falló)'], ok: false });
        continue;
      }
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const res = auditDocument(doc, p);
      results.push(res);
    }
    reportResults(results, { context: 'deep' });
    return results;
  }

  w.GatingAuditor = { auditCurrent, runDeep };

  // Atajo de teclado: Shift + G
  document.addEventListener('keydown', e => {
    if (e.shiftKey && e.key.toLowerCase() === 'g') {
      auditCurrent();
    }
  });

  // Auto-aviso en consola (no intrusivo)
  setTimeout(() => {
    if (!w.__GATING_AUDITOR_BANNER) {
      w.__GATING_AUDITOR_BANNER = true;
      console.info('%cGatingAuditor listo','background:#1e293b;color:#fff;padding:2px 6px;border-radius:4px','Usa GatingAuditor.auditCurrent() o GatingAuditor.runDeep()');
    }
  }, 1200);

})(window);
