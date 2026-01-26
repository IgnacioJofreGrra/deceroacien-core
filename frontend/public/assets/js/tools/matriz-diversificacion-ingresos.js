document.addEventListener('DOMContentLoaded', () => {
  const initiativeNameInput = document.getElementById('initiative-name');
  if(!initiativeNameInput) return; // página no cargada
  const marketSlider = document.getElementById('market-attractiveness');
  const strengthSlider = document.getElementById('business-strength');
  const marketValue = document.getElementById('market-value');
  const strengthValue = document.getElementById('strength-value');
  const addBtn = document.getElementById('add-initiative-btn');
  const matrixContainer = document.getElementById('matrix-container');

  marketSlider.addEventListener('input', () => marketValue.textContent = marketSlider.value);
  strengthSlider.addEventListener('input', () => strengthValue.textContent = strengthSlider.value);
  addBtn.addEventListener('click', addInitiative);

  function initializeMatrix() {
    matrixContainer.innerHTML = '';
    for (let y = 3; y >= 1; y--) {
      for (let x = 1; x <= 3; x++) {
        const cell = document.createElement('div');
        cell.className = 'matrix-cell';
        cell.dataset.x = x;
        cell.dataset.y = y;
        const invertedX = 4 - x; // invertimos eje X para la lógica estratégica
        if ((y === 3 && invertedX < 3) || (y === 2 && invertedX === 1)) {
          cell.style.backgroundColor = 'rgba(39, 174, 96, 0.2)'; // Invest
        } else if ((y === 3 && invertedX === 3) || (y === 2 && invertedX === 2) || (y === 1 && invertedX === 1)) {
          cell.style.backgroundColor = 'rgba(243, 156, 18, 0.2)'; // Selective
        } else {
          cell.style.backgroundColor = 'rgba(192, 57, 43, 0.2)'; // Divest
        }
        matrixContainer.appendChild(cell);
      }
    }
  }

  function addInitiative() {
    const name = initiativeNameInput.value.trim();
    if (!name) {
      alert('Por favor, introduce un nombre para la iniciativa.');
      return;
    }
    const marketScore = parseInt(marketSlider.value,10);
    const strengthScore = parseInt(strengthSlider.value,10);
    const getCoord = (score) => score > 6.6 ? 3 : (score > 3.3 ? 2 : 1);
    const y = getCoord(marketScore);
    const x = getCoord(strengthScore);
    const invertedX = 4 - x;
    const targetCell = document.querySelector(`.matrix-cell[data-x='${invertedX}'][data-y='${y}']`);
    if (targetCell) {
      const dot = document.createElement('div');
      dot.className = 'initiative-dot';
      dot.textContent = escapeHTML(name);
      dot.title = `Atractivo: ${marketScore}/10, Fortaleza: ${strengthScore}/10`;
      targetCell.appendChild(dot);
    }
    clearForm();
  }

  function clearForm() {
    initiativeNameInput.value = '';
    marketSlider.value = 5;
    strengthSlider.value = 5;
    marketValue.textContent = '5';
    strengthValue.textContent = '5';
    initiativeNameInput.focus();
  }

  function escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
  }

  initializeMatrix();
});
