# SACLO Backend

Backend mínimo para probar análisis visual real en SACLO con Node.js, Express y OpenAI Vision.

## Instalación

```bash
cd backend
npm install
cp .env.example .env
```

Configura `.env`:

```bash
OPENAI_API_KEY=tu_clave
PORT=3000
FRONTEND_ORIGIN=https://saclo.net
OPENAI_VISION_MODEL=gpt-4.1-mini
MAX_IMAGE_MB=4
MAX_OPENAI_IMAGE_SIDE=1200
OPENAI_IMAGE_JPEG_QUALITY=76
TARGET_OPENAI_IMAGE_MB=2.2
MAX_INPUT_PIXELS=24000000
OPENAI_TIMEOUT_MS=12000
ANALYSIS_CACHE_TTL_MS=600000
ANALYSIS_CACHE_LIMIT=80
```

Para desarrollo local con el frontend en `http://localhost:8000`, puedes usar:

```bash
FRONTEND_ORIGIN=https://saclo.net,http://localhost:8000,http://127.0.0.1:8000
```

## Ejecutar

```bash
npm run dev
```

Producción:

```bash
npm start
```

Salud:

```bash
curl http://localhost:3000/api/health
```

Debug de OpenAI:

```bash
curl http://localhost:3000/api/debug-openai
```

Si OpenAI responde, devuelve `success: true`. Si falla, devuelve el error real y el backend imprime en consola `message`, `status`, `code`, `responseData`, `responseBody`, headers y stack para depurarlo en Render.

Backend online esperado para producción:

```bash
curl https://check-fit.onrender.com/api/health
curl https://check-fit.onrender.com/api/debug-openai
```

Respuesta:

```json
{
  "status": "ok",
  "service": "saclo-backend"
}
```

## Endpoints

### POST /api/analyze-garment

Analiza una prenda individual.

Request:

```json
{
  "image": "data:image/jpeg;base64,...",
  "filename": "sudadera-negra.jpg"
}
```

Response:

```json
{
  "success": true,
  "garment": {
    "name": "sudadera negra",
    "type": "sudadera",
    "color": "negro",
    "secondaryColor": "",
    "style": "streetwear",
    "season": "invierno",
    "occasion": "casual diario",
    "imageContext": "prenda individual",
    "reviewReason": "",
    "description": "Sudadera negra de estilo casual/streetwear",
    "confidence": 0.87
  }
}
```

### POST /api/analyze-closet

Analiza una zona del armario o varias prendas visibles. Devuelve como máximo 8 prendas claramente visibles por imagen.

Request:

```json
{
  "image": "data:image/jpeg;base64,..."
}
```

Response:

```json
{
  "success": true,
  "garments": [
    {
      "name": "camiseta blanca",
      "type": "camiseta",
      "color": "blanco",
      "secondaryColor": "",
      "style": "casual",
      "season": "verano",
      "occasion": "casual diario",
      "imageContext": "prendas superpuestas",
      "reviewReason": "",
      "description": "Camiseta básica blanca",
      "confidence": 0.78
    }
  ],
  "notes": "Revisa los resultados porque algunas prendas pueden estar superpuestas."
}
```

## Reglas del análisis

- No inventar prendas.
- Si la imagen es confusa, devolver pocas prendas y recomendar revisión antes de guardar.
- Separar solo prendas independientes claramente visibles.
- Evitar duplicados por tipo, color y nombre.
- Priorizar prendas claramente visibles.
- Precisión por encima de cantidad: mejor 3 prendas bien que 8 dudosas.
- El flujo recomendado para armarios completos es subir varias fotos por zonas: camisetas, pantalones, chaquetas, zapatillas y accesorios.
- El límite de 8 prendas por imagen mejora precisión, velocidad y control de costes.
- Mantener confianza entre `0` y `1`.
- Usar solo tipos, colores, estilos y temporadas permitidos por el frontend.
- Devolver `secondaryColor`, `occasion`, `imageContext` y `reviewReason` para mejorar la revisión.
- Devolver `typeAlternatives` cuando haya duda razonable entre tipos parecidos.
- No inferir temporada por color, fondo, estética o iluminación.
- Si no se ve denim con claridad, clasificar como `pantalón` y añadir `reviewReason` antes que inventar `vaqueros`.
- Si hay duda entre polo/camiseta/camisa, jersey/sudadera o chaqueta/camisa/cazadora, elegir el tipo más probable y pedir revisión.

## Checklist de precisión visual

- Polo negro -> `type: polo`, `season: verano` o `todo el año`.
- Jersey negro de punto -> `type: jersey`, `season: entretiempo` o `invierno`.
- Chaqueta beige colgada -> `type: chaqueta` o `cazadora`, `season: entretiempo`.
- Vaqueros negros doblados -> `type: vaqueros` si se ve denim; si no, `pantalón` con `reviewReason`.
- Camiseta básica -> `type: camiseta`.
- Sudadera sin capucha -> `type: sudadera`.
- Camisa blanca -> `type: camisa`.
- Abrigo largo -> `type: abrigo`.

## Errores comunes

- `MISSING_OPENAI_API_KEY`: falta configurar `OPENAI_API_KEY`.
- `IMAGE_TOO_LARGE`: la imagen supera `MAX_IMAGE_MB`.
- `INVALID_IMAGE_FORMAT`: formato no válido; usa JPG, PNG o WEBP en base64.
- `INVALID_AI_RESPONSE`: OpenAI devolvió una respuesta que no encaja con el esquema esperado.
- Error de CORS: revisa que `FRONTEND_ORIGIN` incluya el dominio desde el que abres la app.

## Cost control

- El frontend reduce la imagen antes de enviarla: lado largo máximo `1200px`, JPEG `0.7-0.8` y objetivo aproximado `2.2 MB`.
- El frontend evita llamadas duplicadas simultáneas con la misma imagen y reutiliza respuestas de la sesión.
- El backend limita el tamaño de payload con `MAX_IMAGE_MB` y lee dimensiones básicas para no reenviar imágenes por encima de `1200px`.
- El backend intenta reoptimizar con `sharp` cuando está disponible: JPEG, lado largo máximo `1200px` y calidad `70-80`.
- Si el optimizador de imagen no está disponible, el backend mantiene el flujo y se apoya en la compresión del frontend.
- El backend usa timeout razonable para evitar esperas largas.
- El backend cachea análisis repetidos durante unos minutos y reutiliza llamadas en curso para evitar duplicados.
- `analyze-closet` devuelve máximo 8 prendas por zona/imagen.
- No hay análisis automático en bucle; el usuario pulsa el botón cuando quiere analizar.
- Los prompts son compactos y las respuestas limitan textos largos para reducir tokens.
- Los logs de análisis incluyen endpoint, duración, tamaño aproximado de imagen, optimización aplicada y número de prendas detectadas.

## Despliegue

### Render

1. Conecta el repo.
2. Usa `backend` como root directory.
3. Build command: `npm install`.
4. Start command: `npm start`.
5. Configura variables de entorno, especialmente `OPENAI_API_KEY` y `FRONTEND_ORIGIN=https://saclo.net`.

### Railway

1. Crea proyecto desde GitHub.
2. Selecciona la carpeta `backend`.
3. Añade las variables de entorno.
4. Deploy con `npm start`.

### Fly.io

Buena opción si quieres controlar región y despliegue con CLI. Necesita configurar app Node y variables secretas.

### Cloudflare Workers

Posible, pero Express tendría que adaptarse al runtime de Workers o usar una capa compatible. Para esta fase, Render o Railway son más directos.

## Seguridad

- No subas `.env`.
- No pongas `OPENAI_API_KEY` en `index.html`, `app.js` ni ningún archivo del frontend.
- Mantén `FRONTEND_ORIGIN` restringido en producción.
