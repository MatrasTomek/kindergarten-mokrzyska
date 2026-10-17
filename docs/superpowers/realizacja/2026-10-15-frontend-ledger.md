# SDD ledger — plan: docs/superpowers/plans/2026-10-15-frontend.md
Spec: docs/superpowers/specs/2026-10-15-przedszkole-design.md
Ruling: no git commits; each task ends with a dangling snapshot commit (temp index, no ref) used as BASE/HEAD for review packages — plan Global Constraints + user memory forbid commits — cost if wrong: none to repo; snapshots gc'd after ~2 weeks.
Ruling: work in main working tree (no worktree/branch) — user commits himself, plan says changes stay in working tree — cost if wrong: user must branch before committing.
Ruling: task briefs via .superpowers/sdd/bin/brief.sh (task-brief only matches numeric IDs; plan uses B0/F1) — cost if wrong: none.
Pre-flight: table in .superpowers/sdd/preflight.md (shared with backend plan). Rulings:
Ruling: PF-1 RichTextComponent reads value() once → editing existing post/content shows empty editor and overwrites body — F12 makes RichText sync editor content when value input changes externally (without echo loop), with a unit test setting value after init; F13/F15 rely on it — cost if wrong: data loss on edit (must not ship).
Ruling: PF-5 F19 seasonal-theme E2E passes via styles.scss default #b91c1c — test must compare against the palette actually returned by /api/theme (fetch in test), not a static accepted list — cost if wrong: test that can't fail.
Ruling: PF-6 F19 "user sees no Usuń" — assert the row/editor is present first, then Usuń count 0 — cost: none.
Ruling: PF-7 <title> must use SITE_SHORT_NAME (Global Constraint) — F1 index.html title and F5 home route title use SITE_SHORT_NAME — cost: none.
Ruling: PF-8 spec §10 E2E: add admin UI login test and axe audit of a post page in F19; add a PaletteApplier unit test in F3 — cost: a few tests.
Ruling: PF-9 deploy.md uses `openssl rand -hex 32` for JWT_SECRET (no local PHP) — cost: none.
Ruling: PF-3 F20 package ships api/.user.ini (upload_max_filesize=12M, post_max_size=13M) + deploy.md verify step — cost: one file.
Note: Secure refresh cookie on plain-http LAN phone test (FE ~3585) — user gets logged out after 60 min there; deploy/dev doc note only, not a fix.
Snapshot base: 097007f (end of backend plan)
Task F1: Ruling: latest Angular CLI needs node >= 22.22.3; sandbox had 22.22.1 — installed node 22.23.3 via nvm in the sandbox (persisted in /etc/sandbox-persistent.sh) and kept Angular latest per plan, instead of pinning @angular/cli@21 — cost if wrong: owner's host needs node >= 22.22.3 to build (document in F20 deploy.md).
Task F1: Ruling: node_modules/.bin symlinks not created on this (Windows-mounted) filesystem — all frontend tasks run CLIs as `node node_modules/<pkg>/<bin>.js` (ng: @angular/cli/bin/ng.js; playwright: @playwright/test/cli.js) instead of npx — cost if wrong: none, equivalent commands.
Task F1: minor (deferred): .gitignore duplicates; app.spec smoke-only; npm audit 1 low
Task F1: complete (snapshots 097007f..4bc1e42, review clean)
Carried from backend final review → F20 deploy.md checklist: seed mandatory (creates unique indexes) + re-run after updates; seed can't reset existing admin password; verify REMOTE_ADDR = real client IP on OVH (else shared rate-limit bucket); verify uploaded files are served (perms); verify env loading (/api/health + login); api/.user.ini (upload_max_filesize=12M, post_max_size=13M); node >= 22.22.3 to build.
Task F2: minor (deferred): AdminApi only uploadImage tested (CRUD verbs/urls untested); AdminApi.content(page: string) untyped; ids not encodeURIComponent'd; apiErrorMessage non-envelope body untested
Task F2: complete (snapshots 4bc1e42..a0953d1, review clean)
Task F3: Ruling: reviewer's Important (prerendered HTML shows static autumn colors → flash to real season after JS + /api/theme in 3 of 4 seasons; PrimeNG preset default primary may be Aura emerald before init) carried to F18 — F18 must add a pre-paint inline script (or try/catch localStorage cache of last Theme) setting --app-* from client-side season, and verify/set preset default primary; build-time theming rejected (season frozen at build) — cost if wrong: visible color flash.
Task F3: minor (deferred): ThemeService bare catch hides malformed palette (no shape validation); tests missing for server branch, 5 s timeout, backend/frontend palette drift; palette-applier spec leaves global state
Task F3: complete (snapshots eff1aa0..d219486, review clean)
PAUSED after F3 at user's request (2026-10-16). Resume at F4.
RESUMED 2026-10-16 at F4
Task F4: Ruling: saved a11y settings apply only after bootstrap (prerendered page flashes default, e.g. white for high-contrast users) — carried to F18: the pre-paint inline script also applies `a11y` classes from localStorage (try/catch); also F18 must check hydration mismatch if provideClientHydration is enabled (speak button server/client differs) — cost if wrong: visible flash.
Task F4: minor (deferred): SpeechService untested; read() selection vs #main untested; decrease/reset font untested; getItem-throws untested; toolbar spec leaks localStorage/html class; sticky toolbar at 150% on phones (reflow); no current-size indicator
Task F4: fix round 1/5 (3 addressed, 0 open — persistent speak button; contrast pressed state + ✓; speech guards; snapshots 4043e89..2f2ce03); GREEN verified by controller: ng test 9 files / 27 tests pass
Task F4: minor (deferred): no speech.service.spec (stale onend guard); contrast rule paints icon/✓ inside pressed buttons black (cosmetic)
Task F4: complete (snapshots d219486..2f2ce03, review clean after 1 fix round)
Task F5: minor (deferred): footer year frozen at prerender; 100vh vs 100dvh on mobile; main outline none after skip link; tile border low contrast (decorative); no tests for routes/titles/404/toolbar presence; no focus/announcement on route change (consider for F19 a11y)
Task F5: complete (snapshots 2f2ce03..7e609fd, review clean)
Task F6: minor (deferred): page change swaps list for "Ładowanie…" (focus/scroll lost); card thumbnail alt duplicates title; inline lightbox styles; body may contain h1 (editor concern)
Task F6: Ruling: initial bundle 882 kB > 500 kB budget (already at F6 before fix; PrimeNG eager imports) — not blocking now; F18 must check bundle after admin lazy-loading and either reduce (lazy/eager import audit) or justify raising the budget — cost if wrong: slower first load on mobile.
Task F6: fix round 1/5 (3 addressed, 1 open — gallery Escape/focus/name addressed; stale meta/title open; snapshots 560c690..fc263f6)
Task F6: fix round 2/5 (1 addressed, 0 open — stale meta/title cleared on slug change + destroy; snapshots fc263f6..37954b2)
Task F6: complete (snapshots 7e609fd..37954b2, review clean after 2 fix rounds)
Task F7: minor (deferred): h1 "Grupa" while loading/after non-404 error; empty groups list has no message; groups.page subscription not takeUntilDestroyed; shared error signal; no tests for paging / non-404 error / empty list
Task F7: complete (snapshots 37954b2..d4429f1, review clean)
Task F8: minor (deferred): formatSize 1024 KB boundary; redundant route+component title; CMS body may contain h1/h2 (editor guidance); no hostile-body sanitizer test; .meta hard-coded color vs contrast mode
Task F8: complete (snapshots d4429f1..ae9c050, review clean)
Task F9: Ruling: Angular FetchBackend (withFetch in app.config.ts) emits no UploadProgress → F11 photo progress bar would never move (unit tests hide it). F11 must make browser uploads use XHR: drop withFetch() from the browser provideHttpClient (keep it for the server in app.config.server.ts when F18 adds SSR, if needed) and verify UploadProgress events with a real-backend-shaped check (or at least an assertion that the configured backend is HttpXhrBackend) — cost if wrong: dead progress bar for staff.
Task F9: minor (deferred): stale-token 401 after shared refresh triggers a 2nd refresh (harmless, no rotation); refresh failure navigates N times, no returnUrl; adminGuard relies on parent authGuard ordering; duplicate role=alert; p-password aria-required; logged-in user sees login form; no LoginPage/logout specs; refresh-failure test lacks ctrl.verify()
Task F9: complete (snapshots ae9c050..0bf2408, review clean)
Task F10: minor (deferred): no routes spec for guard wiring; no focus management after delete; hardcoded colors / p-button class on anchor; spec AuthService mock partial
Task F10: fix round 1/5 (4 addressed, 0 open — admin skip link; load error + retry; empty-page fallback; switchMap stale guard; snapshots 850ec26..ee3e1ef)
Task F10: minor (deferred): stale-response test weak (doesn't flush late earlier response)
Task F10: complete (snapshots 0bf2408..ee3e1ef, review clean after 1 fix round)
Task F11: Ruling: reviewer Minors re-graded Important by user effect — imageOrientation TypeError → every photo reported as HEIC; generic/English upload error messages; transparent PNG → black JPEG background — enter fix round 1 with the Critical worker ReferenceError and Important worker-crash hang — cost if wrong: small extra diff.
Task F11: Ruling: F12 component must compute queue limit = 30 − saved images − non-failed queued items (queue only enforces the limit it's given) — carried to F12 dispatch — cost if wrong: >30 photos rejected by backend at save.
Task F11: minor (deferred): progress bar jumps back to 0 on 401→refresh retry (cosmetic)
Task F11: Ruling: worker/OffscreenCanvas path only tested with fakes — F19 E2E upload of 3 photos must run in real Chromium through the worker path (assert uploaded files are image/webp and dims ≤1920) — carried to F19 — cost if wrong: worker regression ships unnoticed.
Task F11: fix round 1/5 (6 addressed, 2 new minor leftovers — console.error noise, worker tsc errors — sent as round 2; snapshots 1d3d595..a20ce74)
Task F11: fix round 2/5 (2 addressed — console.error muted+asserted; worker tsconfig lib +dom, tsc 0 errors verified by controller; snapshots a20ce74..287fffa). Ruling: round-2 re-review done by controller directly (4-line diff, tsc re-run clean) instead of a subagent — cost if wrong: none.
Task F11: complete (snapshots ee3e1ef..287fffa, review clean after 2 fix rounds)
Task F12: Ruling: HEIC/unsupported items get "Usuń" instead of "Ponów" (retrying a decode failure can't succeed); brief's test assertion changed accordingly — cost if wrong: one button.
Task F12: carry to F13/F15: editor must pass [defaultAlt]="title" and disable save on (busyChange).
Task F12: Ruling: invisible keyboard focus on sr-only file input (WCAG 2.4.7) re-graded Minor→Important — enters fix round 1 — cost if wrong: one CSS rule.
Task F12: minor (deferred): done items stay in queue list / no "Wysłano N" announcement; no focus mgmt/announcement after reorder; defaultAlt applied at upload end (photos uploaded before title typed keep empty alt — F13 should sync or require alt)
Task F12: fix round 1/5 (6 addressed, 0 open; snapshots 31b8d07..bbfed48). Ruling: re-review's out-of-scope "undo after load/reset restores or empties content" re-graded Important (data loss on Ctrl+Z) → fix round 2 with drag-handle tab stop — cost if wrong: one line.
Task F12: minor (deferred): pasted h1 displays at h1 size until reload (saved as h2); no list indent; repeated identical skip message not re-announced
Task F12: fix round 2/5 (2 addressed — history.clear after external writes; handle → aria-hidden span; snapshots bbfed48..67c47f8). Ruling: round-2 re-review by controller (source diff 5 lines, read directly; ng build re-run) — cost if wrong: none.
Task F12: complete (snapshots 287fffa..67c47f8, review clean after 2 fix rounds)
Task F13: Ruling: empty photo alt filled with post title on save (buildPostInput) + title passed as defaultAlt — keeps WCAG alt without blocking save — cost if wrong: generic alt texts.
Task F13: Ruling: unsaved-changes guard (CanDeactivate + beforeunload) added though the brief/spec don't require it — staff lose long posts on Anuluj/navigation; reasonable-user expectation — cost if wrong: one extra confirm dialog. F15 content editor should reuse the same guard.
Task F13: minor (deferred): navigate() false leaves Save loading; no delete-success toast; label test doesn't check control ids; multiselect/radio keyboard behaviour to be covered by F19 axe/E2E; manual phone/LAN check not done
Task F13: fix round 1/5 (4 addressed, 1 new Important — delete then unsaved prompt — sent as round 2; snapshots 9ddbfd7..03ff99b)
Task F13: minor (deferred): confirmLeave not re-entrant (double back press stacks dialogs); Quill-normalization dirty-on-load needs manual check (F19 E2E: open existing post, navigate away → no prompt)
Task F13: fix round 2/5 (1 addressed — baseline reset on delete success; image-dirty test; snapshots 03ff99b..04f61b2). Ruling: round-2 re-review by controller (3-line source diff read directly) — cost if wrong: none.
Task F13: complete (snapshots 67c47f8..04f61b2, review clean after 2 fix rounds)
Task F14: minor (deferred): overlapping load() calls may resolve out of order
Task F14: fix round 1/5 (3 addressed, 0 open — focus after delete; form submit/trim/required; stronger tests; snapshots a9b3d03..fbf4803)
Task F14: minor (deferred): failed delete leaves focus on body; Enter-submit tested via submit event not keypress; verify confirm-dialog focus in real browser (F19)
Task F14: complete (snapshots 04f61b2..fbf4803, review clean after 1 fix round)
Task F15: Ruling: beforeunload for dirty content dialog re-graded Important (consistency with F13 ruling); attachment reorder not added (not in brief/spec) — cost if wrong: admins re-upload to reorder PDFs.
Task F15: fix round 1/5 (6 addressed, 0 open — PDF upload bound to draft; beforeunload; visibleChange test; new disabled until load; 413 msg; admin PDF links; snapshots b9f3737..f6f237c); GREEN verified by controller: ng test 30 files / 158 tests, no stderr
Task F15: complete (snapshots fbf4803..f6f237c, review clean after 1 fix round)
Task F16: Ruling: contrast warning uses 4.5:1 for text pairs and 3:1 for icon pairs (accent on 100/200) per WCAG 1.4.11 — built-in autumn/winter accent icons are 4.14:1 — cost if wrong: icons slightly under text threshold without warning (still AA for non-text).
Task F16: minor (deferred): invalid hex in text field silently ignored; duplicate role=alert in p-message + warnings re-render while dragging; saveSettings no programmatic guard; reload failure after save replaces page with error; highlight pair unchecked; tests missing for onHide/save restore, warning-not-blocking, manual disabled
Task F16: complete (snapshots f6f237c..ff98f0a, review clean)
Task F17: minor (deferred): concurrent load() responses not cancelled; no test that self-PUT sends role admin + active true; double-submit test only for create
Task F17: fix round 1/5 (3 addressed, 0 open — email validation; inline field errors; own hint/toggle/focus/etc.; snapshots 905af9a..26cd8f2)
Task F17: minor (deferred): errors appear only after blur (button disabled, never-blurred user gets no reason); failed-delete focus test doesn't blur opener first
Task F17: complete (snapshots ff98f0a..26cd8f2, review clean after 1 fix round)
Task F18: minor (deferred): lazy route chunks not modulepreloaded on prerendered pages; report misdescribes cached-theme-on-API-failure (falls back to season after 5 s); TODAY token lives in theme module; dev HTML comment ships in index.html; inline --app-text/--app-accent beat html.a11y-contrast vars (pre-existing, !important rules mask it)
Task F18: carried to F20: SPA fallback must be index.csr.html (never index.html); handle Apache DirectorySlash (/aktualnosci → aktualnosci/index.html); CSP note (inline #prepaint needs sha256 if CSP added later)
Task F18: complete (snapshots 26cd8f2..4e7b6de, review clean)
Ruling (USER DECIDED 2026-10-16): PrimeNG 22.x shows "Invalid PrimeUI License" banner without a key; owner chose to pin an older PrimeNG without the license mechanism instead of obtaining a Community key — inserted task "PN-pin" before F19 — cost if wrong: older PrimeNG (fewer fixes), possible API differences.
Task PN-pin: BLOCKED — no license-free PrimeNG supports Angular 22 (newest license-free: primeng 21.1.10 MIT, needs @angular/core ^21). Ruling (USER DECIDED 2026-10-16): downgrade to Angular 21.2.x + primeng 21.1.10 + @primeuix/themes 2.0.3 (+ styled 0.7.4), TypeScript ~5.9, vitest 4.x — cost if wrong: older framework line, migration effort.
Task PN-pin: Ruling: primeicons 8.x is also PrimeUI-licensed → pinned primeicons 7.0.0 (MIT, all used icons present) — follows owner's "no license" decision — cost if wrong: older icon set.
Task PN-pin: Ruling: vitest pinned ~4.0.18 because vitest 4.1.x crashes npm 10.9.9 install — leaves 1 critical dev-only advisory (UI/API server, unused) — cost if wrong: dev-tool exposure only if vitest UI/API server is run.
Task PN-pin: minor (deferred): vitest critical/moderate dev-only advisories until npm 11 + vitest ≥4.1.11; app.config.spec NG0505 comment wording; Angular 21 is previous major — moving to 22+ brings PrimeUI license back (final notes)
Task PN-pin: complete (snapshots 794f17f..c7e087c, review clean) — Angular 21.2.25, primeng 21.1.10, @primeuix/themes 2.0.3, primeicons 7.0.0, TS 5.9.3, vitest 4.0.18
Task F19: minor (deferred): English Quill link tooltip strings (polish later); possible empty unnamed alertdialog while confirm closed (check in F20); PF-5 test could pass vacuously if defaults equal season palette; prerendered dist + SPA fallback not E2E-covered (F20 smoke); @types/node missing for e2e typecheck
Task F19: fix round 1/5 (4 addressed, 0 open — backend reuse off + container check; teardown try/catch; render asserts before axe; focusAfterConfirm helper; snapshots ee4f130..a5643c4)
Task F19: minor (deferred): users delete-error path calls opener.focus() directly (same fast-close focus risk); global-setup check string-matches docker inspect JSON (fails safe)
Task F19: complete (snapshots c7e087c..a5643c4, review clean after 1 fix round)
Task F20: Ruling: api.htaccess rewritten (brief's FilesMatch deny ran before rewrite → 403 on every route, verified on local Apache); root .htaccess DirectorySlash Off + explicit dir/index.html rewrite; package resets modes 644/755; backend/.gitignore ignores .env.* (docs ask for .env.prod) — cost if wrong: deploy behaviour differs on OVH (checklist covers it).
Task F20: minor (deferred): closed PrimeNG ConfirmDialog leaves empty unnamed role=alertdialog in admin DOM (PrimeNG 21 hard-codes role; non-trivial); .env must live in api/ (code reads api/.env only)
Task F20: Ruling: webp MIME untested on uploads (nosniff → broken photos if OVH lacks mapping) re-graded Important; fix round also includes uploads allowlist, API https-only, verify-package directive checks, deploy.md polish — cost if wrong: small diff.
Task F20: minor (deferred): logo/favicon cached immutable 1 year; failed composer leaves partial deploy/ (loud); stale ledger line "node >= 22.22.3" superseded by PN-pin (Angular 21: ^20.19 || ^22.12 || >=24)
Task F20: fix round 1/5 (6 addressed — webp MIME, uploads allowlist, API https-only, nosniff dedupe, verify-package directive checks, deploy.md polish; snapshots 7b7d7fe..db250ef); fix round 2/5 (docs: HTTPS fallback in both .htaccess, step ref, cron args fallback; snapshots db250ef..3f23861). Ruling: round-2 docs re-review by controller (diff read) — cost: none.
Task F20: minor (deferred): x.php.jpg served inert as image; AddType/RemoveHandler unproven on OVH (checklist item 5 catches 500); Windows-side vendor pruning path not exercised; repo deploy/ must be regenerated on Windows (node_modules is Windows-built)
Task F20: complete (snapshots a5643c4..3f23861, review clean after 2 fix rounds)
Final review (opus): Ready to go live with fixes. Critical: none.
Final: Ruling: re-graded Minor→Important by user effect and added to the single fix pass: Quill link popup in English (staff); photo order follows upload completion not selection (staff's order lost); a11y classes leak into /admin with no toggle, high-contrast hides Quill toolbar icons; logout with unsaved changes → 401 loop; missing JS/CSS chunks get SPA HTML after updates (+ deploy.md "delete old chunks" advice); role label "Użytkownik — Wpisy „Z życia”" misleading; deploy.md lacks Angular 21/PrimeNG 21 EOL date + exit plan — cost if wrong: slightly larger fix diff.
Final: Ruling: Important 3 (real-device iPhone Safari/Android upload, phone editing, Windows packaging, OVH checklist) cannot be done in the sandbox — goes to the owner as go-live checklist, not a code fix — cost if wrong: device-specific bug found after launch.
Final: minor (deferred): admin focus ring ~1.5:1 on winter header; admin tables may scroll sideways on phones (verify on device); no X-Frame-Options/HSTS; theme init waits up to 5 s when API hangs; Ponów can exceed 30 with several failed items (backend rejects save); post-card thumbnail alt repeats title
Final: fixed 9 findings (route-change focus + paging; non-sticky toolbar on small viewports; Polish Quill tooltip; selection-order photos; admin a11y toolbar + contrast Quill icons; logout asks guard first; static-asset 404 + deploy advice; role label; deploy.md versions/support) — 12 unit + 4 E2E RED→GREEN; unit 228/228, E2E 20/20 ×3, build OK, verify-package 37/37, package smoke 26/26; scoped re-review: all addressed
Final: minor (deferred): focus-on-navigation not guarded for same-path query-only navigations (none exist today); login page has no a11y toolbar; admin .body min-height ignores toolbar row; PostList focusAfterLoad edge case; quill 2.0.3 low npm advisory (backend sanitizes)
Frontend plan: DONE
