import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API } from '../config';
import { ContentPageSlug } from '../content-pages';
import { ContentItem, Group, Paged, Post, PublicTheme } from '../models';

@Injectable({ providedIn: 'root' })
export class PublicApi {
  private readonly http = inject(HttpClient);

  theme() {
    return this.http.get<PublicTheme>(`${API}/theme`);
  }

  posts(q: { news?: boolean; group?: string; page?: number } = {}) {
    let params = new HttpParams().set('page', q.page ?? 1);
    if (q.news) params = params.set('news', 1);
    if (q.group) params = params.set('group', q.group);
    return this.http.get<Paged<Post>>(`${API}/posts`, { params });
  }

  post(slug: string) {
    return this.http.get<Post>(`${API}/posts/${encodeURIComponent(slug)}`);
  }

  groups() {
    return this.http.get<Group[]>(`${API}/groups`);
  }

  group(slug: string) {
    return this.http.get<Group>(`${API}/groups/${encodeURIComponent(slug)}`);
  }

  content(page: ContentPageSlug) {
    return this.http.get<ContentItem[]>(`${API}/content/${page}`);
  }
}
