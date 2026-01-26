document.addEventListener('DOMContentLoaded', () => {
  const missionInput = document.getElementById('company-mission');
  if(!missionInput) return;
  const categorySelect = document.getElementById('initiative-category');
  const nameInput = document.getElementById('initiative-name');
  const descInput = document.getElementById('initiative-desc');
  const addBtn = document.getElementById('add-initiative-btn');
  const reportPreview = document.getElementById('report-preview');
  const reportMission = document.getElementById('report-mission');
  const reportContent = document.getElementById('report-content');

  let reportData = { e:[], s:[], g:[] };
  addBtn.addEventListener('click', addInitiative);

  function addInitiative(){
    const mission = missionInput.value.trim();
    if(!mission){ alert('Por favor, define primero la misión de la empresa.'); return; }
    const category = categorySelect.value;
    const name = nameInput.value.trim();
    const desc = descInput.value.trim();
    if(!name || !desc){ alert('Por favor, completa los detalles de la iniciativa.'); return; }
    reportData[category].push({ name, desc });
    renderReport();
    clearForm();
  }

  function renderReport(){
    reportPreview.style.display='block';
    reportMission.innerHTML = `<strong>Nuestra Misión:</strong> <em>${escapeHTML(missionInput.value.trim())}</em>`;
    const sections = [
      { key:'e', title:'Impacto Ambiental', cls:'e' },
      { key:'s', title:'Impacto Social', cls:'s' },
      { key:'g', title:'Gobernanza y Ética', cls:'g' }
    ];
    let contentHTML='';
    sections.forEach(sec => {
      if(reportData[sec.key].length){
        contentHTML += `<div class="report-section"><h4 class="${sec.cls}">${sec.title}</h4>`;
        reportData[sec.key].forEach(item => {
          contentHTML += `<div class=\"initiative-item\"><strong>${escapeHTML(item.name)}:</strong><p>${escapeHTML(item.desc)}</p></div>`;
        });
        contentHTML += '</div>';
      }
    });
    reportContent.innerHTML = contentHTML;
  }

  function clearForm(){
    nameInput.value='';
    descInput.value='';
    nameInput.focus();
  }

  function escapeHTML(str){ const p=document.createElement('p'); p.textContent=str; return p.innerHTML; }
});
