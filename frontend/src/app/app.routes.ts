import { Routes } from '@angular/router';
import { pageTitle, SITE_SHORT_NAME } from './core/config';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { HomePage } from './public/home/home.page';
import { NotFoundPage } from './public/not-found.page';
import { PostDetailPage } from './public/posts/post-detail.page';
import { PostsPage } from './public/posts/posts.page';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: HomePage, title: SITE_SHORT_NAME },
      { path: 'aktualnosci', component: PostsPage, data: { mode: 'news' }, title: pageTitle('Aktualności') },
      { path: 'z-zycia-przedszkola', component: PostsPage, data: { mode: 'life' }, title: pageTitle('Z życia Przedszkola') },
      { path: 'wpis/:slug', component: PostDetailPage },
      // kolejne podstrony (F7–F8) dopisujemy tutaj, przed '**'
      { path: '**', component: NotFoundPage, title: pageTitle('Nie znaleziono') },
    ],
  },
];
