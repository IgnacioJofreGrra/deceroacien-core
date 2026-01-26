/**
 * FORMACIÓN SEMILLA - SCRIPTS CENTRALIZADOS
 * Funcionalidad JavaScript para todos los componentes de Formación Semilla
 */

// Namespace para evitar conflictos
const FormacionSemilla = {
    
    // === BITÁCORA DEL FUNDADOR ===
    bitacora: {
        /**
         * Inicializa la navegación de la Bitácora del Fundador
         */
        init() {
            const navLinks = document.querySelectorAll('.bitacora-sidebar-link');
            const pages = document.querySelectorAll('.bitacora-page');

            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const pageId = link.dataset.page;

                    // Actualizar navegación activa
                    navLinks.forEach(nav => nav.classList.remove('active'));
                    link.classList.add('active');

                    // Mostrar página correspondiente
                    pages.forEach(page => page.classList.remove('active'));
                    const targetPage = document.getElementById(pageId);
                    if (targetPage) {
                        targetPage.classList.add('active');
                    }
                });
            });

            // Inicializar herramientas interactivas
            this.initCalculadoras();
            this.initGeneradores();
            this.initMatrizEisenhower();
            this.initSCAMPER();
        },

        /**
         * Inicializa las calculadoras
         */
        initCalculadoras() {
            // Calculadora de Punto de Equilibrio
            const costosFijos = document.getElementById('costosFijos');
            const precioVenta = document.getElementById('precioVenta');
            const costoVariable = document.getElementById('costoVariable');
            const unidadesEquilibrio = document.getElementById('unidadesEquilibrio');
            const errorPe = document.getElementById('error-pe');

            if (costosFijos && precioVenta && costoVariable && unidadesEquilibrio) {
                const calcular = () => {
                    const cf = parseFloat(costosFijos.value) || 0;
                    const pv = parseFloat(precioVenta.value) || 0;
                    const cv = parseFloat(costoVariable.value) || 0;

                    if (pv > 0 && pv <= cv) {
                        if (errorPe) errorPe.classList.remove('fs-hidden');
                        unidadesEquilibrio.textContent = 'X';
                        return;
                    }
                    if (errorPe) errorPe.classList.add('fs-hidden');

                    if (pv === 0 || cf === 0) {
                        unidadesEquilibrio.textContent = '0';
                        return;
                    }

                    const margen = pv - cv;
                    const unidades = margen > 0 ? Math.ceil(cf / margen) : 0;
                    unidadesEquilibrio.textContent = unidades.toLocaleString('es-ES');
                };

                [costosFijos, precioVenta, costoVariable].forEach(el => {
                    el.addEventListener('input', calcular);
                });
            }
        },

        /**
         * Inicializa los generadores de contenido
         */
        initGeneradores() {
            // Generador de Copy
            const generateCopyBtn = document.getElementById('generateCopyBtn');
            const copyResult = document.getElementById('copyResult');
            const copyOutput = document.getElementById('copyOutput');

            if (generateCopyBtn && copyResult && copyOutput) {
                generateCopyBtn.addEventListener('click', () => {
                    const cliente = document.getElementById('copyCliente')?.value || "[Tu cliente ideal]";
                    const solucion = document.getElementById('copySolucion')?.value || "[Tu solución]";
                    const diferencia = document.getElementById('copyDiferencia')?.value || "[Tu diferenciador clave]";

                    copyOutput.textContent = `¿Eres ${cliente}? Te ayudamos a ${solucion}. A diferencia de otros, nosotros ${diferencia}. ¡Transforma tu negocio hoy!`;
                    copyResult.classList.remove('fs-hidden');
                });
            }
        },

        /**
         * Inicializa la Matriz de Eisenhower
         */
        initMatrizEisenhower() {
            const newTaskInput = document.getElementById('newTaskInput');
            const addTaskBtn = document.getElementById('addTaskBtn');
            const taskList = document.getElementById('taskList');
            const quadrants = document.querySelectorAll('.eisenhower-quadrant');
            let draggableTask = null;

            if (!newTaskInput || !addTaskBtn || !taskList) return;

            const createTaskElement = (text) => {
                const task = document.createElement('div');
                task.textContent = text;
                task.className = 'task-item bg-gray-700 p-2 rounded-md text-sm cursor-grab';
                task.draggable = true;

                task.addEventListener('dragstart', () => {
                    draggableTask = task;
                    setTimeout(() => { task.style.display = 'none'; }, 0);
                });

                task.addEventListener('dragend', () => {
                    setTimeout(() => {
                        if (draggableTask) {
                            draggableTask.style.display = 'block';
                            draggableTask = null;
                        }
                    }, 0);
                });

                return task;
            };

            addTaskBtn.addEventListener('click', () => {
                const taskText = newTaskInput.value.trim();
                if (taskText) {
                    taskList.appendChild(createTaskElement(taskText));
                    newTaskInput.value = '';
                }
            });

            // Permitir agregar tareas con Enter
            newTaskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    addTaskBtn.click();
                }
            });

            // Configurar drag and drop en cuadrantes
            quadrants.forEach(quadrant => {
                quadrant.addEventListener('dragover', (e) => e.preventDefault());
                quadrant.addEventListener('drop', (e) => {
                    e.preventDefault();
                    if (draggableTask) {
                        quadrant.appendChild(draggableTask);
                    }
                });
            });
        },

        /**
         * Inicializa el generador SCAMPER
         */
        initSCAMPER() {
            const scamperInput = document.getElementById('scamperInput');
            const scamperQuestions = document.getElementById('scamperQuestions');

            if (!scamperInput || !scamperQuestions) return;

            const templates = {
                S: "¿Qué puedes **Sustituir** en {topic}? ¿Materiales, procesos, personas, lugares?",
                C: "¿Qué puedes **Combinar** con {topic}? ¿Otros productos, servicios, ideas?",
                A: "¿Qué puedes **Adaptar** de otro contexto a {topic}? ¿Una idea de otra industria?",
                M: "¿Cómo puedes **Modificar** o magnificar {topic}? ¿Hacerlo más grande, más pequeño, más fuerte, con otro color?",
                P: "¿Puedes **Poner** {topic} en otro **Uso**? ¿Sirve para otros clientes o problemas?",
                E: "¿Qué puedes **Eliminar** o simplificar en {topic}? ¿Quitar una parte, reducir pasos?",
                R: "¿Puedes **Reorganizar** o invertir el proceso de {topic}? ¿Cambiar el orden, el patrón, el layout?"
            };

            const generateQuestions = () => {
                const topic = scamperInput.value.trim() || "tu producto/servicio";
                let html = '';

                for (const key in templates) {
                    const question = templates[key].replace('{topic}', `<strong class="text-yellow-400">${topic}</strong>`);
                    html += `
                        <div class="fs-card fs-p-4 fs-rounded-lg">
                            <p class="font-bold text-white fs-mb-2">${question}</p>
                            <textarea class="fs-textarea fs-w-full" rows="2" placeholder="Escribe tus ideas aquí..."></textarea>
                        </div>
                    `;
                }

                scamperQuestions.innerHTML = html;
            };

            scamperInput.addEventListener('input', generateQuestions);
            generateQuestions(); // Llamada inicial
        }
    },

    // === HERRAMIENTAS INDEPENDIENTES ===
    tools: {
        /**
         * Inicializa herramientas individuales en los talleres
         */
        init() {
            this.initCalculadoraPuntoEquilibrio();
            this.initGeneradorCopy();
            this.initPriorizadorTareas();
        },

        /**
         * Calculadora de Punto de Equilibrio (versión taller)
         */
        initCalculadoraPuntoEquilibrio() {
            // Similar a la versión de bitácora pero adaptada para talleres individuales
            FormacionSemilla.bitacora.initCalculadoras();
        },

        /**
         * Generador de Copy (versión taller)
         */
        initGeneradorCopy() {
            FormacionSemilla.bitacora.initGeneradores();
        },

        /**
         * Priorizador de Tareas (versión taller)
         */
        initPriorizadorTareas() {
            FormacionSemilla.bitacora.initMatrizEisenhower();
        }
    },

    // === UTILIDADES GENERALES ===
    utils: {
        /**
         * Formatea números para mostrar
         */
        formatNumber(num) {
            return num.toLocaleString('es-ES');
        },

        /**
         * Valida campos requeridos
         */
        validateRequired(fields) {
            return fields.every(field => {
                const element = document.getElementById(field);
                return element && element.value.trim() !== '';
            });
        },

        /**
         * Muestra/oculta elementos
         */
        toggleElement(elementId, show = null) {
            const element = document.getElementById(elementId);
            if (!element) return;

            if (show === null) {
                element.classList.toggle('fs-hidden');
            } else if (show) {
                element.classList.remove('fs-hidden');
            } else {
                element.classList.add('fs-hidden');
            }
        },

        /**
         * Copia texto al portapapeles
         */
        async copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                console.error('Error al copiar:', err);
                return false;
            }
        }
    },

    // === INICIALIZACIÓN ===
    init() {
        // Determinar qué componentes inicializar según la página
        const isBitacora = document.querySelector('.bitacora-container');
        const isToolPage = document.querySelector('[data-tool]');

        if (isBitacora) {
            this.bitacora.init();
        }

        if (isToolPage) {
            this.tools.init();
        }

        // Siempre inicializar utilidades generales
        console.log('Formación Semilla: Scripts inicializados');
    }
};

// Auto-inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    FormacionSemilla.init();
});

// Exportar para uso global si es necesario
window.FormacionSemilla = FormacionSemilla;