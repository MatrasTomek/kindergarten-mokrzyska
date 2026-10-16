# Strona Przedszkola Parafialnego w Mokrzyskach — projekt (etap 1: szkielet)

Data: 2026-10-15
Status: do akceptacji

## 1. Cel i zakres

Nowa strona przedszkola zastępująca https://przedszkolemokrzyska.pl/. Odbiorcy: rodzice (w tym osoby z niepełnosprawnościami), kadra przedszkola edytująca treści bez wiedzy technicznej.

**Etap 1 obejmuje:**
- publiczny frontend: layout, strona główna z 10 kafelkami, routing do podstron, pasek dostępności, deklaracja dostępności,
- motywy kolorystyczne sterowane z backendu (4 sezonowe automatyczne + okolicznościowe wybierane ręcznie),
- panel administracyjny z dwiema rolami,
- wpisy (posts) ze zdjęciami publikowane w „Z życia Przedszkola” / Aktualnościach / Grupach,
- generyczne elementy treści (content_items) dla pozostałych podstron,
- zarządzanie grupami, motywami, użytkownikami,
- paczka wdrożeniowa do ręcznego wgrania przez FTP (FileZilla).

**Poza zakresem etapu 1:** reset hasła e-mailem, automatyczne włączanie motywów okolicznościowych wg dat (model danych to przewiduje), dedykowane modele per podstrona, formularz kontaktowy, migracja danych ze starej strony, CI/CD.

## 2. Ograniczenia środowiska

- Hosting współdzielony OVH: Apache + PHP 8.4 (ustawiane `.ovhconfig` w folderze nowej strony), brak Node na serwerze, wdrożenie ręczne przez FTP.
- Baza: MongoDB Atlas, połączenie z PHP przez `ext-mongodb` 1.15.3 (sprawdzone na OVH dla PHP 8.4.22, 2026-10-16) i bibliotekę `mongodb/mongodb` 1.15.x. IP hostingu na whiteliście Atlasa.
- Pliki (zdjęcia, PDF) w katalogach na hostingu OVH.

## 3. Architektura

Monorepo:

```
frontend/   Angular (najnowszy stabilny), PrimeNG, standalone components, signals
backend/    Slim 4 + mongodb/mongodb + firebase/php-jwt + ezyang/htmlpurifier
docs/       spec, plan, kontrakt API (docs/api.md)
```

Front i backend rozwijane niezależnie; kontraktem jest `docs/api.md`.

Układ na serwerze OVH:

```
/www/               zbudowany Angular (+ .htaccess: fallback SPA na index.html, z wyjątkiem /api i /uploads)
/www/api/           backend; publicznie dostępny tylko index.php (front controller), reszta zablokowana .htaccess
/www/uploads/       pliki; .htaccess blokuje wykonywanie PHP i listowanie katalogów
.env                poza /www (lub w /www/api z blokadą w .htaccess)
```

## 4. Model danych (MongoDB)

| Kolekcja | Pola |
|---|---|
| `users` | `email` (unikalny), `passwordHash`, `name`, `role`: `admin` \| `user`, `active`, `createdAt` |
| `groups` | `name`, `slug` (unikalny), `order`, `description?`, `image?` |
| `posts` | `title`, `slug` (unikalny), `excerpt`, `body` (HTML oczyszczony), `images`: `[{file, thumb, w, h, alt}]` (max 30), `targets`: `{news: bool, groupIds: ObjectId[]}`, `status`: `draft` \| `published`, `publishedAt`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt` |
| `content_items` | `page` (slug podstrony), `title`, `body`, `attachments`: `[{file, name, size}]`, `images`, `order`, `status`, `createdAt`, `updatedAt` |
| `themes` | `key` (unikalny), `name`, `type`: `season` \| `special`, `palette`: `{primary: {50..900}, accent, text}`, `seasonStart?` (`MM-DD`, tylko season), `dateFrom?`, `dateTo?` (special — na przyszłość, w etapie 1 nieużywane) |
| `settings` | jeden dokument: `themeMode`: `auto` \| `manual`, `manualThemeId?` |
| `login_attempts` | `key` (IP lub e-mail), `createdAt` (indeks TTL 15 min) |

**Reguły wpisów:**
- Każdy opublikowany wpis pojawia się w „Z życia Przedszkola”.
- `targets.news = true` → dodatkowo w Aktualnościach.
- `targets.groupIds` → dodatkowo na stronie każdej wskazanej grupy.
- Jeden dokument, brak kopii — edycja zmienia wpis wszędzie.

**Mapowanie podstron:**

| Podstrona | Źródło |
|---|---|
| Z życia Przedszkola | `posts` (published) |
| Aktualności | `posts` z `targets.news = true` |
| Grupy | lista `groups`; strona grupy = `posts` z `groupIds` zawierającym grupę |
| Dla Rodziców, Specjaliści, Dokumenty, Rekrutacja, RODO, Kontakt, O nas | `content_items` z odpowiednim `page` |
| Deklaracja dostępności | `content_items` z `page = deklaracja-dostepnosci` (link w pasku a11y i stopce, nie kafelek) |

**Pliki:**
- Zdjęcia: `uploads/posts/YYYY/MM/<uuid>.webp` + `<uuid>_thumb.webp`.
- Zdjęcia content_items: `uploads/content/YYYY/MM/<uuid>.webp` (+ thumb).
- PDF: `uploads/docs/<uuid>.pdf`; oryginalna nazwa w bazie.

**Seed (`backend/bin/seed.php`):** pierwszy admin (e-mail i hasło z argumentów CLI), grupy: Ananaski, Pingwinki, Tygryski, Kangurki; 4 motywy sezonowe; dokument `settings` (`themeMode: auto`). Seed jest idempotentny. Na hostingu bez SSH uruchamiany lokalnie wobec produkcyjnej bazy Atlas.

## 5. Role i uprawnienia

| Akcja | admin | user |
|---|---|---|
| Wpisy: lista, tworzenie, edycja (wszystkich, także cudzych) | ✓ | ✓ |
| Wpisy: usuwanie | ✓ | ✗ |
| Upload zdjęć | ✓ | ✓ |
| Upload PDF | ✓ | ✗ |
| Grupy, content_items, motywy, ustawienia, użytkownicy | ✓ | ✗ |

Wpisy publikowane od razu lub zapisywane jako szkic (`draft`). Każda zmiana zapisuje `updatedBy`. Uprawnienia są wymuszane w backendzie; frontend tylko ukrywa niedostępne akcje.

## 6. API

Format błędów: `{ "error": { "code": "STRING", "message": "tekst po polsku" } }`. Kody HTTP: 400 walidacja, 401 brak/nieważny token, 403 brak uprawnień, 404, 413 za duży plik, 429 limit logowań, 500 (bez stack trace przy `APP_ENV=prod`).

### Uwierzytelnianie
- `POST /api/auth/login` `{email, password}` → `{accessToken, user: {id, name, role}}` + cookie `refresh_token` (httpOnly, Secure, SameSite=Strict, Path=/api/auth, 14 dni).
- `POST /api/auth/refresh` → nowy `accessToken` (JWT HS256, 60 min, claims: `sub`, `role`).
- `POST /api/auth/logout` → czyści cookie.
- Limit: 5 nieudanych prób / 15 min na IP oraz na e-mail → 429.
- Hasła: `password_hash` (PASSWORD_DEFAULT), min. 10 znaków.

### Publiczne (tylko `status = published`)
- `GET /api/theme` → `{key, name, type, palette}`
- `GET /api/posts?news=1&group=<slug>&page=<n>` → `{items, page, pages, total}`, 12 na stronę, sortowanie `publishedAt` malejąco
- `GET /api/posts/{slug}`
- `GET /api/groups`, `GET /api/groups/{slug}`
- `GET /api/content/{page}` → lista elementów podstrony wg `order`

### Panel (wymaga JWT)
- `GET|POST /api/admin/posts`, `GET|PUT /api/admin/posts/{id}` — admin, user
- `DELETE /api/admin/posts/{id}` — admin (usuwa też pliki zdjęć)
- `POST /api/admin/uploads/image` — admin, user; multipart: `image` (≤ 2 MB), `thumb` (≤ 300 KB), `context` (`posts` \| `content`) → `{file, thumb, w, h}`
- `POST /api/admin/uploads/pdf` — admin; multipart `file` (≤ 10 MB) → `{file, name, size}`
- CRUD `/api/admin/groups`, `/api/admin/content`, `/api/admin/themes`, `/api/admin/users` — admin
- `GET|PUT /api/admin/settings` — admin

Walidacja uploadu: MIME przez `finfo` (image/webp, image/jpeg — JPEG jako fallback dla Safari, application/pdf), limit rozmiaru, nazwa generowana (UUID).

### Middleware (kolejność)
body parsing JSON (bez CORS — w dev front łączy się przez proxy `ng serve`, na produkcji ta sama domena) → `AuthMiddleware` (grupy `/api/admin/*`) → `RoleMiddleware` (trasy admin-only) → centralny error handler (JSON).

### Bezpieczeństwo treści
`body` wpisów i content_items oczyszczane przez HTMLPurifier (biała lista: p, br, strong, em, u, s, h2–h4, ul, ol, li, a[href], blockquote). Front dodatkowo używa sanitizera Angulara.

### Sprzątanie plików
`backend/bin/cleanup-uploads.php` (cron OVH, raz na dobę): usuwa pliki w `uploads/` starsze niż 24 h, do których nie odwołuje się żaden dokument.

## 7. Motywy

**Pora roku (strefa Europe/Warsaw), progi z `themes.seasonStart`:**
- wiosna od 21.03 — odcienie zielonego,
- lato od 23.06 — odcienie żółtego,
- jesień od 23.09 — odcienie czerwonego,
- zima od 21.12 — odcienie niebieskiego (trwa do 20.03 następnego roku).

Dzień progowy należy już do nowej pory roku.

**Wybór aktywnego motywu (`GET /api/theme`):**
- `settings.themeMode = auto` → motyw sezonowy dla bieżącej daty,
- `settings.themeMode = manual` → motyw `manualThemeId` (dowolny: sezonowy lub okolicznościowy, np. Mikołajki); jeśli nie istnieje → fallback do auto.

**Panel:** admin edytuje palety, zmienia daty progów sezonów, dodaje motywy okolicznościowe, przełącza tryb auto/ręczny z podglądem.

**Frontend:** `ThemeService` ładuje motyw w `provideAppInitializer` (brak migania kolorów); paleta mapowana na preset PrimeNG (`definePreset`, primary 50–900) oraz zmienne `--app-accent`, `--app-text`. Przy błędzie API — wbudowany motyw domyślny (sezonowy liczony po stronie klienta jako fallback).

Wymóg: palety muszą zapewniać kontrast tekstu ≥ 4.5:1 (WCAG AA); w panelu edycji palety wyświetlane jest ostrzeżenie przy zbyt niskim kontraście.

## 8. Frontend

```
frontend/src/app/
  core/     ApiService, AuthService (signals), authInterceptor (JWT + refresh przy 401), authGuard, roleGuard
  theme/    ThemeService
  a11y/     A11yService (stan w localStorage), A11yToolbarComponent
  layout/   PublicLayout, AdminLayout
  public/   home, posts-list (z życia / aktualności), post-detail, groups, group-detail, content-page (:page)
  admin/    (lazy) login, posts-list, post-editor, groups, content, themes, users, settings
  shared/   PostCard, Gallery (p-galleria + lightbox), ImageUploader, image-resize.worker
```

**Strona główna:** sticky pasek dostępności na górze; header: logo po lewej + pełna nazwa przedszkola; siatka 10 kafelków (CSS grid: 1 kolumna mobile / 2 tablet / 5 desktop). Kafelek = `<a routerLink>` z ikoną i podpisem. Kolejność: Aktualności, Grupy, Dla Rodziców, Specjaliści, Dokumenty, Rekrutacja, RODO, Kontakt, O nas, Z życia Przedszkola. Stopka z linkiem do Deklaracji dostępności.

**Pasek dostępności (stan w localStorage, klasy na `<html>`):**
1. Rozmiar tekstu: 3 poziomy (100% / 125% / 150%), cały layout w `rem`.
2. Wysoki kontrast (nadpisuje motyw).
3. Czytelna czcionka (Atkinson Hyperlegible, większe odstępy).
4. Skala szarości.
5. Odczyt na głos (`speechSynthesis`, `pl-PL`): zaznaczony tekst lub zawartość `<main>`; przycisk stop. Ukryty, gdy przeglądarka nie wspiera API.
6. Link do Deklaracji dostępności.
Zawsze: skip link „Przejdź do treści”, widoczny `:focus-visible`, podkreślone linki w treści, respektowanie `prefers-reduced-motion`.

**Edytor wpisu:** tytuł, zajawka, treść (`p-editor`), checkbox „Pokaż w Aktualnościach”, multiselect grup, status (szkic/opublikowany), ImageUploader. Przycisk „Usuń” widoczny tylko dla admina.

**ImageUploader:**
- wybór lub drag & drop, maks. 30 zdjęć na wpis,
- zmniejszanie w Web Workerze (`createImageBitmap` + `OffscreenCanvas`): WebP (JPEG, gdy przeglądarka nie koduje WebP — Safari), dłuższy bok 1920 px, jakość 0.8; miniatura 400 px; fallback do `<canvas>` w wątku głównym, gdy brak OffscreenCanvas; EXIF (w tym GPS) usuwany przez rerender,
- kolejka: 3 równoległe uploady, postęp per plik, ponawianie nieudanych,
- zmiana kolejności drag & drop, pole `alt` per zdjęcie (domyślnie tytuł wpisu).

**Prerender:** `@angular/ssr` w trybie prerender dla tras statycznych (strona główna, listy podstron). Wpisy renderowane po stronie klienta; `Title`/`Meta` ustawiane dynamicznie.

## 9. Środowiska i wdrożenie

**Lokalnie:** backend w Dockerze (PHP 8.4 + ext-mongodb) lub `php -S`; baza: osobna baza dev w Atlasie lub Mongo w Dockerze. Front: `ng serve` z `proxy.conf.json` (`/api`, `/uploads` → backend).

**Konfiguracja backendu (`.env`, w repo tylko `.env.example`):** `APP_ENV`, `MONGO_URI`, `MONGO_DB`, `JWT_SECRET`, `UPLOAD_DIR`.

**Paczka wdrożeniowa:** skrypt `scripts/package` (npm script w root lub bash) tworzy katalog `deploy/` o strukturze 1:1 z `/www` na OVH:
- build Angulara (z prerenderem) + `.htaccess` SPA,
- `api/` z kodem backendu i `vendor/` z `composer install --no-dev --optimize-autoloader`, `.htaccess` blokującym wszystko poza `index.php`,
- `uploads/.htaccess`,
- bez `.env` (wgrywany ręcznie raz).

Wdrożenie: ręczne przeciągnięcie `deploy/` przez FileZillę. `docs/deploy.md` opisuje: pierwszą instalację (wersja PHP w panelu OVH, `.env`, uprawnienia `uploads/`, whitelist IP w Atlasie, uruchomienie seeda lokalnie, cron cleanup), aktualizację (które katalogi nadpisywać; nigdy `uploads/` ani `.env`).

## 10. Testy

**Backend (PHPUnit):**
- unit: kalkulator pory roku (20.03 → zima, 21.03 → wiosna, 22.06/23.06, 22.09/23.09, 20.12/21.12, 31.12 i 1.01 → zima),
- unit: wybór motywu (auto, manual, manual z nieistniejącym ID → fallback),
- integracyjne (testowa baza): logowanie, limit prób (429), user `DELETE /posts` → 403, user `/admin/groups` → 403, upload z niedozwolonym MIME → 400, za duży plik → 413, filtrowanie wpisów po news/group, ukrywanie szkiców w API publicznym, oczyszczanie HTML.

**Frontend (unit, Angular test runner):** ThemeService (mapowanie palety, fallback), A11yService (persistencja, klasy na `<html>`), authInterceptor (refresh przy 401, jedna próba), kolejka uploadu (równoległość 3, ponawianie), widoczność „Usuń” wg roli.

**E2E (Playwright):** logowanie admin/user; dodanie wpisu z 3 zdjęciami do Aktualności i grupy → widoczny w Z życia, Aktualnościach i na stronie grupy; user nie widzi „Usuń”; przełączniki paska dostępności; audyt `@axe-core/playwright` bez naruszeń poziomu A/AA na stronie głównej, liście wpisów, wpisie i podstronie treści.
