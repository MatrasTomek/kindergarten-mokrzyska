import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API } from '../config';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(`${API}/admin`)) return next(req);
  const auth = inject(AuthService);
  const router = inject(Router);
  const withToken = (r: HttpRequest<unknown>, token: string | null) =>
    token ? r.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : r;

  return next(withToken(req, auth.accessToken())).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) return throwError(() => err);
      return auth.refresh().pipe(
        catchError((refreshErr: unknown) => {
          auth.clear();
          void router.navigate(['/admin/logowanie']);
          return throwError(() => refreshErr);
        }),
        // ponowienie idzie przez `next`, więc drugie 401 nie wywoła kolejnego refresh
        switchMap((token) => next(withToken(req, token))),
      );
    }),
  );
};
