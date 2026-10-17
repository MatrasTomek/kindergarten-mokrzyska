import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Password } from 'primeng/password';
import { apiErrorMessage } from '../core/api-error';
import { AuthService } from '../core/auth/auth.service';
import { SITE_NAME } from '../core/config';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, Button, InputText, Password, Message],
  template: `
    <main class="login" id="main" tabindex="-1">
      <h1>Panel administracyjny</h1>
      <p>{{ siteName }}</p>
      <form (ngSubmit)="submit()" #f="ngForm">
        <label for="email">E-mail</label>
        <input pInputText id="email" name="email" type="email" autocomplete="username" required [(ngModel)]="email" />
        <label for="password">Hasło</label>
        <p-password inputId="password" name="password" [feedback]="false" [toggleMask]="true" autocomplete="current-password" required [(ngModel)]="password" />
        @if (error()) { <p-message severity="error" role="alert">{{ error() }}</p-message> }
        <p-button type="submit" label="Zaloguj" [loading]="busy()" [disabled]="f.invalid" />
      </form>
    </main>
  `,
  styles: `
    .login { max-width: 24rem; margin: 4rem auto; padding: 0 1rem; outline: none; }
    form { display: flex; flex-direction: column; gap: .75rem; }
    :host ::ng-deep .p-password, :host ::ng-deep .p-password input { width: 100%; }
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly siteName = SITE_NAME;
  protected email = '';
  protected password = '';
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async submit(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.login(this.email, this.password);
      await this.router.navigate(['/admin/wpisy']);
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
