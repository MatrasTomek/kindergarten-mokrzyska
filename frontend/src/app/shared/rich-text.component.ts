import { Component, effect, input, model } from '@angular/core';
import { Editor, EditorInitEvent } from 'primeng/editor';

export function normalizeEditorHtml(html: string): string {
  const out = html.replace(/&nbsp;/g, ' ').trim();
  return out === '<p><br></p>' || out === '<p></p>' ? '' : out;
}

/** Nagłówki spoza oferowanych w pasku (h2, h3) sprowadzamy do dostępnych poziomów. */
export function clampHeadings(html: string): string {
  return html.replace(/<(\/?)h1(?=[\s>])/g, '<$1h2').replace(/<(\/?)h[456](?=[\s>])/g, '<$1h3');
}

interface QuillLike {
  getSemanticHTML(): string;
  root: HTMLElement;
  setContents(delta: unknown, source: string): unknown;
  setText(text: string, source: string): unknown;
  clipboard: { convert(v: { html: string }): unknown };
  history: { clear(): void };
}

@Component({
  selector: 'app-rich-text',
  imports: [Editor],
  template: `
    <span class="label" [id]="labelId">{{ label() }}</span>
    <p-editor (onInit)="init($event)" (onTextChange)="emit()" [formats]="formats" [style]="{ height: '18rem' }">
      <ng-template #header>
        <span class="ql-formats">
          <select class="ql-header" aria-label="Nagłówek"><option value="2">Nagłówek</option><option value="3">Podtytuł</option><option selected>Tekst</option></select>
        </span>
        <span class="ql-formats">
          <button type="button" class="ql-bold" aria-label="Pogrubienie"></button>
          <button type="button" class="ql-italic" aria-label="Kursywa"></button>
          <button type="button" class="ql-underline" aria-label="Podkreślenie"></button>
          <button type="button" class="ql-strike" aria-label="Przekreślenie"></button>
        </span>
        <span class="ql-formats">
          <button type="button" class="ql-list" value="ordered" aria-label="Lista numerowana"></button>
          <button type="button" class="ql-list" value="bullet" aria-label="Lista punktowana"></button>
          <button type="button" class="ql-blockquote" aria-label="Cytat"></button>
          <button type="button" class="ql-link" aria-label="Link"></button>
        </span>
      </ng-template>
    </p-editor>
  `,
  styles: `.label { display: block; font-weight: 600; margin-bottom: .25rem; }`,
})
export class RichTextComponent {
  private static seq = 0;
  readonly value = model<string>('');
  readonly label = input('Treść');
  protected readonly labelId = `rt-label-${++RichTextComponent.seq}`;
  protected readonly formats = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'blockquote', 'link'];
  private quill: QuillLike | null = null;
  /** Ostatnia wartość, którą edytor sam wyemitował lub która została już do niego zapisana. */
  private synced = '';

  constructor() {
    effect(() => {
      const v = this.value();
      if (v === this.synced) return; // echo własnej emisji lub brak zmiany: nie ruszamy edytora (kursor)
      this.synced = v;
      this.apply(v); // bezpośrednio do Quilla, więc zawsze odzwierciedla zewnętrzną zmianę
    });
  }

  protected init(e: EditorInitEvent): void {
    this.quill = e.editor as QuillLike;
    const root = this.quill.root;
    root.setAttribute('role', 'textbox');
    root.setAttribute('aria-multiline', 'true');
    root.setAttribute('aria-labelledby', this.labelId);
    this.synced = this.value();
    this.apply(this.synced); // wartość ustawiona przed załadowaniem Quilla
  }

  private apply(v: string): void {
    if (!this.quill) return;
    if (v) this.quill.setContents(this.quill.clipboard.convert({ html: v }), 'silent');
    else this.quill.setText('', 'silent');
    this.quill.history.clear(); // Ctrl+Z nie może cofnąć zapisu z zewnątrz (gubiłby/opróżniał treść)
  }

  /** Quill 2 zapisuje listy jako <ol><li data-list="bullet">; getSemanticHTML daje poprawne <ul>/<ol>. */
  protected emit(): void {
    if (!this.quill) return;
    const html = clampHeadings(normalizeEditorHtml(this.quill.getSemanticHTML()));
    this.synced = html;
    this.value.set(html);
  }
}
