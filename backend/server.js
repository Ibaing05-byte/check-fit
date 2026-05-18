import "dotenv/config";
import cors from "cors";
import express from "express";
import OpenAI from "openai";
import { createHash } from "node:crypto";

const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini";
const MAX_IMAGE_MB = Number(process.env.MAX_IMAGE_MB || 6);
const JSON_BODY_LIMIT_MB = Math.ceil(MAX_IMAGE_MB * 1.4) + 1;
const MAX_CLOSET_ITEMS = 8;
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 12000);
const ANALYSIS_CACHE_TTL_MS = Number(process.env.ANALYSIS_CACHE_TTL_MS || 1000 * 60 * 10);
const ANALYSIS_CACHE_LIMIT = Number(process.env.ANALYSIS_CACHE_LIMIT || 80);

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
const OCCASIONS = ["", "casual diario", "oficina", "noche", "gimnasio", "evento"];

const app = express();
const analysisCache = new Map();

app.use(cors({
  origin: getAllowedOrigin()
}));
app.use(express.json({ limit: `${JSON_BODY_LIMIT_MB}mb` }));
app.use((request, response, next) => {
  const startedAt = Date.now();
  response.on("finish", () => {
    console.log("[SACLO][request]", {
      method: request.method,
      path: request.path,
      status: response.statusCode,
      durationMs: Date.now() - startedAt
    });
  });
  next();
});

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "saclo-backend"
  });
});

app.get("/api/debug-openai", asyncHandler(async (_request, response) => {
  requireApiKey();

  try {
    const result = await getOpenAI().responses.create({
      model: MODEL,
      input: "SACLO backend debug. Responde exactamente: ok",
      max_output_tokens: 16
    });

    response.json({
      success: true,
      model: MODEL,
      responseId: result.id,
      output: result.output_text || ""
    });
  } catch (error) {
    logOpenAIError(error, {
      endpoint: "GET /api/debug-openai",
      model: MODEL
    });

    response.status(error.status || 500).json({
      success: false,
      model: MODEL,
      error: serializeOpenAIError(error)
    });
  }
}));

app.post("/api/analyze-garment", asyncHandler(async (request, response) => {
  requireApiKey();
  const image = parseImagePayload(request.body);
  const analysis = await analyzeImage({
    image,
    schemaName: "saclo_garment_analysis",
    schema: garmentSchema(),
    prompt: garmentPrompt(request.body?.filename),
    maxOutputTokens: 420
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
    prompt: closetPrompt(),
    maxOutputTokens: 950
  });
  const garments = Array.isArray(analysis.garments)
    ? analysis.garments
      .map(normalizeGarment)
      .filter(isCoherentGarment)
      .filter(uniqueGarmentFilter())
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
  if (error.code === "OPENAI_ERROR" || error.name?.includes("OpenAI")) {
    logOpenAIError(error, {
      middleware: "global-error-handler",
      status
    });
  }

  response.status(status).json({
    success: false,
    error: isTooLarge ? `La imagen supera el límite de ${MAX_IMAGE_MB} MB. Prueba con una imagen más pequeña.` : error.message || "No se pudo completar la operación.",
    code: isTooLarge ? "IMAGE_TOO_LARGE" : error.code || "SERVER_ERROR",
    details: error.code === "OPENAI_ERROR" ? serializeOpenAIError(error.cause || error) : undefined
  });
});

app.listen(PORT, () => {
  console.log(`SACLO backend listening on http://localhost:${PORT}`);
  console.log(`SACLO OpenAI vision model: ${MODEL}`);
});

async function analyzeImage({ image, schemaName, schema, prompt, maxOutputTokens }) {
  const startedAt = Date.now();
  const cacheKey = `${schemaName}:${hashPayload(prompt)}:${hashPayload(image)}`;
  const cached = readAnalysisCache(cacheKey);

  if (cached) {
    console.log("[SACLO][analysis cache hit]", {
      schemaName,
      model: MODEL,
      durationMs: Date.now() - startedAt
    });
    return cached;
  }

  let response;
  try {
    response = await createOpenAIResponse({
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
      },
      max_output_tokens: maxOutputTokens
    });
  } catch (cause) {
    logOpenAIError(cause, {
      operation: "analyzeImage",
      schemaName,
      model: MODEL
    });

    const error = new Error(cause?.message || "OpenAI no pudo completar el análisis visual.");
    error.status = cause?.status || cause?.response?.status || 502;
    error.code = "OPENAI_ERROR";
    error.cause = cause;
    throw error;
  }

  try {
    const parsed = JSON.parse(response.output_text);
    writeAnalysisCache(cacheKey, parsed);
    console.log("[SACLO][analysis complete]", {
      schemaName,
      model: MODEL,
      responseId: response?.id,
      durationMs: Date.now() - startedAt,
      cached: false
    });
    return parsed;
  } catch (cause) {
    console.error("[SACLO][OpenAI invalid JSON response]", {
      model: MODEL,
      schemaName,
      responseId: response?.id,
      outputText: response?.output_text,
      output: response?.output,
      errorMessage: cause?.message
    });
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
    "SACLO analiza armario y outfits. Devuelve JSON compacto y útil para guardar ropa.",
    "Imagen: una sola prenda o accesorio. Si aparece un outfit completo, describe la prenda principal más clara.",
    "Prioridad: precisión sobre cantidad. No inventes marcas, tejidos ni detalles no visibles.",
    "Ignora fondo, muebles, sombras, piel, perchas y texto decorativo.",
    "Color: elige el color principal visible de la prenda, no el color del fondo. Usa secondaryColor solo si hay un segundo color real.",
    "Distingue con cuidado negro/gris, beige/blanco y azul/negro. Si dudas, baja confidence.",
    "Temporada: dedúcela por tipo, tejido aparente y cobertura; si no está claro usa todo el año o entretiempo.",
    "Style: usa el estilo visual dominante, sin forzar.",
    filename ? `Nombre de archivo opcional: ${String(filename).slice(0, 120)}.` : "",
    `Tipos permitidos: ${TYPES.join(", ")}.`,
    `Colores permitidos: ${COLORS.join(", ")}.`,
    `Estilos permitidos: ${STYLES.join(", ")}.`,
    `Temporadas permitidas: ${SEASONS.join(", ")}.`,
    `Ocasiones permitidas: ${OCCASIONS.filter(Boolean).join(", ")}.`,
    "Si la imagen es confusa, usa confidence menor de 0.7 y escribe reviewReason."
  ].filter(Boolean).join("\n");
}

function closetPrompt() {
  return [
    "SACLO analiza fotos de armario, perchero, cama o varias prendas juntas.",
    "Devuelve SOLO prendas claramente visibles y separables. Precisión > cantidad.",
    "No inventes prendas ocultas, dobladas sin forma clara, muebles, perchas, sombras, etiquetas ni partes del fondo.",
    "Separa prendas independientes: una camiseta y un pantalón son dos prendas; un estampado o bolsillo no es otra prenda.",
    "Si dos detecciones parecen la misma prenda, conserva solo la más clara.",
    "Máximo 8 prendas. En fotos confusas devuelve 1-4 prendas fiables o ninguna.",
    "Color: usa el color principal de cada prenda, no el fondo. Usa secondaryColor solo si aporta algo real.",
    "Distingue con cuidado negro/gris, beige/blanco y azul/negro. Baja confidence si hay mala luz.",
    "Detecta contexto visual: outfit completo, ropa doblada, ropa puesta o prendas superpuestas.",
    "Si hay superposición, mala luz o dudas, explícalo brevemente en notes.",
    `Tipos permitidos: ${TYPES.join(", ")}.`,
    `Colores permitidos: ${COLORS.join(", ")}.`,
    `Estilos permitidos: ${STYLES.join(", ")}.`,
    `Temporadas permitidas: ${SEASONS.join(", ")}.`,
    `Ocasiones permitidas: ${OCCASIONS.filter(Boolean).join(", ")}.`
  ].join("\n");
}

function garmentSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["name", "type", "color", "secondaryColor", "style", "season", "occasion", "imageContext", "reviewReason", "description", "confidence"],
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
        required: ["name", "type", "color", "secondaryColor", "style", "season", "occasion", "imageContext", "reviewReason", "description", "confidence"],
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
    secondaryColor: { type: "string", enum: ["", ...COLORS] },
    style: { type: "string", enum: STYLES },
    season: { type: "string", enum: SEASONS },
    occasion: { type: "string", enum: OCCASIONS },
    imageContext: { type: "string", enum: ["prenda individual", "outfit completo", "ropa doblada", "ropa puesta", "prendas superpuestas", "otro"] },
    reviewReason: { type: "string" },
    description: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  };
}

function normalizeGarment(item) {
  const confidence = clamp(Number(item.confidence || 0), 0, 1);
  const reviewReason = String(item.reviewReason || "").trim();
  return {
    name: String(item.name || "Prenda detectada").trim(),
    type: TYPES.includes(item.type) ? item.type : "otro",
    color: COLORS.includes(item.color) ? item.color : "otro",
    secondaryColor: COLORS.includes(item.secondaryColor) ? item.secondaryColor : "",
    style: STYLES.includes(item.style) ? item.style : "otro",
    season: SEASONS.includes(item.season) ? item.season : "todo el año",
    occasion: OCCASIONS.includes(item.occasion) ? item.occasion : "",
    imageContext: String(item.imageContext || "otro").trim(),
    reviewReason,
    description: buildGarmentDescription(item, confidence, reviewReason),
    confidence
  };
}

function buildGarmentDescription(item, confidence, reviewReason) {
  const description = String(item.description || "").trim();
  const secondaryColor = COLORS.includes(item.secondaryColor) && item.secondaryColor ? ` con detalle ${item.secondaryColor}` : "";
  const occasion = OCCASIONS.includes(item.occasion) && item.occasion ? ` · ${item.occasion}` : "";
  const review = confidence < 0.7 && reviewReason ? ` Revisar: ${reviewReason}` : "";
  return `${description || `${item.type || "Prenda"} ${item.color || ""}${secondaryColor}${occasion}`.trim()}.${review}`.trim();
}

function isCoherentGarment(item) {
  if (!item.name || !item.type || !item.color) return false;
  if (item.type === "otro" && item.confidence < 0.68) return false;
  if (item.color === "otro" && item.confidence < 0.62) return false;
  return !["fondo", "mueble", "percha", "sombra", "persona"].some(word => item.name.toLowerCase().includes(word));
}

function uniqueGarmentFilter() {
  const seen = new Set();
  return item => {
    const compactName = item.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\b(prenda|ropa|detectada|basica|basic[ao])\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const key = `${item.type}:${item.color}:${compactName.slice(0, 24)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
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

async function createOpenAIResponse(params) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    return await getOpenAI().responses.create(params, {
      signal: controller.signal,
      timeout: OPENAI_TIMEOUT_MS
    });
  } finally {
    clearTimeout(timeout);
  }
}

function readAnalysisCache(key) {
  const cached = analysisCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > ANALYSIS_CACHE_TTL_MS) {
    analysisCache.delete(key);
    return null;
  }
  analysisCache.delete(key);
  analysisCache.set(key, cached);
  return JSON.parse(JSON.stringify(cached.value));
}

function writeAnalysisCache(key, value) {
  analysisCache.set(key, {
    createdAt: Date.now(),
    value: JSON.parse(JSON.stringify(value))
  });
  while (analysisCache.size > ANALYSIS_CACHE_LIMIT) {
    analysisCache.delete(analysisCache.keys().next().value);
  }
}

function hashPayload(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 20);
}

function logOpenAIError(error, context = {}) {
  console.error("[SACLO][OpenAI error]", {
    context,
    message: error?.message,
    status: error?.status || error?.response?.status,
    code: error?.code,
    type: error?.type,
    param: error?.param,
    requestId: error?.request_id,
    responseData: error?.response?.data,
    responseBody: error?.response?.body,
    headers: error?.headers,
    fullError: serializeOpenAIError(error)
  });
}

function serializeOpenAIError(error) {
  return {
    message: error?.message,
    status: error?.status || error?.response?.status,
    code: error?.code,
    type: error?.type,
    param: error?.param,
    requestId: error?.request_id,
    responseData: error?.response?.data,
    responseBody: error?.response?.body,
    headers: error?.headers,
    name: error?.name,
    stack: error?.stack
  };
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
