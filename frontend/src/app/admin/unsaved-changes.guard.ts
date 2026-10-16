import { CanDeactivateFn } from '@angular/router';

export interface LeaveConfirmable { confirmLeave(): Promise<boolean> }

/** Pyta o zgodę na opuszczenie strony, gdy są niezapisane zmiany (osobny plik, by nie ładować edytora z trasami). */
export const unsavedChangesGuard: CanDeactivateFn<LeaveConfirmable> = (page) => page.confirmLeave();
