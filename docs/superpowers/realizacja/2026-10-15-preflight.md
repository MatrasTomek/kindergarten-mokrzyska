# Pre-flight consistency scan — backend (B0–B15) + frontend (F1–F20)

Scope: `docs/superpowers/plans/2026-10-15-backend.md` (BE), `docs/superpowers/plans/2026-10-15-frontend.md` (FE), spec `docs/superpowers/specs/2026-10-15-przedszkole-design.md` (SPEC). Line numbers refer to those files.
Environment assumed: docker + docker compose, node/npm; no local php/composer (Windows host, `/c/Users/...`).

Legend: **OK** = consistent; **CONFLICT** = a test would fail, the integration breaks, or the plan contradicts spec/constraints; **RISK** = probably works but fragile or unverified.

---

## 1. Pairs of tasks that share a file or an interface

### 1a. Backend ↔ backend

| # | Tasks | Producer → consumer | Finding |
|---|---|---|---|
| 1 | B0 ↔ B1 | Contract error shape/codes (BE 91-93) → `ApiException`, `JsonErrorHandler` (BE 583-687) | OK. Code also emits `405 METHOD_NOT_ALLOWED` and `HTTP_ERROR` (BE 673-674), which the contract does not list. Harmless. |
| 2 | B1 ↔ B4, B6, B8–B14 | `Services.php` skeleton (BE 689-708), extended with "dopisz" snippets (BE 1601-1623, 2256-2271, 2954-2964, 3289-3300, 3865-3883, 4062-4069, 4467-4480, 4808-4817, 5107-5115) | OK. Dependency order holds: groups (B9) and uploads (B8) exist before PostService (B10, note at BE 3883), `$this->sanitizer` (B10) exists before B12, `$this->users` (B6) exists before B14. B13 replaces the B4 `ThemeController` construction, and its arity matches the new constructor (BE 4761-4766). |
| 3 | B1 → B4 → B6 → B7 | `Routes.php`: B1 version (BE 710-729), B4 adds `/api/theme` (BE 1627), B6 adds auth group (BE 2273-2280), B7 rewrites the whole file (BE 2533-2587) | OK. B7's full version keeps health, auth and theme (moved into `publicRoutes`). |
| 4 | B7 ↔ B8–B14 | `publicRoutes`/`staffRoutes`/`adminRoutes` slots (BE 2571-2585) | OK. Each task adds only inside those methods. Role placement matches the contract: upload image is staff (BE 2969), PDF is admin (2971), post DELETE is admin (3893), the rest are staff or admin as in BE 145-162. |
| 5 | B1 → B6 → B7 → B8+ | `ApiTestCase` (BE 296-388) + `createUser` (1843-1858) + `token/tokenFor` (2309-2317) + `Fixtures` (2617-2673) | OK. Signatures match every call site, including named args `server:`, `cookies:`, `files:` and `token:`. In B11, the property `$token` (BE 3929) alongside method `token()` is legal PHP. |
| 6 | B2 ↔ B4–B14 | `Input`, `Ids`, `Dates`, `Slugger`, `HtmlSanitizer` (BE 805-810) | OK. Every consumer uses the declared signatures. |
| 7 | B3 ↔ B4/B13 | `SeasonCalculator::seasonFor` (BE 1162) → `ThemeResolver` (BE 1540) | OK. |
| 8 | B4 ↔ B5 | `DefaultThemes::all()`, settings doc `_id:'site'` (BE 1494, 1741-1745) | OK. Both use the same document id and field names. |
| 9 | B4 ↔ B13 | `ThemeController` gets a full rewrite (BE 4746-4806) plus a Services change (BE 4808-4817) | OK. `active()` is preserved, so B4's ThemeTest still passes (B13 expects 12 = 8 + 4). |
| 10 | B5 ↔ B6/B14 | User doc shape `{email lc, passwordHash, name, role, active, createdAt}` (BE 1647, 1755-1762) | OK. `UserRepository::findByEmail` lowercases (BE 2012), and `UserService::create` builds the same shape (BE 4974-4981). |
| 11 | B5 ↔ B13 | `Seeder::run(null)` in the ThemeAdminTest setUp (BE 4535) | OK. |
| 12 | B6 ↔ B7 | `JwtService::verify`, `AuthController::userPayload`, `me()` added to AuthController (BE 2521-2531) | OK. The `Ids` and `ApiException` imports already exist (BE 2185-2189). |
| 13 | B1 (`index.php`) ↔ B7 (AdminAccessTest) | Header copy `REDIRECT_HTTP_AUTHORIZATION` → `HTTP_AUTHORIZATION` (BE 774-776) is supposed to be covered by the test at BE 2363-2375 (Review Focus 5, BE 35) | **CONFLICT (test does not test the code).** The test copies the `if` block verbatim (BE 2369-2371) and then sets the `Authorization` header by hand (BE 2373). It never executes `index.php` and would pass even if BE 774-776 were deleted. Review Focus 5 is therefore uncovered. See §3. |
| 14 | B8 ↔ B10 | `UploadService::isImagePath(…,'posts')`, `delete()` (BE 2852-2871) → `PostService` (BE 3653-3671, 3711-3712) | OK. |
| 15 | B8 ↔ B12 | `isPdfPath`, `isImagePath(…,'content')` → `ContentService` (BE 4343, 4351-4352) | OK. |
| 16 | B8 ↔ B15 | Path layout `posts/YYYY/MM`, `content/…`, `docs/…` → `UploadCleaner` | OK. Dotfiles are skipped (BE 5232), which matches the test's `.htaccess`. |
| 17 | B9 ↔ B10 / B11 | `GroupRepository::countExisting`, `findBySlug` (BE 3108-3122) | OK. |
| 18 | B10 ↔ B11 | `PostRepository::paginate`, `findPublishedBySlug`, `PostPresenter::paged($admin=false)` | OK. The public output drops admin fields, which B11 asserts at BE 3956. |
| 19 | B1 (`ensureIndexes`, TTL 900 s, BE 577) ↔ B6 (`LoginRateLimiter` + `FixedClock` 2026-10-15) | TTL works on real time, but the fixtures are dated by the fixed clock, so they are already past 15 minutes in real time | **RISK (flaky).** The mongod TTL monitor runs every 60 s and may delete `login_attempts` rows mid-test. That would make the 429 assertions (BE 1923, 1936) intermittently fail. The probability is low but non-zero. Fix: no TTL index in the test DB, or a `createdAt` that is not used by TTL. |
| 20 | B1 (Dockerfile, BE 214-228) ↔ B5 (`bin/seed.php` against Atlas, spec §4 l.81) | The `pecl install mongodb` line has no `libssl-dev`/`pkg-config` | **CONFLICT (env).** The official `php:8.4-cli` image purges `libssl-dev`, so ext-mongodb builds without TLS. `mongodb+srv://` to Atlas, which deploy.md seed step 5 needs (FE 4953-4958), then fails with "SSL support not present". Add `libssl-dev pkg-config` to the `apt-get install` at BE 221. |
| 21 | B1 (Dockerfile/compose, no php.ini) ↔ B8 (`PDF_MAX = 10 MB`, BE 2809; spec §6 l.117) | PHP defaults are `upload_max_filesize=2M` and `post_max_size=8M` | **CONFLICT.** In dev, test and E2E (`php -S`), any PDF over 2 MB is rejected by PHP. Over 8 MB the whole POST body is dropped, so the API answers **400 "Brak pliku"** instead of 413 (BE 2945-2948). The 10 MB PDF limit in the contract cannot be reached. Nothing configures these ini values for OVH either (F20). Add `upload_max_filesize=10M` and `post_max_size=12M` to the Dockerfile ini and document them for OVH (`.user.ini` or panel). |

### 1b. Frontend ↔ frontend

| # | Tasks | Producer → consumer | Finding |
|---|---|---|---|
| 22 | F1 → F3 → F9 → F18 | `app.config.ts`: base (FE 200-223), `provideAppInitializer` (FE 803-809), `withInterceptors([authInterceptor])` (FE 2383), `withInterceptors([ssrApiInterceptor, authInterceptor])` (FE 4562) | OK. Each edit is additive and the final interceptor order is correct. |
| 23 | F1 → F5 → F6/F7/F8 → F9 | `app.routes.ts`: empty (FE 294-299), layout + `**` (1303-1322), children "before `**`" (1692-1697, 1874-1878, 2044-2052), `admin` as **first** element (2378-2381) | OK. The admin lazy route has no `**`, so unmatched `/admin/x` falls back to the public NotFound, as F9 Step 3 expects. |
| 24 | F9 ↔ F10 | `admin.routes.ts`: preliminary version (FE 2368-2376), full rewrite (FE 2613-2645) | OK. F10 keeps `logowanie`. |
| 25 | F10 ↔ F13–F17 | Placeholders `PostEditorPage`/`GroupsAdminPage`/`ContentAdminPage`/`ThemesAdminPage`/`UsersAdminPage` (FE 2646-2653), overwritten later | OK. Class names and file names match the `loadComponent` imports (FE 2630-2639). |
| 26 | F2 ↔ F3–F17 | `models.ts`, `PublicApi`, `AdminApi` (FE 431-598) | OK. Every method name and type used downstream exists, including `PublicApi.groups()` in the editor (FE 3535). |
| 27 | F3 ↔ F16 | `ThemeService.apply/load`, `SHADES`, `DEFAULT_THEMES` (FE 711-800) | OK. |
| 28 | F4 ↔ F5 | `<app-a11y-toolbar>` inside `PublicLayoutComponent` (FE 1242) | OK. In jsdom `speechSynthesis` is absent, so `supported=false` and the layout spec does not crash. |
| 29 | F6 ↔ F7 | `<app-post-list [data] [error] (pageChange)>` (FE 1540-1582) → GroupDetailPage (FE 1831) | OK. |
| 30 | F6 ↔ F8 | `<app-gallery [images]>` (FE 1450-1498) → ContentPage (FE 2007) | OK. |
| 31 | F8 ↔ F15 | `formatSize` (FE 1962-1965) → ContentAdminPage (FE 3838) | OK. |
| 32 | F11 ↔ F12 | `UploadQueue`, `ImageResizer`, `UnsupportedImageError` (FE 2670-2677) | OK. Constructor, `onDone`, `busy`, `retry` and `remove` are all used as declared. |
| 33 | F12 ↔ F13 | `<app-rich-text [(value)]>` (FE 3005-3006). RichText copies `value()` into the editor model only in `ngOnInit` (FE 3151-3153). PostEditorPage binds `[value]="form.controls.body.value"` (FE 3467) and fills the form **asynchronously** after `api.post(id)` (FE 3536-3546). | **CONFLICT (data loss on edit).** When an existing post is opened, the editor stays empty. The first keystroke emits only the new text and overwrites the stored body. No test covers edit mode; the F13 tests only create. Fix: RichText needs an `effect`/`ngOnChanges` that syncs `value` into `raw` when the change is external. |
| 34 | F12 ↔ F15 | Same RichText inside the `p-dialog` content (FE 3879) | **CONFLICT (same root cause).** Projected content is instantiated once with the page, so `ngOnInit` runs while `draft.body` is `''`. `openEdit` replaces `this.draft` (FE 3948-3952), but the editor keeps showing the old or empty text. The same applies to the uploader queue, which survives between dialog openings. |
| 35 | F12 ↔ F13/F15 tests | Stubs `RichTextStub`/`UploaderStub` (FE 3353-3356, 3778-3781) versus real inputs/outputs `images`, `context`, `max`, `busyChange` | OK. `(busyChange)` on a stub with no such output becomes a plain DOM listener, so there is no compile error. |
| 36 | F9 ↔ F10/F13/F17 | `AuthService.isAdmin`/`user` signals (FE 2205-2206), mocked as `{isAdmin: signal()}`/`{user: signal()}` in specs | OK. Each page touches only the mocked member. |
| 37 | F10 ↔ F13–F17 | `MessageService`/`ConfirmationService` provided by `AdminLayoutComponent` (FE 2470), injected by every admin page | OK. Specs provide both. |
| 38 | F18 ↔ F3/F9/F6-F8 | `ssrApiInterceptor` returns `EMPTY` on the server (FE 4558-4559) | OK. `ThemeService.load` returns early on the server (FE 788), and pages render "Ładowanie…". `firstValueFrom(EMPTY)` in `ensureSession` throws and is caught. |
| 39 | F18 ↔ F20 | `index.csr.html` fallback (FE 4592, 4897) | OK. The script also handles a missing file. |
| 40 | F1 ↔ F19 | `proxy.conf.json` → 8080 (FE 102-108); `proxy.e2e.json` → 8081 (FE 4613-4619) | OK. |

### 1c. Backend ↔ frontend (contract consumption)

| # | Tasks | What FE consumes vs what BE produces | Finding |
|---|---|---|---|
| 41 | B0/B6 ↔ F9 | `POST /api/auth/login` → `LoginResponse{accessToken,user{id,email,name,role}}` (BE 2230) vs FE `LoginResponse` (FE 441). Refresh returns `LoginResponse` (BE 2244; FE uses `res.user`/`res.accessToken`, FE 2221-2222). Logout returns 204 plus a clearing cookie (BE 2249). Cookie `Path=/api/auth` matches FE `/api/auth/refresh`. | OK. The login 401 `INVALID_CREDENTIALS` does not trigger a refresh, because the interceptor only covers `/api/admin` (FE 2269). |
| 42 | B7 ↔ F9 | `AuthMiddleware` 401 `UNAUTHORIZED` (BE 2484-2487) drives refresh-once-and-retry (FE 2275-2287) | OK. |
| 43 | B4 ↔ F3 | `GET /api/theme` → `Theme{id,key,name,type,palette{"50".."900",accent,text},seasonStart}` (BE 1565-1572) vs FE `Theme`/`Palette` (FE 436-438) | OK. The palette is encoded as a JSON object with string keys (BE 1570). |
| 44 | B13 ↔ F16 | Themes `GET/POST/PUT/DELETE`, settings `GET/PUT` (BE 4821-4826). FE sends `{name,palette}` and adds `seasonStart` only for season themes (FE 4278). BE requires `seasonStart` for season themes (BE 4672-4674). FE sends `manualThemeId:null` in auto mode (FE 4246). | OK. Note: the contract marks `seasonStart?` as optional (BE 159), but for season themes it is required. The FE behaves correctly. |
| 45 | B8 ↔ F2/F12 | Multipart fields `image`, `thumb`, `context` and response 201 `UploadedImage` (BE 2929-2935) vs FE FormData (FE 562-568) and `filter(Response)` (FE 3311) | OK. 413/400 messages reach the user through `apiErrorMessage`. |
| 46 | B8 ↔ F15 | `POST /api/admin/uploads/pdf` field `file` → 201 `Attachment` (BE 2937-2940) vs FE (FE 570-574, 3961-3973) | OK at the shape level. The PDF size limit is broken by the environment; see row 21. |
| 47 | B9 ↔ F7 | `GET /api/groups`, `GET /api/groups/{slug}` (404) (BE 3305-3306) vs FE (FE 523-529, 1854) | OK. |
| 48 | B9 ↔ F14 | Admin groups `{name, order, description}` (BE 3200-3207) vs FE `GroupInput` (FE 460, 3721) | OK. `Input::int` takes `null`, so a cleared InputNumber becomes 0 through `??`. |
| 49 | B9 ↔ F13 | The user role needs the group list, but `/api/admin/groups` is admin-only (BE 3308) | OK. FE uses public `GET /api/groups` (FE 3535), as noted at FE 3333. |
| 50 | B10 ↔ F10 | `GET /api/admin/posts?page` → `Paged<AdminPost>`, 20 per page, sorted by `updatedAt` desc (BE 3829-3834) vs FE paginator rows 20 (FE 2561) | OK. |
| 51 | B10 ↔ F13 | `PostInput` (FE 458, built by `buildPostInput` FE 3443-3453) vs `PostService::validate` (BE 3678-3697): title ≤200, excerpt ≤500, `images[].file/thumb` under `posts/…`, `alt` ≤300, `targets.news` bool, `groupIds` hex24, status enum | OK. FE maxlengths match (FE 3462, 3465, 3220). |
| 52 | B11 ↔ F6/F7 | `GET /api/posts?news=1&group=&page=`, 12 per page, 404 for an unknown group (BE 4037-4051) vs FE query `page`,`news=1`,`group` (FE 512-517), rows 12 (FE 1564), 404 handling (FE 1864-1866) | OK. |
| 53 | B11 ↔ F6 | `GET /api/posts/{slug}`, 404 for drafts (BE 4054-4058) vs FE notFound branch (FE 1684) | OK. |
| 54 | B12 ↔ F8 | `GET /api/content/{page}` → `ContentItem[]` (BE 4426-4432) vs FE (FE 531-533, 2034) | OK. |
| 55 | B12 ↔ F15 | `GET /api/admin/content?page=` (page required, BE 4436), `ContentInput` (BE 4360-4368) vs FE (FE 581-584, 3980-3985) | OK. |
| 56 | B14 ↔ F17 | `POST {email,name,role,password}`, `PUT {name,role,active,password?}` (BE 4965-5007) vs FE (FE 462-463, 4467-4469) | OK. FE omits `password` when it is empty, and BE ignores an empty value anyway. |
| 57 | B0 ↔ F2 | Error envelope `{error:{code,message}}` vs `apiErrorMessage` (FE 486-493) | OK. |
| 58 | B5 ↔ F19 | `bin/seed.php --fresh` with admin args (BE 1778-1806) vs `e2e:seed` (FE 4624), `ADMIN` (FE 4657), Pingwinki group (FE 4703) | OK. `--fresh` with `APP_ENV=test` is allowed (BE 1792). |
| 59 | B1 (`index.php` Dotenv immutable, BE 778-779) ↔ F19 (`-e MONGO_DB=przedszkole_e2e`, FE 4623) | The env override has to win over `.env` | OK. Dotenv is immutable and the php image runs with no php.ini (`variables_order=EGPCS`). |
| 60 | B1 (`index.php` root detection BE 770, header copy BE 774-776) ↔ F20 (`deploy/api/index.php`, `api.htaccess` E=HTTP_AUTHORIZATION, FE 4836-4851, 4905) | OK. After the rewrite, Apache exposes `REDIRECT_HTTP_AUTHORIZATION`, which is exactly what `index.php` copies. |
| 61 | B15 ↔ F20 | `bin/cleanup-uploads.php` (BE 5272-5286) vs the cron path `www/api/bin/cleanup-uploads.php` (FE 4959) | OK. `$root = /www/api`, and `.env` and `vendor/` are there. |

---

## 2. Per-task self-consistency (do the task's tests pass against the task's code? do files match across steps?)

| Task | Lines | Finding |
|---|---|---|
| B0 | 77-172 | OK. Every route has a role and a response shape. Minor gaps: `405 METHOD_NOT_ALLOWED` is not listed, and the meaning of `seasonStart?` (required for season themes) is ambiguous. |
| B1 | 176-793 | OK. HealthTest has 3 tests and they pass. RISK: `pecl install mongodb-1.15.3` on PHP 8.4 (BE 222) may not compile; the plan already gives a fallback (BE 217-218). CONFLICT (env): `libssl-dev` is missing (row 20) and upload ini limits are missing (row 21). |
| B2 | 797-1151 | OK. Slugger, Input and HtmlSanitizer expectations match the code. The `<u>`/`<s>` allowlist works under the HTMLPurifier default Transitional doctype. |
| B3 | 1155-1258 | OK. 10 data rows + 2 tests = 12, matching "12 tests" (BE 1256). |
| B4 | 1262-1635 | OK. 4 tests. `array_combine` gives int keys, which are recast to strings at BE 1563 and so still produce JSON keys "50"…. |
| B5 | 1639-1818 | OK. 2 tests. The `$setOnInsert` + equality-filter upsert is valid. |
| B6 | 1822-2287 | OK. 9 tests (BE 2285). RISK: TTL flakiness (row 19). |
| B7 | 2291-2594 | Tests pass. **CONFLICT:** the REDIRECT_HTTP_AUTHORIZATION test is tautological (row 13 / §3). |
| B8 | 2598-2979 | OK. 10 tests (BE 2977). `assertOk` checks the error code before `detect()`, so the size cases never reach `finfo`. |
| B9 | 2983-3319 | OK. 6 tests. `array_diff_key` keeps key order name/slug/order/description as the presenter emits it. |
| B10 | 3323-3901 | OK. 11 tests. `publishedAt` `2026-10-15T12:00:00+02:00` is correct for October (CEST). `assertSame([$img], …)` key order file/thumb/w/h/alt matches `validateImages` output. |
| B11 | 3905-4082 | OK. 6 tests. |
| B12 | 4086-4499 | OK. 6 tests. Validation order (attachments, images, then page) still yields 400 for `page: nie-ma`. |
| B13 | 4503-4834 | OK. 8 + 4 = 12. The palette sent back with int PHP keys still satisfies `$palette['50']` lookups. |
| B14 | 4838-5130 | OK. 7 tests. |
| B15 | 5134-5293 | OK. 1 test. mtimes are set relative to `FixedClock`, so the threshold logic holds. |
| F1 | 69-315 | OK. The spec checks `router-outlet` and `lang`, and the constructor sets `lang`. Minor: `<title>` uses the full name (FE 134); see §4. |
| F2 | 319-602 | OK. URL and param ordering `page` then `news` match the expectations at FE 357/360. Encoded slug matches FE 365. |
| F3 | 606-813 | OK. Autumn 700 is `#b91c1c` and winter 700 is `#1d4ed8`, as asserted. |
| F4 | 817-1094 | OK. `TestBed.tick()` exists in Angular ≥ 20; the plan pins ≥ 20 (FE 9). |
| F5 | 1098-1326 | OK. h1 text is exact; skip link focuses `main`. |
| F6 | 1330-1701 | OK. `flush` with status 0 gives an `HttpErrorResponse` with status 0, which produces the "Brak połączenia" message. |
| F7 | 1705-1882 | OK. |
| F8 | 1886-2056 | OK. `formatSize(204800)` is "200 KB". |
| F9 | 2060-2387 | OK. `shareReplay(1)` + `finalize` gives a single refresh. The retry goes via `next`, so there is no second refresh. Injects in the guards run before the first `await`. |
| F10 | 2391-2657 | OK. |
| F11 | 2661-2992 | OK. Traced the queue microtasks: 3 jobs start synchronously, and done order is a…e. RISK: `ng g web-worker` (FE 2681) may add `webWorkerTsConfig` to a `test` target whose `@angular/build:unit-test` schema may not accept it. Check `ng test` right after Step 1. |
| F12 | 2996-3322 | Tests pass. **CONFLICT** in the component contract: `value` is read only once, in `ngOnInit` (FE 3151-3153). This breaks F13 and F15 (rows 33-34). |
| F13 | 3326-3587 | Tests pass (create only). **CONFLICT:** editing loads the body after init, so the editor shows empty text (row 33). The tests reach `protected` members through `as unknown as` (FE 3394), as acknowledged at FE 3583. |
| F14 | 3591-3749 | OK. |
| F15 | 3753-4012 | Test passes. **CONFLICT:** RichText inside the dialog does not reflect `openEdit` (row 34). |
| F16 | 4016-4312 | OK. Built-in palettes clear all three contrast checks (summer 700 `#a16207` ≈ 4.9:1). |
| F17 | 4316-4496 | OK. |
| F18 | 4500-4597 | OK. |
| F19 | 4601-4785 | Runs, but two assertions are vacuous (§3), and admin UI login and the post page are not covered (§4). |
| F20 | 4789-4981 | OK structurally. CONFLICT (env): the deploy.md seed step against Atlas fails with the B1 image (row 20), and `php -r` is not available locally (§5). |

---

## 3. Things a code reviewer would treat as defects (mandated by the plan)

| # | Where | Defect |
|---|---|---|
| D1 | BE 2363-2375 (B7) | The test does not exercise `public/index.php`. It copies the `if` block from BE 774-776 verbatim and then injects the header manually (BE 2373), so it passes regardless of the production code. Review Focus 5 (BE 35) claims this as coverage. |
| D2 | FE 4751-4755 (F19 `seasonal theme from API is applied`) | `styles.scss` already sets `--app-primary-700: #b91c1c` (FE 233), which is in the accepted list. In autumn, which is now, the test cannot fail even if `/api/theme` never loads. |
| D3 | FE 4713 (F19) | `getByRole('row',{name:title}).getByRole('button',{name:/Usuń/})).toHaveCount(0)` also passes when the row does not exist. Assert that the row is visible first. |
| D4 | BE 3680-3683 ≡ BE 4337-4340 | Identical `body` validation block in `PostService::validate` and `ContentService::validate`. |
| D5 | BE 3709-3721 ≈ BE 4349-4356 | Near-verbatim image validation and mapping loop in Post and Content services. |
| D6 | BE 4321-4329 ≈ BE 5252-5266 (+ BE 3653-3660, 3668-3671) | The "collect file/thumb/attachment paths" logic is repeated in four places. |
| D7 | BE 1421-1467, 2016-2042, 3102-3139, 3538-3569, 4228-4248 | Five repositories with identical `findById/insert/update/delete` bodies. A reviewer may ask for a base class or trait. |
| D8 | FE 3353-3356 ≡ FE 3778-3781 | `RichTextStub`/`UploaderStub` are duplicated verbatim across two specs. |
| D9 | BE 2720 | The test writes a fixed path `sys_get_temp_dir().'/fake.webp'`, and `Fixtures::tmp` files (BE 2628-2631) are never removed. Temp files leak on every run. |
| D10 | BE 577 vs BE 331 | A TTL index on real time combined with fixed-clock fixtures gives flaky rate-limit tests (row 19). |

---

## 4. Conflicts with Global Constraints or the spec

| # | Rule | Plan text | Finding |
|---|---|---|---|
| G1 | FE GC (FE 18): `<title>` uses `SITE_SHORT_NAME` | F1 sets `<title>` to the full name (FE 134); F5 home route has `title: SITE_NAME` (FE 1316) | **CONFLICT (minor).** Use `SITE_SHORT_NAME` or `pageTitle(...)`. |
| G2 | Spec §10 (l.209): E2E "logowanie admin/user" | F19 logs in through the UI only as TEACHER (FE 4694). Admin authenticates only via the API (FE 4672) | **CONFLICT (coverage gap).** There is no admin UI login E2E. |
| G3 | Spec §10 (l.209): axe audit on "stronie głównej, liście wpisów, **wpisie** i podstronie treści" | `a11y.spec` paths (FE 4763) have no `/wpis/:slug` | **CONFLICT (coverage gap).** |
| G4 | Spec §10 (l.207): FE unit "ThemeService (**mapowanie palety**, fallback)" | `PaletteApplier` is always mocked (FE 676). Nothing tests the `--app-primary-*` / `updatePrimaryPalette` mapping | Gap, minor. |
| G5 | Spec §6 (l.97, 117): 413 for a file that is too large; PDF ≤ 10 MB | No `upload_max_filesize`/`post_max_size` set anywhere (row 21) | **CONFLICT.** |
| G6 | Spec §4 (l.81): seed run locally against production Atlas | The B1 image has no TLS in ext-mongodb (row 20) | **CONFLICT.** |
| G7 | BE GC (BE 18): `declare(strict_types=1)` in every PHP file; BE GC (BE 20) `/api` prefix with no basePath | All files comply | OK. |
| G8 | FE GC (FE 24): no Google Fonts; FE GC (FE 26): browser APIs guarded at prerender | Fontsource is used; A11y, Speech, Theme and ImageResizer are guarded | OK. |

---

## 5. Environment check (docker + compose + node/npm; no local php/composer)

| # | Command / assumption | Lines | Finding |
|---|---|---|---|
| E1 | `php -r "echo bin2hex(random_bytes(32));"` to generate `JWT_SECRET` | BE 277 (`.env.example`, used in B1 Step 1 BE 291); FE 4949 (deploy.md) | **Cannot run locally.** Replace with `docker compose run --rm php php -r "…"` or `openssl rand -hex 32` / `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| E2 | `pecl install mongodb-${1.15.3}` on `php:8.4-cli` | BE 219-223; FE 4928 (local Apache test) | RISK. 1.15.x predates PHP 8.4, and the build may fail. The plan has a fallback (BE 217-218). Also missing `libssl-dev`, which breaks Atlas TLS (row 20). |
| E3 | Seed against Atlas via `docker compose run --rm php php bin/seed.php --env-file=.env.prod` | FE 4955-4956 | **Fails** with the current Dockerfile (no TLS). Works after adding `libssl-dev`. |
| E4 | All `vendor/bin/phpunit`, `composer install`, and the seed via `docker compose run --rm php …` | BE 69-72 etc. | OK. `phpunit.xml` uses the in-network `mongodb://mongo:27017` (BE 265). |
| E5 | `e2e:backend` / `e2e:seed` via `docker compose -f ../docker-compose.yml run …` from npm scripts | FE 4623-4624 | OK. Requires `backend/.env` from B1 Step 1, because `seed.php` uses `->load()` (BE 1787). |
| E6 | `package.mjs` runs `docker compose run -w /app/deploy/api php composer install --no-dev` | FE 4910 | OK. `deploy/` is inside the `.:/app` bind mount. On a Linux host, `vendor/` would be root-owned and break the next `rmSync`; Docker Desktop on Windows is unaffected. |
| E7 | `npx @angular/cli@latest new`, `npx ng …`, `npx playwright install chromium` | FE 82-85, 4782 | OK (node/npm). |
| E8 | Manual phone test over `ng serve --host 0.0.0.0` on the LAN | FE 3585 | Works for upload, but the `Secure` refresh cookie is rejected on non-localhost http. Session refresh will not work there, so after 60 min the user is logged out. |

---

Row count: §1 = 61, §2 = 36, §3 = 10, §4 = 8, §5 = 8 → **123 rows**.
