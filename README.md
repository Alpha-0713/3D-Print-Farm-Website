<div align="center">

# 🖨️ School 3D Print Farm Demo

**A responsive, frontend-only prototype for a school 3D-print request workflow.**

![version](https://img.shields.io/badge/version-1.1-blue)
![stack](https://img.shields.io/badge/stack-vanilla%20JS-f7df1e?logo=javascript&logoColor=black)
![backend](https://img.shields.io/badge/backend-none-lightgrey)
![storage](https://img.shields.io/badge/storage-localStorage-orange)
![status](https://img.shields.io/badge/status-demo%20only-red)

[Quick start](#-quick-start) · [Routes](#-routes) · [What's new in v1.1](#-whats-new-in-v11) · [Limits](#-data-backend-and-security-limits) · [Testing](#-testing) · [Files](#-project-structure)

</div>

---

> [!WARNING]
> This is a **demonstration only**. Do not use it with real student data, production requests, or stock control that needs shared or secured records.

Version 1.1 simplifies the public homepage, adds browser-persistent filament inventory and student contribution records, and connects public material availability to the same inventory used by the request form.

## 🚀 Quick start

Requires **Python 3**. No build step, no external dependencies.

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000>. Stop the server with `Control-C`.

## 🧭 Routes

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

## ✨ What's new in v1.1

### 🏠 Public homepage

The homepage no longer includes the `01 / Capabilities`, `02 / Material Intelligence`, `03 / How It Works`, or `04 / Print Farm` sections. Their navigation and footer links, artwork, and section styles were removed.

It keeps the **hero**, **use cases**, **FAQ**, and **request call to action**. Job submission and tracking remain available.

The **Good questions** FAQ now explains what filament is and compares the supported materials (**PLA**, **PETG**, **TPU**) by typical uses, behavior, and printing considerations. Its color and stock status list comes from the same inventory used by the request form.

> [!NOTE]
> Material descriptions live in `src/data.js`. Live stock comes from `src/services.js`.

### 🧑‍🏫 Staff Portal

Text, fields, navigation, tables, and buttons use larger, more consistent type, stronger contrast, and more comfortable spacing. The layout supports desktop, tablet, and smaller screens.

### 🧵 Filament inventory

The **Materials** page can add and edit entries for PLA, PETG, and TPU, including:

- color, quantity, unit, low-stock threshold, availability, and notes
- received-stock and consumption adjustments
- status flags for **low stock**, **out of stock**, and **unavailable** entries

**Validation rules** (all enforced in the browser):

- duplicate material/color entries are rejected
- negative quantities, unsupported units, and invalid updates are rejected
- adjustments cannot reduce stock below zero

For a current quantity $q$ and a consumption adjustment $c$, an adjustment is accepted only if

$$
q - c \ge 0
$$

A material/color combination is **selectable** in the request form only when

$$
q > 0 \;\wedge\; \text{available} = \text{true}
$$

New installations start with an **empty inventory**, since the project contains no verified stock data. Staff must enter real stock before students can pick a material/color.

The request form loads current combinations when opened and **validates the selection again before saving a job**. The public FAQ reflects inventory additions and availability changes.

> [!TIP]
> Submitting a job does **not** deduct stock, and saved jobs keep their original material and color.

```mermaid
flowchart LR
    S[Staff: Materials page] -->|add / edit / adjust| I[(Inventory in localStorage)]
    I --> F[Request form]
    I --> Q[Public FAQ stock list]
    F -->|re-validates on save| J[(Saved job)]
```

### ⏱️ My Hours

Teachers can add and edit student contribution records.

| Field | Rule |
| --- | --- |
| Date | Must be valid and not in the future |
| Duration | Positive, decimal hours allowed, at most 24 per record |
| Activity | Description of the contribution |

The page supports student search, date range filters, per-student totals, selected-period totals, and empty states. Totals are computed from saved records. For student $s$ over a selected period $P$, with record durations $h_i$:

$$
T_{s,P} = \sum_{i \,\in\, R_{s,P}} h_i, \qquad 0 < h_i \le 24
$$

where $R_{s,P}$ is the set of $s$'s records dated within $P$.

> [!NOTE]
> There is no student directory. Records use entered display names and suggest names from existing demo records. They do not create or connect real student accounts.

## 🔒 Data, backend, and security limits

This repository is a **static frontend demo**. It contains no backend server, API routes, database configuration, models, or initialization procedure. `src/apiClient.js` is an inactive placeholder and makes no requests. v1.1 adds no environment variables, migrations, or external dependencies.

**Storage.** Jobs, notifications, inventory, and contribution records are saved in the browser's `localStorage` under:

```text
three-d-print-farm-demo-v3
```

- Existing job data is retained; older saved data is extended with empty `inventory` and `contributions` arrays on first read.
- Changes persist across reloads in the same browser and origin, but are **not** shared across browsers, devices, or users.
- Browser storage can be cleared by the user or unavailable due to browser settings. The app reports storage failures when it cannot persist changes.

**Security.**

- Identity and role handling are mock-only.
- The Staff Portal has **no** server-side authentication or authorization; validation runs in the browser.
- `localStorage` is not a concurrency-safe database.

A production deployment needs a backend, a configured database, and real staff/student authorization. No schema SQL or migration files were added because there is no database layer. That is an architecture limitation, not a database connection failure.

## 🧪 Testing

There is no automated test suite or package manifest. A standalone JavaScript syntax check could not be run because Node.js was not installed in the environment. The browser loaded and exercised the modules through the static server.

<details>
<summary><b>Manual verification performed for v1.1</b></summary>

<br>

- [x] Opened the homepage; confirmed the four removed sections and their navigation links are absent. Checked the filament FAQ's PLA, PETG, and TPU descriptions.
- [x] Added a test inventory entry in an isolated preview, recorded consumption, and confirmed the low-stock status and quantity in the Staff Portal and public FAQ.
- [x] Set that entry to unavailable in a second tab; the request form refreshed to an empty, disabled filament selection and blocked advancing with a stale selection.
- [x] Submitted a test job with an available PLA/color entry; the saved job kept its material and color, and inventory quantity was unchanged. An over-consumption adjustment was rejected and stock remained unchanged.
- [x] Added and edited a contribution record with decimal hours; checked student/date filtering and totals; the record persisted after reloading the isolated preview.
- [x] Inspected browser console output during these workflows; no errors or warnings.

**Not verifiable in this project:** a real backend workflow, authenticated staff access, cross-device persistence, and actual printer or file uploads.

</details>

## ⚙️ Existing demo behavior and limits

- Student and staff identities are fictional; authentication and role-based access are not implemented.
- The wizard accepts `.stl` and `.3mf` filenames up to **25 MB**. It keeps only filename and size as metadata; it does not read or upload model contents.
- Notifications are simulated locally. No email is sent.
- Job status changes are simulated in the browser. The app does not connect to or control a 3D printer.
- Supported materials are **PLA**, **PETG**, and **TPU**. Colors and quantities are staff-entered local data and begin empty.

## 📁 Project structure

```text
.
├── index.html                  # App entry point
├── favicon.svg                 # App icon
└── src/
    ├── app.js                  # Hash routing, shared state, UI event handling
    ├── publicPages.js          # Public page templates
    ├── studentPages.js         # Student page templates
    ├── staffPages.js           # Staff page templates
    ├── requestWizard.js        # Request form, dynamic filament selection, review flow
    ├── pageShared.js           # Shared navigation and formatting
    ├── visualComponents.js     # Shared artwork
    ├── data.js                 # Demo identities, material descriptions, seed jobs, notifications
    ├── services.js             # Local jobs, inventory, contributions; validation, transitions, drafts
    ├── authService.js          # Mock identity interface
    ├── filesService.js         # Model filename and size metadata handling
    ├── notificationsService.js # Simulated notification state
    ├── apiClient.js            # Inactive API placeholder (no network requests)
    └── styles.css              # Visual styles and responsive behavior
```

---

<div align="center">
<sub>For demonstration only. Do not use with real student data or production requests.</sub>
</div>
