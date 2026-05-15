# SACLO Backend

Backend mínimo para que la beta pueda probar un primer contacto con análisis visual real.

## Qué incluye

- `GET /api/health`: comprueba que el backend está activo.
- `POST /api/analyze-garment`: analiza una foto de una prenda individual con OpenAI Vision.
- `POST /api/analyze-closet`: analiza una foto de armario o varias prendas y devuelve prendas detectadas.
- `POST /api/beta-login`: endpoint reservado por si se reactiva acceso privado más adelante.
- Respuesta JSON estructurada, lista para revisión manual antes de guardar.
- Sin base de datos, sin pagos y sin login obligatorio.

## Instalación

```bash
cd backend
npm install
cp .env.example .env
```

Edita `.env`:

```bash
PORT=3001
FRONTEND_ORIGIN=http://localhost:8000,http://127.0.0.1:8000
OPENAI_API_KEY=tu_clave
OPENAI_VISION_MODEL=gpt-4.1-mini
MAX_IMAGE_MB=8
```

## Ejecutar

```bash
npm run dev
```

Por defecto queda en:

```text
http://localhost:3001
```

Comprueba salud:

```bash
curl http://localhost:3001/api/health
```

## Probar análisis visual

Prenda individual:

```bash
curl -X POST http://localhost:3001/api/analyze-garment \
  -F "image=@/ruta/a/prenda.jpg"
```

Foto de armario:

```bash
curl -X POST http://localhost:3001/api/analyze-closet \
  -F "image=@/ruta/a/armario.jpg"
```

## Notas

- `OPENAI_API_KEY` vive solo en `.env`, nunca en el frontend.
- El frontend sigue funcionando sin backend; si el análisis falla, mantiene el flujo manual.
- La IA puede equivocarse si las prendas están superpuestas, borrosas o con poca luz.

## Despliegue

- Render: opción sencilla para Express desde GitHub. Configura root `backend`, build `npm install`, start `npm start` y variables de entorno.
- Railway: buena opción para APIs Node/Express desde repo GitHub con variables de entorno.
- Fly.io: más flexible, útil si quieres controlar región y despliegue con CLI.
- Cloudflare Workers: barato y rápido, pero este servidor Express tendría que adaptarse al runtime de Workers o usar una capa compatible.
