import { Component, computed, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { RadioButton } from 'primeng/radiobutton';
import { Select } from 'primeng/select';
import { AdminApi } from '../core/api/admin-api';
import { apiErrorMessage } from '../core/api-error';
import { Palette, Settings, Theme, ThemeInput } from '../core/models';
import { paletteWarnings } from '../theme/contrast';
import { DEFAULT_THEMES, SHADES } from '../theme/default-themes';
import { ThemeService } from '../theme/theme.service';

type PaletteKey = (typeof SHADES)[number] | 'accent' | 'text';

const HEX = /^#[0-9a-f]{6}$/i;

@Component({
  selector: 'app-themes-admin-page',
  imports: [FormsModule, Button, Dialog, InputText, Message, RadioButton, Select],
  template: `
    <h1 tabindex="-1" #heading>Motywy kolorystyczne</h1>

    @if (error(); as msg) {
      <div role="alert" class="error">
        <p>{{ msg }}</p>
        <p-button data-test="retry" label="Spróbuj ponownie" (onClick)="load()" />
      </div>
    } @else if (themes(); as list) {
      <fieldset class="box">
        <legend>Aktywny motyw</legend>
        <div class="row">
          <p-radiobutton inputId="m-auto" name="mode" value="auto" [(ngModel)]="settings.themeMode" />
          <label for="m-auto">Automatycznie według pory roku</label>
        </div>
        <div class="row">
          <p-radiobutton inputId="m-manual" name="mode" value="manual" [(ngModel)]="settings.themeMode" />
          <label for="m-manual">Wybrany ręcznie:</label>
          <p-select [options]="list" optionLabel="name" optionValue="id" [(ngModel)]="settings.manualThemeId"
                    [disabled]="settings.themeMode !== 'manual'" placeholder="Wybierz motyw" ariaLabel="Motyw wybierany ręcznie" />
        </div>
        <p-button label="Zapisz ustawienia" (onClick)="saveSettings()"
                  [disabled]="settingsSaving() || (settings.themeMode === 'manual' && !settings.manualThemeId)" [loading]="settingsSaving()" />
      </fieldset>

      <div class="head"><h2>Motywy</h2><p-button label="+ Motyw okolicznościowy" (onClick)="openNew()" /></div>
      <ul class="themes">
        @for (t of list; track t.id) {
          <li>
            <div class="swatches" aria-hidden="true">
              @for (s of shades; track s) { <span [style.background]="t.palette[s]"></span> }
            </div>
            <strong>{{ t.name }}</strong>
            <span>{{ t.type === 'season' ? 'sezonowy, od ' + formatStart(t.seasonStart) : 'okolicznościowy' }}</span>
            <p-button icon="pi pi-pencil" [text]="true" [ariaLabel]="'Edytuj ' + t.name" (onClick)="openEdit(t)" />
            @if (t.type === 'special') {
              <p-button icon="pi pi-trash" [text]="true" severity="danger" [ariaLabel]="'Usuń ' + t.name" (onClick)="remove(t)" />
            }
          </li>
        }
      </ul>
    } @else {
      <p aria-live="polite">Ładowanie…</p>
    }

    <p-dialog [(visible)]="dialog" [header]="editing?.id ? 'Edycja motywu' : 'Nowy motyw'" [modal]="true"
              [style]="{ width: 'min(40rem, 95vw)' }" (onHide)="onDialogHide()">
      <form (ngSubmit)="saveTheme()" class="form" data-test="theme-form">
        <label for="t-name">Nazwa <span aria-hidden="true">*</span><span class="sr-only">(wymagane)</span></label>
        <input pInputText id="t-name" name="name" [(ngModel)]="draftName" required maxlength="60" />
        @if (editing?.type === 'season') {
          <label for="t-start">Początek pory roku (MM-DD, np. 03-21)</label>
          <input pInputText id="t-start" name="start" [(ngModel)]="draftStart" [attr.aria-invalid]="startError() ? 'true' : null" aria-describedby="t-start-err" />
          <small id="t-start-err" role="alert">{{ startError() }}</small>
        }
        <div class="colors">
          @for (k of paletteKeys; track k) {
            <div class="color">
              <span class="name">{{ colorLabel(k) }}</span>
              <input type="color" [name]="'c' + k" [attr.aria-label]="colorLabel(k) + ' – próbnik'"
                     [ngModel]="draftPalette()[k]" (ngModelChange)="setColor(k, $event)" />
              <input pInputText class="hex" [name]="'h' + k" [attr.aria-label]="colorLabel(k) + ' – kod #rrggbb'" maxlength="7"
                     [ngModel]="draftPalette()[k]" (ngModelChange)="setColor(k, $event)" />
            </div>
          }
        </div>
        @for (w of warnings(); track w) { <p-message severity="warn" role="alert">{{ w }}</p-message> }
        <div class="row">
          <p-button type="button" label="Podgląd na stronie" severity="secondary" (onClick)="preview()" />
          <p-button type="submit" label="Zapisz" [disabled]="saving() || !draftName.trim() || !!startError()" [loading]="saving()" />
        </div>
      </form>
    </p-dialog>
  `,
  styles: `
    .error { margin: 1rem 0; }
    .box { border: 1px solid #e5e7eb; border-radius: .5rem; padding: 1rem; margin-bottom: 1.5rem; }
    .row { display: flex; gap: .5rem; align-items: center; margin: .5rem 0; flex-wrap: wrap; }
    .head { display: flex; justify-content: space-between; align-items: center; }
    .themes { list-style: none; padding: 0; } .themes li { display: flex; gap: 1rem; align-items: center; padding: .5rem 0; border-bottom: 1px solid #e5e7eb; }
    .swatches { display: flex; } .swatches span { width: 1.25rem; height: 1.25rem; }
    .form { display: flex; flex-direction: column; gap: .75rem; }
    .colors { display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: .5rem; }
    .color { display: grid; grid-template-columns: 1fr auto; gap: .25rem .5rem; align-items: center; }
    .color .name { grid-column: 1 / -1; font-weight: 700; }
    .color .hex { width: 100%; min-width: 0; }
    input[type='color'] { width: 2.75rem; height: 2.5rem; padding: 0; }
  `,
})
export class ThemesAdminPage {
  private readonly api = inject(AdminApi);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly themeService = inject(ThemeService);
  protected readonly shades = SHADES;
  protected readonly paletteKeys: PaletteKey[] = [...SHADES, 'accent', 'text'];
  protected readonly themes = signal<Theme[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly settingsSaving = signal(false);
  protected settings: Settings = { themeMode: 'auto', manualThemeId: null };
  protected dialog = false;
  protected editing: Theme | null = null;
  protected draftName = '';
  protected draftStart = '';
  protected readonly draftPalette = signal<Palette>(DEFAULT_THEMES[0].palette);
  protected readonly warnings = computed(() => paletteWarnings(this.draftPalette()));
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private opener: HTMLElement | null = null;
  private previewing = false;

  constructor() {
    this.load();
    // Podgląd nie może „wyciec" poza tę stronę – przy wyjściu wracamy do aktywnego motywu.
    inject(DestroyRef).onDestroy(() => this.restorePreview());
  }

  protected load(): void {
    this.error.set(null);
    forkJoin({ themes: this.api.themes(), settings: this.api.settings() }).subscribe({
      next: ({ themes, settings }) => {
        this.themes.set(themes);
        this.settings = settings;
      },
      error: (e) => this.error.set(apiErrorMessage(e)),
    });
  }

  protected formatStart(md: string | null): string {
    if (!md) return '';
    const [m, d] = md.split('-');
    return `${d}.${m}`;
  }

  protected colorLabel(k: string): string {
    return k === 'accent' ? 'Akcent' : k === 'text' ? 'Tekst' : `Odcień ${k}`;
  }

  protected startError(): string | null {
    if (this.editing?.type !== 'season') return null;
    const m = /^(\d{2})-(\d{2})$/.exec(this.draftStart);
    if (m) {
      const month = Number(m[1]);
      const day = Number(m[2]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= new Date(2000, month, 0).getDate()) return null;
    }
    return 'Podaj poprawną datę w formacie MM-DD, np. 03-21.';
  }

  protected setColor(k: PaletteKey, value: string): void {
    if (!HEX.test(value)) return;
    this.draftPalette.update((p) => ({ ...p, [k]: value.toLowerCase() }));
  }

  protected saveSettings(): void {
    if (this.settingsSaving()) return;
    this.settingsSaving.set(true);
    const body: Settings = { themeMode: this.settings.themeMode, manualThemeId: this.settings.themeMode === 'manual' ? this.settings.manualThemeId : null };
    this.api.saveSettings(body).subscribe({
      next: (s) => {
        this.settingsSaving.set(false);
        this.settings = s;
        this.previewing = false;
        this.messages.add({ severity: 'success', summary: 'Zapisano ustawienia motywu' });
        void this.themeService.load();
      },
      error: (e) => {
        this.settingsSaving.set(false);
        this.messages.add({ severity: 'error', summary: apiErrorMessage(e) });
      },
    });
  }

  protected openNew(): void {
    this.rememberOpener();
    this.editing = null;
    this.draftName = '';
    this.draftStart = '';
    this.draftPalette.set({ ...DEFAULT_THEMES[3].palette });
    this.dialog = true;
  }

  protected openEdit(t: Theme): void {
    this.rememberOpener();
    this.editing = t;
    this.draftName = t.name;
    this.draftStart = t.seasonStart ?? '';
    this.draftPalette.set({ ...t.palette });
    this.dialog = true;
  }

  protected preview(): void {
    this.previewing = true;
    this.themeService.apply({ id: null, key: 'preview', name: this.draftName, type: 'special', seasonStart: null, palette: this.draftPalette() });
    this.messages.add({ severity: 'info', summary: 'Podgląd włączony – zamknij okno lub opuść stronę, aby wrócić do aktywnego motywu' });
  }

  protected onDialogHide(): void {
    this.restorePreview();
    this.restoreFocus();
  }

  protected saveTheme(): void {
    const name = this.draftName.trim();
    if (this.saving() || !name || this.startError()) return;
    this.saving.set(true);
    const input: ThemeInput = { name, palette: this.draftPalette(), ...(this.editing?.type === 'season' ? { seasonStart: this.draftStart } : {}) };
    const req = this.editing?.id ? this.api.updateTheme(this.editing.id, input) : this.api.createTheme(input);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialog = false;
        this.messages.add({ severity: 'success', summary: 'Zapisano motyw' });
        this.restorePreview();
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.messages.add({ severity: 'error', summary: apiErrorMessage(e) });
      },
    });
  }

  protected remove(t: Theme): void {
    this.rememberOpener();
    this.confirm.confirm({
      header: 'Usunąć motyw?',
      message: `Motyw „${t.name}” zostanie usunięty. Jeśli był aktywny, strona wróci do motywu pory roku.`,
      acceptLabel: 'Usuń',
      rejectLabel: 'Anuluj',
      acceptButtonProps: { severity: 'danger' },
      accept: () => {
        this.opener = null;
        this.api.deleteTheme(t.id!).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Motyw usunięty' });
            this.heading()?.nativeElement.focus();
            this.load();
            void this.themeService.load();
          },
          error: (e) => this.messages.add({ severity: 'error', summary: apiErrorMessage(e) }),
        });
      },
      reject: () => this.restoreFocus(),
    });
  }

  private restorePreview(): void {
    if (!this.previewing) return;
    this.previewing = false;
    void this.themeService.load();
  }

  private restoreFocus(): void {
    const el = this.opener;
    this.opener = null;
    if (el?.isConnected) el.focus();
  }

  private rememberOpener(): void {
    const a = document.activeElement;
    this.opener = a instanceof HTMLElement && a !== document.body ? a : null;
  }
}
