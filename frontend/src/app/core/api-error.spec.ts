import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage } from './api-error';

describe('apiErrorMessage', () => {
  it('uses server message', () => {
    const err = new HttpErrorResponse({ status: 400, error: { error: { code: 'VALIDATION', message: 'Pole title jest wymagane.' } } });
    expect(apiErrorMessage(err)).toBe('Pole title jest wymagane.');
  });
  it('handles offline and unknown errors', () => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: 0 }))).toBe('Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.');
    expect(apiErrorMessage(new Error('x'))).toBe('Wystąpił błąd. Spróbuj ponownie.');
  });
});
