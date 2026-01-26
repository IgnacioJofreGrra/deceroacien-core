document.addEventListener('DOMContentLoaded', () => {
  const roleInput = document.getElementById('critical-role');
  if(!roleInput) return; // otra página
  const candidateInput = document.getElementById('candidate-name');
  const readinessSlider = document.getElementById('readiness-level');
  const readinessValue = document.getElementById('readiness-value');
  const gapsInput = document.getElementById('skill-gaps');
  const planInput = document.getElementById('dev-plan');
  const addBtn = document.getElementById('add-plan-btn');
  const successionMap = document.getElementById('succession-map');

  readinessSlider.addEventListener('input', () => readinessValue.textContent = readinessSlider.value);
  addBtn.addEventListener('click', addPlan);

  function addPlan() {
    const role = roleInput.value.trim();
    const candidate = candidateInput.value.trim();
    const readiness = parseInt(readinessSlider.value,10);
    const gaps = gapsInput.value.trim().split(',').map(s => s.trim()).filter(Boolean);
    const plan = planInput.value.trim().split(',').map(s => s.trim()).filter(Boolean);

    if (!role || !candidate || gaps.length === 0 || plan.length === 0) {
      alert('Por favor, completa todos los campos del plan.');
      return;
    }

    let readinessColor = 'var(--color-early)';
    if (readiness > 7) readinessColor = 'var(--color-ready)';
    else if (readiness > 4) readinessColor = 'var(--color-developing)';

    const card = document.createElement('div');
    card.className = 'plan-card';
    card.style.borderLeftColor = readinessColor;

    const gapsHTML = '<ul>' + gaps.map(g => `<li>${escapeHTML(g)}</li>`).join('') + '</ul>';
    const planHTML = '<ul>' + plan.map(p => `<li>${escapeHTML(p)}</li>`).join('') + '</ul>';

    card.innerHTML = `
      <h4>${escapeHTML(role)} ➞ ${escapeHTML(candidate)}</h4>
      <p><strong>Nivel de Preparación: ${readiness}/10</strong></p>
      <div class="readiness-bar-container"><div class="readiness-bar" style="width:${readiness * 10}%; background-color:${readinessColor};"></div></div>
      <strong>Brechas de Competencias:</strong>${gapsHTML}
      <strong>Plan de Desarrollo:</strong>${planHTML}`;

    successionMap.prepend(card);
    clearForm();
  }

  function clearForm() {
    roleInput.value = '';
    candidateInput.value = '';
    readinessSlider.value = 5;
    readinessValue.textContent = '5';
    gapsInput.value = '';
    planInput.value = '';
    roleInput.focus();
  }

  function escapeHTML(str){ const p=document.createElement('p'); p.textContent=str; return p.innerHTML; }
});
