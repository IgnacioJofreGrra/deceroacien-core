document.addEventListener('DOMContentLoaded', () => {
  const factorNameInput = document.getElementById('factor-name');
  if(!factorNameInput) return; // no es esta página
  const impactSlider = document.getElementById('impact-level');
  const probabilitySlider = document.getElementById('probability-level');
  const impactValue = document.getElementById('impact-value');
  const probabilityValue = document.getElementById('probability-value');
  const addBtn = document.getElementById('add-factor-btn');
  const riskMap = document.getElementById('risk-map');

  impactSlider.addEventListener('input', () => impactValue.textContent = impactSlider.value);
  probabilitySlider.addEventListener('input', () => probabilityValue.textContent = probabilitySlider.value);
  addBtn.addEventListener('click', addFactor);

  function addFactor(){
    const name = factorNameInput.value.trim();
    if(!name){ alert('Por favor, describe el factor o tendencia.'); return; }
    const impact = parseInt(impactSlider.value,10);
    const probability = parseInt(probabilitySlider.value,10);
    const dot = document.createElement('div');
    dot.className='factor-dot';
    dot.dataset.title = escapeHTML(name);
    dot.style.left = `${((probability - 1) / 9) * 100}%`;
    dot.style.bottom = `${((impact + 10) / 20) * 100}%`;
    dot.style.backgroundColor = impact >= 0 ? 'var(--color-opportunity)' : 'var(--color-threat)';
    riskMap.appendChild(dot);
    clearForm();
  }

  function clearForm(){
    factorNameInput.value='';
    impactSlider.value=0;
    probabilitySlider.value=5;
    impactValue.textContent='0';
    probabilityValue.textContent='5';
    factorNameInput.focus();
  }

  function escapeHTML(str){ const p=document.createElement('p'); p.textContent=str; return p.innerHTML; }
});
