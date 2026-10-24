# School 3D Print Farm Website — v1.3.1b

**Version 1.3.1 Beta** · A responsive, frontend-only prototype for the school's 3D-print request and filament-management workflow.

![version](https://img.shields.io/badge/version-v1.3.1b-blue)
![release](https://img.shields.io/badge/status-beta-orange)
![stack](https://img.shields.io/badge/stack-vanilla%20JavaScript-f7df1e?logo=javascript&logoColor=black)
![storage](https://img.shields.io/badge/storage-browser%20localStorage-lightgrey)

> **Beta prototype:** Do not use it for real student information, production requests, secured staff work, or shared stock records.

## Overview

The website demonstrates a public print-farm homepage and FAQ, a four-step **Get Started** request workflow, a student demo job list, and a **Staff Portal** for reviewing jobs, managing filament, and recording student contribution hours. It runs entirely in the browser and stores demo data in that browser's `localStorage`; it has no server, database, or real authentication.

The current interface uses a solid `#181818` page background across public, student, staff, and dialog views. Staff can select one of six accent colors; the dark background stays fixed.

## Quick start

Requires **Python 3**. There is no package installation or build step.

```sh
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) and stop the server with `Control-C`. An internet connection is needed for the pinned Three.js and fflate modules loaded from jsDelivr.

## Routes

| Route | Page |
| --- | --- |
| `#/` | Public home page and FAQ |
| `#/get-started` | Four-step print request wizard |
| `#/my-jobs` | Student demo job tracking |
| `#/staff` | Staff overview and latest requests |
| `#/staff/active` | Jobs assigned to the demo staff member |
| `#/staff/materials` | Filament inventory |
| `#/staff/materials/new` | Add filament |
| `#/staff/materials/:id` | Edit filament details and adjust stock |
| `#/staff/hours` | Student contribution hours |
| `#/staff/jobs/:id` | Staff job details and status actions |
| `#/section/faq` | Public FAQ anchor |

Legacy links to `#/staff/queue` redirect to the Staff Overview.

## Public and request workflow

The public homepage includes the project introduction, use cases, FAQ, and a request call to action. The FAQ describes PLA, PETG, and TPU and reflects the current local filament inventory.

Get Started collects a model file, print settings, project details, and a review before submission. It accepts STL, 3MF, and OBJ files up to **25 MB** and shows a browser-side 3D preview with orbit, zoom, and pan. A direct HTTPS model URL can also be loaded when its host permits cross-origin access. Model bytes are used for validation and preview only; the saved demo request contains the filename and size, not an uploaded model.

The material step lists inventory entries marked available with positive stock and a known HEX value. The selected entry shows its swatch, color name, exact HEX, and RGB values. Availability is checked again before the request is saved. Submitting does not deduct filament stock, and saved jobs retain their material and color selection.

## Staff Portal

The Overview shows four job counts and the six most recently submitted requests. **My active jobs** lists work assigned to the demo staff identity. Staff can update demo job statuses and record student contribution hours; these are local prototype actions, not real school workflows.

### Materials inventory

Materials is a compact card inventory. Each filament shows its material type, color name and swatch, HEX and RGB values, stock quantity, and an **Available / Unavailable** control. The control toggles in one click and saves immediately to this browser's local inventory. Add Filament opens a form for material, color name, verified HEX, initial stock, units, low-stock threshold, and availability. RGB is calculated from HEX, so the two displayed values cannot disagree. Malformed HEX values are rejected.

HEX is the stored source of truth; RGB is derived for display. New browser installations start with an empty inventory because the repository has no verified filament stock or color data. Older saved entries that have a basic color name but no HEX use a documented CSS named-color mapping for Black, Blue, Brown, Gray/Grey, Green, Orange, Pink, Purple, Red, White, and Yellow. Other names are left without an invented code and can be assigned a verified HEX value in filament details.

Staff can still edit quantities, units, availability, and notes, and record stock received or consumed. Duplicate material/color pairs are rejected. Request availability also requires positive stock. The public FAQ and request form read from the same inventory service.

### My Hours

Teachers can add and edit contribution records with a student display name, date, duration, and activity. Dates must be valid and not in the future; duration must be greater than zero and no more than 24 hours per record. Search, date filters, and totals are calculated from local demo records. There is no student directory or connection to student accounts.

## Version 1.3.1 Beta changes

- Uses `v1.3.1b` as the canonical version and **Version 1.3.1 Beta** as its display name.
- Sets the global page background to solid `#181818` and removes the light-theme switch; accent selection remains available.
- Reworks Materials into a color-coded filament inventory with one-click availability controls and a validated Add Filament workflow.
- Stores verified HEX values and derives RGB consistently in Materials and Get Started.

Earlier v1.3 appearance and v1.2 staff and request-wizard improvements remain in the prototype where compatible with the fixed dark background.

## Technology and project structure

The application is static HTML, CSS, and vanilla JavaScript using hash-based client-side routes and ES modules. Three.js **0.186.0** renders model previews, and fflate **0.8.3** supports 3MF ZIP parsing. Both are pinned CDN dependencies. There is no build, lint, type-check, or automated test configuration in the repository.

```text
.
├── index.html                    # Entry point, metadata, import map
├── favicon.svg                   # Static app icon
└── src/
    ├── app.js                    # Hash routing, state, events, rendering
    ├── publicPages.js             # Public home and FAQ
    ├── studentPages.js            # Student demo pages
    ├── staffPages.js              # Staff portal pages and Materials UI
    ├── requestWizard.js           # Request form, filament selection, review
    ├── pageShared.js              # Shared navigation, appearance, formatting
    ├── visualComponents.js        # Homepage artwork
    ├── data.js                    # Demo identities, material descriptions, seed jobs
    ├── services.js                # Local jobs, inventory, hours, validation, persistence
    ├── authService.js             # Mock identity interface
    ├── filesService.js            # Model file and HTTPS URL validation
    ├── modelPreview.js            # Three.js parsing and interactive preview
    ├── notificationsService.js    # Simulated notifications
    ├── apiClient.js               # Inactive API placeholder
    └── styles.css                 # Color tokens, components, and responsive layout
```

## Data, beta limitations, and security

Jobs, notifications, inventory, and contribution records use the browser `localStorage` key `three-d-print-farm-demo-v3`. Changes persist across reloads in the same browser and origin only. They are not shared across users or devices, and clearing browser data removes them. Storage may also be unavailable depending on browser settings.

- Student and staff identities are fictional. The Staff Portal has no server-side authentication or authorization.
- There is no backend, API, database, database schema, or migration process. `src/apiClient.js` makes no network requests.
- Job statuses and notifications are simulated. No email is sent, and the site does not connect to or control printers.
- Model preview and validation happen in the browser. Models are not uploaded or stored by a server. HTTPS URL loading requires a downloadable file and permissive CORS headers.
- Inventory and request data are local demo records, not a concurrency-safe or authoritative stock system.

A production system would need a backend, secure role checks, shared persistence, and real request and printer workflows. These are future work, not implemented features.

## Verification

This repository has no automated test suite, package manifest, build, lint, or type-check scripts.

For v1.3.1b, verification included:

- Parsed all 14 JavaScript modules with Node's ECMAScript module parser; `git diff --check` passed.
- Exercised the inventory service with isolated browser-storage data: malformed HEX rejection, HEX normalization, RGB derivation, availability persistence and filtering, known-name legacy mapping, and exclusion of unknown legacy colors from requests.
- Rendered the Materials, public FAQ, and Get Started templates and confirmed their swatches and HEX/RGB values use the same inventory color data.
- Exercised request validation: unavailable filament was blocked, an available filament could be saved, and submission did not reduce inventory quantity.
- Reviewed the public home, Staff Overview, Materials empty state, Add Filament form, live RGB preview, malformed-HEX feedback, and Get Started empty-inventory state in a desktop browser.

The request wizard was not submitted through the browser UI, and a mobile viewport was not manually inspected. No build, lint, or automated test scripts are configured.

---

<sub>For demonstration only. Do not use with real student data or production requests.</sub>
