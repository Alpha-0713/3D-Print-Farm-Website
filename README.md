# 3D Print Farm Website — v2.3

**Version 2.3** · A responsive, frontend-only demonstration of the school's print request workflow, role-based access controls, staff hours management, filament availability, and print farm equipment.

![version](https://img.shields.io/badge/version-v2.3-blue)
![release](https://img.shields.io/badge/status-beta-orange)
![stack](https://img.shields.io/badge/stack-vanilla%20JavaScript-f7df1e?logo=javascript&logoColor=black)
![storage](https://img.shields.io/badge/storage-browser%20localStorage-lightgrey)

> **Beta prototype:** The identities and access controls are for demonstration only. Do not use this application with real student information, production requests, secured staff work, or authoritative hour or inventory records.

## Release summary

v2.3 adds a click-controlled collapsible sidebar across the Staff Dashboard. The sidebar remains flush with the top and left page edges, retains the same navigation icons and glass highlight, and never expands or floats on hover. The compact choice persists between pages, identities, and reloads. On phones the existing two-column navigation keeps its layout and shows icons when collapsed. Width transitions use 280ms, respect reduced motion, and retain fixed navigation row centers.

Job details now reuse the existing interactive Three.js viewer for original STL, OBJ, and 3MF files. Select a file to rotate, pan, zoom, or reset the view. Each original can be downloaded individually with its exact bytes, name, and extension. New submissions retain the actual file locally in the `three-d-print-farm-model-files` IndexedDB database; job metadata retains attachment IDs in the existing localStorage record. Original files are never uploaded. Existing MakerWorld preview cards and model-link submissions are preserved; link-only requests have no original file bytes to download. Multiple attachments are supported by the service and details view; the existing public wizard continues to select one model per request.

Existing seeded and older jobs only contain filenames, so their details explicitly report that the original is unavailable and disable preview/download. Missing and unsupported files receive clear messages; an invalid model can still be downloaded unchanged. If browser file storage is unavailable or full, submission fails with an explanation instead of silently saving a request without its original. Files are local to the current browser and origin, may be removed by browser data clearing or eviction, and are not shared across devices. Reset Local Data clears this file store and the saved sidebar choice as well as the existing demo records.

Recent Jobs table rows and My Active Jobs cards use the existing `--surface-main` token in both themes, while existing separators and hover states remain intact. The version directory stays v2.3, and no backend, printer control, real email, or production authentication is added.


v2.2 Beta retains the existing vanilla JavaScript app, design, identities, storage key, materials, hours, and equipment pages. Print requests now require **two explicit Level 4 decisions**: approval before staff can see or claim the request, and authorization after preparation before printing starts. The shared service validates both gates, assignment, current state, and repeat decisions. Staff and submitters use the same recorded-event Print Progress; the redundant Job History section has been removed while its saved events remain available.

The workflow is **Pending supervisor review → Approved / available → Claimed / preparation → Awaiting print authorization → Authorized → Printing → Ready for pickup → Collected**. Submission is saved before the pending review stage. Level 4 can reject an initial request or return a prepared print for revision with a required reason. Each approval saves the supervisor’s account ID, name, and timestamp. Reassignment returns pending or authorized preparation to the assigned member for a new authorization attempt. Every attempt has its own stable ID, so an earlier notification cannot authorize a newer attempt.

The Staff Dashboard now has a compact **Print Farm supervisors** strip at the top of every staff page. Each Level 4 can change only their own presence; Levels 2–3 see the individual supervisors’ read-only statuses. Presence has no effect on either approval gate. The **Inbox** tray at the top right contains the selected account’s own notifications, an unread dot, notification details and guarded job/hours actions. New events show dismissible popups. Inbox, notification details, Appearance, and profile controls share one-menu behavior, keyboard dismissal, and viewport-aware positioning.

Existing unclaimed `SUBMITTED` jobs now require initial review. Existing work already in progress retains its assignment and progress and explicitly labels the earlier approval as unrecorded. It still requires final authorization before starting to print. Printing, ready, collected, cancelled, and rejected work retains its current progress. Missing event timestamps remain unrecorded; the app does not invent a supervisor or completion time. My Print Jobs keeps stable account ownership and legacy email compatibility, and each row is now one keyboard-accessible, fully clickable link.

Staff enter the actual collection location and optional instructions when marking a print ready. Existing per-job locations are retained. Ready jobs also offer **Edit pickup details**, including when an older record has no location. No new default collection location is invented. Submitters see the collection location, instructions, and collection state but cannot change them or mark a print as collected.

Visible print numbers and their copy action have been removed; internal IDs remain unchanged for storage and routing. Filament entry starts with `#`, normalizes pasted duplicate hashes, validates all six hexadecimal characters, and retains RGB and swatch previews. Levels 3–4 can edit an existing colour from the inventory's **Edit colour** link; Level 2 keeps read-only details. Colour edits preserve availability and Low Stock.

The visual refinement now uses near-black navigation, charcoal content panels, fine neutral borders, and a quiet raised active state, following the supplied monochromatic dashboard reference. Public headers, the staff sidebar, mobile navigation, and the staff toolbar sit flush against their page edges with square outer corners. Liquid Glass blur, shared surface transparency, the 0–80% transparency control, both themes, real filament swatches, and muted status colours remain available. Monochrome is the default and an explicit Appearance choice; all six earlier accent choices and saved preferences remain supported. Active staff navigation stays neutral for every accent choice.

The shared design scale uses native system typography with Apple system fonts first, 18px panels, 12px controls, 8px compact elements, circular controls, and common text, weight, leading, spacing, and motion tokens. The sidebar's four inline stroke icons represent Overview, printing, materials, and hours without an added dependency. Expanded navigation places each 20px icon box approximately 21.33px from the sidebar's left edge, followed by a 10px label gap. The existing two-column mobile navigation adapts the same icon/label relationship to each grid cell. Staff headings, forms, tables, cards, and content insets share the same scale; the Hours forms now reflow before they can overflow beside the tablet sidebar.

The staff sidebar and single neutral glass highlight stay mounted between staff pages. Its existing 380ms slide, rapid retargeting, reduced-motion handling, shared backdrop, profile initials, viewport-safe dropdowns, and keyboard dismissal are preserved. Hover effects no longer lift or enlarge content cards. Equipment artwork, request ownership, approvals, hours accounting, inbox behavior, collection details, and reset behavior are unchanged.

The Glass Transparency setting now controls the shared fills throughout the interface: public navigation, mobile menus, staff sidebars, appearance/identity menus, panels, form backgrounds, notifications, and dialogs. Its range is **0–80%** with the existing **16%** default. Earlier saved values remain valid. Text, artwork, filament swatches, and primary action colours retain their contrast and true colour. Device preferences for reduced transparency or higher contrast request solid surfaces, with an explanation in the appearance control.

Print settings use a clickable **filament colour palette**, with separate sections for each material type. Within a material, neutral colours sort from light to dark, followed by warm-to-cool colour groups. All saved filaments are listed: unavailable and unverified colours are disabled, and available Low Stock entries remain selectable. One native radio group spans every material, supporting keyboard selection and a clear selection ring. Selecting a swatch updates the chosen material, colour, HEX/RGB detail, and request summary in place without resetting scroll, focus, or the model preview. Existing saved filament IDs and legacy material/colour draft selections remain compatible. No replacement colour is silently chosen if a selection becomes unavailable, and availability is checked again before advancing and saving.

**Reset Local Data**, at the bottom of public and staff pages, immediately removes the eight explicit application localStorage keys: demo data, draft, custom accounts, selected identity, accent, theme, glass transparency, and sidebar state, plus original model files in IndexedDB. It cancels pending simulated notifications and reloads the home page with the default identity, seeded jobs, empty inventory/hour records, default accent/transparency, and the device theme. The inbox and supervisor presence are reset with the shared data record. It does not clear unrelated storage or contact a backend. There is no confirmation step.

v1.7 Beta adds an **Our Printers** section to the public homepage, immediately above the FAQ. It describes the Bambu Lab A1 mini and Bambu Lab H2S, including their build volumes, FDM technology, example projects, and material and size guidance. The farm's A1 mini jobs are single-colour only; the H2S is the only farm model available for multi-colour jobs. Printer assignment and printability remain subject to job review and available materials.

v1.6 Beta redesigns **Materials** as a filament availability list. Level 3 and Level 4 staff can set **Low Stock** and **Available** independently, add a filament with its verified HEX color, and delete an entry after confirmation. The app derives the RGB value from HEX. Levels 1–4 see the selected filament's swatch, material, color name, HEX, RGB, and status during request submission; low-stock filaments remain selectable when Available is on.

The Staff Dashboard also includes the v1.5 hours management: Level 2 and Level 3 staff use **Hours** to view their own balance and history and submit adjustment requests. Level 4 staff use one combined **Hours** page to manage Level 2 and Level 3 balances, review requests, and view hours and student contribution activity together. Level 4 staff do not have a personal hours balance.

Also enjoy the new Overview page :)

## Quick start

Requires **Python 3**. There is no package installation or build step.

~~~sh
cd 3D-Print-Farm-Website
python3 -m http.server 8000
~~~

Open http://localhost:8000 and stop the server with Control-C. An internet connection is needed for the pinned Three.js and fflate modules loaded from jsDelivr.

## Demonstration identities and permissions

Open **Demo identity** in the header to choose among six built-in demo identities. The selected name appears in the control; role titles and access levels remain listed in the chooser. Use **Create New Account** at the bottom of the menu to add another local demo profile and choose its access level. New profiles are saved in this browser under `three-d-print-farm-demo-accounts`; the selected identity is stored under `three-d-print-farm-demo-role`. If storage is unavailable, newly created profiles last for the current page session.

| Level | Role and identity | Access |
| --- | --- | --- |
| 1 | Regular School Teacher · Mr. Q | Public pages, My Print Jobs, and print request submission |
| 2 | Print Farm Member · Leddy Tiang; Whunder Tar | Staff Dashboard, approved job claiming, preparation and print authorization requests, personal inbox, read-only supervisor presence, simulated notification retry, read-only filament details, own Hours balance and history, and hour adjustment requests |
| 3 | Senior Print Farm Member · Darry Hing; Fayren Ju | Level 2 capabilities plus filament changes; own Hours balance and adjustment requests |
| 4 | Print Farm Teacher · Mr. Uw | Level 3 capabilities plus initial request review, final print authorization, own presence controls, job reassignment, and the combined Hours page for giving hours to Level 2 and Level 3 staff, reviewing requests, and viewing contribution and balance history; no personal hours balance |

The role and permission catalog is in `src/authorization.js`. Page routes, forms, actions, and hours service operations check their required permission in the browser. This is application behavior for the demo, not production security: users can change local browser data and frontend code.

## Personal inbox and event persistence

Personal notifications are stored in `inbox` in the existing `three-d-print-farm-demo-v3` record, separately from the existing simulated pickup-email `notifications` records. Each inbox item has a stable ID, recipient account ID, event key, title, summary, context, full message, saved timestamp, and related job or hours-request ID. New items are unread. Opening an item removes it from storage and retains a temporary details snapshot until Back, closing, navigation, or identity change. The unread dot reflects the current account’s remaining entries.

`inboxEvents.js` projects successful job/history and hours changes into personal notifications inside the existing storage transaction. Rerenders, refreshes, retries of idempotent hours submissions, and repeated reads do not create events. Assigned Level 2–3 members receive progress changes made by someone else; eligible Level 2–3 members receive newly approved available jobs; credited individuals receive added-hours notices with their new balance. Level 4 supervisors receive new request, print authorization, and hours-review requests. Request rejections and hour decisions also save an appropriate outcome. Shared notifications always resolve their actions against the latest underlying record; one supervisor’s decision disables the same decision for everyone else.

The app uses the existing localStorage strategy and Web Locks where supported, and reacts to same-origin storage events. This supports refresh persistence and updates among browser tabs/frames on the same origin. The demo identity choice is shared on that origin as before. There is no cross-device delivery, push service, real email, backend authentication, or server-side permission enforcement. Browsers without Web Locks retain the existing synchronous-write fallback; they do not gain database-grade concurrent-write guarantees.

## Staff Hours Management

### Personal hours for Level 2 and Level 3

Choose **Hours** in the Staff Dashboard to see your current balance, pending request count, recent activity, your submitted requests, and your own transaction history. You can request **Additional hours** or a **Correction / deduction** and provide an explanation. A request starts as `Pending`; submitting it never changes your balance. Level 2 and Level 3 staff do not have access to the student contribution management view or its recording controls.

Requests show their status as `Pending`, `Approved`, or `Rejected`. Approved requests show the applied adjustment and decision details in the history. Rejected requests show the reviewer's explanation when one was entered. Users can only retrieve their own balances, requests, and histories through the hours service.

### Level 4 administration

Level 4 staff do not receive a personal balance or request form. Their **Hours** page provides a name search and a list of existing Level 2 and Level 3 members. Each row shows the member's level under their name, balance, latest adjustment, and any pending requested hours. Selecting **Select** opens that member's detail view, with their requests first, followed by hour controls and their contribution and balance history. Requests are reviewed from the individual member's details rather than in a global queue.

To credit a staff member, choose an existing Level 2 or Level 3 account from the staff list, enter the hours, work date, and activity, then choose **Give hours**. The confirmation shows the selected staff member and proposed balance. Giving hours creates both a student contribution record and a linked balance transaction, so the credited staff member sees the hours in their own balance and history. The merged Level 4 activity history shows the linked item once. Use **Subtract or correct hours** for a deduction; the form previews the resulting balance and rejects deductions below zero. A correction is kept as an auditable balance transaction.

Approval applies the requested change once, records the reviewer and timestamp, writes a linked transaction, and marks the request approved as one browser storage update. A request cannot be approved or rejected again after it is decided, and a reviewer cannot decide their own request. Rejections leave the balance unchanged and can include a reason.

### Accounting and persistence

Hour amounts use hundredths of an hour (0.01 hour precision). The initial balance is **zero hours** for each demo staff identity. A balance is calculated from that user's signed transactions rather than saved as an editable total. Each transaction records its ID, target user, signed change, before-and-after balances, reason, source, actor, associated request when applicable, and timestamp. Pending and rejected requests are not transactions and do not affect balances.

Balances, requests, and transactions are stored in the existing `three-d-print-farm-demo-v3` localStorage record alongside jobs, notifications, inventory, and student contribution records. Existing browser records are retained; the app adds empty hours collections when it reads an older valid record. Existing contribution entries whose student name matches a Level 2 or Level 3 demo identity are linked to that staff member's balance once, so older entries such as contributions recorded for Darry Hing appear in the staff member's Hours history. Other existing student contribution entries remain visible in Level 4's combined activity history and do not change staff balances. No setup or manual migration is required.

## Routes

| Route | Access |
| --- | --- |
| `#/` | Public home page, Our Printers, and FAQ |
| `#/get-started` | All identities; print request workflow |
| `#/my-jobs` | All identities; their own saved requests, with active/ready/past filters |
| `#/my-jobs/:id` | Owning submitter only; details, recorded timeline, and pickup information |
| `#/staff` | Level 2 and above |
| `#/staff/active` | Level 2 and above |
| `#/staff/materials` | Level 2 and above; filament changes require Level 3 |
| `#/staff/materials/new` | Level 3 and above |
| `#/staff/materials/:id` | Level 2 and above; read-only at Level 2 |
| `#/staff/hours` | Level 2 and above; Level 4 receives administration controls |
| `#/staff/hours/staff/:userId` | Level 4 only |
| `#/staff/contributions` | Legacy link; opens the Hours page allowed for the selected identity |
| `#/staff/jobs/:id` | Level 2 and above |
| `#/section/faq` | Public FAQ anchor |

Legacy links to `#/staff/queue` redirect to the Staff Overview. The former student contributions route now opens Hours: Level 2 and Level 3 see only their personal Hours page, while Level 4 sees the combined management page.

## Existing features

The public homepage includes project information, use cases, printer information, and FAQs. Get Started collects a model file, print settings, and project details across a four-step request workflow. It accepts STL, 3MF, and OBJ files up to **25 MB** and previews models in the browser. MakerWorld model links retain their preview cards; other model links are saved with the request. Original model bytes are retained locally in IndexedDB when submitting, for staff preview and download; no model is uploaded.

The Staff Portal retains job review, active job assignment, job status updates, simulated pickup notifications, and filament availability management. The Materials list shows the actual color swatch, plastic type, color name, normalized HEX, and derived RGB. Level 3 and Level 4 staff can independently toggle Low Stock and Available; unavailable entries remain visible to staff, and confirmed deletion removes an entry from request choices. New entries start with Low Stock off and Available on. In the request workflow, available low-stock filaments remain selectable and display a warning; unavailable entries remain visible as disabled swatches; deleted entries are removed. The Overview’s Recent Jobs table uses project names to identify requests; file and material columns are omitted. Internal job IDs are retained only for relationships and links. Student contribution records are available to Level 4 in the combined Hours activity history. These actions update local demo data only.

## Our Printers

The public home page's **Our Printers** cards are rendered from the `PRINTERS` data in `src/publicPages.js`. Their product photos are stored locally in `assets/printers/` so the page does not hotlink them.

- **Bambu Lab A1 mini:** 180 × 180 × 180 mm build volume (width × depth × height), FDM, and single-colour printing only in this farm. See the [official product page](https://ca.store.bambulab.com/products/a1-mini) and [Quick Start Guide](https://cdn1.bambulab.com/documentation/quick-start-f507128172bdf/Quick%20start%20guide%20-%20A1%20mini-EN.pdf).
- **Bambu Lab H2S:** 340 × 320 × 340 mm build volume (width × depth × height), FDM, and the only farm model available for multi-colour jobs. See the [official product page](https://us.store.bambulab.com/en/products/h2s) and [technical specifications](https://bambulab.com/it/support/buying-guide).

PLA and PETG are examples of common materials, not a promise that every colour or type is stocked. The H2S manufacturer's broader compatibility does not expand the farm's material offerings. Build volumes are nominal maximums; geometry, orientation, supports, and clearances affect whether a model fits. Larger A1 mini projects may need splitting; confirm with staff whether a multi-part job is feasible. The H2S's optional laser or cutting configurations are not print farm services.

## Data, setup, and limitations

The `v3` suffix below identifies the storage schema, not the website release; it is retained in v2.3 so existing browser data stays available. Jobs, notifications, filament entries, contribution records, hour requests, and hour transactions use the browser localStorage key `three-d-print-farm-demo-v3`. A filament entry stores its identity, HEX color, Low Stock Boolean, and Available Boolean; RGB is derived from HEX. Existing v1.5 inventory records are migrated in place: the former threshold rule becomes the Low Stock flag, and entries with zero quantity become unavailable so they are not newly offered. Quantity, threshold, adjustment, and note fields are then removed. Additional demo profiles use `three-d-print-farm-demo-accounts`; the active identity uses `three-d-print-farm-demo-role`. These records are local to this browser and origin, are not shared between users or devices, and are removed if browser data is cleared. Where supported, the app uses the browser Web Locks API to serialize same-origin writes; localStorage still cannot guarantee database-grade transactions or consistency across devices.

The repository has no backend, database, Google authentication, email delivery, printer control, or server-side authorization. A production system must authenticate users on a server, enforce permissions for every protected operation, and store hours and audit history in a shared transactional database. A frontend role selector and client-side checks do not prove a user's identity or securely protect data.

## Project structure

~~~text
.
├── assets/
│   └── printers/
│       ├── a1-mini.jpg
│       └── h2s.jpg
├── index.html
├── favicon.svg
├── README.md
└── src/
    ├── app.js                    # Hash routing, rendering, and guarded UI actions
    ├── authorization.js          # Central role, permission, route, and action definitions
    ├── authService.js            # Demo identities and identity switching boundary
    ├── hoursPages.js             # Level 2 and 3 personal Hours and Level 4 combined management view
    ├── publicPages.js            # Public home, Our Printers, FAQ, and access-denied page
    ├── studentPages.js           # Own request list and details
    ├── jobWorkflow.js            # Shared status labels, visibility and assignment helpers
    ├── inboxEvents.js            # Transaction-bound personal notification event projection
    ├── personalInbox.js          # Personal inbox, retained details, popups and presence strip
    ├── jobProgress.js            # Shared saved-event timeline and pickup information
    ├── filamentColor.js          # HEX input normalization
    ├── filamentPalette.js        # Grouped colour swatches, sorting, and in-place selection
    ├── staffPages.js             # Staff portal and materials
    ├── floatingControls.js       # Responsive profile trigger and viewport-safe dropdowns
    ├── sidebarSelection.js       # Persistent glass highlight, motion, and responsive positioning
    ├── pageCommit.js             # Update staff content while retaining its connected navigation
    ├── requestWizard.js          # Print request workflow
    ├── pageShared.js             # Shared navigation, role selector, and appearance controls
    ├── services.js               # Local jobs, inventory, hours, validation, persistence
    ├── filesService.js           # Model file and HTTPS URL validation
    ├── modelPreview.js           # Three.js model preview
    ├── notificationsService.js
    ├── apiClient.js              # Inactive API placeholder
    └── styles.css                # Components and responsive layout
~~~

---

<sub>For demonstration only. Do not use with real student data or production hours.</sub>


## Validation and visual review

There is no build pipeline or lint configuration; the app is served directly as ES modules. Run the existing and new Node tests:

~~~sh
node --test tests/*.test.mjs
for file in src/*.js; do node --check "$file"; done
~~~

The regression tests cover stable ownership and legacy email compatibility, direct service access, sparse legacy histories, saved staff transitions with Web Locks, collection recorded only once, assignment/reassignment permissions, HEX/RGB validation and editing, reset key isolation and pending-notification cancellation, empty/many-request views, filters, and cancelled/rejected states. The existing optional-note tests are retained. Palette tests cover material grouping, colour order, single selection, keyboard-ready native radio markup, unavailable/unverified entries, legacy draft selection, empty inventory, escaping, and availability checks on save.

For repeatable visual QA, serve on port 8030 and open `http://localhost:8030/tests/preview.html`. The fixture uses the separate `localhost` origin so normal `127.0.0.1:8030` preview data is untouched. **Load visual test requests** creates clearly labelled synthetic pickup data and examples of all supported states, backing up the previous QA data in sessionStorage. **Restore previous QA data** restores that backup. Check My Print Jobs, an individual request, staff actions, filament editing, both themes, transparency, and Reset Local Data at desktop and mobile widths. `tests/fixtures/test-part.stl` is a tiny model for manual file-selection checks. The browser automation environment may not expose its native file picker; in that case, verify model selection manually.

No Google sign-in, backend authorization, real email delivery, or printer-control capability has been added. A future authenticated service should provide the authenticated stable user ID at the existing authService boundary and enforce the same ownership and permission rules on the server.


For the populated palette view, load the visual QA fixtures and open `http://localhost:8030/tests/palette-preview.html`. It uses the same production page and selection components with synthetic PLA, PETG, and TPU inventory; these are sample colours, not a statement of actual farm stock. The preview allows swatch and appearance checks without opening the native model-file picker. Its workflow navigation is for visual review only; use the normal website for a complete request. The production app never imports `tests/paletteFixtures.js`.


Open `http://localhost:8030/tests/sidebar-regression.html` and choose **Run checks** for native browser checks of persistent sidebar/control/highlight nodes, the absence of staff top bars, synchronized content and active tabs, transparent tab backgrounds, uninterrupted data refreshes, thirty rapid tab changes, account-list refreshes, responsive initials, dropdown bounds, and identity/unmount cleanup. This fixture uses the production staff components and DOM commit helper without modifying account or job records.


### v2.2 approval and inbox regression coverage

`tests/approvalInbox.test.mjs` adds gate and visibility checks, duplicate claims and decisions, revision/resubmission, stable authorization attempts, independent supervisor presence, individual inbox removal and persistence, hours notifications, saved-data compatibility, and write-failure rollback. The full Node suite contains **41 passing tests**. All production JavaScript files pass `node --check`. This frontend-only project has no configured build, lint, or type-check pipeline and adds no dependency.

Serve the project and open `tests/inbox-regression.html` to run the **31 browser checks** at desktop and mobile widths. `tests/responsive-checks.html` provides repeatable 390 px, 768 px, and desktop-width frames. They cover menu exclusivity, first-open positioning, popup direct actions, Back remaining inside the popover, outside-click/Escape dismissal, unread state, temporary deleted-notification details, stale actions, long lists, account switching, presence permissions, and theme tokens. The fixture backs up and restores application data on its origin.

`tests/workflow-e2e.html` runs the production app in a frame through the real request wizard and model preview, both approval stages, revision/resubmission, claiming, printing, completion, collection, hours approval through Inbox, refresh persistence, submitter tracking, and notification delivery to a second same-origin dashboard. It supplies the existing tiny STL fixture through a **synthetic file-input selection** and uses test-only confirmation answers. It restores the previous application data after the run. Native operating-system file-picker interaction remains a manual check in automation environments that do not expose it. These fixture pages are not imported by the production app.


## Design system and development guidance

### Shared geometry and spacing

The top-right toolbar establishes the shared shell inset, approximately **21.33px** (`--shell-inset`). Corner-anchored elements use equal clearance from their two adjacent edges. Public headers, staff content, panel corners, sidebar icons, and the desktop back link follow the same leading rail. Interior content retains the spacing needed for its hierarchy and readability.

All rounded surfaces use **`--radius: 12px`**, explicitly confirmed by the user after reviewing the reference images. `--radius-panel`, `--radius-control`, and `--radius-small` are compatibility aliases for that single token. Full circles remain for functional indicators, avatar badges, swatches, and progress markers. Dividers and viewport-flush navigation edges remain straight.

The desktop/tablet sidebar widths remain 248px/200px. The original row centers, 20px icons, 10px icon-to-label gap, click areas, and 380ms mounted-highlight animation remain intact. The glass face is 10% shorter (about 40.8px), with its width derived from equal leading/top/bottom icon clearance (about 10.4px). This reduces the painted area by about 12%, without squeezing the icon against the leading edge or moving its text. The selected face uses the subtle grey gradient and restrained edge highlight of the third reference image.

### Shared toolbar and popovers

`toolbarControls()` renders **Appearance → Identity → Inbox** in staff views and in public/student views when the identity has staff Inbox access. Student-only views retain Appearance → Identity. Each visible control is 36px square, with a 44px interaction target, 8px gaps, and centered glyphs/initials. Identity always shows initials in its collapsed state; full names, access levels, switching, and local account creation remain in the menu.

The mobile public header keeps account controls accessible and places Get Started in the existing navigation menu, as well as retaining the existing page calls to action. Supervisor presence wraps within its available space. All supported themes retain the same control geometry.

All three popovers share the same 280ms Liquid Glass opening animation, surface, border, and shadow. `floatingControls.js` promotes the existing menu node to the native popover top layer, preserving its event ancestry while escaping parent overflow, transforms, and backdrop filters. Placement uses the visual viewport, shared panel insets, the trigger's current bounds, and the available space above/below. Long menus and nested account forms scroll within the viewport. Resize, scroll, content changes, outside click, keyboard activation, and Escape remain supported. Reduced motion, reduced transparency, and increased contrast are respected.

### Fixed monochrome surfaces

The adjustable transparency UI, its state, input handler, and saved-preference listener have been removed. The previous slider mapped `transparency` to `1 - transparency / 100`; its actual range was 0–80%. A conceptual 100% transparent surface exposed the dark `#111112` page background. Main content now uses that appearance as an opaque surface, with theme-appropriate light surfaces in light mode. Secondary glass uses a fixed **0.94 opacity**, matching the old 6% setting, through shared glass tokens.

The palette is monochrome. The former saturated accent choices and CSS palettes, including teal, are removed, and previously saved accent preferences no longer recolor the app. Operational success/warning/error colors and actual filament colors remain meaningful exceptions. Legacy preference key names remain only in reset/QA backup lists so Reset Local Data can still clean up old settings; there are no adjustable-transparency controls or active settings entries.

The existing system font, business services, role permissions, data structures, print workflows, and stored records are unchanged. No dependency was added. Version remains **v2.2**. The entry page's import map centrally refreshes changed module cache revisions so previously cached page modules resolve the updated controls consistently.

## v2.2 verification

~~~sh
node --test tests/*.test.mjs
for file in src/*.js; do node --check "$file"; done
~~~

This static ES-module project has no configured build, lint, or type-check pipeline. Browser fixtures are served with Python's HTTP server; the latest development checks used a separate loopback-only preview on port 8031 with caching disabled.

- `tests/sidebar-regression.html`: persistent sidebar/highlight/control nodes, rapid navigation, profile refresh, initials, toolbar order, and menu positioning.
- `tests/inbox-regression.html`: notifications, actions, exclusivity, dismissal, long lists, presence, account boundaries, and theme semantics.
- `tests/ui-refinement.html`: both themes; toolbar order, size and measured glyph centering; mirrored corner clearance; shared 12px geometry; fixed solid/glass materials; stable selected/unselected navigation; all three menus and nested account forms at every viewport corner, including inside transformed and clipped parents; shared popover animation; and responsive public headers. It restores its theme/identity and does not change work records.
- `tests/workflow-e2e.html`: the production print wizard, model preview, review/authorization, revisions, claiming, printing, completion, collection, hours, persistence, and same-origin notifications. The fixture backs up and restores its synthetic records and uses synthetic model-file selection.

See `work/ui-refinement/validation.md` for the current verification results and changed-file manifest. Original versions of changed existing files are preserved in `work/ui-refinement/originals/`. No commit, push, merge, or tag was created.

## v2.3 validation

Run `node --test tests/*.test.mjs` and `node --check` for all production JavaScript. This static ES-module app has no configured build, lint, or type-check pipeline.

Serve the existing directory locally and open `tests/v23-regression.html` on a dedicated QA origin. Its **Run v2.3 checks** button exercises the real job viewer for STL/OBJ/3MF, byte-for-byte original storage and download, multiple files, reload persistence, storage failure, missing/unsupported/corrupt originals, sidebar navigation and rapid toggles, both surface themes, and 1440/1024/768/390/320px layouts. It backs up and restores demo records and removes its own model files. **Show sample model job** leaves a clearly synthetic job available for manual rotation, zoom, reset, and download review; run the checks afterward to restore the previous records. Synthetic OBJ and 3MF fixtures join the existing STL fixture in `tests/fixtures/`.

The existing full workflow, sidebar, inbox, and UI refinement browser fixtures remain available. Full workflow checks now clean up their newly retained model files in addition to restoring demo records. Do not commit or publish this version without explicit user approval.
