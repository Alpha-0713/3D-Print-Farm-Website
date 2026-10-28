// Native popovers retain their DOM/event ancestry while escaping glass clipping layers.
const controllers = new WeakMap();
const PICKERS = "details.accent-picker, details.role-switcher, details.inbox-picker";
const GAP = 8;

function positionMenu(picker) {
  const menu = picker.querySelector(":scope > .viewport-menu");
  if (!menu) return;
  const topLayer = typeof menu.showPopover === "function";
  if (!picker.open) {
    if (topLayer && menu.matches(":popover-open")) menu.hidePopover();
    menu.classList.remove("is-positioned");
    return;
  }
  if (topLayer) {
    menu.setAttribute("popover", "manual");
    if (!menu.matches(":popover-open")) menu.showPopover();
  }
  const viewport = window.visualViewport;
  // Menu padding resolves the shared panel/shell inset even when its token uses calc().
  const gutter = parseFloat(getComputedStyle(menu).paddingLeft) || GAP;
  const leftEdge = (viewport?.offsetLeft || 0) + gutter;
  const topEdge = (viewport?.offsetTop || 0) + gutter;
  const rightEdge = (viewport?.offsetLeft || 0) + (viewport?.width || document.documentElement.clientWidth) - gutter;
  const bottomEdge = (viewport?.offsetTop || 0) + (viewport?.height || window.innerHeight) - gutter;
  const summary = picker.querySelector(":scope > summary").getBoundingClientRect();

  menu.style.position = "fixed";
  menu.style.margin = "0";
  menu.style.right = "auto";
  menu.style.bottom = "auto";
  menu.style.maxWidth = `${Math.max(0, rightEdge - leftEdge)}px`;
  const left = Math.max(leftEdge, Math.min(summary.right - menu.offsetWidth, rightEdge - menu.offsetWidth));
  const below = Math.max(0, bottomEdge - summary.bottom - GAP);
  const above = Math.max(0, summary.top - GAP - topEdge);
  const openAbove = below < Math.min(200, menu.scrollHeight) && above > below;
  menu.style.maxHeight = `${Math.min(560, openAbove ? above : below, Math.max(0, bottomEdge - topEdge))}px`;
  const top = openAbove ? summary.top - GAP - menu.offsetHeight : summary.bottom + GAP;
  menu.style.left = `${left}px`;
  menu.style.top = `${Math.max(topEdge, Math.min(top, bottomEdge - menu.offsetHeight))}px`;
  menu.style.transformOrigin = `${openAbove ? "bottom" : "top"} right`;
  menu.classList.add("is-positioned");
}

function createController(root) {
  let observed = [];
  let frame = 0;
  const positionMenus = () => root.querySelectorAll(PICKERS).forEach(positionMenu);
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; positionMenus(); });
  };
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
  root.addEventListener("click", (event) => {
    const picker = event.target.closest("summary")?.parentElement;
    if (!picker?.matches(PICKERS)) return;
    if (!picker.open) {
      picker.querySelector(":scope > .viewport-menu")?.classList.remove("is-positioned");
      root.querySelectorAll(PICKERS).forEach((other) => { if (other !== picker) other.open = false; });
    }
    queueMicrotask(positionMenus);
  }, true);
  root.addEventListener("toggle", (event) => {
    if (event.target.matches?.(PICKERS) && event.target.open) {
      root.querySelectorAll(PICKERS).forEach((other) => { if (other !== event.target) other.open = false; });
    }
    positionMenus();
    if (event.target.matches?.(".role-create-account") && event.target.open) {
      // Keep the nested form in the scrollable menu, including with the on-screen keyboard.
      event.target.querySelector("input")?.focus({ preventScroll: true });
      event.target.querySelector("input")?.scrollIntoView({ block: "nearest" });
    }
  }, true);
  document.addEventListener("click", (event) => {
    root.querySelectorAll(PICKERS).forEach((picker) => {
      const inside = event.composedPath ? event.composedPath().includes(picker) : picker.contains(event.target);
      if (picker.open && !inside) picker.open = false;
    });
  });
  root.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const picker = event.target.closest(PICKERS);
    if (!picker?.open) return;
    picker.open = false;
    positionMenus();
    picker.querySelector(":scope > summary").focus();
    event.preventDefault();
  });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("scroll", schedule, { capture: true, passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  window.visualViewport?.addEventListener("scroll", schedule, { passive: true });
  return () => {
    const next = [...root.querySelectorAll(".toolbar-controls > *, .viewport-menu")];
    if (next.length !== observed.length || next.some((element, index) => element !== observed[index])) {
      observer?.disconnect();
      next.forEach((element) => observer?.observe(element));
      observed = next;
    }
    positionMenus();
  };
}

export function syncFloatingControls(root) {
  if (!controllers.has(root)) controllers.set(root, createController(root));
  controllers.get(root)();
}
