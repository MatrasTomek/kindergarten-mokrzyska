# API — kontrakt

Bazowy URL: `/api`. JSON UTF-8. Daty ISO 8601 (`2026-10-15T12:00:00+02:00`).
Błąd: `{"error":{"code":"VALIDATION","message":"Pole title jest wymagane."}}`
Kody: 400 VALIDATION, 401 UNAUTHORIZED / INVALID_CREDENTIALS, 403 FORBIDDEN, 404 NOT_FOUND,
413 FILE_TOO_LARGE, 429 TOO_MANY_ATTEMPTS, 500 INTERNAL.
Ścieżki plików (`file`, `thumb`) są względne wobec `/uploads/`, np. `posts/2026/10/<uuid>.webp`.

## Typy

```ts
type Role = 'admin' | 'user';
type Shade = '50'|'100'|'200'|'300'|'400'|'500'|'600'|'700'|'800'|'900';
type Palette = Record<Shade, string> & { accent: string; text: string };   // "#rrggbb"
interface Theme { id: string | null; key: string; name: string; type: 'season' | 'special';
                  palette: Palette; seasonStart: string | null /* "MM-DD" */ }
interface Settings { themeMode: 'auto' | 'manual'; manualThemeId: string | null }
interface AuthUser { id: string; email: string; name: string; role: Role }
interface LoginResponse { accessToken: string; user: AuthUser }
interface PostImage { file: string; thumb: string; w: number; h: number; alt: string }
interface Post { id: string; title: string; slug: string; excerpt: string; body: string;
                 images: PostImage[]; targets: { news: boolean; groupIds: string[] };
                 status: 'draft' | 'published'; publishedAt: string | null }
interface AdminPost extends Post { createdBy: string; updatedBy: string; createdAt: string; updatedAt: string }
interface Paged<T> { items: T[]; page: number; pages: number; total: number }
interface Group { id: string; name: string; slug: string; order: number; description: string }
interface Attachment { file: string; name: string; size: number }
interface ContentItem { id: string; page: string; title: string; body: string; attachments: Attachment[];
                        images: PostImage[]; order: number; status: 'draft' | 'published'; updatedAt: string }
interface UserAccount { id: string; email: string; name: string; role: Role; active: boolean; createdAt: string }
interface UploadedImage { file: string; thumb: string; w: number; h: number }
```

## Publiczne

| Metoda | Ścieżka | Odpowiedź |
|---|---|---|
| GET | `/api/health` | `{status:"ok"}` |
| GET | `/api/theme` | `Theme` |
| GET | `/api/posts?news=1&group=<slug>&page=<n>` | `Paged<Post>` (12/str., `publishedAt` malejąco; 404 gdy grupa nie istnieje) |
| GET | `/api/posts/{slug}` | `Post` |
| GET | `/api/groups` | `Group[]` (wg `order`) |
| GET | `/api/groups/{slug}` | `Group` |
| GET | `/api/content/{page}` | `ContentItem[]` (opublikowane, wg `order`); `page` ∈ `dla-rodzicow, specjalisci, dokumenty, rekrutacja, rodo, kontakt, o-nas, deklaracja-dostepnosci` |

## Auth

| Metoda | Ścieżka | Body | Odpowiedź |
|---|---|---|---|
| POST | `/api/auth/login` | `{email, password}` | `LoginResponse` + cookie `refresh_token` |
| POST | `/api/auth/refresh` | — (cookie) | `LoginResponse` |
| POST | `/api/auth/logout` | — | 204, czyści cookie |

## Panel (nagłówek `Authorization: Bearer <accessToken>`)

| Metoda | Ścieżka | Rola | Body → Odpowiedź |
|---|---|---|---|
| GET | `/api/admin/me` | admin, user | → `AuthUser` |
| GET | `/api/admin/posts?page=<n>` | admin, user | → `Paged<AdminPost>` (20/str., `updatedAt` malejąco) |
| GET | `/api/admin/posts/{id}` | admin, user | → `AdminPost` |
| POST | `/api/admin/posts` | admin, user | `PostInput` → 201 `AdminPost` |
| PUT | `/api/admin/posts/{id}` | admin, user | `PostInput` → `AdminPost` |
| DELETE | `/api/admin/posts/{id}` | admin | → 204 |
| POST | `/api/admin/uploads/image` | admin, user | multipart `image`, `thumb`, `context` (`posts`\|`content`) → 201 `UploadedImage` |
| POST | `/api/admin/uploads/pdf` | admin | multipart `file` → 201 `Attachment` |
| GET/POST | `/api/admin/groups` | admin | `{name, order?, description?}` → `Group[]` / 201 `Group` |
| PUT/DELETE | `/api/admin/groups/{id}` | admin | → `Group` / 204 |
| GET | `/api/admin/content?page=<slug>` | admin | → `ContentItem[]` (także szkice) |
| POST | `/api/admin/content` | admin | `ContentInput` → 201 `ContentItem` |
| GET/PUT/DELETE | `/api/admin/content/{id}` | admin | → `ContentItem` / `ContentItem` / 204 |
| GET/POST | `/api/admin/themes` | admin | `{name, palette}` → `Theme[]` / 201 `Theme` (zawsze `type: special`) |
| PUT/DELETE | `/api/admin/themes/{id}` | admin | `{name, palette, seasonStart?}` → `Theme` / 204 (400 dla sezonowych) |
| GET/PUT | `/api/admin/settings` | admin | `Settings` → `Settings` |
| GET/POST | `/api/admin/users` | admin | `{email, name, role, password}` → `UserAccount[]` / 201 `UserAccount` |
| PUT/DELETE | `/api/admin/users/{id}` | admin | `{name, role, active, password?}` → `UserAccount` / 204 |

```ts
interface PostInput { title: string; excerpt: string; body: string; images: (UploadedImage & {alt: string})[];
                      targets: { news: boolean; groupIds: string[] }; status: 'draft' | 'published' }
interface ContentInput { page: string; title: string; body: string; attachments: Attachment[];
                         images: PostImage[]; order: number; status: 'draft' | 'published' }
```
