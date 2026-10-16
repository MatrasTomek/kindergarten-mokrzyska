import { Routes } from '@angular/router';
import { adminGuard, authGuard } from '../core/auth/guards';
import { AdminLayoutComponent } from '../layout/admin-layout.component';
import { LoginPage } from './login.page';
import { PostsAdminPage } from './posts-admin.page';
import { unsavedChangesGuard } from './unsaved-changes.guard';

export const ADMIN_ROUTES: Routes = [
  { path: 'logowanie', component: LoginPage, title: 'Logowanie – panel' },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'wpisy' },
      { path: 'wpisy', component: PostsAdminPage, title: 'Wpisy – panel' },
      { path: 'wpisy/nowy', loadComponent: () => import('./post-editor.page').then((m) => m.PostEditorPage), canDeactivate: [unsavedChangesGuard], title: 'Nowy wpis – panel' },
      { path: 'wpisy/:id', loadComponent: () => import('./post-editor.page').then((m) => m.PostEditorPage), canDeactivate: [unsavedChangesGuard], title: 'Edycja wpisu – panel' },
      {
        path: '',
        canActivateChild: [adminGuard],
        children: [
          { path: 'grupy', loadComponent: () => import('./groups-admin.page').then((m) => m.GroupsAdminPage), title: 'Grupy – panel' },
          { path: 'tresci', loadComponent: () => import('./content-admin.page').then((m) => m.ContentAdminPage), canDeactivate: [unsavedChangesGuard], title: 'Treści – panel' },
          { path: 'motywy', loadComponent: () => import('./themes-admin.page').then((m) => m.ThemesAdminPage), title: 'Motywy – panel' },
          { path: 'uzytkownicy', loadComponent: () => import('./users-admin.page').then((m) => m.UsersAdminPage), title: 'Użytkownicy – panel' },
        ],
      },
    ],
  },
];
