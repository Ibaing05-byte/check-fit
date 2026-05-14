# Check Fit

Check Fit es una beta privada de una app de moda con IA preparada para ayudar al usuario a decidir qué ponerse usando su armario real.

Promesa principal: **la forma más rápida e inteligente de decidir qué ponerte.**

## Funcionalidades actuales

- Armario visual guardado en `localStorage`, sin backend ni login.
- Home tipo app móvil con outfit del día, acciones rápidas y resumen del armario.
- Alta rápida de prendas individuales con foto, nombre sugerido desde archivo y color detectado con `canvas`.
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

1. Abre la carpeta `check-fit`.
2. Lanza un servidor local desde la carpeta:

```bash
python3 -m http.server 8000
```

Después abre `http://localhost:8000`. La app usa módulos JavaScript, así que es mejor probarla con servidor local o desde GitHub Pages.

## Arquitectura

- `index.html`: estructura principal de la beta web.
- `styles.css`: interfaz oscura, responsive y visual.
- `app.js`: orquestación de eventos, estado de UI y renderizado global.
- `data.js`: catálogos de tipos, estilos, colores, ocasiones y reglas compartidas.
- `storage.js`: lectura, escritura y normalización de datos en `localStorage`.
- `wardrobe.js`: utilidades de armario, filtros, inferencias y tarjetas de prendas.
- `outfits.js`: motor de recomendación, explicación, historial y uso.
- `vision.js`: análisis de color, recorte de prendas y funciones preparadas para visión futura.

## Limitaciones actuales

- No hay detección automática real de prendas desde una foto completa del armario.
- El flujo actual usa recorte manual para mantener una experiencia honesta y útil.
- Las imágenes se guardan como datos locales del navegador; un armario grande puede ocupar bastante `localStorage`.
- No hay sincronización entre dispositivos ni cuentas de usuario.
- El recomendador es local y basado en reglas, no en un modelo entrenado con preferencias personales.
- El motor de outfits evita choques de color evidentes, penaliza combinaciones recientes y prioriza prendas menos usadas, pero todavía no aprende de gustos personales.

## Preparado para IA visual

El archivo `vision.js` incluye funciones pensadas para evolucionar hacia backend + API de visión:

- `detectDominantColor(image)`
- `cropGarmentFromClosetImage(image, area)`
- `detectGarmentsFromClosetImage(image)`

La función `detectGarmentsFromClosetImage(image)` está preparada para conectar un backend con OpenAI Vision u otro sistema de visión artificial. En esta beta no inventa prendas automáticamente.

## Roadmap

1. Backend ligero para cuentas, almacenamiento de imágenes y sincronización.
2. Integración con OpenAI Vision para detectar prendas reales desde fotos de armario.
3. Preferencias personales: colores favoritos, restricciones, nivel de formalidad y marcas.
4. Calendario de outfits y registro de uso.
5. Compartir looks y recibir feedback.
6. Recomendaciones comerciales: básicos que faltan, cápsulas y compras sugeridas.

## Últimas mejoras de beta

- Interfaz más cercana a una app móvil premium, con Home, navegación inferior fija y tarjetas más visuales.
- Outfit del día, racha, contador de días activos, total de looks generados y señales de prendas sin usar.
- Recorte desde armario más táctil, con overlay claro, guía paso a paso y preview del recorte.
- Autocompletado mejorado desde nombres de archivo como `sudadera-negra.jpg`.
- Explicaciones de outfit más humanas, con lectura de paleta, básicos, clima, estilo y rotación semanal.
- Microcopy premium y estados vacíos más útiles.

## Objetivo comercial

Check Fit busca diferenciarse de otros armarios digitales por velocidad de entrada, experiencia visual premium, baja fricción y recomendaciones útiles para la vida real. El MVP está pensado para enseñar una beta seria, validar uso real y preparar la siguiente fase con backend e IA visual.
