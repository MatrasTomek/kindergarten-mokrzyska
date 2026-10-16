import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, Subject, switchMap } from 'rxjs';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Paginator } from 'primeng/paginator';
import { Tag } from 'primeng/tag';
import { AdminApi } from '../core/api/admin-api';
import { apiErrorMessage } from '../core/api-error';
import { AuthService } from '../core/auth/auth.service';
import { AdminPost, Paged } from '../core/models';

@Component({
  selector: 'app-posts-admin-page',
  imports: [RouterLink, DatePipe, Button, Tag, Paginator],
  template: `
    <div class="head">
      <h1>Wpisy</h1>
      <a routerLink="/admin/wpisy/nowy" class="p-button">+ Nowy wpis</a>
    </div>
    @if (error(); as msg) {
      <div role="alert" class="error">
        <p>{{ msg }}</p>
        <p-button data-test="retry" label="Spróbuj ponownie" (onClick)="load(page)" />
      </div>
    } @else if (data(); as d) {
      <table class="list">
        <thead><tr><th>Tytuł</th><th>Status</th><th>Opublikowano</th><th>Zmieniono</th><th><span class="sr-only">Akcje</span></th></tr></thead>
        <tbody>
          @for (p of d.items; track p.id) {
            <tr>
              <td><a [routerLink]="['/admin/wpisy', p.id]">{{ p.title }}</a></td>
              <td><p-tag [value]="p.status === 'published' ? 'Opublikowany' : 'Szkic'" [severity]="p.status === 'published' ? 'success' : 'secondary'" /></td>
              <td>{{ p.publishedAt ? (p.publishedAt | date: 'd.MM.y HH:mm') : '—' }}</td>
              <td>{{ p.updatedAt | date: 'd.MM.y HH:mm' }}</td>
              <td>
                @if (auth.isAdmin()) {
                  <p-button data-test="delete" icon="pi pi-trash" severity="danger" [text]="true" [ariaLabel]="'Usuń wpis ' + p.title" (onClick)="confirmDelete(p)" />
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5">Brak wpisów.</td></tr>
          }
        </tbody>
      </table>
      @if (d.pages > 1) {
        <p-paginator [first]="(d.page - 1) * 20" [rows]="20" [totalRecords]="d.total" (onPageChange)="load(($event.page ?? 0) + 1)" />
      }
    } @else {
      <p aria-live="polite">Ładowanie…</p>
    }
  `,
  styles: `
    .error { margin: 1rem 0; }
    .head { display: flex; justify-content: space-between; align-items: center; }
    .list { width: 100%; border-collapse: collapse; }
    .list th, .list td { text-align: left; padding: .5rem; border-bottom: 1px solid #e5e7eb; }
  `,
})
export class PostsAdminPage {
  private readonly api = inject(AdminApi);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);
  protected readonly auth = inject(AuthService);
  protected readonly data = signal<Paged<AdminPost> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected page = 1;
  private readonly requests = new Subject<number>();

  constructor() {
    this.requests
      .pipe(
        switchMap((page) =>
          this.api.posts(page).pipe(
            catchError((e) => {
              this.error.set(apiErrorMessage(e));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((d) => {
        if (!d) return;
        if (d.items.length === 0 && d.page > 1) {
          this.load(d.page - 1);
          return;
        }
        this.page = d.page;
        this.data.set(d);
      });
    this.load(1);
  }

  protected load(page: number): void {
    this.error.set(null);
    this.requests.next(page);
  }

  protected confirmDelete(p: AdminPost): void {
    this.confirm.confirm({
      header: 'Usunąć wpis?',
      message: `Wpis „${p.title}” i wszystkie jego zdjęcia zostaną trwale usunięte.`,
      acceptLabel: 'Usuń',
      rejectLabel: 'Anuluj',
      acceptButtonProps: { severity: 'danger' },
      accept: () =>
        this.api.deletePost(p.id).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Wpis usunięty' });
            this.load(this.page);
          },
          error: (e) => this.messages.add({ severity: 'error', summary: apiErrorMessage(e) }),
        }),
    });
  }
}
