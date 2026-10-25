# Control de inventario de materiales de limpieza

Aplicación web para registrar las entradas y salidas de materiales de limpieza de una empresa de servicios de aseo, y saber en todo momento cuánto stock hay de cada insumo.

**App publicada:** https://inventario-de-limpieza.onrender.com/

(El servicio gratuito se "duerme" si no se usa: la primera carga puede tardar cerca de 1 minuto.)

## Qué permite hacer

- Registrar, ver, editar y eliminar insumos (CRUD).
- Registrar entradas (llega material) y salidas (se usa material).
- Ver el historial de movimientos, de todos los insumos o de uno solo.

## Reglas del sistema

- No pueden existir dos insumos con el mismo código.
- No se puede registrar una salida mayor al stock disponible.
- No se puede eliminar un insumo que ya tiene movimientos registrados.
- Los datos se validan antes de guardarse y se muestran mensajes de error claros.

## Tecnologías

- Node.js y Express (servidor y API)
- PostgreSQL en Neon (base de datos)
- HTML y JavaScript simple (página de uso)
- Render (publicación)

## Estructura

- `index.js`: servidor y rutas de la API
- `database.js`: conexión a PostgreSQL y creación de tablas
- `public/index.html`: página para usar el sistema

## Rutas de la API

| Método | Ruta | Qué hace |
|--------|------|----------|
| GET | /api/insumos | Lista de insumos |
| GET | /api/insumos/:codigo | Un insumo |
| POST | /api/insumos | Registrar insumo |
| PUT | /api/insumos/:codigo | Editar insumo |
| DELETE | /api/insumos/:codigo | Eliminar insumo |
| POST | /api/movimientos | Registrar entrada o salida |
| GET | /api/movimientos | Historial (opcional `?insumo=CODIGO`) |

## Cómo ejecutarlo en tu computador

1. Instalar Node.js y clonar este repositorio.
2. Instalar dependencias: `npm install`
3. Crear un archivo `.env` (mira `.env.example`) con la dirección de tu base PostgreSQL en la variable `DATABASE_URL`.
4. Iniciar: `npm start`
5. Abrir http://localhost:3000

## Variables de entorno

Ver `.env.example`. Los datos secretos **no** se suben al repositorio: se guardan en el archivo `.env` (ignorado por Git) y en la configuración de Render.
