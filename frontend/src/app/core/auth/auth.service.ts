import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, firstValueFrom, map, Observable, shareReplay, tap } from 'rxjs';
import { API } from '../config';
import { AuthUser, LoginResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private token: string | null = null;
  private refreshInFlight: Observable<string> | null = null;
  readonly user = signal<AuthUser | null>(null);
  readonly isAdmin = computed(() => this.user()?.role === 'admin');

  accessToken(): string | null {
    return this.token;
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const res = await firstValueFrom(this.http.post<LoginResponse>(`${API}/auth/login`, { email, password }));
    this.setSession(res);
    return res.user;
  }

  /** Jedno żądanie /auth/refresh współdzielone przez wszystkie równoległe wywołania. */
  refresh(): Observable<string> {
    this.refreshInFlight ??= this.http.post<LoginResponse>(`${API}/auth/refresh`, {}).pipe(
      tap((res) => this.setSession(res)),
      map((res) => res.accessToken),
      finalize(() => (this.refreshInFlight = null)),
      shareReplay(1),
    );
    return this.refreshInFlight;
  }

  async ensureSession(): Promise<boolean> {
    if (this.token) return true;
    try {
      await firstValueFrom(this.refresh());
      return true;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${API}/auth/logout`, {}));
    } finally {
      this.clear();
    }
  }

  clear(): void {
    this.token = null;
    this.user.set(null);
  }

  private setSession(res: LoginResponse): void {
    this.token = res.accessToken;
    this.user.set(res.user);
  }
}
