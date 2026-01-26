document.addEventListener('DOMContentLoaded', () => {
  if (!document.body.classList.contains('optimizador-procesos-clave')) return;
  const processNameInput = document.getElementById('process-name');
  const impactSlider = document.getElementById('impact');
  const frequencySlider = document.getElementById('frequency');
  const complexitySlider = document.getElementById('complexity');
  const impactValue = document.getElementById('impact-value');
  const frequencyValue = document.getElementById('frequency-value');
  const complexityValue = document.getElementById('complexity-value');
  const addProcessBtn = document.getElementById('add-process-btn');
  const processTableBody = document.querySelector('#process-table tbody');
  const clearBtn = document.getElementById('clear-btn');
  let processes = [];

  const syncValue = (slider, out) => slider.addEventListener('input', () => out.textContent = slider.value);
  syncValue(impactSlider, impactValue);
  syncValue(frequencySlider, frequencyValue);
  syncValue(complexitySlider, complexityValue);

  function addProcess() {
    const name = processNameInput.value.trim();
    if (!name) { alert('Por favor, introduce un nombre para el proceso.'); return; }
    const impact = parseInt(impactSlider.value);
    const frequency = parseInt(frequencySlider.value);
    const complexity = parseInt(complexitySlider.value) || 1;
    const priorityScore = ((impact * frequency) / complexity).toFixed(2);
    processes.push({ id: Date.now(), name, score: parseFloat(priorityScore) });
    renderTable();
    processNameInput.value=''; ['impact','frequency','complexity'].forEach(id=>{ const el=document.getElementById(id); el.value=5; document.getElementById(id+'-value').textContent='5'; });
    processNameInput.focus();
  }

  addProcessBtn.addEventListener('click', addProcess);
  processNameInput.addEventListener('keypress', e => { if (e.key === 'Enter') addProcess(); });
  clearBtn.addEventListener('click', () => { if(confirm('¿Borrar todos los procesos?')) { processes=[]; renderTable(); }});

  function renderTable() {
    processes.sort((a,b)=> b.score - a.score);
    processTableBody.innerHTML = '';
    if (processes.length) {
      processes.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${escapeHTML(p.name)}</td><td class="priority-score">${p.score}</td><td><button class="delete-btn" data-id="${p.id}">X</button></td>`;
        processTableBody.appendChild(tr);
      });
      clearBtn.style.display='block';
    } else {
      clearBtn.style.display='none';
    }
    processTableBody.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', e => { const id=parseInt(e.target.dataset.id); processes = processes.filter(x=>x.id!==id); renderTable(); }));
  }

  function escapeHTML(str){ const p=document.createElement('p'); p.textContent=str; return p.innerHTML; }
});