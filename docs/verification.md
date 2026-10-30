# Verification · 3D Print Farm v2.4 integration milestone

Verified on 2026-10-30. The original baseline had **41 passing Node tests**. The final suite has **70 passing tests**, including 29 new recovery, request, session and mocked-HTTP regressions. Existing workflow tests were adapted to use valid model links or retained originals plus idempotency keys; filename-only creation is intentionally no longer accepted.

## Commands and results

Run from the project directory:

```sh
node --test tests/*.test.mjs
```

Result: 70 tests, 70 pass, 0 fail/cancelled/skipped. Final captured run: approximately 1.14 seconds. The implementation run log is retained with the change backup.

```sh
for f in src/*.js src/demo/*.js; do node --check "$f" || exit; done
```

Result: all **42 production JavaScript files** pass syntax checks. The initial **13 inline browser scripts** also passed extracted `node --check` checks; the later font diagnostic script was checked separately. This static ES-module project has no configured build, lint or TypeScript compilation pipeline; `services.d.ts` is the integration contract, not a framework migration.

```sh
rg -n 'SF Pro|SFPro|-apple-system|BlinkMacSystemFont|Helvetica' src index.html
```

Result: no active-source matches. Inter's local WOFF2 file has the expected `wOF2` signature, is served successfully, and the browser regression verifies Inter has loaded.

## Browser checks actually run

The project was served only on loopback, using a temporary Python ThreadingHTTPServer with caching disabled and a larger connection queue. Checks used `http://127.0.0.1:8048/`, a dedicated synthetic-data origin, rather than the normal project preview origin. The initial default preview server was replaced after module-fetch failures; the final server and checks completed successfully. No production account, Google session, real email, database or deployed API was involved.

Open each page under `tests/` and click its Run button:

| Fixture | Actual result | Coverage |
| --- | --- | --- |
| `backend-readiness.html` | **25 passed** | Self-hosted Inter, retained original bytes, byte-sensitive idempotency, rejection of filenames alone, Level 1 rejection inbox/navigation, URL validation, selected-file/preview cleanup across identities, owned draft restore, full archive pages/search, new filters at 1440/768/390/320px, malformed routes, non-destructive data recovery, actual API-mode loading/signed-out/failure UI with mocked fetch and no demo account selector/fallback |
| `workflow-e2e.html` | **20 passed** | Real request wizard/STL preview, initial approval, claim, revision/resubmission, final print authorization, printing/completion/collection, pickup, hours decisions, cross-tab notifications and identity cleanup |
| `v23-regression.html` | **49 passed** | STL/OBJ/3MF previews, byte-identical IndexedDB originals and original downloads, file-storage failure, missing/unsupported/corrupt/legacy originals, model links, disposal, sidebar persistence, light/dark surfaces, 1440/1024/768/390/320px layouts |
| `inbox-regression.html` | **31 passed** at 697px | Individual inbox consumption, stale guarded actions, bounded menus, toast navigation, presence, account boundaries, shared decisions and theme behavior |
| `sidebar-regression.html` | **15 passed** | Persistent navigation/control nodes, active tabs, rapid navigation, identity boundaries, menu placement and touch targets |
| `ui-refinement.html` | **102 passed** at 697px | Both themes, toolbar geometry, menu bounds in all corners, clipping, nested forms, navigation geometry and public header fit |
| `apple-redesign.html` | **838 passed** | Both themes at 1440/1024/834/768/640/390/320px; public design, imagery, disclosures, sticky header contrast, keyboard behavior, request form and personal job-list overflow after the Inter change |

Total: **1,080 passing browser assertions** across these seven fixtures. Fixtures restore their synthetic origin records/preferences and remove only originals created by their run. No reset or migration was run against the user's ordinary browser origin. The new fixture also backs up/restores owner-scoped drafts and recovery snapshots.

## Mocked HTTP evidence

`httpServices.test.mjs` covers 400/401/403/409/412/422/500 responses, offline errors, timeouts, malformed envelopes, all session states, clearing stale identity/permissions, every role using synthetic sessions, credentials and memory-only CSRF, If-Match conflicts, retry key reuse, duplicate concurrent actions, conservative version pinning, older paginated records, ownership/role stripping from creation, upload confirmation, incomplete downloads, accounting conflict/key/balance headers, and preventing job creation after upload failure. A separate isolated Node process proves API-mode service initialization does not access operational LocalStorage.

`backendReadiness.test.mjs` covers invalid records/JSON/newer schemas without seeded replacement, exact recovery snapshots, write rollback, owner drafts and selected-file exclusion, all request-source constraints and field limits, stable filament snapshots/deleted selections, idempotent creation, archive pages and malformed routes. The prior 41 tests still cover the existing Level 1–4 approval, assignment, hours and navigation behavior.

## Practical limits

Browser files were selected synthetically through a real file input, matching the existing harness. Native operating-system file-picker interaction remains a manual check. The integration run used the connected in-app browser. A later Safari run verified font loading/rendered glyphs on a fresh `localhost:8000` homepage; see [font verification](font-verification.md). Full workflows on other browser engines, real mobile hardware and assistive technologies still need release acceptance. HTTP tests are mocked contract checks, not proof of a real server's security or durability. Production Google OIDC, database transactions, private durable file storage/scanning, notification delivery, deployment and the unresolved cancellation/failure/reprint policies remain work described in `backend-integration.md`.

No database, production backend or running deployment is included. Publishing the source code is separate from deploying the application.
