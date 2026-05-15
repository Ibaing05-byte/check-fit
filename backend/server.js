import "dotenv/config";
import cors from "cors";
import express from "express";
import OpenAI from "openai";

const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini";
const MAX_IMAGE_MB = Number(process.env.MAX_IMAGE_MB || 6);
const JSON_BODY_LIMIT_MB = Math.ceil(MAX_IMAGE_MB * 1.4) + 1;
const MAX_CLOSET_ITEMS = 8;

const TYPES = [
  "camiseta",
  "camisa",
  "polo",
  "top",
  "jersey",
  "sudadera",
  "chaqueta",
  "cazadora",
  "abrigo",
  "pantalón",
  "vaqueros",
  "shorts",
  "falda",
  "vestido",
  "chándal",
  "leggings",
  "zapatos",
  "zapatillas",
  "botas",
  "sandalias",
  "gorra",
  "bolso",
  "bufanda",
  "accesorio",
  "otro"
];
const COLORS = ["blanco", "negro", "gris", "azul", "rojo", "verde", "amarillo", "beige", "marrón", "rosa", "morado", "naranja", "multicolor", "otro"];
const STYLES = ["casual", "elegante", "deportivo", "streetwear", "formal", "minimalista", "otro"];
const SEASONS = ["verano", "invierno", "entretiempo", "todo el año"];

const app = express();

app.use(cors({
  origin: getAllowedOrigin()
}));
app.use(express.json({ limit: `${JSON_BODY_LIMIT_MB}mb` }));

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "saclo-backend"
  });
});

app.post("/api/analyze-garment", asyncHandler(async (request, response) => {
  requireApiKey();
  const image = parseImagePayload(request.body);
  const analysis = await analyzeImage({
    image,
    schemaName: "saclo_garment_analysis",
    schema: garmentSchema(),
    prompt: garmentPrompt(request.body?.filename)
  });

  response.json({
    success: true,
    garment: normalizeGarment(analysis)
  });
}));

app.post("/api/analyze-closet", asyncHandler(async (request, response) => {
  requireApiKey();
  const image = parseImagePayload(request.body);
  const analysis = await analyzeImage({
    image,
    schemaName: "saclo_closet_analysis",
    schema: closetSchema(),
    prompt: closetPrompt()
  });
  const garments = Array.isArray(analysis.garments)
    ? analysis.garments
      .map(normalizeGarment)
      .filter(item => item.confidence >= 0.45)
      .slice(0, MAX_CLOSET_ITEMS)
    : [];

  response.json({
    success: true,
    garments,
    notes: analysis.notes || "Revisa los resultados antes de guardar. La IA puede equivocarse si las prendas están superpuestas."
  });
}));

app.use((error, _request, response, _next) => {
  const isTooLarge = error.type === "entity.too.large";
  const status = isTooLarge ? 413 : error.status || 500;
  response.status(status).json({
    success: false,
    error: isTooLarge ? `La imagen supera el límite de ${MAX_IMAGE_MB} MB. Prueba con una imagen más pequeña.` : error.message || "No se pudo completar la operación.",
    code: isTooLarge ? "IMAGE_TOO_LARGE" : error.code || "SERVER_ERROR"
  });
});

app.listen(PORT, () => {
  console.log(`SACLO backend listening on http://localhost:${PORT}`);
});

async function analyzeImage({ image, schemaName, schema, prompt }) {
  let response;
  try {
    response = await getOpenAI().responses.create({
      model: MODEL,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: image }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema
        }
      }
    });
  } catch (cause) {
    const error = new Error("OpenAI no pudo completar el análisis visual. Revisa la clave, el modelo o prueba otra imagen.");
    error.status = cause?.status || 502;
    error.code = "OPENAI_ERROR";
    throw error;
  }

  try {
    return JSON.parse(response.output_text);
  } catch {
    const error = new Error("La IA devolvió una respuesta inválida. Prueba otra imagen o usa revisión manual.");
    error.status = 502;
    error.code = "INVALID_AI_RESPONSE";
    throw error;
  }
}

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function garmentPrompt(filename = "") {
  return [
    "Eres SACLO, un asistente inteligente de armario y outfits con IA.",
    "Analiza una única prenda de ropa o accesorio visible en la imagen.",
    "Devuelve datos prácticos para que el usuario pueda revisar y guardar la prenda.",
    filename ? `Nombre de archivo opcional: ${String(filename).slice(0, 120)}.` : "",
    `Tipos permitidos: ${TYPES.join(", ")}.`,
    `Colores permitidos: ${COLORS.join(", ")}.`,
    `Estilos permitidos: ${STYLES.join(", ")}.`,
    `Temporadas permitidas: ${SEASONS.join(", ")}.`,
    "No inventes marcas, materiales ni detalles que no se vean.",
    "Si la imagen no es clara, usa confianza baja y una descripción honesta."
  ].filter(Boolean).join("\n");
}

function closetPrompt() {
  return [
    "Eres SACLO, un asistente inteligente de armario y outfits con IA.",
    "Analiza una foto de armario, perchero, cama o varias prendas juntas.",
    "Detecta solo prendas claramente visibles. No inventes prendas ocultas o ambiguas.",
    "Devuelve como máximo 8 prendas.",
    "Si hay prendas superpuestas, poca luz o confusión, devuelve pocas prendas y explícalo en notes.",
    `Tipos permitidos: ${TYPES.join(", ")}.`,
    `Colores permitidos: ${COLORS.join(", ")}.`,
    `Estilos permitidos: ${STYLES.join(", ")}.`,
    `Temporadas permitidas: ${SEASONS.join(", ")}.`
  ].join("\n");
}

function garmentSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["name", "type", "color", "style", "season", "description", "confidence"],
    properties: garmentProperties()
  };
}

function closetSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["garments", "notes"],
    properties: {
      garments: {
        type: "array",
        maxItems: MAX_CLOSET_ITEMS,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "type", "color", "style", "season", "description", "confidence"],
          properties: garmentProperties()
        }
      },
      notes: { type: "string" }
    }
  };
}

function garmentProperties() {
  return {
    name: { type: "string" },
    type: { type: "string", enum: TYPES },
    color: { type: "string", enum: COLORS },
    style: { type: "string", enum: STYLES },
    season: { type: "string", enum: SEASONS },
    description: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  };
}

function normalizeGarment(item) {
  return {
    name: String(item.name || "Prenda detectada").trim(),
    type: TYPES.includes(item.type) ? item.type : "otro",
    color: COLORS.includes(item.color) ? item.color : "otro",
    style: STYLES.includes(item.style) ? item.style : "otro",
    season: SEASONS.includes(item.season) ? item.season : "todo el año",
    description: String(item.description || "Resultado de análisis visual en beta.").trim(),
    confidence: clamp(Number(item.confidence || 0), 0, 1)
  };
}

function parseImagePayload(body) {
  const raw = String(body?.image || body?.imageBase64 || "").trim();
  if (!raw) {
    const error = new Error("Falta la imagen en base64.");
    error.status = 400;
    error.code = "MISSING_IMAGE";
    throw error;
  }

  const image = raw.startsWith("data:image/")
    ? raw
    : `data:image/jpeg;base64,${raw}`;
  const match = image.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/);

  if (!match) {
    const error = new Error("Formato de imagen no válido. Usa JPG, PNG o WEBP en base64.");
    error.status = 400;
    error.code = "INVALID_IMAGE_FORMAT";
    throw error;
  }

  const base64 = match[2].replace(/\s/g, "");
  const bytes = Math.ceil((base64.length * 3) / 4);
  if (bytes > MAX_IMAGE_MB * 1024 * 1024) {
    const error = new Error(`La imagen supera el límite de ${MAX_IMAGE_MB} MB. Prueba con una imagen más pequeña.`);
    error.status = 413;
    error.code = "IMAGE_TOO_LARGE";
    throw error;
  }

  return `data:${match[1].replace("jpg", "jpeg")};base64,${base64}`;
}

function requireApiKey() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY no está configurada en el backend.");
    error.status = 500;
    error.code = "MISSING_OPENAI_API_KEY";
    throw error;
  }
}

function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function getAllowedOrigin() {
  const origins = String(process.env.FRONTEND_ORIGIN || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

  if (!origins.length) return true;
  return (origin, callback) => {
    if (!origin || origins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origen no permitido por CORS."));
  };
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}
