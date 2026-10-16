/**
 * Ustawia fokus na `el` teraz i — jeśli okno potwierdzenia PrimeNG (`.p-confirmdialog`) jest jeszcze w DOM — ponownie po
 * jego usunięciu, gdy fokus spadł wtedy na <body>. Anulowanie w trakcie animacji otwierania: PrimeNG po animacji przenosi
 * fokus do okna, a po jego usunięciu fokus ląduje na <body> (WCAG 2.4.3).
 */
export function focusAfterConfirm(el: HTMLElement | null | undefined): void {
  if (!el?.isConnected) return;
  const doc = el.ownerDocument;
  el.focus();
  if (!doc.querySelector('.p-confirmdialog')) return;
  const stop = () => {
    observer.disconnect();
    clearTimeout(timer);
  };
  const observer = new MutationObserver(() => {
    if (doc.querySelector('.p-confirmdialog')) return;
    stop();
    const active = doc.activeElement;
    if ((!active || active === doc.body) && el.isConnected) el.focus();
  });
  observer.observe(doc.body, { childList: true, subtree: true });
  const timer = setTimeout(stop, 5000); // okno nie zniknęło (np. kolejne potwierdzenie) — nie obserwujemy w nieskończoność
}
