import { COLORS, SEASONS, STYLES, TYPES } from "./data.js";

export function cleanFileName(fileName) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferType(text) {
  const aliases = {
    camiseta: ["camiseta", "remera", "tshirt", "t-shirt"],
    camisa: ["camisa", "blusa"],
    polo: ["polo"],
    top: ["top"],
    jersey: ["jersey", "sueter", "suéter"],
    sudadera: ["sudadera", "hoodie"],
    chaqueta: ["chaqueta", "blazer"],
    cazadora: ["cazadora", "bomber"],
    abrigo: ["abrigo", "trench", "coat"],
    pantalón: ["pantalon", "pantalón"],
    vaqueros: ["jean", "vaquero", "vaqueros", "denim"],
    shorts: ["short", "shorts", "bermuda"],
    falda: ["falda"],
    vestido: ["vestido"],
    chándal: ["chandal", "chándal", "tracksuit"],
    leggings: ["legging", "leggings"],
    zapatos: ["zapato", "zapatos", "mocasín", "mocasin"],
    zapatillas: ["zapatilla", "zapatillas", "sneaker", "sneakers"],
    botas: ["bota", "botas"],
    sandalias: ["sandalia", "sandalias"],
    gorra: ["gorra", "sombrero", "cap"],
    bolso: ["bolso", "mochila", "bag"],
    bufanda: ["bufanda"],
    accesorio: ["cinturon", "cinturón", "collar", "pendiente"]
  };

  const normalized = normalizeSearchText(text);
  const found = Object.entries(aliases).find(([, words]) => words.some(word => normalized.includes(normalizeSearchText(word))));
  return found ? found[0] : "camiseta";
}

export function inferColor(text) {
  const normalized = normalizeSearchText(text);
  const aliases = {
    marrón: ["marron", "marrón", "brown", "chocolate"],
    negro: ["negro", "negra", "black"],
    blanco: ["blanco", "blanca", "white"],
    gris: ["gris", "grey", "gray"],
    azul: ["azul", "blue", "navy", "marino"],
    rojo: ["rojo", "roja", "red"],
    verde: ["verde", "green"],
    amarillo: ["amarillo", "amarilla", "yellow"],
    beige: ["beige", "cream", "crema"],
    rosa: ["rosa", "pink"],
    morado: ["morado", "morada", "lila", "purple"],
    naranja: ["naranja", "orange"]
  };
  const found = Object.entries(aliases).find(([, words]) => words.some(word => normalized.includes(normalizeSearchText(word))));
  return found?.[0] || COLORS.find(color => normalized.includes(normalizeSearchText(color))) || "";
}

export function inferStyle(text) {
  const normalized = normalizeSearchText(text);
  if (matches(normalized, ["blazer", "vestido", "camisa", "mocasin"])) return "elegante";
  if (matches(normalized, ["gym", "deporte", "running", "leggings", "training"])) return "deportivo";
  if (matches(normalized, ["oversize", "sudadera", "cargo", "street", "hoodie"])) return "streetwear";
  return "casual";
}

export function inferSeason(text) {
  const normalized = normalizeSearchText(text);
  if (matches(normalized, ["abrigo", "lana", "bufanda", "invierno", "frio", "bota"])) return "invierno";
  if (matches(normalized, ["lino", "tirantes", "short", "verano", "sandalia"])) return "verano";
  return "entretiempo";
}

export function filterWardrobe(items, filters) {
  const search = normalizeSearchText(filters.search);
  return items
    .filter(item => {
      const haystack = [item.name, item.color, item.type, item.style, item.season].map(normalizeSearchText).join(" ");
      const matchesSearch = !search || haystack.includes(search);
      const matchesType = filters.type === "todos" || item.type === filters.type;
      const matchesStyle = filters.style === "todos" || item.style === filters.style;
      const matchesSeason = filters.season === "todos" || item.season === filters.season;
      const matchesColor = filters.color === "todos" || normalizeSearchText(item.color) === normalizeSearchText(filters.color);
      return matchesSearch && matchesType && matchesStyle && matchesSeason && matchesColor;
    })
    .sort((a, b) => sortItems(a, b, filters.sort));
}

export function renderSelectOptions(select, options, selectedValue) {
  select.innerHTML = "";
  options.forEach(option => {
    const node = document.createElement("option");
    node.value = option;
    node.textContent = option;
    node.selected = option === selectedValue;
    select.appendChild(node);
  });
}

export function createImageElement(item) {
  const image = document.createElement("img");
  image.src = item.photo || placeholder(item);
  image.alt = item.name;
  return image;
}

export function renderWardrobeCard(item, callbacks) {
  const card = document.createElement("article");
  card.className = "garment-card";
  card.appendChild(createImageElement(item));

  const body = document.createElement("div");
  body.className = "garment-body";

  const top = document.createElement("div");
  top.className = "garment-topline";

  const copy = document.createElement("div");
  copy.className = "garment-copy";
  const title = document.createElement("strong");
  title.textContent = item.name;
  const meta = document.createElement("small");
  meta.textContent = `${item.type} · ${item.color || "sin color"} · ${item.style} · ${item.season}`;
  copy.append(title, meta);

  const usage = document.createElement("span");
  usage.className = "usage-pill";
  usage.textContent = `${item.usageCount || 0} usos`;

  top.append(copy, usage);

  const actions = document.createElement("div");
  actions.className = "card-actions";
  actions.append(
    createCardButton("Editar", () => callbacks.onEdit(item.id)),
    createCardButton("Borrar", () => callbacks.onDelete(item.id), "danger")
  );

  body.append(top, actions);
  card.appendChild(body);
  return card;
}

export function renderDraftCard(item, callbacks) {
  const card = document.createElement("article");
  card.className = "draft-card";
  card.appendChild(createImageElement(item));

  const fields = document.createElement("div");
  fields.className = "draft-fields";

  fields.append(
    createTextField("Nombre", item.name, value => callbacks.onChange(item.id, "name", value)),
    createTextField("Color", item.color, value => callbacks.onChange(item.id, "color", value)),
    createSelectField("Tipo", TYPES, item.type, value => callbacks.onChange(item.id, "type", value)),
    createSelectField("Estilo", STYLES, item.style, value => callbacks.onChange(item.id, "style", value)),
    createSelectField("Temporada", SEASONS, item.season, value => callbacks.onChange(item.id, "season", value))
  );

  const actions = document.createElement("div");
  actions.className = "draft-actions";
  actions.append(
    createCardButton("Guardar prenda", () => callbacks.onConfirm(item.id), "primary"),
    createCardButton("Descartar", () => callbacks.onRemove(item.id), "ghost")
  );

  fields.appendChild(actions);
  card.appendChild(fields);
  return card;
}

export function updateWardrobeSummary(node, visibleCount, totalCount) {
  if (!totalCount) {
    node.textContent = "Tu armario está listo para su primera prenda.";
    return;
  }

  node.textContent = visibleCount === totalCount
    ? `${totalCount} prendas guardadas · listo para generar looks`
    : `${visibleCount} de ${totalCount} prendas visibles con estos filtros`;
}

export function getUniqueColors(items) {
  const colors = [...new Set(items.map(item => item.color).filter(Boolean))];
  return colors.sort((a, b) => a.localeCompare(b, "es"));
}

export function normalizeSearchText(value) {
  return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function createTextField(labelText, value, onInput) {
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.value = value || "";
  input.addEventListener("input", event => onInput(event.target.value));
  label.appendChild(input);
  return label;
}

function createSelectField(labelText, options, selectedValue, onChange) {
  const label = document.createElement("label");
  label.textContent = labelText;
  const select = document.createElement("select");
  renderSelectOptions(select, options, selectedValue);
  select.addEventListener("change", event => onChange(event.target.value));
  label.appendChild(select);
  return label;
}

function createCardButton(text, onClick, variant = "ghost") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `mini-button ${variant}`;
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function sortItems(a, b, sort) {
  if (sort === "name") return a.name.localeCompare(b.name, "es");
  if (sort === "least-used") return (a.usageCount || 0) - (b.usageCount || 0) || b.createdAt - a.createdAt;
  if (sort === "most-used") return (b.usageCount || 0) - (a.usageCount || 0) || b.createdAt - a.createdAt;
  return b.createdAt - a.createdAt;
}

function matches(text, words) {
  return words.some(word => text.includes(word));
}

function placeholder(item) {
  const label = encodeForSvg(item.name || "Check Fit");
  const type = encodeForSvg(item.type || "prenda");
  const color = encodeForSvg(item.color || "sin color");

  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="900" viewBox="0 0 720 900">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#15151a"/>
          <stop offset="1" stop-color="#28242f"/>
        </linearGradient>
      </defs>
      <rect width="720" height="900" fill="url(#bg)"/>
      <circle cx="360" cy="310" r="118" fill="#d7ff68" opacity="0.9"/>
      <path d="M274 270h172l58 88-48 34-30-46v236H294V346l-30 46-48-34 58-88Z" fill="#f6f2e8"/>
      <text x="360" y="700" font-size="42" text-anchor="middle" font-family="Arial" font-weight="700" fill="#f6f2e8">${label}</text>
      <text x="360" y="750" font-size="24" text-anchor="middle" font-family="Arial" fill="#a8a8b3">${type} · ${color}</text>
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
