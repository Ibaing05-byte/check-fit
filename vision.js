import { COLOR_PALETTE } from "./data.js";

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export async function detectDominantColor(imageDataUrl) {
  const image = await loadImage(imageDataUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const size = 96;
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

    if (brightness > 246) continue;

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

export async function cropGarmentFromClosetImage(imageDataUrl, area) {
  const image = await loadImage(imageDataUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const crop = normalizeCropArea(area, image.naturalWidth || image.width, image.naturalHeight || image.height);

  canvas.width = crop.width;
  canvas.height = crop.height;
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  return canvas.toDataURL("image/jpeg", 0.9);
}

export async function detectGarmentsFromClosetImage(imageDataUrl) {
  void imageDataUrl;
  return [];
}

export function getDominantColorName({ r, g, b }) {
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

function normalizeCropArea(area, imageWidth, imageHeight) {
  const x = clamp(Math.round(area.x), 0, imageWidth - 1);
  const y = clamp(Math.round(area.y), 0, imageHeight - 1);
  const right = clamp(Math.round(area.x + area.width), x + 1, imageWidth);
  const bottom = clamp(Math.round(area.y + area.height), y + 1, imageHeight);
  return {
    x,
    y,
    width: right - x,
    height: bottom - y
  };
}

function nearestPaletteColor(rgb) {
  return Object.entries(COLOR_PALETTE)
    .map(([name, color]) => ({
      name,
      distance: Math.hypot(rgb.r - color[0], rgb.g - color[1], rgb.b - color[2])
    }))
    .sort((a, b) => a.distance - b.distance)[0].name;
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
