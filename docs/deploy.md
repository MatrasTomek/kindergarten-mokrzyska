# Wdrożenie na OVH (FileZilla)

Hosting współdzielony OVH (Apache, bez SSH, bez Node), baza MongoDB Atlas, pliki wgrywane ręcznie przez FileZillę.
Paczkę `deploy/` buduje się lokalnie; jej zawartość odpowiada 1:1 katalogowi nowej strony na serwerze.

## Założenia (przeczytaj przed pierwszym wgraniem)

- **Nowa strona to osobny wpis multisite** w panelu OVH (*Hosting → Multisite*) z **własnym folderem głównym**
  (w tej instrukcji: `<folder>`, np. `www` albo `przedszkole`). Domena nowej strony wskazuje na ten folder.
- **Stara strona (PHP 7.4) jest w innym folderze, który nie jest ani rodzicem, ani dzieckiem `<folder>`**
  (foldery „obok siebie”, np. `www-stara/` i `przedszkole/`). Wtedy:
  - `.htaccess` i `.ovhconfig` z paczki działają tylko w `<folder>` i jego podkatalogach — stara strona ich nie widzi;
  - `.ovhconfig` (PHP 8.4) działa tylko dlatego, że `<folder>` jest folderem głównym wpisu multisite.
- Jeśli stara strona leży w `www/`, **nie wgrywaj paczki do `www/`** — utwórz nowy folder i nowy wpis multisite.
  Nie zagnieżdżaj też nowej strony w folderze starej (reguły i nagłówki z `.htaccess` rodzica dziedziczyłyby się).
- Strona działa w katalogu głównym domeny (`https://domena/`, nie `https://domena/podkatalog/`) — tego wymagają
  ścieżki absolutne w `.htaccess` (`/index.csr.html`) i `<base href="/">` w Angularze.
- Dalej w tekście ścieżka na serwerze to `/home/<login-ovh>/<folder>/…` (w FileZilli: `/<folder>/…`).

## Maszyna, na której budujesz paczkę

- **Node** `^20.19 || ^22.12 || >=24` (wymaganie Angulara 21) i **npm**; jednorazowo `cd frontend && npm ci`.
- **Docker** (z `docker compose`) — composer działa w kontenerze `php` z `docker-compose.yml`, PHP lokalnie nie jest potrzebne.
  `composer install --no-dev --optimize-autoloader` używa `composer.lock`, a `config.platform` w `backend/composer.json`
  przypina PHP 8.4.22 i ext-mongodb 1.15.3 (wersje z OVH), więc zależności pasują do serwera niezależnie od lokalnego obrazu.
- **openssl** (do wygenerowania `JWT_SECRET`; jest w Git Bash na Windows).
- **Windows**: polecenia z tej instrukcji uruchamiaj w **Git Bash** (składnia `\` na końcu linii, `openssl`, pojedyncze
  cudzysłowy). W PowerShellu używaj `curl.exe` zamiast `curl` (samo `curl` to tam alias `Invoke-WebRequest`
  z inną składnią), np. `curl.exe -I https://<domena>/aktualnosci`.
- Wersje są celowo przypięte: **Angular 21 + PrimeNG 21.1.10**. PrimeNG 22+ wymaga klucza licencyjnego PrimeUI,
  a podniesienie Angulara do 22 pociąga za sobą PrimeNG 22 — nie aktualizuj „przy okazji” (patrz *Wersje i wsparcie*).

## Budowa paczki

```bash
node scripts/package.mjs
```

Skrypt: buduje front (prerender), kopiuje backend (`src/`, `bin/`, `index.php`, `composer.*`, `.env.example`), instaluje
`vendor/` bez paczek deweloperskich, dodaje `.htaccess`, `api/.user.ini`, `uploads/.htaccess`, `.ovhconfig`, ustawia prawa
plików (644/755), usuwa z `vendor/` testy i dokumentację paczek (~6 MB mniej do wgrania) i na końcu uruchamia
**smoke check** (`scripts/verify-package.mjs`). Jeśli którekolwiek sprawdzenie nie przejdzie (brak `index.csr.html`,
prerenderu tras, `vendor/`, kluczowych reguł w `/.htaccess` (fallback SPA, 404 dla brakujących plików statycznych),
`api/.htaccess` i `uploads/.htaccess`, obecność `admin/`, **dowolnego
pliku `.env`**, `.git`, `node_modules`, plików Dockera lub katalogów `tests`), skrypt kończy się błędem — takiej paczki nie wgrywaj. Sprawdzenie można powtórzyć ręcznie:
`node scripts/verify-package.mjs`. Testy skryptu: `node --test scripts/verify-package.test.mjs`.

Zawartość paczki:

```
deploy/
  .htaccess          HTTPS, www → bez www, /wpis/* /grupy/* /sitemap.xml → PHP, fallback SPA na index.csr.html, cache
  .ovhconfig         PHP 8.4 dla tego folderu
  index.html         prerenderowana strona główna
  index.csr.html     pusta powłoka SPA (fallback dla /admin/*; dla /wpis/* i /grupy/* PHP wstawia do niej meta tagi)
  robots.txt         blokada /admin, wskazanie sitemap.xml
  aktualnosci/index.html, grupy/index.html, …   prerenderowane podstrony
  *.js, *.css, media/
  api/               backend: index.php, src/, bin/, vendor/, .htaccess, .user.ini, .env.example
  uploads/.htaccess  serwuje tylko .jpg/.webp/.pdf (jawne typy MIME), bez skryptów i listowania
```

`deploy/` jest w `.gitignore`. Paczka nigdy nie zawiera `api/.env` — ten plik tworzysz raz na serwerze.

## Pierwsza instalacja

1. **Multisite + PHP**: dodaj wpis multisite dla domeny z folderem `<folder>` (patrz *Założenia*). Plik `.ovhconfig` z paczki
   ustawia PHP 8.4 (`app.engine.version=8.4`, `container.image=stable64`) tylko dla tego folderu; OVH ma tam
   `ext-mongodb` 1.15.3. **Nie zmieniaj wersji PHP globalnie w panelu** — przełączyłoby to stary projekt (PHP 7.4).
   Po wgraniu `.ovhconfig` odczekaj kilka minut.
2. **HTTPS**: włącz certyfikat SSL (Let's Encrypt) dla domeny w panelu OVH — **przed** pierwszym logowaniem
   (`.htaccess` przekierowuje http → https, a ciasteczko sesji ma flagę `Secure`).
3. **MongoDB Atlas**:
   - utwórz bazę `przedszkole` i użytkownika z uprawnieniem `readWrite` tylko do tej bazy,
   - w *Network Access* dodaj IP wyjściowe hostingu OVH (to samo co w projekcie, który już działa).
4. **JWT_SECRET**: wygeneruj lokalnie (64 znaki hex):
   ```bash
   openssl rand -hex 32
   ```
5. **Paczka**: `node scripts/package.mjs` → w FileZilli przeciągnij **zawartość** `deploy/` do `/<folder>`.
   Włącz pokazywanie plików ukrytych (*Serwer → Wymuś pokazywanie ukrytych plików*) — `.htaccess`, `.ovhconfig`,
   `api/.htaccess`, `api/.user.ini`, `uploads/.htaccess` muszą trafić na serwer.
6. **Konfiguracja**: na serwerze skopiuj `api/.env.example` → `api/.env` (w FileZilli: pobierz, zmień, wgraj jako `.env`)
   i uzupełnij (plik edytuj w Notatniku/VS Code jako UTF-8, bez BOM):
   ```dotenv
   APP_ENV=prod
   MONGO_URI=mongodb+srv://<user>:<hasło>@<cluster>/?retryWrites=true&w=majority
   MONGO_DB=przedszkole
   JWT_SECRET=<wynik openssl rand -hex 32>
   UPLOAD_DIR=/home/<login-ovh>/<folder>/uploads
   ```
   Ścieżkę `/home/<login-ovh>` znajdziesz w panelu OVH (Hosting → FTP-SSH → katalog główny).
   `APP_ENV=prod` jest obowiązkowe (m.in. blokuje `seed.php --fresh` na tej bazie).
   **Gdzie położyć plik (zalecane: poza katalogiem WWW).** Backend najpierw szuka `/home/<login-ovh>/<folder>.env`
   (obok folderu strony, np. `/home/<login-ovh>/przedszkole.env` dla `<folder>` = `przedszkole`) — serwer WWW tego
   pliku w ogóle nie serwuje, więc sekrety nie zależą od reguł `.htaccess`. W FileZilli wgraj go do katalogu
   nadrzędnego `/` (obok `/<folder>`) pod nazwą `<folder>.env`. Dopiero gdy go nie ma, czytany jest `api/.env`
   (chroniony przez `api/.htaccess`: `/api/.env` → 403). Jeśli po wgraniu pliku poza WWW API zwraca 500 z błędem
   konfiguracji, hosting nie pozwala PHP czytać poza folderem strony (`open_basedir`) — wtedy użyj `api/.env`.
   Nie trzymaj obu naraz (łatwo zmienić nie ten plik). Ten sam plik czyta cron (`bin/cleanup-uploads.php`).
   **Po wgraniu usuń lokalną kopię** pobranego/edytowanego `.env` (np. z katalogu Pobrane i z lokalnego panelu FileZilli) —
   to plik z hasłem do bazy i sekretem JWT.
7. **Uprawnienia zapisu `uploads/`**: w FileZilli kliknij prawym na `/<folder>/uploads` → *Atrybuty pliku…* → ustaw
   **755** (właściciel: odczyt, zapis, wykonanie). PHP na OVH działa jako ten sam użytkownik co konto FTP, więc 755
   wystarcza do tworzenia podkatalogów `posts/`, `content/`, `docs/`; **nie ustawiaj 777**. Pliki w `uploads/` mają mieć 644.
   Faktyczny zapis sprawdzasz w punktach 6–7 listy kontrolnej.
8. **Seed — OBOWIĄZKOWY** (lokalnie, bo bez SSH). Tworzy **unikalne indeksy** (bez nich możliwe są np. zdublowane e-maile
   i slugi), grupy, motywy, ustawienia i konto administratora.
   - utwórz `backend/.env.prod` (jest w `.gitignore`) z **tymi samymi** `MONGO_URI` i `MONGO_DB` co na serwerze oraz
     `APP_ENV=prod`, `UPLOAD_DIR=/tmp`, dowolnym `JWT_SECRET` ≥ 32 znaki,
   - dodaj tymczasowo swoje IP w Atlasie (*Network Access*),
   - uruchom (zawsze z jawnym `--env-file`, **nigdy z `--fresh`**):
     ```bash
     docker compose run --rm --no-deps php php bin/seed.php --env-file=.env.prod \
       --admin-email=dyrektor@... --admin-password='min. 10 znaków' --admin-name="Imię Nazwisko"
     ```
     Wynik to JSON, np. `{"groups": 4, "themes": 4, "settings": true, "admin": true}`.
   - usuń swoje IP z Atlasa (i najlepiej `backend/.env.prod` z dysku).

   Seed jest **idempotentny**: dodaje tylko brakujące rzeczy, nie nadpisuje istniejących grup, motywów, ustawień ani
   użytkowników. W szczególności **nie zresetuje hasła istniejącego admina** — ponowne uruchomienie z tym samym e-mailem
   zwróci `"admin": false` i hasło się nie zmieni (hasło zmienia się w panelu: *Użytkownicy*, przez innego admina).
   `--fresh` kasuje całą bazę; skrypt odmawia go **tylko** przy `APP_ENV=prod` — dlatego plik env dla produkcji
   musi mieć `APP_ENV=prod`, a z produkcyjnym `MONGO_URI` nigdy nie używaj `--fresh`.
9. **Cron**: panel OVH → Hosting → *Zadania Cron* → dodaj: skrypt `<folder>/api/bin/cleanup-uploads.php`,
   język **PHP 8.4**, codziennie w nocy. Skrypt usuwa z `uploads/` pliki starsze niż 24 h, do których nie odwołuje się
   żaden wpis ani treść. **Odmawia działania**, jeśli w bazie nie ma żadnego wpisu ani treści, a są pliki do usunięcia
   (to wygląda na podłączenie złej/pustej bazy — usunąłby wszystko); kończy się wtedy błędem i nic nie usuwa.
   Na świeżej instalacji to normalne do czasu dodania pierwszego wpisu. Flagę `--force` stosuj tylko świadomie,
   po sprawdzeniu `--dry-run`, że lista do usunięcia jest właściwa — nigdy w cronie.

   **Jak uruchomić `--dry-run` bez SSH**: dodaj w panelu drugie, **jednorazowe** zadanie Cron z tym samym skryptem,
   w polu parametrów/argumentów wpisz `--dry-run`, ustaw najbliższą godzinę, włącz wysyłanie raportu e-mailem (albo
   sprawdź log zadania w panelu). Wynik to lista plików „do usunięcia (dry-run)” — nic nie jest usuwane. Po odczytaniu
   wyniku **usuń to zadanie**. Lokalnie tego nie sprawdzisz — skrypt przegląda katalog `UPLOAD_DIR` na serwerze.
   Jeśli formularz cron OVH nie przyjmuje argumentów, pomiń `--dry-run` i uruchom zwykły cron — skrypt sam odmówi
   pracy na pustej bazie (patrz wyżej).
10. **Kontrola po wdrożeniu** — patrz [lista kontrolna](#lista-kontrolna-po-wdrożeniu). Przejdź ją w całości.

## Aktualizacja

1. `node scripts/package.mjs` (musi zakończyć się „Smoke check: wszystkie … sprawdzeń OK”).
2. W FileZilli wgraj zawartość `deploy/` do `/<folder>` z nadpisaniem.
   - **Nie nadpisuj/nie usuwaj**: `api/.env` (albo `<folder>.env` poza WWW), zawartości `uploads/` (paczka zawiera tylko `uploads/.htaccess`).
   - Po zmianie `composer.lock` wgraj `api/vendor/` w całości.
   - **Starych plików JS/CSS (z hashem w nazwie, np. `chunk-AB12CD34.js`) nie usuwaj od razu.** Karty przeglądarki
     otwarte przed aktualizacją (np. panel z rozpoczętym wpisem) dociągają je przy przejściu na kolejną podstronę.
     Po **kilku dniach (np. tydzień)** możesz usunąć z `/<folder>` pliki `.js`/`.css`, których nie ma w nowym `deploy/`
     (porównaj listy w FileZilli; nie ruszaj `api/`, `uploads/`, `media/`, plików `.htaccess`/`.ovhconfig`/`.html`).
     Brakujący plik zwraca 404 (nie stronę HTML) — taka stara karta zgłosi błąd ładowania; wystarczy ją odświeżyć (F5).
   - Po wdrożeniu wersji z sesjami logowania (kolekcja `sessions`) wszyscy zalogowani muszą **zalogować się ponownie** —
     stare tokeny odświeżania nie mają identyfikatora sesji. To jednorazowe.
3. **Seed ponownie**, jeśli wydanie dodaje indeksy lub nowe dane startowe (w razie wątpliwości uruchom — jest idempotentny),
   tak samo jak w kroku 8 (z `--env-file=.env.prod`, bez `--fresh`; parametry admina można pominąć).
4. Przejdź listę kontrolną (co najmniej punkty 1–7 i 9).

## Lista kontrolna po wdrożeniu

1. **API**: `https://<domena>/api/health` → `{"status":"ok"}`; `https://<domena>/api/theme` → JSON motywu bieżącej pory roku.
   Błąd 500 zaraz po pierwszym wgraniu: zwykle `.ovhconfig` jeszcze nie zadziałał (odczekaj) albo brak/zły `api/.env`.
2. **Blokady** (każde → 403): `/api/.env`, `/api/.user.ini`, `/api/composer.json`, `/api/vendor/autoload.php`,
   `/api/src/Config.php`, `/uploads/` (brak listowania), `/uploads/test.php`, `/uploads/.htaccess`;
   `http://<domena>/api/health` (bez HTTPS) → 403 — API odpowiada wyłącznie po HTTPS.
   Przy `.env` poza WWW sprawdź też, że `/api/.env` → 403/404 (nie ma tam pliku) i że API działa (punkt 1).
3. **HTTPS i trasy**:
   - `curl -I http://<domena>/aktualnosci` → `301` na `https://…/aktualnosci` (jedno przekierowanie, bez pętli),
   - `curl -I https://<domena>/aktualnosci` → `200` **bez** przekierowania na `/aktualnosci/` (prerenderowany
     `aktualnosci/index.html`); `/aktualnosci/` też `200`,
   - `https://<domena>/admin` → `200` z powłoką SPA (`index.csr.html`; w źródle strony brak `ngh=`),
   - `https://<domena>/wpis/<istniejący-slug>` → `200`, w źródle strony `<title>` wpisu, `og:title`, `og:image`, `canonical`;
     `/wpis/nie-ma-takiego` → `404` z `<meta name="robots" content="noindex">` (strona i tak się wyświetla),
   - `https://<domena>/sitemap.xml` → XML z podstronami, wpisami i grupami; `/robots.txt` → plik tekstowy,
   - `curl -I https://www.<domena>/kontakt` → `301` na `https://<domena>/kontakt` (wymaga certyfikatu SSL także dla www),
     `https://<domena>/` → prerenderowana strona główna,
   - `curl -I https://<domena>/nie-ma-takiego-pliku.js` → `404` (brakujące pliki statyczne nie dostają powłoki SPA).
   Jeśli `curl -I https://…` zwraca 301 na samego siebie (pętla), proxy OVH nie przekazuje do Apache informacji o HTTPS.
   Wtedy zakomentuj (`#` na początku linii) **w obu plikach** trzy linie reguły HTTPS (`RewriteCond %{HTTPS} …`,
   `RewriteCond %{HTTP:X-Forwarded-Proto} …` i następującą po nich `RewriteRule`):
   - w `/.htaccess` (przekierowanie na https),
   - w `/api/.htaccess` (blokada `[F]`) — **inaczej każde wywołanie API zwróci 403**, bo serwer „widzi” każde żądanie jako HTTP.
   Następnie włącz wymuszanie HTTPS po stronie OVH (*Multisite → edycja wpisu → „Wymuś HTTPS”* / „Forcer HTTPS”),
   żeby przekierowanie http → https robiło proxy OVH. Przy każdej aktualizacji paczka przywróci te linie — powtórz zmianę
   (albo nie nadpisuj obu plików `.htaccess`, jeśli się nie zmieniły).
4. **Nagłówki bezpieczeństwa**: `curl -I https://<domena>/` musi pokazać `Content-Security-Policy`,
   `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`. Brak wszystkich naraz =
   na serwerze nie działa `mod_headers` (reguły są w `<IfModule mod_headers.c>`). Następnie otwórz stronę główną,
   kilka podstron i panel (dodanie wpisu ze zdjęciem) z otwartą konsolą przeglądarki (F12): **nie może być** komunikatów
   „Refused to execute inline script… Content Security Policy”. Jeśli są — paczka powstała z innego buildu niż wgrane pliki
   HTML (hashe w `/.htaccess` nie pasują): wgraj razem `/.htaccess` i wszystkie pliki `.html` z tej samej paczki.
5. **Logowanie** w `/admin`, otwórz „Wpisy”, odśwież stronę (F5) — nadal zalogowany. To sprawdza naraz:
   wczytanie `api/.env` przez PHP-FPM na OVH, przekazanie nagłówka `Authorization` (reguła w `api/.htaccess` +
   fallback `REDIRECT_HTTP_AUTHORIZATION` w `App\Http\ServerParams`) i ciasteczko odświeżania przez HTTPS.
   Natychmiastowe wylogowanie/401 po zalogowaniu = serwer gubi `Authorization` (sprawdź, czy `api/.htaccess` jest na serwerze).
6. **Wpis z 2 zdjęciami**: dodaj testowy wpis z dwoma zdjęciami, otwórz go na stronie publicznej w oknie prywatnym —
   miniatury i pełne zdjęcia muszą się wyświetlić (to sprawdza `UPLOAD_DIR`, prawa plików i typ MIME: zdjęcia z panelu są
   zapisywane jako `.webp` — `curl.exe -I https://<domena>/uploads/posts/…webp` musi zwrócić `Content-Type: image/webp`). Zdjęcia nie wyświetlają się
   (403/404)? Sprawdź w FileZilli, czy pliki są w `/<folder>/uploads/posts/RRRR/MM/` i mają prawa odczytu (644, katalogi 755).
   Usuń wpis testowy.
7. **PDF i limity uploadu** (`api/.user.ini`: `upload_max_filesize=12M`, `post_max_size=13M`; aplikacja przyjmuje PDF do 10 MB):
   - w *Treści* dodaj załącznik PDF ok. **5 MB** — musi się wgrać i otwierać z linku na stronie (domyślny limit PHP to
     zwykle 2–8 MB, więc sukces potwierdza, że `.user.ini` zadziałał),
   - PDF ok. **11 MB** → komunikat „Plik jest za duży.” (413 z aplikacji); dowolny inny błąd albo zerwane połączenie
     oznacza, że limit PHP jest niższy niż w `.user.ini`.
   PHP-FPM czyta `.user.ini` z opóźnieniem (do 5 min). Jeśli po tym czasie 5 MB nadal nie przechodzi, OVH ignoruje
   `.user.ini` dla tego folderu — sprawdź limity w panelu (*Hosting → Konfiguracja → PHP*) lub zgłoś do OVH.
8. **Prawdziwe IP klienta** (`REMOTE_ADDR`). Limit logowań (5 nieudanych prób na 15 min) liczy się osobno dla IP i dla
   e-maila. Jeśli PHP widzi IP proxy OVH zamiast IP klienta, cały personel dzieli **jeden** licznik IP i kilka pomyłek
   jednej osoby zablokuje logowanie wszystkim. Sprawdź jednym ze sposobów:
   - **plik tymczasowy**: wgraj `/<folder>/ip-check.php` z treścią `<?php echo $_SERVER['REMOTE_ADDR'];`, otwórz
     `https://<domena>/ip-check.php` i porównaj z IP pokazywanym np. przez `https://ifconfig.me`. **Od razu usuń plik.**
   - **test z dwóch sieci**: z sieci A (np. telefon na LTE) wykonaj 5 nieudanych logowań na nieistniejący e-mail
     `test-a@example.com`; potem z sieci B (Wi-Fi) jedno nieudane logowanie na **inny** e-mail `test-b@example.com`.
     Poprawnie: w sieci B „Nieprawidłowy e-mail lub hasło”. Błędnie: „Zbyt wiele nieudanych prób” — obie sieci mają to samo IP.
   Jeśli `REMOTE_ADDR` to IP proxy: nie wdrażaj „na ślepo” odczytu `X-Forwarded-For` (klient może go podrobić) — trzeba
   zmienić backend tak, by ufał temu nagłówkowi tylko od znanych adresów proxy OVH. Do tego czasu blokada mija po 15 min.
9. **Cron**: w panelu OVH sprawdź log pierwszego uruchomienia `cleanup-uploads.php` (na pustej bazie z plikami spodziewany
   jest opisany wyżej komunikat odmowy — to nie awaria).

## Uwagi bezpieczeństwa

- **`.env`**: najlepiej poza katalogiem WWW (`/home/<login-ovh>/<folder>.env`, krok 6). `api/.env` to wariant zapasowy
  chroniony tylko przez `api/.htaccess` (punkt 2 listy kontrolnej). Nie przechowuj kopii `.env` ani `.env.prod` w `/<folder>`.
- **HTTPS jest wymagany**: ciasteczko odświeżania sesji ma flagę `Secure`, więc przeglądarka wysyła je tylko po HTTPS.
  Przy testach po zwykłym `http://` w sieci LAN logowanie działa, ale sesja kończy się po 60 minutach (wygasa token
  dostępu, a odświeżenie się nie uda). `localhost` przeglądarki traktują jak bezpieczny kontekst.
- **HSTS** (`max-age` = 1 rok, bez `includeSubDomains`/`preload` — inne subdomeny mogą nie mieć HTTPS): po pierwszej wizycie
  przeglądarka przez rok łączy się z domeną wyłącznie po HTTPS. Nie wyłączaj certyfikatu SSL w panelu OVH.
- **CSP** jest w `/.htaccess` i **generuje ją `scripts/package.mjs`** (`scripts/csp.mjs`): `script-src` dopuszcza tylko pliki
  z tej domeny i skrypty inline o hashach policzonych z HTML tego buildu (pre-paint, kontrakt zdarzeń Angulara, `onload`
  ładowania CSS — stąd `'unsafe-hashes'`). Smoke check odrzuca paczkę, gdy któregoś hasha brakuje. Angularowe
  `security.autoCsp` nie działa z prerenderem, dlatego hashe liczy skrypt. **Nie edytuj CSP ręcznie na serwerze** i zawsze
  wgrywaj `/.htaccess` razem z plikami `.html` z tej samej paczki. `style-src` ma `'unsafe-inline'` (style wstawiane w locie
  przez PrimeNG/Quill). Zewnętrzne zasoby (mapa Google w `<iframe>`, czcionki z CDN, obrazki z innych domen) wymagają
  dopisania domeny w `contentSecurityPolicy()` — inaczej przeglądarka je zablokuje. `frame-ancestors 'none'` +
  `X-Frame-Options: DENY`: strony nie da się osadzić w ramce (clickjacking).
- **Sesje logowania** są zapisywane w bazie (kolekcja `sessions`): wylogowanie, zmiana hasła, dezaktywacja i usunięcie konta
  od razu unieważniają token odświeżania; uprawnienia (rola, aktywność konta) są sprawdzane w bazie przy każdym żądaniu panelu.
- `uploads/.htaccess`: domyślnie odmowa; serwowane są tylko `.jpg`/`.jpeg`/`.webp`/`.pdf` (z jawnymi typami MIME —
  przy `nosniff` brak typu zepsułby wyświetlanie zdjęć), handlery PHP/CGI są zdjęte (`RemoveHandler`), brak listowania.
  Celowo nie ma tam `php_flag engine off` (na PHP-FPM/CGI w OVH powoduje błąd 500) ani `Options -ExecCGI`.
- `api/.htaccess`: odrzuca żądania po zwykłym HTTP (403), przepuszcza wszystko przez `index.php` i odmawia dostępu do
  pozostałych plików `.php` oraz `.env*`, `.user.ini`, `composer.*`.
- Nagłówki `X-Content-Type-Options: nosniff` i `Referrer-Policy` ustawia `/.htaccess` dla całej strony (także `api/`, `uploads/`).

## Fallback SPA

Trasy renderowane w przeglądarce (`/wpis/*`, `/grupy/*`, `/admin/*`) i nieznane adresy dostają **`index.csr.html`**
(pusta powłoka aplikacji). **Nigdy `index.html`** — to prerenderowana strona główna ze znacznikami hydratacji; podana pod
innym adresem psułaby hydratację. Prerenderowane trasy to katalogi (`aktualnosci/index.html`); `/.htaccess` ma
`DirectorySlash Off` i wewnętrznie serwuje `<trasa>/index.html` zarówno dla `/aktualnosci`, jak i `/aktualnosci/`,
bez przekierowań. `/api/*` i `/uploads/*` są wyłączone z fallbacku. Brakujące pliki statyczne (`.js`, `.css`, `.map`,
czcionki, obrazki, `.json`) dostają **404**, a nie `index.csr.html` — inaczej stara karta po aktualizacji dostałaby HTML
zamiast skryptu. Skrypt paczki przerywa pracę, jeśli w buildzie nie ma `index.csr.html`.

## Wersje i wsparcie

- **Angular 21** to poprzednia główna wersja. Wsparcie LTS (poprawki bezpieczeństwa) potrwa **orientacyjnie do maja 2027**
  (18 miesięcy od premiery w listopadzie 2025). Dokładną datę sprawdzisz na <https://angular.dev/reference/releases>
  (tabela *Actively supported versions*); `cd frontend && npm ls @angular/core` pokazuje zainstalowaną wersję.
- **PrimeNG 21.1.10** to ostatnie wydanie na licencji MIT bez klucza — kolejnych poprawek dla linii 21 nie będzie.
  To samo dotyczy `primeicons` 7.0.0 i `@primeuix/themes` 2.0.3.
- **Plan wyjścia** (przed końcem LTS Angulara 21, albo wcześniej, jeśli w PrimeNG 21 wyjdzie istotny błąd):
  1. uzyskać klucz licencji PrimeUI *Community* (warunki i to, czy przedszkole się kwalifikuje, sprawdź na stronie PrimeUI)
     i przejść na Angular 22+ z PrimeNG 22+ (klucz konfiguruje się w aplikacji; bez niego PrimeNG 22 pokazuje baner licencji), albo
  2. zastąpić PrimeNG inną biblioteką komponentów (np. Angular Material/CDK) — używane są: Button, Dialog,
     ConfirmDialog, Toast, Message, Tag, pola formularzy (InputText, Textarea, Password, InputNumber, Select, MultiSelect,
     Checkbox, RadioButton), Paginator, Galleria, Editor (Quill), ProgressBar.
- **`npm audit`**: alarmy dla `vitest`/`@vitest/mocker` dotyczą tylko narzędzia testowego (nie trafia do paczki `deploy/`).
  Naprawa wymaga vitest ≥ 4.1.11, którego instalacja wywraca npm 10.9.9 — podnieś vitest po przejściu na npm 11.
  Alarm „low” dla `quill` 2.0.3 (XSS w eksporcie HTML) jest łagodzony po stronie serwera: backend czyści HTML wpisów
  i treści (`HtmlSanitizer`) przed zapisem.
