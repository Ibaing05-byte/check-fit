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
MAX_IMAGE_MB=6
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
    "style": "streetwear",
    "season": "invierno",
    "description": "Sudadera negra de estilo casual/streetwear",
    "confidence": 0.87
  }
}
```

### POST /api/analyze-closet

Analiza una foto de armario o varias prendas. Devuelve como máximo 8 prendas claramente visibles.

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
      "style": "casual",
      "season": "verano",
      "description": "Camiseta básica blanca",
      "confidence": 0.78
    }
  ],
  "notes": "Revisa los resultados porque algunas prendas pueden estar superpuestas."
}
```

## Reglas del análisis

- No inventar prendas.
- Si la imagen es confusa, devolver pocas prendas y recomendar revisión manual.
- Priorizar prendas claramente visibles.
- Mantener confianza entre `0` y `1`.
- Usar solo tipos, colores, estilos y temporadas permitidos por el frontend.

## Errores comunes

- `MISSING_OPENAI_API_KEY`: falta configurar `OPENAI_API_KEY`.
- `IMAGE_TOO_LARGE`: la imagen supera `MAX_IMAGE_MB`.
- `INVALID_IMAGE_FORMAT`: formato no válido; usa JPG, PNG o WEBP en base64.
- `INVALID_AI_RESPONSE`: OpenAI devolvió una respuesta que no encaja con el esquema esperado.
- Error de CORS: revisa que `FRONTEND_ORIGIN` incluya el dominio desde el que abres la app.

## Cost control

- El frontend reduce la imagen antes de enviarla.
- El backend limita el tamaño de imagen.
- `analyze-closet` devuelve máximo 8 prendas.
- No hay análisis automático en bucle; el usuario pulsa el botón cuando quiere analizar.

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
