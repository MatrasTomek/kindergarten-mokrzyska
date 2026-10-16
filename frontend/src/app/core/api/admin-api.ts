import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API } from '../config';
import {
  AdminPost, Attachment, AuthUser, ContentInput, ContentItem, Group, GroupInput, Paged, PostInput,
  Settings, Theme, ThemeInput, UploadedImage, UserAccount, UserInput, UserUpdate,
} from '../models';

const extFor = (b: Blob): string => (b.type === 'image/webp' ? 'webp' : 'jpg');

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${API}/admin`;

  me() { return this.http.get<AuthUser>(`${this.base}/me`); }

  posts(page = 1) { return this.http.get<Paged<AdminPost>>(`${this.base}/posts`, { params: new HttpParams().set('page', page) }); }
  post(id: string) { return this.http.get<AdminPost>(`${this.base}/posts/${id}`); }
  createPost(input: PostInput) { return this.http.post<AdminPost>(`${this.base}/posts`, input); }
  updatePost(id: string, input: PostInput) { return this.http.put<AdminPost>(`${this.base}/posts/${id}`, input); }
  deletePost(id: string) { return this.http.delete<void>(`${this.base}/posts/${id}`); }

  uploadImage(image: Blob, thumb: Blob, context: 'posts' | 'content') {
    const fd = new FormData();
    fd.append('image', image, `image.${extFor(image)}`);
    fd.append('thumb', thumb, `thumb.${extFor(thumb)}`);
    fd.append('context', context);
    return this.http.post<UploadedImage>(`${this.base}/uploads/image`, fd, { reportProgress: true, observe: 'events' });
  }

  uploadPdf(file: File) {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.post<Attachment>(`${this.base}/uploads/pdf`, fd);
  }

  groups() { return this.http.get<Group[]>(`${this.base}/groups`); }
  createGroup(input: GroupInput) { return this.http.post<Group>(`${this.base}/groups`, input); }
  updateGroup(id: string, input: GroupInput) { return this.http.put<Group>(`${this.base}/groups/${id}`, input); }
  deleteGroup(id: string) { return this.http.delete<void>(`${this.base}/groups/${id}`); }

  content(page: string) { return this.http.get<ContentItem[]>(`${this.base}/content`, { params: new HttpParams().set('page', page) }); }
  createContent(input: ContentInput) { return this.http.post<ContentItem>(`${this.base}/content`, input); }
  updateContent(id: string, input: ContentInput) { return this.http.put<ContentItem>(`${this.base}/content/${id}`, input); }
  deleteContent(id: string) { return this.http.delete<void>(`${this.base}/content/${id}`); }

  themes() { return this.http.get<Theme[]>(`${this.base}/themes`); }
  createTheme(input: ThemeInput) { return this.http.post<Theme>(`${this.base}/themes`, input); }
  updateTheme(id: string, input: ThemeInput) { return this.http.put<Theme>(`${this.base}/themes/${id}`, input); }
  deleteTheme(id: string) { return this.http.delete<void>(`${this.base}/themes/${id}`); }
  settings() { return this.http.get<Settings>(`${this.base}/settings`); }
  saveSettings(s: Settings) { return this.http.put<Settings>(`${this.base}/settings`, s); }

  users() { return this.http.get<UserAccount[]>(`${this.base}/users`); }
  createUser(input: UserInput) { return this.http.post<UserAccount>(`${this.base}/users`, input); }
  updateUser(id: string, input: UserUpdate) { return this.http.put<UserAccount>(`${this.base}/users/${id}`, input); }
  deleteUser(id: string) { return this.http.delete<void>(`${this.base}/users/${id}`); }
}
