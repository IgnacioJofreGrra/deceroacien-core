// assets/js/downloads.js
// Instrumentación de formularios de descargas gratuitas.
(function(){
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

  function onReady(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function getApiBase(){
    try {
      const base = window.PublicAuthConfig && window.PublicAuthConfig.api && window.PublicAuthConfig.api.baseUrl;
      if (base) return String(base).replace(/\/$/, '');
  } catch{ }
    return '/api';
  }

  function parseTags(value){
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => String(v || '').trim()).filter(Boolean);
    return String(value).split(',').map(v => v.trim()).filter(Boolean);
  }

  function ensureStatusElement(form){
    let el = form.querySelector('[data-download-status]');
    if (!el) {
      el = document.createElement('p');
      el.setAttribute('data-download-status', '');
      el.className = 'text-sm mt-2 text-slate-300';
      el.setAttribute('aria-live', 'polite');
      form.appendChild(el);
    }
    return el;
  }

  function setStatus(el, message, state){
    if (!el) return;
    el.textContent = message || '';
    el.classList.remove('hidden', 'text-emerald-400', 'text-rose-400', 'text-slate-300', 'text-[var(--kit-texto-secundario)]');
    const map = {
      pending: 'text-slate-300',
      success: 'text-emerald-400',
      error: 'text-rose-400'
    };
    const cls = map[state] || 'text-slate-300';
    el.classList.add(cls);
  }

  function toggleForm(form, disabled){
    const elements = Array.from(form.elements || []);
    elements.forEach(el => {
      if (typeof el.disabled === 'boolean') el.disabled = !!disabled;
    });
  }

  function attachSubmitHandler(form, apiUrl){
    const statusEl = ensureStatusElement(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    const submitLabel = submitBtn ? submitBtn.textContent : null;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const emailInput = form.querySelector('input[type="email"], input[name="email"]');
      const nameInput = form.querySelector('input[name="name"], input[name="nombre"]');

      const emailValue = emailInput ? String(emailInput.value || '').trim() : '';
      if (!EMAIL_REGEX.test(emailValue)) {
        setStatus(statusEl, 'Necesitamos un correo válido para enviarte el kit.', 'error');
        if (emailInput) emailInput.focus();
        return;
      }

      const payload = {
        email: emailValue,
        name: nameInput ? String(nameInput.value || '').trim() || null : null,
        source: form.dataset.downloadSource || 'descargas-gratuitas',
        tags: parseTags(form.dataset.downloadTags),
        asset: form.dataset.downloadAsset || undefined,
        formId: form.id || undefined,
        formVariant: form.dataset.downloadForm || undefined,
        page: window.location ? window.location.pathname : undefined,
        metadata: {
          locale: document.documentElement ? document.documentElement.lang || 'es' : 'es',
          viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : undefined
        },
        consent: {
          marketing: true,
          timestamp: new Date().toISOString()
        }
      };

      if (!payload.tags.length && payload.formVariant) {
        payload.tags.push(payload.formVariant);
      }

      toggleForm(form, true);
      if (submitBtn) submitBtn.textContent = 'Enviando…';
      setStatus(statusEl, 'Procesando tu solicitud…', 'pending');

      try {
        const resp = await fetch(`${apiUrl}/leads/downloads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await resp.json().catch(() => null);
        if (!resp.ok || !data || data.error) {
          throw new Error(data && data.error ? data.error : 'unknown_error');
        }

        setStatus(statusEl, '¡Listo! Revisa tu correo, te enviamos el acceso al kit.', 'success');
        form.reset();

        if (window.dataLayer && typeof window.dataLayer.push === 'function') {
          window.dataLayer.push({
            event: 'lead_download_submitted',
            formVariant: payload.formVariant || null,
            source: payload.source || null
          });
        }

        form.dispatchEvent(new CustomEvent('download-form:success', {
          detail: { email: payload.email, response: data },
          bubbles: true
        }));
      } catch (error) {
        console.error('[downloads] Error registrando lead', error);
        setStatus(statusEl, 'No pudimos registrar tu correo. Inténtalo nuevamente en unos minutos.', 'error');
        form.dispatchEvent(new CustomEvent('download-form:error', {
          detail: { error },
          bubbles: true
        }));
      } finally {
        toggleForm(form, false);
        if (submitBtn) submitBtn.textContent = submitLabel || 'Enviar';
      }
    });
  }

  onReady(() => {
    const forms = document.querySelectorAll('form[data-download-form]');
    // Honeypot ligero
    forms.forEach(form => {
      if (!form.querySelector('input[name="hp"]')){
        const hp = document.createElement('input');
        hp.type = 'text';
        hp.name = 'hp';
        hp.autocomplete = 'off';
        hp.tabIndex = -1;
        hp.style.position = 'absolute';
        hp.style.left = '-10000px';
        hp.style.height = '0';
        hp.style.width = '0';
        hp.style.opacity = '0';
        form.appendChild(hp);
      }
    });
    if (!forms.length) return;
    const apiBase = getApiBase();
    forms.forEach(form => attachSubmitHandler(form, apiBase));
  });
})();
