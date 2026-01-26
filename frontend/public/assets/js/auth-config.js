/**
 * CONFIGURACIÓN DE AUTENTICACIÓN - VERSIÓN SEGURA
 * 
 * Este archivo ha sido reemplazado por config-secure.js
 * para ocultar credenciales sensibles detectadas por GitHub
 */

// Redirección a la configuración segura
console.warn('⚠️ auth-config.js está deprecado. Usando config-secure.js');

// Solo cargar si no existe ya la configuración
if (!window.PublicAuthConfig) {
    // Fallback básico mientras se carga config-secure.js
    window.PublicAuthConfig = {
        redirectUrls: {
            dashboard: '/auth/dashboard.html',
            default: '/index.html'
        },
        storage: {
            userKey: 'deceroacien_user',
            tokenKey: 'deceroacien_token',
            sessionKey: 'deceroacien_session'
        },
        ui: {
            showOneTap: true,
            autoPrompt: true,
            autoSelect: false,
            cancelOnTapOutside: true,
            theme: 'filled_black',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 300,  // Ancho fijo en píxeles
            locale: 'es',
            context: 'signin'
        },
        oneTap: {
            auto_select: false,
            cancel_on_tap_outside: true,
            context: 'signin',
            use_fedcm_for_prompt: true,
            itp_support: true,
            ux_mode: 'popup'
        },
        api: {
            baseUrl: window.location.hostname === 'localhost' 
                ? 'http://localhost:3001/api' 
                : 'https://api.deceroacien.app/api',
            endpoints: {
                login: '/auth/login',
                register: '/auth/register',
                verify: '/auth/verify',
                refresh: '/auth/refresh',
                logout: '/auth/logout'
            }
        }
    };
}

console.log('� Configuración de autenticación cargada (modo seguro)');
