document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = document.getElementById('analyze-btn');
  if(!analyzeBtn) return; // página distinta
  analyzeBtn.addEventListener('click', analyzeExpansion);

  function analyzeExpansion() {
    const marketSize = parseFloat(document.getElementById('market-size').value);
    const marketShare = parseFloat(document.getElementById('market-share').value) / 100;
    const setupCosts = parseFloat(document.getElementById('setup-costs').value);
    const monthlyCosts = parseFloat(document.getElementById('monthly-costs').value);
    const breakevenMonths = parseFloat(document.getElementById('breakeven-months').value);

    if ([marketSize, marketShare, setupCosts, monthlyCosts, breakevenMonths].some(v => isNaN(v))) {
      alert('Por favor, introduce valores numéricos válidos en todos los campos.');
      return;
    }

    const potentialRevenue = marketSize * marketShare;
    const totalInvestment = setupCosts + (monthlyCosts * breakevenMonths);
    const revenueToInvestmentRatio = potentialRevenue / totalInvestment;
    const currencyFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

    let verdictText = '';
    let verdictColor = '';
    if (revenueToInvestmentRatio > 1.5) {
      verdictText = 'Expansión Potencialmente Atractiva';
      verdictColor = 'var(--color-go)';
    } else if (revenueToInvestmentRatio > 0.8) {
      verdictText = 'Riesgo Elevado, Recompensa Moderada';
      verdictColor = 'var(--color-caution)';
    } else {
      verdictText = 'Reconsiderar Expansión: Alto Riesgo, Bajo Retorno';
      verdictColor = 'var(--color-stop)';
    }

    const resultsContainer = document.getElementById('results-container');
    resultsContainer.innerHTML = `
      <h4>Análisis de Expansión</h4>
      <div class="result-item"><span class="result-label">Potencial de Ingresos Anuales:</span><span class="result-value">${currencyFormatter.format(potentialRevenue)}</span></div>
      <div class="result-item"><span class="result-label">Inversión Total Estimada (hasta B/E):</span><span class="result-value">${currencyFormatter.format(totalInvestment)}</span></div>
      <div class="result-item"><span class="result-label">Meses hasta Punto de Equilibrio:</span><span class="result-value">${breakevenMonths} meses</span></div>
      <div id="verdict-card" style="background-color: ${verdictColor}; color: white;">${verdictText}</div>`;
    resultsContainer.style.display = 'block';
  }
});
