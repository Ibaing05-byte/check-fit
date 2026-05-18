import "dotenv/config";
import cors from "cors";
import express from "express";
import OpenAI from "openai";
import { createHash } from "node:crypto";

const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini";
const MAX_IMAGE_MB = Number(process.env.MAX_IMAGE_MB || 4);
const JSON_BODY_LIMIT_MB = Math.ceil(MAX_IMAGE_MB * 1.37) + 1;
const MAX_CLOSET_ITEMS = 8;
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 12000);
const ANALYSIS_CACHE_TTL_MS = Number(process.env.ANALYSIS_CACHE_TTL_MS || 1000 * 60 * 10);
const ANALYSIS_CACHE_LIMIT = Number(process.env.ANALYSIS_CACHE_LIMIT || 80);
const MAX_OPENAI_IMAGE_SIDE = Number(process.env.MAX_OPENAI_IMAGE_SIDE || 1200);
const OPENAI_IMAGE_JPEG_QUALITY = clampInteger(Number(process.env.OPENAI_IMAGE_JPEG_QUALITY || 76), 70, 80);
const TARGET_OPENAI_IMAGE_MB = Number(process.env.TARGET_OPENAI_IMAGE_MB || 2.2);
const MAX_INPUT_PIXELS = Number(process.env.MAX_INPUT_PIXELS || 24_000_000);

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
const analysisInFlight = new Map();
let sharpImportPromise = null;

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
  const startedAt = Date.now();
  requireApiKey();
  const image = await prepareImageForOpenAI(parseImagePayload(request.body));
  const analysisResult = await analyzeImage({
    endpoint: "POST /api/analyze-garment",
    image,
    schemaName: "saclo_garment_analysis",
    schema: garmentSchema(),
    prompt: garmentPrompt(request.body?.filename),
    maxOutputTokens: 420
  });
  const garment = normalizeGarment(analysisResult.data);

  logAnalysisResult({
    endpoint: "POST /api/analyze-garment",
    startedAt,
    image,
    detectedItems: garment ? 1 : 0,
    cached: analysisResult.cached
  });

  response.json({
    success: true,
    garment
  });
}));

app.post("/api/analyze-closet", asyncHandler(async (request, response) => {
  const startedAt = Date.now();
  requireApiKey();
  const image = await prepareImageForOpenAI(parseImagePayload(request.body));
  const analysisResult = await analyzeImage({
    endpoint: "POST /api/analyze-closet",
    image,
    schemaName: "saclo_closet_analysis",
    schema: closetSchema(),
    prompt: closetPrompt(),
    maxOutputTokens: 980
  });
  const analysis = analysisResult.data;
  const garments = Array.isArray(analysis.garments)
    ? analysis.garments
      .map(normalizeGarment)
      .filter(isCoherentGarment)
      .filter(uniqueGarmentFilter())
      .filter(item => item.confidence >= 0.45)
      .slice(0, MAX_CLOSET_ITEMS)
    : [];

  logAnalysisResult({
    endpoint: "POST /api/analyze-closet",
    startedAt,
    image,
    detectedItems: garments.length,
    cached: analysisResult.cached
  });

  response.json({
    success: true,
    garments,
    notes: analysis.notes || "Revisa los resultados antes de guardar. La detección puede variar si las prendas están superpuestas."
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

async function analyzeImage({ endpoint, image, schemaName, schema, prompt, maxOutputTokens }) {
  const startedAt = Date.now();
  const cacheKey = `${schemaName}:${hashPayload(prompt)}:${hashPayload(image.dataUrl)}`;
  const cached = readAnalysisCache(cacheKey);

  if (cached) {
    console.log("[SACLO][analysis cache hit]", {
      endpoint,
      schemaName,
      model: MODEL,
      image: imageLogSummary(image),
      durationMs: Date.now() - startedAt
    });
    return {
      data: cached,
      cached: true
    };
  }

  const inFlight = analysisInFlight.get(cacheKey);
  if (inFlight) {
    console.log("[SACLO][analysis in-flight reuse]", {
      endpoint,
      schemaName,
      model: MODEL,
      image: imageLogSummary(image)
    });
    return inFlight;
  }

  const operation = runOpenAIAnalysis({ endpoint, image, schemaName, schema, prompt, maxOutputTokens, startedAt, cacheKey })
    .finally(() => analysisInFlight.delete(cacheKey));
  analysisInFlight.set(cacheKey, operation);
  return operation;
}

async function runOpenAIAnalysis({ endpoint, image, schemaName, schema, prompt, maxOutputTokens, startedAt, cacheKey }) {
  let response;
  try {
    response = await createOpenAIResponse({
      model: MODEL,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: image.dataUrl }
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
      endpoint,
      operation: "analyzeImage",
      schemaName,
      model: MODEL,
      image: imageLogSummary(image)
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
      endpoint,
      schemaName,
      model: MODEL,
      responseId: response?.id,
      image: imageLogSummary(image),
      durationMs: Date.now() - startedAt,
      cached: false
    });
    return {
      data: parsed,
      cached: false,
      responseId: response?.id
    };
  } catch (cause) {
    console.error("[SACLO][OpenAI invalid JSON response]", {
      endpoint,
      model: MODEL,
      schemaName,
      responseId: response?.id,
      outputText: response?.output_text,
      output: response?.output,
      errorMessage: cause?.message
    });
    const error = new Error("El análisis devolvió una respuesta inválida. Prueba otra imagen más clara.");
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
    "Analiza 1 prenda/accesorio visible y devuelve JSON corto.",
    "Si hay outfit completo, usa la prenda principal más clara. No inventes marcas, tejidos ni detalles.",
    "Ignora fondo, muebles, sombras, piel, perchas y texto. Precisión > detalle.",
    "Color = color principal de la prenda; secondaryColor solo si es real. Duda negro/gris, beige/blanco o azul/negro => baja confidence.",
    classificationPromptRules(),
    seasonPromptRules(),
    "Si dudas entre tipos, elige el más probable, añade typeAlternatives y reviewReason. Usa reviewReason si confidence <0.8.",
    "Texto corto: name <=4 palabras, description <=90 caracteres, reviewReason <=120.",
    filename ? `Nombre de archivo opcional: ${String(filename).slice(0, 120)}.` : "",
    `Enums type=${TYPES.join("|")}; color=${COLORS.join("|")}; style=${STYLES.join("|")}; season=${SEASONS.join("|")}; occasion=${OCCASIONS.filter(Boolean).join("|")}.`,
    "Si la imagen es confusa, doblada, parcial o superpuesta: baja confidence y avisa qué revisar."
  ].filter(Boolean).join("\n");
}

function closetPrompt() {
  return [
    "Analiza armario/perchero/cama con varias prendas. Devuelve JSON corto.",
    "Detecta SOLO prendas claramente visibles y separables. Precisión > cantidad.",
    "No inventes prendas ocultas, muebles, perchas, sombras, etiquetas ni fondo.",
    "Separa prendas reales; estampados, bolsillos o partes de una prenda no cuentan.",
    `Máximo ${MAX_CLOSET_ITEMS} prendas; si hay duda devuelve 1-4 fiables o ninguna.`,
    "Quita duplicados evidentes. Color = principal de cada prenda; secondaryColor solo si aporta.",
    "Duda negro/gris, beige/blanco o azul/negro, mala luz o superposición => baja confidence.",
    classificationPromptRules(),
    seasonPromptRules(),
    "Si dudas entre tipos, elige el más probable, añade typeAlternatives y reviewReason. Usa reviewReason si confidence <0.8.",
    "Texto corto: name <=4 palabras, description <=90 caracteres, reviewReason <=120, notes <=120.",
    `Enums type=${TYPES.join("|")}; color=${COLORS.join("|")}; style=${STYLES.join("|")}; season=${SEASONS.join("|")}; occasion=${OCCASIONS.filter(Boolean).join("|")}.`
  ].join("\n");
}

function classificationPromptRules() {
  return [
    "Tipos: no uses color para decidir tipo. No llames jersey a una prenda solo por ser negra.",
    "Polo: cuello polo, abertura corta en pecho o botones cortos => polo; no jersey salvo punto/grueso claro.",
    "Camiseta: ligera, sin estructura exterior, sin botones completos, sin cremallera, sin aspecto de chaqueta.",
    "Camisa: botones completos, cuello estructurado y tejido de camisa; si es gruesa/capa exterior considera chaqueta/cazadora.",
    "Jersey: solo punto, lana, tejido grueso o prenda cálida; no confundir con polo/camiseta/camisa oscura.",
    "Sudadera: capucha, felpa, puños deportivos o tejido grueso casual; sin capucha puede ser sudadera si parece felpa.",
    "Chaqueta/cazadora: capa exterior con estructura, puños, botones, cremallera, bolsillos, cuello o grosor. En armario colgada, beige y exterior => chaqueta/cazadora antes que camiseta.",
    "Abrigo: solo si largo, grueso o claramente de invierno.",
    "Vaqueros: solo si ves denim, costuras/bordes vaqueros, bolsillos jeans, remaches o corte típico. Si está doblado y no se distingue denim, usa pantalón + reviewReason.",
    "Pantalón: úsalo si no hay evidencia de denim, chándal, leggings o shorts."
  ].join(" ");
}

function seasonPromptRules() {
  return [
    "Temporada: basa en tejido, grosor, manga, uso probable y tipo; nunca en color, fondo, estética o iluminación.",
    "Camiseta/polo/camisa ligera => verano o todo el año; manga larga ligera => todo el año o entretiempo.",
    "Jersey/sudadera => entretiempo o invierno. Chaqueta/cazadora => entretiempo. Abrigo => invierno.",
    "Vaqueros/pantalones/zapatillas => normalmente todo el año. Si dudas, usa todo el año antes que inventar entretiempo/invierno."
  ].join(" ");
}

function garmentSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["name", "type", "typeAlternatives", "color", "secondaryColor", "style", "season", "occasion", "imageContext", "reviewReason", "description", "confidence"],
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
          required: ["name", "type", "typeAlternatives", "color", "secondaryColor", "style", "season", "occasion", "imageContext", "reviewReason", "description", "confidence"],
          properties: garmentProperties()
        }
      },
      notes: { type: "string", maxLength: 160 }
    }
  };
}

function garmentProperties() {
  return {
    name: { type: "string", maxLength: 48 },
    type: { type: "string", enum: TYPES },
    typeAlternatives: {
      type: "array",
      maxItems: 3,
      items: { type: "string", enum: TYPES }
    },
    color: { type: "string", enum: COLORS },
    secondaryColor: { type: "string", enum: ["", ...COLORS] },
    style: { type: "string", enum: STYLES },
    season: { type: "string", enum: SEASONS },
    occasion: { type: "string", enum: OCCASIONS },
    imageContext: { type: "string", enum: ["prenda individual", "outfit completo", "ropa doblada", "ropa puesta", "prendas superpuestas", "otro"] },
    reviewReason: { type: "string", maxLength: 140 },
    description: { type: "string", maxLength: 120 },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  };
}

function normalizeGarment(item) {
  const confidence = clamp(Number(item.confidence || 0), 0, 1);
  const reviewReason = String(item.reviewReason || "").trim();
  return normalizeGarmentClassification({
    name: String(item.name || "Prenda detectada").trim(),
    type: TYPES.includes(item.type) ? item.type : "otro",
    typeAlternatives: normalizeTypeAlternatives(item.typeAlternatives),
    color: COLORS.includes(item.color) ? item.color : "otro",
    secondaryColor: COLORS.includes(item.secondaryColor) ? item.secondaryColor : "",
    style: STYLES.includes(item.style) ? item.style : "otro",
    season: SEASONS.includes(item.season) ? item.season : "todo el año",
    occasion: OCCASIONS.includes(item.occasion) ? item.occasion : "",
    imageContext: String(item.imageContext || "otro").trim(),
    reviewReason,
    description: buildGarmentDescription(item, confidence, reviewReason),
    confidence
  });
}

function normalizeGarmentClassification(garment) {
  const normalized = {
    ...garment,
    typeAlternatives: normalizeTypeAlternatives(garment.typeAlternatives),
    reviewReason: String(garment.reviewReason || "").trim(),
    confidence: clamp(Number(garment.confidence || 0), 0, 1)
  };
  const evidence = normalizeEvidenceText(normalized);

  if (normalized.type === "jersey" && includesAny(evidence, ["polo", "cuello polo", "botones cortos", "abertura corta"])) {
    normalized.type = "polo";
    normalized.typeAlternatives = addTypeAlternative(normalized.typeAlternatives, "jersey", normalized.type);
    normalized.reviewReason = appendReviewReason(normalized.reviewReason, "Revisa si el tejido es punto grueso o polo.");
    normalized.confidence = Math.min(normalized.confidence, 0.78);
  }

  if (normalized.type === "camiseta" && includesAny(evidence, ["chaqueta", "cazadora", "jacket", "outerwear", "capa exterior"])) {
    normalized.type = "chaqueta";
    normalized.typeAlternatives = addTypeAlternative(normalized.typeAlternatives, "camiseta", normalized.type);
    normalized.reviewReason = appendReviewReason(normalized.reviewReason, "Revisa si es capa exterior o prenda ligera.");
    normalized.confidence = Math.min(normalized.confidence, 0.76);
  }

  if (normalized.type === "camiseta" && includesAny(evidence, ["botones", "cremallera", "puños", "puno", "cuello estructurado", "bolsillos visibles"])) {
    normalized.typeAlternatives = addTypeAlternative(normalized.typeAlternatives, "camisa", normalized.type);
    normalized.typeAlternatives = addTypeAlternative(normalized.typeAlternatives, "chaqueta", normalized.type);
    normalized.reviewReason = appendReviewReason(normalized.reviewReason, "SACLO no está completamente seguro. Revisa si es camiseta, camisa o capa exterior.");
    normalized.confidence = Math.min(normalized.confidence, 0.79);
  }

  if (normalized.type === "vaqueros" && !includesAny(evidence, ["denim", "vaquero", "jeans", "remache", "costura", "bolsillo vaquero"])) {
    normalized.typeAlternatives = addTypeAlternative(normalized.typeAlternatives, "pantalón", normalized.type);
    normalized.reviewReason = appendReviewReason(normalized.reviewReason, "Puede ser vaquero si el tejido es denim. Revisa tejido, bolsillos y costuras.");
    normalized.confidence = Math.min(normalized.confidence, 0.78);
  }

  if (normalized.type === "pantalón" && includesAny(evidence, ["denim", "jeans", "vaquero", "remache", "bolsillo vaquero"])) {
    normalized.type = "vaqueros";
    normalized.typeAlternatives = addTypeAlternative(normalized.typeAlternatives, "pantalón", normalized.type);
  }

  if (["jersey", "sudadera"].includes(normalized.type) && normalized.confidence < 0.8) {
    normalized.typeAlternatives = addTypeAlternative(normalized.typeAlternatives, normalized.type === "jersey" ? "sudadera" : "jersey", normalized.type);
    normalized.reviewReason = appendReviewReason(normalized.reviewReason, "Revisa si el tejido es punto/lana o felpa.");
  }

  if (["chaqueta", "cazadora", "camisa"].includes(normalized.type) && normalized.confidence < 0.8) {
    normalized.reviewReason = appendReviewReason(normalized.reviewReason, "Revisa si es una capa exterior o una camisa ligera.");
  }

  normalized.season = normalizeSeasonClassification(normalized, evidence);
  if (normalized.confidence < 0.8 && !normalized.reviewReason) {
    normalized.reviewReason = "SACLO no está completamente seguro. Revisa tipo y temporada antes de guardar.";
  }
  normalized.typeAlternatives = normalizeTypeAlternatives(normalized.typeAlternatives)
    .filter(type => type !== normalized.type);
  normalized.description = alignDescriptionWithType(normalized);

  return normalized;
}

function normalizeSeasonClassification(garment, evidence) {
  let season = garment.season;

  if (["vaqueros", "pantalón", "zapatillas", "zapatos"].includes(garment.type)) {
    season = "todo el año";
  }

  if (["camiseta", "polo"].includes(garment.type) && ["invierno", "entretiempo"].includes(season) && includesAny(evidence, ["manga corta", "ligera", "verano"])) {
    season = includesAny(evidence, ["manga corta", "ligera", "verano"]) ? "verano" : "todo el año";
  }

  if (["camiseta", "polo"].includes(garment.type) && season === "invierno") {
    season = "todo el año";
  }

  if (garment.type === "camisa" && season === "invierno" && !includesAny(evidence, ["gruesa", "franela", "sobrecamisa"])) {
    season = "todo el año";
  }

  if (["jersey", "sudadera"].includes(garment.type) && season === "verano") {
    season = "entretiempo";
  }

  if (["chaqueta", "cazadora"].includes(garment.type) && !["entretiempo", "todo el año"].includes(season)) {
    season = "entretiempo";
  }

  if (garment.type === "abrigo") {
    season = "invierno";
  }

  if (includesAny(evidence, ["por color", "color oscuro", "negra", "negro"]) && ["invierno", "entretiempo"].includes(garment.season) && ["camiseta", "polo", "pantalón", "vaqueros"].includes(garment.type)) {
    season = "todo el año";
  }

  if (season !== garment.season) {
    garment.reviewReason = appendReviewReason(garment.reviewReason, "La temporada puede variar según el grosor y el tejido.");
  }

  return season;
}

function buildGarmentDescription(item, confidence, reviewReason) {
  const description = String(item.description || "").trim();
  const secondaryColor = COLORS.includes(item.secondaryColor) && item.secondaryColor ? ` con detalle ${item.secondaryColor}` : "";
  const occasion = OCCASIONS.includes(item.occasion) && item.occasion ? ` · ${item.occasion}` : "";
  const review = confidence < 0.7 && reviewReason ? ` Revisar: ${reviewReason}` : "";
  return `${description || `${item.type || "Prenda"} ${item.color || ""}${secondaryColor}${occasion}`.trim()}.${review}`.trim();
}

function alignDescriptionWithType(item) {
  let description = String(item.description || "").trim();
  if (!description) return `${item.type} ${item.color}`.trim();

  const replacements = {
    polo: ["jersey", "camiseta"],
    chaqueta: ["camiseta"],
    cazadora: ["camiseta"],
    vaqueros: ["pantalón", "pantalones"],
    pantalón: ["vaqueros", "jeans"]
  };

  (replacements[item.type] || []).forEach(word => {
    description = description.replace(new RegExp(`\\b${word}\\b`, "gi"), item.type);
  });

  return description;
}

function normalizeTypeAlternatives(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .filter(type => TYPES.includes(type))
    .slice(0, 3))];
}

function addTypeAlternative(alternatives, type, currentType) {
  if (!TYPES.includes(type) || type === currentType) return alternatives;
  return [...new Set([...alternatives, type])].slice(0, 3);
}

function normalizeEvidenceText(item) {
  return [item.name, item.description, item.reviewReason, item.type, item.imageContext]
    .map(value => String(value || "").toLowerCase())
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesAny(text, words) {
  return words.some(word => text.includes(String(word).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()));
}

function appendReviewReason(current, addition) {
  const base = String(current || "").trim();
  if (!base) return addition;
  if (base.includes(addition)) return base;
  return `${base} ${addition}`.slice(0, 180).trim();
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

  const mimeType = match[1].replace("jpg", "jpeg");
  const inputBuffer = Buffer.from(base64, "base64");
  const dimensions = readImageDimensions(inputBuffer, mimeType);

  return {
    dataUrl: `data:${mimeType};base64,${base64}`,
    mimeType,
    base64,
    bytes,
    sizeMb: bytesToMb(bytes),
    originalBytes: bytes,
    originalSizeMb: bytesToMb(bytes),
    width: dimensions.width,
    height: dimensions.height,
    optimized: false
  };
}

async function prepareImageForOpenAI(image) {
  const sharp = await getSharp();
  if (!sharp) {
    const sideTooLarge = Math.max(image.width, image.height) > MAX_OPENAI_IMAGE_SIDE;
    if (image.sizeMb > TARGET_OPENAI_IMAGE_MB || sideTooLarge) {
      const error = new Error("La imagen supera el tamaño optimizado permitido. Prueba con una imagen más pequeña.");
      error.status = 413;
      error.code = "IMAGE_TOO_LARGE";
      throw error;
    }

    return {
      ...image,
      optimizationSkipped: "sharp_unavailable"
    };
  }

  const inputBuffer = Buffer.from(image.base64, "base64");

  try {
    const metadata = await sharp(inputBuffer, {
      failOn: "none",
      limitInputPixels: MAX_INPUT_PIXELS
    }).rotate().metadata();

    const width = Number(metadata.width || 0);
    const height = Number(metadata.height || 0);
    const needsResize = Math.max(width, height) > MAX_OPENAI_IMAGE_SIDE;
    const needsReencode = image.mimeType !== "image/jpeg" || image.sizeMb > TARGET_OPENAI_IMAGE_MB || needsResize;

    if (!needsReencode) {
      return {
        ...image,
        width,
        height
      };
    }

    let side = MAX_OPENAI_IMAGE_SIDE;
    let quality = OPENAI_IMAGE_JPEG_QUALITY;
    let outputBuffer = null;
    let outputInfo = {};

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const output = await sharp(inputBuffer, {
        failOn: "none",
        limitInputPixels: MAX_INPUT_PIXELS
      })
        .rotate()
        .resize({
          width: side,
          height: side,
          fit: "inside",
          withoutEnlargement: true
        })
        .jpeg({
          quality,
          mozjpeg: true
        })
        .toBuffer({ resolveWithObject: true });
      outputBuffer = output.data;
      outputInfo = output.info || {};

      if (bytesToMb(outputBuffer.length) <= TARGET_OPENAI_IMAGE_MB || side <= 840) break;
      side = Math.max(840, Math.round(side * 0.84));
      quality = Math.max(70, quality - 3);
    }

    return {
      dataUrl: bufferToDataUrl(outputBuffer, "image/jpeg"),
      mimeType: "image/jpeg",
      base64: outputBuffer.toString("base64"),
      bytes: outputBuffer.length,
      sizeMb: bytesToMb(outputBuffer.length),
      originalBytes: image.originalBytes,
      originalSizeMb: image.originalSizeMb,
      width: Number(outputInfo.width || 0),
      height: Number(outputInfo.height || 0),
      optimized: true
    };
  } catch (error) {
    console.warn("[SACLO][image optimization skipped]", {
      message: error?.message,
      mimeType: image.mimeType,
      imageMb: roundNumber(image.sizeMb)
    });
    return {
      ...image,
      optimizationSkipped: "optimizer_error"
    };
  }
}

function requireApiKey() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY no está configurada en el backend.");
    error.status = 500;
    error.code = "MISSING_OPENAI_API_KEY";
    throw error;
  }
}

async function getSharp() {
  if (!sharpImportPromise) {
    sharpImportPromise = import("sharp")
      .then(module => module.default || module)
      .catch(error => {
        console.warn("[SACLO][image optimizer unavailable]", {
          message: error?.message
        });
        return null;
      });
  }
  return sharpImportPromise;
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

function logAnalysisResult({ endpoint, startedAt, image, detectedItems, cached }) {
  console.log("[SACLO][analysis result]", {
    endpoint,
    model: MODEL,
    durationMs: Date.now() - startedAt,
    image: imageLogSummary(image),
    detectedItems,
    cached
  });
}

function imageLogSummary(image) {
  return {
    mb: roundNumber(image.sizeMb),
    originalMb: roundNumber(image.originalSizeMb),
    mimeType: image.mimeType,
    dimensions: image.width && image.height ? `${image.width}x${image.height}` : "unknown",
    optimized: Boolean(image.optimized),
    optimizationSkipped: image.optimizationSkipped || undefined
  };
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

function bufferToDataUrl(buffer, mimeType) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function readImageDimensions(buffer, mimeType) {
  if (mimeType === "image/png" && buffer.length >= 24) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  }

  if (mimeType === "image/jpeg" && buffer.length >= 4) {
    return readJpegDimensions(buffer);
  }

  return { width: 0, height: 0 };
}

function readJpegDimensions(buffer) {
  let offset = 2;
  while (offset < buffer.length - 9) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (isJpegStartOfFrame(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }

    if (!length || length < 2) break;
    offset += 2 + length;
  }

  return { width: 0, height: 0 };
}

function isJpegStartOfFrame(marker) {
  return [
    0xc0,
    0xc1,
    0xc2,
    0xc3,
    0xc5,
    0xc6,
    0xc7,
    0xc9,
    0xca,
    0xcb,
    0xcd,
    0xce,
    0xcf
  ].includes(marker);
}

function bytesToMb(bytes) {
  return bytes / (1024 * 1024);
}

function roundNumber(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
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

function clampInteger(value, min, max) {
  return Math.round(clamp(value, min, max));
}
