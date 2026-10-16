import { focusAfterConfirm } from './focus-after-confirm';

describe('focusAfterConfirm', () => {
  let target: HTMLButtonElement;
  let dialog: HTMLDivElement;
  let dialogButton: HTMLButtonElement;
  const flush = () => new Promise((r) => setTimeout(r));

  beforeEach(() => {
    document.body.innerHTML = '';
    target = document.body.appendChild(document.createElement('button'));
    dialog = document.body.appendChild(document.createElement('div'));
    dialog.className = 'p-confirmdialog';
    dialogButton = dialog.appendChild(document.createElement('button'));
  });

  it('focuses the element immediately', () => {
    focusAfterConfirm(target);
    expect(document.activeElement).toBe(target);
  });

  it('re-focuses the element when the dialog took focus back (enter animation) and was then removed (focus fell to body)', async () => {
    focusAfterConfirm(target);
    dialogButton.focus(); // PrimeNG: focus() po zakończeniu animacji otwierania
    dialog.remove(); // koniec animacji zamykania — fokus spada na <body>
    expect(document.activeElement).toBe(document.body);
    await flush();
    expect(document.activeElement).toBe(target);
  });

  it('does not steal focus the user moved elsewhere before the dialog was removed', async () => {
    const other = document.body.appendChild(document.createElement('button'));
    focusAfterConfirm(target);
    other.focus();
    dialog.remove();
    await flush();
    expect(document.activeElement).toBe(other);
  });

  it('ignores missing or detached elements', () => {
    expect(() => focusAfterConfirm(null)).not.toThrow();
    const detached = document.createElement('button');
    focusAfterConfirm(detached);
    expect(document.activeElement).not.toBe(detached);
  });
});
