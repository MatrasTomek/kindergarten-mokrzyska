import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.';
    const message = (err.error as { error?: { message?: unknown } } | null)?.error?.message;
    if (typeof message === 'string') return message;
    if (err.status === 413) return 'Plik jest za duży.';
  }
  return 'Wystąpił błąd. Spróbuj ponownie.';
}
