// generador-sla.js
// Reconstrucción del generador de acuerdos SLA extraído de inline script truncado.
(function(){
  if(!document.body.classList.contains('generador-sla')) return;

  const titleInput = document.getElementById('sla-title');
  const scopeInput = document.getElementById('sla-scope');
  const clauseInput = document.getElementById('clause-text');
  const metricInput = document.getElementById('metric');
  const targetInput = document.getElementById('target');
  const penaltyInput = document.getElementById('penalty');
  const addBtn = document.getElementById('add-clause-btn');
  const clearBtn = document.getElementById('clear-clauses-btn');
  const clausesListEl = document.getElementById('clauses-list');
  const outputEl = document.getElementById('sla-output');

  let clauses = [];

  function sanitize(str){
    return (str||'').replace(/[<>]/g, c => ({'<':'&lt;','>':'&gt;'}[c]));
  }

  function renderClauses(){
    if(!clauses.length){
      clausesListEl.innerHTML = '<p class="empty-state">Aún no has agregado cláusulas.</p>';
    } else {
      const items = clauses.map((c,i)=>{
        return `<div class="clause-item">
          <div class="clause-main">
            <p class="clause-text">${sanitize(c.text)}</p>
            <p class="clause-meta">${c.metric ? 'Métrica: <strong>'+sanitize(c.metric)+'</strong> · ':''}${c.target ? 'Objetivo: <strong>'+sanitize(c.target)+'</strong> · ':''}${c.penalty ? 'Penalización: <strong>'+sanitize(c.penalty)+'</strong>' : ''}</p>
          </div>
          <div class="clause-actions"><button data-index="${i}" class="remove-btn" aria-label="Eliminar">✕</button></div>
        </div>`;
      }).join('');
      clausesListEl.innerHTML = `<div class="clauses-wrapper">${items}</div>`;
      clausesListEl.querySelectorAll('button.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index'), 10);
            clauses.splice(idx,1);
            renderClauses();
            renderOutput();
        });
      });
    }
    renderOutput();
  }

  function renderOutput(){
    const title = sanitize(titleInput.value.trim());
    const scope = sanitize(scopeInput.value.trim());
    const dateStr = new Date().toLocaleDateString('es-ES');
    if(!clauses.length && !title && !scope){
      outputEl.innerHTML = '';
      return;
    }
    const clausesMarkdown = clauses.map((c,i)=>{
      const bits = [];
      if(c.metric) bits.push(`Métrica: ${c.metric}`);
      if(c.target) bits.push(`Objetivo: ${c.target}`);
      if(c.penalty) bits.push(`Penalización: ${c.penalty}`);
      return `${i+1}. ${c.text}${bits.length ? ' ('+bits.join(' | ')+')' : ''}`;
    }).join('\n');

    outputEl.innerHTML = `
      <h3>Borrador del Acuerdo</h3>
      <div class="sla-doc">
        ${title ? `<h4>${title}</h4>`:''}
        ${scope ? `<p><strong>Alcance:</strong> ${scope}</p>`:''}
        ${clauses.length ? `<h5>Cláusulas</h5><pre class="clauses-pre">${sanitize(clausesMarkdown)}</pre>`:''}
        <p class="generated-date">Generado: ${dateStr}</p>
      </div>`;
  }

  function addClause(){
    const text = clauseInput.value.trim();
    if(!text){
      clauseInput.focus();
      return;
    }
    const metric = metricInput.value.trim();
    const target = targetInput.value.trim();
    const penalty = penaltyInput.value.trim();
    clauses.push({ text, metric, target, penalty });
    clauseInput.value = '';
    metricInput.value = '';
    targetInput.value = '';
    penaltyInput.value = '';
    renderClauses();
  }

  function clearAll(){
    if(!clauses.length) return;
    if(!confirm('¿Eliminar todas las cláusulas?')) return;
    clauses = [];
    renderClauses();
  }

  addBtn && addBtn.addEventListener('click', addClause);
  clearBtn && clearBtn.addEventListener('click', clearAll);
  clauseInput && clauseInput.addEventListener('keydown', e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); addClause(); }});
  [titleInput, scopeInput].forEach(el => el && el.addEventListener('input', renderOutput));

  renderClauses();
})();
