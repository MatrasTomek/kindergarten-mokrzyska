import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { AdminApi } from '../core/api/admin-api';
import { apiErrorMessage } from '../core/api-error';
import { Group, GroupInput } from '../core/models';
import { focusAfterConfirm } from '../shared/focus-after-confirm';

@Component({
  selector: 'app-groups-admin-page',
  imports: [FormsModule, Button, Dialog, InputNumber, InputText, Textarea],
  template: `
    <div class="head"><h1 tabindex="-1" #heading>Grupy</h1><p-button label="+ Nowa grupa" (onClick)="openNew()" /></div>
    <p>Usunięcie grupy nie usuwa wpisów — znikną tylko ze strony tej grupy.</p>
    @if (error(); as msg) {
      <div role="alert" class="error">
        <p>{{ msg }}</p>
        <p-button data-test="retry" label="Spróbuj ponownie" (onClick)="load()" />
      </div>
    } @else if (groups(); as list) {
      <table class="list">
        <thead><tr><th>Kolejność</th><th>Nazwa</th><th>Adres</th><th><span class="sr-only">Akcje</span></th></tr></thead>
        <tbody>
          @for (g of list; track g.id) {
            <tr>
              <td>{{ g.order }}</td><td>{{ g.name }}</td><td>/grupy/{{ g.slug }}</td>
              <td>
                <p-button icon="pi pi-pencil" [text]="true" [ariaLabel]="'Edytuj ' + g.name" (onClick)="openEdit(g)" />
                <p-button icon="pi pi-trash" severity="danger" [text]="true" [ariaLabel]="'Usuń ' + g.name" (onClick)="remove(g)" />
              </td>
            </tr>
          } @empty {
            <tr><td colspan="4">Brak grup.</td></tr>
          }
        </tbody>
      </table>
    } @else {
      <p aria-live="polite">Ładowanie…</p>
    }

    <p-dialog [header]="editId ? 'Edytuj grupę' : 'Nowa grupa'" [(visible)]="dialog" [modal]="true" [style]="{ width: '32rem', maxWidth: '95vw' }" (onHide)="restoreFocus()">
      <form data-test="group-form" (ngSubmit)="save()">
        <div class="field">
          <label for="group-name">Nazwa <span aria-hidden="true">*</span><span class="sr-only">(wymagane)</span></label>
          <input pInputText id="group-name" name="name" [(ngModel)]="draft.name" required />
        </div>
        <div class="field">
          <label for="group-order">Kolejność</label>
          <p-inputnumber inputId="group-order" name="order" [(ngModel)]="draft.order" [useGrouping]="false" />
        </div>
        <div class="field">
          <label for="group-desc">Opis</label>
          <textarea pTextarea id="group-desc" name="description" rows="4" [(ngModel)]="draft.description"></textarea>
        </div>
        <div class="actions">
          <p-button label="Anuluj" severity="secondary" [text]="true" (onClick)="dialog = false" />
          <p-button type="submit" label="Zapisz" [disabled]="saving() || !draft.name?.trim()" [loading]="saving()" />
        </div>
      </form>
    </p-dialog>
  `,
  styles: `
    .head { display: flex; justify-content: space-between; align-items: center; }
    .error { margin: 1rem 0; }
    .actions { display: flex; justify-content: flex-end; gap: .5rem; }
    .field { display: flex; flex-direction: column; gap: .25rem; margin-bottom: 1rem; }
    .list { width: 100%; border-collapse: collapse; }
    .list th, .list td { text-align: left; padding: .5rem; border-bottom: 1px solid #e5e7eb; }
  `,
})
export class GroupsAdminPage {
  private readonly api = inject(AdminApi);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);
  protected readonly groups = signal<Group[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected dialog = false;
  protected editId: string | null = null;
  protected draft: GroupInput = { name: '', order: 0, description: '' };
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private opener: HTMLElement | null = null;

  constructor() {
    this.load();
  }

  protected openNew(): void {
    this.rememberOpener();
    this.editId = null;
    this.draft = { name: '', order: (this.groups()?.length ?? 0) + 1, description: '' };
    this.dialog = true;
  }

  protected openEdit(g: Group): void {
    this.rememberOpener();
    this.editId = g.id;
    this.draft = { name: g.name, order: g.order, description: g.description };
    this.dialog = true;
  }

  protected save(): void {
    const name = this.draft.name?.trim();
    if (this.saving() || !name) return;
    this.saving.set(true);
    const input: GroupInput = { name, order: this.draft.order ?? 0, description: this.draft.description ?? '' };
    const req = this.editId ? this.api.updateGroup(this.editId, input) : this.api.createGroup(input);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialog = false;
        this.messages.add({ severity: 'success', summary: 'Zapisano grupę' });
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.messages.add({ severity: 'error', summary: apiErrorMessage(e) });
      },
    });
  }

  protected remove(g: Group): void {
    this.rememberOpener();
    this.confirm.confirm({
      header: 'Usunąć grupę?',
      message: `Grupa „${g.name}” zostanie usunięta. Wpisy pozostaną w „Z życia Przedszkola”.`,
      acceptLabel: 'Usuń',
      rejectLabel: 'Anuluj',
      acceptButtonProps: { severity: 'danger' },
      accept: () => {
        this.opener = null;
        this.api.deleteGroup(g.id).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Grupa usunięta' });
            focusAfterConfirm(this.heading()?.nativeElement);
            this.load();
          },
          error: (e) => this.messages.add({ severity: 'error', summary: apiErrorMessage(e) }),
        });
      },
      reject: () => this.restoreFocus(),
    });
  }

  protected load(): void {
    this.error.set(null);
    this.api.groups().subscribe({
      next: (g) => this.groups.set(g),
      error: (e) => this.error.set(apiErrorMessage(e)),
    });
  }

  protected restoreFocus(): void {
    const el = this.opener;
    this.opener = null;
    focusAfterConfirm(el);
  }

  private rememberOpener(): void {
    const a = document.activeElement;
    this.opener = a instanceof HTMLElement && a !== document.body ? a : null;
  }
}
