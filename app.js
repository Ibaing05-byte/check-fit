import { CLIMATES, COLORS, OCCASIONS, SEASONS, STYLES, TYPES } from "./data.js";
import { createOutfitTitle, getOutfitPieceIds, incrementUsage, recommendOutfit, renderHistoryItem, renderOutfitPiece } from "./outfits.js";
import {
  createDraftItem,
  createOutfitRecord,
  createWardrobeItem,
  loadEngagement,
  loadDrafts,
  loadFilters,
  loadOutfits,
  loadWardrobe,
  readLastOutfitIds,
  saveEngagement,
  saveDrafts,
  saveFilters,
  saveLastOutfitIds,
  saveOutfits,
  saveWardrobe
} from "./storage.js";
import { cropGarmentFromClosetImage, detectDominantColor, fileToDataUrl, loadImage } from "./vision.js";
import {
  cleanFileName,
  createImageElement,
  filterWardrobe,
  getUniqueColors,
  inferColor,
  inferSeason,
  inferStyle,
  inferType,
  renderDraftCard,
  renderSelectOptions,
  renderWardrobeCard,
  updateWardrobeSummary
} from "./wardrobe.js";

const DEFAULT_API_BASE_URL = "https://check-fit.onrender.com";
const API_BASE_STORAGE_KEY = "sacloApiBaseUrl";
const DEV_MODE_STORAGE_KEY = "sacloDevMode";
const LEGACY_LOCAL_API_URLS = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001"
]);
const MAX_ANALYSIS_SIDE = 1400;
const MAX_CLIENT_IMAGE_MB = 5.5;

const elements = {
  heroItemCount: document.getElementById("heroItemCount"),
  heroLookStack: document.getElementById("heroLookStack"),
  dailyTitle: document.getElementById("dailyTitle"),
  dailyLookStack: document.getElementById("dailyLookStack"),
  dailyMessage: document.getElementById("dailyMessage"),
  dailyCreateButton: document.getElementById("dailyCreateButton"),
  streakCount: document.getElementById("streakCount"),
  activeDaysCount: document.getElementById("activeDaysCount"),
  generatedCount: document.getElementById("generatedCount"),
  dailyInsight: document.getElementById("dailyInsight"),
  lastWornOutfit: document.getElementById("lastWornOutfit"),
  homeWardrobeCount: document.getElementById("homeWardrobeCount"),
  unusedItemsCount: document.getElementById("unusedItemsCount"),
  favoriteOutfitCount: document.getElementById("favoriteOutfitCount"),
  brandLockup: document.getElementById("brandLockup"),
  devPanel: document.getElementById("devPanel"),
  apiBaseUrl: document.getElementById("apiBaseUrl"),
  saveApiBaseUrl: document.getElementById("saveApiBaseUrl"),
  testApiConnection: document.getElementById("testApiConnection"),
  apiConnectionStatus: document.getElementById("apiConnectionStatus"),
  singleModeButton: document.getElementById("singleModeButton"),
  closetModeButton: document.getElementById("closetModeButton"),
  singleItemForm: document.getElementById("singleItemForm"),
  closetScanPanel: document.getElementById("closetScanPanel"),
  photo: document.getElementById("photo"),
  preview: document.getElementById("preview"),
  colorHint: document.getElementById("colorHint"),
  singleConfidence: document.getElementById("singleConfidence"),
  analyzeSingleAI: document.getElementById("analyzeSingleAI"),
  aiSingleStatus: document.getElementById("aiSingleStatus"),
  name: document.getElementById("name"),
  color: document.getElementById("color"),
  type: document.getElementById("type"),
  style: document.getElementById("style"),
  season: document.getElementById("season"),
  closetPhoto: document.getElementById("closetPhoto"),
  analyzeClosetAI: document.getElementById("analyzeClosetAI"),
  aiClosetStatus: document.getElementById("aiClosetStatus"),
  closetWorkspace: document.getElementById("closetWorkspace"),
  cropStage: document.getElementById("cropStage"),
  closetPreview: document.getElementById("closetPreview"),
  cropSelection: document.getElementById("cropSelection"),
  cropHint: document.getElementById("cropHint"),
  cropPreviewPanel: document.getElementById("cropPreviewPanel"),
  cropPreview: document.getElementById("cropPreview"),
  cropPreviewTitle: document.getElementById("cropPreviewTitle"),
  cropPreviewMeta: document.getElementById("cropPreviewMeta"),
  createCropDraft: document.getElementById("createCropDraft"),
  resetCropSelection: document.getElementById("resetCropSelection"),
  scanStatus: document.getElementById("scanStatus"),
  pendingBadge: document.getElementById("pendingBadge"),
  pendingItems: document.getElementById("pendingItems"),
  pendingGallery: document.getElementById("pendingGallery"),
  confirmAllPending: document.getElementById("confirmAllPending"),
  clearPending: document.getElementById("clearPending"),
  totalItems: document.getElementById("totalItems"),
  wardrobe: document.getElementById("wardrobe"),
  wardrobeSummary: document.getElementById("wardrobeSummary"),
  wardrobeSearch: document.getElementById("wardrobeSearch"),
  wardrobeTypeFilter: document.getElementById("wardrobeTypeFilter"),
  wardrobeStyleFilter: document.getElementById("wardrobeStyleFilter"),
  wardrobeSeasonFilter: document.getElementById("wardrobeSeasonFilter"),
  wardrobeColorFilter: document.getElementById("wardrobeColorFilter"),
  wardrobeSort: document.getElementById("wardrobeSort"),
  clearWardrobe: document.getElementById("clearWardrobe"),
  occasion: document.getElementById("occasion"),
  climate: document.getElementById("climate"),
  temperature: document.getElementById("temperature"),
  outfitStyle: document.getElementById("outfitStyle"),
  recommendButton: document.getElementById("recommendButton"),
  outfitFeedback: document.getElementById("outfitFeedback"),
  anotherOutfitButton: document.getElementById("anotherOutfitButton"),
  result: document.getElementById("result"),
  outfit: document.getElementById("outfitPieces"),
  explanation: document.getElementById("explanation"),
  saveOutfitButton: document.getElementById("saveOutfitButton"),
  wearOutfitButton: document.getElementById("wearOutfitButton"),
  outfitHistory: document.getElementById("outfitHistory"),
  outfitCount: document.getElementById("outfitCount"),
  editDialog: document.getElementById("editDialog"),
  editItemForm: document.getElementById("editItemForm"),
  closeEditDialog: document.getElementById("closeEditDialog"),
  editItemId: document.getElementById("editItemId"),
  editName: document.getElementById("editName"),
  editColor: document.getElementById("editColor"),
  editType: document.getElementById("editType"),
  editStyle: document.getElementById("editStyle"),
  editSeason: document.getElementById("editSeason"),
  toast: document.getElementById("toast"),
  navLinks: document.querySelectorAll(".bottom-nav a")
};

let wardrobe = loadWardrobe();
let drafts = loadDrafts();
let filters = loadFilters();
let outfits = loadOutfits();
let engagement = touchEngagement(loadEngagement());
let selectedPhoto = "";
let selectedPhotoFileName = "";
let closetImage = "";
let cropArea = null;
let dragState = null;
let currentOutfit = null;
let cropPreviewPhoto = "";
let cropPreviewColor = "";
let toastTimeout = 0;
let logoClickCount = 0;
let logoClickTimer = 0;
let devMode = isDevModeEnabled();

init();

function init() {
  saveEngagement(engagement);
  hydrateSelects();
  hydrateApiConfig();
  hydrateDevMode();
  bindEvents();
  renderAll();
  setupNavigationState();
}

function hydrateSelects() {
  renderSelectOptions(elements.type, TYPES, "camiseta");
  renderSelectOptions(elements.style, STYLES, "casual");
  renderSelectOptions(elements.season, SEASONS, "entretiempo");
  renderSelectOptions(elements.editType, TYPES, "camiseta");
  renderSelectOptions(elements.editStyle, STYLES, "casual");
  renderSelectOptions(elements.editSeason, SEASONS, "entretiempo");
  renderSelectOptions(elements.wardrobeTypeFilter, ["todos", ...TYPES], filters.type);
  renderSelectOptions(elements.wardrobeStyleFilter, ["todos", ...STYLES], filters.style);
  renderSelectOptions(elements.wardrobeSeasonFilter, ["todos", ...SEASONS], filters.season);
  renderSelectOptions(elements.occasion, OCCASIONS, "clase");
  renderSelectOptions(elements.climate, CLIMATES, "frío");
  renderSelectOptions(elements.outfitStyle, ["cualquiera", ...STYLES], "cualquiera");

  elements.wardrobeSearch.value = filters.search;
  elements.wardrobeSort.value = filters.sort;
  renderColorFilter();
}

function hydrateApiConfig() {
  elements.apiBaseUrl.value = getApiBaseUrl();
}

function hydrateDevMode() {
  elements.devPanel.hidden = !devMode;
}

function bindEvents() {
  elements.brandLockup.addEventListener("click", handleBrandClick);
  elements.saveApiBaseUrl.addEventListener("click", saveApiBaseUrl);
  elements.testApiConnection.addEventListener("click", testApiConnection);
  elements.singleModeButton.addEventListener("click", () => setCaptureMode("single"));
  elements.closetModeButton.addEventListener("click", () => setCaptureMode("closet"));
  elements.photo.addEventListener("change", previewSinglePhoto);
  elements.analyzeSingleAI.addEventListener("click", analyzeSingleWithAI);
  elements.singleItemForm.addEventListener("submit", addSingleItem);
  elements.closetPhoto.addEventListener("change", previewClosetPhoto);
  elements.analyzeClosetAI.addEventListener("click", analyzeClosetWithAI);
  elements.cropStage.addEventListener("pointerdown", startCropDrag);
  elements.createCropDraft.addEventListener("click", createDraftFromCrop);
  elements.resetCropSelection.addEventListener("click", resetCropSelection);
  elements.confirmAllPending.addEventListener("click", confirmAllDrafts);
  elements.clearPending.addEventListener("click", clearDrafts);
  elements.wardrobeSearch.addEventListener("input", updateFiltersFromControls);
  elements.wardrobeTypeFilter.addEventListener("change", updateFiltersFromControls);
  elements.wardrobeStyleFilter.addEventListener("change", updateFiltersFromControls);
  elements.wardrobeSeasonFilter.addEventListener("change", updateFiltersFromControls);
  elements.wardrobeColorFilter.addEventListener("change", updateFiltersFromControls);
  elements.wardrobeSort.addEventListener("change", updateFiltersFromControls);
  elements.clearWardrobe.addEventListener("click", clearWardrobe);
  elements.recommendButton.addEventListener("click", () => generateOutfit());
  elements.dailyCreateButton.addEventListener("click", () => generateOutfit({ scrollToResult: true, dailyContext: true }));
  elements.anotherOutfitButton.addEventListener("click", () => generateOutfit({ excludeCurrent: true }));
  elements.saveOutfitButton.addEventListener("click", saveCurrentOutfit);
  elements.wearOutfitButton.addEventListener("click", markCurrentOutfitUsed);
  elements.editItemForm.addEventListener("submit", saveEditedItem);
  elements.closeEditDialog.addEventListener("click", () => elements.editDialog.close());
}

function handleBrandClick() {
  logoClickCount += 1;
  clearTimeout(logoClickTimer);
  logoClickTimer = setTimeout(() => {
    logoClickCount = 0;
  }, 1600);

  if (logoClickCount < 5) return;
  logoClickCount = 0;
  devMode = true;
  writeLocalValue(DEV_MODE_STORAGE_KEY, "true");
  hydrateDevMode();
  showToast("Modo desarrollador activado.");
}

function saveApiBaseUrl() {
  const nextUrl = resolveApiBaseUrl(elements.apiBaseUrl.value);
  writeLocalValue(API_BASE_STORAGE_KEY, nextUrl);
  elements.apiBaseUrl.value = nextUrl;
  showStatus(elements.apiConnectionStatus, `Servicio configurado en ${nextUrl}.`);
  showToast("URL de análisis guardada.");
}

async function testApiConnection() {
  const apiBaseUrl = resolveApiBaseUrl(elements.apiBaseUrl.value);
  elements.apiBaseUrl.value = apiBaseUrl;
  setButtonLoading(elements.testApiConnection, "Probando...");
  showStatus(elements.apiConnectionStatus, "Comprobando conexión del servicio de análisis.");

  try {
    const response = await fetch(`${apiBaseUrl}/api/health`);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.status !== "ok") {
      throw new Error(payload.error || "El servicio respondió, pero no confirmó estado ok.");
    }

    writeLocalValue(API_BASE_STORAGE_KEY, apiBaseUrl);
    showStatus(elements.apiConnectionStatus, `${payload.service || "servicio de análisis"} conectado.`);
    showToast("Servicio de análisis conectado.");
  } catch (error) {
    showStatus(
      elements.apiConnectionStatus,
      `${error.message || "No se pudo comprobar la conexión."}`
    );
  } finally {
    setButtonReady(elements.testApiConnection, "Probar conexión", true);
  }
}

function setCaptureMode(mode) {
  const single = mode === "single";
  elements.singleModeButton.classList.toggle("active", single);
  elements.closetModeButton.classList.toggle("active", !single);
  elements.singleModeButton.setAttribute("aria-selected", String(single));
  elements.closetModeButton.setAttribute("aria-selected", String(!single));
  elements.singleItemForm.classList.toggle("active", single);
  elements.closetScanPanel.classList.toggle("active", !single);
}

async function previewSinglePhoto(event) {
  const file = event.target.files[0];
  if (!file) return;

  selectedPhoto = await fileToDataUrl(file);
  selectedPhotoFileName = file.name;
  elements.preview.src = selectedPhoto;
  elements.preview.classList.add("visible");

  const fileText = cleanFileName(file.name);
  const detectedColor = await detectDominantColor(selectedPhoto);
  const fileColor = inferColor(fileText);
  const name = fileText || "Nueva prenda";

  elements.name.value = elements.name.value.trim() || name;
  elements.type.value = inferType(fileText);
  elements.style.value = inferStyle(fileText);
  elements.season.value = inferSeason(fileText);
  elements.color.value = fileColor || detectedColor || elements.color.value;
  elements.analyzeSingleAI.disabled = false;
  elements.singleConfidence.hidden = true;
  elements.singleConfidence.innerHTML = "";
  showStatus(
    elements.colorHint,
    fileColor
      ? `He leído “${fileColor}” del nombre del archivo y lo he dejado listo para revisar.`
      : detectedColor
        ? `Color detectado por análisis visual: ${detectedColor}. Puedes corregirlo si quieres.`
        : "No hemos detectado un color claro. Puedes ajustarlo tú."
  );
}

async function analyzeSingleWithAI() {
  if (!selectedPhoto) {
    showStatus(elements.aiSingleStatus, "Sube una foto de prenda antes de analizar.");
    return;
  }

  setButtonLoading(elements.analyzeSingleAI, "Analizando prenda...");
  renderConfidenceBadge(null);
  showStatus(elements.aiSingleStatus, "Analizando prenda... SACLO está leyendo tipo, color, estilo y temporada.");

  try {
    const payload = await requestVisionAnalysis("/api/analyze-garment", selectedPhoto, {
      filename: selectedPhotoFileName
    });
    const garment = payload.garment;
    if (!garment) throw new Error("No hemos podido analizar esta imagen. Prueba con otra foto más clara.");
    applyGarmentSuggestion(garment);
    renderConfidenceBadge(garment.confidence);
    showStatus(
      elements.aiSingleStatus,
      `${getConfidenceLabel(garment.confidence)}. ${garment.description} Puedes editar cualquier campo antes de guardar.`
    );
    showToast("Análisis visual aplicado. Revisa y guarda cuando encaje.");
  } catch (error) {
    showStatus(
      elements.aiSingleStatus,
      getUserFacingAnalysisError(error)
    );
  } finally {
    setButtonReady(elements.analyzeSingleAI, "Analizar prenda", Boolean(selectedPhoto));
  }
}

function addSingleItem(event) {
  event.preventDefault();
  const item = readGarmentForm({
    name: elements.name,
    color: elements.color,
    type: elements.type,
    style: elements.style,
    season: elements.season
  }, selectedPhoto);

  if (!item) return;

  wardrobe = [item, ...wardrobe];
  saveWardrobe(wardrobe);
  resetSingleForm();
  renderAll();
  showToast("Prenda guardada en tu armario.");
}

async function previewClosetPhoto(event) {
  const file = event.target.files[0];
  if (!file) return;

  closetImage = await fileToDataUrl(file);
  elements.closetPreview.src = closetImage;
  elements.closetWorkspace.hidden = false;
  elements.analyzeClosetAI.disabled = false;
  resetCropSelection();
  elements.scanStatus.textContent = "Arrastra sobre una prenda. Verás una preview antes de guardarla.";
  showStatus(elements.aiClosetStatus, "Análisis inteligente listo. Mejor con buena luz y prendas visibles.");
}

async function analyzeClosetWithAI() {
  if (!closetImage) {
    showStatus(elements.aiClosetStatus, "Sube una foto del armario antes de detectar prendas.");
    return;
  }

  setButtonLoading(elements.analyzeClosetAI, "Detectando prendas...");
  showStatus(elements.aiClosetStatus, "Detectando prendas visibles... SACLO enviará cada resultado a revisión asistida.");

  try {
    const payload = await requestVisionAnalysis("/api/analyze-closet", closetImage);
    const detected = Array.isArray(payload.garments) ? payload.garments : [];

    if (!detected.length) {
      showStatus(
        elements.aiClosetStatus,
        payload.notes || "No se detectaron prendas claras. Intenta con mejor luz o prendas menos superpuestas."
      );
      elements.scanStatus.textContent = "No se detectaron prendas claras. Prueba con una foto más iluminada o selecciona una zona concreta.";
      return;
    }

    drafts = [
      ...detected.map(garment => createDraftItem({
        name: garment.name,
        color: garment.color,
        type: garment.type,
        style: garment.style,
        season: garment.season,
        photo: closetImage,
        confidence: Number(garment.confidence || 0),
        description: garment.description || "",
        source: `Análisis inteligente · ${formatConfidence(garment.confidence)}`
      })),
      ...drafts
    ];

    saveDrafts(drafts);
    renderAll();
    showStatus(
      elements.aiClosetStatus,
      `${detected.length} prendas detectadas. ${payload.notes || "Revisa cada tarjeta antes de guardar."}`
    );
    elements.scanStatus.textContent = "También puedes seguir usando recorte asistido sobre la misma foto.";
    showToast("Prendas detectadas y enviadas a revisión.");
  } catch (error) {
    showStatus(
      elements.aiClosetStatus,
      getUserFacingAnalysisError(error, "closet")
    );
  } finally {
    setButtonReady(elements.analyzeClosetAI, "Detectar prendas", Boolean(closetImage));
  }
}

function startCropDrag(event) {
  if (!closetImage || event.target !== elements.closetPreview) return;
  event.preventDefault();

  const imageRect = elements.closetPreview.getBoundingClientRect();
  const stageRect = elements.cropStage.getBoundingClientRect();
  const start = clampPoint(event.clientX, event.clientY, imageRect);

  dragState = { start, imageRect, stageRect };
  elements.cropHint.hidden = true;
  elements.cropPreviewPanel.hidden = true;
  drawCropSelection(start, start, imageRect, stageRect);
  document.addEventListener("pointermove", updateCropDrag);
  document.addEventListener("pointerup", finishCropDrag, { once: true });
}

function updateCropDrag(event) {
  if (!dragState) return;
  const current = clampPoint(event.clientX, event.clientY, dragState.imageRect);
  drawCropSelection(dragState.start, current, dragState.imageRect, dragState.stageRect);
}

async function finishCropDrag(event) {
  if (!dragState) return;
  const current = clampPoint(event.clientX, event.clientY, dragState.imageRect);
  const box = getSelectionBox(dragState.start, current);
  const cssWidth = box.right - box.left;
  const cssHeight = box.bottom - box.top;

  if (cssWidth >= 28 && cssHeight >= 28) {
    const scaleX = elements.closetPreview.naturalWidth / dragState.imageRect.width;
    const scaleY = elements.closetPreview.naturalHeight / dragState.imageRect.height;
    cropArea = {
      x: (box.left - dragState.imageRect.left) * scaleX,
      y: (box.top - dragState.imageRect.top) * scaleY,
      width: cssWidth * scaleX,
      height: cssHeight * scaleY
    };
    elements.createCropDraft.disabled = false;
    elements.scanStatus.textContent = "Recorte seleccionado. Revisa la preview y guárdalo cuando encaje.";
    await prepareCropPreview();
  } else {
    resetCropSelection();
  }

  dragState = null;
  document.removeEventListener("pointermove", updateCropDrag);
}

async function createDraftFromCrop() {
  if (!closetImage || !cropArea) return;

  elements.createCropDraft.disabled = true;
  elements.scanStatus.textContent = "Creando prenda desde el recorte...";

  const photo = cropPreviewPhoto || await cropGarmentFromClosetImage(closetImage, cropArea);
  const color = cropPreviewColor || await detectDominantColor(photo);
  drafts = [
    createDraftItem({
      name: buildCropDraftName(color),
      color,
      type: "camiseta",
      style: "casual",
      season: "entretiempo",
      photo,
      source: "Recorte desde armario"
    }),
    ...drafts
  ];

  saveDrafts(drafts);
  resetCropSelection();
  elements.scanStatus.textContent = "Recorte añadido a revisión inteligente. Puedes crear otro sobre la misma foto.";
  renderAll();
  showToast("Recorte convertido en prenda editable.");
}

function resetCropSelection() {
  cropArea = null;
  cropPreviewPhoto = "";
  cropPreviewColor = "";
  elements.cropSelection.hidden = true;
  elements.cropHint.hidden = false;
  elements.cropPreviewPanel.hidden = true;
  elements.cropPreview.removeAttribute("src");
  elements.cropPreviewMeta.textContent = "Analizando color del recorte";
  elements.createCropDraft.disabled = true;
}

async function prepareCropPreview() {
  if (!closetImage || !cropArea) return;

  cropPreviewPhoto = await cropGarmentFromClosetImage(closetImage, cropArea);
  cropPreviewColor = await detectDominantColor(cropPreviewPhoto);
  elements.cropPreview.src = cropPreviewPhoto;
  elements.cropPreviewTitle.textContent = buildCropDraftName(cropPreviewColor);
  elements.cropPreviewMeta.textContent = cropPreviewColor
    ? `Color dominante del recorte: ${cropPreviewColor}`
    : "Color pendiente de ajustar";
  elements.cropPreviewPanel.hidden = false;
}

function buildCropDraftName(color) {
  return color ? `Prenda ${color}` : `Prenda recortada ${drafts.length + 1}`;
}

function drawCropSelection(start, current, imageRect, stageRect) {
  const box = getSelectionBox(start, current);
  elements.cropSelection.hidden = false;
  elements.cropSelection.style.left = `${box.left - stageRect.left}px`;
  elements.cropSelection.style.top = `${box.top - stageRect.top}px`;
  elements.cropSelection.style.width = `${box.right - box.left}px`;
  elements.cropSelection.style.height = `${box.bottom - box.top}px`;
}

function readGarmentForm(fields, photo = "") {
  const name = fields.name.value.trim();
  const color = fields.color.value.trim().toLowerCase();

  if (!name || !color) {
    showStatus(elements.colorHint, "Completa al menos nombre y color antes de guardar.");
    return null;
  }

  return createWardrobeItem({
    name,
    color,
    type: fields.type.value,
    style: fields.style.value,
    season: fields.season.value,
    photo
  });
}

function resetSingleForm() {
  elements.singleItemForm.reset();
  elements.type.value = "camiseta";
  elements.style.value = "casual";
  elements.season.value = "entretiempo";
  elements.preview.removeAttribute("src");
  elements.preview.classList.remove("visible");
  elements.colorHint.hidden = true;
  elements.aiSingleStatus.hidden = true;
  elements.singleConfidence.hidden = true;
  elements.singleConfidence.innerHTML = "";
  elements.analyzeSingleAI.disabled = true;
  selectedPhoto = "";
  selectedPhotoFileName = "";
}

function confirmDraft(id) {
  const draft = drafts.find(item => item.id === id);
  if (!draft || !draft.name.trim() || !draft.color.trim()) return;

  wardrobe = [createWardrobeItem(draft), ...wardrobe];
  drafts = drafts.filter(item => item.id !== id);
  saveWardrobe(wardrobe);
  saveDrafts(drafts);
  renderAll();
  showToast("Prenda guardada desde revisión inteligente.");
}

function confirmAllDrafts() {
  const complete = drafts.filter(item => item.name.trim() && item.color.trim());
  if (!complete.length) return;

  wardrobe = [...complete.map(createWardrobeItem), ...wardrobe];
  drafts = drafts.filter(item => !item.name.trim() || !item.color.trim());
  saveWardrobe(wardrobe);
  saveDrafts(drafts);
  renderAll();
  showToast(`${complete.length} prendas guardadas en tu armario.`);
}

function updateDraft(id, key, value) {
  drafts = drafts.map(item => item.id === id ? { ...item, [key]: value } : item);
  saveDrafts(drafts);
}

function removeDraft(id) {
  drafts = drafts.filter(item => item.id !== id);
  saveDrafts(drafts);
  renderAll();
  showToast("Recorte descartado.");
}

function clearDrafts() {
  drafts = [];
  saveDrafts(drafts);
  renderAll();
}

function updateFiltersFromControls() {
  filters = {
    search: elements.wardrobeSearch.value.trim(),
    type: elements.wardrobeTypeFilter.value,
    style: elements.wardrobeStyleFilter.value,
    season: elements.wardrobeSeasonFilter.value,
    color: elements.wardrobeColorFilter.value,
    sort: elements.wardrobeSort.value
  };
  saveFilters(filters);
  renderWardrobe();
}

function editItem(id) {
  const item = wardrobe.find(candidate => candidate.id === id);
  if (!item) return;

  elements.editItemId.value = item.id;
  elements.editName.value = item.name;
  elements.editColor.value = item.color;
  elements.editType.value = item.type;
  elements.editStyle.value = item.style;
  elements.editSeason.value = item.season;
  elements.editDialog.showModal();
}

function saveEditedItem(event) {
  event.preventDefault();
  const id = elements.editItemId.value;
  wardrobe = wardrobe.map(item => item.id === id ? {
    ...item,
    name: elements.editName.value.trim() || item.name,
    color: elements.editColor.value.trim().toLowerCase() || item.color,
    type: elements.editType.value,
    style: elements.editStyle.value,
    season: elements.editSeason.value
  } : item);
  saveWardrobe(wardrobe);
  elements.editDialog.close();
  renderAll();
  showToast("Prenda actualizada.");
}

function deleteItem(id) {
  wardrobe = wardrobe.filter(item => item.id !== id);
  saveWardrobe(wardrobe);
  renderAll();
  showToast("Prenda eliminada.");
}

function clearWardrobe() {
  if (!confirm("¿Seguro que quieres borrar tu armario local?")) return;
  wardrobe = [];
  currentOutfit = null;
  saveWardrobe(wardrobe);
  renderAll();
  showToast("Armario local borrado.");
}

function generateOutfit(options = {}) {
  const excludeIds = options.excludeCurrent && currentOutfit ? getOutfitPieceIds(currentOutfit.pieces) : readLastOutfitIds();
  const context = options.dailyContext ? getDailyContext() : {
    occasion: elements.occasion.value,
    climate: elements.climate.value,
    temperature: Number(elements.temperature.value) || 18,
    style: elements.outfitStyle.value
  };

  if (options.dailyContext) {
    elements.occasion.value = context.occasion;
    elements.climate.value = context.climate;
    elements.temperature.value = context.temperature;
    elements.outfitStyle.value = context.style;
  }

  currentOutfit = recommendOutfit(wardrobe, context, {
    excludeIds,
    recentOutfits: getRecentWeeklyOutfits()
  });
  currentOutfit.context = context;
  currentOutfit.title = createOutfitTitle(context);
  currentOutfit.savedId = "";
  engagement = { ...engagement, generatedCount: engagement.generatedCount + 1 };
  saveEngagement(engagement);
  saveLastOutfitIds(getOutfitPieceIds(currentOutfit.pieces));
  renderCurrentOutfit();
  renderHome();
  showStatus(elements.outfitFeedback, currentOutfit.pieces.length ? "Look generado con prendas reales de tu armario." : "Añade alguna prenda más para que el motor tenga margen.");

  if (options.scrollToResult) {
    document.getElementById("outfitBuilder").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function saveCurrentOutfit() {
  if (!currentOutfit?.pieces.length) return;
  const record = createOutfitRecord({
    title: currentOutfit.title,
    pieces: currentOutfit.pieces,
    pieceIds: getOutfitPieceIds(currentOutfit.pieces),
    context: currentOutfit.context,
    explanation: currentOutfit.explanation,
    favorite: true
  });
  outfits = [record, ...outfits.filter(item => item.id !== record.id)].slice(0, 12);
  currentOutfit.savedId = record.id;
  saveOutfits(outfits);
  renderHistory();
  renderHome();
  elements.saveOutfitButton.disabled = true;
  elements.saveOutfitButton.textContent = "Guardado";
  showToast("Outfit guardado en favoritos.");
}

function markCurrentOutfitUsed() {
  if (!currentOutfit?.pieces.length) return;
  const pieceIds = getOutfitPieceIds(currentOutfit.pieces);
  wardrobe = incrementUsage(wardrobe, pieceIds);

  const wornAt = Date.now();
  if (currentOutfit.savedId) {
    outfits = outfits.map(outfit => outfit.id === currentOutfit.savedId ? { ...outfit, wornAt } : outfit);
  } else {
    const record = createOutfitRecord({
      title: currentOutfit.title,
      pieces: currentOutfit.pieces,
      pieceIds,
      context: currentOutfit.context,
      explanation: currentOutfit.explanation,
      wornAt
    });
    outfits = [record, ...outfits].slice(0, 12);
    currentOutfit.savedId = record.id;
  }

  saveWardrobe(wardrobe);
  saveOutfits(outfits);
  elements.wearOutfitButton.disabled = true;
  elements.wearOutfitButton.textContent = "Marcado como usado";
  renderAll();
  showToast("Uso registrado. El motor rotará mejor tus prendas.");
}

function markHistoryOutfitUsed(id) {
  const outfit = outfits.find(candidate => candidate.id === id);
  if (!outfit || outfit.wornAt) return;

  wardrobe = incrementUsage(wardrobe, outfit.pieceIds);
  outfits = outfits.map(candidate => candidate.id === id ? { ...candidate, wornAt: Date.now() } : candidate);
  saveWardrobe(wardrobe);
  saveOutfits(outfits);
  renderAll();
  showToast("Outfit marcado como usado.");
}

function toggleHistoryFavorite(id) {
  outfits = outfits.map(candidate => candidate.id === id ? { ...candidate, favorite: !candidate.favorite } : candidate);
  saveOutfits(outfits);
  renderAll();
  showToast(outfits.find(candidate => candidate.id === id)?.favorite ? "Outfit añadido a favoritos." : "Outfit quitado de favoritos.");
}

function reuseHistoryOutfit(id) {
  const outfit = outfits.find(candidate => candidate.id === id);
  if (!outfit?.pieces?.length) return;

  currentOutfit = {
    pieces: outfit.pieces,
    requiredGroups: [],
    explanation: outfit.explanation,
    context: outfit.context || getDailyContext(),
    title: outfit.title || "Outfit guardado",
    savedId: outfit.id
  };

  renderCurrentOutfit();
  document.getElementById("outfitBuilder").scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("Outfit recuperado. Puedes usarlo de nuevo hoy.");
}

function renderAll() {
  renderStats();
  renderDrafts();
  renderWardrobe();
  renderHistory();
  renderHero();
  renderHome();
}

function renderStats() {
  elements.totalItems.textContent = wardrobe.length;
  elements.pendingItems.textContent = drafts.length;
  elements.pendingBadge.textContent = drafts.length;
  elements.heroItemCount.textContent = `${wardrobe.length} prendas`;
  elements.confirmAllPending.disabled = drafts.length === 0;
  elements.clearPending.disabled = drafts.length === 0;
  elements.homeWardrobeCount.textContent = wardrobe.length;
  elements.unusedItemsCount.textContent = wardrobe.filter(item => !item.usageCount).length;
  elements.favoriteOutfitCount.textContent = outfits.filter(outfit => outfit.favorite).length;
  elements.generatedCount.textContent = engagement.generatedCount;
  elements.activeDaysCount.textContent = engagement.activeDays.length;
  elements.streakCount.textContent = getStreak(engagement.activeDays);
}

function renderDrafts() {
  elements.pendingGallery.innerHTML = "";
  drafts.forEach(item => {
    elements.pendingGallery.appendChild(renderDraftCard(item, {
      onChange: updateDraft,
      onConfirm: confirmDraft,
      onRemove: removeDraft
    }));
  });
}

function renderWardrobe() {
  renderColorFilter();
  const visible = filterWardrobe(wardrobe, filters);
  elements.wardrobe.innerHTML = "";
  visible.forEach(item => {
    elements.wardrobe.appendChild(renderWardrobeCard(item, {
      onEdit: editItem,
      onDelete: deleteItem
    }));
  });
  updateWardrobeSummary(elements.wardrobeSummary, visible.length, wardrobe.length);
}

function renderColorFilter() {
  const previous = filters.color || "todos";
  const colors = ["todos", ...getUniqueColors(wardrobe), ...COLORS.filter(color => !getUniqueColors(wardrobe).includes(color))];
  renderSelectOptions(elements.wardrobeColorFilter, colors, colors.includes(previous) ? previous : "todos");
}

function renderCurrentOutfit() {
  elements.outfit.innerHTML = "";
  if (!currentOutfit?.pieces.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Añade más prendas para generar un look completo.";
    elements.outfit.appendChild(empty);
  } else {
    currentOutfit.pieces.forEach(item => {
      elements.outfit.appendChild(renderOutfitPiece(item, createImageElement));
    });
  }

  elements.explanation.textContent = currentOutfit?.explanation || "";
  elements.result.hidden = false;
  elements.saveOutfitButton.disabled = !currentOutfit?.pieces.length;
  elements.saveOutfitButton.textContent = "Guardar outfit";
  elements.wearOutfitButton.disabled = !currentOutfit?.pieces.length;
  elements.wearOutfitButton.textContent = "Marcar como usado";
  renderHero();
}

function renderHistory() {
  elements.outfitCount.textContent = outfits.length;
  elements.outfitHistory.innerHTML = "";
  outfits.slice(0, 8).forEach(outfit => {
    elements.outfitHistory.appendChild(renderHistoryItem(outfit, createImageElement, {
      onWear: markHistoryOutfitUsed,
      onFavorite: toggleHistoryFavorite,
      onReuse: reuseHistoryOutfit
    }));
  });
}

function renderHero() {
  const pieces = currentOutfit?.pieces?.length ? currentOutfit.pieces : wardrobe.slice(0, 3);
  elements.heroLookStack.innerHTML = "";

  pieces.slice(0, 3).forEach(item => {
    const image = createImageElement(item);
    image.className = "hero-garment";
    elements.heroLookStack.appendChild(image);
  });
}

function renderHome() {
  const dailyContext = getDailyContext();
  const dailyOutfit = wardrobe.length
    ? recommendOutfit(wardrobe, dailyContext, {
      excludeIds: readLastOutfitIds(),
      recentOutfits: getRecentWeeklyOutfits()
    })
    : { pieces: [] };

  elements.dailyTitle.textContent = dailyOutfit.pieces.length ? createOutfitTitle(dailyContext) : "Tu look está esperando";
  elements.dailyLookStack.innerHTML = "";
  dailyOutfit.pieces.slice(0, 4).forEach(item => elements.dailyLookStack.appendChild(createImageElement(item)));

  if (!dailyOutfit.pieces.length) {
    elements.dailyMessage.textContent = "Añade prendas de arriba, abajo y calzado para activar el outfit del día.";
  } else {
    elements.dailyMessage.textContent = getDailyMessage(dailyContext, dailyOutfit.pieces);
  }

  const unused = wardrobe.filter(item => !item.usageCount).length;
  const favoriteCount = outfits.filter(outfit => outfit.favorite).length;
  const lastWorn = [...outfits]
    .filter(outfit => outfit.wornAt)
    .sort((a, b) => b.wornAt - a.wornAt)[0];
  elements.dailyInsight.textContent = unused
    ? `Tienes ${unused} prendas que aún no has usado. Buen momento para rotarlas.`
    : favoriteCount
      ? `Tus favoritos ya están creando un mapa claro de tu estilo.`
      : "Guarda tus mejores looks para que el historial empiece a trabajar contigo.";
  elements.lastWornOutfit.textContent = lastWorn
    ? `Último outfit usado: ${lastWorn.title} · ${formatRelativeDay(lastWorn.wornAt)}`
    : "Último outfit usado: todavía no hay registro.";
}

function getDailyContext() {
  const hour = new Date().getHours();
  const weekday = new Date().getDay();
  const isWeekend = weekday === 0 || weekday === 6;
  return {
    occasion: isWeekend ? "plan casual" : "clase",
    climate: hour < 11 ? "nublado" : "soleado",
    temperature: hour < 11 ? 16 : 21,
    style: "cualquiera"
  };
}

function getDailyMessage(context, pieces) {
  const hasLayer = pieces.some(item => ["jersey", "sudadera", "chaqueta", "cazadora", "abrigo"].includes(item.type));
  if (context.occasion === "clase") return hasLayer ? "Hoy toca un look cómodo para clase, con una capa fácil por si baja la temperatura." : "Hoy toca un look cómodo para clase, rápido y fácil de llevar.";
  return "Te dejo una opción equilibrada para moverte sin pensar demasiado en la combinación.";
}

function getConfidenceLabel(confidence) {
  const value = Number(confidence) || 0;
  return value >= 0.7
    ? `Resultado con confianza ${formatConfidence(value)}`
    : `Resultado con confianza ${formatConfidence(value)} · revisar recomendado`;
}

function formatRelativeDay(timestamp) {
  const then = new Date(timestamp);
  const today = getDayKey();
  const day = getDayKey(then);
  if (day === today) return "hoy";

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  if (day === getDayKey(yesterdayDate)) return "ayer";

  return then.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function getRecentWeeklyOutfits() {
  const weekAgo = Date.now() - 1000 * 60 * 60 * 24 * 7;
  return outfits.filter(outfit => (outfit.wornAt || outfit.createdAt) >= weekAgo);
}

function touchEngagement(current) {
  const today = getDayKey();
  const activeDays = current.activeDays.includes(today) ? current.activeDays : [...current.activeDays, today].sort();
  return {
    ...current,
    activeDays,
    lastOpenedAt: Date.now()
  };
}

function getStreak(activeDays) {
  const days = new Set(activeDays);
  let streak = 0;
  const cursor = new Date();
  while (days.has(getDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setupNavigationState() {
  const targets = [...elements.navLinks]
    .map(link => document.getElementById(link.dataset.navTarget))
    .filter(Boolean);

  if (!("IntersectionObserver" in window) || !targets.length) return;

  const observer = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;

    elements.navLinks.forEach(link => {
      link.classList.toggle("active", link.dataset.navTarget === visible.target.id);
    });
  }, { threshold: [0.28, 0.5, 0.72] });

  targets.forEach(target => observer.observe(target));
}

function showStatus(node, message) {
  node.hidden = false;
  node.textContent = message;
}

function renderConfidenceBadge(confidence) {
  elements.singleConfidence.innerHTML = "";

  if (confidence === null || confidence === undefined) {
    elements.singleConfidence.hidden = false;
    const loading = document.createElement("span");
    loading.className = "confidence-pill loading";
    loading.textContent = "Análisis inteligente";
    elements.singleConfidence.appendChild(loading);
    return;
  }

  const value = Number(confidence) || 0;
  elements.singleConfidence.hidden = false;
  const confidencePill = document.createElement("span");
  confidencePill.className = `confidence-pill ${value >= 0.7 ? "strong" : "review"}`;
  confidencePill.textContent = `Confianza ${formatConfidence(value)}`;
  elements.singleConfidence.appendChild(confidencePill);

  if (value < 0.7) {
    const reviewPill = document.createElement("span");
    reviewPill.className = "confidence-pill review";
    reviewPill.textContent = "Revisar recomendado";
    elements.singleConfidence.appendChild(reviewPill);
  }
}

function showToast(message) {
  clearTimeout(toastTimeout);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  elements.toast.classList.add("visible");
  toastTimeout = setTimeout(() => {
    elements.toast.classList.remove("visible");
    elements.toast.hidden = true;
  }, 2600);
}

async function requestVisionAnalysis(endpoint, imageDataUrl, options = {}) {
  const image = await prepareImageForAnalysis(imageDataUrl);
  const apiBaseUrl = getApiBaseUrl();

  let response;
  try {
    response = await fetch(`${apiBaseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image,
        filename: options.filename || ""
      })
    });
  } catch {
    throw new Error("El análisis inteligente no está disponible ahora mismo. Inténtalo más tarde.");
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    throw new Error(getVisionErrorMessage(payload, response.status));
  }

  return payload;
}

function applyGarmentSuggestion(garment) {
  if (!garment) return;

  elements.name.value = garment.name || elements.name.value;
  elements.color.value = garment.color || elements.color.value;
  if (TYPES.includes(garment.type)) elements.type.value = garment.type;
  if (STYLES.includes(garment.style)) elements.style.value = garment.style;
  if (SEASONS.includes(garment.season)) elements.season.value = garment.season;
}

async function prepareImageForAnalysis(imageDataUrl) {
  const image = await loadImage(imageDataUrl);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const ratio = Math.min(1, MAX_ANALYSIS_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const optimized = canvas.toDataURL("image/jpeg", 0.82);
  if (estimateDataUrlSizeMb(optimized) > MAX_CLIENT_IMAGE_MB) {
    throw new Error("La imagen sigue siendo demasiado grande para analizar. Prueba con una foto más ligera o recorta la zona principal.");
  }

  return optimized;
}

function getVisionErrorMessage(payload, status) {
  const code = payload.code || "";
  if (code === "IMAGE_TOO_LARGE" || status === 413) return "La imagen es demasiado grande. Prueba con una foto más ligera o recortada.";
  if (code === "INVALID_IMAGE_FORMAT") return "No hemos podido leer esta imagen. Prueba con otra foto.";
  if (status >= 500 || code === "MISSING_OPENAI_API_KEY" || code === "OPENAI_ERROR") return "El análisis inteligente no está disponible ahora mismo. Inténtalo más tarde.";
  return "No hemos podido analizar esta imagen. Prueba con otra foto más clara.";
}

function getApiBaseUrl() {
  const injectedUrl = normalizeApiBaseUrl(window.SACLO_API_BASE);
  if (injectedUrl) return injectedUrl;

  const storedUrl = normalizeApiBaseUrl(readLocalValue(API_BASE_STORAGE_KEY, ""));
  if (storedUrl && LEGACY_LOCAL_API_URLS.has(storedUrl)) {
    removeLocalValue(API_BASE_STORAGE_KEY);
    return DEFAULT_API_BASE_URL;
  }
  if (devMode && storedUrl) return storedUrl;

  return DEFAULT_API_BASE_URL;
}

function getUserFacingAnalysisError(error, context = "single") {
  const message = String(error?.message || "");
  if (message.includes("demasiado grande")) return message;
  if (context === "closet" && message.includes("detectaron prendas claras")) {
    return "No se detectaron prendas claras. Intenta con mejor luz o prendas menos superpuestas.";
  }
  if (message.includes("no está disponible")) return "El análisis inteligente no está disponible ahora mismo. Inténtalo más tarde.";
  return context === "closet"
    ? "No se detectaron prendas claras. Intenta con mejor luz o prendas menos superpuestas."
    : "No hemos podido analizar esta imagen. Prueba con otra foto más clara.";
}

function resolveApiBaseUrl(value) {
  return normalizeApiBaseUrl(value) || DEFAULT_API_BASE_URL;
}

function normalizeApiBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

function readLocalValue(key, fallback = "") {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function writeLocalValue(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // El análisis visual sigue disponible durante la sesión aunque el navegador bloquee localStorage.
  }
}

function removeLocalValue(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // El valor por defecto online se usará igualmente si el navegador bloquea localStorage.
  }
}

function isDevModeEnabled() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("dev") === "true") return true;
  return readLocalValue(DEV_MODE_STORAGE_KEY, "") === "true";
}

function estimateDataUrlSizeMb(dataUrl) {
  const base64 = String(dataUrl).split(",")[1] || "";
  return (base64.length * 3 / 4) / (1024 * 1024);
}

function formatConfidence(confidence) {
  const value = Math.round((Number(confidence) || 0) * 100);
  return `${value}%`;
}

function setButtonLoading(button, text) {
  button.dataset.readyText = button.textContent;
  button.textContent = text;
  button.disabled = true;
  button.classList.add("loading");
}

function setButtonReady(button, text, enabled = true) {
  button.textContent = text || button.dataset.readyText || button.textContent;
  button.disabled = !enabled;
  button.classList.remove("loading");
}

function clampPoint(clientX, clientY, rect) {
  return {
    x: Math.min(Math.max(clientX, rect.left), rect.right),
    y: Math.min(Math.max(clientY, rect.top), rect.bottom)
  };
}

function getSelectionBox(start, current) {
  return {
    left: Math.min(start.x, current.x),
    top: Math.min(start.y, current.y),
    right: Math.max(start.x, current.x),
    bottom: Math.max(start.y, current.y)
  };
}
