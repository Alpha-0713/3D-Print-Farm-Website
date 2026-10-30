import { MATERIALS } from "./data.js?v=2.2&rev=5";
import { esc } from "./pageShared.js?v=2.2&rev=5";

export const hasVerifiedColour = (item) => /^#[\da-f]{6}$/i.test(item?.hexColor || "");
export const canSelectFilament = (item) => item?.available === true && hasVerifiedColour(item);

function colourOrder(item) {
  if (!hasVerifiedColour(item)) return [2, 0, 0, 0];
  const [r, g, b] = [1, 3, 5].map((offset) => parseInt(item.hexColor.slice(offset, offset + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const lightness = (max + min) / 2;
  // Keep whites, creams and greys together, then arrange colours around the wheel.
  if (delta <= .14) return [0, 0, -lightness, 0];
  let hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  return [1, Math.floor(((hue + 15) % 360) / 30), -lightness, hue];
}

export function groupFilaments(items) {
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.material)) groups.set(item.material, []);
    groups.get(item.material).push(item);
  }
  const materialOrder = MATERIALS.map((item) => item.id);
  const rank = (material) => materialOrder.includes(material) ? materialOrder.indexOf(material) : materialOrder.length;
  return [...groups].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b)).map(([material, filaments]) => ({
    material,
    description: MATERIALS.find((item) => item.id === material)?.descriptor || "Filament colours",
    filaments: [...filaments].sort((a, b) => {
      const left = colourOrder(a), right = colourOrder(b);
      for (let index = 0; index < left.length; index++) if (left[index] !== right[index]) return left[index] - right[index];
      return a.color.localeCompare(b.color) || a.id.localeCompare(b.id);
    }),
  }));
}

export function setFilamentSelection(wizard, item) {
  if (!canSelectFilament(item)) throw new Error("That filament is unavailable or its colour needs verification. Choose another colour.");
  wizard.selectionError = "";
  wizard.inventoryId = item.id;
  wizard.material = item.material;
  wizard.color = item.color;
}

export function filamentSelectionDetails(item) {
  if (!canSelectFilament(item)) return `<p class="palette-selection-empty">Choose a colour above to see its details.</p>`;
  return `<div class="material-choice-detail">
    <span class="filament-swatch" style="--filament-color:${item.hexColor}" aria-hidden="true"></span>
    <div class="material-choice-copy"><span class="eyebrow">SELECTED FILAMENT</span><strong>${esc(item.material)} · ${esc(item.color)}</strong>
    <div class="request-filament-status"><span class="filament-status-label is-available">Available for new requests</span>${item.lowStock ? '<span class="filament-status-label is-low-stock">Low stock · still available to request</span>' : ""}</div>
    <div class="material-values"><div class="material-value"><span>HEX</span><code>${esc(item.hexColor)}</code></div><div class="material-value"><span>RGB</span><code>${esc(item.rgbColor)}</code></div></div></div>
  </div>`;
}

export function applyFilamentSelection(root, wizard, item) {
  setFilamentSelection(wizard, item);
  const detail = root.querySelector("[data-filament-detail]");
  if (detail) detail.innerHTML = filamentSelectionDetails(item);
  const material = root.querySelector("[data-summary-material]");
  const colour = root.querySelector("[data-summary-color]");
  if (material) material.textContent = item.material;
  if (colour) colour.textContent = item.color;
}

export function filamentPalette(items, selectedId = "") {
  if (!items.length) return `<div class="empty-inventory-note"><strong>No filament colours listed yet.</strong><p>Ask Print Farm staff to add the available materials and colours.</p></div>`;
  return `<div class="filament-palette" aria-label="Filament colour palette">
    <p class="palette-help">Choose one colour. Unavailable colours are shown for reference.</p>
    ${groupFilaments(items).map((group) => `<fieldset class="palette-material">
      <legend><strong>${esc(group.material)}</strong><span>${group.filaments.length} colour${group.filaments.length === 1 ? "" : "s"}</span></legend>
      <p class="palette-material-description">${esc(group.description)}</p>
      <div class="palette-grid">${group.filaments.map((item) => {
        const selectable = canSelectFilament(item);
        const status = !hasVerifiedColour(item) ? "Colour not verified" : !item.available ? "Unavailable" : item.lowStock ? "Low stock" : "Available";
        return `<label class="palette-choice ${selectable ? "" : "is-unavailable"} ${hasVerifiedColour(item) ? "" : "is-unverified"}" title="${esc(item.color)} · ${esc(item.hexColor || "HEX not verified")} · ${status}">
          <input class="palette-radio" type="radio" name="inventoryId" data-field="inventoryId" value="${esc(item.id)}" aria-label="${esc(item.material)} · ${esc(item.color)} · ${status}" ${selectable ? "" : "disabled"} ${selectable && item.id === selectedId ? "checked" : ""} />
          <span class="palette-swatch" style="--filament-color:${hasVerifiedColour(item) ? item.hexColor : "transparent"}" aria-hidden="true"><span class="palette-check">✓</span></span>
          <span class="palette-colour-name">${esc(item.color)}</span>
          <small class="palette-availability ${item.lowStock && selectable ? "is-low-stock" : ""}">${status === "Available" ? "" : status}</small>
        </label>`;
      }).join("")}</div>
    </fieldset>`).join("")}
  </div>`;
}
