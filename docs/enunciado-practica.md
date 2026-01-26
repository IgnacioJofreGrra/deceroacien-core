# Enunciado de practica: De Cero a Cien Core

## Alcance del mini-producto
Incluye solo lo necesario para experimentar con la oferta base de De Cero a Cien: landing principal, portal del alumno, flujo de fases (de-cero-a-cien-fases), login con Google (Supabase), simulacion de compra/checkout y acceso a fases con gating por entitlements. Queda explicitamente fuera de alcance todo lo demas (Camino Dorado, Liderazgo/TALENT, Comunidad, Gamificacion, Conecta, blog, landing de afiliados, revistas, salas de espera, herramientas de Capital y cualquier otra seccion no listada arriba). El foco es un MVP didactico para practicar despliegue estatico + backend Flask + Supabase Auth.

## Objetivo del proyecto
Armar un esqueleto funcional donde el equipo pueda practicar despliegue de un frontend estatico en GCS, un backend minimo en Flask (Cloud Run), autenticacion con Google via Supabase y gating de acceso a fases tras una compra simulada.

## Tecnologias permitidas
- Frontend: HTML/CSS/JS sin frameworks (pueden usar las hojas y scripts ya copiados en `frontend/public`).
- Backend: Flask (Python) desplegado en Cloud Run.
- Base de datos: PostgreSQL gestionada (puede ser Supabase Postgres o Cloud SQL).
- Auth: Supabase Auth con Google OAuth.

## Entregables por semana
- Semana 1: frontend publicado en bucket GCS detras de un Load Balancer HTTPS, sirviendo los archivos de `frontend/public`.
- Semana 2: backend Flask en Cloud Run con endpoints health y config publica operativos.
- Semana 3: endpoints de pagos y webhooks simulados, creando ordenes y enrolando usuarios (sin necesidad de integracion real con pasarela si no hay credenciales).
- Semana 4: login con Google (Supabase) integrado en el frontend, gating de fases leyendo entitlements desde backend/localStorage y experiencia de acceso tras compra.

## Cuentas y proyectos a usar
Estos datos deben ser completados por el instructor antes de empezar. No colocar secretos en el repositorio.
- Proyecto GCP (practica): ID sugerido `dc100-practica` (actualiza al ID real cuando se cree el proyecto).
- Supabase: URL publica (pendiente) y anon key (pendiente). Usa valores reales solo en variables de entorno locales y en Cloud Run; no publiques llaves privadas.

## Tareas para el equipo
- Frontend: limpiar y adaptar las paginas copiadas (landing, portal, fases), asegurando que corren en local solo con `frontend/public`. Ajustar enlaces si es necesario.
- Infra: publicar el frontend en un bucket GCS con Load Balancer HTTPS y cache basica.
- Backend: crear API Flask con endpoints minimos (health, config publica, crear pago simulado, webhook simulado, crear enrolments basados en pagos aprobados).
- Auth: integrar login con Google usando Supabase Auth y propagar el token al backend.
- Gating: leer entitlements desde el backend (o localStorage como fallback) y mostrar/ocultar acceso a fases segun el usuario logueado.

## Primeros pasos sugeridos
1) Clonar el repositorio.
2) Levantar el frontend en local desde `frontend/public` (por ejemplo con `python -m http.server 3000` o `npx serve`).
3) Crear su propio branch de trabajo antes de commitear cambios.
