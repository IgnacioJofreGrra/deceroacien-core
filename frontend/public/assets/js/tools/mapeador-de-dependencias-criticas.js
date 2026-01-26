document.addEventListener('DOMContentLoaded', () => {
  if(!document.body.classList.contains('mapeador-de-dependencias-criticas')) return;
  const activityNameInput = document.getElementById('activity-name');
  const dependencyNameInput = document.getElementById('dependency-name');
  const dependencyTypeSelect = document.getElementById('dependency-type');
  const addDependencyBtn = document.getElementById('add-dependency-btn');
  const dependencyMap = document.getElementById('dependency-map');

  let activities = {};

  addDependencyBtn?.addEventListener('click', addDependency);

  function addDependency() {
    const activityName = activityNameInput.value.trim();
    const dependencyName = dependencyNameInput.value.trim();
    const dependencyType = dependencyTypeSelect.value;

    if (!activityName || !dependencyName) {
      alert('Por favor, completa los campos de actividad y dependencia.');
      return;
    }

    if (!activities[activityName]) {
      activities[activityName] = [];
    }

    activities[activityName].push({ name: dependencyName, type: dependencyType });
    renderMap();
    dependencyNameInput.value = '';
    dependencyNameInput.focus();
  }

  function renderMap() {
    dependencyMap.innerHTML = '';
    for (const activityName in activities) {
      const card = document.createElement('div');
      card.className = 'activity-card';
      card.dataset.activity = activityName;

      let dependenciesHTML = '';
      activities[activityName].forEach(dep => {
        dependenciesHTML += `<span class="dependency-tag ${dep.type === 'internal' ? 'tag-internal' : 'tag-external'}">${escapeHTML(dep.name)}</span>`;
      });

      card.innerHTML = `
        <div class="activity-header">
          <h4>${escapeHTML(activityName)}</h4>
          <button class="delete-activity-btn" title="Eliminar Actividad">&times;</button>
        </div>
        <div class="dependencies-container">${dependenciesHTML}</div>
      `;
      dependencyMap.appendChild(card);
    }
    document.querySelectorAll('.delete-activity-btn').forEach(btn => {
      btn.addEventListener('click', deleteActivity);
    });
  }

  function deleteActivity(event) {
    const card = event.target.closest('.activity-card');
    const activityNameToDelete = card.dataset.activity;
    if (confirm(`¿Estás seguro de que quieres eliminar la actividad "${activityNameToDelete}" y todas sus dependencias?`)) {
      delete activities[activityNameToDelete];
      renderMap();
    }
  }

  function escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
  }
});
