import { MATERIALS } from "./data.js?v=20";
import { esc, footer, publicHeader } from "./pageShared.js?v=20";
import { PERMISSION_LABELS } from "./authorization.js?v=20";
import { authService } from "./authService.js?v=20";
import { partArtwork } from "./visualComponents.js?v=20";

const safeSwatch = (hexColor) => (/^#[\da-f]{6}$/i.test(hexColor || "") ? hexColor : "#2b2b2b");


const PRINTERS = [
  {
    name: "Bambu Lab A1 mini",
    image: "./assets/printers/a1-mini.jpg",
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

function renderPrinterCard(printer) {
  return '<article class="printer-card">'
    + '<div class="printer-card-image"><img src="' + esc(printer.image) + '" alt="' + esc(printer.imageAlt) + '" loading="lazy" decoding="async" /></div>'
    + '<div class="printer-card-body">'
    + '<span class="printer-card-kicker">' + esc(printer.category) + ' · FDM</span>'
    + '<h3>' + esc(printer.name) + '</h3>'
    + '<p class="printer-card-description">' + esc(printer.description) + '</p>'
    + '<div class="printer-volume"><div><span>Maximum build volume</span><small>Width × depth × height</small></div><strong>' + esc(printer.volume) + ' <small>mm</small></strong></div>'
    + '<div class="printer-technology"><span>Printing technology</span><strong>Fused Deposition Modeling (FDM)</strong><small>Melted plastic filament is laid down in thin layers.</small></div>'
    + '<div class="printer-colour-status ' + esc(printer.colourClass) + '"><span class="printer-status-dot" aria-hidden="true"></span><div><strong>' + esc(printer.colourTitle) + '</strong><p>' + esc(printer.colourDetail) + '</p></div></div>'
    + '<div class="printer-card-details">'
    + '<div><h4>Typical projects</h4><p>' + esc(printer.projects) + '</p></div>'
    + '<div><h4>Material guidance</h4><p>' + esc(printer.materials) + '</p></div>'
    + '<div class="printer-size-guidance"><h4>Size guidance</h4><p>' + esc(printer.size) + '</p></div>'
    + '</div></div></article>';
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
    : `<li class="faq-stock-empty">No filament colors have been entered in this demo inventory yet. Ask the school team what they can provide.</li>`;
  const materialGuides = MATERIALS.map((material) => `<li>
  <strong>${esc(material.name)} — ${esc(material.descriptor)}.</strong>
  <span>${esc(material.description)}</span>
  <small>Good for: ${esc(material.uses)}. Printing note: ${esc(material.considerations)}</small>
</li>`).join("");

  return `${publicHeader(state)}
<main class="public-main">
  <section class="hero section-pad">
    <div class="hero-copy">
      <h1>Ideas don't<br />belong on a <em>screen.</em></h1>
      <p class="hero-lede">A school 3D-printing service for the ideas you want to hold, test, and make real.</p>
      <div class="hero-actions">
        <a class="button button-lime" href="#/get-started">Get Started <span aria-hidden="true">↗</span></a>
      </div>
      <div class="hero-note"><span>01 / MAKE</span><span>FROM DIGITAL FILE TO PHYSICAL PART</span></div>
    </div>
    <div class="hero-visual">
      <div class="visual-top"><span>MODEL STUDY / 004</span><span>3D · STL</span></div>
      ${partArtwork("bracket", "hero-art")}
      <div class="visual-bottom"><span>CAMERA MOUNT / STUDENT SUBMISSION</span><span>01 / 04</span></div>
    </div>
  </section>
  <section class="use-cases section-pad">
    <div class="section-heading">
      <div><span class="eyebrow"><i></i> 01 / BUILT FOR WHAT YOU DO</span><h2>From “what if” to<br />working part.</h2></div>
      <p>Make something to test an idea, solve a small problem, or see a design from a new angle.</p>
    </div>
    <div class="use-grid">
      <article>${partArtwork("case")}<div><h3>Prototype the next thing.</h3><span>MODEL / TEST / ITERATE</span></div></article>
      <article>${partArtwork("bracket")}<div><h3>Make the work work better.</h3><span>TOOL / FIXTURE / EVERYDAY PART</span></div></article>
    </div>
  </section>
  <section class="printer-section section-pad" id="printers" aria-labelledby="printers-title">
    <div class="section-heading">
      <div><span class="eyebrow"><i></i> OUR EQUIPMENT</span><h2 id="printers-title">Our Printers</h2></div>
      <p>Different printers suit different object sizes and colour needs. Staff review each request and assign a printer based on model fit, available materials, and job requirements.</p>
    </div>
    <div class="printer-grid">${PRINTERS.map(renderPrinterCard).join("")}</div>
    <p class="printer-service-note">Build volumes are nominal maximums, not a printability guarantee. Final feasibility depends on the submitted model, dimensions, orientation, supports, clearances, available material, and staff review.</p>
  </section>
  <section class="faq-section section-pad" id="faq">
    <div class="faq-intro">
      <span class="eyebrow"><i></i> 02 / FAQ</span>
      <h2>Before you<br />press print.</h2>
      <p>Helpful basics or frequently asked questions for planning a request. Staff will check the final details with you.</p>
    </div>
    <div class="faq-list">
      <details>
        <summary>What filament can I choose?</summary>
        <div class="faq-answer">
          <p>Filament is the thin plastic strand fed into a 3D printer and melted one layer at a time to build an object. This print farm's demo material list includes PLA, PETG, and TPU. The material and color you can request depend on the current inventory below and in the Get Started form.</p>
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
        <p>This demo previews STL, 3MF, and OBJ models in your browser. Local files are not uploaded. Direct HTTPS model links can be loaded when their host allows browser access.</p>
      </details>
      <details>
        <summary>Can I request a specific color?</summary>
        <p>Choose from the material and color combinations currently marked available in the request form. Staff can confirm stock and whether the combination suits your project.</p>
      </details>
      <details>
        <summary>How will I know when my print is ready?</summary>
        <p>Staff can share pickup details through the demo workflow. No real email is sent by this application.</p>
      </details>
    </div>
  </section>
  <section class="final-cta section-pad">
    <div><span class="eyebrow">YOUR NEXT GREAT THING STARTS WITH A FILE.</span><h2>Let's give your<br />idea some form.</h2></div>
    <div><p>Have a file? Start a request. A member of the school team can review the details.</p><a class="button button-dark" href="#/get-started">Get Started <span>↗</span></a></div>
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
  <span class="eyebrow">DEMO ACCESS CONTROL</span>
  <h1>Access restricted</h1>
  <p><strong>${esc(identity.name)}</strong> · ${esc(role.title)} · Level ${role.level} does not have permission for ${esc(requestedFeature)}.</p>
  <p>Choose another demonstration identity from the selector in the header to preview its available pages and actions.</p>
  <div class="hero-actions"><a class="button button-outline" href="#/">Return to the public website</a><a class="button button-lime" href="#/get-started">Submit a print request</a></div>
</main>
${footer()}`;
}
