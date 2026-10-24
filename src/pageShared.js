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

export const moneylessId = (id) => esc(id);

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

export function publicHeader(state) {
  const getStartedActive = location.hash === "#/get-started" ? 'aria-current="page"' : "";

  return `<header class="public-header">\
  <div class="header-inner">\
    ${logo()}\
    <nav class="public-nav" id="public-nav" aria-label="Main navigation">\
      <div class="mobile-only-nav">\
        <a href="#/my-jobs">My Jobs</a>\
        <a href="#/staff">Staff Portal</a>\
      </div>\
    </nav>\
    <div class="header-actions">\
      <a class="nav-quiet" href="#/my-jobs">My Jobs</a>\
      <a class="nav-quiet staff-link" href="#/staff">Staff Portal</a>\
      ${appearanceControls()}\
      <a class="button button-lime button-small" href="#/get-started" ${getStartedActive}>Get Started <span aria-hidden="true">↗</span></a>\
    </div>\
    <button class="menu-toggle" type="button" aria-expanded="${state.menuOpen}" aria-controls="public-nav" data-action="menu-toggle" aria-label="${state.menuOpen ? "Close" : "Open"} navigation">${state.menuOpen ? "×" : "☰"}</button>\
  </div>\
</header>`;
}

export function footer() {
  return `<footer class="site-footer">\
  <div class="footer-top">\
    ${logo()}\
    <div class="footer-links">\
      <div>\
        <span class="eyebrow">Get started</span>\
        <a href="#/get-started">Submit a print request</a>\
        <a href="#/my-jobs">My Jobs</a>\
        <a href="#/staff">Staff Portal</a>\
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
    <span>v1.3.1b · Version 1.3.1 Beta</span>\
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
