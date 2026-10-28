export const SIDEBAR_STORAGE_KEY = "three-d-print-farm-sidebar-collapsed";
let sessionCollapsed = false;
let sessionOnly = false;

export function sidebarCollapsed() {
  if (sessionOnly) return sessionCollapsed;
  try { sessionCollapsed = localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true"; } catch { /* Retain this session's choice when storage is unavailable. */ }
  return sessionCollapsed;
}

export function syncSidebarState(root) {
  const shell = root.querySelector(".staff-app");
  if (!shell) return;
  const collapsed = sidebarCollapsed();
  shell.dataset.sidebarCollapsed = String(collapsed);
  const toggle = shell.querySelector("[data-action=toggle-sidebar]");
  if (!toggle) return;
  toggle.setAttribute("aria-expanded", String(!collapsed));
  toggle.setAttribute("aria-label", `${collapsed ? "Expand" : "Collapse"} sidebar`);
  toggle.title = `${collapsed ? "Expand" : "Collapse"} sidebar`;
}

export function toggleSidebar(root) {
  sessionCollapsed = !sidebarCollapsed();
  try { localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sessionCollapsed)); } catch { sessionOnly = true; }
  syncSidebarState(root);
}
