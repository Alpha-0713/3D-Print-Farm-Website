import { MATERIALS } from "./data.js?v=12";
import { esc, footer, publicHeader } from "./pageShared.js?v=12";
import { partArtwork } from "./visualComponents.js?v=12";

const safeSwatch = (color) => (/^(#[\da-f]{3,8}|[a-z]{1,24})$/i.test(color) ? color : "#899080");

export function homePage(scrollTo = "", state, inventory = []) {
  const stockRows = inventory.length
    ? inventory.map((item) => {
      const status = !item.available ? "Unavailable" : Number(item.quantity) <= 0 ? "Out of stock" : Number(item.quantity) <= Number(item.lowStockThreshold || 0) ? "Low stock" : "Available";
      const isSelectable = item.available && Number(item.quantity) > 0;
      return `<li class="faq-stock-item">
  <span class="filament-swatch" style="--filament-color:${safeSwatch(item.color)}" aria-hidden="true"></span>
  <span><strong>${esc(item.material)} · ${esc(item.color)}</strong><small>${esc(status)} · ${Number(item.quantity)} ${esc(item.unit)}${isSelectable ? " in inventory" : ""}</small></span>
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
