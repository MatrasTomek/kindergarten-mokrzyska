import { TestBed } from '@angular/core/testing';
import { Component, input, model, output, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { AuthService } from '../core/auth/auth.service';
import { PostImage } from '../core/models';
import { ImageUploaderComponent } from '../shared/images/image-uploader.component';
import { RichTextComponent } from '../shared/rich-text.component';
import { buildPostInput, PostEditorPage } from './post-editor.page';
import { unsavedChangesGuard } from './unsaved-changes.guard';

@Component({ selector: 'app-rich-text', template: '' })
class RichTextStub { value = model(''); label = input(''); }
@Component({ selector: 'app-image-uploader', template: '' })
class UploaderStub {
  images = model<PostImage[]>([]); context = input(''); max = input(30); defaultAlt = input('');
  busyChange = output<boolean>();
}

const stored = {
  id: 'p1', title: 'Bal', slug: 'bal', excerpt: 'Zaj', body: '<p>Zapisana treść</p>',
  images: [{ file: 'f', thumb: 't', w: 1, h: 1, alt: '' }],
  targets: { news: true, groupIds: ['g1'] }, status: 'draft', publishedAt: null,
  createdBy: '1', updatedBy: '1', createdAt: '2026-10-15T12:00:00+02:00', updatedAt: '2026-10-15T12:00:00+02:00',
};

describe('buildPostInput', () => {
  it('fills missing alt with title and trims', () => {
    const input = buildPostInput(
      { title: ' Bal ', excerpt: '', body: '<p>x</p>', news: true, groupIds: ['g1'], status: 'published' },
      [{ file: 'f', thumb: 't', w: 1, h: 1, alt: '' }, { file: 'f2', thumb: 't2', w: 1, h: 1, alt: 'Tort' }],
    );
    expect(input.title).toBe('Bal');
    expect(input.images.map((i) => i.alt)).toEqual(['Bal', 'Tort']);
    expect(input.targets).toEqual({ news: true, groupIds: ['g1'] });
  });
});

describe('PostEditorPage', () => {
  function setup(isAdmin: boolean, id?: string) {
    TestBed.configureTestingModule({
      imports: [PostEditorPage],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(), providePrimeNG(),
        MessageService, ConfirmationService,
        { provide: AuthService, useValue: { isAdmin: signal(isAdmin) } },
      ],
    }).overrideComponent(PostEditorPage, {
      remove: { imports: [RichTextComponent, ImageUploaderComponent] },
      add: { imports: [RichTextStub, UploaderStub] },
    });
    const f = TestBed.createComponent(PostEditorPage);
    if (id) f.componentRef.setInput('id', id);
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/groups').flush([{ id: 'g1', name: 'Pingwinki', slug: 'pingwinki', order: 1, description: '' }]);
    if (id) http.expectOne(`/api/admin/posts/${id}`).flush(stored);
    f.detectChanges();
    return { f, http };
  }
  type Page = { form: { setValue: (v: unknown) => void; controls: { title: { setValue: (v: string) => void } } }; save: () => void; remove: () => void; confirmLeave: () => Promise<boolean> };

  it('creates a post and navigates to the list', async () => {
    const { f, http } = setup(false);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const page = f.componentInstance as unknown as Page;
    page.form.setValue({ title: 'Jesienny spacer', excerpt: 'Krótko', body: '<p>Treść</p>', news: true, groupIds: ['g1'], status: 'published' });
    page.save();

    const req = http.expectOne('/api/admin/posts');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      title: 'Jesienny spacer', excerpt: 'Krótko', body: '<p>Treść</p>', images: [],
      targets: { news: true, groupIds: ['g1'] }, status: 'published',
    });
    req.flush({ id: 'p1' });
    await Promise.resolve();
    expect(navigate).toHaveBeenCalledWith(['/admin/wpisy']);
  });

  it('shows info that the post always lands in Z życia and hides delete for user', () => {
    const { f } = setup(false);
    expect(f.nativeElement.textContent).toContain('Każdy wpis pojawia się w „Z życia Przedszkola”');
    expect(f.nativeElement.querySelector('[data-test=delete]')).toBeNull();
  });

  it('shows delete only for admin when editing', () => {
    expect(setup(true, 'p1').f.nativeElement.querySelector('[data-test=delete]')).not.toBeNull();
    TestBed.resetTestingModule();
    expect(setup(false, 'p1').f.nativeElement.querySelector('[data-test=delete]')).toBeNull();
  });

  it('PF-1: editor shows the stored body loaded after init, and saving untouched sends it back', () => {
    const { f, http } = setup(true, 'p1');
    const rt = f.debugElement.query(By.directive(RichTextStub)).componentInstance as RichTextStub;
    expect(rt.value()).toBe('<p>Zapisana treść</p>');
    (f.componentInstance as unknown as Page).save();
    const req = http.expectOne('/api/admin/posts/p1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.body).toBe('<p>Zapisana treść</p>');
    expect(req.request.body.images[0].alt).toBe('Bal');
  });

  it('passes the title as defaultAlt and blocks saving while the uploader is busy', () => {
    const { f, http } = setup(false);
    const page = f.componentInstance as unknown as Page;
    page.form.setValue({ title: 'Bal', excerpt: '', body: '', news: false, groupIds: [], status: 'draft' });
    const up = f.debugElement.query(By.directive(UploaderStub)).componentInstance as UploaderStub;
    f.detectChanges();
    expect(up.defaultAlt()).toBe('Bal');
    up.busyChange.emit(true);
    f.detectChanges();
    page.save();
    http.expectNone('/api/admin/posts');
    expect(f.nativeElement.querySelector('button[type=submit]').disabled).toBe(true);
    expect(f.nativeElement.textContent).toContain('Trwa wysyłanie zdjęć');
  });

  it('shows the backend message on a 400 and stays on the page', () => {
    const { f, http } = setup(false);
    const messages = TestBed.inject(MessageService);
    const add = vi.spyOn(messages, 'add');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const page = f.componentInstance as unknown as Page;
    page.form.setValue({ title: 'Bal', excerpt: '', body: '', news: false, groupIds: [], status: 'draft' });
    page.save();
    http.expectOne('/api/admin/posts').flush(
      { error: { code: 'VALIDATION', message: 'Zdjęcie wygasło — dodaj je ponownie.' } },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', summary: 'Zdjęcie wygasło — dodaj je ponownie.' }));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('delete asks for Polish confirmation and only then calls the API', () => {
    const { f, http } = setup(true, 'p1');
    const confirm = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    (f.componentInstance as unknown as Page).remove();
    http.expectNone('/api/admin/posts/p1');
    const opts = confirm.mock.calls[0][0];
    expect(opts.header).toBe('Usunąć wpis?');
    expect(opts.acceptLabel).toBe('Usuń');
    expect(opts.rejectLabel).toBe('Anuluj');
    opts.accept!();
    const req = http.expectOne('/api/admin/posts/p1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(navigate).toHaveBeenCalledWith(['/admin/wpisy']);
  });

  it('every field has a label', () => {
    const el = setup(false).f.nativeElement as HTMLElement;
    for (const id of ['title', 'excerpt', 'news', 'groups', 'st-pub', 'st-draft']) {
      expect(el.querySelector(`label[for="${id}"]`), id).not.toBeNull();
    }
  });

  const valid = { title: 'Bal', excerpt: '', body: '', news: false, groupIds: [], status: 'draft' };

  it('ignores a second save while the first is in flight', () => {
    const { f, http } = setup(false);
    const page = f.componentInstance as unknown as Page;
    page.form.setValue(valid);
    page.save();
    page.save();
    http.expectOne('/api/admin/posts');
  });

  it('whitespace-only title keeps Save disabled and a required hint is linked', () => {
    const { f } = setup(false);
    const page = f.componentInstance as unknown as Page;
    page.form.setValue({ ...valid, title: '   ' });
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect((el.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(true);
    expect(el.textContent).toContain('Pola oznaczone * są wymagane');
    const hintId = el.querySelector('#title')!.getAttribute('aria-describedby')!;
    expect(el.querySelector('#' + hintId)!.textContent).toContain('wymagane');
  });

  describe('unsaved changes', () => {
    function ask(f: { componentInstance: unknown }) {
      return unsavedChangesGuard(f.componentInstance as PostEditorPage, null as never, null as never, null as never);
    }

    it('clean form leaves without a prompt', async () => {
      const { f } = setup(false);
      const confirm = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
      expect(await ask(f)).toBe(true);
      expect(confirm).not.toHaveBeenCalled();
    });

    it('loaded post untouched is clean', async () => {
      const { f } = setup(true, 'p1');
      const confirm = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
      expect(await ask(f)).toBe(true);
      expect(confirm).not.toHaveBeenCalled();
    });

    it('dirty form asks in Polish and respects reject / accept', async () => {
      const { f } = setup(false);
      const page = f.componentInstance as unknown as Page;
      page.form.controls.title.setValue('Zmieniony');
      const confirm = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm').mockImplementation((o) => { o.reject?.(); return TestBed.inject(ConfirmationService); });
      expect(await ask(f)).toBe(false);
      const o = confirm.mock.calls[0][0];
      expect(o.message).toBe('Masz niezapisane zmiany. Opuścić stronę?');
      expect(o.acceptLabel).toBe('Opuść');
      expect(o.rejectLabel).toBe('Zostań');
      confirm.mockImplementation((x) => { x.accept?.(); return TestBed.inject(ConfirmationService); });
      expect(await ask(f)).toBe(true);
    });

    it('after a successful save leaves without a prompt', async () => {
      const { f, http } = setup(false);
      vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      const confirm = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
      const page = f.componentInstance as unknown as Page;
      page.form.setValue(valid);
      page.save();
      http.expectOne('/api/admin/posts').flush({ id: 'p1' });
      expect(await ask(f)).toBe(true);
      expect(confirm).not.toHaveBeenCalled();
    });

    it('after a confirmed delete leaves without a second prompt', async () => {
      const { f, http } = setup(true, 'p1');
      vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      const page = f.componentInstance as unknown as Page;
      page.form.controls.title.setValue('Zmieniony');
      const confirm = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm').mockImplementation((o) => { o.accept?.(); return TestBed.inject(ConfirmationService); });
      page.remove();
      http.expectOne('/api/admin/posts/p1').flush(null);
      confirm.mockClear();
      expect(await ask(f)).toBe(true);
      expect(confirm).not.toHaveBeenCalled();
    });

    it('changing images makes the form dirty', async () => {
      const { f } = setup(false);
      const up = f.debugElement.query(By.directive(UploaderStub)).componentInstance as UploaderStub;
      up.images.set([{ file: 'f', thumb: 't', w: 1, h: 1, alt: 'x' }]);
      f.detectChanges();
      const confirm = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm').mockImplementation((o) => { o.reject?.(); return TestBed.inject(ConfirmationService); });
      expect(await ask(f)).toBe(false);
      expect(confirm).toHaveBeenCalledTimes(1);
    });

    it('beforeunload is cancelled only when dirty', () => {
      const { f } = setup(false);
      const clean = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(clean);
      expect(clean.defaultPrevented).toBe(false);
      (f.componentInstance as unknown as Page).form.controls.title.setValue('x');
      const dirty = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(dirty);
      expect(dirty.defaultPrevented).toBe(true);
    });
  });

  it('load failure shows an alert, no form and no Save', () => {
    TestBed.configureTestingModule({
      imports: [PostEditorPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), providePrimeNG(), MessageService, ConfirmationService,
        { provide: AuthService, useValue: { isAdmin: signal(true) } }],
    }).overrideComponent(PostEditorPage, { remove: { imports: [RichTextComponent, ImageUploaderComponent] }, add: { imports: [RichTextStub, UploaderStub] } });
    const f = TestBed.createComponent(PostEditorPage);
    f.componentRef.setInput('id', 'zly');
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/groups').flush([]);
    http.expectOne('/api/admin/posts/zly').flush({ error: { code: 'NOT_FOUND', message: 'Nie znaleziono wpisu.' } }, { status: 404, statusText: 'Not Found' });
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role=alert]')!.textContent).toContain('Nie znaleziono wpisu.');
    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('button[type=submit]')).toBeNull();
  });

  it('ignores a stale load response after the id changed', () => {
    TestBed.configureTestingModule({
      imports: [PostEditorPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), providePrimeNG(), MessageService, ConfirmationService,
        { provide: AuthService, useValue: { isAdmin: signal(true) } }],
    }).overrideComponent(PostEditorPage, { remove: { imports: [RichTextComponent, ImageUploaderComponent] }, add: { imports: [RichTextStub, UploaderStub] } });
    const f = TestBed.createComponent(PostEditorPage);
    f.componentRef.setInput('id', 'a');
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/groups').flush([]);
    const first = http.expectOne('/api/admin/posts/a');
    f.componentRef.setInput('id', 'b');
    f.detectChanges();
    expect(first.cancelled).toBe(true);
    http.expectOne('/api/admin/posts/b').flush({ ...stored, id: 'b', title: 'B' });
    f.detectChanges();
    expect((f.nativeElement.querySelector('#title') as HTMLInputElement).value).toBe('B');
  });
});
