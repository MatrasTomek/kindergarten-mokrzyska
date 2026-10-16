import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { FetchBackend, HttpBackend } from '@angular/common/http';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // Przeglądarka używa XHR (postęp uploadu); na serwerze XHR nie istnieje — fetch. Wywołania /api i tak pomija ssrApiInterceptor.
    FetchBackend,
    { provide: HttpBackend, useExisting: FetchBackend },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
