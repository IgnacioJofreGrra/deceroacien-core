document.addEventListener('DOMContentLoaded', () => {
  const designBtn = document.getElementById('design-btn');
  if(!designBtn) return;
  designBtn.addEventListener('click', () => {
    const segment = valueOf('target-segment');
    const mechanic = valueOf('program-mechanic');
    const rewardsText = valueOf('key-rewards');
    const kpi = valueOf('kpi-name');
    if(!segment || !rewardsText || !kpi){ alert('Por favor, completa todos los campos para diseñar el programa.'); return; }
    const rewards = rewardsText.split(',').map(r=>r.trim()).filter(Boolean);
    const rewardsHTML = '<ul>' + rewards.map(r=> `<li>${escapeHTML(r)}</li>`).join('') + '</ul>';
    const summaryContainer = document.getElementById('program-summary');
    summaryContainer.innerHTML = `<div class="summary-card"><h4>Borrador: Programa de Lealtad "${escapeHTML(segment)}"</h4><p><strong>Mecánica Principal:</strong> ${escapeHTML(mechanic)}</p><p><strong>Recompensas Ofrecidas:</strong></p>${rewardsHTML}<p><strong>Objetivo Estratégico Primario:</strong></p><p>Incrementar la métrica de <strong>${escapeHTML(kpi)}</strong>.</p></div>`;
    summaryContainer.style.display='block';
  });
  function valueOf(id){ const el=document.getElementById(id); return el?el.value.trim():''; }
  function escapeHTML(str){ const p=document.createElement('p'); p.textContent=str; return p.innerHTML; }
});