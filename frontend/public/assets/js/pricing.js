(function (w) {
  const Pricing = {
    _data: null,
    async load() {
      if (this._data) return this._data;
      try {
        const resp = await fetch('/assets/config/pricing.json', { cache: 'no-store' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        this._data = await resp.json();
      } catch (e) {
        console.error('No se pudo cargar pricing.json:', e);
        this._data = { currency: 'CLP', symbol: '$', products: {} };
      }
      return this._data;
    },
    async loadConfig() {
      return await this.load();
    },
    getProduct(sku) {
      return this._data && this._data.products ? this._data.products[sku] : null;
    },
    format(amount) {
      const currency = (this._data && this._data.currency) || 'CLP';
      try {
        return new Intl.NumberFormat('es-CL', {
          style: 'currency',
          currency,
          maximumFractionDigits: 0
        }).format(amount);
      } catch (e) {
        // Fallback simple
        return `$${amount.toLocaleString('es-CL')}`;
      }
    }
  };

  w.Pricing = Pricing;
})(window);
