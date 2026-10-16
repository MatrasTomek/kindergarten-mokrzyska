import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { uploadUrl } from '../../core/config';
import { Post } from '../../core/models';

@Component({
  selector: 'app-post-card',
  imports: [RouterLink, DatePipe],
  template: `
    <article class="card">
      @if (post().images[0]; as img) {
        <img [src]="url(img.thumb)" [alt]="img.alt" loading="lazy" />
      }
      <div class="body">
        <h2><a [routerLink]="['/wpis', post().slug]">{{ post().title }}</a></h2>
        @if (post().publishedAt) {
          <time [attr.datetime]="post().publishedAt">{{ post().publishedAt | date: 'd MMMM y' }}</time>
        }
        @if (post().excerpt) { <p>{{ post().excerpt }}</p> }
      </div>
    </article>
  `,
  styles: `
    .card { height: 100%; border: 2px solid var(--app-primary-200); border-radius: 1rem; overflow: hidden; background: #fff; display: flex; flex-direction: column; }
    img { width: 100%; height: 12rem; object-fit: cover; display: block; }
    .body { padding: 1rem; }
    h2 { font-size: 1.25rem; margin: 0 0 .25rem; }
    h2 a { color: var(--app-text); }
    time { font-size: .875rem; color: #4b5563; }
  `,
})
export class PostCardComponent {
  readonly post = input.required<Post>();
  protected readonly url = uploadUrl;
}
