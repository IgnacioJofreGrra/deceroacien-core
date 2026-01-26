// assets/js/zoho-forms.js
// Maneja formularios de contacto y envía datos a Zoho CRM y al registro local de leads.
(function(){
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

  function onReady(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn();
  }

  function apiBase(){
    try {
      const base = window.PublicAuthConfig && window.PublicAuthConfig.api && window.PublicAuthConfig.api.baseUrl;
      if (base) return String(base).replace(/\/$/, '');
  } catch{}
    return '/api';
  }

  function ensureStatus(form){
    let el = form.querySelector('[data-form-status]');
    if (!el){
      el = document.createElement('p');
      el.setAttribute('data-form-status','');
      el.className = 'text-sm mt-2 text-slate-300';
      el.setAttribute('aria-live','polite');
      form.appendChild(el);
    }
    return el;
  }

  async function submitZohoLead(form){
    const status = ensureStatus(form);
    const email = form.querySelector('input[name="email"],#email');
    const name  = form.querySelector('input[name="name"],#name');
    const company = form.querySelector('input[name="company"],#company');
    const phone = form.querySelector('input[name="phone"],#phone');
    const message = form.querySelector('textarea[name="message"],#message');
    const stage = form.querySelector('select[name="stage"],#stage');

    const emailVal = email ? String(email.value||'').trim().toLowerCase() : '';
    if (!EMAIL_REGEX.test(emailVal)) { status.textContent = 'Ingresa un email válido.'; email && email.focus(); return; }

    const fullName = name ? String(name.value||'').trim() : '';
    const first = fullName ? fullName.split(' ')[0] : undefined;
    const last = fullName ? fullName.split(' ').slice(1).join(' ') : undefined;
    const payload = {
      email: emailVal,
      firstname: first,
      // Zoho requiere Last_Name; si no hay, usamos el mismo first o un marcador mínimo
      lastname: last && last.length ? last : (first || '.'),
      company: company ? String(company.value||'').trim() : undefined,
      phone: phone ? String(phone.value||'').trim() : undefined,
      lead_source: form.dataset.zohoSource || 'Web — Contacto',
      description: [message ? String(message.value||'').trim() : '', stage ? `Etapa: ${stage.value||''}` : ''].filter(Boolean).join('\n')
    };

    const btn = form.querySelector('button[type="submit"]');
    const btnLabel = btn ? btn.textContent : null;
    if (btn) btn.textContent = 'Enviando…';
    form.querySelectorAll('input,textarea,select,button').forEach(el => el.disabled = true);
    status.textContent = 'Procesando tu solicitud…';

    const base = apiBase();
    try {
      // 1) Crear lead en Zoho
      const r1 = await fetch(`${base}/integrations/zoho/leads`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      if (!r1.ok) {
        let details = null; try { details = await r1.json(); } catch{}
        // Mensajes específicos
        if (r1.status === 400 && details && details.error === 'invalid_email') {
          throw new Error('invalid_email');
        }
        if (r1.status === 503 && details && details.error === 'zoho_not_configured') {
          throw new Error('zoho_not_configured');
        }
        throw new Error('zoho_error');
      }
      // 2) Registrar también como lead local (opcional)
      try {
        await fetch(`${base}/leads/downloads`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ email: emailVal, name: name? name.value: undefined, source: 'contacto', tags: ['contact'] }) });
  } catch{}
      status.textContent = '¡Gracias! Hemos recibido tu mensaje. Te contactaremos pronto.';
      form.reset();
    } catch (e){
      console.error('[zoho-forms] submit error', e);
      if (String(e && e.message) === 'invalid_email') {
        status.textContent = 'El correo no es válido. Por favor verifica e inténtalo de nuevo.';
      } else if (String(e && e.message) === 'zoho_not_configured') {
        status.textContent = 'El sistema de contacto está en mantenimiento. Intenta más tarde o escribe a hola@deceroacien.app.';
      } else {
        status.textContent = 'No pudimos enviar tu mensaje. Inténtalo más tarde o escribe a hola@deceroacien.app.';
      }
    } finally {
      form.querySelectorAll('input,textarea,select,button').forEach(el => el.disabled = false);
      if (btn) btn.textContent = btnLabel || 'Enviar';
    }
  }

  onReady(function(){
    const forms = document.querySelectorAll('form[data-zoho-lead]');
    // Insertar honeypot oculto si no existe
    forms.forEach(f => {
      if (!f.querySelector('input[name="hp"]')){
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
        f.appendChild(hp);
      }
    });
    forms.forEach(function(form){
      form.addEventListener('submit', function(ev){ ev.preventDefault(); submitZohoLead(form); });
    });
  });
})();
