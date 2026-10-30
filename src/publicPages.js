import { MATERIALS } from "./data.js?v=2.2&rev=5";
import { esc, footer, publicHeader } from "./pageShared.js?v=2.4&rev=4";
import { PERMISSION_LABELS } from "./authorization.js?v=2.2&rev=5";
import { authService } from "./authService.js?v=2.2&rev=5";
import { partArtwork } from "./visualComponents.js?v=2.2&rev=5";

const safeSwatch = (hexColor) => (/^#[\da-f]{6}$/i.test(hexColor || "") ? hexColor : "#2b2b2b");


const PRINTERS = [
  {
    name: "Bambu Lab A1 mini",
    image: "./assets/printers/a1-mini.jpg",
    darkImage: "./assets/printers/a1-mini-dark.png",
    imageAlt: "Bambu Lab A1 mini desktop 3D printer",
    category: "COMPACT FORMAT",
    description: "A compact option for smaller projects that fit within its usable print area.",
    volume: "180 × 180 × 180",
    colourClass: "printer-colour-single",
    colourTitle: "Single-colour printing only",
    colourDetail: "A1 mini jobs in our print farm are printed in one colour.",
    projects: "Small models, miniatures, prototypes, desk accessories, and small replacement parts.",
    materials: "PLA and PETG are common examples. Available choices depend on current farm stock and job review.",
    size: "The model must fit the usable build area. Geometry, orientation, supports, and clearances affect fit. Larger designs may need splitting; ask staff whether a multi-part job is feasible."
  },
  {
    name: "Bambu Lab H2S",
    image: "./assets/printers/h2s.jpg",
    darkImage: "./assets/printers/h2s-dark.png",
    imageAlt: "Bambu Lab H2S enclosed 3D printer",
    category: "LARGER FORMAT",
    description: "A larger build area for projects that need more room.",
    volume: "340 × 320 × 340",
    colourClass: "printer-colour-multi",
    colourTitle: "Multi-colour printing available",
    colourDetail: "The H2S is the only printer model in our farm available for multi-colour jobs.",
    projects: "Larger prototypes, enclosures, functional components, larger models, and multi-part projects that benefit from extra room.",
    materials: "PLA and PETG are common examples. Bambu Lab lists a broader compatible range; farm choices still depend on stock and job review.",
    size: "The larger build area can fit some bigger parts in one piece. The model must still fit the usable area; geometry, orientation, supports, and clearances affect feasibility."
  }
];

// Pick the saved theme on first render; later toggles update the same image node.
function themeImageSource(light, dark) {
  const source = document.documentElement.dataset.theme === "dark" ? dark : light;
  return 'src="' + esc(source) + '" data-theme-light="' + esc(light) + '" data-theme-dark="' + esc(dark) + '"';
}

function renderPrinterCard(printer) {
  return '<article class="printer-card">'
    + '<div class="printer-card-image"><img ' + themeImageSource(printer.image, printer.darkImage) + ' alt="' + esc(printer.imageAlt) + '" loading="lazy" decoding="async" /></div>'
    + '<div class="printer-card-body">'
    + '<span class="printer-card-kicker">' + esc(printer.category) + ' · FDM</span>'
    + '<h3>' + esc(printer.name) + '</h3>'
    + '<p class="printer-card-description">' + esc(printer.description) + '</p>'
    + '<div class="printer-volume"><div><span>Maximum build volume</span><small>Width × depth × height</small></div><strong>' + esc(printer.volume) + ' <small>mm</small></strong></div>'
    + '<div class="printer-technology"><span>Printing technology</span><strong>Fused Deposition Modeling (FDM)</strong><small>Melted plastic filament is laid down in thin layers.</small></div>'
    + '<div class="printer-colour-status ' + esc(printer.colourClass) + '"><span class="printer-status-dot" aria-hidden="true"></span><div><strong>' + esc(printer.colourTitle) + '</strong><p>' + esc(printer.colourDetail) + '</p></div></div>'
    + '<details class="printer-disclosure"><summary>Explore printer details <span aria-hidden="true">+</span></summary><div class="printer-card-details">'
    + '<div><h4>Typical projects</h4><p>' + esc(printer.projects) + '</p></div>'
    + '<div><h4>Material guidance</h4><p>' + esc(printer.materials) + '</p></div>'
    + '<div class="printer-size-guidance"><h4>Size guidance</h4><p>' + esc(printer.size) + '</p></div>'
    + '</div></details></div></article>';
}

export function homePage(scrollTo = "", state, inventory = []) {
  const stockRows = inventory.length
    ? inventory.map((item) => {
      const status = !item.hexColor
        ? "Color code needs verification"
        : item.available
          ? `Available${item.lowStock ? " · Low stock" : ""}`
          : "Unavailable";
      return `<li class="faq-stock-item">
  <span class="filament-swatch ${item.hexColor ? "" : "is-missing"}" style="--filament-color:${safeSwatch(item.hexColor)}" aria-hidden="true"></span>
  <span><strong>${esc(item.material)} · ${esc(item.color)}</strong><small>${esc(status)}</small></span>
</li>`;
    }).join("")
    : `<li class="faq-stock-empty">No filament colors have been entered in this inventory yet. Ask the school team what they can provide.</li>`;
  const materialGuides = MATERIALS.map((material) => `<li>
  <strong>${esc(material.name)} — ${esc(material.descriptor)}.</strong>
  <span>${esc(material.description)}</span>
  <small>Good for: ${esc(material.uses)}. Printing note: ${esc(material.considerations)}</small>
</li>`).join("");

  return `${publicHeader(state)}
<main class="public-main">
  <section class="hero section-pad" id="main-content" tabindex="-1" aria-labelledby="hero-title">
    <div class="hero-copy">
      <span class="hero-kicker">A little imagination. A new dimension.</span>
      <h1 id="hero-title">Big ideas.<br />Made tangible.</h1>
      <p class="hero-lede">A school 3D-printing service for the things<br class="desktop-break" /> you want to hold, test, and make real.</p>
      <div class="hero-actions">
        <a class="button button-lime" href="#/get-started">Start a print</a>
        <a class="button button-outline" href="#/printers">Explore our printers <span aria-hidden="true">›</span></a>
      </div>
    </div>
    <figure class="hero-visual">
      <img ${themeImageSource("./assets/print-study.png", "./assets/print-study-dark.png")} width="1536" height="1024" alt="A sculptural silver 3D-printed loop beside a small graphite enclosure, showing the texture of printed layers" fetchpriority="high" decoding="async" />
      <figcaption>From expressive forms to everyday solutions. <span>Illustrative print concepts.</span></figcaption>
    </figure>
  </section>
  <section class="use-cases section-pad" aria-labelledby="possibilities-title">
    <div class="section-heading">
      <div><span class="eyebrow">Made for your imagination</span><h2 id="possibilities-title">From “what if”<br />to working part.</h2></div>
      <p>Test an idea. Solve a small problem.<br />See your design from a new angle.</p>
    </div>
    <div class="use-grid">
      <article><div class="use-copy"><span class="use-kicker">Prototype. Test. Repeat.</span><h3>The next big thing.<br />At a smaller scale.</h3><p>Give your first idea a first form.</p></div>${partArtwork("case")}<a class="use-link" href="#/get-started">Make a prototype <span aria-hidden="true">›</span></a></article>
      <article><div class="use-copy"><span class="use-kicker">Designed for the everyday</span><h3>A small part.<br />A better way.</h3><p>Make the tool, mount, or fix you need.</p></div>${partArtwork("bracket")}<a class="use-link" href="#/get-started">Create something useful <span aria-hidden="true">›</span></a></article>
    </div>
  </section>
  <section class="printer-section section-pad" id="printers" aria-labelledby="printers-title">
    <div class="section-heading">
      <div><span class="eyebrow">Meet the print farm</span><h2 id="printers-title">The right tools.<br />Room for your ideas.</h2></div>
      <p>Different printers suit different object sizes and colour needs. Staff review each request and assign a printer based on model fit, available materials, and job requirements.</p>
    </div>
    <div class="printer-grid">${PRINTERS.map(renderPrinterCard).join("")}</div>
    <p class="printer-service-note">Build volumes are nominal maximums, not a printability guarantee. Final feasibility depends on the submitted model, dimensions, orientation, supports, clearances, available material, and staff review.</p>
  </section>
  <section class="faq-section section-pad" id="faq">
    <div class="faq-intro">
      <span class="eyebrow">A few things to know</span>
      <h2>Before you<br />press print.</h2>
      <p>Helpful basics or frequently asked questions for planning a request. Staff will check the final details with you.</p>
    </div>
    <div class="faq-list">
      <details>
        <summary>What filament can I choose?</summary>
        <div class="faq-answer">
          <p>Filament is the thin plastic strand fed into a 3D printer and melted one layer at a time to build an object. This print farm's material list includes PLA, PETG, and TPU. The material and color you can request depend on the current inventory below and in the Get Started form.</p>
          <ul class="faq-material-guides">${materialGuides}</ul>
          <h3>Colors in the current inventory</h3>
          <ul class="faq-stock-list">${stockRows}</ul>
          <p>For a display model or a first prototype, PLA is often a practical starting point. Consider PETG for a tougher functional prototype, and TPU when the part needs to flex. Tell staff how the part will be used; they can help confirm whether a listed filament fits your design. Printer compatibility, design, and current stock still matter.</p>
        </div>
      </details>
      <details>
        <summary>How long does a print take?</summary>
        <p>Timing depends on the model, material, printer availability, and staff review. This demo does not estimate or guarantee a turnaround time; ask the school team for current guidance.</p>
      </details>
      <details>
        <summary>What file formats can I submit?</summary>
        <p>${authService.mode === "demo" ? "This demo previews STL, 3MF, and OBJ models in your browser. On submission, original files are retained locally." : "STL, 3MF, and OBJ previews run in your browser. Original files are uploaded on submission and retained by the server."} HTTPS model links can also be included with a request.</p>
      </details>
      <details>
        <summary>Can I request a specific color?</summary>
        <p>Choose from the material and color combinations currently marked available in the request form. Staff can confirm stock and whether the combination suits your project.</p>
      </details>
      <details>
        <summary>How will I know when my print is ready?</summary>
        <p>${authService.mode === "demo" ? "Staff can share pickup details through the demo workflow. No real email is sent by this application." : "Staff record pickup details with your request. Notification delivery is managed by the connected server."}</p>
      </details>
    </div>
  </section>
  <section class="final-cta section-pad">
    <div><span class="eyebrow">Your next great thing starts with a file.</span><h2>Let’s give your idea<br />some form.</h2><p>Bring a model. Choose a material.<br />We’ll help with the next step.</p><a class="button button-lime" href="#/get-started">Get Started <span aria-hidden="true">›</span></a></div>
  </section>
</main>
${footer()}`;
}


export function accessDeniedPage(state, permission) {
  const role = authService.getCurrentRole();
  const identity = authService.getCurrentIdentity();
  const requestedFeature = PERMISSION_LABELS[permission] || "opening this page";
  return `${publicHeader(state)}
<main class="access-denied page-shell">
  <span class="eyebrow">${authService.mode === "demo" ? "DEMO ACCESS CONTROL" : "ACCESS RESTRICTED"}</span>
  <h1>Access restricted</h1>
  <p><strong>${esc(identity.name)}</strong> · ${esc(role.title)} · Level ${role.level} does not have permission for ${esc(requestedFeature)}.</p>
  <p>${authService.mode === "demo" ? "Choose another demonstration identity from the selector in the header to preview its available pages and actions." : "Your account permissions come from the server. Contact the school administrator if your access is incorrect."}</p>
  <div class="hero-actions"><a class="button button-outline" href="#/">Return to the public website</a><a class="button button-lime" href="#/get-started">Submit a print request</a></div>
</main>
${footer()}`;
}
