# 3D Print Farm Website — UPDATE v1.4 Beta

**Version 1.4 Beta** · A responsive, frontend-only demonstration of the school's print request workflow and role-based access control.

![version](https://img.shields.io/badge/version-v1.4--beta-blue)
![release](https://img.shields.io/badge/status-beta-orange)
![stack](https://img.shields.io/badge/stack-vanilla%20JavaScript-f7df1e?logo=javascript&logoColor=black)
![storage](https://img.shields.io/badge/storage-browser%20localStorage-lightgrey)

> **Beta prototype:** The identities and access controls are for demonstration only. Do not use this application with real student information, production requests, secured staff work, or authoritative stock records.
> 
## Upcoming Planned Updates

Estimated Oct 24th, v1.5b: Proper implementation for Student Hours. Level 2-3 can check there own hours. Level 4 can add hours to Level 2-3s. 

## Release summary

UPDATE v1.4 Beta adds a demonstration identity switcher and centralized role-based access control for four fictional users. The switcher updates navigation, protected hash routes, filament controls, and staff actions immediately. It does not authenticate users or prove a real person's identity.

The site remains a static HTML, CSS, and vanilla JavaScript application. Jobs, filament, contribution records, notifications, and the active demo role are stored locally in the current browser. No backend, Google Sign-In, or server-side authorization is implemented.

## Quick start

Requires **Python 3**. There is no package installation or build step.

~~~sh
python3 -m http.server 8000
~~~

Open http://localhost:8000 and stop the server with Control-C. An internet connection is needed for the pinned Three.js and fflate modules loaded from jsDelivr.

## Demonstration identities and permissions

Open **Demo identity** in the header, then choose one of the four identities. The active name, role title, and access level appear in the selector. The selection is saved in this browser under three-d-print-farm-demo-role; if storage is unavailable, it lasts for the current page session.

| Level | Role and identity | Permission IDs | Access |
| --- | --- | --- |
| 1 | Regular School Teacher · Mr. Q | print_request.create, my_jobs.view | Public pages, My Jobs, and print request submission |
| 2 | Print Farm Member · Leddy Tiang | Level 1 plus staff_dashboard.view, jobs.manage, contributions.manage, notifications.retry, filament.view | Staff Dashboard, existing job workflow, contribution records, simulated notification retry, and read-only filament details |
| 3 | Senior Print Farm Member · Darry Hing | Level 2 plus filament.change | Add and change filament details, availability, and stock |
| 4 | Print Farm Teacher · Mr. Uw | Inherits all Level 1–3 permissions plus jobs.reassign | Same capabilities as Level 3, plus reassignment of active jobs to Level 2+ members |

The role permission matrix is explicit in src/authorization.js. All roles can submit print requests. Level 1 cannot open staff routes. Level 2 can view filament inventory but cannot add, edit, toggle availability, or adjust stock. Filament-changing pages and actions require filament.change, assigned at Level 3 and inherited at Level 4. Level 2 job and contribution operations use separate permissions from staff_dashboard.view. Only Level 4 can reassign an active, already-assigned job, and eligible targets are limited to Level 2 and above.

If an identity opens a page it cannot access, the application shows an access-denied page. Controls unavailable to the current identity are hidden or rendered read-only, and action handlers check permissions again before acting.

## Routes

| Route | Access |
| --- | --- |
| #/ | Public home page and FAQ |
| #/get-started | All identities; print request workflow |
| #/my-jobs | All identities; local demo requests for the selected identity |
| #/staff | Level 2 and above |
| #/staff/active | Level 2 and above |
| #/staff/materials | Level 2 and above; filament changes require Level 3 |
| #/staff/materials/new | Level 3 and above |
| #/staff/materials/:id | Level 2 and above; read-only at Level 2 |
| #/staff/hours | Level 2 and above |
| #/staff/jobs/:id | Level 2 and above |
| #/section/faq | Public FAQ anchor |

Legacy links to #/staff/queue redirect to the Staff Overview.

## Permission and identity architecture

src/authorization.js is the central role and permission catalog. It holds stable role IDs, levels, inherited roles, permissions, and the route/action/form permission maps. Permission aggregation follows the inheritance chain: the Print Farm Member inherits Level 1, Senior Member inherits Level 2, and Print Farm Teacher inherits Level 3.

src/authService.js supplies fictional demo identities separately from role definitions and exposes a small authorization interface (getCurrentIdentity, getCurrentRole, can, and switchRole). This is the integration boundary for a future authentication provider: a verified account identity could be resolved to an application-assigned role while keeping permission checks centralized.

The current checks run in browser JavaScript and browser storage can be edited by a user. They demonstrate application behavior only; they are not secure authorization. A production system must verify Google Sign-In tokens on a backend, map trusted account IDs to roles on the server, enforce permissions for every protected API operation, and use shared server-side persistence. Selecting a fictional demo identity is not Google authentication.

## Existing features

The public homepage includes project information, use cases, and FAQs. Get Started collects a model file, print settings, and project details across a four-step request workflow. It accepts STL, 3MF, and OBJ files up to **25 MB** and previews models in the browser. A direct HTTPS model URL can be loaded when its host permits cross-origin access. Model bytes are used for preview and validation only; no model is uploaded.

The Staff Portal retains job review, active job assignment, job status updates, simulated pickup notifications, filament management, and student contribution hours. These actions update local demo data only. Filament values use a verified HEX code as the source of truth and derive RGB for display. New browser installations start with an empty filament inventory because the repository contains no verified stock records.

## Data, setup, and limitations

Jobs, notifications, inventory, and contribution records use the browser localStorage key three-d-print-farm-demo-v3. They are local to this browser and origin, are not shared between users or devices, and are removed if browser data is cleared. Role selection is stored separately. This repository has no backend, database, Google authentication, email delivery, printer control, or server-side authorization.

## Project structure

~~~text
.
├── index.html
├── favicon.svg
├── README.md
└── src/
    ├── app.js                    # Hash routing, page rendering, and guarded UI actions
    ├── authorization.js           # Central role, permission, route, and action definitions
    ├── authService.js             # Demo identities and identity switching boundary
    ├── publicPages.js             # Public home, FAQ, and access-denied page
    ├── studentPages.js            # Demo My Jobs page
    ├── staffPages.js              # Staff portal and read-only/managed filament views
    ├── requestWizard.js           # Request workflow
    ├── pageShared.js              # Shared navigation, role selector, and appearance controls
    ├── services.js                # Local jobs, inventory, hours, validation, persistence
    ├── filesService.js            # Model file and HTTPS URL validation
    ├── modelPreview.js             # Three.js model preview
    ├── notificationsService.js
    ├── apiClient.js                # Inactive API placeholder
    └── styles.css                  # Components and responsive layout
~~~

---

<sub>For demonstration only. Do not use with real student data or production requests.</sub>
