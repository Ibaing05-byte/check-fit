# SACLO

SACLO es un asistente inteligente de armario y outfits con IA. Convierte tu armario real en decisiones rápidas, looks útiles y una experiencia visual mobile-first.

**Less effort. Better outfits.**

## Qué hace

- Armario visual guardado en `localStorage`, sin login ni base de datos todavía.
- Alta rápida de prendas con foto, nombre sugerido desde archivo y color calculado localmente.
- Análisis visual real opcional mediante backend Node.js + Express + OpenAI Vision.
- Revisión asistida: la IA propone datos, muestra confianza y el usuario corrige antes de guardar.
- Creación de prendas desde una foto del armario con recorte manual como fallback.
- Recomendador de outfits por ocasión, clima, temperatura, estilo, temporada, color y rotación de uso.
- Home tipo app móvil con “Hoy en SACLO”, outfit del día, racha, prendas sin usar, último outfit usado, favoritos e historial visual.

## Frontend sin backend

La app publicada en `https://saclo.net` sigue funcionando aunque el backend no esté activo:

- Puedes añadir prendas manualmente.
- SACLO detecta color localmente con `canvas`.
- Puedes crear prendas desde una foto del armario usando recorte asistido.
- El armario, favoritos, outfits e historial se guardan en el navegador con `localStorage`.

Para probar en local:

```bash
python3 -m http.server 8000
```

Abre `http://localhost:8000`.

## Frontend con backend

Cuando el backend esté activo, la sección `IA beta` permite configurar la URL de API.

Por defecto usa:

```text
https://check-fit.onrender.com
```

Desde la app puedes:

1. Cambiar la URL del backend.
2. Guardarla en `localStorage`.
3. Pulsar `Probar conexión`.
4. Usar `Analizar con IA` en prenda individual.
5. Usar `Detectar prendas con IA` desde una foto de armario.

Si el análisis falla, SACLO muestra un error claro y mantiene el flujo local. Los valores antiguos de desarrollo como `http://localhost:3000` se migran automáticamente al backend online de Render.

Consejo para mejores resultados: buena luz, prenda separada y fondo claro. Si la confianza baja de 70%, SACLO marca `Revisar recomendado`.

## Backend

El backend está en `backend/`.

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Configura `backend/.env`:

```bash
OPENAI_API_KEY=tu_clave
PORT=3000
FRONTEND_ORIGIN=https://saclo.net
OPENAI_VISION_MODEL=gpt-4.1-mini
MAX_IMAGE_MB=6
```

Endpoint de salud:

```bash
curl http://localhost:3000/api/health
```

Cuando el backend esté desplegado en Render:

```bash
curl https://check-fit.onrender.com/api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "saclo-backend"
}
```

## Endpoints de IA

`POST /api/analyze-garment`

Recibe JSON:

```json
{
  "image": "data:image/jpeg;base64,...",
  "filename": "sudadera-negra.jpg"
}
```

Devuelve una prenda sugerida con nombre, tipo, color, estilo, temporada, descripcion y confianza.

`POST /api/analyze-closet`

Recibe JSON:

```json
{
  "image": "data:image/jpeg;base64,..."
}
```

Devuelve hasta 8 prendas claramente visibles y una nota de revisión. No debe inventar prendas cuando la imagen sea confusa.

## Mejoras recientes de UX

- Loading premium con `Analizando prenda...` y `Detectando prendas...`.
- Badge de confianza para resultados de IA visual en beta.
- Aviso `Revisar recomendado` cuando la confianza baja de 70%.
- Tarjetas independientes para prendas detectadas, editables antes de guardar.
- Notas de la IA visibles en revisión asistida.
- Sección `Hoy en SACLO` con racha, prendas sin usar, último outfit usado y acceso rápido al look del día.
- Historial con favoritos, fecha, ocasión, clima, marcado de uso y botón `Usar de nuevo`.

## Arquitectura

- `index.html`: estructura principal de SACLO.
- `styles.css`: interfaz oscura, responsive y mobile-first.
- `app.js`: estado de UI, eventos, integración opcional con backend y renderizado.
- `data.js`: catálogos de tipos, colores, estilos, temporadas y reglas compartidas.
- `storage.js`: persistencia local y normalización de datos.
- `wardrobe.js`: utilidades de armario, filtros, inferencias y tarjetas.
- `outfits.js`: motor de recomendación, explicación, historial y uso.
- `vision.js`: color local, recorte manual y puntos preparados para visión.
- `backend/server.js`: API Express con OpenAI Vision y Structured Outputs.

## Seguridad

- `OPENAI_API_KEY` nunca va en el frontend.
- `.env` no se sube a GitHub.
- El backend valida tamaño y formato de imagen.
- CORS queda restringido con `FRONTEND_ORIGIN` cuando está definido.
- Esta fase no incluye login, pagos ni base de datos.

## Limitaciones actuales

- La IA visual está en beta y puede equivocarse con prendas superpuestas, fotos oscuras o imágenes borrosas.
- En fotos de armario, SACLO prioriza prendas claramente visibles y pide revisión manual.
- Las imágenes se guardan localmente en el navegador; un armario grande puede ocupar espacio.
- No hay sincronización entre dispositivos.
- El outfit engine es local y basado en reglas; todavía no aprende de preferencias personales.

## Roadmap

1. Desplegar backend estable para la beta privada.
2. Añadir almacenamiento de imágenes y sincronización entre dispositivos.
3. Mejorar segmentación real de prendas desde armarios completos.
4. Incorporar preferencias personales y feedback de outfits.
5. Añadir cuentas, privacidad avanzada y posible plan premium.
6. Explorar recomendaciones comerciales: básicos que faltan, cápsulas y compras sugeridas.

## Despliegue recomendado

- Frontend: Cloudflare Pages o GitHub Pages.
- Backend Express: Render, Railway o Fly.io.
- Cloudflare Workers es posible, pero requeriría adaptar Express al runtime de Workers.
