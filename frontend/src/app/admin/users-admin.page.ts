import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { AdminApi } from '../core/api/admin-api';
import { apiErrorMessage } from '../core/api-error';
import { AuthService } from '../core/auth/auth.service';
import { Role, UserAccount } from '../core/models';

const ROLES = [
  { value: 'admin' as Role, label: 'Administrator — wszystko' },
  { value: 'user' as Role, label: 'Użytkownik — Wpisy „Z życia”' },
];
const MIN_PASSWORD = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-users-admin-page',
  imports: [FormsModule, Button, Checkbox, Dialog, InputText, Select],
  template: `
    <div class="head"><h1 tabindex="-1" #heading>Użytkownicy</h1><p-button label="+ Nowy użytkownik" (onClick)="openNew()" /></div>
    @if (error(); as msg) {
      <div role="alert" class="error">
        <p>{{ msg }}</p>
        <p-button data-test="retry" label="Spróbuj ponownie" (onClick)="load()" />
      </div>
    } @else if (users(); as list) {
      <table class="list">
        <thead><tr><th>Imię i nazwisko</th><th>E-mail</th><th>Rola</th><th>Aktywny</th><th><span class="sr-only">Akcje</span></th></tr></thead>
        <tbody>
          @for (u of list; track u.id) {
            <tr>
              <td>{{ u.name }}</td><td>{{ u.email }}</td><td>{{ roleLabel(u.role) }}</td><td>{{ u.active ? 'tak' : 'nie' }}</td>
              <td>
                <p-button icon="pi pi-pencil" [text]="true" [ariaLabel]="'Edytuj ' + u.name" (onClick)="openEdit(u)" />
                <p-button data-test="delete" icon="pi pi-trash" [text]="true" severity="danger" [ariaLabel]="'Usuń ' + u.name"
                          [attr.title]="isSelf(u.id) ? 'Nie możesz usunąć własnego konta' : null" [disabled]="isSelf(u.id)" (onClick)="remove(u)" />
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5">Brak użytkowników.</td></tr>
          }
        </tbody>
      </table>
    } @else {
      <p aria-live="polite">Ładowanie…</p>
    }

    <p-dialog [(visible)]="dialog" [header]="editId ? 'Edycja użytkownika' : 'Nowy użytkownik'" [modal]="true"
              [style]="{ width: '30rem', maxWidth: '95vw' }" (onHide)="onHide()">
      <form data-test="user-form" (ngSubmit)="save()" class="form">
        @if (!editId) {
          <label for="u-email">E-mail <span aria-hidden="true">*</span><span class="sr-only">(wymagane)</span></label>
          <input pInputText id="u-email" name="email" type="email" autocomplete="off" maxlength="254" [(ngModel)]="email" required
                 [attr.aria-invalid]="emailError() ? 'true' : null" [attr.aria-describedby]="emailError() ? 'u-email-error' : null" (blur)="touched.email = true" />
          @if (emailError(); as m) { <p class="field-error" id="u-email-error" role="alert">{{ m }}</p> }
        }
        <label for="u-name">Imię i nazwisko <span aria-hidden="true">*</span><span class="sr-only">(wymagane)</span></label>
        <input pInputText id="u-name" name="name" [(ngModel)]="name" required maxlength="100"
               [attr.aria-invalid]="nameError() ? 'true' : null" [attr.aria-describedby]="nameError() ? 'u-name-error' : null" (blur)="touched.name = true" />
        @if (nameError(); as m) { <p class="field-error" id="u-name-error" role="alert">{{ m }}</p> }
        <label for="u-role">Rola</label>
        <p-select inputId="u-role" name="role" [options]="roles" optionLabel="label" optionValue="value" [(ngModel)]="role" [disabled]="editSelf()" appendTo="body" />
        @if (editId) {
          <div class="row">
            <p-checkbox inputId="u-active" name="active" [binary]="true" [(ngModel)]="active" [disabled]="editSelf()" />
            <label for="u-active">Konto aktywne</label>
          </div>
        }
        @if (editSelf()) {
          <p class="hint">Nie możesz zmienić własnej roli ani dezaktywować własnego konta.</p>
        }
        <label for="u-pass">{{ editId ? 'Nowe hasło (zostaw puste, aby nie zmieniać)' : 'Hasło' }}@if (!editId) { <span aria-hidden="true">*</span><span class="sr-only">(wymagane)</span> }</label>
        <div class="row">
          <input pInputText id="u-pass" name="password" [type]="showPass() ? 'text' : 'password'" autocomplete="new-password" [(ngModel)]="password"
                 [attr.aria-describedby]="passError() ? 'u-pass-hint u-pass-error' : 'u-pass-hint'" [attr.aria-invalid]="passError() ? 'true' : null"
                 [attr.minlength]="editId ? null : 10" (blur)="touched.password = true" />
          <button type="button" data-test="toggle-pass" class="toggle" [attr.aria-pressed]="showPass()" (click)="showPass.set(!showPass())">{{ showPass() ? 'Ukryj hasło' : 'Pokaż hasło' }}</button>
        </div>
        @if (passError(); as m) { <p class="field-error" id="u-pass-error" role="alert">{{ m }}</p> }
        <p class="hint" id="u-pass-hint">
          Hasło: min. 10 znaków.
          @if (editSelf()) { Zmiana Twojego hasła wyloguje Cię na innych urządzeniach i po wygaśnięciu sesji. }
          @else if (editId) { Zmiana hasła wyloguje tego użytkownika na innych urządzeniach. }
        </p>
        <div class="actions">
          <p-button label="Anuluj" severity="secondary" [text]="true" [disabled]="saving()" (onClick)="dialog = false" />
          <p-button type="submit" label="Zapisz" [disabled]="saving() || !valid()" [loading]="saving()" />
        </div>
      </form>
    </p-dialog>
  `,
  styles: `
    .head { display: flex; justify-content: space-between; align-items: center; }
    .error { margin: 1rem 0; }
    .list { width: 100%; border-collapse: collapse; } .list th, .list td { text-align: left; padding: .5rem; border-bottom: 1px solid #e5e7eb; }
    .form { display: flex; flex-direction: column; gap: .5rem; }
    .row { display: flex; gap: .5rem; align-items: center; }
    .field-error { margin: 0; font-size: .875rem; color: #b00020; }
    .toggle { white-space: nowrap; }
    .hint { margin: 0; font-size: .875rem; }
    .actions { display: flex; justify-content: flex-end; gap: .5rem; }
  `,
})
export class UsersAdminPage {
  private readonly api = inject(AdminApi);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  protected readonly auth = inject(AuthService);
  protected readonly roles = ROLES;
  protected readonly users = signal<UserAccount[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected dialog = false;
  protected editId: string | null = null;
  protected email = '';
  protected name = '';
  protected role: Role = 'user';
  protected active = true;
  protected password = '';
  protected touched = { email: false, name: false, password: false };
  protected readonly showPass = signal(false);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private opener: HTMLElement | null = null;

  constructor() {
    this.load();
  }

  protected isSelf(id: string): boolean {
    return id === this.auth.user()?.id;
  }

  protected editSelf(): boolean {
    return !!this.editId && this.isSelf(this.editId);
  }

  protected roleLabel(r: Role): string {
    return ROLES.find((x) => x.value === r)?.label ?? r;
  }

  protected nameError(): string | null {
    return this.touched.name && !this.name.trim() ? 'Podaj imię i nazwisko.' : null;
  }

  protected emailError(): string | null {
    return this.touched.email && !EMAIL_RE.test(this.email.trim()) ? 'Podaj poprawny adres e-mail.' : null;
  }

  protected passError(): string | null {
    if (!this.touched.password) return null;
    if (this.editId && !this.password) return null;
    return this.password.length < MIN_PASSWORD ? 'Hasło musi mieć co najmniej 10 znaków.' : null;
  }

  protected valid(): boolean {
    if (!this.name.trim()) return false;
    if (this.editId) return !this.password || this.password.length >= MIN_PASSWORD;
    return EMAIL_RE.test(this.email.trim()) && this.password.length >= MIN_PASSWORD;
  }

  protected onHide(): void {
    this.password = '';
    this.showPass.set(false);
    this.restoreFocus();
  }

  private resetForm(): void {
    this.touched = { email: false, name: false, password: false };
    this.showPass.set(false);
  }

  protected openNew(): void {
    this.rememberOpener();
    this.resetForm();
    Object.assign(this, { editId: null, email: '', name: '', role: 'user', active: true, password: '', dialog: true });
  }

  protected openEdit(u: UserAccount): void {
    this.rememberOpener();
    this.resetForm();
    Object.assign(this, { editId: u.id, email: u.email, name: u.name, role: u.role, active: u.active, password: '', dialog: true });
  }

  protected save(): void {
    if (this.saving()) return;
    if (!this.valid()) {
      this.touched = { email: true, name: true, password: true };
      return;
    }
    this.saving.set(true);
    const name = this.name.trim();
    const req = this.editId
      ? this.api.updateUser(this.editId, { name, role: this.role, active: this.active, ...(this.password ? { password: this.password } : {}) })
      : this.api.createUser({ email: this.email.trim(), name, role: this.role, password: this.password });
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialog = false;
        this.messages.add({ severity: 'success', summary: 'Zapisano użytkownika' });
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.messages.add({ severity: 'error', summary: apiErrorMessage(e) });
      },
    });
  }

  protected remove(u: UserAccount): void {
    this.rememberOpener();
    this.confirm.confirm({
      header: 'Usunąć użytkownika?',
      message: `Konto ${u.email} zostanie usunięte. Wpisy tej osoby pozostaną.`,
      acceptLabel: 'Usuń',
      rejectLabel: 'Anuluj',
      acceptButtonProps: { severity: 'danger' },
      accept: () => {
        const opener = this.opener;
        this.opener = null;
        this.api.deleteUser(u.id).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Użytkownik usunięty' });
            this.heading()?.nativeElement.focus();
            this.load();
          },
          error: (e) => {
            this.messages.add({ severity: 'error', summary: apiErrorMessage(e) });
            if (opener?.isConnected) opener.focus();
          },
        });
      },
      reject: () => this.restoreFocus(),
    });
  }

  protected load(): void {
    this.error.set(null);
    this.api.users().subscribe({
      next: (u) => this.users.set(u),
      error: (e) => this.error.set(apiErrorMessage(e)),
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
