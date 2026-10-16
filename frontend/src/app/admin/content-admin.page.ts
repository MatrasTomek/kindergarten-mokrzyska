import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, ElementRef, inject, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { RadioButton } from 'primeng/radiobutton';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { AdminApi } from '../core/api/admin-api';
import { apiErrorMessage } from '../core/api-error';
import { uploadUrl } from '../core/config';
import { CONTENT_PAGES } from '../core/content-pages';
import { ContentInput, ContentItem } from '../core/models';
import { formatSize } from '../public/content/format-size';
import { ImageUploaderComponent } from '../shared/images/image-uploader.component';
import { RichTextComponent } from '../shared/rich-text.component';
import { LeaveConfirmable } from './unsaved-changes.guard';

const MAX_PDF_BYTES = 10 * 1024 * 1024;

const emptyDraft = (page: string, order: number): ContentInput =>
  ({ page, title: '', body: '', attachments: [], images: [], order, status: 'published' });

@Component({
  selector: 'app-content-admin-page',
  imports: [FormsModule, Button, Dialog, InputNumber, InputText, RadioButton, Select, Tag, RichTextComponent, ImageUploaderComponent],
  template: `
    <div class="head">
      <h1 tabindex="-1" #heading>Treści podstron</h1>
      <p-button data-test="new" label="+ Nowy element" [disabled]="items() === null" (onClick)="openNew()" />
    </div>
    <label for="page-select">Podstrona</label>
    <p-select inputId="page-select" [options]="pages" optionLabel="title" optionValue="slug" [ngModel]="page()" (ngModelChange)="selectPage($event)" />

    @if (error(); as msg) {
      <div role="alert" class="error">
        <p>{{ msg }}</p>
        <p-button data-test="retry" label="Spróbuj ponownie" (onClick)="load()" />
      </div>
    } @else if (items(); as list) {
      <table class="list">
        <thead><tr><th>Kolejność</th><th>Tytuł</th><th>Status</th><th>Załączniki</th><th><span class="sr-only">Akcje</span></th></tr></thead>
        <tbody>
          @for (item of list; track item.id) {
            <tr>
              <td>{{ item.order }}</td><td>{{ item.title }}</td>
              <td><p-tag [value]="item.status === 'published' ? 'Opublikowany' : 'Szkic'" [severity]="item.status === 'published' ? 'success' : 'secondary'" /></td>
              <td>
                @for (a of item.attachments; track a.file) {
                  <a [href]="url(a.file)" target="_blank" rel="noopener">{{ a.name }}<span class="sr-only"> (otwiera się w nowej karcie)</span></a>@if (!$last) {, }
                } @empty { — }
              </td>
              <td>
                <p-button icon="pi pi-pencil" [text]="true" [ariaLabel]="'Edytuj ' + item.title" (onClick)="openEdit(item)" />
                <p-button icon="pi pi-trash" [text]="true" severity="danger" [ariaLabel]="'Usuń ' + item.title" (onClick)="remove(item)" />
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5">Ta podstrona nie ma jeszcze treści.</td></tr>
          }
        </tbody>
      </table>
    } @else {
      <p aria-live="polite">Ładowanie…</p>
    }

    <p-dialog [visible]="dialog()" (visibleChange)="onVisibleChange($event)" (onHide)="restoreFocus()" [header]="editId ? 'Edycja elementu' : 'Nowy element'" [modal]="true" [style]="{ width: 'min(60rem, 95vw)' }">
      <form (ngSubmit)="save()" class="form">
        <label for="c-title">Tytuł sekcji <span aria-hidden="true">*</span><span class="sr-only">(wymagane)</span></label>
        <input pInputText id="c-title" name="title" [(ngModel)]="draft.title" required maxlength="200" />
        <app-rich-text label="Treść" [(value)]="draft.body" />

        <fieldset>
          <legend>Pliki PDF</legend>
          <ul class="att">
            @for (a of draft.attachments; track a.file; let i = $index) {
              <li>{{ a.name }} ({{ size(a.size) }}) <p-button icon="pi pi-times" [text]="true" size="small" [ariaLabel]="'Usuń plik ' + a.name" (onClick)="removeAttachment(i)" /></li>
            }
          </ul>
          <label class="p-button p-button-outlined">
            Dodaj PDF
            <input type="file" accept="application/pdf" class="sr-only" (change)="onPdf($event)" />
          </label>
          <p class="hint">Maksymalnie 10 MB na plik.</p>
          <span role="status">@if (pdfBusy() > 0) {Wysyłanie pliku…}</span>
          @if (pdfError(); as msg) { <p class="err" role="alert" data-test="pdf-error">{{ msg }}</p> }
        </fieldset>

        <fieldset>
          <legend>Zdjęcia</legend>
          <app-image-uploader [(images)]="draft.images" context="content" [defaultAlt]="draft.title.trim()" (busyChange)="imgBusy.set($event)" />
        </fieldset>

        <label for="c-order">Kolejność na stronie</label>
        <p-inputnumber inputId="c-order" name="order" [(ngModel)]="draft.order" [useGrouping]="false" />
        <div class="row" role="group" aria-label="Status">
          <p-radiobutton inputId="c-pub" name="status" value="published" [(ngModel)]="draft.status" /><label for="c-pub">Opublikowany</label>
          <p-radiobutton inputId="c-draft" name="status" value="draft" [(ngModel)]="draft.status" /><label for="c-draft">Szkic</label>
        </div>
        @if (saveError(); as msg) { <p class="err" role="alert" data-test="save-error">{{ msg }}</p> }
        <div class="actions">
          <p-button label="Anuluj" severity="secondary" [text]="true" (onClick)="requestClose()" />
          <p-button data-test="save" type="submit" label="Zapisz" [loading]="saving()" [disabled]="saving() || !draft.title.trim() || pdfBusy() > 0 || imgBusy()" />
        </div>
      </form>
    </p-dialog>
  `,
  styles: `
    .head { display: flex; justify-content: space-between; align-items: center; }
    .error { margin: 1rem 0; }
    .err { color: #b91c1c; font-weight: 600; }
    .hint { font-size: .875rem; color: #4b5563; }
    .list { width: 100%; border-collapse: collapse; margin-top: 1rem; } .list th, .list td { text-align: left; padding: .5rem; border-bottom: 1px solid #e5e7eb; }
    .form { display: flex; flex-direction: column; gap: .75rem; }
    fieldset { border: 1px solid #e5e7eb; border-radius: .5rem; padding: 1rem; }
    .att { list-style: none; padding: 0; }
    .row { display: flex; gap: .5rem; align-items: center; }
    .actions { display: flex; justify-content: flex-end; gap: .5rem; }
    .p-button:has(input:focus-visible) { outline: 3px solid #1d4ed8; outline-offset: 2px; }
  `,
})
export class ContentAdminPage implements LeaveConfirmable {
  private readonly api = inject(AdminApi);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  protected readonly pages = [...CONTENT_PAGES];
  protected readonly page = signal<string>(CONTENT_PAGES[0].slug);
  protected readonly items = signal<ContentItem[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly pdfBusy = signal(0);
  protected readonly pdfError = signal<string | null>(null);
  protected readonly imgBusy = signal(false);
  protected readonly size = formatSize;
  protected readonly url = uploadUrl;
  protected readonly dialog = signal(false);
  protected editId: string | null = null;
  protected draft: ContentInput = emptyDraft(CONTENT_PAGES[0].slug, 1);
  private baseline = '';
  private loadSeq = 0;
  private opener: HTMLElement | null = null;
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');

  constructor() {
    this.load();
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

  protected selectPage(slug: string): void {
    this.page.set(slug);
    this.load();
  }

  protected openNew(): void {
    this.rememberOpener();
    this.editId = null;
    this.begin(emptyDraft(this.page(), (this.items()?.length ?? 0) + 1));
  }

  protected openEdit(item: ContentItem): void {
    this.rememberOpener();
    this.editId = item.id;
    this.begin({ page: item.page, title: item.title, body: item.body, attachments: [...item.attachments], images: item.images.map((i) => ({ ...i })), order: item.order, status: item.status });
  }

  private begin(draft: ContentInput): void {
    this.draft = draft;
    this.baseline = JSON.stringify(draft);
    this.saveError.set(null);
    this.pdfError.set(null);
    this.imgBusy.set(false);
    this.pdfBusy.set(0);
    this.dialog.set(true);
  }

  protected isDirty(): boolean {
    return this.dialog() && (this.pdfBusy() > 0 || JSON.stringify(this.draft) !== this.baseline);
  }

  protected onVisibleChange(visible: boolean): void {
    if (visible) this.dialog.set(true);
    else this.requestClose();
  }

  /** Zamknięcie okna (X, Esc, Anuluj): przy niezapisanych zmianach pyta o zgodę. */
  protected requestClose(): void {
    if (this.saving()) return;
    if (!this.isDirty()) {
      this.dialog.set(false);
      return;
    }
    this.confirm.confirm({
      header: 'Niezapisane zmiany',
      message: 'Masz niezapisane zmiany. Zamknąć okno bez zapisywania?',
      acceptLabel: 'Zamknij',
      rejectLabel: 'Zostań',
      acceptButtonProps: { severity: 'danger' },
      accept: () => this.dialog.set(false),
    });
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

  protected onPdf(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.uploadPdf(file);
  }

  protected uploadPdf(file: File): void {
    this.pdfError.set(null);
    if (file.size > MAX_PDF_BYTES) {
      this.pdfError.set(`Plik „${file.name}” ma ${formatSize(file.size)}. Maksymalny rozmiar pliku PDF to 10 MB.`);
      return;
    }
    const draft = this.draft;
    this.pdfBusy.update((n) => n + 1);
    this.api.uploadPdf(file).subscribe({
      next: (a) => {
        if (this.draft !== draft) return; // okno zamknięte / otwarto inny element: odpowiedź nie należy do bieżącego szkicu
        draft.attachments = [...draft.attachments, a];
        this.pdfBusy.update((n) => n - 1);
      },
      error: (err) => {
        if (this.draft !== draft) return;
        this.pdfBusy.update((n) => n - 1);
        this.pdfError.set(apiErrorMessage(err));
      },
    });
  }

  protected removeAttachment(i: number): void {
    this.draft.attachments = this.draft.attachments.filter((_, idx) => idx !== i);
  }

  protected save(): void {
    const title = this.draft.title.trim();
    if (this.saving() || !title || this.pdfBusy() > 0 || this.imgBusy()) return;
    const input: ContentInput = {
      ...this.draft,
      title,
      order: this.draft.order ?? (this.items()?.length ?? 0) + 1,
      images: this.draft.images.map((img) => ({ ...img, alt: img.alt.trim() || title })),
    };
    this.saving.set(true);
    this.saveError.set(null);
    (this.editId ? this.api.updateContent(this.editId, input) : this.api.createContent(input)).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialog.set(false);
        this.messages.add({ severity: 'success', summary: 'Zapisano' });
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.saveError.set(apiErrorMessage(e));
      },
    });
  }

  protected remove(item: ContentItem): void {
    this.rememberOpener();
    this.confirm.confirm({
      header: 'Usunąć element?',
      message: `„${item.title}” wraz z plikami zostanie trwale usunięty.`,
      acceptLabel: 'Usuń', rejectLabel: 'Anuluj', acceptButtonProps: { severity: 'danger' },
      accept: () => {
        this.opener = null;
        this.api.deleteContent(item.id).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Element usunięty' });
            this.heading()?.nativeElement.focus();
            this.load();
          },
          error: (e) => this.messages.add({ severity: 'error', summary: apiErrorMessage(e) }),
        });
      },
      reject: () => this.restoreFocus(),
    });
  }

  protected load(): void {
    const seq = ++this.loadSeq;
    this.error.set(null);
    this.items.set(null);
    this.api.content(this.page()).subscribe({
      next: (i) => seq === this.loadSeq && this.items.set(i),
      error: (e) => seq === this.loadSeq && this.error.set(apiErrorMessage(e)),
    });
  }

  protected restoreFocus(): void {
    const el = this.opener;
    this.opener = null;
    if (el?.isConnected) el.focus();
  }

  private rememberOpener(): void {
    const a = document.activeElement;
    this.opener = a instanceof HTMLElement && a !== document.body ? a : null;
  }
}
