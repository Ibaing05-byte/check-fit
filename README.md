# SACLO

SACLO es un asistente inteligente de armario y outfits con IA. Convierte tu armario real en decisiones rápidas, looks útiles y una experiencia visual mobile-first.

**Less effort. Better outfits.**

## Qué hace

- Armario visual guardado en `localStorage`, sin login ni base de datos todavía.
- Alta rápida de prendas con foto, nombre sugerido desde archivo y color calculado localmente.
- Análisis inteligente conectado por defecto al servicio online.
- Revisión asistida: el análisis propone datos, muestra confianza y el usuario corrige antes de guardar.
- Digitalización de armario por zonas: camisetas, pantalones, chaquetas, zapatillas o accesorios.
- Creación de prendas desde una zona del armario con selección asistida como alternativa.
- Recomendador de outfits por ocasión, clima, temperatura, estilo, temporada, color y rotación de uso.
- Home tipo app móvil con “Hoy en SACLO”, outfit del día, racha, prendas sin usar, último outfit usado, favoritos e historial visual.

## Experiencia de usuario

La app publicada en `https://saclo.net` no muestra configuración técnica a usuarios finales:

- Puedes añadir prendas manualmente.
- SACLO detecta color localmente con `canvas`.
- Puedes analizar una prenda o detectar prendas visibles desde una zona del armario.
- Puedes crear prendas desde una zona del armario usando selección asistida.
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
2. Analizar prenda o detectar prendas visibles por zona.
3. Revisar resultados.
4. Guardar prendas.
5. Crear outfit.

Si existía una configuración antigua con `localhost`, SACLO la borra automáticamente y vuelve a usar `https://check-fit.onrender.com`.

Los errores visibles son humanos y no exponen claves, modelos, proveedor ni detalles técnicos.

Consejo para mejores resultados: buena luz, prendas visibles y pocas piezas por foto. Para un armario completo, sube varias zonas: camisetas, pantalones, chaquetas, zapatillas y accesorios.

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
MAX_IMAGE_MB=4
MAX_OPENAI_IMAGE_SIDE=1200
OPENAI_IMAGE_JPEG_QUALITY=76
TARGET_OPENAI_IMAGE_MB=2.2
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

Devuelve hasta 8 prendas claramente visibles por imagen y una nota de revisión. No debe inventar prendas cuando la imagen sea confusa. Para digitalizar un armario completo se recomienda subir varias fotos por secciones.

## Mejoras recientes de UX

- Loading premium con `Analizando prenda...` y `Analizando zona...`.
- Progreso visual en tres pasos: detección, color y preparación de resultados.
- Compresión automática de imágenes antes del análisis: lado largo aproximado de 1200px y JPEG optimizado.
- Caché de análisis en sesión para no repetir llamadas con la misma imagen.
- Badge de confianza para resultados de análisis inteligente.
- Aviso `Revisar recomendado` cuando la confianza baja de 70%.
- Tarjetas independientes para prendas detectadas, editables antes de guardar.
- Notas de revisión visibles en revisión asistida.
- Sección `Hoy en SACLO` con racha, prendas sin usar, último outfit usado y acceso rápido al look del día.
- Historial con favoritos, fecha, ocasión, clima, marcado de uso y botón `Usar de nuevo`.
- Outfit engine más estricto con paletas, ocasión, clima, favoritos, rotación semanal y prendas menos usadas.
- Nuevo sistema de vibes: `casual clean`, `streetwear relaxed`, `smart casual`, `minimal premium`, `sport casual`, `night out`, `university fit`, `office fit`, `rainy day`, `summer basic` y `winter layered`.
- “Hoy en SACLO” ahora actúa como companion diario: look accionable, variaciones, prendas olvidadas, consejos y señales de uso.
- Favoritos de prendas y outfits usados como señal para futuras recomendaciones.
- Historial inteligente con vibe, paleta, prendas usadas, favorito, usado, variación y eliminación.
- Perfil de estilo inferido localmente: estilos, colores, vibes, prendas favoritas, ocasión habitual y nivel de formalidad.
- Prendas olvidadas accionables: SACLO puede crear un look alrededor de una prenda concreta.

## Outfit Intelligence

El motor local ya no decide solo por tipo de prenda. Ahora puntúa:

- Rol del look: base, capa, calzado y accesorios.
- Vibe objetivo según ocasión, clima, temperatura y estilo.
- Paleta: `monochrome`, `neutral`, `contrast`, `soft`, `dark`, `warm` y `cold`.
- Equilibrio entre básicos y prendas protagonistas.
- Compatibilidad de estilos y colores.
- Clima real: lluvia, frío, calor, viento, nublado y temperatura.
- Historial: evita combinaciones recientes, rescata prendas olvidadas y mezcla favoritos con variedad.
- Perfil local: favoritos, outfits usados, outfits guardados y prendas favoritas influyen sin necesidad de cuenta.
- `getUserStyleProfile()` infiere y guarda en `localStorage` una preferencia simple de estilo en `sacloStyleProfile`.

La explicación intenta sonar como un stylist: breve, concreta y conectada con clima, ocasión, paleta y uso real del armario.

## Pipeline de análisis

- Frontend: reduce la imagen en `canvas` a lado largo máximo `1200px`, JPEG `0.7-0.8`, evita fotos gigantes y reutiliza resultados repetidos durante la sesión.
- Backend: usa respuestas estructuradas, timeout, caché temporal, reutilización de llamadas en curso, lectura de dimensiones, logs de duración/tamaño y validación contra duplicados.
- Coste: el backend limita payload, compacta prompts/respuestas y puede reoptimizar imágenes a JPEG `1200px` cuando el optimizador está disponible.
- Armario: prioriza prendas claramente visibles. Es mejor detectar pocas prendas fiables que muchas dudosas.
- Flujo por zonas: SACLO está optimizado para detectar hasta 8 prendas claras por imagen; subir varias zonas mejora precisión, velocidad y control de costes.
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

## Icono de app

- Icono principal: `assets/app-icon-saclo.png`.
- Favicon 192x192: `assets/app-icon-192.png`.
- Favicon 512x512: `assets/app-icon-512.png`.
- iPhone usa `assets/app-icon-saclo.png` como `apple-touch-icon` al añadir SACLO a la pantalla de inicio.

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
