# Motywy świąteczne (dekoracje) — projekt

Data: 2026-10-20 · Dotyczy: backend (Theme), frontend (panel motywów + część publiczna).

## 1. Intencja

Do motywów trzeba dodać **gotowe, wbudowane motywy okolicznościowe** związane ze świętami katolickimi oraz dwoma świętami ważnymi dla przedszkola. Taki motyw **dodaje tylko grafiki** na stronach. Nie zmienia kolorów.

Właściciel podał przykład wielkanocny: baranek, jajko (pisanka), Pan Jezus na krzyżu. To kilka małych grafik, które pojawiają się losowo na stronie.

Najważniejsze dla właściciela: **motywy kolorystyczne zostają bez zmian**. Motyw świąteczny to osobna warstwa nakładana na aktywną paletę, sezonową albo wybraną ręcznie.

## 2. Cele, nie-cele, anty-cele

**Cele**
- 8 wbudowanych motywów świątecznych (sekcja 4), każdy z własnym zestawem ilustracji.
- Administrator w panelu motywów ręcznie włącza jeden motyw świąteczny albo „Brak” i ręcznie go wyłącza.
- Gdy motyw jest włączony, na każdej stronie publicznej widać kilka małych ilustracji rozmieszczonych losowo.

**Nie-cele**
- Automatyczne włączanie według kalendarza (decyzja właściciela: włącza administrator).
- Wgrywanie własnych grafik przez administratora i edycja zestawów w panelu. Grafiki są na stałe w kodzie (decyzja właściciela: „narysuj”).
- Zmiana palety przez motyw świąteczny.
- Dekoracje w panelu administratora (`/admin`).
- Kilka motywów świątecznych naraz.

**Anty-cele** (porażka, nawet jeśli „działa”)
- Grafiki zasłaniają tekst, zdjęcia, przyciski lub pola formularzy albo przechwytują kliknięcia.
- Zmiana albo utrata ustawień motywów kolorystycznych.
- Regresja dostępności. Testy e2e audytują `axe` (A/AA), a pasek dostępności musi dalej działać.
- Ilustracje religijne nieodpowiednie dla dzieci, np. drastyczny krzyż z krwią, albo karykaturalne.
- Zauważalne spowolnienie strony lub przesunięcia układu (CLS).

## 3. Stan obecny (ograniczenia)

- Motywy to palety kolorów: `backend/src/Theme/*`, kolekcja `themes`, typy `season` (4, wbudowane w `DefaultThemes`) i `special` (tworzone przez administratora). Tryb `auto`/`manual` jest w dokumencie `settings` `_id: 'site'` (`SettingsRepository`).
- Publiczne `GET /api/theme` zwraca aktywny motyw (`ThemePresenter`). Frontend `ThemeService.load()` nakłada paletę, a pre-paint w `index.html` czyta ją z `localStorage`.
- Panel: `frontend/src/app/admin/themes-admin.page.ts` (fieldset „Aktywny motyw”, lista motywów, dialog edycji). API: `GET/PUT /api/admin/settings`.
- Układ publiczny: `frontend/src/app/layout/public-layout.component.ts`. Kolumna treści ma `max-width: 72rem`.
- Dostępność: pasek (`a11y.service.ts`) ustawia klasy `a11y-contrast`, `a11y-grayscale` itd. na `<html>`. Ograniczenie ruchu działa przez `prefers-reduced-motion` w `styles.scss`.
- Prerender (`@angular/ssr`) tras statycznych. Pliki statyczne są publikowane z katalogu `frontend/public/`.
- Testy dla `settings` sprawdzają dokładny kształt odpowiedzi (`ThemeAdminTest.php`). Zmiana kształtu oznacza aktualizację tych testów.
- Właściciel commituje sam. Implementacja nie robi commitów.

## 4. Katalog motywów świątecznych

Lista motywów to decyzja właściciela. Zestawy grafik to **propozycja projektanta**. Wielkanoc opiera się na przykładzie właściciela. Każdy zestaw ma 5–6 ilustracji.

| Klucz | Nazwa | Ilustracje (propozycja) |
|---|---|---|
| `christmas` | Boże Narodzenie | żłóbek z Dzieciątkiem, gwiazda betlejemska, aniołek, choinka, bombka, opłatek |
| `epiphany` | Trzech Króli | trzy korony, gwiazda z warkoczem, wielbłąd, szkatułka z darami, napis K+M+B |
| `easter` | Wielkanoc | baranek z chorągiewką, pisanka, krzyż z Panem Jezusem, palma wielkanocna, kurczaczek, koszyczek ze święconką |
| `pentecost` | Zesłanie Ducha Świętego | gołębica, płomyki, promienie/słońce, gałązka |
| `corpus-christi` | Boże Ciało | monstrancja, kwiatki/płatki do sypania, gałązka brzozy, kłos i winogrona |
| `all-saints` | Wszystkich Świętych | znicz, chryzantema, jesienny liść, aniołek |
| `st-nicholas` | Mikołajki | Święty Mikołaj z workiem, prezent, laska cukrowa, gwiazdka śniegu, sanie |
| `childrens-day` | Dzień Dziecka | balony, latawiec, tęcza, słoneczko, piłka, miś |

**Styl ilustracji:** prosty, ciepły, przedszkolny, płaskie kolory z miękkim konturem, spójny między motywami. Kolory ilustracji są stałe (własne), **niezależne od palety** strony. Postacie religijne (Pan Jezus, Dzieciątko, Mikołaj) przedstawiamy z szacunkiem, łagodnie i bez dosłownych ran czy krwi.

**Format:** pliki SVG rysowane ręcznie w kodzie, małe (cel: ≤ 4 KB każdy), w `frontend/public/decor/<klucz>/…svg`. Katalog motywów (klucz, nazwa, lista plików) jest zdefiniowany w jednym miejscu we frontendzie. Backend zna tylko listę dozwolonych kluczy.

## 5. Zachowanie

### 5.1 Panel administratora
- Na stronie „Motywy kolorystyczne” pojawia się nowa, osobna sekcja **„Motyw świąteczny (dekoracje)”** pod „Aktywny motyw”. Jest w niej wybór: „Brak” + 8 motywów oraz przycisk „Zapisz”.
- Przy wybranym motywie panel pokazuje miniatury jego ilustracji, żeby administrator widział, co się pojawi.
- Zapis działa niezależnie od zapisu palety. Zapisanie dekoracji nie zmienia `themeMode`/`manualThemeId` i odwrotnie.
- Po zapisie strona pokazuje komunikat sukcesu, tak jak przy ustawieniach palety.

### 5.2 Strona publiczna
- Dekoracje widać na wszystkich trasach publicznych (w `PublicLayoutComponent`), nigdy w `/admin`.
- Jednocześnie widać **4–6 ilustracji** z zestawu na szerokim ekranie i **2–3** na wąskim (telefon). Są mniejsze na telefonie.
- Rozmieszczenie jest **losowe przy każdym wejściu na stronę**: losowy wybór ilustracji z zestawu, pozycja, lekki obrót i rozmiar w ustalonych widełkach. *Decyzja projektanta:* nowe losowanie przy każdej zmianie podstrony (zdarzenie routera), nie tylko przy pełnym przeładowaniu. Ilustracje przewijają się razem ze stroną, są rozłożone na całej jej wysokości, a nie przyklejone do ekranu.
- Ilustracje stoją **tylko w wolnych miejscach**: na szerokim ekranie na marginesach poza kolumną treści (72rem), a na wąskim w strefach bez treści, np. przy nagłówku obok logo i nad stopką. Nigdy na tekście, zdjęciach ani kontrolkach. *Decyzja projektanta:* zasada „nigdy na treści” ma pierwszeństwo przed liczbą. Gdy brakuje miejsca, np. przy długiej nazwie w nagłówku na telefonie, pokazujemy mniej ilustracji.
- **Akceptacja grafik:** właściciel wybrał rysowanie wszystkich 8 zestawów od razu i ocenę całości na końcu. Plan nie czeka na akceptację próbki. Rysunki to osobne zadanie, a na końcu wykonawca przygotowuje stronę podglądu ze wszystkimi zestawami do oceny.
- Ilustracje nie przechwytują kliknięć (`pointer-events: none`), są ukryte przed czytnikami ekranu (`aria-hidden`, `alt=""`) i nie dostają fokusu.
- Ruch: delikatne kołysanie. Przy `prefers-reduced-motion` są nieruchome (obecna reguła w `styles.scss` to już wymusza).
- Nie powodują przesunięć układu (pozycjonowanie absolutne, nie wpływają na przepływ dokumentu).
- Gdy motyw świąteczny to „Brak”, nic się nie renderuje i nic się nie pobiera.

## 6. Dane i API (decyzje projektanta)

- Ustawienie przechowujemy w tym samym dokumencie `settings` (`_id: 'site'`) jako pole `decorKey: string | null`. Domyślnie `null`.
- Backend ma listę dozwolonych kluczy (8 z sekcji 4), np. w nowej klasie obok `DefaultThemes`. Nieznany klucz daje 400 z polskim komunikatem.
- Admin: osobny endpoint `GET/PUT /api/admin/decor` z body `{ "decorKey": "easter" | null }`, chroniony tak jak `/api/admin/settings`. Osobny endpoint zostawia kształt `/api/admin/settings` bez zmian.
- Publicznie: odpowiedź `GET /api/theme` dostaje dodatkowe pole `decor: string | null`. Dzięki temu nie ma dodatkowego żądania. Interfejs `Theme` we frontendzie trzeba rozszerzyć (albo dodać osobny typ odpowiedzi publicznej).
- Bez cache w `localStorage` i bez pre-paint dla dekoracji. Pojawiają się po załadowaniu `/api/theme`. W prerenderowanym HTML ich nie ma (renderowanie tylko w przeglądarce).

## 7. Testy i dostępność

- Backend: walidacja klucza, domyślne `null`, zapis/odczyt, niezależność od `themeMode`, pole `decor` w `/api/theme`, autoryzacja endpointu.
- Frontend (unit): sekcja w panelu (wybór, miniatury, zapis, błąd), komponent dekoracji (renderuje N ilustracji z właściwego zestawu, nic przy `null`, `aria-hidden`, brak w adminie).
- E2E: audyt `axe` strony publicznej z włączonym motywem świątecznym.
- Wysoki kontrast: reguła `html.a11y-contrast body *:not(img):not(svg)` nie dotyka `<img>`, więc ilustracje zostają w kolorze. Projektant uznaje, że to dopuszczalne (są ozdobą). Skala szarości działa automatycznie przez filtr na `<html>`.

## 8. Pozostawione wykonawcy

- Dokładny algorytm losowania pozycji i stref „wolnych miejsc” oraz progi szerokości (punkt przełamania).
- Kształt komponentu dekoracji i to, czy SVG ładujemy jako `<img>`, czy inline.
- Nazwy klas, plików i serwisów zgodne z istniejącym kodem.
- Ostateczny dobór ilustracji w zestawie, w granicach sekcji 4 i stylu.
