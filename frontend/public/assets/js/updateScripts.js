// Inicializadores por página: detectan el DOM y montan la lógica específica
(function () {
  const GC = window.GameComponents || {};
  const domReady = GC.domReady || (cb => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb);
    } else {
      cb();
    }
  });
  const qs = GC.qs || ((sel, root = document) => root.querySelector(sel));
  const qsa = GC.qsa || ((sel, root = document) => Array.from(root.querySelectorAll(sel)));
  const formatCurrencyCL = GC.formatCurrencyCL || (value => {
    try { return '$' + Math.round(value).toLocaleString('es-CL'); }
    catch (e) { return '$' + Math.round(value || 0); }
  });
  const animateNumber = GC.animateNumber || ((element, start, end, { duration = 1000, suffix = '', decimals = 0 } = {}) => {
    if (!element) return;
    let startTs = null;
    const step = (ts) => {
      if (!startTs) startTs = ts;
      const p = Math.min((ts - startTs) / duration, 1);
      const cur = start + (end - start) * p;
      element.textContent = cur.toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  const pulse = GC.pulse || ((el, className = 'value-change') => {
    if (!el) return;
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  });

  domReady(() => {
    // 1) Dilema del PMV (layout con panel lateral y juego embebido)
    if (qs('#evaluate-mvp-btn') && qs('#features-area')) {
      const evaluateMvpBtn = qs('#evaluate-mvp-btn');
      const resultModal = qs('#result-modal');
      const resultTitle = qs('#result-title');
      const resultScore = qs('#result-score');
      const resultFeedback = qs('#result-feedback');
      const budgetEl = qs('#budget');
      const spentEl = qs('#spent');
      const remainingEl = qs('#remaining');
      const caseDescription = qs('#case-description');

      let totalBudget = 100000;
      let currentSpent = 0;

      const gameData = {
        case: "Startup de delivery de comida saludable 'HealthyFast'. Tu meta es lanzar un PMV que resuelva el problema central: personas ocupadas que quieren comer sano pero no tienen tiempo para cocinar.",
        features: [
          { id: 1, name: 'Sistema de pedidos básico', cost: 15000, category: 'must', score: 20 },
          { id: 2, name: 'Catálogo de menús', cost: 8000, category: 'must', score: 15 },
          { id: 3, name: 'Sistema de pagos', cost: 12000, category: 'must', score: 20 },
          { id: 4, name: 'Tracking de pedidos en tiempo real', cost: 18000, category: 'should', score: 10 },
          { id: 5, name: 'Sistema de valoraciones', cost: 10000, category: 'should', score: 8 },
          { id: 6, name: 'Personalización de dietas', cost: 20000, category: 'could', score: 12 },
          { id: 7, name: 'App móvil nativa', cost: 25000, category: 'could', score: 15 },
          { id: 8, name: 'Programa de fidelización', cost: 15000, category: 'could', score: 5 },
          { id: 9, name: 'Chat en vivo', cost: 8000, category: 'wont', score: 3 },
          { id: 10, name: 'Integración redes sociales', cost: 12000, category: 'wont', score: 2 },
        ],
      };

      function initializeGame() {
        caseDescription.textContent = gameData.case;
        renderFeatures();
        updateBudget();
        setupDropZones();
      }

      function renderFeatures() {
        const featuresArea = qs('#features-area');
        featuresArea.innerHTML = '';
        gameData.features.forEach((feature) => {
          const el = document.createElement('div');
          el.className = 'feature-card p-4 rounded-lg text-white border';
          el.innerHTML = `<h4 class="font-bold">${feature.name}</h4><p class="text-gray-300 text-sm">Costo: $${feature.cost.toLocaleString()}</p>`;
          el.draggable = true;
          el.dataset.featureId = feature.id;
          el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', feature.id);
            el.classList.add('dragging');
          });
          el.addEventListener('dragend', () => el.classList.remove('dragging'));
          featuresArea.appendChild(el);
        });
      }

      function setupDropZones() {
        qsa('.drop-zone').forEach((zone) => {
          zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('over');
          });
          zone.addEventListener('dragleave', () => zone.classList.remove('over'));
          zone.addEventListener('drop', (e) => {
            e.preventDefault();
            const featureId = parseInt(e.dataTransfer.getData('text/plain'));
            const feature = gameData.features.find((f) => f.id === featureId);
            if (feature) moveFeatureToZone(feature, zone);
            zone.classList.remove('over');
          });
        });
      }

      function moveFeatureToZone(feature, zone) {
        const existingElement = document.querySelector(`[data-feature-id="${feature.id}"]`);
        if (existingElement && existingElement.parentElement.classList.contains('drop-zone')) {
          currentSpent -= feature.cost;
        }
        if (zone.id === 'must-have' || zone.id === 'should-have') currentSpent += feature.cost;

        const featureElement = document.createElement('div');
        featureElement.className = 'feature-card p-3 rounded-lg text-white border text-sm mb-2 cursor-pointer';
        featureElement.innerHTML = `<h5 class="font-bold">${feature.name}</h5><p class="text-gray-300 text-xs">$${feature.cost.toLocaleString()}</p>`;
        featureElement.dataset.featureId = feature.id;
        featureElement.addEventListener('click', () => {
          if (zone.id === 'must-have' || zone.id === 'should-have') currentSpent -= feature.cost;
          featureElement.remove();
          renderFeatures();
          updateBudget();
        });

        if (zone.querySelector('p.text-gray-500')) zone.innerHTML = '';
        zone.appendChild(featureElement);
        const originalElement = document.querySelector(`#features-area [data-feature-id="${feature.id}"]`);
        if (originalElement) originalElement.remove();
        updateBudget();
      }

      function updateBudget() {
        spentEl.textContent = currentSpent.toLocaleString();
        remainingEl.textContent = (totalBudget - currentSpent).toLocaleString();
        remainingEl.style.color = currentSpent > totalBudget ? '#ef4444' : '#22c55e';
      }

      function evaluateMVP() {
        let score = 0;
        let feedback = '';
        const mustHave = qs('#must-have').querySelectorAll('[data-feature-id]');
        const shouldHave = qs('#should-have').querySelectorAll('[data-feature-id]');
        const couldHave = qs('#could-have').querySelectorAll('[data-feature-id]');
        const wontHave = qs('#wont-have').querySelectorAll('[data-feature-id]');

        mustHave.forEach((el) => {
          const featureId = parseInt(el.dataset.featureId);
          const feature = gameData.features.find((f) => f.id === featureId);
          if (feature.category === 'must') score += feature.score; else score -= 10;
        });
        shouldHave.forEach((el) => {
          const featureId = parseInt(el.dataset.featureId);
          const feature = gameData.features.find((f) => f.id === featureId);
          if (feature.category === 'should') score += feature.score; else if (feature.category === 'must') score -= 15; else score -= 5;
        });

        if (currentSpent > totalBudget) {
          score -= 30;
          feedback = 'Te excediste del presupuesto. Un PMV exitoso debe ser viable financieramente.';
          resultTitle.textContent = 'Presupuesto Excedido';
          resultTitle.style.color = '#ef4444';
        } else if (mustHave.length < 2) {
          score = Math.max(0, score - 30);
          feedback = 'Tu PMV es demasiado simple. No resuelve el problema central del cliente y probablemente fracasará en el mercado.';
          resultTitle.textContent = 'Lanzamiento Fallido';
          resultTitle.style.color = '#f97316';
        } else {
          score += wontHave.length * 5;
          feedback = '¡Lanzamiento exitoso! Has priorizado bien, enfocándote en el valor y respetando el presupuesto. Tienes una base sólida para empezar a iterar.';
          resultTitle.textContent = '¡PMV Exitoso!';
          resultTitle.style.color = '#22c55e';
        }

        resultScore.textContent = `${Math.max(0, score)}/100`;
        resultFeedback.textContent = feedback;
        resultModal.classList.remove('hidden');
      }

      const tryAgainBtn = qs('#try-again-btn');
      if (tryAgainBtn) tryAgainBtn.addEventListener('click', () => {
        resultModal.classList.add('hidden');
        currentSpent = 0;
        updateBudget();
        qsa('.drop-zone').forEach((zone) => {
          zone.innerHTML = `<p class="text-gray-500 text-sm">${getZonePlaceholder(zone.id)}</p>`;
        });
        renderFeatures();
      });

      function getZonePlaceholder(zoneId) {
        const placeholders = {
          'must-have': 'Esencial para funcionar',
          'should-have': 'Importante pero no crítico',
          'could-have': 'Nice to have',
          "wont-have": 'Para versiones futuras',
        };
        return placeholders[zoneId] || '';
      }

      evaluateMvpBtn.addEventListener('click', evaluateMVP);
      initializeGame();
    }

    // 2) El Desafío del Burn Rate (mantiene pantallas; pendiente migración a panel lateral)
    if (qs('#next-month-btn') && qs('#decision-area')) {
      const infoScreen = qs('#info-screen');
      const gameContainer = qs('#game-container');
      const gameOverScreen = qs('#game-over-screen');
      const capitalDisplay = qs('#capital-display');
      const revenueDisplay = qs('#revenue-display');
      const expensesDisplay = qs('#expenses-display');
      const monthDisplay = qs('#month-display');
      const decisionArea = qs('#decision-area');
      const logMessages = qs('#log-messages');
      const nextMonthBtn = qs('#next-month-btn');
      const playAgainBtn = qs('#play-again-btn');
      const startGameBtn = qs('#start-game-btn');
      const infoBackBtn = qs('#info-back-btn');

      let state = {};

      const decisionsPool = [
        { id: 'marketing-a', text: 'Lanzar campaña de marketing agresiva', cost: 15000, revenueIncrease: 8000, expenseIncrease: 2000, description: 'Invierte fuerte en anuncios. Alto riesgo, alta recompensa potencial.' },
        { id: 'marketing-b', text: 'Optimizar SEO y contenidos', cost: 5000, revenueIncrease: 3000, expenseIncrease: 500, description: 'Crecimiento lento pero sostenible. Mejora la base a largo plazo.' },
        { id: 'hiring-a', text: 'Contratar 2 desarrolladores senior', cost: 0, revenueIncrease: 0, expenseIncrease: 18000, description: 'Acelera el desarrollo del producto, pero dispara los gastos fijos.' },
        { id: 'hiring-b', text: 'Contratar 1 desarrollador junior', cost: 0, revenueIncrease: 0, expenseIncrease: 4000, description: 'Apoyo al equipo técnico con un impacto menor en el burn rate.' },
        { id: 'ops-a', text: 'Mover a oficinas más grandes', cost: 10000, revenueIncrease: 0, expenseIncrease: 5000, description: 'Mejora la moral y el espacio, pero aumenta los costos fijos.' },
        { id: 'ops-b', text: 'Optimizar software y reducir costos', cost: 2000, revenueIncrease: 0, expenseIncrease: -1500, description: 'Un pequeño gasto para encontrar ahorros mensuales recurrentes.' },
        { id: 'product-a', text: 'Desarrollar nueva funcionalidad premium', cost: 20000, revenueIncrease: 10000, expenseIncrease: 1000, description: 'Una gran inversión que puede atraer clientes de alto valor.' },
      ];

      function showScreen(screen) {
        [infoScreen, gameContainer, gameOverScreen].forEach((el) => el && el.classList.add('hidden'));
        if (screen === gameContainer) gameContainer.classList.remove('hidden');
        if (screen === infoScreen) infoScreen.classList.remove('hidden');
        if (screen === gameOverScreen) gameOverScreen.classList.remove('hidden');
      }

      function initGame() {
        state = { capital: 100000, revenue: 5000, expenses: 15000, month: 1, gameOver: false, decisionsMadeThisMonth: new Set() };
        if (logMessages) logMessages.innerHTML = '';
        addLog('¡Inicia tu startup! Tienes $100,000 para empezar.');
        updateDisplay();
        generateDecisions();
        showScreen(gameContainer);
      }

      function addLog(message) {
        if (!logMessages) return;
        logMessages.innerHTML = `<p>${message}</p>` + logMessages.innerHTML;
      }

      function updateDisplay() {
        if (capitalDisplay) capitalDisplay.textContent = formatCurrencyCL(state.capital);
        if (revenueDisplay) revenueDisplay.textContent = formatCurrencyCL(state.revenue);
        if (expensesDisplay) expensesDisplay.textContent = formatCurrencyCL(state.expenses);
        if (monthDisplay) monthDisplay.textContent = state.month;
        [capitalDisplay, revenueDisplay, expensesDisplay, monthDisplay].forEach((el) => pulse(el));
        if (capitalDisplay) capitalDisplay.classList.toggle('text-[var(--rojo-peligro)]', state.capital < 20000);
      }

      function generateDecisions() {
        if (!decisionArea) return;
        decisionArea.innerHTML = '<h3 class="font-serif text-xl font-bold text-white mb-2">Decisiones del Mes:</h3>';
        state.decisionsMadeThisMonth.clear();
        const availableDecisions = decisionsPool.filter((d) => Math.random() > 0.4).slice(0, 3);
        if (availableDecisions.length === 0) {
          decisionArea.innerHTML += '<p class="text-gray-400">Este mes ha sido tranquilo. Prepárate para el siguiente.</p>';
        }
        availableDecisions.forEach((decision) => {
          const card = document.createElement('div');
          card.className = 'game-card p-4 rounded-lg cursor-pointer';
          card.innerHTML = `
            <p class="font-bold text-white">${decision.text}</p>
            <p class="text-xs text-gray-400 mt-1">${decision.description}</p>
            <div class="text-xs mt-2 font-semibold">
              ${decision.cost > 0 ? `<span class="text-[var(--rojo-peligro)]">Costo: ${formatCurrencyCL(decision.cost)}</span>` : ''}
              ${decision.revenueIncrease > 0 ? `<span class="text-[var(--verde-exito)] ml-2">Ingresos +${formatCurrencyCL(decision.revenueIncrease)}</span>` : ''}
              ${decision.expenseIncrease !== 0 ? `<span class="text-[var(--rojo-peligro)] ml-2">Gastos ${decision.expenseIncrease > 0 ? '+' : ''}${formatCurrencyCL(decision.expenseIncrease)}</span>` : ''}
            </div>`;
          card.onclick = () => makeDecision(decision, card);
          decisionArea.appendChild(card);
        });
      }

      function makeDecision(decision, cardElement) {
        if (state.decisionsMadeThisMonth.has(decision.id)) return addLog('Ya has tomado una decisión similar este mes.');
        if (state.capital < decision.cost) return addLog('¡No tienes suficiente capital para esta decisión!');
        state.capital -= decision.cost;
        state.revenue += decision.revenueIncrease;
        state.expenses += decision.expenseIncrease;
        state.decisionsMadeThisMonth.add(decision.id);
        addLog(`Decisión tomada: ${decision.text}.`);
        if (cardElement) {
          cardElement.style.borderColor = 'var(--dorado)';
          cardElement.style.opacity = '0.5';
          cardElement.onclick = null;
        }
        updateDisplay();
      }

      function advanceMonth() {
        const netFlow = state.revenue - state.expenses;
        state.capital += netFlow;
        state.month++;
        addLog(`Fin del Mes ${state.month - 1}: Flujo de caja de ${formatCurrencyCL(netFlow)}.`);
        updateDisplay();
        if (state.capital <= 0) endGame(false);
        else if (state.revenue > state.expenses) endGame(true);
        else generateDecisions();
      }

      function endGame(isWin) {
        state.gameOver = true;
        showScreen(gameOverScreen);
        const gameOverTitle = qs('#game-over-title');
        const gameOverMessage = qs('#game-over-message');
        if (isWin) {
          if (gameOverTitle) { gameOverTitle.textContent = '¡Rentabilidad Alcanzada!'; gameOverTitle.className = 'font-serif text-5xl font-bold text-[var(--verde-exito)]'; }
          if (gameOverMessage) gameOverMessage.textContent = `¡Felicitaciones! Alcanzaste un flujo de caja positivo en el mes ${state.month}. Has construido un negocio sostenible.`;
        } else {
          if (gameOverTitle) { gameOverTitle.textContent = '¡Bancarrota!'; gameOverTitle.className = 'font-serif text-5xl font-bold text-[var(--rojo-peligro)]'; }
          if (gameOverMessage) gameOverMessage.textContent = `Te quedaste sin capital en el mes ${state.month}. Cada fracaso es una lección. ¡Inténtalo de nuevo!`;
        }
      }

      if (startGameBtn) startGameBtn.addEventListener('click', initGame);
      if (nextMonthBtn) nextMonthBtn.addEventListener('click', advanceMonth);
      if (playAgainBtn) playAgainBtn.addEventListener('click', initGame);
      if (infoBackBtn) infoBackBtn.addEventListener('click', () => {
        // Si no hay pantalla de info en el layout, vuelve al juego
        if (infoScreen) showScreen(infoScreen);
        else showScreen(gameContainer);
      });
      // Auto-inicializar si no hay botón de inicio (panel lateral)
      if (!startGameBtn) initGame();
    }

    // 3) El Negociador de Alianzas
    if (qs('#chat-window') && qs('#options-area')) {
      const infoScreen = qs('#info-screen');
      const gameContainer = qs('#game-container');
      const gameOverModal = qs('#game-over-modal');
      const startGameBtn = qs('#start-game-btn');
      const chatWindow = qs('#chat-window');
      const optionsArea = qs('#options-area');
      const gameOverTitle = qs('#game-over-title');
      const gameOverFeedback = qs('#game-over-feedback');
      const finalCommission = qs('#final-commission');
      const finalBlog = qs('#final-blog');
      const playAgainBtn = qs('#play-again-btn');
      const infoBackBtn = qs('#info-back-btn');

      let state;

      const dialogueTree = {
        start: {
          partnerMessage: 'Hola. Gracias por reunirte conmigo. Hemos revisado tu producto y es interesante. Cuéntame, ¿qué tipo de alianza tienes en mente?',
          options: [
            { text: 'Quiero una comisión del 20% por cada cliente que les refiera.', next: 'aggressive_start', score: -10 },
            { text: 'Creemos que una colaboración podría beneficiarnos mutuamente. ¿Qué tal si exploramos algunas ideas juntos?', next: 'collaborative_start', score: 10 },
            { text: 'Nuestro producto es el mejor. Si lo promocionan, ambos ganaremos mucho dinero.', next: 'arrogant_start', score: -5 },
          ],
        },
        aggressive_start: {
          partnerMessage: '20% es una cifra muy alta para empezar sin datos. No podemos aceptar eso. Siendo realistas, podríamos ofrecer un 8%.',
          options: [
            { text: 'Imposible. Mi mínimo es 18%.', next: 'negotiate_hard', score: -5 },
            { text: 'Entiendo. ¿Qué necesitarían ver para considerar un número más cercano al 15%?', next: 'find_common_ground', score: 10 },
          ],
        },
        collaborative_start: {
          partnerMessage: 'Me gusta ese enfoque. Para nosotros, es clave llegar a nuevos mercados. ¿Cómo nos ayudaría tu plataforma a lograr eso, más allá de una simple comisión?',
          options: [
            { text: 'Además de referir clientes, podríamos crear contenido juntos. Un post en su blog sería ideal.', next: 'propose_blog', score: 15 },
            { text: 'Mi plataforma tiene muchos usuarios. Eso es lo que les ofrezco.', next: 'negotiate_hard', score: -5 },
          ],
        },
        arrogant_start: {
          partnerMessage: 'Agradecemos tu confianza en tu producto, pero necesitamos más que eso. Hablemos de números concretos. ¿Qué comisión buscas?',
          options: [
            { text: 'Ok, vayamos al grano. Busco un 15% de comisión.', next: 'negotiate_hard', score: 5 },
            { text: 'Entiendo su punto. ¿Qué tal un 12% inicial, con la opción de subirlo si alcanzamos ciertas metas?', next: 'find_common_ground', score: 10 },
          ],
        },
        propose_blog: {
          partnerMessage: 'Interesante. Un post conjunto podría funcionar. Si hacemos eso, podríamos llegar a una comisión del 12%. ¿Te parece justo?',
          options: [
            { text: 'Acepto el 12% y el post en el blog. ¡Trato hecho!', next: 'end_good', score: 10 },
            { text: 'Casi. ¿Podemos cerrar en 15% y el post en el blog? Sería un verdadero ganar-ganar.', next: 'final_push', score: 5 },
          ],
        },
        find_common_ground: {
          partnerMessage: 'Necesitaríamos ver al menos 100 nuevos usuarios registrados en los primeros 3 meses. Si lo logras, podemos renegociar. Por ahora, te ofrezco un 10%.',
          options: [
            { text: 'Ok, acepto el 10% con la revisión en 3 meses. Trato hecho.', next: 'end_ok', score: 5 },
            { text: 'Es muy bajo. ¿Qué tal si añaden un post en su blog para ayudarme a llegar a esa meta? A cambio, acepto el 10%.', next: 'propose_blog', score: 10 },
          ],
        },
        negotiate_hard: {
          partnerMessage: 'Lo siento, pero las cifras que propones no son viables para nosotros en este momento. Quizás deberíamos dejar esta conversación para más adelante.',
          options: [
            { text: 'De acuerdo. Fin de la negociación.', next: 'end_bad', score: -20 },
          ],
        },
        final_push: {
          partnerMessage: 'Está bien. Tienes buenos argumentos. Aceptamos un 15% de comisión y el post en el blog. Tenemos un acuerdo.',
          options: [
            { text: '¡Perfecto! Trato hecho.', next: 'end_win', score: 20 },
          ],
        },
      };

      function showScreen(screen) {
        [infoScreen, gameContainer, gameOverModal].forEach((el) => el && el.classList.add('hidden'));
        if (screen === 'info') infoScreen?.classList.remove('hidden');
        if (screen === 'game') gameContainer?.classList.remove('hidden');
        if (screen === 'game-over') gameOverModal?.classList.remove('hidden');
      }

      function initGame() {
        state = { score: 0, commission: 0, blogPost: false, currentNode: 'start' };
        if (chatWindow) chatWindow.innerHTML = '';
        showScreen('game');
        displayNode('start');
      }

      function addMessage(text, sender) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble p-3 rounded-lg w-fit ${sender === 'user' ? 'user self-end' : 'partner self-start'}`;
        bubble.textContent = text;
        chatWindow.appendChild(bubble);
        chatWindow.scrollTop = chatWindow.scrollHeight;
      }

      function displayNode(nodeId) {
        const node = dialogueTree[nodeId];
        if (!node) return;
        addMessage(node.partnerMessage, 'partner');
        optionsArea.innerHTML = '';
        if (node.options) {
          node.options.forEach((option) => {
            const button = document.createElement('button');
            button.className = 'option-button w-full text-left p-3 rounded-lg';
            button.textContent = option.text;
            button.onclick = () => selectOption(option);
            optionsArea.appendChild(button);
          });
        }
      }

      function selectOption(option) {
        addMessage(option.text, 'user');
        state.score += option.score;
        state.currentNode = option.next;
        qsa('.option-button').forEach((b) => (b.disabled = true));
        setTimeout(() => {
          if (option.next.startsWith('end_')) endGame(option.next);
          else displayNode(option.next);
        }, 1000);
      }

      function endGame(endNode) {
        let title = '';
        let feedback = '';
        switch (endNode) {
          case 'end_win':
            title = '¡Acuerdo Maestro!';
            feedback = '¡Excelente! Lograste tus objetivos y construiste una relación sólida. Esta es una verdadera alianza ganar-ganar.';
            state.commission = 15;
            state.blogPost = true;
            break;
          case 'end_good':
            title = '¡Buen Acuerdo!';
            feedback = 'Conseguiste un trato favorable. Aunque no alcanzaste el máximo, aseguraste valor adicional y mantuviste una buena relación.';
            state.commission = 12;
            state.blogPost = true;
            break;
          case 'end_ok':
            title = 'Acuerdo Aceptable';
            feedback = 'Lograste un acuerdo, pero cediste en puntos importantes. Es una base para construir, pero podrías haber obtenido más.';
            state.commission = 10;
            state.blogPost = false;
            break;
          case 'end_bad':
            title = 'Negociación Rota';
            feedback = 'Tu postura fue demasiado rígida y la negociación fracasó. A veces, es mejor un acuerdo aceptable que ningún acuerdo.';
            state.commission = 0;
            state.blogPost = false;
            break;
        }
        if (gameOverTitle) {
          gameOverTitle.textContent = title;
          gameOverTitle.style.color = state.score > 20 ? '#22c55e' : state.score > 5 ? 'var(--dorado)' : '#ef4444';
        }
        if (gameOverFeedback) gameOverFeedback.textContent = feedback;
        if (finalCommission) finalCommission.textContent = `${state.commission}%`;
        if (finalBlog) finalBlog.textContent = state.blogPost ? 'Sí' : 'No';
        showScreen('game-over');
      }

  startGameBtn?.addEventListener('click', initGame);
  playAgainBtn?.addEventListener('click', initGame);
  infoBackBtn?.addEventListener('click', () => showScreen(infoScreen ? 'info' : 'game'));
  if (!startGameBtn) initGame();
    }

    // 4) El Optimizador de Conversiones
    if (qs('#conversion-rate-display') && qs('#options-area')) {
      const infoScreen = qs('#info-screen');
      const gameContainer = qs('#game-container');
      const gameOverModal = qs('#game-over-modal');
      const startGameBtn = qs('#start-game-btn');
      const weekDisplay = qs('#week-display');
      const conversionRateDisplay = qs('#conversion-rate-display');
      const optionsArea = qs('#options-area');
      const resultArea = qs('#result-area');
      const resultText = qs('#result-text');
      const gameOverTitle = qs('#game-over-title');
      const gameOverFinalRate = qs('#game-over-final-rate');
      const gameOverFeedback = qs('#game-over-feedback');
      const playAgainBtn = qs('#play-again-btn');
      const infoBackBtn = qs('#info-back-btn');

      let state;
      const optionsPool = [
        { id: 'headline', text: 'Probar un nuevo Título', impact: 0.8, description: 'Un título enfocado en beneficios puede tener un gran impacto.' },
        { id: 'image', text: 'Cambiar la Imagen Principal', impact: 0.5, description: 'Una imagen más relevante puede mejorar la conexión emocional.' },
        { id: 'cta', text: 'Modificar el Botón de Acción', impact: 0.3, description: 'Cambiar el color o el texto del CTA puede generar más clics.' },
        { id: 'testimonials', text: 'Añadir Testimonios de Clientes', impact: 1.2, description: 'La prueba social es uno de los elementos más persuasivos.' },
        { id: 'bad_idea', text: 'Añadir música de fondo', impact: -0.5, description: 'Algunas “mejoras” pueden en realidad perjudicar la experiencia.' },
        { id: 'guarantee', text: 'Incluir una garantía de 30 días', impact: 0.6, description: 'Reducir el riesgo para el usuario suele aumentar la conversión.' },
      ];

      function showScreen(screen) {
        [infoScreen, gameContainer, gameOverModal].forEach((el) => el && el.classList.add('hidden'));
        if (screen === 'info') infoScreen?.classList.remove('hidden');
        if (screen === 'game') gameContainer?.classList.remove('hidden');
        if (screen === 'game-over') gameOverModal?.classList.remove('hidden');
      }

      function initGame() {
        state = { week: 1, conversionRate: 2.0, usedOptions: new Set() };
        updateDisplay();
        generateOptions();
        resultArea?.classList.add('hidden');
        showScreen('game');
      }

      function updateDisplay() {
        if (weekDisplay) weekDisplay.textContent = `${state.week} / 5`;
        if (conversionRateDisplay) conversionRateDisplay.textContent = `${state.conversionRate.toFixed(2)}%`;
      }

      function generateOptions() {
        optionsArea.innerHTML = '';
        const availableOptions = optionsPool.filter((opt) => !state.usedOptions.has(opt.id));
        availableOptions.forEach((option) => {
          const card = document.createElement('div');
          card.className = 'option-card p-4 rounded-lg';
          card.innerHTML = `<p class="font-bold text-white">${option.text}</p><p class=\"text-xs text-gray-400 mt-1\">${option.description}</p>`;
          card.onclick = () => runExperiment(option);
          optionsArea.appendChild(card);
        });
      }

      function runExperiment(option) {
        state.usedOptions.add(option.id);
        qsa('.option-card').forEach((c) => c.classList.add('disabled'));
        const oldRate = state.conversionRate;
        const change = Math.random() * option.impact - option.impact / 4;
        state.conversionRate += change;
        if (state.conversionRate < 0.1) state.conversionRate = 0.1;

        const improved = state.conversionRate > oldRate;
        const delta = Math.abs(state.conversionRate - oldRate).toFixed(2);
        resultText.innerHTML = improved
          ? `<span class=\"font-bold text-[var(--verde-exito)]\">¡Prueba Exitosa!</span> La conversión ${improved ? 'aumentó' : 'disminuyó'} en <span class=\"font-bold\">${delta}%</span>.`
          : `<span class=\"font-bold text-[var(--rojo-peligro)]\">Prueba Fallida.</span> La conversión disminuyó en <span class=\"font-bold\">${delta}%</span>.`;
        resultArea.classList.remove('hidden');

        animateNumber(conversionRateDisplay, oldRate, state.conversionRate, { duration: 1000, decimals: 2, suffix: '%' });

        setTimeout(() => {
          state.week++;
          if (state.week > 5) endGame();
          else {
            updateDisplay();
            generateOptions();
            resultArea.classList.add('hidden');
          }
        }, 3000);
      }

      function endGame() {
        if (gameOverFinalRate) gameOverFinalRate.textContent = `${state.conversionRate.toFixed(2)}%`;
        let feedback = '';
        if (state.conversionRate > 7) {
          if (gameOverTitle) { gameOverTitle.textContent = '¡Resultado Maestro!'; gameOverTitle.style.color = 'var(--verde-exito)'; }
          feedback = '¡Increíble! Tus decisiones han llevado la página a un rendimiento excepcional. Eres un verdadero optimizador.';
        } else if (state.conversionRate > 3) {
          if (gameOverTitle) { gameOverTitle.textContent = '¡Buen Progreso!'; gameOverTitle.style.color = 'var(--dorado)'; }
          feedback = 'Lograste una mejora notable. Has demostrado una buena intuición para la optimización. ¡Sigue así!';
        } else {
          if (gameOverTitle) { gameOverTitle.textContent = 'Necesita Mejorar'; gameOverTitle.style.color = 'var(--rojo-peligro)'; }
          feedback = 'La optimización es difícil. No todos los cambios funcionan. Analiza los resultados y vuelve a intentarlo. ¡Cada test es un aprendizaje!';
        }
        if (gameOverFeedback) gameOverFeedback.textContent = feedback;
        showScreen('game-over');
      }

  startGameBtn?.addEventListener('click', initGame);
  playAgainBtn?.addEventListener('click', initGame);
  infoBackBtn?.addEventListener('click', () => showScreen(infoScreen ? 'info' : 'game'));
  if (!startGameBtn) initGame();
    }

    // 5) El Pitch Maestro
    if (qs('#check-pitch-btn') && qs('#cards-area')) {
      const infoScreen = qs('#info-screen');
      const gameContainer = qs('#game-container');
      const resultModal = qs('#result-modal');
      const startGameBtn = qs('#start-game-btn');
      const timerBar = qs('#timer-bar');
      const timerDisplay = qs('#timer-display');
      const businessCaseEl = qs('#business-case');
      const pitchArea = qs('#pitch-area');
      const cardsArea = qs('#cards-area');
      const checkPitchBtn = qs('#check-pitch-btn');
      const resultTitle = qs('#result-title');
      const resultScore = qs('#result-score');
      const resultFeedback = qs('#result-feedback');
      const playAgainBtn = qs('#play-again-btn');
      const infoBackBtn = qs('#info-back-btn');

      let timerInterval;
      let timeLeft;
      let currentPitch = [];
      let currentCase;

      const cases = [
        { name: 'Café de Especialidad a Domicilio', description: 'Un servicio de suscripción mensual que entrega granos de café recién tostado de pequeños productores a la puerta de tu casa.', pitchStructure: ['target', 'problem', 'solution', 'secret_sauce'], cards: [
          { id: 'target', text: 'Para amantes del café que trabajan desde casa', score: 10 },
          { id: 'problem', text: 'y están cansados del café de supermercado', score: 10 },
          { id: 'solution', text: 'ofrecemos una suscripción de café de especialidad', score: 10 },
          { id: 'secret_sauce', text: 'curado por expertos y entregado en 48 horas.', score: 10 },
          { id: 'distractor1', text: 'vendemos tazas y molinillos', score: -5 },
          { id: 'distractor2', text: 'con envío gratis en todo el país', score: 0 },
          { id: 'distractor3', text: 'nuestro café es el más barato', score: -10 },
          { id: 'distractor4', text: 'disponible en todas las grandes tiendas', score: -5 },
        ]},
        { name: 'App de Jardinería para Principiantes', description: 'Una aplicación móvil que usa IA para identificar plantas con una foto y da instrucciones de cuidado paso a paso.', pitchStructure: ['target', 'problem', 'solution', 'secret_sauce'], cards: [
          { id: 'target', text: 'Para habitantes de ciudad que quieren tener plantas', score: 10 },
          { id: 'problem', text: 'pero no saben cómo cuidarlas', score: 10 },
          { id: 'solution', text: 'creamos una app que identifica tus plantas', score: 10 },
          { id: 'secret_sauce', text: 'y te envía recordatorios inteligentes de riego.', score: 10 },
          { id: 'distractor1', text: 'tenemos un blog sobre flores', score: -5 },
          { id: 'distractor2', text: 'nuestra app es muy bonita', score: 0 },
          { id: 'distractor3', text: 'incluyendo plantas exóticas de todo el mundo', score: -5 },
          { id: 'distractor4', text: 'con maceteros de regalo', score: -10 },
        ]},
      ];

      function showScreen(screen) {
        [infoScreen, gameContainer].forEach((el) => el && el.classList.add('hidden'));
        if (screen === 'info') infoScreen?.classList.remove('hidden');
        if (screen === 'game') gameContainer?.classList.remove('hidden');
      }

      function initGame() {
        resultModal?.classList.add('hidden');
        currentPitch = [];
        currentCase = cases[Math.floor(Math.random() * cases.length)];
        if (businessCaseEl) businessCaseEl.innerHTML = `<p class="font-bold text-white">${currentCase.name}</p><p class="text-sm text-gray-300">${currentCase.description}</p>`;
        setupPitchSlots();
        setupCards();
        startTimer();
        showScreen('game');
      }

      function setupPitchSlots() {
        pitchArea.innerHTML = '';
        for (let i = 0; i < currentCase.pitchStructure.length; i++) {
          const slot = document.createElement('div');
          slot.className = 'pitch-slot p-3 rounded-lg min-h-[60px] flex items-center justify-center';
          slot.innerHTML = `<span class="text-gray-500 text-sm">Parte ${i + 1} del Pitch</span>`;
          slot.dataset.index = i;
          pitchArea.appendChild(slot);
        }
      }

      function setupCards() {
        cardsArea.innerHTML = '';
        const shuffledCards = [...currentCase.cards].sort(() => Math.random() - 0.5);
        shuffledCards.forEach((card) => {
          const cardEl = document.createElement('div');
          cardEl.className = 'pitch-card p-3 rounded-lg text-sm';
          cardEl.textContent = card.text;
          cardEl.dataset.cardId = card.id;
          cardEl.addEventListener('click', () => selectCard(card, cardEl));
          cardsArea.appendChild(cardEl);
        });
      }

      function selectCard(card, cardEl) {
        if (currentPitch.length >= currentCase.pitchStructure.length || cardEl.classList.contains('selected')) return;
        const nextSlotIndex = currentPitch.length;
        const slotEl = pitchArea.querySelector(`[data-index='${nextSlotIndex}']`);
        slotEl.innerHTML = `<p class="font-semibold">${card.text}</p>`;
        slotEl.style.borderStyle = 'solid';
        slotEl.style.borderColor = 'var(--dorado)';
        currentPitch.push(card);
        cardEl.classList.add('selected');
      }

      function startTimer() {
        timeLeft = 60;
        if (timerDisplay) timerDisplay.textContent = timeLeft;
        if (timerBar) timerBar.style.width = '100%';
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
          timeLeft--;
          if (timerDisplay) timerDisplay.textContent = timeLeft;
          if (timerBar) timerBar.style.width = `${(timeLeft / 60) * 100}%`;
          if (timeLeft <= 10 && timerBar) timerBar.style.backgroundColor = '#ef4444';
          if (timeLeft <= 0) { clearInterval(timerInterval); checkPitch(); }
        }, 1000);
      }

      function checkPitch() {
        clearInterval(timerInterval);
        let totalScore = 0;
        let feedback = '';
        for (let i = 0; i < currentPitch.length; i++) {
          if (currentPitch[i].id === currentCase.pitchStructure[i]) totalScore += 20;
        }
        currentPitch.forEach((card) => { totalScore += card.score; });
        if (totalScore >= 75) { if (resultTitle) { resultTitle.textContent = '¡Pitch Maestro!'; resultTitle.style.color = '#22c55e'; } feedback = '¡Excelente! Has construido un pitch claro, coherente y persuasivo. Tu mensaje es potente y va directo al punto.'; }
        else if (totalScore >= 40) { if (resultTitle) { resultTitle.textContent = 'Buen Intento'; resultTitle.style.color = 'var(--dorado)'; } feedback = 'Tienes una buena base, pero algunas partes del pitch podrían ser más fuertes o estar en un orden más lógico. ¡Sigue practicando!'; }
        else { if (resultTitle) { resultTitle.textContent = 'Necesita Mejorar'; resultTitle.style.color = '#ef4444'; } feedback = 'Tu pitch parece confuso. Asegúrate de elegir solo las ideas más importantes y presentarlas en un orden que cuente una historia clara.'; }
        if (resultScore) resultScore.textContent = `${Math.max(0, totalScore)}/100`;
        if (resultFeedback) resultFeedback.textContent = feedback;
        resultModal?.classList.remove('hidden');
      }

  startGameBtn?.addEventListener('click', initGame);
  checkPitchBtn?.addEventListener('click', checkPitch);
  playAgainBtn?.addEventListener('click', initGame);
  infoBackBtn?.addEventListener('click', () => { resultModal?.classList.add('hidden'); showScreen(infoScreen ? 'info' : 'game'); });
  if (!startGameBtn) initGame();
    }
  });
})();
