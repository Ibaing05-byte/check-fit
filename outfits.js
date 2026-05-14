import { CLASHING_COLORS, COMPATIBLE_COLORS, GROUP_LABELS, STYLE_TARGETS, TYPE_GROUPS } from "./data.js";

export function recommendOutfit(wardrobe, context, options = {}) {
  const requiredGroups = getRequiredGroups(wardrobe, context);
  const attempts = Array.from({ length: 14 }, () => buildLookCandidate(wardrobe, context, requiredGroups, options));
  const best = attempts
    .filter(candidate => candidate.pieces.length)
    .sort((a, b) => b.score - a.score)[0] || { pieces: [], score: 0 };

  return {
    pieces: best.pieces,
    requiredGroups,
    explanation: buildExplanation(best.pieces, requiredGroups, context)
  };
}

export function createOutfitTitle(context) {
  const occasion = context.occasion || "hoy";
  const style = context.style && context.style !== "cualquiera" ? context.style : "mix";
  return `${capitalize(occasion)} · ${style}`;
}

export function getOutfitPieceIds(pieces) {
  return pieces.map(piece => piece.id);
}

export function incrementUsage(wardrobe, pieceIds) {
  const now = Date.now();
  const idSet = new Set(pieceIds);
  return wardrobe.map(item => {
    if (!idSet.has(item.id)) return item;
    return {
      ...item,
      usageCount: (item.usageCount || 0) + 1,
      lastUsedAt: now
    };
  });
}

export function renderOutfitPiece(item, createImageElement) {
  const card = document.createElement("article");
  card.className = "outfit-piece";
  card.appendChild(createImageElement(item));

  const body = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = item.name;
  const meta = document.createElement("small");
  meta.textContent = `${item.type} · ${item.color || "sin color"} · ${item.style}`;
  body.append(title, meta);

  card.appendChild(body);
  return card;
}

export function renderHistoryItem(outfit, createImageElement, callbacks) {
  const item = document.createElement("article");
  item.className = "history-item";

  const preview = document.createElement("div");
  preview.className = "history-preview";
  outfit.pieces.slice(0, 4).forEach(piece => preview.appendChild(createImageElement(piece)));

  const body = document.createElement("div");
  body.className = "history-copy";
  const title = document.createElement("strong");
  title.textContent = outfit.title;
  const meta = document.createElement("small");
  const date = outfit.createdAt ? new Date(outfit.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : "guardado";
  const context = outfit.context || {};
  meta.textContent = `${date} · ${context.occasion || "look"} · ${context.climate || "clima libre"}${outfit.wornAt ? " · usado" : ""}`;
  const note = document.createElement("p");
  note.textContent = outfit.explanation || `${outfit.pieces.length} prendas guardadas para repetir cuando encaje.`;
  body.append(title, meta, note);

  const actions = document.createElement("div");
  actions.className = "history-actions";
  const favoriteButton = document.createElement("button");
  favoriteButton.type = "button";
  favoriteButton.className = outfit.favorite ? "mini-button primary" : "mini-button ghost";
  favoriteButton.textContent = outfit.favorite ? "Favorito" : "Favorito";
  favoriteButton.addEventListener("click", () => callbacks.onFavorite(outfit.id));
  const useButton = document.createElement("button");
  useButton.type = "button";
  useButton.className = "mini-button ghost";
  useButton.textContent = "Marcar usado";
  useButton.disabled = Boolean(outfit.wornAt);
  useButton.addEventListener("click", () => callbacks.onWear(outfit.id));
  actions.append(favoriteButton, useButton);

  item.append(preview, body, actions);
  return item;
}

function buildLookCandidate(wardrobe, context, requiredGroups, options) {
  const selected = [];
  const excludeIds = options.excludeIds || [];

  requiredGroups.forEach(group => {
    const item = pickBestItem(group, wardrobe, context, selected, excludeIds);
    if (item) selected.push(item);
  });

  return {
    pieces: selected,
    score: scoreLook(selected, requiredGroups, context, options)
  };
}

function getRequiredGroups(wardrobe, context) {
  const needsLayer = context.temperature <= 18 || ["frío", "lluvia", "nublado", "viento"].includes(context.climate);
  const groups = ["top", "bottom"];
  if (needsLayer) groups.push("layer");
  groups.push("shoes");
  if (wardrobe.some(item => TYPE_GROUPS.accessory.includes(item.type))) groups.push("accessory");
  return groups;
}

function pickBestItem(group, wardrobe, context, selected, excludeIds) {
  return wardrobe
    .filter(item => TYPE_GROUPS[group].includes(item.type))
    .filter(item => !selected.some(piece => piece.id === item.id))
    .map(item => ({ item, score: scoreItem(item, context, selected, excludeIds) }))
    .sort((a, b) => b.score - a.score || (a.item.usageCount || 0) - (b.item.usageCount || 0) || (a.item.lastUsedAt || 0) - (b.item.lastUsedAt || 0) || Math.random() - 0.5)[0]?.item;
}

function scoreItem(item, context, selected, excludeIds) {
  let score = 0;
  const styleTargets = getStyleTargets(context);
  const seasonTarget = getSeasonTarget(context.temperature, context.climate);

  if (styleTargets.includes(item.style)) score += 24;
  if (context.style && context.style !== "cualquiera" && item.style === context.style) score += 14;
  if (item.season === seasonTarget) score += 22;
  if (item.season === "entretiempo") score += 6;
  if (context.climate === "lluvia" && [...TYPE_GROUPS.layer, ...TYPE_GROUPS.shoes].includes(item.type)) score += 8;
  if (context.climate === "lluvia" && ["botas", "zapatos"].includes(item.type)) score += 7;
  if (context.climate === "lluvia" && ["sandalias", "shorts"].includes(item.type)) score -= 18;
  if (context.climate === "viento" && TYPE_GROUPS.layer.includes(item.type)) score += 9;
  if (context.temperature >= 26 && ["abrigo", "jersey", "bufanda"].includes(item.type)) score -= 16;
  if (context.temperature >= 26 && item.season === "verano") score += 10;
  if (context.temperature <= 12 && item.season === "invierno") score += 10;
  score += colorHarmonyScore(item.color, selected.map(piece => piece.color));

  if (excludeIds.includes(item.id)) score -= 12;
  if (selected.some(piece => areClashingColors(item.color, piece.color))) score -= 18;
  score += styleHarmonyScore(item.style, selected.map(piece => piece.style), context);
  if (isBasicItem(item)) score += selected.length ? 8 : 12;
  score -= (item.usageCount || 0) * 5;
  if (item.lastUsedAt && Date.now() - item.lastUsedAt < 1000 * 60 * 60 * 24 * 3) score -= 8;

  return score;
}

function scoreLook(pieces, requiredGroups, context, options) {
  if (!pieces.length) return -1000;

  let score = pieces.length * 18;
  const groups = new Set(pieces.flatMap(getItemGroups));
  requiredGroups.forEach(group => {
    score += groups.has(group) ? 18 : -24;
  });

  score += scorePalette(pieces.map(piece => piece.color));
  score += scoreStyleMix(pieces.map(piece => piece.style), context);
  score += pieces.filter(isBasicItem).length * 5;

  const recentOutfits = options.recentOutfits || [];
  const key = combinationKey(pieces);
  if (recentOutfits.some(outfit => combinationKey(outfit.pieces || []) === key)) score -= 90;

  if (context.temperature <= 12 && !pieces.some(piece => ["abrigo", "chaqueta", "cazadora", "sudadera", "jersey"].includes(piece.type))) score -= 22;
  if (context.temperature >= 26 && pieces.some(piece => ["abrigo", "bufanda"].includes(piece.type))) score -= 24;
  if (context.occasion === "evento formal" && pieces.some(piece => ["chándal", "leggings", "sandalias"].includes(piece.type))) score -= 28;
  if (context.occasion === "deporte" && pieces.some(piece => ["zapatos", "abrigo", "vestido"].includes(piece.type))) score -= 22;

  return score;
}

function getStyleTargets(context) {
  if (context.style && context.style !== "cualquiera") return [context.style, ...(STYLE_TARGETS[context.occasion] || [])];
  return STYLE_TARGETS[context.occasion] || ["casual"];
}

function getSeasonTarget(temperature, climate) {
  if (temperature >= 25 || climate === "calor") return "verano";
  if (temperature <= 13 || climate === "frío" || climate === "lluvia") return "invierno";
  return "entretiempo";
}

function colorHarmonyScore(color, selectedColors) {
  if (!color) return 0;
  if (!selectedColors.length) return isNeutral(color) ? 10 : 6;

  const normalized = normalizeColor(color);
  const selected = selectedColors.map(normalizeColor);
  const hasNeutral = selected.some(isNeutral);

  if (isNeutral(normalized)) return 14;
  if (selected.includes(normalized)) return 8;
  if (hasNeutral) return 12;
  if (selected.some(other => areCompatibleColors(normalized, other))) return 10;
  if (selected.some(other => areClashingColors(normalized, other))) return -14;
  return -4;
}

function buildExplanation(pieces, requiredGroups, context) {
  if (!pieces.length) {
    return "Añade algunas prendas clasificadas para que Check Fit pueda combinar clima, ocasión, estilo y color.";
  }

  const colors = pieces.map(piece => piece.color).filter(Boolean);
  const palette = describePalette(colors);
  const selectedGroups = new Set(pieces.flatMap(getItemGroups));
  const missingGroups = requiredGroups
    .filter(group => !selectedGroups.has(group))
    .map(group => GROUP_LABELS[group]);
  const missingText = missingGroups.length ? ` Falta ${formatList(missingGroups)} para cerrar el look.` : "";
  const mood = getLookMood(context, pieces);
  const layerText = pieces.some(piece => TYPE_GROUPS.layer.includes(piece.type))
    ? "capa cómoda"
    : "base ligera";
  const shoe = pieces.find(piece => TYPE_GROUPS.shoes.includes(piece.type));
  const shoeText = shoe ? ` y ${shoe.type} fáciles de combinar` : "";

  return `Te propongo un look ${mood}: ${palette}, ${layerText}${shoeText}. Encaja con ${context.climate} y ${context.temperature}º, evita repetir combinaciones recientes y da prioridad a prendas menos usadas.${missingText}`;
}

function getItemGroups(item) {
  return Object.entries(TYPE_GROUPS)
    .filter(([, types]) => types.includes(item.type))
    .map(([group]) => group);
}

function formatList(values) {
  if (values.length <= 1) return values[0] || "";
  return `${values.slice(0, -1).join(", ")} y ${values.at(-1)}`;
}

function areCompatibleColors(a, b) {
  return COMPATIBLE_COLORS.some(pair => pair.includes(a) && pair.includes(b));
}

function areClashingColors(a, b) {
  const left = normalizeColor(a);
  const right = normalizeColor(b);
  if (!left || !right) return false;
  return CLASHING_COLORS.some(pair => pair.includes(left) && pair.includes(right));
}

function isNeutral(color) {
  return ["negro", "blanco", "gris", "beige", "marrón", "marron", "azul marino"].includes(normalizeColor(color));
}

function isBasicItem(item) {
  return isNeutral(item.color) || ["camiseta", "camisa", "vaqueros", "pantalón", "zapatillas"].includes(item.type);
}

function styleHarmonyScore(style, selectedStyles, context) {
  if (!selectedStyles.length) return 0;
  if (selectedStyles.includes(style)) return 8;
  if (STYLE_TARGETS[context.occasion]?.includes(style)) return 6;
  if (selectedStyles.some(selected => areCompatibleStyles(style, selected))) return 4;
  if (selectedStyles.some(selected => areClashingStyles(style, selected))) return -16;
  return -2;
}

function scoreStyleMix(styles, context) {
  const unique = [...new Set(styles.filter(Boolean))];
  if (unique.length <= 1) return 16;
  let score = 8;
  unique.forEach(style => {
    if (STYLE_TARGETS[context.occasion]?.includes(style)) score += 5;
  });
  for (let index = 0; index < unique.length; index += 1) {
    for (let next = index + 1; next < unique.length; next += 1) {
      if (areCompatibleStyles(unique[index], unique[next])) score += 4;
      if (areClashingStyles(unique[index], unique[next])) score -= 18;
    }
  }
  return score;
}

function scorePalette(colors) {
  const normalized = colors.map(normalizeColor).filter(Boolean);
  if (!normalized.length) return 0;
  const neutralCount = normalized.filter(isNeutral).length;
  const clashCount = countColorClashes(normalized);
  const uniqueCount = new Set(normalized).size;
  let score = neutralCount * 9 - clashCount * 26;
  if (uniqueCount <= 3) score += 14;
  if (neutralCount >= 1 && uniqueCount <= 4) score += 10;
  return score;
}

function countColorClashes(colors) {
  let count = 0;
  for (let index = 0; index < colors.length; index += 1) {
    for (let next = index + 1; next < colors.length; next += 1) {
      if (areClashingColors(colors[index], colors[next])) count += 1;
    }
  }
  return count;
}

function describePalette(colors) {
  const normalized = colors.map(normalizeColor).filter(Boolean);
  const neutrals = normalized.filter(isNeutral);
  const accents = normalized.filter(color => !isNeutral(color));
  if (neutrals.length && accents.length) return `base neutra con acento ${formatList([...new Set(accents)].slice(0, 2))}`;
  if (neutrals.length) return "paleta neutra y fácil de repetir";
  if (normalized.length) return `paleta controlada en ${formatList([...new Set(normalized)].slice(0, 3))}`;
  return "paleta sencilla";
}

function getLookMood(context, pieces) {
  const styles = pieces.map(piece => piece.style);
  if (context.style && context.style !== "cualquiera") return `${context.style} equilibrado`;
  if (styles.includes("streetwear")) return "streetwear relajado";
  if (styles.includes("elegante")) return "pulido sin esfuerzo";
  if (styles.includes("deportivo")) return "cómodo y funcional";
  return "casual equilibrado";
}

function areCompatibleStyles(a, b) {
  return [
    ["casual", "streetwear"],
    ["casual", "deportivo"],
    ["casual", "elegante"],
    ["streetwear", "deportivo"]
  ].some(pair => pair.includes(a) && pair.includes(b));
}

function areClashingStyles(a, b) {
  return [
    ["elegante", "deportivo"],
    ["elegante", "streetwear"]
  ].some(pair => pair.includes(a) && pair.includes(b));
}

function combinationKey(pieces) {
  return pieces.map(piece => piece.id).filter(Boolean).sort().join("|");
}

function normalizeColor(color) {
  return String(color || "").trim().toLowerCase();
}

function capitalize(value) {
  return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
}
