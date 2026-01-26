/**
 * Generador de URLs para Sala de Espera
 * Utilidad para crear enlaces de sala de espera fácilmente
 */

class WaitingRoomUrlGenerator {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl || this.getBaseUrl();
        this.page = 'conexion-vivo.html';
    }

    getBaseUrl() {
        if (typeof window !== 'undefined') {
            return window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
        }
        return '';
    }

    /**
     * Genera URL para reunión con parámetros directos
     * @param {Object} params - Parámetros de la reunión
     * @param {string} params.date - Fecha (YYYY-MM-DD)
     * @param {string} params.time - Hora (HH:MM)  
     * @param {string} params.url - Enlace de la reunión
     * @param {string} [params.title] - Título personalizado
     * @returns {string} URL completa
     */
    generateDirectUrl({ date, time, url, title }) {
        if (!date || !time || !url) {
            throw new Error('Se requieren date, time y url para generar la URL');
        }

        const params = new URLSearchParams();
        params.append('date', date);
        params.append('time', time);  
        params.append('url', url);
        
        if (title) {
            params.append('title', title);
        }

        return `${this.baseUrl}${this.page}?${params.toString()}`;
    }

    /**
     * Genera URL usando configuración predefinida
     * @param {string} meetingId - ID de la reunión en meetings.json
     * @returns {string} URL completa
     */
    generateConfigUrl(meetingId) {
        if (!meetingId) {
            throw new Error('Se requiere meetingId para generar la URL');
        }

        return `${this.baseUrl}${this.page}?meeting=${encodeURIComponent(meetingId)}`;
    }

    /**
     * Genera URL para reunión de hoy
     * @param {string} time - Hora (HH:MM)
     * @param {string} url - Enlace de reunión
     * @param {string} [title] - Título personalizado
     * @returns {string} URL completa
     */
    generateTodayUrl(time, url, title) {
        const today = new Date().toISOString().split('T')[0];
        return this.generateDirectUrl({ date: today, time, url, title });
    }

    /**
     * Genera URL para reunión de mañana
     * @param {string} time - Hora (HH:MM)
     * @param {string} url - Enlace de reunión
     * @param {string} [title] - Título personalizado
     * @returns {string} URL completa
     */
    generateTomorrowUrl(time, url, title) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        return this.generateDirectUrl({ date: dateStr, time, url, title });
    }

    /**
     * Genera múltiples URLs para diferentes plataformas
     * @param {Object} params - Parámetros base
     * @param {string} params.date - Fecha
     * @param {string} params.time - Hora
     * @param {string} params.title - Título base
     * @returns {Object} URLs para diferentes plataformas
     */
    generatePlatformUrls({ date, time, title }) {
        return {
            googleMeet: this.generateDirectUrl({
                date, time, title: `${title} (Google Meet)`,
                url: 'https://meet.google.com/ihf-paiw-baf'
            }),
            zoom: this.generateDirectUrl({
                date, time, title: `${title} (Zoom)`,
                url: 'https://zoom.us/j/123456789'
            }),
            teams: this.generateDirectUrl({
                date, time, title: `${title} (Teams)`,
                url: 'https://teams.microsoft.com/ejemplo'
            })
        };
    }

    /**
     * Valida parámetros de fecha y hora
     * @param {string} date - Fecha (YYYY-MM-DD)
     * @param {string} time - Hora (HH:MM)
     * @returns {boolean} True si son válidos
     */
    validateDateTime(date, time) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const timeRegex = /^\d{2}:\d{2}$/;

        if (!dateRegex.test(date)) {
            throw new Error('Formato de fecha inválido. Use YYYY-MM-DD');
        }

        if (!timeRegex.test(time)) {
            throw new Error('Formato de hora inválido. Use HH:MM');
        }

        const dateObj = new Date(`${date}T${time}:00`);
        if (isNaN(dateObj.getTime())) {
            throw new Error('Fecha u hora inválida');
        }

        return true;
    }

    /**
     * Genera código HTML para insertar en páginas
     * @param {Object} params - Parámetros de la reunión
     * @returns {string} Código HTML
     */
    generateHtmlLink({ date, time, url, title, className = 'btn-waiting-room' }) {
        const waitingUrl = this.generateDirectUrl({ date, time, url, title });
        const displayTitle = title || 'Ir a Sala de Espera';
        
        return `<a href="${waitingUrl}" class="${className}" target="_blank">${displayTitle}</a>`;
    }

    /**
     * Copia URL al portapapeles (solo en navegador)
     * @param {string} url - URL a copiar
     * @returns {Promise<boolean>} True si se copió correctamente
     */
    async copyToClipboard(url) {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(url);
                return true;
            } catch (err) {
                console.error('Error copiando al portapapeles:', err);
                return false;
            }
        }
        return false;
    }
}

// Crear instancia global
if (typeof window !== 'undefined') {
    window.WaitingRoomUrlGenerator = WaitingRoomUrlGenerator;
    window.waitingRoomGenerator = new WaitingRoomUrlGenerator();

    // Métodos de conveniencia globales
    window.generateWaitingRoomUrl = (params) => {
        return window.waitingRoomGenerator.generateDirectUrl(params);
    };

    window.generateTodayMeeting = (time, url, title) => {
        return window.waitingRoomGenerator.generateTodayUrl(time, url, title);
    };

    window.generateTomorrowMeeting = (time, url, title) => {
        return window.waitingRoomGenerator.generateTomorrowUrl(time, url, title);
    };

    console.log('🚀 Generador de URLs de Sala de Espera cargado');
    console.log('Comandos disponibles:');
    console.log('• generateTodayMeeting("17:00", "https://meet.google.com/abc", "Mi Reunión")');
    console.log('• generateTomorrowMeeting("13:00", "https://zoom.us/j/123", "Masterclass")');
    console.log('• waitingRoomGenerator.generateConfigUrl("bootcamp_pmv")');
}

// Para uso en Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WaitingRoomUrlGenerator;
}