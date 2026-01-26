// simulador-puntos-falla.js
// Extraído desde inline script original. Gestiona lista de riesgos, severidad y orden.
(function() {
  if (!document.body.classList.contains('simulador-puntos-falla')) return;

  const nameInput = document.getElementById('risk-name');
  const probInput = document.getElementById('probability');
  const impactInput = document.getElementById('impact');
  const probValue = document.getElementById('probability-value');
  const impactValue = document.getElementById('impact-value');
  const addBtn = document.getElementById('add-risk-btn');
  const listEl = document.getElementById('risk-list');

  let risks = [];

  function severityColor(score) {
    if (score >= 81) return 'critical';
    if (score >= 61) return 'high';
    if (score >= 41) return 'medium';
    return 'low';
  }

  function updateSliderValue(slider, display) {
    display.textContent = slider.value;
  }

  function render() {
    if (!listEl) return;
    if (!risks.length) {
      listEl.innerHTML = '<p class="empty-state">Aún no has agregado puntos de falla.</p>';
      return;
    }
    const rows = risks.map((r, idx) => {
      return `<div class="risk-card ${severityColor(r.score)}">
        <div class="risk-main">
          <h4>${r.name}</h4>
          <p class="meta">Prob: ${r.probability} · Impacto: ${r.impact} · Score: <strong>${r.score}</strong></p>
        </div>
        <div class="risk-actions">
          <span class="badge severity">${r.severityLabel}</span>
          <button data-index="${idx}" class="remove-btn" aria-label="Eliminar">✕</button>
        </div>
      </div>`;
    }).join('');
    listEl.innerHTML = `<div class="risk-grid">${rows}</div>`;
    listEl.querySelectorAll('button.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.getAttribute('data-index'), 10);
        risks.splice(i, 1);
        render();
      });
    });
  }

  function addRisk() {
    const name = (nameInput.value || '').trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    const probability = parseInt(probInput.value, 10) || 1;
    const impact = parseInt(impactInput.value, 10) || 1;
    const score = probability * impact;
    let severityLabel;
    const col = severityColor(score);
    switch(col) {
      case 'critical': severityLabel = 'Crítico'; break;
      case 'high': severityLabel = 'Alto'; break;
      case 'medium': severityLabel = 'Medio'; break;
      default: severityLabel = 'Bajo';
    }
    risks.push({ name, probability, impact, score, severityLabel });
    // Orden descendente por score
    risks.sort((a,b) => b.score - a.score);
    nameInput.value = '';
    render();
  }

  probInput && probInput.addEventListener('input', () => updateSliderValue(probInput, probValue));
  impactInput && impactInput.addEventListener('input', () => updateSliderValue(impactInput, impactValue));
  addBtn && addBtn.addEventListener('click', addRisk);
  nameInput && nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addRisk(); });

  render();
})();
