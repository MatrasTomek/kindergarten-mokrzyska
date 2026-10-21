# kindergarten-mokrzyska

Strona przedszkola: frontend **Angular 21** (`frontend/`), backend **PHP 8.4 + Slim** (`backend/`), baza **MongoDB**.

> **Windows:** polecenia uruchamiaj w **Git Bash**.

## Uruchomienie na localhost

Wymagania: **Docker** (z `docker compose`) i **Node** `^20.19 || ^22.12 || >=24` z npm. PHP i MongoDB lokalnie nie są potrzebne — działają w kontenerach.

1. **Konfiguracja backendu** (jednorazowo) — skopiuj plik env i wpisz sekret JWT:
   ```bash
   cp backend/.env.example backend/.env
   openssl rand -hex 32   # wynik wklej do JWT_SECRET= w backend/.env
   ```
   Pozostałe wartości z `.env.example` (`MONGO_URI=mongodb://mongo:27017`, `UPLOAD_DIR=/app/backend/public/uploads`) są gotowe dla Dockera.

2. **Zależności** (jednorazowo, i po każdej zmianie `composer.lock` / `package-lock.json`):
   ```bash
   docker compose run --rm php composer install
   cd frontend && npm ci && cd ..
   ```

3. **Start backendu** (MongoDB + PHP na porcie 8080):
   ```bash
   docker compose up -d
   ```
   Sprawdzenie: <http://localhost:8080/api/health> → `{"status":"ok"}`.

4. **Seed bazy** (jednorazowo) — indeksy, grupy, motywy, ustawienia i konto administratora:
   ```bash
   docker compose run --rm php php bin/seed.php \
     --admin-email=admin@example.pl --admin-password='min. 10 znaków' --admin-name="Admin"
   ```
   Seed jest idempotentny (można uruchamiać ponownie). Flaga `--fresh` kasuje całą lokalną bazę.

5. **Start frontendu**:
   ```bash
   cd frontend && npm start
   ```
   Strona: <http://localhost:4200>, panel: <http://localhost:4200/admin>.
   Serwer deweloperski przekierowuje `/api` i `/uploads` na `localhost:8080` (`frontend/proxy.conf.json`).

6. **Zatrzymanie**: `Ctrl+C` w terminalu frontendu, potem `docker compose down` (dane bazy zostają w wolumenie `mongo-data`).

### Testy

```bash
cd frontend && npm test                                  # testy jednostkowe frontendu
docker compose run --rm php vendor/bin/phpunit           # testy backendu
cd frontend && npm run e2e                               # testy e2e (Playwright; sam startuje backend na :8081 z osobną bazą przedszkole_e2e)
```

## Produkcja (OVH + MongoDB Atlas)

Hosting współdzielony OVH (bez SSH i Node) — paczkę buduje się lokalnie i wgrywa FileZillą.
**Pełna instrukcja, wymagania i lista kontrolna: [docs/deploy.md](docs/deploy.md)** — przy pierwszej instalacji przeczytaj ją w całości.

### Pierwsza instalacja (skrót)

1. **Panel OVH**: dodaj wpis *Multisite* z **osobnym folderem** (`<folder>`, nie folder starej strony) i włącz certyfikat SSL dla domeny. Nie zmieniaj wersji PHP globalnie.
2. **MongoDB Atlas**: utwórz bazę `przedszkole`, użytkownika z `readWrite` do niej i dodaj IP hostingu OVH w *Network Access*.
3. **Budowa paczki** (lokalnie, wymaga Dockera i `npm ci` we `frontend/`):
   ```bash
   node scripts/package.mjs
   ```
   Musi zakończyć się komunikatem „Smoke check: wszystkie … sprawdzeń OK”. Wynik trafia do `deploy/`.
4. **Wgranie**: w FileZilli (z pokazywaniem plików ukrytych) przeciągnij **zawartość** `deploy/` do `/<folder>`.
5. **Konfiguracja na serwerze**: utwórz `api/.env` na podstawie `api/.env.example`:
   ```dotenv
   APP_ENV=prod
   MONGO_URI=mongodb+srv://<user>:<hasło>@<cluster>/?retryWrites=true&w=majority
   MONGO_DB=przedszkole
   JWT_SECRET=<wynik openssl rand -hex 32>
   UPLOAD_DIR=/home/<login-ovh>/<folder>/uploads
   ```
   Ustaw prawa **755** na `/<folder>/uploads`.
6. **Seed produkcyjny** (lokalnie, z tymczasowo dodanym swoim IP w Atlasie) — utwórz `backend/.env.prod` z produkcyjnym `MONGO_URI`/`MONGO_DB`, `APP_ENV=prod`, `UPLOAD_DIR=/tmp` i dowolnym `JWT_SECRET` (≥ 32 znaki), potem:
   ```bash
   docker compose run --rm --no-deps php php bin/seed.php --env-file=.env.prod \
     --admin-email=dyrektor@... --admin-password='min. 10 znaków' --admin-name="Imię Nazwisko"
   ```
   **Nigdy nie używaj `--fresh` z produkcyjną bazą.** Po seedzie usuń swoje IP z Atlasa i plik `.env.prod`.
7. **Cron** w panelu OVH: skrypt `<folder>/api/bin/cleanup-uploads.php`, PHP 8.4, codziennie w nocy.
8. **Kontrola**: `https://<domena>/api/health` → `{"status":"ok"}`, logowanie w `/admin`, dalej [lista kontrolna](docs/deploy.md#lista-kontrolna-po-wdrożeniu).

### Aktualizacja

1. `node scripts/package.mjs` (musi przejść smoke check).
2. Wgraj zawartość `deploy/` do `/<folder>` z nadpisaniem — **nie ruszaj** `api/.env` ani zawartości `uploads/`. Starych plików `.js`/`.css` nie usuwaj od razu (dopiero po ok. tygodniu).
3. Jeśli wydanie dodaje indeksy lub dane startowe, uruchom ponownie seed z kroku 6 (bez `--fresh`, bez parametrów admina).
4. Sprawdź `https://<domena>/api/health` i logowanie w `/admin`.
