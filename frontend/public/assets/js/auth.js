/**
 * SISTEMA DE AUTENTICACIÓN CON GOOGLE OAUTH
 * 
 * Este archivo maneja toda la lógica de autenticación del sitio,
 * incluyendo login/registro tradicional y Google OAuth.
 * 
 * FUNCIONALIDADES:
 * - Autenticación con Google OAuth 2.0
 * - Login y registro tradicional
 * - Gestión de sesiones
 * - Validación de formularios
 * - Redirección automática
 */

// Configuración global de autenticación (usando configuración pública)
const AuthConfig = window.PublicAuthConfig || {
    // Fallback básico - las credenciales reales vienen de config-secure.js
    redirectUrls: {
        dashboard: '/auth/dashboard.html',
        default: '/index.html'
    },
    storage: {
        userKey: 'deceroacien_user',
        tokenKey: 'deceroacien_token',
        sessionKey: 'deceroacien_session'
    }
};

/**
 * CLASE PRINCIPAL DE AUTENTICACIÓN
 */
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        
        // Verificar si hay una sesión activa al cargar
        this.checkExistingSession();
        
        // Inicializar event listeners
        this.initializeEventListeners();
    }

    /**
     * Verifica si existe una sesión activa
     */
    checkExistingSession() {
        try {
            const userData = localStorage.getItem(AuthConfig.storage.userKey);
            const token = localStorage.getItem(AuthConfig.storage.tokenKey);
            
            if (userData && token) {
                this.currentUser = JSON.parse(userData);
                this.isAuthenticated = true;
                console.log('Sesión activa encontrada:', this.currentUser);
            }
        } catch (error) {
            console.error('Error al verificar sesión existente:', error);
            this.clearSession();
        }
    }

    /**
     * Inicializa los event listeners para formularios
     */
    initializeEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
            // Enlace "¿Olvidaste tu contraseña?"
            const forgot = document.getElementById('forgotPasswordLink');
            if (forgot) {
                forgot.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    const emailInput = loginForm.querySelector('#email');
                    const prefill = (emailInput && emailInput.value) ? emailInput.value.trim() : '';
                    this.openResetPasswordModal(prefill);
                });
            }
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
    }

    /**
     * Helper: obtiene cliente Supabase si está disponible
     */
    async getSupabaseClient() {
        try {
            if (window.SupabaseAuth && window.SupabaseAuth.ensureSupabase) {
                return await window.SupabaseAuth.ensureSupabase();
            }
        } catch (e) {
            console.warn('[auth] No se pudo inicializar Supabase:', e);
        }
        return null;
    }

    /**
     * Maneja submit de Login con email/contraseña (Supabase primero, fallback legacy)
     */
    async handleLogin(event) {
        event.preventDefault();
        const form = event.currentTarget || document.getElementById('loginForm');
        const email = (form.querySelector('#email') || {}).value?.trim();
        const password = (form.querySelector('#password') || {}).value || '';
        const remember = !!(form.querySelector('#remember-me') || {}).checked;

        if (!email || !password) {
            this.showError('Ingresa tu correo y contraseña.');
            return;
        }
        this.showLoading('loginButton', 'Ingresando…');
        try {
            // Intentar con Supabase
            const sb = await this.getSupabaseClient();
            if (sb && sb.auth && sb.auth.signInWithPassword) {
                const { data, error } = await sb.auth.signInWithPassword({ email, password });
                if (error) throw error;
                // Persistencia se maneja en supabase-client.onAuthStateChange
                if (remember) {
                    try { localStorage.setItem(AuthConfig.storage.sessionKey, 'persistent'); } catch(_){}
                }
                this.redirectAfterAuth();
                return;
            }
            // Fallback (Firebase/legacy)
            const res = await this.authenticateUser(email, password);
            if (res && res.success) {
                this.handleSuccessfulAuth(res.user, res.token, remember);
            } else {
                throw new Error((res && res.message) || 'No se pudo iniciar sesión.');
            }
        } catch (e) {
            const msg = (e && (e.message||e.error_description||e.error_message)) ? String(e.message||e.error_description||e.error_message) : 'Error al iniciar sesión';
            const lower = msg.toLowerCase();
            // Caso: email no confirmado
            if (lower.includes('confirm')) {
                const container = document.getElementById('loginInlineAlert');
                const safeEmail = (email||'');
                if (container) {
                    container.style.display = 'block';
                    container.innerHTML = `Tu cuenta no está confirmada. Revisa tu correo o <a href="#" id="resendConfLogin" class="text-yellow-400 underline">reenviar confirmación</a>.`;
                    const btn = document.getElementById('resendConfLogin');
                    btn && (btn.onclick = async (ev)=>{
                        ev.preventDefault();
                        try { await this.resendConfirmation(safeEmail); container.innerHTML = 'Hemos reenviado el correo de confirmación. Revisa tu bandeja.'; } catch(ex) { this.showError((ex && ex.message) || 'No se pudo reenviar.'); }
                    });
                } else {
                    this.showError('Tu cuenta no está confirmada. Revisa tu correo.');
                }
                return;
            }
            this.showError(msg);
        } finally {
            this.hideLoading('loginButton', 'Iniciar Sesión');
        }
    }

    /**
     * Maneja submit de Registro con email/contraseña (Supabase primero, fallback legacy)
     */
    async handleRegister(event) {
        event.preventDefault();
        const form = event.currentTarget || document.getElementById('registerForm');
        const firstName = (form.querySelector('#firstName') || {}).value?.trim();
        const lastName = (form.querySelector('#lastName') || {}).value?.trim();
        const email = (form.querySelector('#email') || {}).value?.trim();
        const password = (form.querySelector('#password') || {}).value || '';
        const confirmPassword = (form.querySelector('#confirmPassword') || {}).value || '';
        const company = (form.querySelector('#company') || {}).value?.trim();
        const termsAccepted = !!(form.querySelector('#terms') || {}).checked;
        const newsletter = !!(form.querySelector('#newsletter') || {}).checked;
        // Validaciones básicas
        if (!firstName || !lastName) { this.showError('Completa tu nombre y apellido.'); return; }
        if (!email) { this.showError('Ingresa tu correo.'); return; }
        if (!password) { this.showError('Ingresa una contraseña.'); return; }
        if (password !== confirmPassword) { this.showError('Las contraseñas no coinciden.'); return; }
        if (!termsAccepted) { this.showError('Debes aceptar los Términos y Condiciones.'); return; }
        // Política mínima: 8+, mayúsculas, minúsculas y números (recomendado)
        try {
            const hasMin = password.length >= 8;
            const hasUpper = /[A-ZÁÉÍÓÚÑ]/.test(password);
            const hasLower = /[a-záéíóúñ]/.test(password);
            const hasNum = /[0-9]/.test(password);
            if (!(hasMin && hasUpper && hasLower && hasNum)) {
                this.showError('La contraseña debe tener mínimo 8 caracteres, incluir mayúsculas, minúsculas y números.');
                return;
            }
        } catch(_){}

        this.showLoading('registerButton', 'Creando cuenta…');
        try {
            const sb = await this.getSupabaseClient();
            if (sb && sb.auth && sb.auth.signUp) {
                const { data, error } = await sb.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { first_name: firstName, last_name: lastName, company: company || null, newsletter: !!newsletter },
                        emailRedirectTo: (window.location && window.location.origin ? window.location.origin : '') + '/auth/login.html'
                    }
                });
                if (error) throw error;
                // Si requiere verificación por email, session será null
                const needsConfirm = !data.session;
                if (needsConfirm) {
                    try { localStorage.setItem('deceroacien_pending_confirmation_email', email); } catch(_){}
                    // Mostrar CTA de reenviar confirmación en el registro
                    const container = document.getElementById('registerInlineAlert');
                    if (container) {
                        container.style.display = 'block';
                        container.innerHTML = `Te enviamos un correo para confirmar tu cuenta. <a href="#" id="resendConfRegister" class="text-yellow-400 underline">Reenviar confirmación</a> · <a href="login.html" class="text-yellow-400 underline">Ir al login</a>`;
                        const btn = document.getElementById('resendConfRegister');
                        btn && (btn.onclick = async (ev)=>{
                            ev.preventDefault();
                            try { await this.resendConfirmation(email); container.innerHTML = 'Hemos reenviado el correo de confirmación. Revisa tu bandeja.'; } catch(ex) { this.showError((ex && ex.message) || 'No se pudo reenviar.'); }
                        });
                    } else {
                        this.showSuccess('Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja de entrada.');
                    }
                    return;
                } else {
                    // Sesión activa inmediatamente
                    this.redirectAfterAuth();
                    return;
                }
            }
            // Fallback a registro legacy
            const res = await this.registerUser({ firstName, lastName, email, password, company, newsletter });
            if (res && res.success) {
                this.handleSuccessfulAuth(res.user, res.token, true);
            } else {
                throw new Error((res && res.message) || 'No se pudo crear la cuenta.');
            }
        } catch (e) {
            const msg = (e && (e.message||e.error_description||e.error_message)) ? String(e.message||e.error_description||e.error_message) : 'Error al crear la cuenta';
            const lower = msg.toLowerCase();
            // Caso: usuario ya registrado
            if (lower.includes('already') && lower.includes('registered')) {
                const container = document.getElementById('registerInlineAlert');
                const html = `Ese correo ya está registrado. <a href="login.html" class="text-yellow-400 underline">Inicia sesión</a> o <a href="login.html" class="text-yellow-400 underline" id="goResetFromRegister">restablece tu contraseña</a>.`;
                if (container) {
                    container.style.display = 'block';
                    container.innerHTML = html;
                    const go = document.getElementById('goResetFromRegister');
                    go && (go.onclick = (ev)=>{ ev.preventDefault(); try { window.location.href = 'login.html?forgot=1&email=' + encodeURIComponent(email||''); } catch(_){} });
                } else {
                    this.showError('Ese correo ya está registrado. Ve a Iniciar sesión o restablece tu contraseña.');
                }
                return;
            }
            this.showError(msg);
        } finally {
            this.hideLoading('registerButton', 'Crear Cuenta');
        }
    }

    /**
     * Solicita email de recuperación de contraseña (Supabase)
     */
    async requestPasswordReset(email) {
        try {
            const sb = await this.getSupabaseClient();
            if (!sb) throw new Error('Servicio de autenticación no disponible.');
            let targetEmail = email && /@/.test(email) ? email : null;
            if (!targetEmail) {
                try { targetEmail = (prompt('Ingresa tu correo para recuperar tu contraseña')||'').trim(); } catch(_){ }
            }
            if (!targetEmail) { this.showError('Debes ingresar un correo válido.'); return; }
            const redirectTo = (window.location && window.location.origin ? window.location.origin : '') + '/auth/reset-password.html';
            const { error } = await sb.auth.resetPasswordForEmail(targetEmail, { redirectTo });
            if (error) throw error;
            this.showSuccess('Si el correo existe, te enviamos un enlace para restablecer tu contraseña.');
        } catch(e) {
            const msg = e && e.message ? e.message : 'No se pudo iniciar la recuperación.';
            this.showError(msg);
        }
    }

    /**
     * Actualiza la contraseña del usuario autenticado en sesión de recuperación
     */
    async updatePassword(newPassword) {
        const sb = await this.getSupabaseClient();
        if (!sb) throw new Error('Servicio de autenticación no disponible.');
        const { data: sessionData } = await sb.auth.getSession();
        if (!sessionData || !sessionData.session) throw new Error('Sesión de recuperación no encontrada. Abre el enlace de tu correo.');
        const { error } = await sb.auth.updateUser({ password: newPassword });
        if (error) throw error;
        return true;
    }

    /**
     * Reenvía correo de confirmación (signup)
     */
    async resendConfirmation(email) {
        const sb = await this.getSupabaseClient();
        if (!sb) throw new Error('Servicio de autenticación no disponible.');
        const target = email || (function(){ try { return localStorage.getItem('deceroacien_pending_confirmation_email') || ''; } catch(_) { return ''; }})();
        if (!target) throw new Error('No se puede determinar el correo a reenviar.');
        const { error } = await sb.auth.resend({ type: 'signup', email: target });
        if (error) throw error;
        try { localStorage.setItem('deceroacien_pending_confirmation_email', target); } catch(_){}
        return true;
    }

    /**
     * Abre el modal de recuperación de contraseña en login (si existe en el DOM)
     */
    openResetPasswordModal(prefillEmail) {
        try {
            const modal = document.getElementById('resetModal');
            const resetEmail = document.getElementById('resetEmail');
            if (resetEmail && prefillEmail) resetEmail.value = prefillEmail;
            if (modal) modal.style.display = 'flex';
            const close = () => { if (modal) modal.style.display = 'none'; };
            const cancelBtn = document.getElementById('resetCancel');
            const submitBtn = document.getElementById('resetSubmit');
            cancelBtn && (cancelBtn.onclick = close);
            submitBtn && (submitBtn.onclick = async () => {
                const mail = (resetEmail && resetEmail.value || '').trim();
                if (!mail || !/@/.test(mail)) { this.showError('Ingresa un correo válido.'); return; }
                await this.requestPasswordReset(mail);
                close();
                const fb = document.getElementById('passwordResetFeedback');
                if (fb) { fb.style.display = 'block'; fb.textContent = 'Si el correo existe, te enviamos un enlace para restablecer tu contraseña.'; }
            });
        } catch(_){ }
    }

    // (Firebase legacy eliminado)
    /**
     * Simula autenticación (reemplazar con API real)
     */
    async authenticateUser(email, password) {
        // Simulación de delay de red
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Aquí iría tu lógica real de autenticación
        // Por ahora, simulamos una respuesta exitosa para demo
        if (email === 'demo@deceroacien.app' && password === 'demo123') {
            return {
                success: true,
                user: {
                    id: '1',
                    email: email,
                    firstName: 'Usuario',
                    lastName: 'Demo',
                    company: 'DE CERO A CIEN'
                },
                token: 'demo_token_' + Date.now()
            };
        }
        
        return {
            success: false,
            message: 'Credenciales incorrectas'
        };
    }

    /**
     * Simula registro (reemplazar con API real)
     */
    async registerUser(userData) {
        // Simulación de delay de red
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Aquí iría tu lógica real de registro
        // Por ahora, simulamos una respuesta exitosa
        return {
            success: true,
            user: {
                id: Date.now().toString(),
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                company: userData.company || ''
            },
            token: 'new_user_token_' + Date.now()
        };
    }

    /**
     * Maneja autenticación exitosa
     */
    handleSuccessfulAuth(user, token, remember = false) {
        this.currentUser = user;
        this.isAuthenticated = true;
        
        // Guardar en localStorage
        localStorage.setItem(AuthConfig.storage.userKey, JSON.stringify(user));
        localStorage.setItem(AuthConfig.storage.tokenKey, token);
        
        if (remember) {
            localStorage.setItem(AuthConfig.storage.sessionKey, 'persistent');
        }
        
        console.log('Autenticación exitosa:', user);
        
        // Redireccionar
        this.redirectAfterAuth();
    }

    /**
     * Redirige después de autenticación exitosa
     */
    redirectAfterAuth() {
        // Obtener URL de retorno si existe
        const urlParams = new URLSearchParams(window.location.search);
        const returnUrl = urlParams.get('return');
        
        if (returnUrl) {
            window.location.href = decodeURIComponent(returnUrl);
        } else {
            // Determinar la ruta correcta según la ubicación actual
            const currentPath = window.location.pathname;
            let redirectPath;
            
            if (currentPath.includes('/auth/')) {
                // Estamos en una página de auth, usar ruta relativa
                redirectPath = 'dashboard.html';
            } else {
                // Estamos en otra página, usar ruta absoluta
                redirectPath = '/auth/dashboard.html';
            }
            
            window.location.href = redirectPath;
        }
    }

    /**
     * Cierra sesión (Supabase primero, con fallbacks) y redirige
     */
    async logout() {
        // 1) Intentar cerrar sesión en Supabase (si está disponible)
        try {
            const sb = await this.getSupabaseClient();
            if (sb && sb.auth && sb.auth.signOut) {
                await sb.auth.signOut();
            }
        } catch (e) {
            console.warn('[auth] signOut supabase falló o no disponible:', e && e.message ? e.message : e);
        }

        // 2) Intentar cerrar sesión en Firebase (si el wrapper está presente)
        try {
            if (window.firebaseAuthHelpers && typeof window.firebaseAuthHelpers.logout === 'function') {
                await window.firebaseAuthHelpers.logout();
            }
        } catch (_) { /* opcional */ }

        // 3) Limpiar sesión local y difundir a otras pestañas
        try {
            // Marcar broadcast de logout para sincronización entre pestañas
            localStorage.setItem('deceroacien_logout_broadcast', String(Date.now()));
        } catch(_){ }
        this.clearSession();

        // 4) Redireccionar a inicio (respetando contexto /auth/)
        const currentPath = window.location.pathname;
        const redirectPath = currentPath.includes('/auth/') ? '../index.html' : '/index.html';
        window.location.href = redirectPath;
    }

    /**
     * Limpia la sesión
     */
    clearSession() {
        this.currentUser = null;
        this.isAuthenticated = false;
        
        localStorage.removeItem(AuthConfig.storage.userKey);
        localStorage.removeItem(AuthConfig.storage.tokenKey);
        localStorage.removeItem(AuthConfig.storage.sessionKey);
        // Limpiar entitlements y señales auxiliares
        try {
            localStorage.removeItem('deceroacien_entitlements');
            localStorage.setItem('deceroacien_entitlements_updated', String(Date.now()));
            localStorage.removeItem('deceroacien_pending_confirmation_email');
        } catch(_){ }
    }

    /**
     * Muestra estado de carga en botón
     */
    showLoading(buttonId, loadingText) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = true;
            button.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-black inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ${loadingText}
            `;
        }
    }

    /**
     * Oculta estado de carga en botón
     */
    hideLoading(buttonId, originalText) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }

    /**
     * Muestra mensaje de error
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Muestra mensaje de éxito
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * Sistema de notificaciones
     */
    showNotification(message, type = 'info') {
        // Remover notificación existente si hay una
        const existingNotification = document.getElementById('auth-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.id = 'auth-notification';
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 ${
            type === 'error' ? 'bg-red-600 text-white' :
            type === 'success' ? 'bg-green-600 text-white' :
            'bg-blue-600 text-white'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    ${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium">${message}</p>
                </div>
                <div class="ml-auto pl-3">
                    <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200">
                        <span class="sr-only">Cerrar</span>
                        ✖
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Obtiene el usuario actual
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Verifica si el usuario está autenticado
     */
    isUserAuthenticated() {
        return this.isAuthenticated;
    }
}


/**
 * Inicializar el gestor de autenticación cuando se carga la página
 */
let authManager;

// Función de inicialización robusta
function initializeAuthManager() {
    if (!authManager) {
        authManager = new AuthManager();
        window.authManager = authManager;
        console.log('Sistema de autenticación inicializado');
    }
    return authManager;
}

// Inicialización múltiple para asegurar disponibilidad
document.addEventListener('DOMContentLoaded', function() {
    initializeAuthManager();
});

// Inicialización inmediata si el DOM ya está listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuthManager);
} else {
    initializeAuthManager();
}

// Asegurar que esté disponible globalmente
window.initializeAuthManager = initializeAuthManager;
// Exponer helpers para flujos externos
window.AuthFlows = {
    requestPasswordReset: (...args) => { try { return authManager.requestPasswordReset(...args); } catch(e){ throw e; } },
    updatePassword: (...args) => { try { return authManager.updatePassword(...args); } catch(e){ throw e; } },
    resendConfirmation: (...args) => { try { return authManager.resendConfirmation(...args); } catch(e){ throw e; } },
    openResetModal: (...args) => { try { return authManager.openResetPasswordModal(...args); } catch(e){ throw e; } }
};

/**
 * FUNCIONES UTILITY PARA PROTEGER PÁGINAS
 */

/**
 * Protege una página requiriendo autenticación
 */
function requireAuth() {
    if (!authManager || !authManager.isUserAuthenticated()) {
        const currentUrl = encodeURIComponent(window.location.href);
        const currentPath = window.location.pathname;
        let loginPath;
        
        if (currentPath.includes('/auth/')) {
            // Estamos en una página de auth, usar ruta relativa
            loginPath = `login.html?return=${currentUrl}`;
        } else {
            // Estamos en otra página, usar ruta absoluta
            loginPath = `/auth/login.html?return=${currentUrl}`;
        }
        
        window.location.href = loginPath;
        return false;
    }
    return true;
}

/**
 * Redirige usuarios autenticados lejos de páginas de auth
 */
function redirectIfAuthenticated() {
    if (authManager && authManager.isUserAuthenticated()) {
        const currentPath = window.location.pathname;
        let dashboardPath;
        
        if (currentPath.includes('/auth/')) {
            // Estamos en una página de auth, usar ruta relativa
            dashboardPath = 'dashboard.html';
        } else {
            // Estamos en otra página, usar ruta absoluta
            dashboardPath = '/auth/dashboard.html';
        }
        
        window.location.href = dashboardPath;
        return true;
    }
    return false;
}

// Exponer funciones globalmente si es necesario
window.authManager = authManager;
window.requireAuth = requireAuth;
window.redirectIfAuthenticated = redirectIfAuthenticated;

// =============================
// Integración Firebase Auth (opcional)
// =============================
(function(){
    function attachFirebaseIntegration(){
        if (!window.__firebaseAuth) return; // Aún no inicializado por firebase-client
        const fbAuth = window.__firebaseAuth;
        // Estado de conocimiento de auth
        window.__firebaseAuthKnown = false;

        async function syncServerEntitlements(idToken){
            try {
                // Construir URL del backend (prod/dev) desde PublicAuthConfig si está disponible
                const api = (window.PublicAuthConfig && window.PublicAuthConfig.api) || null;
                const mePath = (api && api.endpoints && api.endpoints.me) ? api.endpoints.me : '/auth/me';
                const url = api && api.baseUrl ? (api.baseUrl + mePath) : ('/api' + mePath);
                const verifyPath = (api && api.endpoints && api.endpoints.verify) ? api.endpoints.verify : '/auth/verify';
                const verifyUrl = api && api.baseUrl ? (api.baseUrl + verifyPath) : ('/api' + verifyPath);

                // 1) Intentar provisionar/verificar usuario en backend (idempotente)
                try {
                    await fetch(verifyUrl, {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + idToken, 'Accept': 'application/json' },
                        body: null
                    });
                } catch(_) { /* si falla, seguimos, el backend puede no requerirlo */ }

                // 2) Consultar /auth/me con pequeños reintentos (por eventual consistencia)
                const fetchMe = async () => fetch(url, { headers: { 'Authorization': 'Bearer ' + idToken, 'Accept': 'application/json' } });
                let resp = await fetchMe();
                if (!resp.ok && !(window.Environment && window.Environment.isDevelopment)) {
                    // reintentos cortos en prod
                    for (let i=0;i<2 && !resp.ok;i++) {
                        await new Promise(r=> setTimeout(r, 400*(i+1)));
                        resp = await fetchMe();
                    }
                }
                if (!resp.ok) {
                    // Fallback de desarrollo: si no hay backend local, usar datos de Firebase para habilitar sesión local
                    try {
                        const isDev = !!(window.Environment && window.Environment.isDevelopment);
                        const u = fbAuth && fbAuth.currentUser;
                        if (isDev && u) {
                            const pref = (localStorage.getItem('deceroacien_avatar_pref') || 'male').toLowerCase();
                            const fallbackAvatar = pref === 'female' ? '/assets/female-avatar.png' : '/assets/male-avatar.png';
                            const simpleUser = {
                                id: u.uid,
                                email: u.email || (u.providerData && u.providerData[0] && u.providerData[0].email) || '',
                                firstName: (u.displayName && u.displayName.split(' ')[0]) || 'Usuario',
                                lastName: (u.displayName && u.displayName.split(' ').slice(1).join(' ')) || '',
                                profilePicture: (u.photoURL) || fallbackAvatar
                            };
                            localStorage.setItem(AuthConfig.storage.userKey, JSON.stringify(simpleUser));
                            localStorage.setItem(AuthConfig.storage.tokenKey, idToken);
                            if (window.authManager) {
                                window.authManager.currentUser = simpleUser;
                                window.authManager.isAuthenticated = true;
                            }
                            console.warn('[dev-fallback] /api/auth/me no disponible; usando datos de Firebase para sesión local.');
                        }
                    } catch(_e) {}
                    // En producción: mostrar notificación visible
                    if (!(window.Environment && window.Environment.isDevelopment)) {
                        const msg = 'No se pudo obtener tu perfil desde el servidor (status ' + (resp.status||'') + ').';
                        if (window.authManager && window.authManager.showError) window.authManager.showError(msg);
                    }
                    return; // terminar sin romper flujo local
                }
                const data = await resp.json();
                if (data && data.enrollments && Array.isArray(data.enrollments)) {
                    if (window.entitlements && window.entitlements.setAll) {
                        window.entitlements.setAll(data.enrollments);
                    } else {
                        // fallback directo localStorage
                        localStorage.setItem('deceroacien_entitlements', JSON.stringify(data.enrollments));
                        localStorage.setItem('deceroacien_entitlements_updated', Date.now().toString());
                    }
                }
                // Persist simple user for UI reuse
                if (data.user) {
                    // Enriquecer con foto del usuario de Firebase si existe; si no, aplicar preferencia de avatar genérico
                    const uFb = (typeof fbAuth !== 'undefined' && fbAuth && fbAuth.currentUser) ? fbAuth.currentUser : null;
                    let picture = (uFb && uFb.photoURL) || data.user.photo_url || data.user.picture || '';
                    if (!picture) {
                        const pref = (localStorage.getItem('deceroacien_avatar_pref') || 'male').toLowerCase();
                        picture = pref === 'female' ? '/assets/female-avatar.png' : '/assets/male-avatar.png';
                    }
                    const simpleUser = {
                        id: data.user.id,
                        email: data.user.email,
                        firebase_uid: data.user.firebase_uid,
                        firstName: data.user.first_name,
                        lastName: data.user.last_name,
                        profilePicture: picture
                    };
                    localStorage.setItem(AuthConfig.storage.userKey, JSON.stringify(simpleUser));
                    localStorage.setItem(AuthConfig.storage.tokenKey, idToken);
                    if (window.authManager) {
                        window.authManager.currentUser = simpleUser;
                        window.authManager.isAuthenticated = true;
                    }
                }
            } catch(e){ console.warn('syncServerEntitlements error', e); }
        }

        fbAuth.onAuthStateChanged(async (user)=>{
            window.__firebaseAuthKnown = true;
            if (user) {
                try {
                    const idToken = await user.getIdToken(/* forceRefresh */ true);
                    await syncServerEntitlements(idToken);
                } catch(e){ console.error('Error obteniendo idToken Firebase', e); }
            } else {
                // sign out
                localStorage.removeItem(AuthConfig.storage.userKey);
                localStorage.removeItem(AuthConfig.storage.tokenKey);
                if (window.authManager){
                    window.authManager.currentUser = null;
                    window.authManager.isAuthenticated = false;
                }
            }
        });

        // Exponer helpers
        window.firebaseAuthHelpers = {
            async loginEmailPassword(email, password){
                await fbAuth.signInWithEmailAndPassword(email, password);
                const user = fbAuth.currentUser;
                const token = user ? await user.getIdToken() : null;
                return { success: true, token };
            },
            async registerEmailPassword(email, password){
                await fbAuth.createUserWithEmailAndPassword(email, password);
                const user = fbAuth.currentUser;
                const token = user ? await user.getIdToken() : null;
                return { success: true, token };
            },
            async logout(){
                await fbAuth.signOut();
            },
            async getToken(){
                const user = fbAuth.currentUser;
                if (!user) return null;
                return user.getIdToken();
            },
            async manualSync(){
                const user = fbAuth.currentUser;
                if (!user) return;
                const t = await user.getIdToken(true);
                await syncServerEntitlements(t);
            }
        };

        // Parchear métodos existentes del AuthManager si existe
        if (window.authManager) {
            const mgr = window.authManager;
            mgr.authenticateUser = async function(email, password){
                try {
                    const r = await window.firebaseAuthHelpers.loginEmailPassword(email, password);
                    if (r.success) {
                        const token = await window.firebaseAuthHelpers.getToken();
                        return { success: true, user: { email }, token };
                    }
                } catch(e){
                    return { success:false, message: e.message };
                }
                return { success:false, message: 'login_failed' };
            };
            mgr.registerUser = async function(data){
                try {
                    const r = await window.firebaseAuthHelpers.registerEmailPassword(data.email, data.password);
                    if (r.success) {
                        const token = await window.firebaseAuthHelpers.getToken();
                        return { success: true, user: { email: data.email }, token };
                    }
                } catch(e){
                    return { success:false, message: e.message };
                }
                return { success:false };
            };
            mgr.logout = async function(){
                try { await window.firebaseAuthHelpers.logout(); } catch(_) {}
                mgr.clearSession();
                const currentPath = window.location.pathname;
                window.location.href = currentPath.includes('/auth/') ? '../index.html' : '/index.html';
            };
        }
    }

    // Inicializa inmediatamente si ya está listo; si no, engancha al evento del loader centralizado
    if (window.__firebaseAuth) {
        attachFirebaseIntegration();
    } else {
        document.addEventListener('firebase:sdk-ready', function(){
            // Pequeño delay para permitir que firebase-client inicialice __firebaseAuth tras el evento
            setTimeout(attachFirebaseIntegration, 0);
        }, { once: true });
    }
})();
