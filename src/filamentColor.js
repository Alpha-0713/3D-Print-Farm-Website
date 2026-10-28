// Keep invalid characters visible so validation never silently changes a colour.
export function normalizeHexInput(value) {
  return "#" + String(value || "").replace(/#/g, "").trim().toUpperCase();
}
