document.addEventListener('DOMContentLoaded', () => {
  if(!document.body.classList.contains('calculadora-coste-ineficiencia')) return;
  const employeesInput = document.getElementById('employees-affected');
  const hoursInput = document.getElementById('hours-lost');
  const costInput = document.getElementById('hourly-cost');
  const calculateBtn = document.getElementById('calculate-btn');
  const resultsContainer = document.getElementById('results-container');
  const weeklyCostEl = document.getElementById('weekly-cost');
  const monthlyCostEl = document.getElementById('monthly-cost');
  const annualCostEl = document.getElementById('annual-cost');
  const fmt = new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'});

  calculateBtn.addEventListener('click', () => {
    const employees = parseFloat(employeesInput.value);
    const hours = parseFloat(hoursInput.value);
    const cost = parseFloat(costInput.value);
    if([employees,hours,cost].some(v=>isNaN(v)) || employees<=0 || hours<0 || cost<=0){
      alert('Por favor, introduce valores numéricos válidos y positivos en todos los campos.');
      return;
    }
    const weekly = employees * hours * cost;
    const monthly = weekly * 4.33;
    const annual = monthly * 12;
    weeklyCostEl.textContent = fmt.format(weekly);
    monthlyCostEl.textContent = fmt.format(monthly);
    annualCostEl.textContent = fmt.format(annual);
    resultsContainer.style.display = 'block';
  });
});