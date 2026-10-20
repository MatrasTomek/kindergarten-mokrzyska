export type Role = 'admin' | 'user';
export type Status = 'draft' | 'published';
export type Shade = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
export type Palette = Record<Shade, string> & { accent: string; text: string };

export interface Theme { id: string | null; key: string; name: string; type: 'season' | 'special'; palette: Palette; seasonStart: string | null }
export type DecorKey = 'christmas' | 'epiphany' | 'easter' | 'pentecost' | 'corpus-christi' | 'all-saints' | 'st-nicholas' | 'childrens-day';
export interface PublicTheme extends Theme { decor: string | null }
export interface DecorSettings { decorKey: DecorKey | null }
export interface Settings { themeMode: 'auto' | 'manual'; manualThemeId: string | null }
export interface AuthUser { id: string; email: string; name: string; role: Role }
export interface LoginResponse { accessToken: string; user: AuthUser }
export interface UploadedImage { file: string; thumb: string; w: number; h: number }
export interface PostImage extends UploadedImage { alt: string }
export interface Post {
  id: string; title: string; slug: string; excerpt: string; body: string; images: PostImage[];
  targets: { news: boolean; groupIds: string[] }; status: Status; publishedAt: string | null;
}
export interface AdminPost extends Post { createdBy: string; updatedBy: string; createdAt: string; updatedAt: string }
export interface Paged<T> { items: T[]; page: number; pages: number; total: number }
export interface Group { id: string; name: string; slug: string; order: number; description: string }
export interface Attachment { file: string; name: string; size: number }
export interface ContentItem {
  id: string; page: string; title: string; body: string; attachments: Attachment[]; images: PostImage[];
  order: number; status: Status; updatedAt: string;
}
export interface UserAccount { id: string; email: string; name: string; role: Role; active: boolean; createdAt: string }

export interface PostInput { title: string; excerpt: string; body: string; images: PostImage[]; targets: { news: boolean; groupIds: string[] }; status: Status }
export interface ContentInput { page: string; title: string; body: string; attachments: Attachment[]; images: PostImage[]; order: number; status: Status }
export interface GroupInput { name: string; order: number; description: string }
export interface ThemeInput { name: string; palette: Palette; seasonStart?: string }
export interface UserInput { email: string; name: string; role: Role; password: string }
export interface UserUpdate { name: string; role: Role; active: boolean; password?: string }
