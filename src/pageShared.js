import { authService } from "./authService.js?v=20";
import { PERMISSIONS, ROLES } from "./authorization.js?v=20";

export const esc = (value = "") => String(value).replace(/[&<>"\x27]/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[char]));

export const shortDate = (value) => new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
}).format(new Date(value));

export const dateTime = (value) => new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
}).format(new Date(value));

export const printNumber = (id) => {
  const suffix = String(id || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-4).padStart(4, "0");
  return `PFN-${esc(suffix)}`;
};

export function logo() {
  return `<a class="brand" href="#/" aria-label="3D Print Farm home">\
  <svg viewBox="0 0 36 36" aria-hidden="true">\
    <path d="M4 6h28v6H4zM4 15h22v6H4zM4 24h16v6H4z" fill="currentColor"/>\
  </svg>\
  <span>3D PRINT FARM</span>\
</a>`;
}

const ACCENTS = [["green", "Green"], ["blue", "Blue"], ["purple", "Purple"], ["teal", "Teal"], ["orange", "Orange"], ["rose", "Rose"]];

export function appearanceControls() {
  const accent = document.documentElement.dataset.accent || "green";
  const current = ACCENTS.find(([id]) => id === accent)?.[1] || "Green";
  const options = ACCENTS.map(([id, name]) =>
    '<button type="button" class="accent-option" data-action="set-accent" data-accent="' + id +
    '" aria-label="' + name + ' accent" aria-pressed="' + (accent === id) + '" title="' + name +
    '"><span class="accent-swatch" aria-hidden="true"></span><span>' + name + '</span></button>'
  ).join("");
  return '<div class="appearance-controls" aria-label="Accent color settings">' +
    '<details class="accent-picker"><summary aria-label="Choose accent color. Current color: ' + current +
    '" title="Choose accent color"><span class="accent-current" aria-hidden="true"></span>' +
    '<span class="accent-picker-label">' + current + '</span><span class="accent-caret" aria-hidden="true">⌄</span></summary>' +
    '<div class="accent-options" role="group" aria-label="Accent colors">' + options + '</div></details></div>';
}

export function roleSwitcher() {
  const identity = authService.getCurrentIdentity();
  const role = ROLES[identity.roleId];
  const choices = authService.getDemoIdentities().map((choice) => {
    const choiceRole = ROLES[choice.roleId];
    const active = choice.id === identity.id;
    return '<button type="button" class="role-switcher-option" data-action="switch-role" data-identity-id="' + esc(choice.id) + '" aria-pressed="' + active + '">' +
      '<span class="role-option-name">' + esc(choice.name) + (active ? '<small>Active</small>' : '') + '</span>' +
      '<span class="role-option-role">' + esc(choiceRole.title) + '</span>' +
      '<span class="role-option-level">Level ' + choiceRole.level + '</span>' +
    '</button>';
  }).join("");
  const roleOptions = Object.values(ROLES)
    .sort((a, b) => a.level - b.level)
    .map((choiceRole) => '<option value="' + esc(choiceRole.id) + '">Level ' + choiceRole.level + ' · ' + esc(choiceRole.title) + '</option>')
    .join("");

  return '<details class="role-switcher">' +
    '<summary aria-label="Active demo identity: ' + esc(identity.name) + ', ' + esc(role.title) + ', Level ' + role.level + '">' +
      '<span class="role-switcher-copy"><strong>' + esc(identity.name) + '</strong><small>' + esc(role.title) + ' · Level ' + role.level + '</small></span>' +
      '<span class="role-switcher-caret" aria-hidden="true">⌄</span>' +
    '</summary>' +
    '<div class="role-switcher-menu"><span class="role-switcher-heading">DEMO IDENTITY</span>' +
      choices +
      '<details class="role-create-account"><summary>＋ Create New Account</summary>' +
        '<form class="role-create-account-form" data-form="create-demo-account">' +
          '<label class="field"><span>Name <b>*</b></span><input name="name" type="text" maxlength="80" autocomplete="off" placeholder="Enter a display name" required /></label>' +
          '<label class="field"><span>Access level <b>*</b></span><select name="roleId" required>' + roleOptions + '</select></label>' +
          '<small class="role-create-account-note">Creates a local demo profile. No sign-in or email is sent.</small>' +
          '<button class="button button-lime button-small" type="submit">Create account</button>' +
        '</form>' +
      '</details>' +
      '<p>Switching updates available pages and actions. This demo does not verify a Google account.</p>' +
    '</div>' +
  '</details>';
}

export function publicHeader(state) {
  const canOpenStaff = authService.can(PERMISSIONS.STAFF_DASHBOARD_VIEW);
  const getStartedActive = location.hash === "#/get-started" ? 'aria-current="page"' : "";

  return `<header class="public-header">\
  <div class="header-inner">\
    ${logo()}\
    <nav class="public-nav" id="public-nav" aria-label="Main navigation">\
      <div class="mobile-only-nav">\
        <a href="#/my-jobs">My Jobs</a>\
        ${canOpenStaff ? '<a href="#/staff">Staff Portal</a>' : ""}\
      </div>\
    </nav>\
    <button class="menu-toggle" type="button" aria-expanded="${state.menuOpen}" aria-controls="public-nav" data-action="menu-toggle" aria-label="${state.menuOpen ? "Close" : "Open"} navigation">${state.menuOpen ? "×" : "☰"}</button>\
    <div class="header-actions">\
      <a class="nav-quiet" href="#/my-jobs">My Jobs</a>\
      ${canOpenStaff ? '<a class="nav-quiet staff-link" href="#/staff">Staff Portal</a>' : ""}\
      ${appearanceControls()}\
      <a class="button button-lime button-small" href="#/get-started" ${getStartedActive}>Get Started <span aria-hidden="true">↗</span></a>\
      ${roleSwitcher()}\
    </div>\
  </div>\
</header>`;
}

export function footer() {
  const canOpenStaff = authService.can(PERMISSIONS.STAFF_DASHBOARD_VIEW);
  return `<footer class="site-footer">\
  <div class="footer-top">\
    ${logo()}\
    <div class="footer-links">\
      <div>\
        <span class="eyebrow">Get started</span>\
        <a href="#/get-started">Submit a print request</a>\
        <a href="#/my-jobs">My Jobs</a>\
        ${canOpenStaff ? '<a href="#/staff">Staff Portal</a>' : ""}\
      </div>\
      <div>\
        <span class="eyebrow">Contact</span>\
        <span>School contact</span>\
        <small>Add approved contact details</small>\
      </div>\
    </div>\
  </div>\
  <div class="footer-bottom">\
    <span>© ${new Date().getFullYear()} 3D Print Farm</span>\
    <span>Files stay in your browser · no emails are sent</span>
    <span>v1.6-beta · Version 1.6 Beta</span>\
  </div>\
</footer>`;
}

export function statusBadge(status) {
  const labels = {
    SUBMITTED: "Submitted",
    IN_PROGRESS: "In progress",
    PRINTING: "Printing",
    COMPLETED: "Completed",
  };

  return `<span class="status status-${status.toLowerCase()}">\
  <i></i>${labels[status] || esc(status)}\
</span>`;
}
