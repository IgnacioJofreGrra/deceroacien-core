/**
 * payments.js - Integración ligera con Mercado Pago (Checkout Pro)
 * No expone credenciales; llama a /api/mp/create-preference
 */
(function (w) {
  const Payments = {
    async startCheckout({ items = [], returnTo = null } = {}) {
      try {
        // Información mínima del usuario (si tienes auth local) para external_reference
        const user = (w.authManager && w.authManager.isUserAuthenticated && w.authManager.isUserAuthenticated())
          ? (w.authManager.getCurrentUser && w.authManager.getCurrentUser())
          : null;
        // Token: preferir Supabase si existe sesión; fallback a Firebase
        let idToken = null;
        try { if (w.SupabaseAuth && w.SupabaseAuth.getAccessToken) idToken = await w.SupabaseAuth.getAccessToken(); } catch(_){}
        if (!idToken && w.authManager && w.authManager.getIdToken) {
          try { idToken = await w.authManager.getIdToken(); } catch(_){}
        }

        // Si llegan SKUs (strings), intentamos resolverlos a objetos completos con Pricing
        let normalizedItems = items;
        if (Array.isArray(items) && items.some(it => typeof it === 'string')) {
          try {
            if (w.Pricing && w.Pricing.load) {
              await w.Pricing.load();
              const DEFAULT_DESC = 'Dispositivo de tienda móvil de comercio electrónico';
              const DEFAULT_IMG = (w.location && w.location.origin ? w.location.origin : '') + '/assets/logo_de_cero_a_cien.png';
              const currency = (w.Pricing._data && w.Pricing._data.currency) || 'CLP';
              normalizedItems = items.map((sku) => {
                if (typeof sku !== 'string') return sku;
                const def = (w.Pricing.getProduct && w.Pricing.getProduct(sku)) || null;
                const unit_price = def && def.unit_price ? Number(def.unit_price) : 0;
                return {
                  id: '1234',
                  sku,
                  title: (def && def.title) || 'Producto',
                  description: DEFAULT_DESC,
                  picture_url: DEFAULT_IMG,
                  quantity: 1,
                  currency_id: currency,
                  unit_price
                };
              });
            }
          } catch (e) {
            console.warn('No se pudo normalizar SKUs con Pricing:', e);
          }
        }

        const payload = {
          items: normalizedItems,
          user: user ? { id: user.id || null, email: user.email || null } : {},
          returnTo: returnTo || w.location.href
        };

        const isDev = !!(w.Environment && w.Environment.isDevelopment);
        let endpoint;
        if (isDev) {
          endpoint = 'http://localhost:3001/api/mp/create-preference';
        } else if (w.PublicAuthConfig && w.PublicAuthConfig.api && w.PublicAuthConfig.api.baseUrl) {
          endpoint = w.PublicAuthConfig.api.baseUrl + '/mp/create-preference';
        } else if ((w.location && /(^|\.)deceroacien\.app$/.test(w.location.hostname))) {
          // Fallback seguro en producción para evitar usar /api relativo (Vercel)
          endpoint = 'https://api.deceroacien.app/api/mp/create-preference';
        } else {
          endpoint = '/api/mp/create-preference';
        }

        const headers = { 'Content-Type': 'application/json' };
        if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        const data = await resp.json();
        if (!resp.ok) {
          console.error('No se pudo crear la preferencia:', data);
          alert('No se pudo iniciar el pago. Inténtalo de nuevo.');
          return;
        }

        // Elegimos URL según entorno: producción usa init_point, dev/pruebas usa sandbox
        const host = (w.location && w.location.hostname) || '';
        const isProdHost = /(^|\.)deceroacien\.app$/.test(host);
        const url = isProdHost
          ? (data.init_point || data.sandbox_init_point)
          : (data.sandbox_init_point || data.init_point);
        if (!url) {
          alert('No se pudo iniciar el pago (URL no disponible).');
          return;
        }
        w.location.href = url;
      } catch (e) {
        console.error('Error iniciando checkout:', e);
        alert('Error iniciando el pago.');
      }
    }
  };

  w.Payments = Payments;
})(window);
