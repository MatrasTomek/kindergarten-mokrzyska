import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Editor } from 'primeng/editor';
import { providePrimeNG } from 'primeng/config';
import { Component, signal } from '@angular/core';
import { normalizeEditorHtml, RichTextComponent } from './rich-text.component';

describe('normalizeEditorHtml', () => {
  it('replaces nbsp and treats empty editor as empty string', () => {
    expect(normalizeEditorHtml('<p>Ala&nbsp;ma&nbsp;kota</p>')).toBe('<p>Ala ma kota</p>');
    expect(normalizeEditorHtml('<p><br></p>')).toBe('');
  });
});

describe('RichTextComponent', () => {
  const settle = async (f: { detectChanges(): void; whenStable(): Promise<unknown> }) => {
    for (let i = 0; i < 5; i++) {
      f.detectChanges();
      await f.whenStable();
      await new Promise((r) => setTimeout(r, 20));
    }
    f.detectChanges();
  };

  async function setup(value = '') {
    TestBed.configureTestingModule({ imports: [RichTextComponent], providers: [providePrimeNG()] });
    const f = TestBed.createComponent(RichTextComponent);
    f.componentRef.setInput('value', value);
    await settle(f);
    return f;
  }
  const editorHtml = (f: { nativeElement: HTMLElement }) => f.nativeElement.querySelector('.ql-editor')!.innerHTML;
  const typeInto = (f: ComponentFixture<RichTextComponent>, text: string) => {
    const quill = f.debugElement.query(By.directive(Editor)).componentInstance.getQuill();
    quill.insertText(quill.getLength() - 1, text, 'user');
  };

  it('shows the initial value', async () => {
    const f = await setup('<p>Start</p>');
    expect(editorHtml(f)).toContain('Start');
  });

  it('shows a value set by the parent after init (async load) and does not emit it back', async () => {
    const f = await setup('');
    f.componentRef.setInput('value', '<p>Załadowany wpis</p>');
    await settle(f);
    expect(editorHtml(f)).toContain('Załadowany wpis');
    expect(f.componentInstance.value()).toBe('<p>Załadowany wpis</p>');
  });

  it('emits typed content and keeps stored text', async () => {
    const f = await setup('<p>Stary</p>');
    typeInto(f, ' nowy');
    await settle(f);
    expect(f.componentInstance.value()).toContain('Stary nowy');
    expect(editorHtml(f)).toContain('Stary nowy');
  });

  it('replaces content on an external change after typing', async () => {
    const f = await setup('<p>Stary</p>');
    typeInto(f, ' x');
    await settle(f);
    f.componentRef.setInput('value', '<p>Zupełnie inny</p>');
    await settle(f);
    expect(editorHtml(f)).toContain('Zupełnie inny');
    expect(editorHtml(f)).not.toContain('Stary');
  });

  it('clears the editor when the parent resets the value to empty', async () => {
    const f = await setup('<p>Coś</p>');
    f.componentRef.setInput('value', '');
    await settle(f);
    expect(editorHtml(f)).not.toContain('Coś');
  });

  it('reflects a parent reset to the same value the editor last received (two-way host)', async () => {
    @Component({ imports: [RichTextComponent], template: `<app-rich-text [(value)]="body" />` })
    class Host { body = signal('<p>Stary</p>'); }
    TestBed.configureTestingModule({ imports: [Host], providers: [providePrimeNG()] });
    const f = TestBed.createComponent(Host);
    await settle(f);
    const rt = f.debugElement.query(By.directive(RichTextComponent)).componentInstance as RichTextComponent;
    const quill = () => f.debugElement.query(By.directive(Editor)).componentInstance.getQuill();
    quill().insertText(quill().getLength() - 1, ' dopisek', 'user');
    await settle(f);
    expect(f.componentInstance.body()).toContain('dopisek');
    f.componentInstance.body.set('<p>Stary</p>');
    await settle(f);
    expect(editorHtml(f)).toContain('Stary');
    expect(editorHtml(f)).not.toContain('dopisek');
    expect(rt.value()).toBe('<p>Stary</p>');
    f.componentInstance.body.set('');
    await settle(f);
    quill().insertText(0, 'Wpisany', 'user');
    await settle(f);
    f.componentInstance.body.set('');
    await settle(f);
    expect(editorHtml(f)).not.toContain('Wpisany');
  });

  it('labels the editable area as a multiline textbox', async () => {
    const f = await setup('');
    const root = f.nativeElement.querySelector('.ql-editor') as HTMLElement;
    expect(root.getAttribute('role')).toBe('textbox');
    expect(root.getAttribute('aria-multiline')).toBe('true');
    const id = root.getAttribute('aria-labelledby')!;
    expect(f.nativeElement.querySelector('#' + id).textContent).toContain('Treść');
  });

  it('drops disallowed formats (h1 clamped, colors, images, code) from emitted html', async () => {
    const f = await setup('');
    const quill = f.debugElement.query(By.directive(Editor)).componentInstance.getQuill();
    quill.clipboard.dangerouslyPasteHTML(
      '<h1>Duży</h1><p><span style="color:red">Czerwony</span> <strong>gruby</strong></p><p><img src="data:image/png;base64,AAAA"></p><pre>kod</pre>',
      'user',
    );
    await settle(f);
    const out = f.componentInstance.value();
    expect(out).toContain('gruby');
    expect(out).toContain('Duży');
    expect(out).not.toContain('<h1');
    expect(out).not.toContain('color');
    expect(out).not.toContain('<img');
    expect(out).not.toContain('data:');
    expect(out).not.toContain('<pre');
  });

  it('history undo does not revert or empty externally written content', async () => {
    const f = await setup('<p>Stary</p>');
    const quill = f.debugElement.query(By.directive(Editor)).componentInstance.getQuill();
    quill.history.undo();
    await settle(f);
    expect(editorHtml(f)).toContain('Stary');
    expect(f.componentInstance.value()).toBe('<p>Stary</p>');

    typeInto(f, ' x');
    await settle(f);
    f.componentRef.setInput('value', '');
    await settle(f);
    quill.history.undo();
    await settle(f);
    expect(editorHtml(f)).not.toContain('Stary');
    expect(f.componentInstance.value()).toBe('');
  });
});
