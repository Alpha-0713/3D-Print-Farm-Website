# 3D Print Farm · v2.4

**Backend** joined the party. - Coming soon!

A responsive vanilla JavaScript frontend for school print requests, two-stage approval, filament, staff hours, notifications and job tracking, with light/dark themes and Level 1–4 permissions.

**Status:** frontend integration milestone, not production ready. Local demo and HTTP adapters are included; a production backend, database, Google login, real email and printer control are **not implemented**. Demo identities/client permissions are not production authentication.

## Run locally

From this **v2.4 directory**, with Python 3:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [localhost:8000](http://localhost:8000/); stop with Control-C. No package installation/build is needed. Use a modern browser with IndexedDB for originals and WebGL for previews. Pinned Three.js/fflate and optional MakerWorld metadata need internet; fonts/artwork are local.

Confirm the version directory, hostname and port when reviewing changes. `localhost:8000` and `127.0.0.1:8048` have separate browser storage and caches; an already-open tab may still show older files.

## Requests and staff workflow

The four-step wizard collects a model, filament, project details and final review. Submitters track their own active/ready/past jobs, progress and pickup details. Staff have Overview, assigned work and **All jobs** with search, status/material filters, sorting and pagination.

```text
Submitted → Level 4 approval → Approved / available → Claimed / preparation
          → Print authorization requested → Level 4 authorization
          → Printing → Ready for pickup → Collected
```

Level 4 rejection/revision requires a reason. Level 2–3 cannot see pending/rejected requests; owners can through My Print Jobs. Assigned staff advance preparation/printing; Level 4 reassignment invalidates prior print authorization. Collection is recorded once. Legacy progress is retained without invented approvals/timestamps.

| Area | Current behavior |
| --- | --- |
| Models | STL, OBJ or 3MF, up to **25 MiB per file**; the wizard selects one file. Services/details support up to five attachments and 50 MiB total. Rotate/pan/zoom/reset previews and download retained originals. |
| Model links | HTTPS only, no embedded credentials, at most 2,048 characters. Files and links are mutually exclusive. MakerWorld previews are optional; other valid links are included with the request. |
| Validation | Project name 1–100 characters; notes at most 500; purpose/material/filament must be valid. New file requests require original bytes or a verified stored attachment. Legacy filename-only records remain readable and labelled. |
| Filament | PLA/PETG/TPU colour palette with verified HEX, derived RGB, independent Available/Low Stock flags and stable IDs. Available low-stock options remain selectable. Deleted/unavailable selections require a new choice; saved jobs retain request-time material/colour snapshots. |
| Hours | Own balances/requests for Level 2–3; Level 4 reviews, credits/corrects other eligible staff and views linked contributions/history. Precision 0.01 hour; no negative balances, self-review, duplicate decisions or personal Level 4 balance. |
| Inbox | Own entries, including Level 1 rejections. Opening removes an entry while retaining temporary details. Actions check current records. Pickup delivery is separate and simulated in demo mode. |
| Presence | Staff see supervisor presence. Each Level 4 changes only their own status; presence never bypasses either approval gate. |

## Demo identities and permissions

The profile menu selects built-in identities or creates local accounts only after a successful save. Roles inherit lower levels, except Level 4 personal hours.

| Level | Role · built-in profiles | Additional access |
| --- | --- | --- |
| 1 | Regular School Teacher · Mr. Q | Submit requests; own jobs, progress, pickup details and inbox. |
| 2 | Print Farm Member · Leddy Tiang, Whunder Tar | Staff portal, approved job claiming/preparation/printing, read-only filament and supervisor presence, notification retry, own hours/requests. |
| 3 | Senior Print Farm Member · Darry Hing, Fayren Ju | Add/edit/delete filament and change availability/low-stock flags. |
| 4 | Print Farm Teacher · Mr. Uw | Both approval gates, reassignment, own presence and hours/contribution administration. |

API users/permissions come from the backend; demo selection/account creation is unavailable.

## Demo and API modes

Demo is the explicit default. To select API mode, insert configuration **before the application module script** in `index.html`:

```html
<script>
window.PRINT_FARM_CONFIG = {
  MODE: "api",                  // "demo" or "api"
  API_BASE_URL: "/api/v1",
  POLL_INTERVAL_MS: 30000
};
</script>
```

Reload after configuration changes. API mode never falls back to demo records. It uses session cookies, in-memory CSRF, idempotency keys and version preconditions; authentication tokens never enter LocalStorage. Loading/session, validation, permission, network and conflict states are explicit. Duplicate submissions are guarded; uncertain writes retain retry keys and conflicts require refreshed review. Polling preserves unfinished wizard/dirty forms; the refresh interface can support server events.

Google is the intended future login; no Google account access is needed here. See the [API/session contract and server permission rules](docs/backend-integration.md) and [service interfaces/schemas](src/services.d.ts).

## Data and file safety

Operational browser storage is confined to demo adapters. Demo records are per browser/origin, not shared across devices or secure against local edits.

| Data | Storage / compatibility |
| --- | --- |
| Jobs, inventory, hours, contributions, inbox and delivery records | Existing `three-d-print-farm-demo-v3` key; explicit record schema **4**. The key is retained for compatibility. |
| Model originals | Existing IndexedDB `three-d-print-farm-model-files`, version 1, `originals` store. Demo files are retained locally; API files require confirmed server storage. |
| Drafts | `three-d-print-farm-draft-v2:<owner-id>`, schema 1. Unscoped legacy drafts are retained for owner recovery, not assigned automatically. |
| Demo accounts / selection | `three-d-print-farm-demo-accounts` / `three-d-print-farm-demo-role`; existing profiles remain usable. |
| Appearance / sidebar | Harmless local preferences, permitted in either mode. |

Migrations retain exact recovery snapshots. Invalid records/JSON, newer schemas and storage failures preserve saved bytes/recoverable records, show export/recovery guidance and block unsafe writes instead of restoring seeds. Exports include raw records/profiles/drafts, not binary originals. Identity changes clear unfinished fields, files, previews, dialogs and inbox details before restoring the next owner's draft.

**Reset Local Data** explicitly deletes live demo records, profiles, drafts, preferences and originals, and cancels simulated deliveries; unrelated data/recovery snapshots survive. Preview failures preserve original downloads, and viewer resources/temporary URLs are cleaned up. Servers must independently enforce file, parser, geometry, ownership and resource limits.

## Design, fonts and equipment

Responsive public/staff screens, forms and bounded menus support light/dark themes, keyboard navigation and reduced motion. CSS layers: `styles.css` foundation, `apple-interface.css` shared treatment, `apple-public.css` gallery/navigation.

Active stack: **`"Inter", Arial, sans-serif`**, including controls/colour codes. Only Inter 4.1 variable (100–900), `assets/fonts/InterVariable.woff2`, is bundled with its [SIL OFL notice](assets/fonts/Inter-LICENSE.txt). Old declarations remain in unloaded backups. Keep `index.html` module mappings and CSS/font asset revisions current to avoid mixed caches. See [Safari glyph verification](docs/font-verification.md) or run [`tests/font-check.html`](tests/font-check.html) in the browser/URL being checked.

Listed FDM equipment: **A1 mini**, 180 × 180 × 180 mm, single colour; **H2S**, 340 × 320 × 340 mm, multi-colour. Volumes are nominal; staff confirm fit/material/orientation/assignment. Laser/cutting is outside this service.

## Routes and source map

| Routes | Purpose / access |
| --- | --- |
| `#/`, `#/printers`, `#/faq` | Public information and section navigation. |
| `#/get-started`; `#/my-jobs`, `#/my-jobs/:id` | Request wizard and owning submitter's tracking. |
| `#/staff`, `#/staff/jobs`, `#/staff/active`, `#/staff/jobs/:id` | Staff overview, complete list, assigned work and job details; Level 2+. |
| `#/staff/materials`, `#/staff/materials/:id`, `#/staff/materials/new` | Filament list/details; changes/new entries require Level 3+. |
| `#/staff/hours`, `#/staff/hours/staff/:userId` | Own hours for Level 2–3; administration/staff detail for Level 4. |

Legacy queue/contributions links open Overview/permitted Hours. Malformed routes show not-found. `routes.js`/`authorization.js` define routing/permissions.

`services.js`, `authService.js` and `filesService.js` select service implementations; `demo/` owns operational browser storage; `httpServices.js`, `httpSession.js` and `apiClient.js` implement the HTTP boundary. `requestValidation.js`/`fileValidation.js` share validation; page modules handle UI; `jobModelFiles.js`/`modelPreview.js` handle originals/viewing. `docs/` contains detailed contracts/results, `tests/` contains synthetic regression fixtures, and local `work/` retains development notes/original-file backups (excluded from published source).

## Verify and next steps

Node.js is needed only for the automated checks:

```sh
node --test tests/*.test.mjs
for f in src/*.js src/demo/*.js; do node --check "$f" || exit; done
```

Recorded **2026-10-30**: **70 Node tests** and **1,080 browser assertions** passed; Safari subsequently verified loaded Inter against a fresh font. See [commands, fixtures and limits](docs/verification.md). Use a dedicated synthetic-data origin for browser checks. HTTP tests are mocked; native file-picker, real-device and full cross-browser acceptance remain release work. No build/lint/type-check pipeline is configured.

Remaining: authorized API, transactional database/idempotent ledger, private file storage/scanning/quotas, Google enrollment/roles, real notifications, backups/monitoring, security/accessibility acceptance and HTTPS deployment. Cancellation, failed-print and reprint rules need school decisions; no new policy or printer-control actions are provided.

Code: [MIT license](LICENSE). Historical release notes are preserved locally in the original README backup under the ignored `work/` directory.
