import { Routes } from '@angular/router';
import { CONTENT_PAGES } from './core/content-pages';
import { pageTitle, SITE_SHORT_NAME } from './core/config';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { HomePage } from './public/home/home.page';
import { NotFoundPage } from './public/not-found.page';
import { GroupsPage } from './public/groups/groups.page';

// Strony z PrimeNG Paginator/Galleria (≈250 kB z Select/InputNumber/Overlay/forms) ładowane leniwie — poza initial bundle.
const postsPage = () => import('./public/posts/posts.page').then((m) => m.PostsPage);
const contentPage = () => import('./public/content/content.page').then((m) => m.ContentPageComponent);

export const routes: Routes = [
  { path: 'admin', data: { noindex: true }, loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES) },
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: HomePage, title: SITE_SHORT_NAME },
      { path: 'aktualnosci', loadComponent: postsPage, data: { mode: 'news', description: 'Aktualności Przedszkola Parafialnego w Mokrzyskach – ogłoszenia i bieżące informacje dla rodziców.' }, title: pageTitle('Aktualności') },
      { path: 'z-zycia-przedszkola', loadComponent: postsPage, data: { mode: 'life', description: 'Z życia Przedszkola Parafialnego w Mokrzyskach – relacje i zdjęcia z wydarzeń, uroczystości i zajęć.' }, title: pageTitle('Z życia Przedszkola') },
      { path: 'wpis/:slug', data: { seo: 'manual' }, loadComponent: () => import('./public/posts/post-detail.page').then((m) => m.PostDetailPage) },
      { path: 'grupy', component: GroupsPage, title: pageTitle('Grupy'), data: { description: 'Grupy w Przedszkolu Parafialnym w Mokrzyskach – informacje i wpisy poszczególnych grup.' } },
      { path: 'grupy/:slug', data: { seo: 'manual' }, loadComponent: () => import('./public/groups/group-detail.page').then((m) => m.GroupDetailPage) },
      ...CONTENT_PAGES.map((p) => ({
        path: p.slug,
        loadComponent: contentPage,
        data: { page: p.slug, heading: p.title, description: p.description },
        title: pageTitle(p.title),
      })),
      { path: '**', component: NotFoundPage, title: pageTitle('Nie znaleziono'), data: { noindex: true } },
    ],
  },
];
