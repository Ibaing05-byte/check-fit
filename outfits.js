import { CLASHING_COLORS, COMPATIBLE_COLORS, GROUP_LABELS, STYLE_TARGETS, TYPE_GROUPS } from "./data.js";

const VIBE_PROFILES = {
  "casual clean": {
    label: "casual clean",
    styles: ["casual", "minimalista"],
    paletteBias: ["neutral", "soft"],
    copy: "casual limpio"
  },
  "streetwear relaxed": {
    label: "streetwear relaxed",
    styles: ["streetwear", "casual", "deportivo"],
    paletteBias: ["dark", "contrast", "neutral"],
    copy: "streetwear relajado"
  },
  "smart casual": {
    label: "smart casual",
    styles: ["elegante", "minimalista", "casual"],
    paletteBias: ["neutral", "dark"],
    copy: "smart casual"
  },
  "minimal premium": {
    label: "minimal premium",
    styles: ["minimalista", "elegante", "formal"],
    paletteBias: ["neutral", "monochrome", "dark"],
    copy: "minimal premium"
  },
  "sport casual": {
    label: "sport casual",
    styles: ["deportivo", "casual"],
    paletteBias: ["neutral", "contrast"],
    copy: "sport casual"
  },
  "night out": {
    label: "night out",
    styles: ["elegante", "streetwear", "minimalista"],
    paletteBias: ["dark", "contrast"],
    copy: "night out"
  },
  "university fit": {
    label: "university fit",
    styles: ["casual", "streetwear"],
    paletteBias: ["neutral", "soft"],
    copy: "university fit"
  },
  "office fit": {
    label: "office fit",
    styles: ["elegante", "minimalista", "formal"],
    paletteBias: ["neutral", "dark"],
    copy: "office fit"
  },
  "rainy day": {
    label: "rainy day",
    styles: ["casual", "minimalista", "streetwear"],
    paletteBias: ["dark", "neutral"],
    copy: "rainy day"
  },
  "summer basic": {
    label: "summer basic",
    styles: ["casual", "minimalista", "deportivo"],
    paletteBias: ["soft", "neutral"],
    copy: "summer basic"
  },
  "winter layered": {
    label: "winter layered",
    styles: ["casual", "streetwear", "minimalista"],
    paletteBias: ["dark", "neutral", "warm"],
    copy: "winter layered"
  }
};

export function recommendOutfit(wardrobe, context, options = {}) {
  const requiredGroups = getRequiredGroups(wardrobe, context);
  const vibe = resolveVibe(context);
  const attempts = Array.from({ length: 34 }, () => buildLookCandidate(wardrobe, context, requiredGroups, options, vibe));
  const best = attempts
    .filter(candidate => candidate.pieces.length)
    .sort((a, b) => b.score - a.score)[0] || { pieces: [], score: 0 };
  const palette = classifyPalette(best.pieces);
  const advice = buildAdvice(best.pieces, requiredGroups, context, options, vibe, palette);

  return {
    pieces: best.pieces,
    requiredGroups,
    vibe: vibe.label,
    vibeKey: vibe.key,
    palette,
    advice,
    score: best.score,
    explanation: buildExplanation(best.pieces, requiredGroups, context, vibe, palette, advice)
  };
}

export function createOutfitTitle(context) {
  const occasion = context.occasion || "hoy";
  const style = context.vibe || (context.style && context.style !== "cualquiera" ? context.style : "fit");
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
  const role = document.createElement("span");
  role.className = "role-pill";
  role.textContent = getPieceRole(item);
  body.append(role, title, meta);

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
  const vibe = outfit.vibe || context.vibe || "look";
  const palette = typeof outfit.palette === "string" ? outfit.palette : outfit.palette?.label;
  meta.textContent = `${date} · ${context.occasion || "look"} · ${context.climate || "clima libre"} · ${vibe}${outfit.wornAt ? " · usado" : ""}`;
  const note = document.createElement("p");
  note.textContent = outfit.explanation || `${outfit.pieces.length} prendas guardadas para repetir cuando encaje.`;
  const pieces = document.createElement("small");
  pieces.className = "history-pieces";
  pieces.textContent = outfit.pieces?.length ? outfit.pieces.map(piece => piece.name).join(" · ") : "Sin prendas guardadas";
  const tags = document.createElement("div");
  tags.className = "history-tags";
  tags.append(
    createTag(outfit.favorite ? "Favorito" : "Guardado"),
    createTag(outfit.wornAt ? "Usado" : "Sin usar"),
    createTag(palette || "paleta libre")
  );
  body.append(title, meta, tags, note, pieces);

  const actions = document.createElement("div");
  actions.className = "history-actions";
  const favoriteButton = document.createElement("button");
  favoriteButton.type = "button";
  favoriteButton.className = outfit.favorite ? "mini-button primary" : "mini-button ghost";
  favoriteButton.textContent = outfit.favorite ? "Favorito" : "Guardar favorito";
  favoriteButton.addEventListener("click", () => callbacks.onFavorite(outfit.id));
  const reuseButton = document.createElement("button");
  reuseButton.type = "button";
  reuseButton.className = "mini-button secondary";
  reuseButton.textContent = "Usar de nuevo";
  reuseButton.addEventListener("click", () => callbacks.onReuse(outfit.id));
  const variationButton = document.createElement("button");
  variationButton.type = "button";
  variationButton.className = "mini-button ghost";
  variationButton.textContent = "Variación";
  variationButton.addEventListener("click", () => callbacks.onVariation(outfit.id));
  const useButton = document.createElement("button");
  useButton.type = "button";
  useButton.className = "mini-button ghost";
  useButton.textContent = "Marcar usado";
  useButton.disabled = Boolean(outfit.wornAt);
  useButton.addEventListener("click", () => callbacks.onWear(outfit.id));
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "mini-button ghost danger";
  deleteButton.textContent = "Eliminar";
  deleteButton.addEventListener("click", () => callbacks.onDelete(outfit.id));
  actions.append(favoriteButton, reuseButton, variationButton, useButton, deleteButton);

  item.append(preview, body, actions);
  return item;
}

function buildLookCandidate(wardrobe, context, requiredGroups, options, vibe) {
  let selected = [];
  const excludeIds = options.excludeIds || [];

  requiredGroups.forEach(group => {
    const item = pickBestItem(group, wardrobe, context, selected, excludeIds, options, vibe);
    if (item) selected.push(item);
    selected = normalizeLookPieces(selected);
  });

  return {
    pieces: selected,
    score: scoreLook(selected, requiredGroups, context, options, vibe)
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

function pickBestItem(group, wardrobe, context, selected, excludeIds, options, vibe) {
  const scored = wardrobe
    .filter(item => TYPE_GROUPS[group].includes(item.type))
    .filter(item => !selected.some(piece => piece.id === item.id))
    .map(item => ({ item, score: scoreItem(item, context, selected, excludeIds, options, vibe) }))
    .sort((a, b) => b.score - a.score || (a.item.usageCount || 0) - (b.item.usageCount || 0) || (a.item.lastUsedAt || 0) - (b.item.lastUsedAt || 0));
  const bestScore = scored[0]?.score ?? -Infinity;
  const pool = scored.filter(candidate => candidate.score >= bestScore - 12).slice(0, 4);
  return pool[Math.floor(Math.random() * pool.length)]?.item;
}

function scoreItem(item, context, selected, excludeIds, options, vibe) {
  let score = 0;
  const styleTargets = getStyleTargets(context);
  const seasonTarget = getSeasonTarget(context.temperature, context.climate);

  score += scoreVibeFit(item, vibe);
  if (styleTargets.includes(item.style)) score += 24;
  if (context.style && context.style !== "cualquiera" && item.style === context.style) score += 14;
  if (item.season === seasonTarget) score += 22;
  if (item.season === "todo el año") score += 8;
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
  if (options.favoritePieceIds?.includes(item.id)) score += 7;
  if (item.favorite) score += 10;
  if (isForgottenItem(item)) score += 12;
  if (selected.some(piece => areClashingColors(item.color, piece.color))) score -= 18;
  if (selected.some(piece => isHardColorConflict(item.color, piece.color))) score -= 26;
  if (selected.some(piece => isCompetingStatement(item, piece))) score -= 14;
  score += styleHarmonyScore(item.style, selected.map(piece => piece.style), context);
  if (isBasicItem(item)) score += selected.length ? 8 : 12;
  score -= (item.usageCount || 0) * 5;
  if (item.lastUsedAt && Date.now() - item.lastUsedAt < 1000 * 60 * 60 * 24 * 3) score -= 8;
  if (item.lastUsedAt && Date.now() - item.lastUsedAt < 1000 * 60 * 60 * 24) score -= 8;

  return score;
}

function scoreLook(pieces, requiredGroups, context, options, vibe) {
  if (!pieces.length) return -1000;

  let score = pieces.length * 18;
  const groups = new Set(pieces.flatMap(getItemGroups));
  requiredGroups.forEach(group => {
    score += groups.has(group) ? 18 : -24;
  });

  score += scorePalette(pieces.map(piece => piece.color));
  score += scoreStyleMix(pieces.map(piece => piece.style), context);
  score += pieces.filter(isBasicItem).length * 5;
  score += scoreOccasionFit(pieces, context);
  score += scoreVibePalette(pieces, vibe);
  score += scoreStatementBalance(pieces);

  const recentOutfits = options.recentOutfits || [];
  const key = combinationKey(pieces);
  if (recentOutfits.some(outfit => combinationKey(outfit.pieces || []) === key)) score -= 90;

  if (context.temperature <= 12 && !pieces.some(piece => ["abrigo", "chaqueta", "cazadora", "sudadera", "jersey"].includes(piece.type))) score -= 22;
  if (context.temperature >= 26 && pieces.some(piece => ["abrigo", "bufanda"].includes(piece.type))) score -= 24;
  if (context.temperature >= 25 && pieces.some(piece => ["botas", "jersey", "sudadera"].includes(piece.type))) score -= 12;
  if (pieces.some(piece => piece.type === "vestido") && pieces.some(piece => TYPE_GROUPS.top.includes(piece.type))) score -= 18;
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

function resolveVibe(context) {
  let key = "casual clean";
  if (context.climate === "lluvia") key = "rainy day";
  else if (context.temperature <= 12 || context.climate === "frío") key = "winter layered";
  else if (context.temperature >= 26 || context.climate === "calor") key = "summer basic";
  else if (context.occasion === "deporte") key = "sport casual";
  else if (context.occasion === "clase") key = "university fit";
  else if (context.occasion === "trabajo") key = "office fit";
  else if (context.occasion === "cita" || context.occasion === "fiesta") key = "night out";
  else if (context.occasion === "evento formal") key = "minimal premium";
  else if (context.style === "streetwear") key = "streetwear relaxed";
  else if (context.style === "elegante" || context.style === "formal") key = "smart casual";
  else if (context.style === "minimalista") key = "minimal premium";

  return {
    key,
    ...VIBE_PROFILES[key]
  };
}

function normalizeLookPieces(pieces) {
  const dress = pieces.find(piece => piece.type === "vestido");
  if (!dress) return pieces;
  return pieces.filter(piece => piece.id === dress.id || !TYPE_GROUPS.top.includes(piece.type));
}

function scoreVibeFit(item, vibe) {
  let score = 0;
  if (vibe.styles.includes(item.style)) score += 18;
  if (vibe.key === "rainy day" && ["botas", "zapatos", "chaqueta", "cazadora", "abrigo"].includes(item.type)) score += 14;
  if (vibe.key === "summer basic" && ["camiseta", "camisa", "top", "shorts", "falda", "vestido", "sandalias", "zapatillas"].includes(item.type)) score += 12;
  if (vibe.key === "winter layered" && ["jersey", "sudadera", "chaqueta", "cazadora", "abrigo", "bufanda", "botas"].includes(item.type)) score += 14;
  if (vibe.key === "office fit" && ["camisa", "polo", "pantalón", "zapatos", "chaqueta", "abrigo"].includes(item.type)) score += 10;
  if (vibe.key === "university fit" && ["sudadera", "zapatillas", "vaqueros", "mochila", "camiseta"].includes(item.type)) score += 8;
  if (vibe.key === "night out" && ["camisa", "chaqueta", "cazadora", "vestido", "zapatos", "botas", "bolso"].includes(item.type)) score += 10;
  return score;
}

function colorHarmonyScore(color, selectedColors) {
  if (!color) return 0;
  if (["otro", "multicolor"].includes(normalizeColor(color))) return selectedColors.length ? -2 : 2;
  if (!selectedColors.length) return isNeutral(color) ? 10 : 6;

  const normalized = normalizeColor(color);
  const selected = selectedColors.map(normalizeColor);
  const hasNeutral = selected.some(isNeutral);

  if (isNeutral(normalized)) return 14;
  if (selected.includes(normalized)) return 8;
  if (hasNeutral) return 12;
  if (selected.some(other => areCompatibleColors(normalized, other))) return 10;
  if (selected.some(other => areClashingColors(normalized, other))) return -14;
  if (selected.some(other => isHardColorConflict(normalized, other))) return -22;
  return -4;
}

function buildExplanation(pieces, requiredGroups, context, vibe, palette, advice) {
  if (!pieces.length) {
    return "Añade algunas prendas clave para que SACLO pueda construir un look con base, calzado y intención.";
  }

  const selectedGroups = new Set(pieces.flatMap(getItemGroups));
  const missingGroups = requiredGroups
    .filter(group => !selectedGroups.has(group))
    .map(group => GROUP_LABELS[group]);
  const missingText = missingGroups.length ? ` Falta ${formatList(missingGroups)} para cerrar el look.` : "";
  const mood = vibe?.copy || getLookMood(context, pieces);
  const layerText = pieces.some(piece => TYPE_GROUPS.layer.includes(piece.type))
    ? "capa con intención"
    : "base ligera";
  const shoe = pieces.find(piece => TYPE_GROUPS.shoes.includes(piece.type));
  const shoeText = shoe ? ` y ${shoe.type} que aterrizan el fit` : "";
  const adviceText = advice?.length ? ` ${advice[0]}` : "";

  const occasionText = context.occasion ? ` para ${context.occasion}` : "";
  return `Te propongo un look ${mood}${occasionText}: ${palette.label}, ${layerText}${shoeText}. Funciona con ${context.climate} y ${context.temperature}º porque mantiene proporción, clima y color en la misma dirección.${adviceText}${missingText}`;
}

function getItemGroups(item) {
  if (item.type === "vestido") return ["top", "bottom"];
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

function isHardColorConflict(a, b) {
  const left = normalizeColor(a);
  const right = normalizeColor(b);
  if (!left || !right || isNeutral(left) || isNeutral(right)) return false;
  return [
    ["rojo", "verde"],
    ["rosa", "naranja"],
    ["amarillo", "morado"],
    ["verde", "morado"],
    ["naranja", "morado"]
  ].some(pair => pair.includes(left) && pair.includes(right));
}

function isNeutral(color) {
  return ["negro", "blanco", "gris", "beige", "marrón", "marron", "azul marino"].includes(normalizeColor(color));
}

function isBasicItem(item) {
  return isNeutral(item.color) || ["camiseta", "camisa", "vaqueros", "pantalón", "zapatillas"].includes(item.type);
}

function isStatementItem(item) {
  const color = normalizeColor(item.color);
  return color === "multicolor"
    || ["rojo", "amarillo", "morado", "naranja", "rosa", "verde"].includes(color)
    || ["vestido", "abrigo", "cazadora", "bolso"].includes(item.type)
    || item.style === "streetwear";
}

function isCompetingStatement(a, b) {
  return isStatementItem(a) && isStatementItem(b) && !isNeutral(a.color) && !isNeutral(b.color) && normalizeColor(a.color) !== normalizeColor(b.color);
}

function isForgottenItem(item) {
  if (!item.usageCount) return true;
  if (!item.lastUsedAt) return item.usageCount <= 1;
  return Date.now() - item.lastUsedAt > 1000 * 60 * 60 * 24 * 21;
}

function getPieceRole(item) {
  if (TYPE_GROUPS.shoes.includes(item.type)) return "Calzado";
  if (TYPE_GROUPS.layer.includes(item.type)) return "Capa";
  if (TYPE_GROUPS.accessory.includes(item.type)) return "Detalle";
  if (TYPE_GROUPS.bottom.includes(item.type)) return item.type === "vestido" ? "Base completa" : "Base";
  return "Base";
}

function createTag(text) {
  const tag = document.createElement("span");
  tag.className = "history-tag";
  tag.textContent = text;
  return tag;
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

function scoreOccasionFit(pieces, context) {
  let score = 0;
  const types = pieces.map(piece => piece.type);
  const styles = pieces.map(piece => piece.style);

  if (context.occasion === "trabajo") {
    if (styles.some(style => ["elegante", "minimalista", "formal"].includes(style))) score += 12;
    if (types.some(type => ["shorts", "chándal", "leggings"].includes(type))) score -= 18;
  }
  if (context.occasion === "cita") {
    if (styles.some(style => ["elegante", "minimalista"].includes(style))) score += 10;
    if (types.includes("chándal")) score -= 16;
  }
  if (context.occasion === "fiesta") {
    if (styles.some(style => ["elegante", "streetwear"].includes(style))) score += 10;
    if (types.includes("leggings")) score -= 10;
  }
  if (context.occasion === "viaje" || context.occasion === "paseo") {
    if (types.some(type => ["zapatillas", "sudadera", "chaqueta"].includes(type))) score += 9;
  }
  if (context.occasion === "deporte") {
    if (styles.every(style => style === "deportivo" || style === "casual")) score += 16;
    if (!types.some(type => ["zapatillas"].includes(type))) score -= 14;
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

function scoreVibePalette(pieces, vibe) {
  const palette = classifyPalette(pieces);
  if (vibe.paletteBias.includes(palette.key)) return 14;
  if (palette.key === "contrast" && ["office fit", "minimal premium", "summer basic"].includes(vibe.key)) return -8;
  if (palette.key === "soft" && ["night out", "rainy day"].includes(vibe.key)) return -4;
  return 0;
}

function scoreStatementBalance(pieces) {
  const statementCount = pieces.filter(isStatementItem).length;
  const neutralCount = pieces.filter(piece => isNeutral(piece.color)).length;
  let score = 0;
  if (statementCount === 0 && pieces.length >= 4) score -= 4;
  if (statementCount === 1) score += 14;
  if (statementCount > 1) score -= (statementCount - 1) * 18;
  if (neutralCount >= 2) score += 8;
  return score;
}

function classifyPalette(pieces) {
  const colors = pieces.map(piece => normalizeColor(piece.color)).filter(Boolean);
  const unique = [...new Set(colors.filter(color => color !== "otro"))];
  const neutrals = unique.filter(isNeutral);
  const accents = unique.filter(color => !isNeutral(color) && color !== "multicolor");
  const darkCount = unique.filter(color => ["negro", "gris", "marrón", "azul"].includes(color)).length;
  const warmCount = accents.filter(color => ["rojo", "amarillo", "beige", "marrón", "naranja", "rosa"].includes(color)).length;
  const coldCount = accents.filter(color => ["azul", "verde", "morado", "gris", "blanco"].includes(color)).length;

  if (!unique.length) return { key: "neutral", label: "paleta neutra" };
  if (unique.length === 1) return { key: "monochrome", label: `paleta monochrome en ${unique[0]}` };
  if (unique.every(isNeutral)) return { key: darkCount >= 2 ? "dark" : "neutral", label: darkCount >= 2 ? "paleta dark y sobria" : "paleta neutral fácil" };
  if (accents.length === 1 && neutrals.length) return { key: "contrast", label: `base neutra con protagonista ${accents[0]}` };
  if (warmCount > coldCount) return { key: "warm", label: "paleta cálida y suave" };
  if (coldCount > warmCount) return { key: "cold", label: "paleta fría y limpia" };
  if (unique.length <= 3) return { key: "soft", label: "paleta soft bien contenida" };
  return { key: "contrast", label: "paleta con contraste controlado" };
}

function buildAdvice(pieces, requiredGroups, context, options, vibe, palette) {
  if (!pieces.length) {
    return buildMissingAdvice(requiredGroups);
  }

  const advice = [];
  const groups = new Set(pieces.flatMap(getItemGroups));
  const missing = requiredGroups.filter(group => !groups.has(group));
  if (missing.length) advice.push(`Te falta ${formatList(missing.map(group => GROUP_LABELS[group]))} para que el fit quede completo.`);

  const forgotten = pieces.find(isForgottenItem);
  if (forgotten) advice.push(`Hace tiempo que no usas ${forgotten.name}; aquí vuelve sin forzar el look.`);

  const shoe = pieces.find(piece => TYPE_GROUPS.shoes.includes(piece.type));
  if (!shoe) advice.push("Añade un calzado claro y el look sube mucho.");

  if (context.climate === "lluvia" && !pieces.some(piece => ["botas", "zapatos", "chaqueta", "cazadora", "abrigo"].includes(piece.type))) {
    advice.push("Para lluvia, una capa o calzado más cerrado haría el look más útil.");
  }
  if (context.temperature <= 12 && !pieces.some(piece => TYPE_GROUPS.layer.includes(piece.type))) {
    advice.push("Con frío, una capa exterior haría el outfit más completo.");
  }
  if (context.temperature >= 26 && pieces.some(piece => ["abrigo", "jersey", "bufanda"].includes(piece.type))) {
    advice.push("Para calor, mejor mantener tejidos ligeros y menos capas.");
  }

  if (palette.key === "neutral") advice.push("Tu armario tiene buenos básicos: úsalo a favor con una silueta limpia.");
  if (palette.key === "contrast") advice.push("Hay una prenda protagonista; el resto del look la deja respirar.");
  if (vibe.key === "university fit") advice.push("Funciona para clase porque se ve cuidado sin parecer demasiado formal.");
  if (vibe.key === "office fit") advice.push("Tiene presencia para trabajo sin sentirse rígido.");
  if (vibe.key === "night out") advice.push("Tiene un punto más especial sin perder naturalidad.");

  if (options.recentOutfits?.length) advice.push("Evita repetir el último outfit y mantiene variedad real.");

  return [...new Set(advice)].slice(0, 3);
}

function buildMissingAdvice(requiredGroups) {
  return requiredGroups
    .map(group => `Añade ${GROUP_LABELS[group]} para que SACLO pueda cerrar mejor el look.`)
    .slice(0, 2);
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
  if (normalized.includes("multicolor")) return "base sencilla para equilibrar una prenda protagonista";
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
  if (styles.includes("formal")) return "formal limpio";
  if (styles.includes("minimalista")) return "minimalista pulido";
  if (styles.includes("elegante")) return "pulido sin esfuerzo";
  if (styles.includes("deportivo")) return "cómodo y funcional";
  return "casual equilibrado";
}

function areCompatibleStyles(a, b) {
  return [
    ["casual", "streetwear"],
    ["casual", "deportivo"],
    ["casual", "elegante"],
    ["casual", "minimalista"],
    ["elegante", "formal"],
    ["elegante", "minimalista"],
    ["formal", "minimalista"],
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
