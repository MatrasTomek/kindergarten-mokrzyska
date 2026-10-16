/// <reference lib="webworker" />
import { resizeImage } from './image-resize';

addEventListener('message', async ({ data }: MessageEvent<{ id: number; file: Blob }>) => {
  try {
    const { image, thumb } = await resizeImage(data.file);
    postMessage({ id: data.id, ok: true, image, thumb });
  } catch (e) {
    postMessage({ id: data.id, ok: false, error: e instanceof Error ? e.message : 'Błąd przetwarzania zdjęcia' });
  }
});
