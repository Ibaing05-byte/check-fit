import "dotenv/config";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import OpenAI from "openai";

const PORT = Number(process.env.PORT || 3001);
const MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini";
const MAX_IMAGE_MB = Number(process.env.MAX_IMAGE_MB || 8);
const TOKEN_TTL = "7d";

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
const COLORS = ["blanco", "negro", "gris", "azul", "rojo", "verde", "amarillo", "beige", "marrón", "rosa", "morado", "naranja"];
const STYLES = ["casual", "elegante", "deportivo", "streetwear"];
const SEASONS = ["verano", "invierno", "entretiempo"];

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      callback(new Error("Formato no soportado. Usa JPG, PNG o WEBP."));
      return;
    }
    callback(null, true);
  }
});

app.use(cors({
  origin: getAllowedOrigin()
}));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "saclo-backend",
    vision: Boolean(process.env.OPENAI_API_KEY),
    model: MODEL
  });
});

app.post("/api/beta-login", (request, response) => {
  const email = normalizeEmail(request.body?.email);
  const password = String(request.body?.password || "");
  const allowedEmails = getAllowedTesterEmails();

  if (!email || !password) {
    response.status(400).json({
      ok: false,
      error: "Introduce email y contraseña para acceder a la beta."
    });
    return;
  }

  if (!process.env.BETA_PASSWORD || !process.env.JWT_SECRET) {
    response.status(500).json({
      ok: false,
      error: "La beta no está configurada todavía en el backend."
    });
    return;
  }

  if (!allowedEmails.includes(email) || password !== process.env.BETA_PASSWORD) {
    response.status(401).json({
      ok: false,
      error: "Email o contraseña incorrectos."
    });
    return;
  }

  const token = jwt.sign(
    {
      sub: email,
      scope: "beta-tester"
    },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );

  response.json({
    ok: true,
    token,
    expiresIn: TOKEN_TTL,
    tester: { email }
  });
});

app.post("/api/analyze-garment", upload.single("image"), asyncHandler(async (request, response) => {
  requireApiKey();
  const image = requireImage(request.file);
  const analysis = await analyzeImage({
    image,
    schemaName: "check_fit_garment_analysis",
    schema: garmentSchema(),
    prompt: garmentPrompt()
  });

  response.json({
    ok: true,
    garment: normalizeGarment(analysis)
  });
}));

app.post("/api/analyze-closet", upload.single("image"), asyncHandler(async (request, response) => {
  requireApiKey();
  const image = requireImage(request.file);
  const analysis = await analyzeImage({
    image,
    schemaName: "check_fit_closet_analysis",
    schema: closetSchema(),
    prompt: closetPrompt()
  });
  const garments = Array.isArray(analysis.garments)
    ? analysis.garments.map(normalizeGarment).filter(item => item.confidence >= 0.48)
    : [];

  response.json({
    ok: true,
    garments,
    reviewRecommended: Boolean(analysis.reviewRecommended || garments.some(item => item.confidence < 0.68)),
    message: analysis.message || "Revisa los resultados antes de guardar. La IA puede equivocarse si las prendas están superpuestas."
  });
}));

app.use((error, _request, response, _next) => {
  const status = error.status || 500;
  response.status(status).json({
    ok: false,
    error: error.message || "No se pudo completar la operación."
  });
});

app.listen(PORT, () => {
  console.log(`SACLO backend listening on http://localhost:${PORT}`);
});

async function analyzeImage({ image, schemaName, schema, prompt }) {
  const response = await getOpenAI().responses.create({
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

  return JSON.parse(response.output_text);
}

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function garmentPrompt() {
  return [
    "Eres el análisis visual en beta de SACLO, una app fashion-tech.",
    "Analiza una única prenda de ropa o accesorio visible en la imagen.",
    "Devuelve una clasificación práctica para que una persona pueda guardarla en su armario.",
    `Tipos permitidos: ${TYPES.join(", ")}.`,
    `Colores permitidos: ${COLORS.join(", ")}.`,
    `Estilos permitidos: ${STYLES.join(", ")}.`,
    `Temporadas permitidas: ${SEASONS.join(", ")}.`,
    "Si no estás seguro, baja la confianza y usa una descripción honesta.",
    "No inventes marcas, materiales ni detalles que no se vean."
  ].join("\n");
}

function closetPrompt() {
  return [
    "Eres el análisis visual en beta de SACLO, una app fashion-tech.",
    "Analiza una foto de armario, perchero, cama o varias prendas juntas.",
    "Detecta solo prendas razonablemente visibles y separables. No inventes prendas ocultas.",
    "Si hay ropa superpuesta, poca luz o confusión, devuelve menos prendas, baja confianza y recomienda revisión manual.",
    "Máximo 8 prendas detectadas.",
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
    required: ["name", "type", "color", "style", "season", "confidence", "description"],
    properties: garmentProperties()
  };
}

function closetSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["garments", "reviewRecommended", "message"],
    properties: {
      garments: {
        type: "array",
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "type", "color", "style", "season", "confidence", "description"],
          properties: garmentProperties()
        }
      },
      reviewRecommended: { type: "boolean" },
      message: { type: "string" }
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
    confidence: { type: "number", minimum: 0, maximum: 1 },
    description: { type: "string" }
  };
}

function normalizeGarment(item) {
  return {
    name: String(item.name || "Prenda detectada").trim(),
    type: TYPES.includes(item.type) ? item.type : "otro",
    color: COLORS.includes(item.color) ? item.color : "gris",
    style: STYLES.includes(item.style) ? item.style : "casual",
    season: SEASONS.includes(item.season) ? item.season : "entretiempo",
    confidence: clamp(Number(item.confidence || 0), 0, 1),
    description: String(item.description || "Resultado de análisis visual en beta.").trim()
  };
}

function requireApiKey() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY no está configurada en el backend.");
    error.status = 500;
    throw error;
  }
}

function requireImage(file) {
  if (!file) {
    const error = new Error("Sube una imagen en el campo image.");
    error.status = 400;
    throw error;
  }

  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}

function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function getAllowedTesterEmails() {
  return String(process.env.ALLOWED_TESTER_EMAILS || "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
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
