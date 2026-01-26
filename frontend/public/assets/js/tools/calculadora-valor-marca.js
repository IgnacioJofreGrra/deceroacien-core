document.addEventListener('DOMContentLoaded', () => {
  const calculateBtn = document.getElementById('calculate-btn');
  if(!calculateBtn) return;

  const sync = (id, out, suffix='') => {
    const el = document.getElementById(id); const target = document.getElementById(out); if(!el||!target) return; el.addEventListener('input', e=> target.textContent = e.target.value + suffix);
  };
  sync('brand-contribution','contribution-value','%');
  sync('score-leadership','leadership-value');
  sync('score-loyalty','loyalty-value');
  sync('score-support','support-value');

  calculateBtn.addEventListener('click', () => {
    const annualRevenue = parseFloat(document.getElementById('annual-revenue').value);
    const profitMargin = parseFloat(document.getElementById('profit-margin').value) / 100;
    const brandContribution = parseFloat(document.getElementById('brand-contribution').value) / 100;
    const leadership = parseInt(document.getElementById('score-leadership').value);
    const loyalty = parseInt(document.getElementById('score-loyalty').value);
    const support = parseInt(document.getElementById('score-support').value);
    if (isNaN(annualRevenue) || isNaN(profitMargin) || isNaN(brandContribution)) {
      alert('Por favor, introduce valores numéricos válidos en los campos financieros.');
      return;
    }
    const brandRevenue = annualRevenue * brandContribution;
    const brandEarnings = brandRevenue * profitMargin;
    const totalScore = (leadership + loyalty + support); // Max 30
    const bss = (totalScore / 30) * 100; // Score out of 100
    const multiplier = (bss / 100) * 20; // Up to 20x
    const brandValue = brandEarnings * multiplier;
    const currencyFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
    const resultsContainer = document.getElementById('results-container');
    resultsContainer.innerHTML = `
      <h4>Desglose de la Valoración</h4>
      <div class="result-item"><span class="result-label">Beneficios Atribuibles a la Marca:</span><span class="result-value">${currencyFormatter.format(brandEarnings)}</span></div>
      <div class="result-item"><span class="result-label">Puntuación de Fortaleza de Marca:</span><span class="result-value">${bss.toFixed(1)} / 100</span></div>
      <div class="result-item"><span class="result-label">Multiplicador de Fortaleza:</span><span class="result-value">${multiplier.toFixed(1)}x</span></div>
      <div class="total-value"><span class="result-label">Valor Estimado de la Marca</span><span class="result-value">${currencyFormatter.format(brandValue)}</span></div>`;
    resultsContainer.style.display = 'block';
  });
});