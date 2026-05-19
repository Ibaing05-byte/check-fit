export const STORAGE_KEYS = {
  wardrobe: "wardrobeWithPhotos",
  drafts: "checkFitPendingItems",
  filters: "checkFitWardrobeFilters",
  outfits: "checkFitSavedOutfits",
  lastOutfit: "checkFitLastOutfit",
  engagement: "checkFitEngagement"
};

export const TYPES = [
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

export const STYLES = ["casual", "elegante", "deportivo", "streetwear", "formal", "minimalista", "otro"];
export const SEASONS = ["verano", "invierno", "entretiempo", "todo el año"];
export const COLORS = ["blanco", "negro", "gris", "azul", "rojo", "verde", "amarillo", "beige", "marrón", "rosa", "morado", "naranja", "multicolor", "otro"];
export const OCCASIONS = ["clase", "trabajo", "cita", "fiesta", "paseo", "viaje", "evento formal", "plan casual", "deporte"];
export const CLIMATES = ["soleado", "templado", "lluvia", "frío", "calor", "nublado", "viento"];

export const TYPE_GROUPS = {
  top: ["camiseta", "camisa", "polo", "top", "jersey", "sudadera"],
  layer: ["jersey", "sudadera", "chaqueta", "cazadora", "abrigo"],
  bottom: ["pantalón", "vaqueros", "shorts", "falda", "vestido", "chándal", "leggings"],
  shoes: ["zapatos", "zapatillas", "botas", "sandalias"],
  accessory: ["gorra", "bolso", "bufanda", "accesorio"]
};

export const GROUP_LABELS = {
  top: "parte de arriba",
  layer: "prenda de abrigo",
  bottom: "parte de abajo",
  shoes: "calzado",
  accessory: "accesorio"
};

export const STYLE_TARGETS = {
  trabajo: ["elegante", "minimalista", "casual"],
  cita: ["elegante", "casual"],
  fiesta: ["elegante", "streetwear"],
  clase: ["casual", "streetwear"],
  paseo: ["casual", "deportivo"],
  viaje: ["casual", "deportivo"],
  "evento formal": ["formal", "elegante", "minimalista"],
  "plan casual": ["casual", "streetwear"],
  deporte: ["deportivo"]
};

export const COLOR_PALETTE = {
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

export const COMPATIBLE_COLORS = [
  ["azul", "blanco"],
  ["azul", "gris"],
  ["azul", "beige"],
  ["azul", "marrón"],
  ["verde", "beige"],
  ["verde", "marrón"],
  ["verde", "blanco"],
  ["rojo", "negro"],
  ["rojo", "azul"],
  ["rosa", "gris"],
  ["rosa", "blanco"],
  ["amarillo", "azul"],
  ["morado", "blanco"],
  ["morado", "gris"],
  ["naranja", "azul"],
  ["naranja", "beige"]
];

export const CLASHING_COLORS = [
  ["rojo", "rosa"],
  ["rojo", "naranja"],
  ["amarillo", "rosa"],
  ["amarillo", "naranja"],
  ["verde", "rojo"],
  ["morado", "naranja"],
  ["morado", "amarillo"]
];

export const DEFAULT_WARDROBE = [
  { id: 1, name: "Camiseta blanca", type: "camiseta", color: "blanco", style: "casual", season: "entretiempo", photo: "", usageCount: 0 },
  { id: 2, name: "Vaqueros azules", type: "vaqueros", color: "azul", style: "casual", season: "entretiempo", photo: "", usageCount: 0 },
  { id: 3, name: "Sudadera gris", type: "sudadera", color: "gris", style: "streetwear", season: "invierno", photo: "", usageCount: 0 },
  { id: 4, name: "Zapatillas blancas", type: "zapatillas", color: "blanco", style: "casual", season: "entretiempo", photo: "", usageCount: 0 }
];
