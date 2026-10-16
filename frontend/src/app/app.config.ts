import { ApplicationConfig, inject, LOCALE_ID, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePl from '@angular/common/locales/pl';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { authInterceptor } from './core/auth/auth.interceptor';
import { ssrApiInterceptor } from './core/ssr-api.interceptor';
import { routes } from './app.routes';
import { AppPreset } from './theme/app-preset';
import { PL_TRANSLATION } from './core/primeng-pl';
import { ThemeService } from './theme/theme.service';

registerLocaleData(localePl);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'pl' },
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withXhr(), withInterceptors([ssrApiInterceptor, authInterceptor])),
    providePrimeNG({ theme: { preset: AppPreset, options: { darkModeSelector: false } }, translation: PL_TRANSLATION }),
    provideAppInitializer(() => inject(ThemeService).load()),
    provideClientHydration(withEventReplay()),
  ],
};
