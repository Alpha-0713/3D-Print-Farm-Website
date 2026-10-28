import { JOB_LABELS } from "./jobWorkflow.js?v=2.2&rev=5";
import { authService } from "./authService.js?v=2.2&rev=5";
import { PERMISSIONS, ROLES } from "./authorization.js?v=2.2&rev=5";

export const esc = (value = "") => String(value).replace(/[&<>"\x27]/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[char]));

const validDate = (value) => value && Number.isFinite(Date.parse(value));
export const shortDate = (value) => validDate(value) ? new Intl.DateTimeFormat("en", {
  month: "short", day: "numeric", year: "numeric",
}).format(new Date(value)) : "Date not recorded";

export const dateTime = (value) => validDate(value) ? new Intl.DateTimeFormat("en", {
  month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
}).format(new Date(value)) : "Time not recorded";

export function logo() {
  return `<a class="brand" href="#/" aria-label="3D Print Farm home">\
  <svg viewBox="0 0 36 36" aria-hidden="true">\
    <path d="M4 6h28v6H4zM4 15h22v6H4zM4 24h16v6H4z" fill="currentColor"/>\
  </svg>\
  <span>3D PRINT FARM</span>\
</a>`;
}

export function appearanceControls() {
  const theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
  const themes = [["light", "Light"], ["dark", "Dark"]].map(([id, name]) =>
    `<button type="button" class="theme-choice" data-action="set-theme" data-theme="${id}" aria-pressed="${theme === id}">${name}</button>`
  ).join("");
  return `<div class="appearance-controls" aria-label="Appearance settings">
    <details class="accent-picker">
      <summary aria-label="Appearance settings. ${theme === "light" ? "Light" : "Dark"} theme" title="Appearance settings">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none"/></svg>
      </summary>
      <div class="accent-options appearance-panel viewport-menu" role="group" aria-label="Appearance settings">
        <section class="appearance-section" aria-labelledby="appearance-theme-heading">
          <div class="appearance-section-heading" id="appearance-theme-heading">Color theme</div>
          <div class="theme-options" role="group" aria-label="Color theme">${themes}</div>
          <small class="appearance-system-note" id="appearance-theme-note">Following your device preference.</small>
          <button type="button" class="appearance-system-reset" data-action="use-system-theme" hidden>Use device preference</button>
        </section>
      </div>
    </details>
  </div>`;
}

export function inboxControl() {
  return `<details class="inbox-picker"><summary aria-label="Inbox" title="Inbox"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 4.5h15l2 10v5h-19v-5z"/><path d="M3 14.5h5l1.5 3h5l1.5-3h5"/></svg><span class="inbox-dot" aria-hidden="true" hidden></span></summary><div class="inbox-panel viewport-menu" role="region" aria-label="Personal inbox"><div data-inbox-content></div></div></details>`;
}

export function toolbarControls() {
  return `<div class="toolbar-controls" aria-label="Account and appearance controls">${appearanceControls()}${roleSwitcher()}${authService.can(PERMISSIONS.STAFF_DASHBOARD_VIEW) ? inboxControl() : ""}</div>`;
}

export function roleSwitcher() {
  const identity = authService.getCurrentIdentity();
  const identities = authService.getDemoIdentities();
  const signature = JSON.stringify(identities.map(({ id, name, roleId }) => [id, name, roleId]));
  const words = identity.name.trim().split(/\s+/);
  const first = Array.from(words[0] || "?");
  const initials = (first[0] + (words.length > 1 ? Array.from(words.at(-1))[0] : first[1] || "")).toLocaleUpperCase();
  const choices = identities.map((choice) => {
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

  return '<details class="role-switcher" data-profile-signature="' + esc(signature) + '">' +
    '<summary aria-label="Active demo identity: ' + esc(identity.name) + '" title="Switch profile · ' + esc(identity.name) + '">' +
      '<span class="role-switcher-copy"><strong class="role-trigger-initials" aria-hidden="true">' + esc(initials) + '</strong></span>' +
    '</summary>' +
    '<div class="role-switcher-menu viewport-menu"><span class="role-switcher-heading">DEMO IDENTITY</span>' +
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
        <a class="button button-lime button-small" href="#/get-started">Get Started ↗</a>\
        <a href="#/my-jobs">My Print Jobs</a>\
        ${canOpenStaff ? '<a href="#/staff">Staff Portal</a>' : ""}\
      </div>\
    </nav>\
    <button class="menu-toggle" type="button" aria-expanded="${state.menuOpen}" aria-controls="public-nav" data-action="menu-toggle" aria-label="${state.menuOpen ? "Close" : "Open"} navigation"><span class="menu-toggle-icon" aria-hidden="true"><i class="menu-toggle-line menu-toggle-line-top"></i><i class="menu-toggle-line menu-toggle-line-middle"></i><i class="menu-toggle-line menu-toggle-line-bottom"></i></span></button>\
    <div class="header-actions">\
      <a class="nav-quiet" href="#/my-jobs">My Print Jobs</a>\
      ${canOpenStaff ? '<a class="nav-quiet staff-link" href="#/staff">Staff Portal</a>' : ""}\
      <a class="button button-lime button-small" href="#/get-started" ${getStartedActive}>Get Started <span aria-hidden="true">↗</span></a>\
      ${toolbarControls()}\
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
        <a href="#/my-jobs">My Print Jobs</a>\
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
    <span>v2.2 · Print Farm</span>\
  </div>\
  ${localDataControls()}\
</footer>`;
}

export function localDataControls() {
  return `<div class="local-data-controls"><p>Reset this website’s saved data, demo accounts, and appearance settings in this browser.</p><button type="button" data-action="reset-local-data">Reset Local Data</button></div>`;
}

export function statusBadge(status) {
  return `<span class="status status-${esc(String(status).toLowerCase())}">${JOB_LABELS[status] || esc(status)}</span>`;
}
