# 3D Print Farm Website — v1.5 Beta

**Version 1.5 Beta** · A responsive, frontend-only demonstration of the school's print request workflow, role-based access controls, and staff hours management.

![version](https://img.shields.io/badge/version-v1.5--beta-blue)
![release](https://img.shields.io/badge/status-beta-orange)
![stack](https://img.shields.io/badge/stack-vanilla%20JavaScript-f7df1e?logo=javascript&logoColor=black)
![storage](https://img.shields.io/badge/storage-browser%20localStorage-lightgrey)

> **Beta prototype:** The identities and access controls are for demonstration only. Do not use this application with real student information, production requests, secured staff work, or authoritative hour or stock records.

## Release summary

v1.5 Beta adds staff hours management to the Staff Dashboard. Level 2 and Level 3 staff use **Hours** to view their own balance and history and submit adjustment requests. Level 4 staff use one combined **Hours** page to manage Level 2 and Level 3 balances, review requests, and view hours and student contribution activity together. Level 4 staff do not have a personal hours balance.

The application remains a static HTML, CSS, and vanilla JavaScript demo. Roles and shared demo data are stored in the current browser. It does not authenticate users or provide trusted server-side authorization, a database, or shared multi-device persistence.

## Quick start

Requires **Python 3**. There is no package installation or build step.

~~~sh
python3 -m http.server 8000
~~~

Open http://localhost:8000 and stop the server with Control-C. An internet connection is needed for the pinned Three.js and fflate modules loaded from jsDelivr.

## Demonstration identities and permissions

Open **Demo identity** in the header to choose among six built-in demo identities. The active name, role title, and access level appear in the selector. Use **Create New Account** at the bottom of the menu to add another local demo profile and choose its access level. New profiles are saved in this browser under `three-d-print-farm-demo-accounts`; the selected identity is stored under `three-d-print-farm-demo-role`. If storage is unavailable, newly created profiles last for the current page session.

| Level | Role and identity | Access |
| --- | --- | --- |
| 1 | Regular School Teacher · Mr. Q | Public pages, My Jobs, and print request submission |
| 2 | Print Farm Member · Leddy Tiang; Whunder Tar | Staff Dashboard, job workflow, simulated notification retry, read-only filament details, own Hours balance and history, and hour adjustment requests |
| 3 | Senior Print Farm Member · Darry Hing; Fayren Ju | Level 2 capabilities plus filament changes; own Hours balance and adjustment requests |
| 4 | Print Farm Teacher · Mr. Uw | Level 3 capabilities plus job reassignment and the combined Hours page for giving hours to Level 2 and Level 3 staff, reviewing requests, and viewing contribution and balance history; no personal hours balance |

The role and permission catalog is in `src/authorization.js`. Page routes, forms, actions, and hours service operations check their required permission in the browser. This is application behavior for the demo, not production security: users can change local browser data and frontend code.

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
| `#/` | Public home page and FAQ |
| `#/get-started` | All identities; print request workflow |
| `#/my-jobs` | All identities; local demo requests for the selected identity |
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

The public homepage includes project information, use cases, and FAQs. Get Started collects a model file, print settings, and project details across a four-step request workflow. It accepts STL, 3MF, and OBJ files up to **25 MB** and previews models in the browser. A direct HTTPS model URL can be loaded when its host permits cross-origin access. Model bytes are used for preview and validation only; no model is uploaded.

The Staff Portal retains job review, active job assignment, job status updates, simulated pickup notifications, and filament management. The Overview's Recent Jobs table shows each print name in white above a muted, shortened `PFN-****` print number; file and material columns are omitted. The same shortened number appears throughout job pages and when copied. Student contribution records are available to Level 4 in the combined Hours activity history. These actions update local demo data only. Filament values use a verified HEX code as the source of truth and derive RGB for display. New browser installations start with an empty filament inventory because the repository contains no verified stock records.

## Data, setup, and limitations

Jobs, notifications, inventory, contribution records, hour requests, and hour transactions use the browser localStorage key `three-d-print-farm-demo-v3`. Additional demo profiles use `three-d-print-farm-demo-accounts`; the active identity uses `three-d-print-farm-demo-role`. These records are local to this browser and origin, are not shared between users or devices, and are removed if browser data is cleared. Where supported, the app uses the browser Web Locks API to serialize same-origin writes; localStorage still cannot guarantee database-grade transactions or consistency across devices.

The repository has no backend, database, Google authentication, email delivery, printer control, or server-side authorization. A production system must authenticate users on a server, enforce permissions for every protected operation, and store hours and audit history in a shared transactional database. A frontend role selector and client-side checks do not prove a user's identity or securely protect data.

## Project structure

~~~text
.
├── index.html
├── favicon.svg
├── README.md
└── src/
    ├── app.js                    # Hash routing, rendering, and guarded UI actions
    ├── authorization.js          # Central role, permission, route, and action definitions
    ├── authService.js            # Demo identities and identity switching boundary
    ├── hoursPages.js             # Level 2 and 3 personal Hours and Level 4 combined management view
    ├── publicPages.js            # Public home, FAQ, and access-denied page
    ├── studentPages.js           # Demo My Jobs page
    ├── staffPages.js             # Staff portal and materials
    ├── requestWizard.js          # Print request workflow
    ├── pageShared.js             # Shared navigation, role selector, and appearance controls
    ├── services.js               # Local jobs, inventory, hours, validation, persistence
    ├── filesService.js           # Model file and HTTPS URL validation
    ├── modelPreview.js           # Three.js model preview
    ├── notificationsService.js
    ├── apiClient.js              # Inactive API placeholder
    └── styles.css                # Components and responsive layout
~~~

## Verification

The repository has no automated test suite, package manifest, build, lint, or type-check configuration. For a manual review, run the quick-start server and switch among the built-in and newly created demo identities. Confirm both Level 2 and Level 3 profiles only see their own Hours balance, history, and request form; Level 4 sees the combined page without a personal balance. Give hours to an existing Level 2 or Level 3 profile and confirm its balance and personal history update, then review the linked activity once in Level 4's combined history. Review a request as Level 4, refresh to confirm saved history and status, and check that deductions cannot create a negative balance. These browser-side checks do not replace backend authorization or shared accounting.

---

<sub>For demonstration only. Do not use with real student data or production hours.</sub>
