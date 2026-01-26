document.addEventListener('DOMContentLoaded',()=>{
 if(!document.body.classList.contains('dashboard-metricas-salud')) return;
 const kpiNameInput=document.getElementById('kpi-name');
 const currentValueInput=document.getElementById('current-value');
 const targetValueInput=document.getElementById('target-value');
 const addKpiBtn=document.getElementById('add-kpi-btn');
 const kpiGrid=document.getElementById('kpi-grid');
 let kpis=[]; const currency=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:0});
 addKpiBtn.addEventListener('click', addKpi);
 function addKpi(){
  const name=kpiNameInput.value.trim();
  const current=parseFloat(currentValueInput.value);
  const target=parseFloat(targetValueInput.value);
  if(!name||isNaN(current)||isNaN(target)||target<=0){alert('Completa todos los campos con valores válidos.');return;}
  kpis.push({id:Date.now(),name,current,target});
  render(); clear();
 }
 function render(){
  kpiGrid.innerHTML='';
  kpis.forEach(k=>{
    const progress=Math.min((k.current/k.target)*100,100);
    const card=document.createElement('div'); card.className='kpi-card'; card.dataset.id=k.id;
    card.innerHTML=`<button class="delete-kpi-btn" title="Eliminar KPI">&times;</button>
    <h4>${escapeHTML(k.name)}</h4>
    <div class="kpi-values"><span>Actual: <strong>${currency.format(k.current)}</strong></span><span>Objetivo: <strong>${currency.format(k.target)}</strong></span></div>
    <div class="progress-bar-container"><div class="progress-bar" style="width:${progress}%" title="${progress.toFixed(1)}%"></div></div>`;
    kpiGrid.appendChild(card);
  });
  kpiGrid.querySelectorAll('.delete-kpi-btn').forEach(btn=>btn.addEventListener('click', e=>{const id=parseInt(e.target.closest('.kpi-card').dataset.id); kpis=kpis.filter(x=>x.id!==id); render();}));
 }
 function clear(){ kpiNameInput.value=''; currentValueInput.value=''; targetValueInput.value=''; kpiNameInput.focus(); }
 function escapeHTML(str){const p=document.createElement('p'); p.textContent=str; return p.innerHTML;}
});