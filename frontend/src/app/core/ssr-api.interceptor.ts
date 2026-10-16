import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { EMPTY } from 'rxjs';
import { API } from './config';

/** Przy prerenderze (build) nie ma backendu — strony renderują stan „Ładowanie…”, dane dociąga przeglądarka. */
export const ssrApiInterceptor: HttpInterceptorFn = (req, next) =>
  isPlatformServer(inject(PLATFORM_ID)) && req.url.startsWith(API) ? EMPTY : next(req);
