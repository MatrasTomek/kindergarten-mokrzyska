import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, effect, inject, input, PLATFORM_ID, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { RadioButton } from 'primeng/radiobutton';
import { Textarea } from 'primeng/textarea';
import { AdminApi } from '../core/api/admin-api';
import { PublicApi } from '../core/api/public-api';
import { apiErrorMessage } from '../core/api-error';
import { AuthService } from '../core/auth/auth.service';
import { Group, PostImage, PostInput, Status } from '../core/models';
import { ImageUploaderComponent } from '../shared/images/image-uploader.component';
import { RichTextComponent } from '../shared/rich-text.component';

interface PostFormValue { title: string; excerpt: string; body: string; news: boolean; groupIds: string[]; status: Status }

/** Puste opisy zdjęć (alt) są uzupełniane tytułem wpisu, bo zdjęcia mogły zostać dodane przed wpisaniem tytułu. */
export function buildPostInput(v: PostFormValue, images: PostImage[]): PostInput {
  const title = v.title.trim();
  return {
    title,
    excerpt: v.excerpt.trim(),
    body: v.body,
    images: images.map((img) => ({ ...img, alt: img.alt.trim() || title })),
    targets: { news: v.news, groupIds: v.groupIds },
    status: v.status,
  };
}

const requiredTrimmed = (c: AbstractControl): ValidationErrors | null =>
  typeof c.value === 'string' && c.value.trim() === '' ? { required: true } : null;

@Component({
  selector: 'app-post-editor-page',
  imports: [ReactiveFormsModule, RouterLink, Button, Checkbox, InputText, MultiSelect, RadioButton, Textarea, RichTextComponent, ImageUploaderComponent],
  template: `
    <h1>{{ id() ? 'Edycja wpisu' : 'Nowy wpis' }}</h1>
    @if (loadError(); as msg) {
      <div role="alert" class="error">
        <p>{{ msg }}</p>
        <a routerLink="/admin/wpisy">Wróć do listy wpisów</a>
      </div>
    } @else {
    <form [formGroup]="form" (ngSubmit)="save()" class="form">
      <p id="required-hint" class="info">Pola oznaczone * są wymagane</p>
      <label for="title">Tytuł *</label>
      <input pInputText id="title" formControlName="title" maxlength="200" required aria-describedby="required-hint" />

      <label for="excerpt">Zajawka (krótki opis na liście wpisów)</label>
      <textarea pTextarea id="excerpt" formControlName="excerpt" rows="2" maxlength="500"></textarea>

      <app-rich-text label="Treść" [value]="form.controls.body.value" (valueChange)="form.controls.body.setValue($event)" />

      <fieldset>
        <legend>Gdzie pokazać wpis?</legend>
        <p class="info"><i class="pi pi-info-circle" aria-hidden="true"></i> Każdy wpis pojawia się w „Z życia Przedszkola”. Możesz go dodatkowo pokazać:</p>
        <div class="row">
          <p-checkbox inputId="news" formControlName="news" [binary]="true" />
          <label for="news">Pokaż w Aktualnościach</label>
        </div>
        <label for="groups">Pokaż w grupach</label>
        <p-multiselect inputId="groups" formControlName="groupIds" [options]="groups()" optionLabel="name" optionValue="id"
                       placeholder="Wybierz grupy" display="chip" [showToggleAll]="false" />
      </fieldset>

      <fieldset>
        <legend>Zdjęcia</legend>
        <app-image-uploader [(images)]="images" context="posts" [defaultAlt]="form.controls.title.value" (busyChange)="uploading.set($event)" />
      </fieldset>

      <fieldset class="row">
        <legend>Status</legend>
        <p-radiobutton inputId="st-pub" formControlName="status" value="published" /><label for="st-pub">Opublikowany</label>
        <p-radiobutton inputId="st-draft" formControlName="status" value="draft" /><label for="st-draft">Szkic (niewidoczny na stronie)</label>
      </fieldset>

      <div class="buttons">
        <p-button type="submit" label="Zapisz" [loading]="saving()" [disabled]="form.invalid || uploading()" />
        @if (uploading()) { <span role="status">Trwa wysyłanie zdjęć…</span> }
        <a routerLink="/admin/wpisy">Anuluj</a>
        <span class="spacer"></span>
        @if (id() && auth.isAdmin()) {
          <p-button data-test="delete" label="Usuń wpis" severity="danger" [outlined]="true" (onClick)="remove()" />
        }
      </div>
    </form>
    }
  `,
  styles: `
    .form { display: flex; flex-direction: column; gap: .75rem; max-width: 56rem; }
    fieldset { border: 1px solid #6b7280; border-radius: .5rem; padding: 1rem; display: flex; flex-direction: column; gap: .5rem; }
    .row { display: flex; gap: .5rem; align-items: center; flex-direction: row; flex-wrap: wrap; }
    .info { margin: 0; }
    .error { margin: 1rem 0; }
    .buttons { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
    .spacer { flex: 1; }
  `,
})
export class PostEditorPage {
  private readonly api = inject(AdminApi);
  private readonly publicApi = inject(PublicApi);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  protected readonly auth = inject(AuthService);
  readonly id = input<string>();

  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [requiredTrimmed, Validators.maxLength(200)] }),
    excerpt: new FormControl('', { nonNullable: true }),
    body: new FormControl('', { nonNullable: true }),
    news: new FormControl(false, { nonNullable: true }),
    groupIds: new FormControl<string[]>([], { nonNullable: true }),
    status: new FormControl<Status>('published', { nonNullable: true }),
  });
  protected readonly images = signal<PostImage[]>([]);
  protected readonly groups = signal<Group[]>([]);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  private baseline = '';

  constructor() {
    this.publicApi.groups().subscribe((g) => this.groups.set(g));
    this.baseline = this.snapshot();
    effect((onCleanup) => {
      const id = this.id();
      if (!id) return;
      this.loadError.set(null);
      // Odpowiedź dla poprzedniego :id jest anulowana, gdy id się zmieni.
      const sub = this.api.post(id).subscribe({
        next: (p) => {
          this.form.setValue({ title: p.title, excerpt: p.excerpt, body: p.body, news: p.targets.news, groupIds: p.targets.groupIds, status: p.status });
          this.images.set(p.images);
          this.baseline = this.snapshot();
        },
        error: (e) => this.loadError.set(apiErrorMessage(e)),
      });
      onCleanup(() => sub.unsubscribe());
    });

    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const onUnload = (e: BeforeUnloadEvent) => {
        if (!this.isDirty()) return;
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', onUnload);
      inject(DestroyRef).onDestroy(() => window.removeEventListener('beforeunload', onUnload));
    }
  }

  private snapshot(): string {
    return JSON.stringify([this.form.getRawValue(), this.images()]);
  }

  private isDirty(): boolean {
    return this.snapshot() !== this.baseline;
  }

  confirmLeave(): Promise<boolean> {
    if (!this.isDirty()) return Promise.resolve(true);
    return new Promise((resolve) =>
      this.confirm.confirm({
        header: 'Niezapisane zmiany',
        message: 'Masz niezapisane zmiany. Opuścić stronę?',
        acceptLabel: 'Opuść',
        rejectLabel: 'Zostań',
        acceptButtonProps: { severity: 'danger' },
        accept: () => resolve(true),
        reject: () => resolve(false),
      }),
    );
  }

  protected save(): void {
    if (this.form.invalid || this.uploading() || this.saving()) return;
    const input = buildPostInput(this.form.getRawValue(), this.images());
    const id = this.id();
    this.saving.set(true);
    (id ? this.api.updatePost(id, input) : this.api.createPost(input)).subscribe({
      next: () => {
        this.baseline = this.snapshot();
        this.messages.add({ severity: 'success', summary: 'Wpis zapisany' });
        void this.router.navigate(['/admin/wpisy']);
      },
      error: (e) => {
        this.saving.set(false);
        this.messages.add({ severity: 'error', summary: apiErrorMessage(e), life: 8000 });
      },
    });
  }

  protected remove(): void {
    const id = this.id();
    if (!id) return;
    this.confirm.confirm({
      header: 'Usunąć wpis?',
      message: 'Wpis i jego zdjęcia zostaną trwale usunięte.',
      acceptLabel: 'Usuń',
      rejectLabel: 'Anuluj',
      acceptButtonProps: { severity: 'danger' },
      accept: () => this.api.deletePost(id).subscribe({
        next: () => {
          this.baseline = this.snapshot();
          void this.router.navigate(['/admin/wpisy']);
        },
        error: (e) => this.messages.add({ severity: 'error', summary: apiErrorMessage(e) }),
      }),
    });
  }
}
