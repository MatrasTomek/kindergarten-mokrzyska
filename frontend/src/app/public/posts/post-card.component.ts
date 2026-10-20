import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { uploadUrl } from '../../core/config';
import { Post } from '../../core/models';
import { postSection, SECTIONS } from '../../core/sections';

@Component({
  selector: 'app-post-card',
  imports: [RouterLink, DatePipe],
  template: `
    <article class="card">
      @if (post().images[0]; as img) {
        <img [src]="url(img.thumb)" [alt]="img.alt" loading="lazy" />
      }
      <div class="body">
        <span class="tag" [style.--section]="section().color">{{ section().title }}</span>
        <h2><a [routerLink]="['/wpis', post().slug]">{{ post().title }}</a></h2>
        @if (post().publishedAt) {
          <time [attr.datetime]="post().publishedAt">{{ post().publishedAt | date: 'd MMMM y' }}</time>
        }
        @if (post().excerpt) { <p>{{ post().excerpt }}</p> }
      </div>
    </article>
  `,
  styles: `
    .card {
      height: 100%; border-radius: var(--radius-lg); overflow: hidden; background: #fff; display: flex; flex-direction: column;
      box-shadow: 0 2px 10px rgba(0, 0, 0, .1);
    }
    img { width: 100%; height: 12rem; object-fit: cover; display: block; }
    .body { padding: 1rem 1.125rem 1.25rem; }
    h2 { font-size: 1.25rem; margin: .5rem 0 .25rem; }
    h2 a { color: var(--app-text); }
    time { font-size: .875rem; color: #4b5563; }
  `,
})
export class PostCardComponent {
  readonly post = input.required<Post>();
  protected readonly section = computed(() => SECTIONS[postSection(this.post())]);
  protected readonly url = uploadUrl;
}
