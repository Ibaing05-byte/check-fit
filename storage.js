import { DEFAULT_WARDROBE, SEASONS, STORAGE_KEYS, STYLES, TYPES } from "./data.js";

export function createId(prefix = "cf") {
  if (window.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadWardrobe() {
  const stored = readJson(STORAGE_KEYS.wardrobe, null);
  const source = Array.isArray(stored) ? stored : DEFAULT_WARDROBE;
  return source.map(normalizeWardrobeItem);
}

export function saveWardrobe(items) {
  return writeJson(STORAGE_KEYS.wardrobe, items.map(normalizeWardrobeItem));
}

export function loadDrafts() {
  const stored = readJson(STORAGE_KEYS.drafts, []);
  return Array.isArray(stored) ? stored.map(normalizeDraftItem) : [];
}

export function saveDrafts(items) {
  return writeJson(STORAGE_KEYS.drafts, items.map(normalizeDraftItem));
}

export function loadFilters() {
  const filters = readJson(STORAGE_KEYS.filters, {});
  return {
    search: String(filters.search || ""),
    type: validOrDefault(filters.type, ["todos", ...TYPES], "todos"),
    style: validOrDefault(filters.style, ["todos", ...STYLES], "todos"),
    season: validOrDefault(filters.season, ["todos", ...SEASONS], "todos"),
    color: String(filters.color || "todos"),
    sort: validOrDefault(filters.sort, ["recent", "name", "least-used", "most-used"], "recent")
  };
}

export function saveFilters(filters) {
  return writeJson(STORAGE_KEYS.filters, filters);
}

export function loadOutfits() {
  const stored = readJson(STORAGE_KEYS.outfits, []);
  return Array.isArray(stored) ? stored.map(normalizeOutfitRecord) : [];
}

export function saveOutfits(outfits) {
  return writeJson(STORAGE_KEYS.outfits, outfits.map(normalizeOutfitRecord));
}

export function readLastOutfitIds() {
  const stored = readJson(STORAGE_KEYS.lastOutfit, []);
  return Array.isArray(stored) ? stored : [];
}

export function saveLastOutfitIds(ids) {
  return writeJson(STORAGE_KEYS.lastOutfit, ids);
}

export function loadEngagement() {
  return normalizeEngagement(readJson(STORAGE_KEYS.engagement, {}));
}

export function saveEngagement(engagement) {
  return writeJson(STORAGE_KEYS.engagement, normalizeEngagement(engagement));
}

export function createWardrobeItem(data) {
  return normalizeWardrobeItem({
    id: data.id || createId("item"),
    createdAt: data.createdAt || Date.now(),
    ...data
  });
}

export function createDraftItem(data) {
  return normalizeDraftItem({
    id: data.id || createId("draft"),
    createdAt: data.createdAt || Date.now(),
    ...data
  });
}

export function createOutfitRecord(data) {
  return normalizeOutfitRecord({
    id: data.id || createId("outfit"),
    createdAt: data.createdAt || Date.now(),
    favorite: Boolean(data.favorite),
    wornAt: data.wornAt || 0,
    ...data
  });
}

export function normalizeWardrobeItem(data) {
  return {
    id: data.id || createId("item"),
    name: String(data.name || "Prenda sin nombre").trim(),
    type: validOrDefault(data.type, TYPES, "otro"),
    color: normalizeText(data.color || ""),
    style: validOrDefault(data.style, STYLES, "casual"),
    season: validOrDefault(data.season, SEASONS, "entretiempo"),
    photo: data.photo || "",
    createdAt: normalizeTimestamp(data.createdAt, data.id),
    usageCount: Number(data.usageCount ?? data.timesRecommended ?? 0),
    lastUsedAt: Number(data.lastUsedAt ?? data.lastRecommendedAt ?? 0)
  };
}

export function normalizeDraftItem(data) {
  return {
    id: data.id || createId("draft"),
    name: String(data.name || "Prenda desde armario").trim(),
    type: validOrDefault(data.type, TYPES, "camiseta"),
    color: normalizeText(data.color || ""),
    style: validOrDefault(data.style, STYLES, "casual"),
    season: validOrDefault(data.season, SEASONS, "entretiempo"),
    photo: data.photo || "",
    createdAt: normalizeTimestamp(data.createdAt, data.id),
    source: data.source || "Recorte manual",
    confidence: Number(data.confidence || 0),
    description: String(data.description || "").trim()
  };
}

export function normalizeOutfitRecord(data) {
  return {
    id: data.id || createId("outfit"),
    title: data.title || "Outfit guardado",
    pieces: Array.isArray(data.pieces) ? data.pieces.map(normalizeWardrobeItem) : [],
    pieceIds: Array.isArray(data.pieceIds) ? data.pieceIds : [],
    context: data.context || {},
    explanation: data.explanation || "",
    favorite: Boolean(data.favorite),
    createdAt: normalizeTimestamp(data.createdAt, data.id),
    wornAt: Number(data.wornAt || 0)
  };
}

export function normalizeEngagement(data) {
  const activeDays = Array.isArray(data.activeDays)
    ? [...new Set(data.activeDays.map(day => String(day)).filter(Boolean))].sort()
    : [];

  return {
    firstSeenAt: normalizeTimestamp(data.firstSeenAt, "engagement"),
    activeDays,
    generatedCount: Number(data.generatedCount || 0),
    lastDailyOutfitKey: String(data.lastDailyOutfitKey || ""),
    lastOpenedAt: normalizeTimestamp(data.lastOpenedAt, "engagement")
  };
}

export function normalizeText(value) {
  return String(value).trim().toLowerCase();
}

function validOrDefault(value, options, fallback) {
  return options.includes(value) ? value : fallback;
}

function normalizeTimestamp(value, id) {
  const direct = Number(value);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const fromId = Number(String(id).split("-").find(part => Number(part) > 1000000000000));
  return Number.isFinite(fromId) ? fromId : Date.now();
}
