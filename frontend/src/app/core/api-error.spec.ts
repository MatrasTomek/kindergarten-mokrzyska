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
  it('maps 413 with a non-JSON body to a Polish message, but prefers the server message', () => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: 413, error: '<html>Too large</html>' }))).toBe('Plik jest za duży.');
    expect(apiErrorMessage(new HttpErrorResponse({ status: 413, error: { error: { message: 'PDF max 10 MB' } } }))).toBe('PDF max 10 MB');
  });
});
