# Check Fit

Check Fit es una beta privada en HTML, CSS y JavaScript para crear un armario visual, analizar colores desde fotos y recibir recomendaciones de outfits sin backend, sin login y guardando todo en el navegador.

## Cómo abrirla

1. Abre la carpeta `check-fit`.
2. Haz doble clic en `index.html`.
3. Si prefieres usar un servidor local, desde la carpeta puedes ejecutar:

```bash
python3 -m http.server 8000
```

Después abre `http://localhost:8000` en el navegador.

## Cómo probarla

1. Usa **Prendas sueltas** para guardar una prenda individual con foto. El nombre se autocompleta desde el archivo y el color se estima localmente con canvas.
2. Usa **Escanear armario** para subir una foto del armario completo.
3. Pulsa **Analizar armario** para generar prendas pendientes de confirmar mediante el flujo de escaneo inteligente.
4. Revisa la galería de **Prendas pendientes** y confirma o corrige nombre, tipo, color, estilo y temporada con revisión asistida.
5. Usa la búsqueda y los filtros de **Mi armario visual** para revisar la colección por nombre, tipo, estilo o uso.
6. En **Crear outfit de hoy**, elige ocasión, clima y temperatura.
7. Pulsa **Recomendar outfit** para ver una combinación visual.

## Datos locales

La app usa `localStorage` para guardar el armario, los borradores pendientes, los filtros del armario y el último outfit recomendado. Las imágenes se guardan como datos locales del navegador y no se suben a internet.

## Estado actual del producto

- La detección de color se calcula en el navegador con `canvas`.
- La función `detectGarmentsFromClosetImage(image)` está preparada para conectar una API de visión artificial cuando el análisis visual pase de beta a producción.
- El escaneo de armario completo usa tecnología de análisis visual en fase beta y requiere revisión asistida antes de guardar prendas.
- Las prendas pendientes se conservan al recargar para que el flujo de revisión no se pierda.

## Archivos

- `index.html`: estructura principal de la app.
- `styles.css`: diseño visual y layout responsivo.
- `app.js`: estado, localStorage, subida de fotos, escaneo de armario y recomendación de outfits.
