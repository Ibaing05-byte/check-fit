# SACLO

SACLO es un asistente inteligente de armario y outfits con IA. Convierte tu armario real en decisiones rápidas, looks útiles y una experiencia visual mobile-first.

**Less effort. Better outfits.**

## Qué hace

- Armario visual guardado en `localStorage`, sin login ni base de datos todavía.
- Alta rápida de prendas con foto, nombre sugerido desde archivo y color calculado localmente.
- Análisis inteligente conectado por defecto al servicio online.
- Revisión asistida: la IA propone datos, muestra confianza y el usuario corrige antes de guardar.
- Creación de prendas desde una foto del armario con selección asistida como alternativa.
- Recomendador de outfits por ocasión, clima, temperatura, estilo, temporada, color y rotación de uso.
- Home tipo app móvil con “Hoy en SACLO”, outfit del día, racha, prendas sin usar, último outfit usado, favoritos e historial visual.

## Experiencia de usuario

La app publicada en `https://saclo.net` no muestra configuración técnica a usuarios finales:

- Puedes añadir prendas manualmente.
- SACLO detecta color localmente con `canvas`.
- Puedes analizar una prenda o detectar prendas desde una foto del armario.
- Puedes crear prendas desde una foto del armario usando selección asistida.
- El armario, favoritos, outfits e historial se guardan en el navegador con `localStorage`.

Para probar en local:

```bash
python3 -m http.server 8000
```

Abre `http://localhost:8000`.

## Análisis inteligente

El frontend usa siempre este servicio online por defecto:

```text
https://check-fit.onrender.com
```

Para el usuario normal no hay campo de API, Render, OpenAI ni configuración interna. El flujo visible es:

1. Subir foto.
2. Analizar prenda o detectar prendas.
3. Revisar resultados.
4. Guardar prendas.
5. Crear outfit.

Si existía una configuración antigua con `localhost`, SACLO la borra automáticamente y vuelve a usar `https://check-fit.onrender.com`.

Los errores visibles son humanos y no exponen claves, modelos, proveedor ni detalles técnicos.

Consejo para mejores resultados: buena luz, prenda separada y fondo claro. Si la confianza baja de 70%, SACLO marca `Revisar recomendado`.

## Backend interno

No hay modo dev ni configuración técnica dentro de la app pública. El usuario no puede ver ni cambiar la URL de API desde SACLO.

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
- Progreso visual en tres pasos: detección, color y preparación de resultados.
- Compresión automática de imágenes antes del análisis: lado largo aproximado de 1200px y JPEG optimizado.
- Caché de análisis en sesión para no repetir llamadas con la misma imagen.
- Badge de confianza para resultados de análisis inteligente.
- Aviso `Revisar recomendado` cuando la confianza baja de 70%.
- Tarjetas independientes para prendas detectadas, editables antes de guardar.
- Notas de la IA visibles en revisión asistida.
- Sección `Hoy en SACLO` con racha, prendas sin usar, último outfit usado y acceso rápido al look del día.
- Historial con favoritos, fecha, ocasión, clima, marcado de uso y botón `Usar de nuevo`.
- Outfit engine más estricto con paletas, ocasión, clima, favoritos, rotación semanal y prendas menos usadas.

## Pipeline de análisis

- Frontend: reduce la imagen en `canvas`, evita enviar fotos gigantes y reutiliza resultados repetidos durante la sesión.
- Backend: usa respuestas estructuradas, timeout, caché temporal, logs de duración y validación contra duplicados.
- Armario: prioriza prendas claramente visibles. Es mejor detectar pocas prendas fiables que muchas dudosas.
- Color: se pide color principal y color secundario opcional para reducir confusiones como negro/gris, beige/blanco o azul/negro.

## Arquitectura

- `index.html`: estructura principal de SACLO.
- `styles.css`: interfaz oscura, responsive y mobile-first.
- `app.js`: estado de UI, eventos, integración con el servicio de análisis y renderizado.
- `data.js`: catálogos de tipos, colores, estilos, temporadas y reglas compartidas.
- `storage.js`: persistencia local y normalización de datos.
- `wardrobe.js`: utilidades de armario, filtros, inferencias y tarjetas.
- `outfits.js`: motor de recomendación, explicación, historial y uso.
- `vision.js`: color local, selección asistida y puntos preparados para visión.
- `backend/server.js`: API Express con OpenAI Vision y Structured Outputs.

## Seguridad

- `OPENAI_API_KEY` nunca va en el frontend.
- `.env` no se sube a GitHub.
- El backend valida tamaño y formato de imagen.
- CORS queda restringido con `FRONTEND_ORIGIN` cuando está definido.
- Esta fase no incluye login, pagos ni base de datos.

## Limitaciones actuales

- La detección puede variar según la calidad de foto, luz y superposición de prendas.
- En fotos de armario, SACLO prioriza prendas claramente visibles y pide revisión antes de guardar.
- Las imágenes se guardan localmente en el navegador; un armario grande puede ocupar espacio.
- No hay sincronización entre dispositivos.
- El outfit engine es local y basado en reglas; todavía no aprende de preferencias personales.

## Roadmap

1. Estabilizar el servicio online para uso diario.
2. Añadir almacenamiento de imágenes y sincronización entre dispositivos.
3. Mejorar segmentación real de prendas desde armarios completos.
4. Incorporar preferencias personales y feedback de outfits.
5. Añadir cuentas, privacidad avanzada y posible plan premium.
6. Explorar recomendaciones comerciales: básicos que faltan, cápsulas y compras sugeridas.

## Despliegue recomendado

- Frontend: Cloudflare Pages o GitHub Pages.
- Backend Express: Render, Railway o Fly.io.
- Cloudflare Workers es posible, pero requeriría adaptar Express al runtime de Workers.
