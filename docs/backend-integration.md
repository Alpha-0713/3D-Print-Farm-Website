# Backend integration contract · 3D Print Farm v2.4

This milestone is a working frontend with interchangeable demo and HTTP services. It is **not production ready**: no backend, database, Google login, deployed service, real email sender or printer controller is included. Existing approval gates and Level 1–4 rules remain in place. Cancellation, failed-print and reprint policy remain undecided below.

## Runtime configuration

Serve the directory as static ES modules. With no configuration the app explicitly uses `demo` mode. To select API mode, set this before the module script in `index.html` (a deployment may inject an equivalent external configuration script):

```html
<script>
window.PRINT_FARM_CONFIG = {
  MODE: "api",                 // "demo" or "api"; other values fail closed
  API_BASE_URL: "/api/v1",    // HTTPS on production deployments
  POLL_INTERVAL_MS: 30000
};
</script>
```

`src/config.js` freezes the choice for that page load. There is no connectivity-based mode selection, role query parameter, UI mode toggle or API-to-demo fallback. In API mode demo storage modules are not imported. Browser theme and sidebar preferences can remain local in either mode. All API requests include credentials and disable response caching; same-origin hosting is recommended. A cross-origin API must explicitly allow the frontend origin, credentialed CORS, the methods and headers described here, and cookie delivery. Never use wildcard credentialed CORS. Production must use HTTPS.

The API mode is testable against mocks now; an unavailable server produces session/network errors rather than populated demo pages. Authentication controls accurately show session information and have no working-looking Google button. Reload the app after changing configuration.

## Service boundaries

`src/services.js` selects an implementation once and exports jobs, inventory, contributions, hours, personal inbox, presence, directory, diagnostics and refresh services. `src/authService.js` selects the session implementation. `src/filesService.js` selects upload/original operations and shares storage-independent validation from `fileValidation.js`. `services.d.ts` defines domain records and service signatures. Pages await service calls; only the demo implementation knows operational LocalStorage/IndexedDB details. `modelFilesStore.js` remains a **demo-only compatibility export for regression fixtures**, not a UI persistence dependency. `attachments.js` contains the storage-independent legacy attachment projection.

- Jobs: lists, paginated staff search, personal tracking, creation, history and the existing workflow actions.
- Inventory: public material/colour availability; protected add/edit/status/delete operations.
- Hours: personal dashboard, adjustment requests, staff overview/detail/activity, reviews and direct accounting. Contributions are a separate service for existing non-staff student records.
- Notifications: delivery status and protected retry, separate from the personal inbox. Opening an inbox entry removes that user's entry and returns a detached detail snapshot.
- Presence: staff-readable Level 4 status and self-only supervisor changes.
- Files: original upload, metadata/attachment verification and authenticated original download. Preview uses a downloaded original and the existing local STL/OBJ/3MF viewer; no server preview generator is implemented.
- Session: `getState`, `load`, `subscribe`, `getCurrentIdentity`, `getCurrentRole`, `can`. Demo-only identity selection/account creation is disabled in API mode.
- Refresh: `subscribe(listener)` returns an unsubscribe function; `refresh()` reads the latest session in API mode. The demo adapter listens for same-origin changes. The API adapter uses bounded polling and online events. A future SSE/WebSocket adapter may invoke the same listener. Client cleanup unsubscribes and disposes previews on page exit. Background refresh avoids replacing an unfinished wizard, focused/dirty form or open dialog; inbox state can refresh independently.

The production browser does not call LocalStorage/IndexedDB for business records. The session's user ID is stable and backend-owned. The API `can` check uses only the permissions returned by `/session`, even when they differ from the display role's built-in demo matrix. Server authorization remains required regardless of client checks.

## Wire conventions and schemas

Base path: `/api/v1`. IDs are opaque strings, URL-encoded in paths. Dates/times are ISO 8601 strings (UTC for event times); work dates are `YYYY-MM-DD`. Hours are integer hundredths (`balanceCenti`, `deltaCenti`) in persisted responses. No floating point balances. Resource `version` is a monotonically increasing positive integer.

JSON success responses are `{ "data": value }`. A single-record response returns the record directly in `data`; absence returns 404, except session signed-out and a missing personal draft. Collection endpoints return:

```json
{ "data": { "items": [], "total": 0, "page": 1, "pageSize": 20 } }
```

Page numbers start at 1; page size is 1–100. Apply authorization **before** searching, counts and pagination. Sort deterministically with ID as a tie-breaker. The full staff list uses page size 20. Compatibility views consume every page rather than truncating old work. Presence and job-event endpoints intentionally return plain arrays, as do staff activity and the file-upload receipt.

Failures use the appropriate HTTP status and this shape:

```json
{ "error": { "code": "validation", "message": "Explain the fix", "fields": { "projectName": "Required" }, "requestId": "trace-id" } }
```

400/422 = validation; 401 = expired session; 403 = permission denied; 404 = unavailable resource; 409/412 = conflict; 429 = rate limited; 5xx = server error. A nonconforming success envelope is an explicit invalid-response error. Transport failures and the 15-second request timeout become network errors. No mutation is automatically retried. The UI keeps the form/key and reports an unconfirmed operation. Errors never turn into demo records.

### Session

`GET /session` returns either `{status:"signed-out"}` or:

```json
{ "data": {
  "status": "signed-in",
  "user": { "id": "stable-id", "name": "Authenticated name", "email": "user@example.org", "roleId": "regular_teacher" },
  "permissions": ["print_request.create", "my_jobs.view"],
  "csrfToken": "session-bound-token-kept-only-in-memory"
} }
```

`loading`, `signed-out`, `signed-in`, `expired-session` and `error` are distinct client states. A failed session refresh clears previous user/permissions; 401 also expires the session immediately. A user change clears unfinished wizard state, file bytes, preview resources, dialogs, hour edits and inbox snapshots before another owner's draft can load. No authentication/refresh token is stored in LocalStorage, IndexedDB or URL parameters. CSRF tokens remain in memory and accompany writes as `X-CSRF-Token`.

### Requests and jobs

`POST /jobs` accepts only:

```json
{
  "projectName": "Sensor mount",
  "purpose": "Class project",
  "notes": "Check orientation",
  "inventoryId": "filament-stable-id",
  "requestedFilament": { "material": "PLA", "color": "Gray" },
  "modelUrl": "https://example.org/model.stl",
  "attachmentIds": []
}
```

`modelUrl` is null for file requests. Exactly one source is permitted: a URL or 1–5 stored attachment IDs. File requests must not rely on a filename/size alone. A URL is at most 2048 characters, HTTPS only, without embedded credentials. Project name is 1–100 characters; notes at most 500; colour at most 60. Purpose is one of Personal project, Class project, Functional prototype, Engineering design, Other. Materials are PLA/PETG/TPU. Optional `layerHeight` is one of `0.12`, `0.16`, `0.20`, `0.24`, `0.28` (millimetres); optional infill is an integer 0–100. Existing legacy display values remain readable and are not rewritten into new requests. The current wizard does not add new layer/infill controls.

The service boundary and wizard both validate model URLs. The service validates every field and requires a current stable inventory ID. The server must compare `requestedFilament` with that inventory record; changed/deleted/unavailable choices return a conflict or validation error for user review. It must never resolve a missing ID to a similarly named colour.

The server supplies ownership, recipient, initial state, timestamps, versions, history and request-time filament snapshot. Returned Job includes `id`, `version`, `projectName`, `submitterId`, `submitterName`, `submitterEmail`, `recipientEmail`, `fileName`, `fileSize` (human-readable compatibility text), optional `modelUrl`, `attachments`, `inventoryId`, `material`, `color`, `hexColor`, `filamentSnapshot:{id,material,color,hexColor}`, `purpose`, `notes`, `layerHeight`, `infill`, `submittedAt`, `status`, approval/authorization, assignment, pickup and history. Existing filenames and material/colour details remain readable after inventory removal. Old filename-only jobs are labelled as lacking an original; they are never treated as uploaded.

Status values: SUBMITTED, APPROVED, IN_PROGRESS, AWAITING_AUTHORIZATION, AUTHORIZED, PRINTING, COMPLETED, COLLECTED, CANCELLED, REJECTED. Approval is `{decision,byId,by,at,reason}`. Authorization also has a unique attempt `id`, `requestedById`, `requestedBy`, `requestedAt`. Legacy progress may retain `{legacy:true}` approval without fabricated approval timestamps. History events have `{type,at,by,byId?,note?,visibility?}`; absent legacy times stay unknown. Cancellation is readable, not an available new transition.

### Files and previews

`POST /attachments` is multipart FormData with repeated `files` parts and an `Idempotency-Key`. Return `data:[{id,name,sizeBytes,type,lastModified?,status:"stored"}]` **only after durable storage and validation succeed**. A processing/quarantined receipt is not a stored attachment and cannot create a job. Each upload must match the expected filename and byte count. The client then verifies `GET /attachments/{id}` before creating the job. The server must repeat ownership/readiness verification inside job creation; a client receipt is not authority.

`GET /attachments/{id}` returns attachment metadata and status. `GET /attachments/{id}/original` returns authenticated binary original bytes (correct Content-Type, byte length and safe Content-Disposition). The client checks byte count, creates a local File and uses the existing viewer/download controls. This is the preview contract: a view-authorized original is the preview source. Do not expose public permanent attachment URLs. A future derived preview endpoint may be added separately, with the same authorization and documented geometry limits. The existing viewer catches parser/render errors, disposes WebGL resources and temporary module/object URLs, and retains original download availability after preview errors. Downloads use temporary object URLs that are revoked.

Client limits: STL/OBJ/3MF extensions; 1–25 MiB per file; at most five files and 50 MiB per request; filenames at most 255 characters. The future server must enforce these independently and inspect actual content rather than extension/MIME claims. Also enforce upload/user quotas, decompressed 3MF ZIP size and entry counts, path traversal protections, parser time/memory budgets, vertex/triangle/mesh limits, finite geometry bounds, content scanning and rate limits. Current browser geometry validation runs after parsing and is not a defense against malicious archives or resource exhaustion. Server-side fetching of model URLs is **not required**; if later introduced it needs SSRF protections, redirect/IP checks, network isolation and download/time limits. Existing MakerWorld metadata is an optional, untrusted browser preview and is never proof of a stored original.

Unclaimed API uploads need server-side expiry/garbage collection. Do not delete an uploaded original after a timeout creating its job: the job may have succeeded. Retrying uses the same upload key and job key. Local demo originals keep the existing IndexedDB database `three-d-print-farm-model-files`, version 1, store `originals`; no existing originals are cleared or renamed by migrations.

## Endpoint inventory and required server checks

Every protected operation authenticates from the server session, authorizes the user and record, validates the body, and writes an audit trail as appropriate. Never accept a role/owner/assignee assertion as authorization. Permissions below refer to the unchanged strings in `authorization.js`.

| Method and endpoint | Request / response in `data` | Required checks |
| --- | --- | --- |
| GET `/session` | Session above | Validate server session, current account and effective permissions |
| GET `/inventory` | Paged Inventory; optional `available` | Public projection of selectable material/colour; avoid exposing private operational fields |
| GET `/inventory/{id}` | Inventory | Same public projection |
| POST `/inventory` | `{material,color,hexColor}` → Inventory | `filament.change`, Level 3–4; unique material/colour, six-digit HEX |
| PATCH `/inventory/{id}` | `{color,hexColor}` → Inventory | Same; version; never change stable ID |
| POST `/inventory/{id}/availability`, `/low-stock` | `{}` → Inventory | Same; atomic toggle, idempotency and version |
| DELETE `/inventory/{id}` | null or removed Inventory | Same; version; preserve job snapshots and audit/history |
| GET `/my/jobs`, `/my/jobs/{id}` | Paged Jobs / Job | `my_jobs.view`; stable submitter ID; legacy email only as an explicit migration rule |
| GET `/jobs` | Paged Jobs | `jobs.manage`; hide unapproved/rejected jobs from Level 2–3; Level 4 sees all; filters `search,status,material,sort,assignedTo=me,active=true` |
| GET `/jobs/summary` | `{unclaimed,pendingReview,inProgress,printing,completedToday,total}` | Staff visibility before aggregation |
| GET `/jobs/{id}`, `/jobs/{id}/events` | Job / HistoryEvent[] | Staff visibility; owning Level 1 can read own record only; staff personal tracking uses `/my/jobs` |
| POST `/jobs` | Creation schema → Job | `print_request.create`; session-owned submitter/recipient, valid source/current filament, stored attachment ownership; atomic idempotency |
| POST `/jobs/{id}/review` | `{decision:"approved"|"rejected",reason}` → Job | `jobs.approve`, Level 4; SUBMITTED only, once; rejection reason 1–500 |
| POST `/jobs/{id}/claim` | `{}` → Job | `jobs.manage`; APPROVED and unassigned; assign authenticated actor atomically |
| POST `/jobs/{id}/assignment` | `{assigneeId}` → Job | `jobs.reassign`, Level 4; eligible Level 2–4 target; claimed/nonclosed; invalidate prior print authorization |
| POST `/jobs/{id}/authorization-request` | `{}` → Job | Assigned staff only; initially approved IN_PROGRESS job; unique review attempt |
| POST `/jobs/{id}/authorization-review` | `{decision:"authorized"|"revision",reason,expectedRequestedAt,expectedAuthorizationId}` → Job | Level 4 `jobs.approve`; matching pending attempt/version; revision reason 1–500 |
| POST `/jobs/{id}/start` | `{}` → Job | Assigned staff, AUTHORIZED with granted current authorization; this records status, no printer control |
| POST `/jobs/{id}/complete` | `{pickupLocation,pickupInstructions,notifyRecipient}` → `{job,notification}` | Assigned staff, PRINTING; location 1–120, instructions ≤500; enqueue server notification once |
| POST `/jobs/{id}/pickup` | `{pickupLocation,pickupInstructions}` → Job | Staff; COMPLETED only; same lengths, audit changes |
| POST `/jobs/{id}/collect` | `{}` → Job | Staff; COMPLETED only; record collection once |
| GET `/my/inbox` | Paged InboxEntry | Any authenticated user; own entries only, including Level 1 rejections |
| POST `/my/inbox/{id}/open` | `{}` → detached InboxEntry | Own entry only; remove only that user's entry, idempotent replay |
| GET `/notifications`, `/notifications/{id}` | Paged DeliveryNotification / record | Staff; same job visibility; optional jobId filter |
| POST `/notifications/{id}/retry` | `{}` → DeliveryNotification | `notifications.retry`; failed delivery only; version/idempotency; safe email deduplication |
| GET `/presence` | `{id,name,present,updatedAt}[]` | Staff; supervisor public work-presence projection only |
| PUT `/presence/me` | `{present:boolean}` → presence record | `supervisor.presence`, Level 4; own ID from session |
| GET `/staff` | Paged `{id,name,email?,roleId}` | Staff directory limited to eligible assignee fields |
| GET `/my/draft` | DraftFields or null | Own draft only; never return another user's draft |
| PUT `/my/draft` | `{schemaVersion:1,fields}` → true/null | Own bounded allowlisted fields; no selected File, preview or role |
| DELETE `/my/draft` | null | Own draft only |
| GET `/my/hours` | `{identity,balanceCenti,transactions,requests,pendingCount}` | `hours.view_own`, Level 2–3 only; own records |
| GET `/hours/staff` | Paged staff balances with `id,version,name,roleId,roleTitle,level,balanceCenti,latestTransaction,pendingRequests`; optional search | `hours.admin`, Level 4 |
| GET `/hours/staff/{id}` | Staff detail plus `version,transactions,requests` | Level 4; target Level 2–3; version describes balance |
| GET `/hours/staff/{id}/activity` | Activity[] | Same |
| GET `/hour-requests` | Paged HourRequest, optional status | Level 4 `hours.admin` |
| POST `/hour-requests` | `{adjustmentType:"add"|"subtract",hours,reason,submissionKey}` → HourRequest | `hours.request`, Level 2–3, own ID, positive decimal ≤2 places, nonempty reason ≤500 |
| POST `/hour-requests/{id}/approve`, `/reject` | `{}` / `{rejectionReason}` → `{request,transaction}` / HourRequest | Level 4; no self-review; Pending only; version; one atomic ledger decision; never negative balance |
| POST `/hours/staff/{id}/contributions` | `{date,hours,activity,submissionKey,expectedBalanceCenti}` → `{contribution,transaction}` | Level 4, other Level 2–3 staff; 0.01–24 hours; real nonfuture date, activity 1–300; balance/version match; linked records atomically |
| POST `/hours/staff/{id}/adjustments` | `{adjustmentType:"subtract",hours,reason,submissionKey,expectedBalanceCenti}` → HourTransaction | Level 4, other Level 2–3 staff; positive ≤2 decimals; nonnegative balance; version + expected balance; audit |
| GET `/contributions` | Paged Contribution; student/from/to filters | Level 4 `contributions.manage` |
| POST/PATCH `/contributions[/{id}]` | `{student,date,hours,activity}` → Contribution | Same; name 1–100, 0–24 positive hours, activity 1–300, valid nonfuture date; reject edits to balance-linked contributions; staff credits must use Hours flow |
| POST/GET `/attachments[/{id}]`, GET `/attachments/{id}/original` | Contracts above | Upload: request permission and quota. Metadata/download: uploading owner before claim, otherwise job read authorization; deny arbitrary ID access |

## Idempotency, concurrency and delivery

All writes send an `Idempotency-Key`. A request wizard retains its creation key through retries; original upload derives `<request-key>-files`. Existing hours submission keys persist through retries. Other mutations retain an in-memory operation key on network/5xx failure and collapse concurrent identical calls. Server deduplication must be transactional, scoped by authenticated principal + endpoint + key, store request hash and complete result, reject key reuse with a different payload, and replay the original outcome. Accounting keys must remain durable with ledger records; set and document retention for other operation results. This frontend does not persist authentication or network retry state across a closed tab; an uncertain operation must be reconciled from server records before starting a fresh form.

Existing resource writes send `If-Match: "<version>"` and reject locally if no resource version has been read. Server updates must compare and increment the version atomically; stale versions return 409 or 412 with no side effect. Job state/assignment/authorization-attempt checks remain required in addition to version checks. Balances require both the version and expected integer balance. Inbox-open is an idempotent consume; presence PUT is an absolute self-setting; draft PUT is own-draft last-write-wins (no separate version precondition). Immutable new-record operations have idempotency rather than an existing resource version.

The adapter conservatively pins a previously read resource version so background reads cannot upgrade a stale form's precondition. A successful mutation installs its returned version. A conflict removes that precondition and requires another read; the page Retry action clears view versions and reloads. This can produce a conservative extra conflict after unrelated background work, never a silent overwrite. Polling is configurable, skips hidden pages, and has no overlapping ticks. A future event stream must deliver refresh hints with the same session and ownership rules, not browser-selected user subscriptions.

The server must derive notifications from committed operations exactly once, authorize every inbox action against the current job/hour request, and enqueue actual email with durable delivery deduplication. Demo timers simulate delivery only; they are not the API email implementation.

## Demo data and migration safety

The existing key `three-d-print-farm-demo-v3` remains unchanged to preserve profiles and records, while the **record** now has `schemaVersion:4` and `revision`. Unversioned prior formats normalize into schema 4. Before the first normalization, exact prior bytes are saved to `three-d-print-farm-demo-v3-before-schema-4`; this recovery snapshot is never automatically deleted. Existing job histories retain unknown timestamps. Inventory retains stable IDs, prior unknown fields and legacy stock fields for recovery while presenting the current flags. Old contribution credits migrate without duplicating linked transactions.

Validation is per record. One damaged record does not reset good jobs, inventory, hours or inbox records. Recoverable records remain readable, raw bytes remain untouched, a recovery/export notice appears, and mutations are blocked until the data is repaired. Bad JSON, blocked reads, unknown newer schemas and migration/quota failures do not restore seeds over saved data. Fresh seeds are created only when the storage key is absent. Failed operational writes roll back the in-memory mutation and generated inbox events, report unsaved state, and preserve original bytes.

Draft keys are now `three-d-print-farm-draft-v2:<encoded-owner-id>`, containing `{schemaVersion:1,ownerId,fields}`. Recovery exports wrap the exact raw record/profile/draft/snapshot strings in a JSON envelope; binary originals remain in IndexedDB and are not included in that text export. Old unscoped drafts are retained under the old key and **not assigned to whoever happens to open the page**; they require explicit owner identification/recovery. Recovered draft fields are allowlisted strings; selected bytes, viewer state, step, submission result and old submission key never restore. Existing demo profiles and active identity keys remain usable. Custom account creation reports failure if it cannot persist.

Reset Local Data is still an explicit user action confined to demo mode. It removes application live records, owned drafts, demo profiles/selection, harmless preferences and the existing originals store; it does not clear unrelated origin data or retained recovery snapshots. No reset, migration or browser test was run on the user's normal app origin during this implementation. Browser checks used an isolated loopback origin and synthetic data.

## Future Google authentication

Google is intended as the main login method, but this task implements no login/account change. Add backend OIDC/OAuth handling later: state/nonce and PKCE as appropriate, verified issuer/audience/signature/expiry, approved redirect URIs, secure server-side session creation/rotation/logout, account linking rules and school-domain/eligibility policy approved by the school. Map Google's stable subject to an internal immutable user ID. Do not treat an email or browser-supplied access level as role authority.

Use a Secure, HttpOnly, appropriately SameSite session cookie; protect writes from CSRF and session fixation; avoid client-stored authentication tokens. `/session` is the frontend's source of user/permissions. Production account enrollment, role administration, inactive-account treatment, consent and privacy/data retention requirements require backend and school decisions. The demo selector and local account form must stay unavailable in API mode. No Google credentials are needed to develop or run the synthetic role tests.

## Unresolved policy and remaining implementation

School owners must define who can cancel at each stage, whether printing can be interrupted, which failed-print outcomes are tracked, who approves retries, whether reprints create a new request or attempt, and how hours/material costs/notifications change. Until decided there is no new cancellation, failed-print or reprint action, no invented reimbursement rule, and no printer-control feature. Existing CANCELLED records remain readable.

Remaining work: implement the API and all authorization/validation above; relational schema and transactions with stable users/jobs/filament snapshots, optimistic versions and durable idempotency/ledger constraints; audit and data-repair tools; private durable file/object storage, scan/parse isolation and quotas; email queue/provider/delivery monitoring; approved Google identity configuration and enrollment/roles; database/import migrations from demo exports with explicit owner mapping; backups/restore, observability, rate limits, security review and accessibility/performance acceptance on real devices; HTTPS hosting, secrets management, CI and deployment. Existing CDN-based Three.js/3MF loading and optional third-party metadata requests require a production dependency/CSP/privacy decision; preview failure already preserves the original download path. No backend, database or deployment is supplied by this frontend milestone.

The page font is now self-hosted **Inter 4.1** (`assets/fonts/InterVariable.woff2`), with Arial/sans-serif fallbacks and the accompanying SIL OFL notice. There are no SF Pro, Apple system-font aliases or Helvetica page-font declarations in active source. Font source: https://github.com/rsms/inter/tree/v4.1/docs/font-files .

See `verification.md` for actual commands/results and remaining manual checks.
