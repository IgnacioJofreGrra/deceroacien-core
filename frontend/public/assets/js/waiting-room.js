/**
 * Sala de Espera - Sistema de Conexión en Vivo
 * Sistema modular y configurable para múltiples reuniones
 */

class WaitingRoom {
    constructor(config) {
        this.config = this.validateConfig(config);
        this.elements = {};
        this.intervals = {};
        this.audio = null;
        this.isAudioReady = false;
        this.currentVolume = 0.25;
        this.isMuted = false;
        
        this.init();
    }
    
    validateConfig(config) {
        // Configuración por defecto
        const defaults = {
            meetingUrl: 'https://meet.google.com/default',
            audioPath: 'assets/audio/sientes-dudas-al-empezar.mp3',
            autoRedirect: true,
            showTimezones: true,
            defaultVolume: 0.25
        };
        
        // Validar que tenga fecha y hora
        if (!config.date || !config.time) {
            throw new Error('Se requiere fecha (YYYY-MM-DD) y hora (HH:MM) de la reunión');
        }
        
        // Validar formato de fecha
        if (!/^\d{4}-\d{2}-\d{2}$/.test(config.date)) {
            throw new Error('Formato de fecha inválido. Use YYYY-MM-DD');
        }
        
        // Validar formato de hora
        if (!/^\d{2}:\d{2}$/.test(config.time)) {
            throw new Error('Formato de hora inválido. Use HH:MM (24 horas)');
        }
        
        return { ...defaults, ...config };
    }
    
    init() {
        this.cacheElements();
        this.setupAudio();
        this.setupEventListeners();
        this.updateTimezones();
        this.startCountdown();
    }
    
    cacheElements() {
        this.elements = {
            audio: document.getElementById('background-music'),
            playPauseBtn: document.getElementById('play-pause-btn'),
            playPauseIcon: document.getElementById('play-pause-icon'),
            messageEl: document.getElementById('message'),
            hoursEl: document.getElementById('hours'),
            minutesEl: document.getElementById('minutes'),
            secondsEl: document.getElementById('seconds'),
            hoursUnit: document.getElementById('hours-unit'),
            volumeDownBtn: document.getElementById('volume-down'),
            volumeUpBtn: document.getElementById('volume-up'),
            muteBtn: document.getElementById('mute-btn'),
            muteIcon: document.getElementById('mute-icon'),
            volumeFill: document.getElementById('volume-fill'),
            meetingTitle: document.getElementById('meeting-title'),
            meetingDate: document.getElementById('meeting-date'),
            timezoneGrid: document.querySelector('.timezone-grid')
        };
        
        this.audio = this.elements.audio;
    }
    
    setupAudio() {
        if (!this.audio) return;
        
        // Configurar ruta del audio
        this.audio.src = this.config.audioPath;
        this.currentVolume = this.config.defaultVolume;
        this.audio.volume = this.currentVolume;
        
        // Event listeners del audio
        this.audio.addEventListener('loadedmetadata', () => {
            this.isAudioReady = true;
            this.attemptAutoplay();
        });
        
        this.audio.addEventListener('canplaythrough', () => {
            if (!this.isAudioReady) {
                this.isAudioReady = true;
                this.attemptAutoplay();
            }
        });
        
        this.audio.addEventListener('error', (e) => {
            console.warn('Error cargando audio:', e);
            this.updateMessage('Audio no disponible. El countdown continúa normalmente.');
        });
        
        this.audio.addEventListener('play', () => this.onAudioPlay());
        this.audio.addEventListener('pause', () => this.onAudioPause());
        
        this.updateVolumeDisplay();
    }
    
    attemptAutoplay() {
        this.audio.play().then(() => {
            // Autoplay exitoso
        }).catch(e => {
            // Autoplay bloqueado, mostrar botón
            if (this.elements.playPauseBtn) {
                this.elements.playPauseBtn.style.display = 'flex';
                this.elements.playPauseBtn.classList.add('pulse');
            }
        });
    }
    
    setupEventListeners() {
        // Controles de audio
        if (this.elements.playPauseBtn) {
            this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }
        
        if (this.elements.volumeDownBtn) {
            this.elements.volumeDownBtn.addEventListener('click', () => this.adjustVolume(-0.1));
        }
        
        if (this.elements.volumeUpBtn) {
            this.elements.volumeUpBtn.addEventListener('click', () => this.adjustVolume(0.1));
        }
        
        if (this.elements.muteBtn) {
            this.elements.muteBtn.addEventListener('click', () => this.toggleMute());
        }
    }
    
    getMeetingDateTime() {
        try {
            // Crear fecha UTC basada en la configuración
            const [year, month, day] = this.config.date.split('-');
            const [hours, minutes] = this.config.time.split(':');
            
            // Crear fecha en zona horaria de Montevideo (UTC-3)
            // Convertir a UTC agregando 3 horas
            const utcHours = parseInt(hours) + 3;
            const meetingDate = new Date(`${year}-${month}-${day}T${utcHours.toString().padStart(2, '0')}:${minutes}:00.000Z`);
            
            return meetingDate;
        } catch (error) {
            console.error('Error creando fecha de reunión:', error);
            return null;
        }
    }
    
    getTimeUntilMeeting() {
        const meetingDate = this.getMeetingDateTime();
        if (!meetingDate) return 0;
        
        const now = new Date();
        const timeDiff = meetingDate.getTime() - now.getTime();
        const secondsRemaining = Math.floor(timeDiff / 1000);
        
        // Debug info
        console.log('Reunión programada (UTC):', meetingDate.toUTCString());
        console.log('Hora actual (UTC):', now.toUTCString());
        console.log('Segundos restantes:', secondsRemaining);
        
        return Math.max(0, secondsRemaining);
    }
    
    updateCountdown(timeInSeconds) {
        if (timeInSeconds <= 0) {
            this.elements.hoursEl.textContent = '00';
            this.elements.minutesEl.textContent = '00';
            this.elements.secondsEl.textContent = '00';
            this.elements.hoursUnit.style.display = 'none';
            return;
        }
        
        const hours = Math.floor(timeInSeconds / 3600);
        const minutes = Math.floor((timeInSeconds % 3600) / 60);
        const seconds = timeInSeconds % 60;
        
        // Mostrar horas solo si es mayor a 0
        if (hours > 0) {
            this.elements.hoursEl.textContent = String(hours).padStart(2, '0');
            this.elements.hoursUnit.style.display = 'flex';
        } else {
            this.elements.hoursUnit.style.display = 'none';
        }
        
        this.elements.minutesEl.textContent = String(minutes).padStart(2, '0');
        this.elements.secondsEl.textContent = String(seconds).padStart(2, '0');
    }
    
    updateMessage(message, type = 'normal') {
        if (!this.elements.messageEl) return;
        
        this.elements.messageEl.textContent = message;
        this.elements.messageEl.className = 'status-message';
        
        if (type === 'urgent') {
            this.elements.messageEl.classList.add('urgent');
        } else if (type === 'critical') {
            this.elements.messageEl.classList.add('critical');
        }
    }
    
    getMessageForTime(secondsRemaining) {
        if (secondsRemaining > 3600) {
            const hoursRemaining = Math.floor(secondsRemaining / 3600);
            return `Faltan ${hoursRemaining} hora(s) para la reunión. Disfruta la música de espera.`;
        } else if (secondsRemaining > 1800) {
            return 'La reunión comenzará en menos de una hora. ¡Prepárate!';
        } else if (secondsRemaining > 300) {
            return '¡La reunión comenzará pronto! Música de espera activada.';
        } else if (secondsRemaining > 60) {
            return '🔔 ¡La reunión comenzará en menos de 5 minutos!';
        } else if (secondsRemaining > 30) {
            return '⚡ ¡La reunión comenzará en menos de un minuto!';
        } else {
            return '🚀 ¡Conectando en segundos...!';
        }
    }
    
    startCountdown() {
        const updateTimer = () => {
            const secondsRemaining = this.getTimeUntilMeeting();
            
            if (secondsRemaining <= 0) {
                this.onMeetingTime();
                return;
            }
            
            this.updateCountdown(secondsRemaining);
            
            // Actualizar mensaje
            const message = this.getMessageForTime(secondsRemaining);
            const type = secondsRemaining <= 60 ? 'urgent' : (secondsRemaining <= 300 ? 'critical' : 'normal');
            this.updateMessage(message, type);
            
            // Activar música en el último minuto si está disponible
            if (secondsRemaining <= 60 && this.isAudioReady && this.audio && this.audio.paused) {
                this.attemptAutoplay();
            }
        };
        
        // Verificar si ya es hora de la reunión
        if (this.getTimeUntilMeeting() <= 0) {
            this.onMeetingTime();
            return;
        }
        
        // Ejecutar inmediatamente y luego cada segundo
        this.updateMessage('Inicializando sala de espera...');
        updateTimer();
        this.intervals.countdown = setInterval(updateTimer, 1000);
    }
    
    onMeetingTime() {
        // Limpiar intervalos
        Object.values(this.intervals).forEach(interval => clearInterval(interval));
        
        this.updateCountdown(0);
        this.updateMessage('¡Redirigiendo a la reunión...!', 'critical');
        
        // Pausar audio
        if (this.audio && !this.audio.paused) {
            this.audio.pause();
        }
        
        if (this.config.autoRedirect) {
            setTimeout(() => {
                window.location.href = this.config.meetingUrl;
            }, 2000);
        }
    }
    
    updateTimezones() {
        if (!this.config.showTimezones || !this.elements.timezoneGrid) return;
        
        const meetingDate = this.getMeetingDateTime();
        if (!meetingDate) return;
        
        const timezones = [
            { flag: '🇺🇾', name: 'Montevideo', offset: -3 },
            { flag: '🇨🇱', name: 'Santiago', offset: -3 },
            { flag: '🇦🇷', name: 'Buenos Aires', offset: -3 },
            { flag: '🇵🇪', name: 'Lima', offset: -5 },
            { flag: '🇨🇴', name: 'Bogotá', offset: -5 }
        ];
        
        const updateTimezoneDisplay = () => {
            timezones.forEach((tz, index) => {
                const timezoneItem = this.elements.timezoneGrid.children[index];
                if (!timezoneItem) return;
                
                const localTime = new Date(meetingDate.getTime() + (tz.offset * 60 * 60 * 1000));
                const timeString = localTime.toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                });
                
                const flagEl = timezoneItem.querySelector('.text-dorado');
                const timeEl = timezoneItem.querySelector('.text-texto-secundario');
                
                if (flagEl) flagEl.textContent = `${tz.flag} ${tz.name}`;
                if (timeEl) timeEl.textContent = timeString;
            });
        };
        
        updateTimezoneDisplay();
        this.intervals.timezone = setInterval(updateTimezoneDisplay, 60000); // Actualizar cada minuto
    }
    
    // Controles de audio
    togglePlayPause() {
        if (!this.audio) return;
        
        if (this.audio.paused) {
            this.audio.play().catch(e => {
                console.error('Error al reproducir audio:', e);
                this.updateMessage('Error al reproducir audio. El countdown continúa.');
            });
        } else {
            this.audio.pause();
        }
    }
    
    onAudioPlay() {
        if (!this.elements.playPauseIcon) return;
        this.elements.playPauseIcon.classList.remove('fa-play');
        this.elements.playPauseIcon.classList.add('fa-pause');
        if (this.elements.playPauseBtn) {
            this.elements.playPauseBtn.classList.remove('pulse');
        }
    }
    
    onAudioPause() {
        if (!this.elements.playPauseIcon) return;
        this.elements.playPauseIcon.classList.remove('fa-pause');
        this.elements.playPauseIcon.classList.add('fa-play');
        if (this.elements.playPauseBtn) {
            this.elements.playPauseBtn.classList.add('pulse');
        }
    }
    
    adjustVolume(delta) {
        if (this.currentVolume + delta >= 0 && this.currentVolume + delta <= 1) {
            this.currentVolume = Math.max(0, Math.min(1, this.currentVolume + delta));
            if (!this.isMuted && this.audio) {
                this.audio.volume = this.currentVolume;
            }
            this.updateVolumeDisplay();
        }
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.audio) {
            this.audio.volume = this.isMuted ? 0 : this.currentVolume;
        }
        this.updateVolumeDisplay();
    }
    
    updateVolumeDisplay() {
        if (!this.elements.volumeFill || !this.elements.muteIcon) return;
        
        const percentage = this.isMuted ? 0 : (this.currentVolume * 100);
        this.elements.volumeFill.style.width = percentage + '%';
        
        let iconClass = 'fas text-sm';
        if (this.isMuted || this.currentVolume === 0) {
            iconClass += ' fa-volume-mute';
        } else if (this.currentVolume < 0.5) {
            iconClass += ' fa-volume-down';
        } else {
            iconClass += ' fa-volume-up';
        }
        
        this.elements.muteIcon.className = iconClass;
    }
    
    // Método público para actualizar configuración
    updateConfig(newConfig) {
        // Detener countdown actual
        Object.values(this.intervals).forEach(interval => clearInterval(interval));
        
        // Actualizar configuración
        this.config = this.validateConfig({ ...this.config, ...newConfig });
        
        // Reiniciar
        this.startCountdown();
        this.updateTimezones();
    }
    
    // Método público para obtener información del estado
    getStatus() {
        return {
            timeRemaining: this.getTimeUntilMeeting(),
            meetingDate: this.getMeetingDateTime(),
            isAudioPlaying: this.audio && !this.audio.paused,
            volume: this.currentVolume,
            isMuted: this.isMuted
        };
    }
    
    // Cleanup
    destroy() {
        Object.values(this.intervals).forEach(interval => clearInterval(interval));
        if (this.audio) {
            this.audio.pause();
            this.audio.removeEventListener('loadedmetadata', () => {});
            this.audio.removeEventListener('canplaythrough', () => {});
            this.audio.removeEventListener('error', () => {});
            this.audio.removeEventListener('play', () => {});
            this.audio.removeEventListener('pause', () => {});
        }
    }
}

// Exportar para uso global
window.WaitingRoom = WaitingRoom;