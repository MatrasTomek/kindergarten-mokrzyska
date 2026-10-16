import { execSync } from 'node:child_process';
import { E2E_CONTAINER } from './global-setup';

/** Zatrzymuje kontener backendu E2E (ubicie `docker compose run` nie zawsze zatrzymuje kontener); anonimowy wolumen uploadów znika z nim. */
export default function globalTeardown(): void {
  try {
    execSync(`docker rm -f -v ${E2E_CONTAINER}`, { stdio: 'ignore' });
  } catch (e) {
    console.warn(`E2E teardown: nie udało się usunąć kontenera ${E2E_CONTAINER}: ${(e as Error).message}`);
  }
}
