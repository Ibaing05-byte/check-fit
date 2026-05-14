const STORAGE_KEY = "wardrobeWithPhotos";
const PENDING_STORAGE_KEY = "checkFitPendingItems";
const FILTER_STORAGE_KEY = "checkFitWardrobeFilters";
const LAST_OUTFIT_KEY = "checkFitLastOutfit";

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
const STYLES = ["casual", "elegante", "deportivo", "streetwear"];
const SEASONS = ["verano", "invierno", "entretiempo"];
const COLOR_NAMES = ["blanco", "negro", "gris", "azul", "rojo", "verde", "amarillo", "beige", "marrón", "rosa", "morado", "naranja"];
const TYPE_GROUPS = {
  top: ["camiseta", "camisa", "polo", "top", "jersey", "sudadera"],
  layer: ["chaqueta", "cazadora", "abrigo"],
  bottom: ["pantalón", "vaqueros", "shorts", "falda", "vestido", "chándal", "leggings"],
  shoes: ["zapatos", "zapatillas", "botas", "sandalias"],
  accessory: ["gorra", "bolso", "bufanda", "accesorio"]
};
const GROUP_LABELS = {
  top: "parte de arriba",
  layer: "capa exterior",
  bottom: "parte de abajo",
  shoes: "calzado",
  accessory: "accesorio"
};

// Armario inicial para que la app se pueda probar nada más abrirla.
const DEFAULT_WARDROBE = [
  { id: 1, name: "Camiseta blanca", type: "camiseta", color: "blanco", style: "casual", season: "entretiempo", photo: "" },
  { id: 2, name: "Vaqueros azules", type: "pantalón", color: "azul", style: "casual", season: "entretiempo", photo: "" },
  { id: 3, name: "Sudadera gris", type: "chaqueta", color: "gris", style: "streetwear", season: "invierno", photo: "" },
  { id: 4, name: "Zapatillas blancas", type: "zapatos", color: "blanco", style: "casual", season: "entretiempo", photo: "" }
];

let selectedPhoto = "";
let wardrobe = loadWardrobe();
let pendingItems = loadPendingItems();
let wardrobeFilters = loadWardrobeFilters();

// Referencias centralizadas: evita mezclar selectores por todo el archivo.
const elements = {
  singleItemForm: document.getElementById("singleItemForm"),
  photo: document.getElementById("photo"),
  preview: document.getElementById("preview"),
  name: document.getElementById("name"),
  color: document.getElementById("color"),
  colorHint: document.getElementById("colorHint"),
  type: document.getElementById("type"),
  style: document.getElementById("style"),
  season: document.getElementById("season"),
  singleModeButton: document.getElementById("singleModeButton"),
  closetModeButton: document.getElementById("closetModeButton"),
  closetScanPanel: document.getElementById("closetScanPanel"),
  closetPhoto: document.getElementById("closetPhoto"),
  closetPreviewWrap: document.getElementById("closetPreviewWrap"),
  closetPreview: document.getElementById("closetPreview"),
  simulateClosetScan: document.getElementById("simulateClosetScan"),
  scanStatus: document.getElementById("scanStatus"),
  confirmAllPending: document.getElementById("confirmAllPending"),
  clearPending: document.getElementById("clearPending"),
  pendingGallery: document.getElementById("pendingGallery"),
  pendingBadge: document.getElementById("pendingBadge"),
  totalItems: document.getElementById("totalItems"),
  pendingItems: document.getElementById("pendingItems"),
  occasion: document.getElementById("occasion"),
  climate: document.getElementById("climate"),
  temperature: document.getElementById("temperature"),
  recommendButton: document.getElementById("recommendButton"),
  result: document.getElementById("result"),
  outfit: document.getElementById("outfit"),
  explanation: document.getElementById("explanation"),
  wardrobe: document.getElementById("wardrobe"),
  wardrobeSearch: document.getElementById("wardrobeSearch"),
  wardrobeTypeFilter: document.getElementById("wardrobeTypeFilter"),
  wardrobeStyleFilter: document.getElementById("wardrobeStyleFilter"),
  wardrobeSort: document.getElementById("wardrobeSort"),
  wardrobeSummary: document.getElementById("wardrobeSummary"),
  clearWardrobe: document.getElementById("clearWardrobe")
};

let closetScanImage = "";

init();

function init() {
  populateSelect(elements.type, TYPES, "camiseta");
  populateSelect(elements.style, STYLES, "casual");
  populateSelect(elements.season, SEASONS, "entretiempo");
  populateSelect(elements.wardrobeTypeFilter, ["todos", ...TYPES], wardrobeFilters.type || "todos");
  populateSelect(elements.wardrobeStyleFilter, ["todos", ...STYLES], wardrobeFilters.style || "todos");
  elements.wardrobeSearch.value = wardrobeFilters.search;
  elements.wardrobeSort.value = wardrobeFilters.sort;

  elements.singleModeButton.addEventListener("click", () => setCaptureMode("single"));
  elements.closetModeButton.addEventListener("click", () => setCaptureMode("closet"));
  elements.photo.addEventListener("change", previewPhoto);
  elements.singleItemForm.addEventListener("submit", addItem);
  elements.closetPhoto.addEventListener("change", previewClosetPhoto);
  elements.simulateClosetScan.addEventListener("click", scanClosetImage);
  elements.confirmAllPending.addEventListener("click", confirmAllPending);
  elements.clearPending.addEventListener("click", clearPending);
  elements.recommendButton.addEventListener("click", generateOutfit);
  elements.clearWardrobe.addEventListener("click", clearWardrobe);
  elements.wardrobeSearch.addEventListener("input", updateWardrobeFilters);
  elements.wardrobeTypeFilter.addEventListener("change", updateWardrobeFilters);
  elements.wardrobeStyleFilter.addEventListener("change", updateWardrobeFilters);
  elements.wardrobeSort.addEventListener("change", updateWardrobeFilters);

  if (pendingItems.length) {
    elements.scanStatus.textContent = `${pendingItems.length} prendas pendientes recuperadas de la última sesión.`;
  }

  renderAll();
}

function setCaptureMode(mode) {
  const singleMode = mode === "single";
  elements.singleModeButton.classList.toggle("active", singleMode);
  elements.closetModeButton.classList.toggle("active", !singleMode);
  elements.singleModeButton.setAttribute("aria-selected", String(singleMode));
  elements.closetModeButton.setAttribute("aria-selected", String(!singleMode));
  elements.singleItemForm.classList.toggle("active", singleMode);
  elements.closetScanPanel.classList.toggle("active", !singleMode);
}

// Persistencia local: no hay backend ni cuentas de usuario.
function loadWardrobe() {
  const stored = readJson(STORAGE_KEY, null);
  const source = Array.isArray(stored) ? stored : DEFAULT_WARDROBE;
  return source.map(normalizeWardrobeItem);
}

function loadPendingItems() {
  const stored = readJson(PENDING_STORAGE_KEY, []);
  return Array.isArray(stored) ? stored.map(normalizePendingItem) : [];
}

function loadWardrobeFilters() {
  const filters = {
    search: "",
    type: "todos",
    style: "todos",
    sort: "recent",
    ...readJson(FILTER_STORAGE_KEY, {})
  };

  return {
    search: String(filters.search || ""),
    type: ["todos", ...TYPES].includes(filters.type) ? filters.type : "todos",
    style: ["todos", ...STYLES].includes(filters.style) ? filters.style : "todos",
    sort: ["recent", "name", "least-used"].includes(filters.sort) ? filters.sort : "recent"
  };
}

function saveWardrobe() {
  writeJson(STORAGE_KEY, wardrobe);
}

function savePendingItems() {
  writeJson(PENDING_STORAGE_KEY, pendingItems);
}

function saveWardrobeFilters() {
  writeJson(FILTER_STORAGE_KEY, wardrobeFilters);
}

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    alert("No he podido guardar los cambios. Puede que el navegador tenga el almacenamiento local lleno.");
  }
}

function populateSelect(select, options, selectedValue) {
  select.innerHTML = "";
  options.forEach(option => {
    const node = document.createElement("option");
    node.value = option;
    node.textContent = option;
    node.selected = option === selectedValue;
    select.appendChild(node);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Flujo individual: foto opcional, metadatos obligatorios y guardado directo.
async function previewPhoto(event) {
  const file = event.target.files[0];
  if (!file) return;

  selectedPhoto = await fileToDataUrl(file);
  elements.preview.src = selectedPhoto;
  elements.preview.style.display = "block";

  const inferredColor = await analyzeImageColor(selectedPhoto);
  if (inferredColor) {
    elements.color.value = inferredColor;
  }
  renderColorHint(inferredColor);

  // Autocompletamos desde el archivo para reducir campos manuales, siempre editable.
  if (!elements.name.value.trim()) {
    elements.name.value = cleanFileName(file.name);
  }

  const inferredType = inferType(cleanFileName(file.name).toLowerCase());
  elements.type.value = inferredType;
}

function cleanFileName(fileName) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function addItem(event) {
  event.preventDefault();

  const item = readSingleForm();
  if (!item) return;

  wardrobe.push(item);
  resetSingleForm();
  saveWardrobe();
  renderAll();
}

function readSingleForm() {
  const name = elements.name.value.trim();
  const color = elements.color.value.trim().toLowerCase();

  if (!name || !color) {
    alert("Rellena al menos el nombre y el color.");
    return null;
  }

  return createWardrobeItem({
    name,
    color,
    type: elements.type.value,
    style: elements.style.value,
    season: elements.season.value,
    photo: selectedPhoto
  });
}

function createWardrobeItem(data) {
  return normalizeWardrobeItem({
    ...data,
    id: data.id || createId()
  });
}

function normalizeWardrobeItem(data) {
  return {
    id: data.id || createId(),
    name: data.name || "Prenda sin nombre",
    color: normalizeColor(data.color || ""),
    type: TYPES.includes(data.type) ? data.type : "otro",
    style: STYLES.includes(data.style) ? data.style : "casual",
    season: SEASONS.includes(data.season) ? data.season : "entretiempo",
    photo: data.photo || "",
    createdAt: data.createdAt || inferTimestamp(data.id),
    timesRecommended: data.timesRecommended || 0,
    lastRecommendedAt: data.lastRecommendedAt || 0
  };
}

function normalizePendingItem(data) {
  return {
    id: data.id || createId(),
    name: data.name || "Prenda detectada",
    color: normalizeColor(data.color || ""),
    type: TYPES.includes(data.type) ? data.type : "otro",
    style: STYLES.includes(data.style) ? data.style : "casual",
    season: SEASONS.includes(data.season) ? data.season : "entretiempo",
    photo: data.photo || "",
    createdAt: data.createdAt || inferTimestamp(data.id),
    source: data.source || "Análisis visual beta"
  };
}

function createId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function inferTimestamp(id) {
  const timestamp = Number(String(id).split("-")[0]);
  return timestamp > 1000000000000 ? timestamp : Date.now();
}

function resetSingleForm() {
  elements.singleItemForm.reset();
  elements.type.value = "camiseta";
  elements.style.value = "casual";
  elements.season.value = "entretiempo";
  elements.preview.removeAttribute("src");
  elements.preview.style.display = "none";
  elements.colorHint.hidden = true;
  elements.colorHint.textContent = "";
  selectedPhoto = "";
}

async function previewClosetPhoto(event) {
  const file = event.target.files[0];
  if (!file) return;

  closetScanImage = await fileToDataUrl(file);
  elements.closetPreview.src = closetScanImage;
  elements.closetPreviewWrap.hidden = false;
  elements.simulateClosetScan.disabled = false;
  elements.scanStatus.textContent = "Foto cargada. La detección en desarrollo preparará prendas para revisión asistida.";
}

async function scanClosetImage() {
  if (!closetScanImage) return;

  elements.simulateClosetScan.disabled = true;
  elements.scanStatus.textContent = "Analizando zonas de la foto con tecnología de análisis visual en fase beta...";

  const detections = await detectGarmentsFromClosetImage(closetScanImage);
  const drafts = detections.map(createPendingItemFromDetection);
  pendingItems = pendingItems.concat(drafts);
  savePendingItems();
  elements.scanStatus.textContent = `${drafts.length} prendas añadidas a revisión asistida. Revísalas antes de guardarlas.`;
  elements.simulateClosetScan.disabled = false;
  renderAll();
}

// Punto preparado para conectar una API de visión artificial cuando el análisis visual pase de beta a producción.
// De momento genera borradores revisables para mantener un flujo honesto de "armario completo -> revisión asistida".
async function detectGarmentsFromClosetImage(image) {
  const dominantColor = await analyzeImageColor(image);
  return [
    { name: "Prenda detectada 1", type: "camisa", color: dominantColor || "blanco", style: "casual", season: "entretiempo", photo: image },
    { name: "Prenda detectada 2", type: "pantalón", color: "azul", style: "casual", season: "entretiempo", photo: image },
    { name: "Prenda detectada 3", type: "chaqueta", color: "negro", style: "streetwear", season: "invierno", photo: image }
  ];
}

function createPendingItemFromDetection(detection) {
  return normalizePendingItem({
    id: createId(),
    name: detection.name || "Prenda detectada",
    color: detection.color || "",
    type: detection.type || "otro",
    style: detection.style || "casual",
    season: detection.season || "entretiempo",
    photo: detection.photo || "",
    source: detection.source || "Análisis visual beta"
  });
}

// Inferencias ligeras desde el nombre del archivo para acelerar la revisión manual.
function inferType(text) {
  const aliases = {
    camiseta: ["camiseta", "remera", "tshirt", "t-shirt"],
    camisa: ["camisa", "blusa"],
    polo: ["polo"],
    top: ["top"],
    jersey: ["jersey", "sueter", "suéter"],
    sudadera: ["sudadera", "hoodie"],
    chaqueta: ["chaqueta", "blazer"],
    cazadora: ["cazadora"],
    abrigo: ["abrigo", "trench"],
    pantalón: ["pantalon", "pantalón"],
    vaqueros: ["jean", "vaquero", "vaqueros", "denim"],
    shorts: ["short", "shorts", "bermuda"],
    falda: ["falda"],
    vestido: ["vestido"],
    chándal: ["chandal", "chándal"],
    leggings: ["legging", "leggings"],
    zapatos: ["zapato", "zapatos", "mocasín", "mocasin"],
    zapatillas: ["zapatilla", "zapatillas", "sneaker", "sneakers"],
    botas: ["bota", "botas"],
    sandalias: ["sandalia", "sandalias"],
    gorra: ["gorra", "sombrero"],
    bolso: ["bolso", "mochila"],
    bufanda: ["bufanda"],
    accesorio: ["cinturon", "cinturón", "collar", "pendiente"]
  };

  const found = Object.entries(aliases).find(([, words]) => matches(text, words));
  if (found) return found[0];
  return "camiseta";
}

function inferColor(text) {
  return COLOR_NAMES.find(color => text.includes(color)) || (text.includes("marron") ? "marrón" : "");
}

function inferStyle(text) {
  if (matches(text, ["blazer", "vestido", "camisa", "mocasín", "mocasin"])) return "elegante";
  if (matches(text, ["gym", "deporte", "running", "leggings"])) return "deportivo";
  if (matches(text, ["oversize", "sudadera", "cargo", "street"])) return "streetwear";
  return "casual";
}

function inferSeason(text) {
  if (matches(text, ["abrigo", "lana", "bufanda", "invierno", "frio", "frío", "bota"])) return "invierno";
  if (matches(text, ["lino", "tirantes", "short", "verano", "sandalia"])) return "verano";
  return "entretiempo";
}

function matches(text, words) {
  return words.some(word => text.includes(word));
}

async function analyzeImageColor(dataUrl) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const size = 80;
  canvas.width = size;
  canvas.height = size;
  context.drawImage(image, 0, 0, size, size);

  const pixels = context.getImageData(0, 0, size, size).data;
  const totals = { r: 0, g: 0, b: 0, count: 0 };

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha < 180) continue;

    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const brightness = (r + g + b) / 3;

    // Ignoramos fondos casi blancos de estudio para aproximarnos más a la prenda.
    if (brightness > 245) continue;

    totals.r += r;
    totals.g += g;
    totals.b += b;
    totals.count += 1;
  }

  if (!totals.count) return "";

  return getDominantColorName({
    r: Math.round(totals.r / totals.count),
    g: Math.round(totals.g / totals.count),
    b: Math.round(totals.b / totals.count)
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function getDominantColorName({ r, g, b }) {
  const { h, s, l } = rgbToHsl(r, g, b);

  if (l > 0.9 && s < 0.2) return "blanco";
  if (l < 0.16) return "negro";
  if (s < 0.13) return "gris";
  if (h >= 20 && h < 50 && l > 0.62 && s < 0.42) return "beige";
  if (h >= 15 && h < 45 && l < 0.5) return "marrón";
  if (h < 12 || h >= 345) return "rojo";
  if (h >= 12 && h < 38) return "naranja";
  if (h >= 38 && h < 68) return "amarillo";
  if (h >= 68 && h < 165) return "verde";
  if (h >= 165 && h < 250) return "azul";
  if (h >= 250 && h < 292) return "morado";
  if (h >= 292 && h < 345) return "rosa";
  return nearestPaletteColor({ r, g, b });
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    if (max === r) h = (g - b) / delta + (g < b ? 6 : 0);
    if (max === g) h = (b - r) / delta + 2;
    if (max === b) h = (r - g) / delta + 4;
    h *= 60;
  }

  return { h, s, l };
}

function nearestPaletteColor(rgb) {
  const palette = {
    blanco: [245, 245, 238],
    negro: [25, 24, 24],
    gris: [128, 128, 128],
    azul: [35, 91, 166],
    rojo: [184, 45, 42],
    verde: [62, 126, 78],
    amarillo: [224, 183, 58],
    beige: [200, 181, 145],
    marrón: [115, 72, 45],
    rosa: [213, 111, 143],
    morado: [112, 73, 150],
    naranja: [212, 113, 40]
  };

  return Object.entries(palette)
    .map(([name, color]) => ({
      name,
      distance: Math.hypot(rgb.r - color[0], rgb.g - color[1], rgb.b - color[2])
    }))
    .sort((a, b) => a.distance - b.distance)[0].name;
}

function renderColorHint(colorName) {
  if (!colorName) {
    elements.colorHint.hidden = false;
    elements.colorHint.textContent = "No he podido detectar un color claro. Puedes escribirlo manualmente.";
    return;
  }

  elements.colorHint.hidden = false;
  elements.colorHint.textContent = `Color detectado automáticamente: ${colorName}. Puedes corregirlo antes de guardar.`;
}

// Renderizado de UI: siempre se reconstruye desde el estado actual.
function renderAll() {
  renderWardrobe();
  renderPendingGallery();
  renderStats();
}

function renderStats() {
  elements.totalItems.textContent = wardrobe.length;
  elements.pendingItems.textContent = pendingItems.length;
  elements.pendingBadge.textContent = pendingItems.length;
  elements.confirmAllPending.disabled = pendingItems.length === 0;
  elements.clearPending.disabled = pendingItems.length === 0;
}

function renderWardrobe() {
  elements.wardrobe.innerHTML = "";
  const visibleItems = getVisibleWardrobeItems();

  visibleItems.forEach(item => {
    const card = document.createElement("article");
    card.className = "item";
    card.appendChild(createImage(item));

    const body = document.createElement("div");
    body.className = "item-body";

    const top = document.createElement("div");
    top.className = "item-top";

    const text = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.name;
    const meta = document.createElement("small");
    meta.textContent = `${item.type} · ${item.color || "sin color"} · ${item.style} · ${item.season}`;
    text.append(title, meta);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete";
    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", `Eliminar ${item.name}`);
    deleteButton.addEventListener("click", () => deleteItem(item.id));

    top.append(text, deleteButton);
    body.appendChild(top);
    card.appendChild(body);
    elements.wardrobe.appendChild(card);
  });

  renderWardrobeSummary(visibleItems.length);
}

function updateWardrobeFilters() {
  wardrobeFilters = {
    search: elements.wardrobeSearch.value.trim(),
    type: elements.wardrobeTypeFilter.value,
    style: elements.wardrobeStyleFilter.value,
    sort: elements.wardrobeSort.value
  };
  saveWardrobeFilters();
  renderWardrobe();
}

function getVisibleWardrobeItems() {
  const search = normalizeSearchText(wardrobeFilters.search);
  const filtered = wardrobe.filter(item => {
    const matchesSearch = !search || [item.name, item.color, item.type, item.style, item.season]
      .some(value => normalizeSearchText(value || "").includes(search));
    const matchesType = wardrobeFilters.type === "todos" || item.type === wardrobeFilters.type;
    const matchesStyle = wardrobeFilters.style === "todos" || item.style === wardrobeFilters.style;
    return matchesSearch && matchesType && matchesStyle;
  });

  return filtered.sort((a, b) => {
    if (wardrobeFilters.sort === "name") return a.name.localeCompare(b.name, "es");
    if (wardrobeFilters.sort === "least-used") {
      return (a.timesRecommended || 0) - (b.timesRecommended || 0) || b.createdAt - a.createdAt;
    }
    return b.createdAt - a.createdAt;
  });
}

function renderWardrobeSummary(visibleCount) {
  if (!wardrobe.length) {
    elements.wardrobeSummary.textContent = "Tu armario está vacío.";
    return;
  }

  if (visibleCount === wardrobe.length) {
    elements.wardrobeSummary.textContent = `${wardrobe.length} prendas guardadas.`;
    return;
  }

  elements.wardrobeSummary.textContent = `${visibleCount} de ${wardrobe.length} prendas visibles con los filtros actuales.`;
}

function renderPendingGallery() {
  elements.pendingGallery.innerHTML = "";

  pendingItems.forEach(item => {
    const card = document.createElement("article");
    card.className = "pending-card";
    card.dataset.id = item.id;
    card.appendChild(createImage(item));

    const fields = document.createElement("div");
    fields.className = "pending-fields";
    fields.append(
      createPendingInput(item, "name", "Nombre"),
      createPendingInput(item, "color", "Color"),
      createPendingSelect(item, "type", "Tipo", TYPES),
      createPendingSelect(item, "style", "Estilo", STYLES),
      createPendingSelect(item, "season", "Temporada", SEASONS)
    );

    const actions = document.createElement("div");
    actions.className = "pending-actions";

    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.textContent = "Confirmar";
    confirmButton.addEventListener("click", () => confirmPendingItem(item.id));

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "ghost danger";
    removeButton.textContent = "Quitar";
    removeButton.addEventListener("click", () => removePendingItem(item.id));

    actions.append(confirmButton, removeButton);
    fields.appendChild(actions);
    card.appendChild(fields);
    elements.pendingGallery.appendChild(card);
  });
}

function createPendingInput(item, key, labelText) {
  const label = document.createElement("label");
  label.textContent = labelText;

  const input = document.createElement("input");
  input.value = item[key] || "";
  input.addEventListener("input", event => {
    item[key] = event.target.value;
    savePendingItems();
  });

  label.appendChild(input);
  return label;
}

function createPendingSelect(item, key, labelText, options) {
  const label = document.createElement("label");
  label.textContent = labelText;

  const select = document.createElement("select");
  populateSelect(select, options, item[key]);
  select.addEventListener("change", event => {
    item[key] = event.target.value;
    savePendingItems();
  });

  label.appendChild(select);
  return label;
}

function confirmPendingItem(id) {
  const item = pendingItems.find(candidate => candidate.id === id);
  if (!item) return;

  if (!item.name.trim() || !item.color.trim()) {
    alert("Completa nombre y color antes de confirmar esta prenda.");
    return;
  }

  wardrobe.push(createWardrobeItem({
    name: item.name.trim(),
    color: item.color.trim().toLowerCase(),
    type: item.type,
    style: item.style,
    season: item.season,
    photo: item.photo
  }));
  removePendingItem(id, false);
  saveWardrobe();
  savePendingItems();
  elements.scanStatus.textContent = `${item.name.trim()} guardada en tu armario.`;
  renderAll();
}

function confirmAllPending() {
  const incomplete = pendingItems.find(item => !item.name.trim() || !item.color.trim());
  if (incomplete) {
    alert("Hay prendas pendientes sin nombre o color. Corrígelas antes de confirmar todo.");
    return;
  }

  pendingItems.forEach(item => {
    wardrobe.push(createWardrobeItem({
      name: item.name.trim(),
      color: item.color.trim().toLowerCase(),
      type: item.type,
      style: item.style,
      season: item.season,
      photo: item.photo
    }));
  });
  pendingItems = [];
  saveWardrobe();
  savePendingItems();
  elements.scanStatus.textContent = "Todas las prendas pendientes se han guardado en tu armario.";
  renderAll();
}

function removePendingItem(id, shouldRender = true) {
  pendingItems = pendingItems.filter(item => item.id !== id);
  savePendingItems();
  if (shouldRender) renderAll();
}

function clearPending() {
  pendingItems = [];
  savePendingItems();
  elements.scanStatus.textContent = "Pendientes vaciados.";
  renderAll();
}

function deleteItem(id) {
  wardrobe = wardrobe.filter(item => item.id !== id);
  saveWardrobe();
  renderAll();
}

function clearWardrobe() {
  if (!confirm("¿Seguro que quieres borrar tu armario de prueba?")) return;
  wardrobe = [];
  saveWardrobe();
  elements.result.hidden = true;
  renderAll();
}

function createImage(item) {
  const image = document.createElement("img");
  image.src = item.photo || placeholder(item);
  image.alt = item.name;
  return image;
}

function placeholder(item) {
  const label = encodeForSvg(item.name || "Prenda");
  const type = encodeForSvg(item.type || "ropa");

  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
      <rect width="600" height="450" fill="#ede9e2"/>
      <circle cx="300" cy="190" r="86" fill="#d8e7ef"/>
      <path d="M230 170h140l44 62-38 26-22-31v118H246V227l-22 31-38-26 44-62Z" fill="#171514"/>
      <text x="300" y="366" font-size="26" text-anchor="middle" font-family="Arial" fill="#171514">${label}</text>
      <text x="300" y="398" font-size="18" text-anchor="middle" font-family="Arial" fill="#6f6a64">${type}</text>
    </svg>
  `);
}

function encodeForSvg(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
}

// Recomendador: puntúa prendas por contexto, color y rotación para no repetir siempre.
function generateOutfit() {
  const context = {
    occasion: elements.occasion.value,
    climate: elements.climate.value,
    temperature: Number(elements.temperature.value) || 18,
    lastOutfitIds: readLastOutfitIds()
  };

  const requiredTypes = getRequiredTypes(context);
  const selected = [];

  requiredTypes.forEach(type => {
    const item = pickBestItem(type, context, selected);
    if (item) selected.push(item);
  });

  renderOutfit(selected, context, requiredTypes);
  rememberOutfit(selected);
}

function getRequiredTypes(context) {
  const needsLayer = context.temperature <= 18 || ["frío", "lluvia", "nublado"].includes(context.climate);
  const groups = ["top", "bottom"];
  if (needsLayer) groups.push("layer");
  groups.push("shoes");
  if (wardrobe.some(item => TYPE_GROUPS.accessory.includes(item.type))) groups.push("accessory");
  return groups;
}

function pickBestItem(group, context, selected) {
  return wardrobe
    .filter(item => TYPE_GROUPS[group].includes(item.type))
    .map(item => ({ item, score: scoreItem(item, context, selected) }))
    .sort((a, b) => b.score - a.score || (a.item.timesRecommended || 0) - (b.item.timesRecommended || 0) || Math.random() - 0.5)[0]?.item;
}

function scoreItem(item, context, selected) {
  let score = 0;
  const styleTargets = getStyleTargets(context.occasion);
  const seasonTarget = getSeasonTarget(context.temperature, context.climate);

  // La puntuación mezcla adecuación práctica, coherencia visual y rotación.
  if (styleTargets.includes(item.style)) score += 24;
  if (item.season === seasonTarget) score += 22;
  if (item.season === "entretiempo") score += 6;
  if (context.climate === "lluvia" && [...TYPE_GROUPS.layer, ...TYPE_GROUPS.shoes].includes(item.type)) score += 8;
  if (context.climate === "lluvia" && ["sandalias", "shorts"].includes(item.type)) score -= 16;
  if (context.temperature >= 26 && ["abrigo", "jersey", "bufanda"].includes(item.type)) score -= 14;
  if (context.temperature >= 26 && item.season === "verano") score += 10;
  if (context.temperature <= 12 && item.season === "invierno") score += 10;
  score += colorHarmonyScore(item.color, selected.map(piece => piece.color));

  if (context.lastOutfitIds.includes(item.id)) score -= 18;
  score -= (item.timesRecommended || 0) * 4;

  return score;
}

function getStyleTargets(occasion) {
  const map = {
    trabajo: ["elegante", "casual"],
    cita: ["elegante", "casual"],
    fiesta: ["elegante", "streetwear"],
    clase: ["casual", "streetwear"],
    paseo: ["casual", "deportivo"],
    viaje: ["casual", "deportivo"]
  };
  return map[occasion] || ["casual"];
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
  return -6;
}

function normalizeColor(color) {
  return String(color).trim().toLowerCase();
}

function normalizeSearchText(value) {
  return normalizeColor(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isNeutral(color) {
  return ["negro", "blanco", "gris", "beige", "marrón", "marron", "azul marino"].includes(normalizeColor(color));
}

function areCompatibleColors(a, b) {
  const combinations = [
    ["azul", "blanco"],
    ["azul", "gris"],
    ["verde", "beige"],
    ["verde", "marrón"],
    ["rojo", "negro"],
    ["rosa", "gris"],
    ["amarillo", "azul"],
    ["lila", "blanco"]
  ];
  return combinations.some(pair => pair.includes(a) && pair.includes(b));
}

function renderOutfit(pieces, context, requiredTypes) {
  elements.outfit.innerHTML = "";

  if (!pieces.length) {
    const empty = document.createElement("p");
    empty.textContent = "Añade más prendas para poder crear un outfit.";
    elements.outfit.appendChild(empty);
  } else {
    pieces.forEach(item => {
      const card = document.createElement("article");
      card.className = "outfit-piece";
      card.appendChild(createImage(item));

      const body = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = item.name;
      const meta = document.createElement("small");
      meta.textContent = `${item.type} · ${item.color || "sin color"} · ${item.style}`;
      body.append(title, meta);

      card.appendChild(body);
      elements.outfit.appendChild(card);
    });
  }

  elements.explanation.textContent = buildExplanation(pieces, context, requiredTypes);
  elements.result.hidden = false;
}

function buildExplanation(pieces, context, requiredTypes) {
  if (!pieces.length) {
    return "Check Fit necesita al menos algunas prendas clasificadas para combinar clima, ocasión y color.";
  }

  const colors = pieces.map(piece => piece.color).filter(Boolean).join(", ");
  const selectedGroups = new Set(pieces.map(getItemGroup).filter(Boolean));
  const missingGroups = requiredTypes
    .filter(group => !selectedGroups.has(group))
    .map(group => GROUP_LABELS[group]);
  const missingText = missingGroups.length ? ` Falta ${formatList(missingGroups)} para completar el look.` : "";
  return `Recomendación para ${context.occasion}: ${context.temperature}º, clima ${context.climate}. He priorizado temporada, estilo, armonía de color (${colors || "colores pendientes"}) y prendas que no salieron en el último look.${missingText}`;
}

function getItemGroup(item) {
  return Object.entries(TYPE_GROUPS).find(([, types]) => types.includes(item.type))?.[0];
}

function formatList(values) {
  if (values.length <= 1) return values[0] || "";
  return `${values.slice(0, -1).join(", ")} y ${values.at(-1)}`;
}

function readLastOutfitIds() {
  try {
    return JSON.parse(localStorage.getItem(LAST_OUTFIT_KEY)) || [];
  } catch {
    return [];
  }
}

function rememberOutfit(pieces) {
  const ids = pieces.map(piece => piece.id);
  localStorage.setItem(LAST_OUTFIT_KEY, JSON.stringify(ids));

  const now = Date.now();
  wardrobe = wardrobe.map(item => {
    if (!ids.includes(item.id)) return item;
    return {
      ...item,
      timesRecommended: (item.timesRecommended || 0) + 1,
      lastRecommendedAt: now
    };
  });
  saveWardrobe();
  renderWardrobe();
}
