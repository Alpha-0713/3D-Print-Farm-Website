// Match navigation contrast to the page surface passing beneath the glass.
let activeController = null;

function parseColor(value) {
  const match = String(value).match(/^rgba?\(([^)]+)\)$/i);
  if (!match) return null;
  const parts = match[1].trim().split(/[\s,/]+/);
  if (parts.length < 3) return null;
  const channels = parts.slice(0, 3).map((part) =>
    part.endsWith("%") ? Number.parseFloat(part) * 2.55 : Number.parseFloat(part));
  const alpha = parts[3] === undefined ? 1
    : Number.parseFloat(parts[3]) / (parts[3].endsWith("%") ? 100 : 1);
  if (![...channels, alpha].every(Number.isFinite)) return null;
  return [...channels.map((channel) => Math.max(0, Math.min(255, channel))), Math.max(0, Math.min(1, alpha))];
}

function backgroundColor(element, view) {
  const channels = [0, 0, 0];
  let alpha = 0;
  for (let current = element; current && alpha < .999; current = current.parentElement) {
    const color = parseColor(view.getComputedStyle(current).backgroundColor);
    if (!color || !color[3]) continue;
    const weight = color[3] * (1 - alpha);
    channels.forEach((_, index) => { channels[index] += color[index] * weight; });
    alpha += weight;
  }
  // The browser's default canvas is white when no element paints a backdrop.
  return channels.map((channel) => channel + 255 * (1 - alpha));
}

function surfaceMode(element, view) {
  const linear = backgroundColor(element, view).map((channel) => {
    const normalized = channel / 255;
    return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
  });
  const luminance = .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
  return luminance > .179 ? "light" : "dark";
}

function surfaceUnderHeader(root, header) {
  const box = header.getBoundingClientRect();
  const midpoint = Math.max(0, box.top + box.height / 2);
  const surfaces = [...root.querySelectorAll(".public-main > section, .site-footer")];
  const underHeader = surfaces.find((surface) => {
    const rect = surface.getBoundingClientRect();
    return rect.height > 0 && rect.top <= midpoint && rect.bottom > midpoint;
  });
  if (underHeader) return underHeader;

  // At the top of a page, the header occupies normal-flow space above main.
  // Read main's first section rather than the device-theme body behind it.
  const main = root.querySelector("main");
  if (main) {
    const rect = main.getBoundingClientRect();
    if (rect.top >= midpoint) return main.querySelector(":scope > section") || main;
    if (rect.bottom > midpoint) return main;
  }
  return root.ownerDocument.body;
}

function createController(root, header) {
  const view = header.ownerDocument.defaultView;
  let frame = 0;
  let disposed = false;
  let observer = null;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (frame) view.cancelAnimationFrame(frame);
    frame = 0;
    view.removeEventListener("scroll", schedule);
    view.removeEventListener("resize", schedule);
    observer?.disconnect();
  };
  const update = () => {
    if (frame) view.cancelAnimationFrame(frame);
    frame = 0;
    if (disposed) return;
    if (!header.isConnected) {
      dispose();
      if (activeController?.header === header) activeController = null;
      return;
    }
    const mode = surfaceMode(surfaceUnderHeader(root, header), view);
    if (header.dataset.surface !== mode) header.dataset.surface = mode;
  };
  function schedule() {
    if (!disposed && !frame) frame = view.requestAnimationFrame(update);
  }

  view.addEventListener("scroll", schedule, { passive: true });
  view.addEventListener("resize", schedule, { passive: true });
  if (typeof view.ResizeObserver === "function") {
    observer = new view.ResizeObserver(schedule);
    observer.observe(root);
  }
  update();
  return { root, header, update, dispose };
}

export function syncHeaderSurface(root) {
  const header = root.querySelector(".public-header");
  if (activeController?.root === root && activeController.header === header) {
    activeController.update();
    return;
  }
  activeController?.dispose();
  activeController = null;
  if (header) activeController = createController(root, header);
}
