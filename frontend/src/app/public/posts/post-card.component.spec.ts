import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Post } from '../../core/models';
import { SECTIONS } from '../../core/sections';
import { PostCardComponent } from './post-card.component';

describe('PostCardComponent', () => {
  function render(targets: Post['targets']): HTMLElement {
    TestBed.configureTestingModule({ imports: [PostCardComponent], providers: [provideRouter([])] });
    const f = TestBed.createComponent(PostCardComponent);
    f.componentRef.setInput('post', { id: '1', title: 'Bal', slug: 'bal', excerpt: '', body: '', images: [], targets, status: 'published', publishedAt: null });
    f.detectChanges();
    return f.nativeElement;
  }

  it('labels a news post with Aktualności in its colour', () => {
    const tag = render({ news: true, groupIds: [] }).querySelector('.tag') as HTMLElement;
    expect(tag.textContent!.trim()).toBe('Aktualności');
    expect(tag.style.getPropertyValue('--section')).toBe(SECTIONS.aktualnosci.color);
  });

  it('labels a post without news and groups with Z życia Przedszkola', () => {
    expect(render({ news: false, groupIds: [] }).querySelector('.tag')!.textContent!.trim()).toBe('Z życia Przedszkola');
  });

  it('labels a group-only post with Grupy', () => {
    expect(render({ news: false, groupIds: ['g'] }).querySelector('.tag')!.textContent!.trim()).toBe('Grupy');
  });
});
