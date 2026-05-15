# SACLO

SACLO es un asistente inteligente de armario y outfits con IA. No es solo un organizador de ropa: ayuda a decidir qué ponerse con menos fricción, mejor criterio visual y una experiencia mobile-first.

Promesa principal: **Less effort. Better outfits.**

## Funcionalidades actuales

- Armario visual guardado en `localStorage`, sin login ni base de datos compleja.
- Posicionamiento premium: `Less effort. Better outfits.`
- Home tipo app móvil con outfit del día, acciones rápidas y resumen del armario.
- Alta rápida de prendas individuales con foto, nombre sugerido desde archivo y color detectado con `canvas`.
- Análisis visual real opcional con backend Node.js + Express + OpenAI Vision.
- Botón `Analizar con IA` para completar campos de una prenda individual.
- Botón `Analizar con IA` para detectar prendas visibles desde una foto del armario y enviarlas a revisión.
- Creación de prendas desde una foto del armario mediante recorte manual.
- Detección de color sobre cada recorte, no sobre la foto completa.
- Recorte asistido con guía visual, preview inmediata y revisión inteligente antes de guardar.
- Filtros por búsqueda, tipo, estilo, temporada y color.
- Edición, borrado, contador de prendas y contador de usos.
- Recomendador de outfits por ocasión, clima, temperatura, estilo, temporada, compatibilidad de color, básicos/neutros, coherencia de estilo y rotación.
- Resultado visual con explicación, guardar outfit, generar otra opción y marcar como usado.
- Historial visual de outfits guardados o usados, con fecha, contexto, favoritos y acción para marcar uso.
- Elementos de retención locales: racha, días activos, total de looks generados, prendas sin usar y favoritos.
- Navegación inferior tipo app: Inicio, Armario, Outfit e Historial.
- Feedback visual al guardar prendas, recortes y outfits.

## Cómo probar la app

### Frontend

1. Abre la carpeta del proyecto.
2. Lanza un servidor local desde la carpeta:

```bash
python3 -m http.server 8000
```

Después abre `http://localhost:8000`. La app usa módulos JavaScript, así que es mejor probarla con servidor local o desde GitHub Pages.

### Backend

1. En otra ventana de Terminal:

```bash
cd backend
npm install
cp .env.example .env
```

2. Edita `backend/.env`:

```bash
PORT=3001
FRONTEND_ORIGIN=http://localhost:8000,http://127.0.0.1:8000
OPENAI_API_KEY=tu_clave
OPENAI_VISION_MODEL=gpt-4.1-mini
MAX_IMAGE_MB=8
```

3. Arranca el backend:

```bash
npm run dev
```

Por defecto quedará en `http://localhost:3001`.

Si despliegas el backend en otra URL, configura el frontend antes de cargar `app.js` con:

```html
<script>
  window.SACLO_API_BASE = "https://tu-backend.com";
</script>
```

### Probar análisis visual

Con frontend y backend activos:

1. Abre `http://localhost:8000` o `http://127.0.0.1:8000`.
2. Sube una foto de prenda individual.
3. Pulsa `Analizar con IA`.
4. Revisa nombre, tipo, color, estilo y temporada antes de guardar.
5. En modo `Desde armario`, sube una foto del armario y pulsa `Analizar con IA`.
6. Las prendas detectadas aparecen como pendientes para corregir y confirmar.

También puedes probar con `curl`:

```bash
curl -X POST http://localhost:3001/api/analyze-garment \
  -F "image=@/ruta/a/prenda.jpg"
```

```bash
curl -X POST http://localhost:3001/api/analyze-closet \
  -F "image=@/ruta/a/armario.jpg"
```

## Arquitectura

- `index.html`: estructura principal de la beta web.
- `styles.css`: interfaz oscura, responsive y visual.
- `app.js`: orquestación de eventos, estado de UI y renderizado global.
- `data.js`: catálogos de tipos, estilos, colores, ocasiones y reglas compartidas.
- `storage.js`: lectura, escritura y normalización de datos en `localStorage`.
- `wardrobe.js`: utilidades de armario, filtros, inferencias y tarjetas de prendas.
- `outfits.js`: motor de recomendación, explicación, historial y uso.
- `vision.js`: análisis de color, recorte de prendas y funciones preparadas para visión futura.
- `backend/server.js`: API Express opcional para análisis visual con OpenAI Vision.
- `backend/.env.example`: plantilla de configuración sin claves reales.

## Limitaciones actuales

- El análisis visual requiere ejecutar el backend con `OPENAI_API_KEY`.
- La IA puede equivocarse si las prendas están superpuestas, borrosas o con poca luz.
- El flujo de recorte manual se mantiene como fallback.
- Las imágenes se guardan como datos locales del navegador; un armario grande puede ocupar bastante `localStorage`.
- No hay sincronización entre dispositivos ni cuentas de usuario.
- El recomendador es local y basado en reglas, no en un modelo entrenado con preferencias personales.
- El motor de outfits evita choques de color evidentes, penaliza combinaciones recientes y prioriza prendas menos usadas, pero todavía no aprende de gustos personales.

## Análisis visual

El backend expone estos endpoints:

- `POST /api/analyze-garment`
- `POST /api/analyze-closet`

La clave de OpenAI vive solo en `backend/.env`, nunca en el frontend.

El archivo `vision.js` conserva funciones locales útiles para fallback manual y preparación de futuras mejoras:

- `detectDominantColor(image)`
- `cropGarmentFromClosetImage(image, area)`
- `detectGarmentsFromClosetImage(image)`

La función `detectGarmentsFromClosetImage(image)` queda como punto de evolución para conectar el análisis real directamente con flujos más avanzados.

## Despliegue del backend

- [Render](https://render.com/docs/deploy-node-express-app): sencillo para una API Express desde GitHub; configura root `backend`, start `npm start` y variables de entorno.
- [Railway](https://docs.railway.com/guides/express): buena opción para desplegar Express desde GitHub con variables de entorno.
- [Fly.io](https://fly.io/docs/apps/deploy/): más flexible, con despliegue por CLI y control de región.
- [Cloudflare Workers](https://developers.cloudflare.com/workers/): barato y rápido, pero este backend Express tendría que adaptarse al runtime de Workers o usar compatibilidad específica.

## Roadmap

1. Persistencia de imágenes en backend y sincronización entre dispositivos.
2. Mejor segmentación de prendas detectadas desde fotos de armario.
3. Preferencias personales: colores favoritos, restricciones, nivel de formalidad y marcas.
4. Calendario de outfits y registro de uso.
5. Compartir looks y recibir feedback.
6. Recomendaciones comerciales: básicos que faltan, cápsulas y compras sugeridas.

## Últimas mejoras de beta

- Interfaz más cercana a una app móvil premium, con Home, navegación inferior fija y tarjetas más visuales.
- Outfit del día, racha, contador de días activos, total de looks generados y señales de prendas sin usar.
- Backend mínimo con endpoints `POST /api/analyze-garment` y `POST /api/analyze-closet`.
- Botones de análisis visual en beta con revisión manual antes de guardar.
- Recorte desde armario más táctil, con overlay claro, guía paso a paso y preview del recorte.
- Autocompletado mejorado desde nombres de archivo como `sudadera-negra.jpg`.
- Explicaciones de outfit más humanas, con lectura de paleta, básicos, clima, estilo y rotación semanal.
- Microcopy premium y estados vacíos más útiles.

## Objetivo comercial

SACLO busca diferenciarse de otros armarios digitales por velocidad de entrada, experiencia visual premium, baja fricción y recomendaciones útiles para la vida real. El MVP está pensado para enseñar una beta privada premium, validar uso real y preparar la siguiente fase con backend e IA visual.
