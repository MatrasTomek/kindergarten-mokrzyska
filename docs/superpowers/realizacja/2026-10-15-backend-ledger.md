# SDD ledger — plan: docs/superpowers/plans/2026-10-15-backend.md
Spec: docs/superpowers/specs/2026-10-15-przedszkole-design.md
Snapshot base (no commits; dangling snapshot commits via .superpowers/sdd/bin/snap.sh): 2a065ae
Ruling: no git commits; each task ends with a dangling snapshot commit (temp index, no ref) used as BASE/HEAD for review packages — plan Global Constraints + user memory forbid commits — cost if wrong: none to repo; snapshots gc'd after ~2 weeks.
Ruling: work in main working tree (no worktree/branch) — user commits himself, plan says changes stay in working tree — cost if wrong: user must branch before committing.
Ruling: task briefs via .superpowers/sdd/bin/brief.sh (task-brief only matches numeric IDs; plan uses B0/F1) — cost if wrong: none.
Pre-flight: table in .superpowers/sdd/preflight.md (123 rows; both plans). Rulings (carried into the named task dispatches):
Ruling: PF-2 B1 Dockerfile lacks libssl-dev/pkg-config → ext-mongodb without TLS, seed vs Atlas (mongodb+srv) fails — add libssl-dev + pkg-config to Dockerfile in B1 — cost if wrong: slightly bigger image.
Ruling: PF-3 PHP defaults upload_max_filesize=2M/post_max_size=8M break PDF ≤10MB/413 (spec §6) — B1 Dockerfile sets upload_max_filesize=12M, post_max_size=13M via conf.d ini; F20 ships api/.user.ini with same values + deploy.md note to verify on OVH — cost if wrong: one ini file.
Ruling: PF-4 B7 Authorization-header test copies the fix and tests nothing — B7 extracts the REDIRECT_HTTP_AUTHORIZATION copy into a small function in src (used by public/index.php) and the test calls that function; must fail if the copy is removed — cost if wrong: one tiny extra file.
Ruling: PF-9 `php -r` for JWT_SECRET needs local PHP — docs use `openssl rand -hex 32` (or docker compose run --rm php php -r …) in B1 .env.example notes and F20 deploy.md — cost if wrong: none.
Ruling: PF-risk TTL index on login_attempts uses real time while tests use FixedClock 2026-10-15 (already >15 min in the past) → mongod may purge attempts mid-test — B6 rate-limit tests must be immune (e.g. limiter counts by query window; tests set clock to real now, or attempts inserted with createdAt not subject to race) — cost if wrong: flaky 429 tests.
Ruling: PF-dup plan-mandated duplication (Post/Content validation, path collection, near-identical repositories) — keep plan structure in stage 1; reviewers may flag, final review triages — cost if wrong: later refactor.
Ruling: PF-temp upload tests leak temp files — B8 tests clean up in tearDown — cost if wrong: none.
Task B0: Ruling: task review done as mechanical check (docs/api.md byte-identical to brief's fenced content; contract cross-checked by pre-flight rows) instead of reviewer subagent — verbatim transcription task, a reviewer could only re-diff — cost if wrong: none, B0 content already scanned.
Task B0: complete (snapshots 83fe6cc..1e52215, review clean)
Task B1: Ruling (USER DECIDED 2026-10-16): composer advisories — ignore PKSA-y93m-jgy6-r9ns and PKSA-61k5-cqr9-b8b4 for mongodb/mongodb ~1.15.0 (no GridFS used, collection names are constants; OVH ext 1.15.3 blocks 1.21+), document rationale; bump firebase/php-jwt to ^7.0 (fixes CVE-2025-45769) — cost if wrong: GridFS/name-injection exposure if later code uses GridFS or user-supplied collection names.
Task B1: Ruling: phpunit.xml <env force="true"> so tests always use docker test Mongo, never backend/.env (Atlas) — cost if wrong: none.
Task B1: minor (deferred): composer.json no trailing newline
Task B1: minor (deferred): index.php Config::fromEnv($_ENV+$_SERVER) — verify env loading on OVH PHP-FPM in F20 deploy checklist
Task B1: minor (deferred): JsonErrorHandler uses HttpException getCode() — a code outside 100-599 would throw in withStatus
Task B1: minor (deferred): ApiTestCase getenv() false when env missing (fromEnv rejects — acceptable)
Task B1: complete (snapshots 1e52215..7117c47, review clean)
Task B2: minor (deferred): Slugger drops non-Polish diacritics (Café→caf); unique() suffix can exceed 80 chars
Task B2: minor (deferred): no unit tests for Uuid::v4 format, Ids, Dates::toIso tz, Input::body/int/list (covered indirectly later)
Task B2: complete (snapshots 7117c47..c784216, review clean)
Task B3: minor (deferred): no test with unsorted $starts (asort uncovered); empty $starts returns ''; seasonStart MM-DD not validated (validate at write in B13)
Task B3: complete (snapshots c784216..3854da6, review clean)
Task B4: minor (deferred): seasonStarts with missing/partial season docs not guarded; unknown themeMode / non-ObjectId manualThemeId unvalidated (→ B13 write validation); no test for manual+null id
Task B4: complete (snapshots 3854da6..715e442, review clean)
Task B5: minor (deferred): Seeder validates password after writing groups/themes/settings (partial seed on error)
Task B5: minor (deferred): seed.php CLI input not validated (empty email, repeated arg, uncaught exception trace); existing-admin password silently ignored
Task B5: minor (deferred, FINAL REVIEW: weigh): --fresh guarded only by APP_ENV — env file with APP_ENV=dev pointing at production Atlas would allow drop
Task B5: complete (snapshots 715e442..2697d2e, review clean)
Task B6: minor (deferred): login timing side channel (no password_verify for unknown/inactive user)
Task B6: minor (deferred, FINAL REVIEW: weigh; F20 deploy note): REMOTE_ADDR behind OVH proxy may be shared → one IP bucket locks everyone out
Task B6: minor (deferred): no refresh-token revocation/rotation (spec-stateless); no max password length (bcrypt 72B); per-email limit lockout DoS inherent
Task B6: minor (deferred): test gaps — clear() on success, per-email across IPs, tampered token, logout cookie Path
Task B6: complete (snapshots 2697d2e..c151f95, review clean)
Task B7: Ruling: PF-4 implemented as App\Http\ServerParams::withAuthorization; implementer found slim/psr7 Headers already falls back to REDIRECT_HTTP_AUTHORIZATION, so index.php fix is defense-in-depth; test fails when function is no-op — accepted — cost if wrong: none.
Task B7: minor (deferred): AuthMiddleware accepts unknown role claim; access token trusted 60 min after deactivation/role change (JWT design); no RED run recorded; inline FQCN in AuthController
Task B7: Ruling: RoleMiddleware wiring untested through real app — every later task adding admin-only routes (B8 pdf, B9, B12, B13, B14) must include a user-token → 403 integration test — carried in dispatches — cost if wrong: a few extra tests.
Task B7: complete (snapshots c151f95..3e6336f, review clean)
Task B8: minor (deferred): second move failure orphans first file; files keep 0600 mode (verify serving on OVH, F20); request > post_max_size → 400 not 413; missing context defaults to posts; PDF name keeps control chars
Task B8: minor (deferred): missing tests — thumb/PDF over limit, non-PDF to pdf endpoint, UPLOAD_ERR_NO_FILE, rejects don't assert empty dir
Task B8: fix round 1/5 (2 addressed, 0 open — corrupt image 0x0 accepted; path regex $ vs \z; snapshots 551e12c..72dc402)
Task B8: minor (deferred): getimagesize is header-level only (corrupt JPEG body passes)
Task B8: complete (snapshots 3e6336f..72dc402, review clean after 1 fix round)
Task B9: Ruling: Review Focus 3 public-listing half moves to B11 (public posts API) — B11 dispatch must include: delete a group with attached posts → GET /api/posts still 200 and lists the post — cost if wrong: one test.
Task B9: minor (deferred): concurrent same-name create → duplicate key 500; no tests for admin GET list, 404 on unknown id, PUT resets omitted fields; order unbounded
Task B9: complete (snapshots 72dc402..b2d20da, review clean)
Task B10: Ruling: brief test fixed (re-issue token after clock advance past 60 min) — test-only change, prod code verbatim — cost if wrong: none.
Task B10: minor (deferred): slug race → duplicate key 500; w/h accept 0/negative; test gaps (user-delete 403 doesn't assert post remains; removed-image test doesn't check PUT status/thumb; exactly-30 accepted untested); no RED recorded
Task B10: fix round 1/5 (2 addressed, 0 open — RF4 test via PUT; cross-post file reuse + thumb pairing; snapshots 829fc67..01382ec)
Task B10: minor (deferred): cross-post file check not atomic; duplicate file within one post allowed
Task B10: complete (snapshots b2d20da..01382ec, review clean after 1 fix round)
Task B11: minor (deferred): sort lacks _id tiebreaker (unstable paging); huge page param may 500; array/odd query params silently ignored; public detail leak assertions incomplete; news+group combo untested
Task B11: complete (snapshots 01382ec..8760dd0, review clean)
Task B12: Ruling: content images/attachments get B10-equivalent hardening (context-only paths, thumb pairing, reject files referenced by another content item or post) — consistency with B10 fix; spec says users must not lose files — cost if wrong: some duplicated validation.
Task B12: minor (deferred): file-reference check TOCTOU; duplicate path within one item allowed; size/w/h client-supplied; sort lacks _id tiebreaker; test gaps (attachment traversal PUT, user PUT/DELETE 403, unknown id 404, image removal on update)
Task B12: complete (snapshots 8760dd0..885a5f7, review clean)
Task B13: Ruling: brief test fixed (fresh token after clock jump to 2027) — test-only — cost if wrong: none.
Task B13: Ruling: fix round includes Ids::parse (B2) and a sweep of all input-validation regexes in backend/src from `$` to `\z` — same trailing-newline defect class found in B8 and B13 — cost if wrong: small out-of-task diff.
Task B13: minor (deferred): no check that season starts are distinct/ordered
Task B13: fix round 1/5 (4 addressed, 0 open — palette/manualThemeId/Ids trailing-newline; regex sweep; snapshots 9d8d8bc..aba983a)
Task B13: complete (snapshots 885a5f7..aba983a, review clean after 1 fix round)
Task B14: Ruling: reviewer's Important "concurrent duplicate email → 500" re-graded Minor — needs two admins racing the same email; unique index keeps data safe; effect is a generic error message once — cost if wrong: one confusing 500.
Task B14: minor (deferred): duplicate-key → 500 (also groups/posts slug races, same class); PUT without `active` deactivates user; no password max length; deactivated users keep access ≤60 min (AuthMiddleware trusts JWT)
Task B14: minor (deferred, F20 deploy note): unique indexes only created by ensureIndexes() in seed.php — deploy docs must make running seed mandatory
Task B14: complete (snapshots aba983a..d65f948, review clean)
Task B15: minor (deferred): missing UPLOAD_DIR silently returns []; attach-after-read race (narrow)
Task B15: fix round 1/5 (4 addressed, 0 open — allowlist scan; empty-DB guard + --force; unlink checked; DB-failure test; snapshots 04a2809..097007f)
Task B15: minor (deferred): failed-unlink test skipped as root (default docker run) — inject deleter or run phpunit as non-root; CLI exit-code paths untested
Task B15: complete (snapshots d65f948..097007f, review clean after 1 fix round)
Final review (opus): Ready with fixes. Critical: none.
Final: Ruling: minor #2 "save references files already removed by cron (editor open >24h) → broken images published" re-graded Important — plausible for staff, silent data loss on public page — enters fix pass.
Final: minor (deferred): huge ?page= → 500 (public); no serverSelectionTimeoutMS (≈30 s hang on Atlas outage); METHOD_NOT_ALLOWED/HTTP_ERROR missing from docs/api.md; APP_ENV other than exactly 'prod' shows details; --fresh could also require MONGO_DB *_test/_e2e
Final: carried to frontend F20 (deploy.md checklist): seed mandatory (creates unique indexes) and re-run after updates; seed can't reset an existing admin password; verify REMOTE_ADDR is real client IP on OVH; verify uploaded file perms served; verify env loading (/api/health + login); api/.user.ini upload limits; node >= 22.22.3 on host.
Final: fixed password change didn't revoke refresh tokens — passwordChangedAt + iat check; UserAdminTest 4 tests RED→GREEN, suite 160 (1 skipped)
Final: fixed save referencing files removed by cron — UploadService::exists in Post/ContentService; PostAdminTest+ContentTest RED→GREEN, suite 160 (1 skipped); scoped re-review: all addressed
Final: minor (deferred): same-second pre-change refresh token survives (1 s window); legacy items with already-missing file can't be edited until image removed (UI must show message)
Backend plan: DONE (snapshots 83fe6cc..eff1aa0)
