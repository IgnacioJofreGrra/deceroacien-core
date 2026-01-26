/**
 * GOOGLE ONE TAP - IMPLEMENTACIÓN SEGÚN DOCUMENTACIÓN OFICIAL
 * 
 * Implementación completa de Google One Tap siguiendo las mejores prácticas
 * de la documentación oficial de Google Identity Services.
 * 
 * Características implementadas:
 * - Prompt automático inteligente
 * - Manejo completo de estados (mostrado, omitido, descartado)
 * - Configuración de idioma personalizable
 * - Soporte para auto-select
 * - Integración con el sistema de autenticación existente
 * - Control de páginas donde se muestra
 */

class GoogleOneTap {
    constructor() {
        this.isInitialized = false;
        this.config = this.loadConfiguration();
        
        this.init();
    }

    /**
     * Carga la configuración desde el archivo de configuración pública
     */
    loadConfiguration() {
        const authConfig = window.PublicAuthConfig || {};
        const oneTapConfig = authConfig.oneTap || {};
        const uiConfig = authConfig.ui || {};
        
        return {
            client_id: authConfig.googleClientId || 'CLIENT_ID_WILL_BE_LOADED_DYNAMICALLY',
            callback: this.handleCredentialResponse.bind(this),
            
            // Configuraciones de One Tap según documentación oficial
            auto_select: oneTapConfig.auto_select ?? false,
            cancel_on_tap_outside: oneTapConfig.cancel_on_tap_outside ?? true,
            context: oneTapConfig.context || 'signin',
            use_fedcm_for_prompt: oneTapConfig.use_fedcm_for_prompt ?? true,
            itp_support: oneTapConfig.itp_support ?? true,
            
            // Configuraciones de UI
            locale: uiConfig.locale || 'es',
            ux_mode: oneTapConfig.ux_mode || 'popup',
            
            // Configuraciones internas
            auto_prompt: uiConfig.autoPrompt ?? true,
            showOneTap: uiConfig.showOneTap ?? true
        };
    }

    /**
     * Inicializa Google One Tap según las especificaciones oficiales
     */
    init() {
        // Verificar si One Tap está habilitado en la configuración
        if (!this.config.showOneTap) {
            console.log('Google One Tap está deshabilitado en la configuración');
            return;
        }

        // Verificar disponibilidad de Google Identity Services
        if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
            console.log('Google Identity Services no está disponible');
            return;
        }

        // No mostrar si el usuario ya está autenticado
        if (window.authManager && window.authManager.isUserAuthenticated()) {
            console.log('Usuario ya autenticado, no se muestra One Tap');
            return;
        }

        // No mostrar en páginas de autenticación
        if (this.isAuthPage()) {
            console.log('Página de autenticación detectada, no se muestra One Tap');
            return;
        }

        try {
            // Configuración completa según documentación oficial
            const initConfig = {
                client_id: this.config.client_id,
                callback: this.config.callback,
                auto_select: this.config.auto_select,
                cancel_on_tap_outside: this.config.cancel_on_tap_outside,
                context: this.config.context
            };

            // Agregar configuraciones opcionales si están disponibles
            if (this.config.use_fedcm_for_prompt) {
                initConfig.use_fedcm_for_prompt = this.config.use_fedcm_for_prompt;
            }
            
            if (this.config.itp_support) {
                initConfig.itp_support = this.config.itp_support;
            }

            // Inicializar Google Identity Services
            google.accounts.id.initialize(initConfig);

            // Mostrar el prompt con manejo completo de estados
            if (this.config.auto_prompt) {
                google.accounts.id.prompt((notification) => {
                    this.handlePromptNotification(notification);
                });
            }

            this.isInitialized = true;
            console.log('Google One Tap inicializado correctamente con configuración:', initConfig);

        } catch (error) {
            console.error('Error inicializando Google One Tap:', error);
        }
    }

    /**
     * Verifica si estamos en una página de autenticación
     */
    isAuthPage() {
        const currentPath = window.location.pathname.toLowerCase();
        return currentPath.includes('/auth/') || 
               currentPath.includes('login') || 
               currentPath.includes('register');
    }

    /**
     * Maneja la respuesta de credenciales de One Tap
     * Implementación mejorada según documentación oficial
     */
    handleCredentialResponse(response) {
        try {
            console.log('One Tap credential response recibida');
            
            // Usar la función global mejorada que sigue las mejores prácticas de Google
            if (typeof handleCredentialResponse === 'function') {
                handleCredentialResponse(response);
            } else {
                console.error('handleCredentialResponse global no está disponible');
                
                // Fallback: procesar directamente
                this.processCredentialDirect(response);
            }
        } catch (error) {
            console.error('Error en One Tap credential response:', error);
        }
    }

    /**
     * Procesamiento directo de credenciales como fallback
     */
    processCredentialDirect(response) {
        try {
            // Usar la función de decodificación mejorada si está disponible
            if (typeof decodeJwtResponse === 'function') {
                const payload = decodeJwtResponse(response.credential);
                if (payload) {
                    console.log('Usuario de One Tap:', payload.name, payload.email);
                    // Aquí podrías procesar el usuario directamente si no hay AuthManager
                }
            }
        } catch (error) {
            console.error('Error en fallback de procesamiento:', error);
        }
    }

    /**
     * Maneja las notificaciones del estado del prompt según documentación oficial
     * Implementa todos los momentos definidos por Google: display, skipped, dismissed
     */
    handlePromptNotification(notification) {
        if (notification.isNotDisplayed()) {
            const reason = notification.getNotDisplayedReason();
            console.log('One Tap no se mostró - razón:', reason);
            
            // Según la documentación, estos son los motivos por los que no se muestra:
            // - 'browser_not_supported': Navegador no compatible
            // - 'invalid_client': Client ID inválido
            // - 'missing_client_id': Falta Client ID
            // - 'opt_out_or_no_session': Usuario optó por no mostrar o no hay sesión
            // - 'secure_http_required': Se requiere HTTPS
            // - 'suppressed_by_user': Suprimido por el usuario
            // - 'unregistered_origin': Origen no registrado
            // - 'unknown_reason': Razón desconocida
            
            this.handleNotDisplayed(reason);
            
        } else if (notification.isSkippedMoment()) {
            const reason = notification.getSkippedReason();
            console.log('One Tap fue omitido - razón:', reason);
            
            // Momento omitido: cuando se cierra automática o manualmente
            // - 'auto_cancel': Cancelación automática
            // - 'user_cancel': Usuario canceló manualmente
            // - 'tap_outside': Usuario hizo clic fuera
            // - 'issuing_failed': Falló la emisión de credenciales
            
            this.handleSkipped(reason);
            
        } else if (notification.isDismissedMoment()) {
            const reason = notification.getDismissedReason();
            console.log('One Tap fue descartado - razón:', reason);
            
            // Momento descartado: cuando Google recupera correctamente una credencial
            // o cuando el usuario quiere detener el flujo
            // - 'credential_returned': Credencial devuelta exitosamente
            // - 'cancel_called': Se llamó google.accounts.id.cancel()
            // - 'flow_restarted': Flujo reiniciado
            
            this.handleDismissed(reason);
        }
    }

    /**
     * Maneja cuando One Tap no se muestra
     */
    handleNotDisplayed(reason) {
        // Según documentación: aquí puedes intentar otros proveedores de identidad
        console.log('Considerando métodos alternativos de autenticación');
        
        // Registrar métricas o analytics si es necesario
        if (window.gtag) {
            gtag('event', 'onetap_not_displayed', {
                'reason': reason
            });
        }
    }

    /**
     * Maneja cuando One Tap es omitido
     */
    handleSkipped(reason) {
        // Según documentación: aquí se recomienda continuar con otros proveedores
        console.log('One Tap omitido, usuario puede usar otros métodos de login');
        
        // Registrar métricas
        if (window.gtag) {
            gtag('event', 'onetap_skipped', {
                'reason': reason
            });
        }
    }

    /**
     * Maneja cuando One Tap es descartado
     */
    handleDismissed(reason) {
        // Según documentación: NO intentar otros proveedores de identidad
        console.log('One Tap descartado, no intentar otros métodos automáticamente');
        
        if (reason === 'credential_returned') {
            console.log('Credencial de One Tap obtenida exitosamente');
        }
        
        // Registrar métricas
        if (window.gtag) {
            gtag('event', 'onetap_dismissed', {
                'reason': reason
            });
        }
    }

    /**
     * Cancela manualmente el prompt de One Tap
     */
    cancel() {
        if (this.isInitialized && google.accounts && google.accounts.id) {
            google.accounts.id.cancel();
            console.log('One Tap cancelado manualmente');
        }
    }

    /**
     * Deshabilita One Tap para esta sesión
     */
    disable() {
        if (this.isInitialized && google.accounts && google.accounts.id) {
            google.accounts.id.disableAutoSelect();
            console.log('One Tap deshabilitado para esta sesión');
        }
    }
}

/**
 * Configuración inteligente de inicialización
 */
function initializeGoogleOneTap() {
    // Esperar a que Google Identity Services esté disponible
    let attempts = 0;
    const maxAttempts = 10;
    const checkInterval = 500; // 500ms

    const checkAndInit = () => {
        attempts++;
        
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            // Google está disponible, inicializar One Tap
            window.googleOneTap = new GoogleOneTap();
        } else if (attempts < maxAttempts) {
            // Reintentar después de un tiempo
            setTimeout(checkAndInit, checkInterval);
        } else {
            console.log('Google Identity Services no se cargó después de varios intentos');
        }
    };

    checkAndInit();
}

/**
 * Auto-inicialización cuando el DOM está listo
 */
document.addEventListener('DOMContentLoaded', function() {
    // Esperar un poco para que otros scripts se carguen
    setTimeout(initializeGoogleOneTap, 1000);
});

/**
 * Inicialización alternativa si DOMContentLoaded ya pasó
 */
if (document.readyState === 'loading') {
    // El DOM aún se está cargando
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initializeGoogleOneTap, 1000);
    });
} else {
    // El DOM ya está cargado
    setTimeout(initializeGoogleOneTap, 1000);
}

// Exponer globalmente para control manual si es necesario
window.initializeGoogleOneTap = initializeGoogleOneTap;
