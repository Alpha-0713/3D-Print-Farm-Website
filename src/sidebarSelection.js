// One mounted highlight is retargeted in navigation-local coordinates.
// Routine data renders must not cancel or restart its current movement.
let controller = null;
const EPSILON = .5;
const geometryKeys = ["x", "y", "width", "height"];
const sameGeometry = (a, b) => a && b && geometryKeys.every((key) => Math.abs(a[key] - b[key]) < EPSILON);

function createController(nav) {
  const marker = nav.querySelector(".sidebar-selection");
  if (!marker) return null;
  const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  let animation = null;
  let placed = null;
  let currentLink = null;

  const measure = (element) => {
    const bounds = nav.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return { x: rect.left - bounds.left + nav.scrollLeft, y: rect.top - bounds.top + nav.scrollTop, width: rect.width, height: rect.height };
  };
  const update = (animate = true) => {
    const selected = nav.querySelector('.sidebar-link[aria-current="page"]');
    if (!selected) return;
    const next = measure(selected);
    if (next.width <= 0 || next.height <= 0) return;
    const linkChanged = selected !== currentLink;
    if (!linkChanged && sameGeometry(placed, next)) return;
    // Read the live in-flight position before cancelling the old animation.
    // Keeping this relative to the nav avoids jumps when the page scrolls.
    const from = placed ? measure(marker) : null;
    animation?.cancel();
    animation = null;
    marker.style.width = `${next.width}px`;
    marker.style.height = `${next.height}px`;
    marker.style.transform = `translate3d(${next.x}px, ${next.y}px, 0)`;
    nav.classList.add("has-sliding-selection");
    placed = next;
    if (linkChanged) {
      currentLink = selected;
      observer?.disconnect();
      observer?.observe(nav);
      observer?.observe(selected);
    }
    if (animate && linkChanged && from && !sameGeometry(from, next) && !motion?.matches && typeof marker.animate === "function") {
      animation = marker.animate([
        { transform: `translate3d(${from.x}px, ${from.y}px, 0) scale(${from.width / next.width}, ${from.height / next.height})` },
        { transform: `translate3d(${next.x}px, ${next.y}px, 0) scale(1, 1)` },
      ], { duration: 380, easing: "cubic-bezier(.22, 1, .36, 1)" });
    }
  };
  const onResize = () => update(false);
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(onResize) : null;
  const onMotionChange = () => {
    if (motion.matches) { animation?.cancel(); animation = null; }
  };
  window.addEventListener("resize", onResize, { passive: true });
  motion?.addEventListener?.("change", onMotionChange);
  return { nav, update, dispose() {
    animation?.cancel();
    observer?.disconnect();
    window.removeEventListener("resize", onResize);
    motion?.removeEventListener?.("change", onMotionChange);
  } };
}

export function syncSidebarSelection(root) {
  const nav = root.querySelector('.staff-sidebar nav[aria-label="Staff navigation"]');
  if (controller?.nav !== nav) {
    controller?.dispose();
    controller = nav ? createController(nav) : null;
  }
  controller?.update();
}
