import { HttpEventType } from '@angular/common/http';
import { inject } from '@angular/core';
import { apiErrorMessage } from '../../core/api-error';
import { lastValueFrom } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { AdminApi } from '../../core/api/admin-api';
import { UploadedImage } from '../../core/models';
import { ImageResizer } from './image-resizer.service';

/** Procesor dla UploadQueue: skaluje zdjęcie, wysyła je i raportuje postęp wysyłania. Wywołać w kontekście wstrzykiwania. */
export function createUploadProcessor(context: 'posts' | 'content') {
  const api = inject(AdminApi);
  const resizer = inject(ImageResizer);
  const process = async (file: File, onProgress: (pct: number) => void): Promise<UploadedImage> => {
    const { image, thumb } = await resizer.resize(file);
    try {
      return await upload(image, thumb, onProgress);
    } catch (e) {
      throw new Error(apiErrorMessage(e));
    }
  };
  const upload = (image: Blob, thumb: Blob, onProgress: (pct: number) => void) =>
    lastValueFrom(
      api.uploadImage(image, thumb, context).pipe(
        tap((e) => {
          if (e.type === HttpEventType.UploadProgress && e.total) onProgress(Math.round((100 * e.loaded) / e.total));
        }),
        filter((e) => e.type === HttpEventType.Response),
        map((e) => (e as { body: UploadedImage }).body),
      ),
    );
  return process;
}
