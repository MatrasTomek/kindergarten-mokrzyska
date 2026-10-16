import { Route } from '@angular/router';
import { routes } from './app.routes';
import { ContentPageComponent } from './public/content/content.page';
import { GroupDetailPage } from './public/groups/group-detail.page';
import { PostDetailPage } from './public/posts/post-detail.page';
import { PostsPage } from './public/posts/posts.page';

describe('public routes', () => {
  const children = routes.find((r) => r.path === '')!.children!;
  const route = (path: string): Route => children.find((r) => r.path === path)!;

  it('lazy-loads pages using PrimeNG Paginator/Galleria (keeps them out of the initial bundle)', async () => {
    const expected: [string, unknown][] = [
      ['aktualnosci', PostsPage],
      ['z-zycia-przedszkola', PostsPage],
      ['wpis/:slug', PostDetailPage],
      ['grupy/:slug', GroupDetailPage],
      ['kontakt', ContentPageComponent],
      ['dokumenty', ContentPageComponent],
    ];
    for (const [path, component] of expected) {
      const r = route(path);
      expect(r.component, path).toBeUndefined();
      expect(await (r.loadComponent as () => Promise<unknown>)(), path).toBe(component);
    }
  });
});
