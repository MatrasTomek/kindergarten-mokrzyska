import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (await auth.ensureSession()) ? true : router.createUrlTree(['/admin/logowanie']);
};

export const adminGuard: CanActivateFn = () =>
  inject(AuthService).isAdmin() ? true : inject(Router).createUrlTree(['/admin/wpisy']);
