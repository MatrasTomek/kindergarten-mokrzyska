# Motywy świąteczne (dekoracje) — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Administrator może włączyć jeden z 8 wbudowanych motywów świątecznych, który dokłada małe ilustracje SVG w wolnych miejscach stron publicznych i nie zmienia palety.

**Architecture:** Backend przechowuje `decorKey` w dokumencie `settings` (`_id: 'site'`), wystawia `GET/PUT /api/admin/decor` i dokłada pole `decor` do `GET /api/theme`. Frontend ma katalog motywów (`decor-catalog.ts`) z plikami w `frontend/public/decor/<klucz>/`, sygnał `ThemeService.decor`, czystą funkcję rozmieszczania oraz komponent warstwy w `PublicLayoutComponent`. Panel motywów dostaje osobną sekcję wyboru.

**Tech Stack:** PHP 8 + Slim + MongoDB (PHPUnit 11), Angular 21.2 + PrimeNG 21.1.10 (`ng test`), Playwright + axe (e2e).

**Spec:** `docs/superpowers/specs/2026-10-20-motywy-swiateczne-design.md`

## Global Constraints

- Motywy kolorystyczne (`themes`, `themeMode`, `manualThemeId`, `/api/admin/settings`) bez zmian w zachowaniu i kształcie odpowiedzi.
- Klucze (dokładnie te, w tej kolejności): `christmas`, `epiphany`, `easter`, `pentecost`, `corpus-christi`, `all-saints`, `st-nicholas`, `childrens-day`.
- Nazwy: Boże Narodzenie, Trzech Króli, Wielkanoc, Zesłanie Ducha Świętego, Boże Ciało, Wszystkich Świętych, Mikołajki, Dzień Dziecka.
- Każdy zestaw: 4–6 plików SVG, każdy ≤ 4 KB, w `frontend/public/decor/<klucz>/`.
- Widocznych ilustracji: 4–6 na szerokim ekranie, 2–3 na wąskim. Zasada „nigdy na treści” wygrywa z liczbą.
- Ilustracje: `aria-hidden="true"`, `alt=""`, `pointer-events: none`, bez fokusu, pozycjonowanie absolutne (bez CLS), bez poziomego przewijania strony.
- Tylko trasy publiczne, nigdy `/admin`. Bez `localStorage`/pre-paint dla dekoracji, renderowanie tylko w przeglądarce.
- Komunikaty błędów API po polsku.
- **Bez commitów** — właściciel commituje sam. Kroki „Commit” zastępuje sprawdzenie `git status`.
- Sandbox: testy frontendu uruchamiaj na kopii w scratchpadzie (rsync bez `node_modules` + `npm ci`), e2e na pełnej kopii repo (docker compose z kopii).

## Review Focus

1. **Krótka strona** (404, Kontakt): marginesy są niskie, a ilustracje nie mogą na siebie nachodzić ani wychodzić poza dokument. Wtedy po prostu jest ich mniej (test w Task 3).
2. **Obrót telefonu / zmiana szerokości okna:** układ liczy się na nowo, a nic nie zostaje na treści (test w Task 4).
3. **Powiększona czcionka 150% (`a11y-font-2`):** kolumna treści jest szersza w px, więc strefy liczymy z rzeczywistego prostokąta `.site-header`, a nie z wartości wpisanej na stałe (test w Task 4).
4. **`/api/theme` nie odpowiada:** wtedy `decor` = `null`, nic się nie renderuje i nie ma błędów w konsoli (test w Task 2).
5. **W bazie zostaje nieznany lub nieaktualny `decorKey`** (np. ręcznie wpisany): API zwraca `null` zamiast nieznanego klucza, a frontend ignoruje klucz spoza katalogu (testy w Task 1 i Task 2).

---

### Task 1: Backend — ustawienie `decorKey`, API admina, pole `decor` w `/api/theme`

**Files:**
- Create: `backend/src/Theme/DecorThemes.php`
- Modify: `backend/src/Theme/SettingsRepository.php`, `backend/src/Theme/ThemeService.php`, `backend/src/Theme/ThemeController.php`, `backend/src/Routes.php` (blok tylko-admin, obok `/settings`)
- Test: `backend/tests/Integration/DecorTest.php` (nowy), `backend/tests/Unit/DecorThemesTest.php` (nowy)

**Interfaces:**
- Produces:
  - `DecorThemes::KEYS` (`list<string>`, 8 kluczy z Global Constraints), `DecorThemes::isKnown(string $key): bool`
  - `SettingsRepository::decorKey(): ?string` (pole `decorKey` dokumentu `site`, brak → `null`), `SettingsRepository::saveDecorKey(?string $key): void` (`$set` tylko `decorKey`, upsert; **nie** dotyka `themeMode`/`manualThemeId`)
  - `ThemeService::decor(): array{decorKey:?string}` — nieznany klucz z bazy zwraca `null`
  - `ThemeService::saveDecor(array $in): array{decorKey:?string}` — `decorKey` musi być `null` albo znanym kluczem, inaczej `ApiException::validation('Wybierz istniejący motyw świąteczny.')`
  - `GET /api/admin/decor` → `{"decorKey": string|null}`; `PUT /api/admin/decor` body `{"decorKey": ...}` → to samo. Trasy tylko dla admina.
  - `GET /api/theme` → dotychczasowe pola + `"decor": string|null`

- [ ] **Step 1: Napisz testy, które nie przechodzą**

`DecorThemesTest`: `testKeysAreTheEightHolidays` (`assertSame([...8 kluczy...], DecorThemes::KEYS)`), `testIsKnown` (`easter` → true, `halloween` → false).

`DecorTest extends ApiTestCase` (setUp jak w `ThemeAdminTest`: Seeder + token admina):
- `testDefaultIsNull`: `GET /api/admin/decor` → `['decorKey' => null]`, `GET /api/theme` ma `decor` === `null`.
- `testSaveAndPublicTheme`: `PUT` `{'decorKey':'easter'}` → 200 i `['decorKey'=>'easter']`; `GET /api/theme` → `decor` === `'easter'`, a `key` dalej jest sezonowy (`'autumn'`, zegar 15.10).
- `testClearWithNull`: po `easter` `PUT` `{'decorKey':null}` → `['decorKey'=>null]`.
- `testUnknownKeyRejected`: `{'decorKey':'halloween'}` → 400. `{'decorKey':5}` → 400. Brak pola → 400.
- `testIndependentFromPalette`: `PUT /api/admin/settings` manual na motyw specjalny, potem `PUT /api/admin/decor` easter. `GET /api/admin/settings` zwraca dalej manual z tym id. Potem `PUT /api/admin/settings` auto i `decorKey` dalej `'easter'`.
- `testStaleKeyInDbIsNull`: `settings` ma `{_id:'site', decorKey:'stary'}`, więc `GET /api/theme` → `decor` null i `GET /api/admin/decor` → null.
- `testRequiresAdmin`: bez tokenu 401. Z tokenem roli `user` 403 (jak w istniejących testach ról).

- [ ] **Step 2: Uruchom — FAIL**

Run: `docker compose run --rm php vendor/bin/phpunit --filter 'Decor'`
Expected: FAIL (brak klasy `DecorThemes`, trasy 404).

- [ ] **Step 3: Zaimplementuj** zgodnie z Interfaces. `ThemeController::active` zwraca `ThemePresenter::toArray(...) + ['decor' => $this->service->decor()['decorKey']]`. Nowe metody `getDecor`/`putDecor` w `ThemeController`. `ThemePresenter` bez zmian (używa go też lista motywów).

- [ ] **Step 4: Uruchom całość backendu — PASS**

Run: `docker compose run --rm php vendor/bin/phpunit`
Expected: wszystkie zielone, w tym niezmienione `ThemeTest` i `ThemeAdminTest`.

- [ ] **Step 5:** `git status`, bez commitu.

---

### Task 2: Ilustracje SVG, katalog i dane frontendu

**Files:**
- Create: `frontend/public/decor/<klucz>/*.svg` (8 katalogów), `frontend/src/app/theme/decor-catalog.ts`, `frontend/src/app/theme/decor-catalog.spec.ts`
- Modify: `frontend/src/app/core/models.ts`, `frontend/src/app/core/api/public-api.ts`, `frontend/src/app/core/api/admin-api.ts`, `frontend/src/app/theme/theme.service.ts`, `frontend/src/app/theme/theme.service.spec.ts`

**Interfaces:**
- Consumes: API z Task 1.
- Produces:
  - `models.ts`: `export type DecorKey = 'christmas' | 'epiphany' | 'easter' | 'pentecost' | 'corpus-christi' | 'all-saints' | 'st-nicholas' | 'childrens-day'`. `export interface PublicTheme extends Theme { decor: string | null }`. `export interface DecorSettings { decorKey: DecorKey | null }`.
  - `decor-catalog.ts`: `export interface DecorTheme { key: DecorKey; name: string; images: string[] }` (ścieżki względne, np. `'decor/easter/lamb.svg'`). `export const DECOR_THEMES: readonly DecorTheme[]` (kolejność z Global Constraints). `export function decorTheme(key: string | null | undefined): DecorTheme | null` (nieznany → `null`).
  - `PublicApi.theme()` typowane jako `PublicTheme`.
  - `AdminApi.decor()` → `GET /api/admin/decor`; `AdminApi.saveDecor(s: DecorSettings)` → `PUT`.
  - `ThemeService.decor = signal<DecorTheme | null>(null)`. `load()` ustawia `decorTheme(theme.decor)`, a przy błędzie lub timeoucie `null`. `apply(theme)` nie zmienia `decor` (podgląd palety w adminie nie rusza dekoracji).

- [ ] **Step 1: Narysuj ilustracje.** Zestawy ze specyfikacji, sekcja 4. Styl: płaskie kolory, miękki ciemny kontur (np. `#4a3b32`, `stroke-width` 2–3 w `viewBox="0 0 64 64"`), zaokrąglone kształty, stałe własne kolory. Krzyż z Panem Jezusem i Dzieciątko: łagodne twarze, bez ran i krwi. Nazwy plików angielskie, kebab-case (`lamb.svg`, `egg.svg`, `cross.svg`, …). Każdy plik ma `viewBox`, nie ma `width`/`height` ani skryptów.

- [ ] **Step 2: Sprawdź pliki**

Run: `find frontend/public/decor -name '*.svg' -size +4k; for d in frontend/public/decor/*/; do echo "$d $(ls $d | wc -l)"; done; grep -rl '<script' frontend/public/decor`
Expected: brak plików > 4 KB, 8 katalogów po 4–6 plików, brak `<script`.

- [ ] **Step 3: Napisz testy, które nie przechodzą**

`decor-catalog.spec.ts`:
- klucze `DECOR_THEMES.map(t=>t.key)` w dokładnej kolejności i z nazwami z Global Constraints,
- każdy zestaw ma 4–6 obrazków, ścieżki `decor/<key>/<plik>.svg`, bez duplikatów,
- `decorTheme('easter')?.name === 'Wielkanoc'`, `decorTheme('halloween') === null`, `decorTheme(null) === null`.

`theme.service.spec.ts` (dopisz):
- odpowiedź `/api/theme` z `decor: 'easter'` → `service.decor()?.key === 'easter'`, paleta nałożona jak dotąd,
- `decor: 'stary'` → `decor()` === `null`,
- błąd 500 → `decor()` === `null`, użyty `fallbackTheme`,
- `apply(innyMotyw)` po load z easter → `decor()` dalej easter.

- [ ] **Step 4: Uruchom — FAIL**

Run: `cd frontend && npx ng test --watch=false`
Expected: FAIL (brak `decor-catalog`).

- [ ] **Step 5: Zaimplementuj** zgodnie z Interfaces. Listy `images` w katalogu odpowiadają plikom z kroku 1.

- [ ] **Step 6: Uruchom — PASS**

Run: `cd frontend && npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 7:** `git status`, bez commitu.

---

### Task 3: Rozmieszczanie — czysta funkcja

**Files:**
- Create: `frontend/src/app/theme/decor-placement.ts`, `frontend/src/app/theme/decor-placement.spec.ts`

**Interfaces:**
- Produces:
  - `export interface DecorZone { x: number; y: number; w: number; h: number }` (px względem dokumentu)
  - `export interface DecorItem { src: string; x: number; y: number; size: number; rotate: number; delay: number }` (x/y to lewy górny róg, `size` w px, `rotate` w stopniach, `delay` animacji w s)
  - `export function placeDecor(images: readonly string[], zones: readonly DecorZone[], opts: { count: number; minSize: number; maxSize: number; random: () => number }): DecorItem[]`

Algorytm (nieoczywisty z sygnatury):
1. Obrazki tasujemy (Fisher-Yates z `random`) i bierzemy po kolei. Jeśli `count` > liczby obrazków, zaczynamy od nowa, ale dwa sąsiednie nie mogą być takie same.
2. Dla każdego elementu losujemy `size` z [minSize, maxSize] i robimy do 20 prób: losowa strefa, w której element się mieści, i losowa pozycja wewnątrz niej. Odrzucamy próbę, jeśli prostokąt powiększony o 16 px odstępu nachodzi na już postawiony element.
3. Po 20 nieudanych próbach pomijamy element. Wynik może mieć mniej niż `count` elementów.
4. `rotate` z [-12, 12], `delay` z [0, 3).

- [ ] **Step 1: Napisz testy, które nie przechodzą** (`random` deterministyczny, np. prosty LCG z ziarnem)
- `places requested count inside zones`: dwie strefy 200×2000, count 5, rozmiary 48–72 → 5 elementów. Każdy całkowicie w jakiejś strefie, a pary nie nachodzą na siebie (z odstępem 16).
- `returns fewer when zones are too small` (Review Focus 1): jedna strefa 80×80, count 5 → 1 element.
- `returns empty for no zones or no images`.
- `no two consecutive identical images when count exceeds images`: 2 obrazki, count 5, duże strefy.
- `rotation and delay within bounds`.

- [ ] **Step 2: Uruchom — FAIL** (`npx ng test --watch=false`, brak modułu)
- [ ] **Step 3: Zaimplementuj** `placeDecor`.
- [ ] **Step 4: Uruchom — PASS**
- [ ] **Step 5:** `git status`, bez commitu.

---

### Task 4: Warstwa dekoracji w układzie publicznym

**Files:**
- Create: `frontend/src/app/layout/decor-layer.component.ts`, `frontend/src/app/layout/decor-layer.component.spec.ts`, `frontend/src/app/theme/decor-zones.ts`
- Modify: `frontend/src/app/layout/public-layout.component.ts` (+ spec)

**Interfaces:**
- Consumes: `ThemeService.decor` (Task 2), `placeDecor` (Task 3).
- Produces:
  - `decor-zones.ts`: `export function computeZones(doc: Document, win: Window): { zones: DecorZone[]; wide: boolean }`. `export const DECOR_ZONES = new InjectionToken<typeof computeZones>('DECOR_ZONES', { providedIn: 'root', factory: () => computeZones })`. `export const DECOR_RANDOM = new InjectionToken<() => number>('DECOR_RANDOM', { providedIn: 'root', factory: () => Math.random })`.
  - `<app-decor-layer />`: standalone, selektor `app-decor-layer`.

Strefy (`computeZones`) liczymy z rzeczywistego DOM:
- Kolumna = `getBoundingClientRect()` elementu `.site-header` plus `scrollX`. Wysokość dokumentu = `documentElement.scrollHeight`. Szerokość = `documentElement.clientWidth` (bez paska przewijania).
- **Szeroki** (`wide: true`), gdy każdy margines (lewy i prawy) ma ≥ 96 px. Strefy: lewy i prawy margines z wewnętrznym odstępem 16 px od kolumny i 8 px od krawędzi okna, od dołu nagłówka (`.site-header` bottom) do góry stopki (`footer` top) minus 16 px.
- **Wąski:** (a) wolny obszar w `.site-header` na prawo od `.brand`, jeśli ma ≥ 56 px szerokości, (b) dwa kwadraty 56×56 w górnych rogach `footer`, w jego wewnętrznym odstępie, o ile nie nachodzą na prostokąt `footer nav` ani `footer p`.

Komponent:
- Renderuje się tylko w przeglądarce. Gdy `decor()` === `null`, nie renderuje nic (zero `<img>`).
- Układ liczy w `afterNextRender` po: zmianie `decor`, każdym `NavigationEnd` routera oraz `resize` okna (debounce 150 ms). Za każdym razem losuje od nowa.
- Parametry: szeroki `count` = 4 + floor(random·3) (4–6), rozmiar 56–88 px. Wąski `count` = 2 + floor(random·2) (2–3), rozmiar 36–52 px.
- DOM: kontener `div.decor` z `aria-hidden="true"`, `position:absolute; inset:0 auto auto 0; width:100%; height:0; overflow:visible; pointer-events:none; z-index:0`. Dzieci to `<img alt="" [src] loading="lazy" decoding="async">` z `position:absolute`, `left/top/width` z `DecorItem` i animacją `decor-sway` (±3° wokół `rotate`, 6 s, `ease-in-out`, `infinite alternate`, `animation-delay` z `delay`). `prefers-reduced-motion` już wyłącza animację w `styles.scss`.
- Strefy liczymy wewnątrz `clientWidth`, więc dekoracja nie może dodać poziomego przewijania.
- `PublicLayoutComponent`: `:host { position: relative }`, `<app-decor-layer />` jako pierwsze dziecko przed skip-linkiem. `header`, `main` i `footer` dostają `position: relative; z-index: 1`, żeby treść zawsze leżała nad dekoracją.

- [ ] **Step 1: Napisz testy, które nie przechodzą** (`DECOR_ZONES` podmieniony na funkcję zwracającą stałe strefy, `DECOR_RANDOM` deterministyczny, `ThemeService` jako stub z sygnałem `decor`)
- `renders nothing when decor is null`: brak `img` w `.decor`.
- `renders 4–6 images from the active set on wide zones`: decor = easter, szerokie strefy. Liczba `img` w [4,6], każdy `src` z `DECOR_THEMES` dla easter, `alt` === `''`, kontener ma `aria-hidden="true"`.
- `renders 2–3 on narrow`.
- `reshuffles on NavigationEnd`: po nawigacji routera (`RouterTestingHarness` / `router.navigateByUrl`) wywołanie `zones` następuje ponownie.
- `recomputes on resize` (Review Focus 2): `window.dispatchEvent(new Event('resize'))` + `vi.advanceTimersByTime(150)` → ponowne wywołanie `zones`.
- `public-layout.component.spec.ts`: layout zawiera `app-decor-layer`.

- [ ] **Step 2: Uruchom — FAIL**
- [ ] **Step 3: Zaimplementuj** `computeZones`, komponent i zmianę layoutu.
- [ ] **Step 4: Uruchom — PASS** (`npx ng test --watch=false`) oraz `npx ng build` bez błędów (prerender nie może się wywrócić na `window`).
- [ ] **Step 5:** `git status`, bez commitu.

`computeZones` zależy od rzeczywistego układu, więc testujemy go w e2e (Task 6), łącznie z Review Focus 3.

---

### Task 5: Sekcja „Motyw świąteczny (dekoracje)” w panelu

**Files:**
- Modify: `frontend/src/app/admin/themes-admin.page.ts`, `frontend/src/app/admin/themes-admin.page.spec.ts`

**Interfaces:**
- Consumes: `AdminApi.decor/saveDecor`, `DECOR_THEMES`, `DecorKey` (Task 2), `ThemeService.load()`.

Zachowanie:
- `load()` pobiera w `forkJoin` także `decor: this.api.decor()`. Błąd któregokolwiek pokazuje istniejący alert z „Spróbuj ponownie”.
- Nowy `<fieldset class="box">` z `<legend>Motyw świąteczny (dekoracje)</legend>`, bezpośrednio po fieldsecie „Aktywny motyw”, przed „Motywy”.
- `p-select` z opcjami `[{ key: null, name: 'Brak' }, ...DECOR_THEMES]`, `optionLabel="name"`, `optionValue="key"`, `ariaLabel="Motyw świąteczny"`, model `decorKey: DecorKey | null`.
- Pod wyborem, gdy `decorKey` ≠ null: lista miniatur `<ul class="decor-preview">` z `<img [src] alt="" width="48" height="48">` dla wszystkich obrazków zestawu i tekst „Na stronie pojawi się losowo kilka z tych ilustracji.”
- Przycisk „Zapisz dekoracje” → `saveDecor({ decorKey })`. Sukces: toast `'Zapisano motyw świąteczny'` i `void this.themeService.load()`. Błąd: toast z `apiErrorMessage`. Flaga `decorSaving` blokuje podwójny zapis (wzór jak `settingsSaving`).
- Zapis dekoracji nie wysyła `PUT /api/admin/settings` i odwrotnie.

- [ ] **Step 1: Napisz testy, które nie przechodzą.** `flushInitial` dopisuje `http.expectOne('/api/admin/decor').flush({ decorKey: null })`. Testy:
- `saves decor without touching palette settings`: ustaw `decorKey='easter'`, `saveDecor()`. Body `PUT /api/admin/decor` = `{ decorKey: 'easter' }`, `http.match('/api/admin/settings')` filtrowane po PUT jest puste.
- `saving palette settings does not send decor`.
- `shows thumbnails of selected set`: decorKey easter → liczba `img` w `.decor-preview` = liczba obrazków easter. Przy null brak listy.
- `allows clearing to Brak`: zapis z `decorKey: null` wysyła `{ decorKey: null }`.
- `shows error toast on save failure` (400 z komunikatem).
- Istniejące testy przechodzą po dopisaniu `/api/admin/decor` w `flushInitial` i w teście retry.

- [ ] **Step 2: Uruchom — FAIL**
- [ ] **Step 3: Zaimplementuj.**
- [ ] **Step 4: Uruchom — PASS** (`npx ng test --watch=false`)
- [ ] **Step 5:** `git status`, bez commitu.

---

### Task 6: E2E, dostępność i podgląd dla właściciela

**Files:**
- Modify: `frontend/e2e/site.spec.ts`, `frontend/e2e/a11y.spec.ts`
- Create: `docs/superpowers/decor-podglad.html` (strona do oceny grafik przez właściciela, poza buildem)

- [ ] **Step 1: Dopisz testy e2e** (włączanie przez `PUT /api/admin/decor` z `adminToken`, w `afterAll` przywrócenie `null`):
- `site.spec.ts` › `holiday decor`: przy easter na `/` w viewport 1440×900 widać 4–6 `.decor img`. Każdy ma `alt=""`. Istnienie plików sprawdza osobny test niżej, bo `naturalWidth` przy `loading="lazy"` bywa 0 poza ekranem. Prostokąt żadnego nie przecina prostokąta `.site-header .brand`, `main h1` ani `footer nav`. `document.documentElement.scrollWidth <= clientWidth`.
- Wąsko 390×844: 0–3 obrazków (Review Focus 1, „mniej, gdy brak miejsca”), żaden nie przecina `.brand-name`, `main` ani `footer nav`/`footer p`.
- Zmiana viewportu 1440 → 390 (Review Focus 2): po 300 ms obowiązują warunki z wąskiego wariantu.
- `html.a11y-font-2` (kliknięcie przycisku powiększenia w pasku dostępności) przy 1440 (Review Focus 3): żaden obrazek nie przecina prostokąta `.site-header`.
- Nawigacja `/` → `/kontakt` (krótka strona): obrazki w obrębie dokumentu (`top + height <= scrollHeight`).
- `/admin` po zalogowaniu: 0 `.decor img`.
- Przy `decorKey: null`: 0 `.decor img` na `/`.
- Każdy plik z katalogu zwraca 200: iteracja po ścieżkach z `DECOR_THEMES` (import z `../src/app/theme/decor-catalog`) przez `request.get('/' + path)`.
- `a11y.spec.ts`: audyt `axe` strony głównej i jednej podstrony z włączonym easter, bez naruszeń.

- [ ] **Step 2: Uruchom e2e** (na kopii repo, jak w Global Constraints)

Run: `cd frontend && npm run e2e:backend` (w tle), `npm run e2e:seed`, `npm run e2e`
Expected: PASS, także dotychczasowe testy.

- [ ] **Step 3: Strona podglądu** `docs/superpowers/decor-podglad.html`: statyczny HTML z tytułem i sekcją na każdy motyw (nazwa + wszystkie jego SVG przez `<img src="../../frontend/public/decor/<klucz>/<plik>.svg">` w rozmiarach 48 i 96 px). Ma działać po otwarciu z dysku. Właściciel ocenia na niej całość grafik.

- [ ] **Step 4: Pełna weryfikacja**

Run: `docker compose run --rm php vendor/bin/phpunit`, `cd frontend && npx ng test --watch=false && npx ng build`
Expected: wszystko zielone.

- [ ] **Step 5:** `git status`, bez commitu. W podsumowaniu dla właściciela: ścieżka do `docs/superpowers/decor-podglad.html` i prośba o ocenę grafik.
