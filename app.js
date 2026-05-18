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
const STYLE_PROFILE_STORAGE_KEY = "sacloStyleProfile";
const LEGACY_API_STORAGE_KEYS = ["checkFitApiUrl", "sacloApiUrl", "sacloDevMode"];
const LEGACY_LOCAL_API_URLS = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001"
]);
const MAX_ANALYSIS_SIDE = 1200;
const ANALYSIS_JPEG_QUALITY = 0.74;
const MAX_CLIENT_IMAGE_MB = 2.2;
const VISION_CACHE_LIMIT = 12;
const VISION_REQUEST_TIMEOUT_MS = 18000;

const elements = {
  heroPrimaryAction: document.getElementById("heroPrimaryAction"),
  showExampleButton: document.getElementById("showExampleButton"),
  closeExampleButton: document.getElementById("closeExampleButton"),
  exampleLookCard: document.getElementById("exampleLookCard"),
  heroItemCount: document.getElementById("heroItemCount"),
  heroLookStack: document.getElementById("heroLookStack"),
  starterEyebrow: document.getElementById("starterEyebrow"),
  starterTitle: document.getElementById("starterTitle"),
  starterText: document.getElementById("starterText"),
  starterPrimaryAction: document.getElementById("starterPrimaryAction"),
  starterProgressBar: document.getElementById("starterProgressBar"),
  starterProgressText: document.getElementById("starterProgressText"),
  dailyTitle: document.getElementById("dailyTitle"),
  dailyLookStack: document.getElementById("dailyLookStack"),
  dailyMessage: document.getElementById("dailyMessage"),
  dailyCreateButton: document.getElementById("dailyCreateButton"),
  dailyAnotherButton: document.getElementById("dailyAnotherButton"),
  streakCount: document.getElementById("streakCount"),
  activeDaysCount: document.getElementById("activeDaysCount"),
  generatedCount: document.getElementById("generatedCount"),
  dailyInsight: document.getElementById("dailyInsight"),
  forgottenRack: document.getElementById("forgottenRack"),
  lastWornOutfit: document.getElementById("lastWornOutfit"),
  homeWardrobeCount: document.getElementById("homeWardrobeCount"),
  unusedItemsCount: document.getElementById("unusedItemsCount"),
  favoriteOutfitCount: document.getElementById("favoriteOutfitCount"),
  usedOutfitCount: document.getElementById("usedOutfitCount"),
  favoriteItemCount: document.getElementById("favoriteItemCount"),
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
  outfitAdvice: document.getElementById("outfitAdvice"),
  saveOutfitButton: document.getElementById("saveOutfitButton"),
  wearOutfitButton: document.getElementById("wearOutfitButton"),
  outfitHistory: document.getElementById("outfitHistory"),
  outfitCount: document.getElementById("outfitCount"),
  historyAllFilter: document.getElementById("historyAllFilter"),
  historyFavoriteFilter: document.getElementById("historyFavoriteFilter"),
  wardrobeInsight: document.getElementById("wardrobeInsight"),
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
  navLinks: document.querySelectorAll(".bottom-nav a"),
  zoneButtons: document.querySelectorAll(".zone-chip")
};

let wardrobe = loadWardrobe();
let drafts = loadDrafts();
let filters = loadFilters();
let outfits = loadOutfits();
let engagement = touchEngagement(loadEngagement());
let selectedPhoto = "";
let selectedPhotoFileName = "";
let closetImage = "";
let selectedClosetZone = "Camisetas";
let cropArea = null;
let dragState = null;
let currentOutfit = null;
let dailyOutfit = null;
let dailyExcludeIds = [];
let historyFilter = "all";
let cropPreviewPhoto = "";
let cropPreviewColor = "";
let toastTimeout = 0;
let analysisProgressTimer = 0;
const visionAnalysisCache = new Map();
const visionAnalysisInFlight = new Map();

init();

function init() {
  saveEngagement(engagement);
  cleanupLegacyApiConfig();
  hydrateSelects();
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

function bindEvents() {
  elements.showExampleButton.addEventListener("click", showExampleLook);
  elements.closeExampleButton.addEventListener("click", hideExampleLook);
  elements.singleModeButton.addEventListener("click", () => setCaptureMode("single"));
  elements.closetModeButton.addEventListener("click", () => setCaptureMode("closet"));
  elements.photo.addEventListener("change", previewSinglePhoto);
  elements.zoneButtons.forEach(button => button.addEventListener("click", () => selectClosetZone(button.dataset.zone)));
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
  elements.dailyCreateButton.addEventListener("click", useDailyOutfit);
  elements.dailyAnotherButton.addEventListener("click", generateDailyAlternative);
  elements.anotherOutfitButton.addEventListener("click", () => generateOutfit({ excludeCurrent: true }));
  elements.saveOutfitButton.addEventListener("click", saveCurrentOutfit);
  elements.wearOutfitButton.addEventListener("click", markCurrentOutfitUsed);
  elements.historyAllFilter.addEventListener("click", () => setHistoryFilter("all"));
  elements.historyFavoriteFilter.addEventListener("click", () => setHistoryFilter("favorites"));
  elements.editItemForm.addEventListener("submit", saveEditedItem);
  elements.closeEditDialog.addEventListener("click", () => elements.editDialog.close());
}

function showExampleLook() {
  elements.exampleLookCard.hidden = false;
  elements.exampleLookCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideExampleLook() {
  elements.exampleLookCard.hidden = true;
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

function selectClosetZone(zone = "Camisetas") {
  selectedClosetZone = zone;
  elements.zoneButtons.forEach(button => {
    const active = button.dataset.zone === zone;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  showStatus(elements.aiClosetStatus, `${zone}: sube una foto con pocas prendas visibles y buena luz.`);
}

async function previewSinglePhoto(event) {
  const files = [...event.target.files];
  if (files.length > 1) {
    await processMultipleSinglePhotos(files);
    return;
  }

  const file = files[0];
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

async function processMultipleSinglePhotos(files) {
  const selectedFiles = files.filter(file => file.type.startsWith("image/"));
  if (!selectedFiles.length) return;

  resetSingleForm();
  showAnalysisSkeletons(Math.min(selectedFiles.length, 4));
  setButtonLoading(elements.analyzeSingleAI, "Analizando prendas...");
  startAnalysisProgress(elements.aiSingleStatus, [
    "Analizando prendas sueltas...",
    "Leyendo tipo y color...",
    "Preparando revisión rápida..."
  ]);

  const createdDrafts = await Promise.all(selectedFiles.map(file => createDraftFromSinglePhoto(file)));
  drafts = [
    ...createdDrafts.filter(Boolean),
    ...drafts
  ];

  saveDrafts(drafts);
  renderAll();
  clearAnalysisSkeletons();
  stopAnalysisProgress();
  setButtonReady(elements.analyzeSingleAI, "Analizar prenda", false);
  showStatus(elements.aiSingleStatus, `${createdDrafts.filter(Boolean).length} prendas listas en revisión rápida.`);
  showToast("Prendas sueltas listas para revisar.");
  document.querySelector(".draft-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function createDraftFromSinglePhoto(file) {
  const photo = await fileToDataUrl(file);

  try {
    const payload = await requestVisionAnalysis("/api/analyze-garment", photo, {
      filename: file.name
    });
    if (payload.garment) {
      return createDraftFromGarment(payload.garment, photo, "Prenda suelta");
    }
  } catch {
    // Si falla el análisis, SACLO mantiene el alta rápida con datos editables.
  }

  const fileText = cleanFileName(file.name);
  const color = inferColor(fileText) || await detectDominantColor(photo);
  return createDraftItem({
    name: fileText || "Prenda suelta",
    color,
    type: inferType(fileText),
    style: inferStyle(fileText),
    season: inferSeason(fileText),
    photo,
    source: "Prenda suelta",
    description: "Revisa los datos antes de guardar"
  });
}

async function analyzeSingleWithAI() {
  if (!selectedPhoto) {
    showStatus(elements.aiSingleStatus, "Sube una foto de prenda antes de analizar.");
    return;
  }

  setButtonLoading(elements.analyzeSingleAI, "Analizando prenda...");
  renderConfidenceBadge(null);
  startAnalysisProgress(elements.aiSingleStatus, [
    "Analizando prenda...",
    "Leyendo tipo y forma...",
    "Analizando colores...",
    "Preparando resultados..."
  ]);

  try {
    const payload = await requestVisionAnalysis("/api/analyze-garment", selectedPhoto, {
      filename: selectedPhotoFileName
    });
    const garment = payload.garment;
    if (!garment) throw new Error("No hemos podido analizar esta imagen. Prueba con otra foto más clara.");
    applyGarmentSuggestion(garment);
    renderConfidenceBadge(garment.confidence, garment);
    showStatus(
      elements.aiSingleStatus,
      buildGarmentReviewMessage(garment)
    );
    showToast("Análisis aplicado. Revisa y guarda cuando encaje.");
  } catch (error) {
    showStatus(
      elements.aiSingleStatus,
      getUserFacingAnalysisError(error)
    );
  } finally {
    stopAnalysisProgress();
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
  elements.scanStatus.textContent = `${selectedClosetZone}: zona cargada. Puedes detectar prendas visibles o recortar una prenda concreta.`;
  showStatus(elements.aiClosetStatus, "Para mejores resultados: buena luz, prendas visibles y pocas piezas por foto.");
}

async function analyzeClosetWithAI() {
  if (!closetImage) {
    showStatus(elements.aiClosetStatus, `Sube la zona de ${selectedClosetZone.toLowerCase()} antes de detectar prendas visibles.`);
    return;
  }

  setButtonLoading(elements.analyzeClosetAI, "Analizando zona...");
  showAnalysisSkeletons(3);
  startAnalysisProgress(elements.aiClosetStatus, [
    "Analizando esta zona...",
    "Detectando prendas visibles...",
    "Separando piezas claras...",
    "Analizando colores...",
    "Preparando resultados..."
  ]);

  try {
    const payload = await requestVisionAnalysis("/api/analyze-closet", closetImage);
    const detected = Array.isArray(payload.garments) ? payload.garments : [];

    if (!detected.length) {
      showStatus(
        elements.aiClosetStatus,
        payload.notes || "No hemos detectado prendas claras. Prueba con mejor luz o con menos prendas superpuestas."
      );
      elements.scanStatus.textContent = "Puedes recortar una prenda concreta para analizarla mejor.";
      return;
    }

    drafts = [
      ...detected.map(garment => createDraftFromGarment(garment, closetImage, selectedClosetZone)),
      ...drafts
    ];

    saveDrafts(drafts);
    renderAll();
    const resultCopy = detected.length < 3
      ? "Solo detecté las prendas más claras. Puedes subir otra zona para completar tu armario."
      : "Encontré estas prendas visibles. Revísalas antes de guardarlas.";
    showStatus(
      elements.aiClosetStatus,
      `${detected.length} prendas visibles. ${resultCopy}`
    );
    elements.scanStatus.textContent = "Puedes subir otra zona o seleccionar una prenda concreta sobre la misma foto.";
    showToast("Prendas visibles listas para revisar.");
  } catch (error) {
    showStatus(
      elements.aiClosetStatus,
      getUserFacingAnalysisError(error, "closet")
    );
    elements.scanStatus.textContent = "Puedes recortar una prenda concreta para analizarla mejor.";
  } finally {
    stopAnalysisProgress();
    clearAnalysisSkeletons();
    setButtonReady(elements.analyzeClosetAI, "Analizar esta zona", Boolean(closetImage));
  }
}

function createDraftFromGarment(garment, photo, sourceLabel) {
  return createDraftItem({
    name: garment.name,
    color: garment.color,
    type: garment.type,
    style: garment.style,
    season: garment.season,
    photo,
    confidence: Number(garment.confidence || 0),
    description: garment.description || "",
    reviewReason: garment.reviewReason || "",
    typeAlternatives: garment.typeAlternatives || [],
    source: `${sourceLabel} · ${formatConfidence(garment.confidence)}`
  });
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
  showToast("Prenda guardada desde revisión rápida.");
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

function updateDraftQuickType(id, type) {
  drafts = drafts.map(item => item.id === id ? { ...item, type } : item);
  saveDrafts(drafts);
  renderDrafts();
  showToast(`Tipo actualizado a ${type}.`);
}

function removeDraft(id) {
  drafts = drafts.filter(item => item.id !== id);
  saveDrafts(drafts);
  renderAll();
  showToast("Prenda descartada.");
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

function toggleItemFavorite(id) {
  wardrobe = wardrobe.map(item => item.id === id ? { ...item, favorite: !item.favorite } : item);
  saveWardrobe(wardrobe);
  renderAll();
  const item = wardrobe.find(candidate => candidate.id === id);
  showToast(item?.favorite ? "Prenda marcada como favorita." : "Prenda quitada de favoritos.");
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
    recentOutfits: getRecentWeeklyOutfits(),
    favoritePieceIds: getFavoritePieceIds(),
    styleProfile: getUserStyleProfile()
  });
  currentOutfit.context = context;
  currentOutfit.title = createOutfitTitle({ ...context, vibe: currentOutfit.vibe });
  currentOutfit.savedId = "";
  recordEngagementActivity({ generated: true });
  saveLastOutfitIds(getOutfitPieceIds(currentOutfit.pieces));
  renderCurrentOutfit();
  renderHome();
  showStatus(elements.outfitFeedback, currentOutfit.pieces.length ? getResultMicrocopy(currentOutfit) : "Añade alguna prenda más para que SACLO tenga margen.");

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
    vibe: currentOutfit.vibe,
    vibeKey: currentOutfit.vibeKey,
    palette: currentOutfit.palette,
    advice: currentOutfit.advice,
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
      vibe: currentOutfit.vibe,
      vibeKey: currentOutfit.vibeKey,
      palette: currentOutfit.palette,
      advice: currentOutfit.advice,
      wornAt
    });
    outfits = [record, ...outfits].slice(0, 12);
    currentOutfit.savedId = record.id;
  }

  saveWardrobe(wardrobe);
  saveOutfits(outfits);
  recordEngagementActivity();
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
  recordEngagementActivity();
  renderAll();
  showToast("Outfit marcado como usado.");
}

function toggleHistoryFavorite(id) {
  outfits = outfits.map(candidate => candidate.id === id ? { ...candidate, favorite: !candidate.favorite } : candidate);
  saveOutfits(outfits);
  renderAll();
  showToast(outfits.find(candidate => candidate.id === id)?.favorite ? "Outfit añadido a favoritos." : "Outfit quitado de favoritos.");
}

function setHistoryFilter(filter) {
  historyFilter = filter;
  renderHistory();
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
    vibe: outfit.vibe,
    vibeKey: outfit.vibeKey,
    palette: outfit.palette,
    advice: outfit.advice || [],
    savedId: outfit.id
  };

  renderCurrentOutfit();
  document.getElementById("outfitBuilder").scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("Outfit recuperado. Puedes usarlo de nuevo hoy.");
}

function generateHistoryVariation(id) {
  const outfit = outfits.find(candidate => candidate.id === id);
  if (!outfit) return;

  const context = outfit.context || getDailyContext();
  currentOutfit = recommendOutfit(wardrobe, context, {
    excludeIds: outfit.pieceIds || [],
    recentOutfits: getRecentWeeklyOutfits(),
    favoritePieceIds: getFavoritePieceIds(),
    avoidPieceIds: getLastUsedPieceIds(),
    preferredVibe: outfit.vibeKey || outfit.vibe,
    styleProfile: getUserStyleProfile()
  });
  currentOutfit.context = context;
  currentOutfit.title = createOutfitTitle({ ...context, vibe: currentOutfit.vibe });
  currentOutfit.savedId = "";
  recordEngagementActivity({ generated: true });
  saveLastOutfitIds(getOutfitPieceIds(currentOutfit.pieces));
  renderCurrentOutfit();
  renderHome();
  document.getElementById("outfitBuilder").scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("Variación generada con la misma intención.");
}

function deleteHistoryOutfit(id) {
  outfits = outfits.filter(outfit => outfit.id !== id);
  saveOutfits(outfits);
  renderAll();
  showToast("Outfit eliminado del historial.");
}

function renderAll() {
  updateOnboardingMode();
  renderOnboardingState();
  renderStats();
  renderDrafts();
  renderWardrobe();
  renderHistory();
  renderHero();
  renderHome();
}

function updateOnboardingMode() {
  const canRecommendDailyLooks = wardrobe.length >= 3;
  document.body.classList.toggle("new-wardrobe", wardrobe.length === 0);
  document.body.classList.toggle("starter-wardrobe", wardrobe.length > 0 && wardrobe.length < 3);
  document.body.classList.toggle("has-wardrobe", canRecommendDailyLooks);
  document.body.classList.toggle("empty-wardrobe", !canRecommendDailyLooks);
}

function renderOnboardingState() {
  const started = wardrobe.length > 0 && wardrobe.length < 3;
  const progress = Math.min(100, Math.round((wardrobe.length / 5) * 100));

  elements.heroPrimaryAction.textContent = started ? "Añadir más prendas" : "Empezar con mi armario";
  elements.starterEyebrow.textContent = started ? "Armario empezado" : "Primer paso";
  elements.starterTitle.textContent = started ? "Ya has empezado tu armario" : "Empieza con 5 prendas";
  elements.starterText.textContent = started
    ? "Añade unas pocas prendas más para crear looks mejores."
    : "Con unas pocas piezas, SACLO ya puede crear tus primeros looks.";
  elements.starterPrimaryAction.textContent = started ? "Añadir más prendas" : "Subir primera prenda";
  elements.starterProgressBar.parentElement.hidden = !started;
  elements.starterProgressText.hidden = !started;
  elements.starterProgressBar.style.width = `${progress}%`;
  elements.starterProgressText.textContent = `${wardrobe.length}/5 prendas añadidas`;
}

function renderStats() {
  elements.totalItems.textContent = wardrobe.length;
  elements.pendingItems.textContent = drafts.length;
  elements.pendingBadge.textContent = drafts.length;
  elements.heroItemCount.textContent = wardrobe.length < 3 ? "Armario en marcha" : `${wardrobe.length} prendas`;
  elements.confirmAllPending.disabled = drafts.length === 0;
  elements.clearPending.disabled = drafts.length === 0;
  elements.homeWardrobeCount.textContent = wardrobe.length;
  elements.unusedItemsCount.textContent = wardrobe.filter(item => !item.usageCount).length;
  elements.favoriteOutfitCount.textContent = outfits.filter(outfit => outfit.favorite).length;
  elements.usedOutfitCount.textContent = outfits.filter(outfit => outfit.wornAt).length;
  elements.favoriteItemCount.textContent = wardrobe.filter(item => item.favorite).length;
  elements.generatedCount.textContent = engagement.generatedCount;
  elements.activeDaysCount.textContent = engagement.activeDays.length;
  elements.streakCount.textContent = getStreak(engagement.activeDays);
}

function renderDrafts() {
  elements.pendingGallery.innerHTML = "";
  drafts.forEach(item => {
    elements.pendingGallery.appendChild(renderDraftCard(item, {
      onChange: updateDraft,
      onQuickType: updateDraftQuickType,
      onConfirm: confirmDraft,
      onRemove: removeDraft
    }));
  });
}

function renderWardrobe() {
  renderColorFilter();
  const visible = filterWardrobe(wardrobe, filters);
  elements.wardrobe.innerHTML = "";
  elements.wardrobe.dataset.emptyLabel = wardrobe.length
    ? "No hay prendas con estos filtros."
    : "Tu armario empieza aquí. Sube tus primeras prendas para que SACLO pueda crear looks.";
  visible.forEach(item => {
    elements.wardrobe.appendChild(renderWardrobeCard(item, {
      onEdit: editItem,
      onDelete: deleteItem,
      onFavorite: toggleItemFavorite
    }));
  });
  updateWardrobeSummary(elements.wardrobeSummary, visible.length, wardrobe.length);
  renderWardrobeInsight();
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
  renderAdvice(elements.outfitAdvice, currentOutfit?.advice || []);
  elements.result.hidden = false;
  elements.saveOutfitButton.disabled = !currentOutfit?.pieces.length;
  elements.saveOutfitButton.textContent = "Guardar outfit";
  elements.wearOutfitButton.disabled = !currentOutfit?.pieces.length;
  elements.wearOutfitButton.textContent = "Marcar como usado";
  renderHero();
}

function renderHistory() {
  const visible = historyFilter === "favorites" ? outfits.filter(outfit => outfit.favorite) : outfits;
  elements.outfitHistory.dataset.emptyLabel = historyFilter === "favorites"
    ? "Guarda tus looks favoritos. SACLO aprenderá qué estilos prefieres."
    : "Aún no hay looks guardados. Genera tu primer outfit y márcalo como usado.";
  elements.outfitCount.textContent = visible.length;
  elements.historyAllFilter.classList.toggle("primary", historyFilter === "all");
  elements.historyAllFilter.classList.toggle("ghost", historyFilter !== "all");
  elements.historyFavoriteFilter.classList.toggle("primary", historyFilter === "favorites");
  elements.historyFavoriteFilter.classList.toggle("ghost", historyFilter !== "favorites");
  elements.outfitHistory.innerHTML = "";
  visible.slice(0, 10).forEach(outfit => {
    elements.outfitHistory.appendChild(renderHistoryItem(outfit, createImageElement, {
      onWear: markHistoryOutfitUsed,
      onFavorite: toggleHistoryFavorite,
      onReuse: reuseHistoryOutfit,
      onVariation: generateHistoryVariation,
      onDelete: deleteHistoryOutfit
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
  const profile = getUserStyleProfile();
  const canRecommendDailyLooks = wardrobe.length >= 3;
  dailyOutfit = canRecommendDailyLooks
    ? recommendOutfit(wardrobe, dailyContext, {
      excludeIds: [...new Set([...readLastOutfitIds(), ...dailyExcludeIds])],
      recentOutfits: getRecentWeeklyOutfits(),
      favoritePieceIds: getFavoritePieceIds(),
      avoidPieceIds: getLastUsedPieceIds(),
      styleProfile: profile
    })
    : { pieces: [] };

  elements.dailyTitle.textContent = dailyOutfit.pieces.length ? getDailyLookName(dailyOutfit, dailyContext) : "Empieza con tus primeras prendas";
  elements.dailyLookStack.innerHTML = "";
  dailyOutfit.pieces.slice(0, 4).forEach(item => elements.dailyLookStack.appendChild(createImageElement(item)));
  elements.dailyCreateButton.disabled = !dailyOutfit.pieces.length;
  elements.dailyAnotherButton.disabled = !dailyOutfit.pieces.length;

  if (!dailyOutfit.pieces.length) {
    elements.dailyMessage.textContent = "Con 5 prendas SACLO ya puede crear tus primeros looks.";
  } else {
    elements.dailyMessage.textContent = getDailyMessage(dailyContext, dailyOutfit, profile);
  }

  const forgotten = getForgottenItems();
  renderForgottenRack(forgotten);
  const unused = forgotten.length;
  const favoriteCount = outfits.filter(outfit => outfit.favorite).length;
  const lastWorn = [...outfits]
    .filter(outfit => outfit.wornAt)
    .sort((a, b) => b.wornAt - a.wornAt)[0];
  elements.dailyInsight.textContent = unused
    ? `Tienes ${unused} prendas olvidadas. Hoy puedes rescatar una sin cambiar todo tu estilo.`
    : favoriteCount
      ? `Tus favoritos ya están creando un mapa claro de tu estilo.`
      : getDailyWardrobeHint(profile);
  elements.lastWornOutfit.textContent = lastWorn
    ? `Último outfit usado: ${lastWorn.title} · ${formatRelativeDay(lastWorn.wornAt)}`
    : "Último outfit usado: todavía no hay registro.";
}

function getDailyContext() {
  const hour = new Date().getHours();
  const weekday = new Date().getDay();
  const isWeekend = weekday === 0 || weekday === 6;
  const profile = getUserStyleProfile();
  const selectedOccasion = elements.occasion.value;
  const selectedClimate = elements.climate.value;
  const selectedTemperature = Number(elements.temperature.value);
  const selectedStyle = elements.outfitStyle.value;
  return {
    occasion: profile.habitualOccasion || selectedOccasion || (isWeekend ? "plan casual" : "clase"),
    climate: selectedClimate || (hour < 11 ? "nublado" : "soleado"),
    temperature: Number.isFinite(selectedTemperature) ? selectedTemperature : (hour < 11 ? 16 : 21),
    style: selectedStyle && selectedStyle !== "cualquiera" ? selectedStyle : profile.favoriteStyles?.[0] || "cualquiera"
  };
}

function useDailyOutfit() {
  if (!dailyOutfit?.pieces?.length) {
    document.getElementById("capture").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const context = getDailyContext();
  currentOutfit = {
    ...dailyOutfit,
    context,
    title: createOutfitTitle({ ...context, vibe: dailyOutfit.vibe }),
    savedId: ""
  };
  recordEngagementActivity({ generated: true });
  saveLastOutfitIds(getOutfitPieceIds(currentOutfit.pieces));
  renderCurrentOutfit();
  renderHome();
  document.getElementById("outfitBuilder").scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("Look del día listo para usar.");
}

function generateDailyAlternative() {
  if (!dailyOutfit?.pieces?.length) {
    document.getElementById("capture").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  dailyExcludeIds = getOutfitPieceIds(dailyOutfit.pieces);
  recordEngagementActivity({ generated: true });
  renderHome();
  showToast("Nueva propuesta preparada para hoy.");
}

function getDailyLookName(outfit, context) {
  if (!outfit?.pieces?.length) return "Tu look está esperando";
  return createOutfitTitle({ ...context, vibe: outfit.vibe, vibeKey: outfit.vibeKey });
}

function getDailyMessage(context, outfit, profile) {
  const pieces = outfit.pieces || [];
  const hasLayer = pieces.some(item => ["jersey", "sudadera", "chaqueta", "cazadora", "abrigo"].includes(item.type));
  const forgotten = pieces.find(item => !item.usageCount || !item.lastUsedAt);
  const palette = outfit.palette?.label || "paleta cuidada";
  const lastWorn = getLastWornOutfit();
  const currentVibe = formatVibeName(outfit.vibe || outfit.vibeKey);
  const previousVibe = formatVibeName(lastWorn?.vibe);
  if (previousVibe && currentVibe && previousVibe !== currentVibe) return `Ayer tiraste más a ${previousVibe}; hoy puedes variar con ${currentVibe}.`;
  if (context.climate === "lluvia") return "Hoy pide un look práctico: chaqueta ligera, calzado cerrado y una paleta fácil.";
  if (context.temperature <= 12) return "Buen día para un look cómodo y abrigado, sin perder forma.";
  if (context.temperature >= 26) return "Hoy encaja un look ligero, limpio y sin prendas de más.";
  if (forgotten) return `Tienes una prenda olvidada que puede salvar el outfit: ${forgotten.name}.`;
  if (profile.favoriteColors?.length) return `Te propongo ${palette}, cerca de los colores que más repites.`;
  if (context.occasion === "clase") return hasLayer ? "Hoy pide un look cómodo y limpio para clase, con una prenda de abrigo fácil." : "Hoy pide un look cómodo y limpio para clase.";
  return outfit.advice?.[0] || "Tu armario tiene potencial para un look más cuidado hoy.";
}

function formatVibeName(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  const labels = {
    "casual clean": "casual limpio",
    "streetwear relaxed": "streetwear relajado",
    "smart casual": "casual elegante",
    "minimal premium": "minimal premium",
    "sport casual": "deportivo casual",
    "night out": "look de noche",
    "university fit": "look de clase",
    "office fit": "look de oficina",
    "rainy day": "día de lluvia",
    "summer basic": "básico de verano",
    "winter layered": "look cómodo para frío"
  };
  return labels[normalized] || normalized;
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

function getFavoritePieceIds() {
  return [...new Set(outfits
    .filter(outfit => outfit.favorite)
    .flatMap(outfit => outfit.pieceIds || [])
    .concat(wardrobe.filter(item => item.favorite).map(item => item.id)))];
}

function getUserStyleProfile() {
  const favoriteOutfits = outfits.filter(outfit => outfit.favorite);
  const usedOutfits = outfits.filter(outfit => outfit.wornAt);
  const signalOutfits = [...favoriteOutfits, ...usedOutfits].slice(0, 18);
  const signalPieces = [
    ...wardrobe.filter(item => item.favorite),
    ...signalOutfits.flatMap(outfit => outfit.pieces || [])
  ];
  const favoriteStyles = topValues(signalPieces.map(item => item.style), 3);
  const favoriteColors = topValues(signalPieces.map(item => item.color), 4);
  const preferredVibes = topValues(signalOutfits.map(outfit => outfit.vibe), 3);
  const habitualOccasion = topValues(signalOutfits.map(outfit => outfit.context?.occasion), 1)[0] || "";
  const polished = signalPieces.filter(item => ["elegante", "formal", "minimalista"].includes(item.style)).length;
  const relaxed = signalPieces.filter(item => ["casual", "streetwear", "deportivo"].includes(item.style)).length;
  const saved = readSavedStyleProfile();

  const profile = {
    favoriteStyles: favoriteStyles.length ? favoriteStyles : saved.favoriteStyles || [],
    favoriteColors: favoriteColors.length ? favoriteColors : saved.favoriteColors || [],
    preferredVibes: preferredVibes.length ? preferredVibes : saved.preferredVibes || [],
    favoriteItemIds: wardrobe.filter(item => item.favorite).map(item => item.id),
    habitualOccasion: habitualOccasion || saved.habitualOccasion || "",
    formality: polished > relaxed ? "pulido" : relaxed > polished ? "relajado" : saved.formality || "equilibrado",
    updatedAt: Date.now()
  };
  writeLocalValue(STYLE_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  return profile;
}

function readSavedStyleProfile() {
  try {
    return JSON.parse(readLocalValue(STYLE_PROFILE_STORAGE_KEY, "{}")) || {};
  } catch {
    return {};
  }
}

function topValues(values, limit) {
  const counts = values
    .map(value => String(value || "").trim().toLowerCase())
    .filter(Boolean)
    .reduce((map, value) => map.set(value, (map.get(value) || 0) + 1), new Map());
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
    .slice(0, limit)
    .map(([value]) => value);
}

function getLastUsedPieceIds() {
  const last = getLastWornOutfit();
  return last?.pieceIds || last?.pieces?.map(piece => piece.id) || [];
}

function getLastWornOutfit() {
  return [...outfits]
    .filter(outfit => outfit.wornAt)
    .sort((a, b) => b.wornAt - a.wornAt)[0];
}

function getForgottenItems(limit = 3) {
  const now = Date.now();
  return [...wardrobe]
    .map(item => ({
      item,
      score: !item.usageCount
        ? 100
        : item.lastUsedAt
          ? Math.min(90, Math.floor((now - item.lastUsedAt) / (1000 * 60 * 60 * 24)))
          : 55 - item.usageCount
    }))
    .filter(entry => entry.score >= 14)
    .sort((a, b) => b.score - a.score || (a.item.usageCount || 0) - (b.item.usageCount || 0))
    .slice(0, limit)
    .map(entry => entry.item);
}

function renderForgottenRack(items) {
  elements.forgottenRack.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.textContent = wardrobe.length
      ? "Aún no hay prendas olvidadas. Cuando uses SACLO más días, detectaremos qué piezas rescatar."
      : "Cuando añadas prendas, SACLO te ayudará a rotarlas mejor.";
    elements.forgottenRack.appendChild(empty);
    return;
  }

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "forgotten-item";
    card.appendChild(createImageElement(item));
    const copy = document.createElement("span");
    copy.innerHTML = `<strong>${escapeHtml(item.name)}</strong><small>${item.type} · ${item.color || "sin color"}</small>`;
    card.appendChild(copy);
    const action = document.createElement("button");
    action.type = "button";
    action.className = "mini-button primary";
    action.textContent = "Crear look";
    action.addEventListener("click", () => generateOutfitWithItem(item.id));
    const view = document.createElement("button");
    view.type = "button";
    view.className = "mini-button ghost";
    view.textContent = "Ver";
    view.addEventListener("click", () => focusWardrobeItem(item));
    const actions = document.createElement("div");
    actions.className = "forgotten-actions";
    actions.append(action, view);
    card.appendChild(actions);
    elements.forgottenRack.appendChild(card);
  });
}

function generateOutfitWithItem(itemId) {
  const anchor = wardrobe.find(item => item.id === itemId);
  if (!anchor) return;
  const context = {
    occasion: elements.occasion.value || getDailyContext().occasion,
    climate: elements.climate.value || getDailyContext().climate,
    temperature: Number(elements.temperature.value) || getDailyContext().temperature,
    style: elements.outfitStyle.value || "cualquiera"
  };
  currentOutfit = recommendOutfit(wardrobe, context, {
    anchorItemId: itemId,
    excludeIds: readLastOutfitIds(),
    avoidPieceIds: getLastUsedPieceIds(),
    recentOutfits: getRecentWeeklyOutfits(),
    favoritePieceIds: getFavoritePieceIds(),
    styleProfile: getUserStyleProfile()
  });
  currentOutfit.context = context;
  currentOutfit.title = createOutfitTitle({ ...context, vibe: currentOutfit.vibe });
  currentOutfit.savedId = "";
  recordEngagementActivity({ generated: true });
  saveLastOutfitIds(getOutfitPieceIds(currentOutfit.pieces));
  renderCurrentOutfit();
  renderHome();
  document.getElementById("outfitBuilder").scrollIntoView({ behavior: "smooth", block: "start" });
  showToast(`Look creado alrededor de ${anchor.name}.`);
}

function focusWardrobeItem(item) {
  filters = { ...filters, search: item.name, type: "todos", style: "todos", season: "todos", color: "todos" };
  saveFilters(filters);
  elements.wardrobeSearch.value = filters.search;
  elements.wardrobeTypeFilter.value = filters.type;
  elements.wardrobeStyleFilter.value = filters.style;
  elements.wardrobeSeasonFilter.value = filters.season;
  elements.wardrobeColorFilter.value = filters.color;
  renderWardrobe();
  document.getElementById("wardrobeSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

function getDailyWardrobeHint(profile = getUserStyleProfile()) {
  const basicCount = wardrobe.filter(item => ["camiseta", "camisa", "vaqueros", "pantalón", "zapatillas"].includes(item.type)).length;
  if (profile.preferredVibes?.length) return `Tu estilo está tirando hacia ${formatVibeName(profile.preferredVibes[0])}. Hoy puedes mantenerlo sin copiar el último look.`;
  if (basicCount >= Math.max(3, Math.round(wardrobe.length * 0.55))) return "Tu armario tiene muchos básicos: úsalo a favor con una paleta más neutra.";
  if (!wardrobe.some(item => ["chaqueta", "cazadora", "abrigo", "sudadera", "jersey"].includes(item.type))) return "Te falta una prenda de abrigo para días fríos.";
  if (!wardrobe.some(item => ["zapatillas", "zapatos", "botas", "sandalias"].includes(item.type))) return "El siguiente salto está claro: añade calzado para cerrar mejor los looks.";
  return "Guarda tus mejores looks para que SACLO aprenda qué te apetece repetir.";
}

function renderWardrobeInsight() {
  if (!wardrobe.length) {
    elements.wardrobeInsight.textContent = "Empieza con 8 prendas. SACLO ya podrá crear tus primeros looks.";
    return;
  }
  if (wardrobe.length < 8) {
    elements.wardrobeInsight.textContent = `${wardrobe.length} prendas añadidas. Sube ${8 - wardrobe.length} más para desbloquear looks más completos.`;
    return;
  }
  const missing = getWardrobeMissingPiece();
  if (missing) {
    elements.wardrobeInsight.textContent = missing;
    return;
  }
  const forgotten = getForgottenItems(1)[0];
  if (forgotten) {
    elements.wardrobeInsight.textContent = `Recomendación rápida: rescata ${forgotten.name}. Lleva tiempo esperando su turno.`;
    return;
  }
  elements.wardrobeInsight.textContent = getDailyWardrobeHint();
}

function getWardrobeMissingPiece() {
  if (!wardrobe.some(item => ["zapatillas", "zapatos", "botas", "sandalias"].includes(item.type))) {
    return `${wardrobe.length} prendas añadidas. Te falta calzado para mejores outfits. Añade tus zapatillas favoritas.`;
  }
  if (!wardrobe.some(item => ["chaqueta", "cazadora", "abrigo", "sudadera", "jersey"].includes(item.type))) {
    return `${wardrobe.length} prendas añadidas. Añade una chaqueta o sudadera para crear looks con más forma.`;
  }
  if (!wardrobe.some(item => ["camiseta", "camisa", "polo", "top"].includes(item.type))) {
    return `${wardrobe.length} prendas añadidas. Sube 3 prendas básicas para mejorar los looks.`;
  }
  return "";
}

function renderAdvice(node, advice = []) {
  node.innerHTML = "";
  advice.slice(0, 3).forEach(item => {
    const pill = document.createElement("span");
    pill.textContent = item;
    node.appendChild(pill);
  });
}

function getResultMicrocopy(outfit) {
  const forgotten = outfit.pieces?.find(item => !item.usageCount || !item.lastUsedAt);
  if (forgotten) return `Rescata ${forgotten.name} dentro de un look fácil de llevar.`;
  if (outfit.palette?.label) return `Look listo con ${outfit.palette.label}.`;
  return "Look generado con prendas reales de tu armario.";
}

function recordEngagementActivity(options = {}) {
  const today = getDayKey();
  engagement = {
    ...engagement,
    activeDays: engagement.activeDays.includes(today) ? engagement.activeDays : [...engagement.activeDays, today].sort(),
    generatedCount: engagement.generatedCount + (options.generated ? 1 : 0),
    lastOpenedAt: Date.now()
  };
  saveEngagement(engagement);
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

function renderConfidenceBadge(confidence, garment = {}) {
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
  const needsReview = value < 0.8 || Boolean(garment.reviewReason);
  elements.singleConfidence.hidden = false;
  const confidencePill = document.createElement("span");
  confidencePill.className = `confidence-pill ${needsReview ? "review" : "strong"}`;
  confidencePill.textContent = `Confianza ${formatConfidence(value)}`;
  elements.singleConfidence.appendChild(confidencePill);

  if (needsReview) {
    const reviewPill = document.createElement("span");
    reviewPill.className = "confidence-pill review";
    reviewPill.textContent = "Revisión recomendada";
    elements.singleConfidence.appendChild(reviewPill);
  }

  const alternatives = getTypeAlternatives(garment);
  if (alternatives.length) {
    const alternativePill = document.createElement("span");
    alternativePill.className = "confidence-pill review";
    alternativePill.textContent = `También podría ser: ${alternatives.join(" / ")}`;
    elements.singleConfidence.appendChild(alternativePill);
  }
}

function buildGarmentReviewMessage(garment) {
  const intro = `${getConfidenceLabel(garment.confidence)}. ${garment.description || "Revisa los datos antes de guardar."}`;
  const needsReview = Number(garment.confidence || 0) < 0.8 || Boolean(garment.reviewReason);
  const review = needsReview
    ? " SACLO no está completamente seguro. Revisa tipo y temporada antes de guardar."
    : " Puedes editar cualquier campo antes de guardar.";
  const alternatives = getTypeAlternatives(garment);
  const alternativeCopy = alternatives.length ? ` También podría ser: ${alternatives.join(" / ")}.` : "";
  return `${intro}${review}${alternativeCopy}`;
}

function getTypeAlternatives(garment) {
  return Array.isArray(garment?.typeAlternatives)
    ? garment.typeAlternatives.filter(Boolean).slice(0, 3)
    : [];
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
  const cacheKey = `${endpoint}:${options.filename || ""}:${hashString(image)}`;
  const cached = readVisionCache(cacheKey);

  if (cached) {
    return cached;
  }

  const inFlight = visionAnalysisInFlight.get(cacheKey);
  if (inFlight) return inFlight;

  const request = (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), VISION_REQUEST_TIMEOUT_MS);
    let response;

    try {
      response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          image,
          filename: options.filename || ""
        })
      });
    } catch {
      throw new Error("El análisis inteligente no está disponible ahora mismo. Inténtalo más tarde.");
    } finally {
      window.clearTimeout(timeout);
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.success === false) {
      throw new Error(getVisionErrorMessage(payload, response.status));
    }

    writeVisionCache(cacheKey, payload);
    return payload;
  })();

  visionAnalysisInFlight.set(cacheKey, request);

  try {
    return await request;
  } finally {
    visionAnalysisInFlight.delete(cacheKey);
  }
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

  let side = MAX_ANALYSIS_SIDE;
  let quality = ANALYSIS_JPEG_QUALITY;
  let optimized = "";

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const ratio = Math.min(1, side / Math.max(width, height));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    optimized = canvas.toDataURL("image/jpeg", quality);
    if (estimateDataUrlSizeMb(optimized) <= MAX_CLIENT_IMAGE_MB) break;

    side = Math.max(720, Math.round(side * 0.82));
    quality = Math.max(0.7, quality - 0.03);
  }

  if (!optimized || estimateDataUrlSizeMb(optimized) > MAX_CLIENT_IMAGE_MB) {
    throw new Error("La imagen sigue siendo demasiado grande para analizar. Prueba con una foto más ligera.");
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
    // SACLO sigue funcionando durante la sesión aunque el navegador bloquee localStorage.
  }
}

function removeLocalValue(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // El valor por defecto online se usará igualmente si el navegador bloquea localStorage.
  }
}

function cleanupLegacyApiConfig() {
  LEGACY_API_STORAGE_KEYS.forEach(removeLocalValue);
  const storedUrl = normalizeApiBaseUrl(readLocalValue(API_BASE_STORAGE_KEY, ""));
  if (!storedUrl || LEGACY_LOCAL_API_URLS.has(storedUrl) || storedUrl !== DEFAULT_API_BASE_URL) {
    removeLocalValue(API_BASE_STORAGE_KEY);
  }
}

function estimateDataUrlSizeMb(dataUrl) {
  const base64 = String(dataUrl).split(",")[1] || "";
  return (base64.length * 3 / 4) / (1024 * 1024);
}

function formatConfidence(confidence) {
  const value = Math.round((Number(confidence) || 0) * 100);
  return `${value}%`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
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

function startAnalysisProgress(node, steps) {
  stopAnalysisProgress();
  let index = 0;
  showStatus(node, steps[index]);
  analysisProgressTimer = window.setInterval(() => {
    index = Math.min(index + 1, steps.length - 1);
    showStatus(node, steps[index]);
    if (index === steps.length - 1) stopAnalysisProgress();
  }, 850);
}

function stopAnalysisProgress() {
  if (!analysisProgressTimer) return;
  window.clearInterval(analysisProgressTimer);
  analysisProgressTimer = 0;
}

function showAnalysisSkeletons(count) {
  clearAnalysisSkeletons();
  const fragment = document.createDocumentFragment();
  Array.from({ length: count }).forEach(() => {
    const card = document.createElement("article");
    card.className = "draft-card skeleton-card";
    card.setAttribute("aria-hidden", "true");
    card.innerHTML = `
      <div class="skeleton-media"></div>
      <div class="draft-fields">
        <div class="skeleton-line wide"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    `;
    fragment.appendChild(card);
  });
  elements.pendingGallery.prepend(fragment);
}

function clearAnalysisSkeletons() {
  elements.pendingGallery.querySelectorAll(".skeleton-card").forEach(card => card.remove());
}

function readVisionCache(key) {
  const cached = visionAnalysisCache.get(key);
  if (!cached) return null;
  visionAnalysisCache.delete(key);
  visionAnalysisCache.set(key, cached);
  return JSON.parse(JSON.stringify(cached));
}

function writeVisionCache(key, payload) {
  visionAnalysisCache.set(key, JSON.parse(JSON.stringify(payload)));
  while (visionAnalysisCache.size > VISION_CACHE_LIMIT) {
    visionAnalysisCache.delete(visionAnalysisCache.keys().next().value);
  }
}

function hashString(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
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
