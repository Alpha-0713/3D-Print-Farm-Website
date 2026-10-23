# School 3D Print Farm Demo — v1.1.1

A responsive, frontend-only prototype for a school 3D-print request workflow. Version 1.1 simplifies the public homepage, adds browser-persistent filament inventory and student contribution records, and connects public material availability to the same inventory used by the request form.

## Quick start

Requires Python 3. From this directory, run:

```sh
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000). Stop the server with `Control-C`. The app has no build step. An internet connection is required to load the pinned Three.js and fflate preview modules from jsDelivr.

## Routes

| Route | Page |
| --- | --- |
| `#/` | Public landing page and FAQ |
| `#/get-started` | Four-step request wizard |
| `#/my-jobs` | Student demo job tracking |
| `#/staff` | Staff overview |
| `#/staff/queue` | Searchable and filterable job queue |
| `#/staff/active` | Jobs assigned to the demo staff member |
| `#/staff/materials` | Filament inventory management |
| `#/staff/hours` | Student contribution hours |
| `#/staff/jobs/:id` | Job details and status actions |
| `#/section/faq` | Public FAQ anchor |

## v1.1.1 release summary

The public home page removes the requested header FAQ link, tagline, promotional line, and brand eyebrow. The remaining hero content fills the page without the removed stats row.

The Get Started form accepts STL, 3MF, and OBJ files up to 25 MB. It previews the selected model geometry in an interactive Three.js viewport with orbit, zoom, and pan controls. The file is parsed in the browser and only filename and size metadata enter the local demo request; model bytes are not uploaded or saved. Replacing or removing a model disposes the prior preview.

Users can also provide a direct HTTPS model URL. The browser retrieves the file without credentials, enforces the same 25 MB limit, then passes the bytes through the same validation and preview flow. The source must allow cross-origin browser access (CORS); authenticated pages, indirect links, or servers that block CORS are reported as unavailable. There is no backend proxy. The 3MF loader uses fflate 0.8.3 for ZIP parsing.

Three.js 0.186.0 and fflate 0.8.3 are pinned CDN dependencies. The app is still static and has no build step or server-side storage.

## v1.1 release summary

### Public homepage

The homepage no longer includes the `01 / Capabilities`, `02 / Material Intelligence`, `03 / How It Works`, or `04 / Print Farm` sections. Their navigation and footer links, artwork, and section styles were removed. The homepage keeps the hero, use cases, FAQ, and request call to action. Job submission and job tracking remain available.

The **Good questions** FAQ now explains what filament is and compares the print farm demo's supported materials—PLA, PETG, and TPU—with typical uses, material behavior, and printing considerations. Its current color and stock status list comes from the same inventory used by the request form. Material descriptions are maintained in `src/data.js`; live stock comes from `src/services.js`.

### Staff Portal

Portal text, fields, navigation, tables, and buttons use larger, more consistent type, stronger contrast, and more comfortable spacing. The layout supports desktop, tablet, and smaller screens.

### Filament inventory

The Materials page can add and edit entries for PLA, PETG, and TPU, including color, quantity, unit, low-stock threshold, availability, and notes. It rejects duplicate material/color entries, negative quantities, unsupported units, and invalid updates. Staff can record received stock or material consumption; adjustments cannot reduce stock below zero. Low stock, out-of-stock, and unavailable entries are identified in the staff view.

New installations start with an **empty inventory** because the project contains no verified stock data. Staff must enter their actual stock before students can select a material/color. A combination is selectable only when it has a positive quantity and is marked available. The request form loads current combinations when opened and validates the selection again before saving a job. The public FAQ reflects inventory additions and availability changes. Submitting a job does not deduct stock, and saved jobs retain their original material and color.

### My Hours

Teachers can add and edit student contribution records with a date, positive duration in hours, and activity description. Dates must be valid and cannot be in the future; a record is limited to 24 hours. The page supports student search, date range filters, per-student totals, selected-period totals, decimal hours, and empty states. Totals are calculated from saved records.

This project has no student directory. Contribution records use entered student display names and offer names from existing demo records as suggestions. They do not create or connect real student accounts.

## Data, backend, and security limits

This repository is a static frontend demo. It contains no backend server, API routes, database configuration, database models, or database initialization procedure. `src/apiClient.js` is an inactive integration placeholder and makes no requests. There are no new environment variables or database migrations. The 3D viewport loads pinned Three.js 0.186.0 modules and fflate 0.8.3 from jsDelivr; a browser with network access is needed for preview parsing.

Jobs, notifications, inventory, and contribution records are saved in the browser's `localStorage` under `three-d-print-farm-demo-v3`. The existing job data is retained; older saved data is extended with empty `inventory` and `contributions` arrays when first read. Changes persist after reload in the same browser and origin, but are not shared across browsers, devices, or users. Browser storage can be cleared by the user or unavailable due to browser settings.

The current identity and role handling is still mock-only. The Staff Portal is not protected by server-side authentication or authorization, and validation runs in the browser. Local storage is not a concurrency-safe database. Do not use this demo for real student data, production requests, or stock control that requires shared or secured records. A production deployment needs a backend, a configured database, and real staff/student authorization before it can satisfy server-side validation and access control.

No schema SQL or migration files were added because this project has no database layer. The application reports storage failures when it cannot persist changes; that browser storage condition is separate from the missing database/backend, which is an architecture limitation rather than a database connection failure.

## Testing

### Run the app

```sh
python3 -m http.server 8000
```

Then use the routes above to inspect the public site and staff workflows.

### Manual verification performed for v1.1

- Opened the homepage and confirmed the four removed sections and their navigation links are absent. Opened the filament FAQ and checked its PLA, PETG, and TPU descriptions.
- Added a test inventory entry in an isolated preview, recorded consumption, and confirmed the low-stock status and quantity appeared in the Staff Portal and public FAQ.
- Changed that entry to unavailable in a second tab and confirmed the request form refreshed to an empty, disabled filament selection. The form prevented moving forward with a stale selection.
- Submitted a test job using an available PLA/color entry and confirmed the saved job retained its material and color. Its inventory quantity was unchanged. An over-consumption adjustment was rejected and stock remained unchanged.
- Added and edited a contribution record with decimal hours, checked student/date filtering and totals, and confirmed the saved record remained after reloading the isolated preview.
- Inspected browser console output during these workflows; no console errors or warnings were reported.

### Browser verification performed for v1.1.1

- Checked the updated homepage navigation and request wizard in a narrow browser viewport. The desktop header FAQ link and requested promotional copy are removed; FAQ content remains available through the existing footer route.
- Loaded the official Three.js 3MF sample from a direct HTTPS URL, confirmed the geometry appeared in the preview, and dragged the viewport to orbit the model. An HTTP URL was rejected and the previous preview was cleared.
- Exercised the same parser and preview module with browser-created STL, OBJ, and 3MF `File` objects, including uppercase extensions. Confirmed replacement disposes the prior preview, and malformed models plus empty, unsupported, oversized, and non-HTTPS inputs are rejected.
- The native operating-system file chooser was not manually operated; local file parsing and rendering were covered through browser `File` objects.

The project has no package manifest, automated test suite, build, lint, or type-check scripts. Node.js is unavailable in the environment, so no JavaScript build or command-line checks were run. Verification used the static HTTP server and browser. Direct-link loading depends on the host providing a downloadable file and permissive CORS headers; authenticated or private links cannot be fetched by this frontend-only demo. A production backend, real file storage, and printer workflow remain unavailable.

## Existing demo behavior and limits

- Student and staff identities are fictional; authentication and role-based access are not implemented.
- The wizard accepts `.stl`, `.3mf`, and `.obj` files up to 25 MB, parses their geometry for the preview, and keeps only filename and size as job metadata. It does not upload model contents.
- Notifications are simulated locally. No email is sent.
- Job status changes are simulated in the browser. The app does not connect to or control a 3D printer.
- The supported demo materials are PLA, PETG, and TPU. Colors and quantities are staff-entered local data and begin empty. 

## Files

- `index.html` — app entry point.
- `favicon.svg` — app icon.
- `src/app.js` — hash routing, shared state, and UI event handling.
- `src/publicPages.js`, `src/studentPages.js`, `src/staffPages.js` — page templates by audience.
- `src/requestWizard.js` — request form, dynamic filament selection, and review flow.
- `src/pageShared.js`, `src/visualComponents.js` — shared navigation, formatting, and artwork.
- `src/data.js` — demo identities, supported material descriptions, seed jobs, and notification data.
- `src/services.js` — local job, inventory, and contribution data; validation, transitions, and draft persistence.
- `src/authService.js` — mock identity interface.
- `src/filesService.js` — model filename, size, extension, and HTTPS URL validation.
- `src/modelPreview.js` — Three.js model parsing, interactive preview, and renderer cleanup.
- `src/notificationsService.js` — simulated notification state.
- `src/apiClient.js` — inactive API configuration placeholder; makes no network requests.
- `src/styles.css` — visual styles and responsive behavior.
