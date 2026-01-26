/* Tracking Demo (solo rama feature/full-access-demo)
 * Objetivo: registrar clics, navegaciones internas y eventos de progreso para diagnóstico local.
 * No envía datos a un servidor: persiste en localStorage y expone API.
 */
(function(){
  const STORAGE_KEY = 'deceroacien_tracking_events';
  const MAX_EVENTS = 500; // evitar crecimiento infinito

  function now(){ return new Date().toISOString(); }
  function load(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch(_){ return []; } }
  function save(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-MAX_EVENTS))); }

  function record(type, detail){
    const list = load();
    list.push({ ts: now(), type, detail });
    save(list);
    window.dispatchEvent(new CustomEvent('tracking:event', { detail: { type, detail } }));
  }

  function onClick(e){
    const a = e.target.closest('a, button');
    if(!a) return;
    record('click', {
      tag: a.tagName,
      text: (a.innerText||'').trim().slice(0,120),
      href: a.getAttribute('href') || null,
      classes: a.className || ''
    });
  }

  function hookNavigation(){
    // Captura cambios de hash y pushState
    const origPush = history.pushState;
    history.pushState = function(state, title, url){
      record('nav.pushState', { url: url+'' });
      return origPush.apply(this, arguments);
    };
    window.addEventListener('hashchange', ()=>record('nav.hashchange', { hash: location.hash }));
  }

  function hookProgress(){
    window.addEventListener('progress:updated', (ev)=>{
      record('progress.updated', { snapshot: ev.detail && ev.detail.state ? summarize(ev.detail.state) : null });
    });
  }

  function summarize(state){
    // Reducir tamaño: solo porcentajes
    function pct(obj){ return obj.total ? Math.round((obj.completed/obj.total)*100) : (obj===true?100:0); }
    return {
      fases: Object.fromEntries(Object.entries(state.fases||{}).map(([k,v])=>[k,pct(v)])),
      cursos: Object.fromEntries(Object.entries(state.cursos||{}).map(([k,v])=>[k,pct(v)])),
      herramientas: Object.fromEntries(Object.entries(state.herramientas||{}).map(([k,v])=>[k, v?100:0]))
    };
  }

  function installPanel(){
    if(document.getElementById('tracking-mini-panel')) return;
    const btn = document.createElement('button');
    btn.id = 'tracking-mini-panel';
    btn.textContent = '👁';
    btn.title = 'Ver tracking (Shift+T)';
    btn.style.position='fixed';btn.style.bottom='1rem';btn.style.right='1rem';btn.style.zIndex=9999;
    btn.className='w-10 h-10 rounded-full bg-slate-800/80 border border-slate-600 text-slate-200 hover:bg-slate-700 shadow';
    btn.onclick = openViewer;
    document.body.appendChild(btn);
    document.addEventListener('keydown', e=>{ if(e.shiftKey && e.key.toLowerCase()==='t'){ openViewer(); }});
  }

  function openViewer(){
    let panel = document.getElementById('tracking-viewer');
    if(panel) { panel.remove(); }
    panel = document.createElement('div');
    panel.id = 'tracking-viewer';
    panel.style.position='fixed';panel.style.top='4rem';panel.style.right='1rem';panel.style.width='380px';panel.style.maxHeight='70vh';panel.style.overflow='auto';panel.style.zIndex=9999;
    panel.className='bg-slate-900/95 backdrop-blur border border-slate-700 rounded-lg p-4 text-xs space-y-3 shadow-xl';
    const events = load();
    panel.innerHTML = `<div class="flex justify-between items-center mb-2"><strong>Tracking (${events.length})</strong><div class="flex gap-2"><button id="trkExport" class="px-2 py-1 bg-slate-700 rounded">Export</button><button id="trkClear" class="px-2 py-1 bg-slate-700 rounded">Clear</button><button id="trkClose" class="px-2 py-1 bg-slate-700 rounded">×</button></div></div><div id="trkBody" class="space-y-1 font-mono whitespace-pre-wrap"></div>`;
    document.body.appendChild(panel);
    const body = panel.querySelector('#trkBody');
    body.textContent = events.map(ev=>`${ev.ts} | ${ev.type} | ${JSON.stringify(ev.detail)}`).join('\n');
    panel.querySelector('#trkClose').onclick = ()=>panel.remove();
    panel.querySelector('#trkClear').onclick = ()=>{ save([]); openViewer(); };
    panel.querySelector('#trkExport').onclick = ()=>{
      const blob = new Blob([JSON.stringify(events,null,2)], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'tracking-events.json'; a.click();
      URL.revokeObjectURL(url);
    };
  }

  function bootstrap(){
    document.addEventListener('click', onClick, true);
    hookNavigation();
    hookProgress();
    installPanel();
    record('session.start', { url: location.href });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap); else bootstrap();

  // Exponer API mínima
  window.TrackingDemo = { record, getEvents: load, clear: ()=>save([]) };
})();
