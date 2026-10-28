// Keep the glass navigation connected to the document during staff-page updates.
// Replacing the sidebar would discard its animation and recreate Safari's glass layer.
export function commitPage(root, html) {
  const template = root.ownerDocument.createElement("template");
  template.innerHTML = html;
  const current = root.querySelector(":scope > .staff-app");
  const incoming = template.content.querySelector(".staff-app");
  const sameIdentity = current && incoming
    && current.dataset.identityId === incoming.dataset.identityId
    && current.dataset.roleId === incoming.dataset.roleId;
  const oldLinks = current ? [...current.querySelectorAll(".staff-sidebar .sidebar-link")] : [];
  const newLinks = incoming ? [...incoming.querySelectorAll(".staff-sidebar .sidebar-link")] : [];
  const sameNavigation = oldLinks.length === newLinks.length
    && oldLinks.every((link, index) => link.getAttribute("href") === newLinks[index].getAttribute("href"));

  if (!sameIdentity || !sameNavigation) {
    root.replaceChildren(template.content);
    return false;
  }

  const oldActive = oldLinks.find((link) => link.hasAttribute("aria-current"))?.getAttribute("href");
  const newActive = newLinks.find((link) => link.hasAttribute("aria-current"))?.getAttribute("href");
  oldLinks.forEach((link, index) => {
    const active = newLinks[index].getAttribute("aria-current");
    link.classList.toggle("selected", Boolean(active));
    if (active) link.setAttribute("aria-current", active);
    else link.removeAttribute("aria-current");
  });
  if (oldActive !== newActive) {
    current.querySelectorAll(".staff-sidebar details[open], .staff-toolbar details[open]").forEach((details) => details.removeAttribute("open"));
  }
  // Refresh profile choices only when accounts change; keep the controls and nav steady otherwise.
  const oldProfile = current.querySelector(".toolbar-controls .role-switcher");
  const newProfile = incoming.querySelector(".toolbar-controls .role-switcher");
  if (oldProfile && newProfile && oldProfile.dataset.profileSignature !== newProfile.dataset.profileSignature) {
    oldProfile.replaceWith(newProfile);
  }
  // The shell, sidebar, active links, highlight, and unchanged controls stay mounted.
  for (const selector of [".staff-content", ".staff-main > .local-data-controls"]) {
    const previous = current.querySelector(selector);
    const next = incoming.querySelector(selector);
    if (previous && next) previous.replaceChildren(...next.childNodes);
  }
  return true;
}
