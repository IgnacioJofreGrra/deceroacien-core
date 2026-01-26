/**
 * CONFIGURACIÓN SEGURA - CREDENCIALES OCULTAS
 * 
 * Sistema de configuración que oculta credenciales sensibles
 * incluso las que son técnicamente "públicas" pero GitHub detecta como sensibles
 */

// Configuración pública (sin secretos)
const SecureAuthConfig = {
    // URLs de redirección
    redirectUrls: {
        dashboard: '/auth/dashboard.html',
        default: '/index.html'
    },
    
    // Configuración de localStorage
    storage: {
        userKey: 'deceroacien_user',
        tokenKey: 'deceroacien_token',
        sessionKey: 'deceroacien_session'
    },
    
    // Endpoints de API
    api: {
        baseUrl: window.location.hostname === 'localhost' 
            ? 'http://localhost:3001/api' 
            : 'https://api.deceroacien.app/api',
        endpoints: {
            login: '/auth/login',
            register: '/auth/register',
            verify: '/auth/verify',
            refresh: '/auth/refresh',
            logout: '/auth/logout',
            me: '/auth/me'
        }
    }
};

// Detectar entorno
const Environment = {
    isDevelopment: window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1',
    isProduction: window.location.hostname === 'deceroacien.app' || 
                  window.location.hostname === 'www.deceroacien.app',
    
    getBaseUrl() {
        if (this.isDevelopment) {
            return 'http://localhost:3000';
        }
        return 'https://deceroacien.app';
    }
};

// Exponer configuración globalmente (compatible con el sistema anterior)
window.PublicAuthConfig = {
    ...SecureAuthConfig
};
window.Environment = Environment;

console.log('🔒 Configuración segura cargada (credenciales ocultas)');
console.log('🌍 Entorno detectado:', Environment.isDevelopment ? 'Desarrollo' : 'Producción');
