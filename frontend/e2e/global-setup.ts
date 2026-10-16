import { execSync } from 'node:child_process';

export const E2E_CONTAINER = 'przedszkole-e2e-backend';

/** Upewnia się, że :8081 obsługuje kontener E2E (docker Mongo, baza przedszkole_e2e), a nie inny backend. */
function assertE2eBackend(): void {
  let inspect = '';
  try {
    inspect = execSync(`docker inspect -f "{{.State.Running}} {{json .Config.Env}} {{json .HostConfig.PortBindings}}" ${E2E_CONTAINER}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    // brak kontenera
  }
  const ok = inspect.startsWith('true ') && inspect.includes('"MONGO_DB=przedszkole_e2e"') && inspect.includes('"MONGO_URI=mongodb://mongo:27017"') && inspect.includes('"HostPort":"8081"');
  if (!ok) {
    throw new Error(`E2E: http://localhost:8081 nie jest obsługiwany przez kontener ${E2E_CONTAINER} (docker Mongo, baza przedszkole_e2e). Przerywam, aby nie zapisać danych testowych do innej bazy.`);
  }
}

/** Czysta baza przed każdym uruchomieniem: seed --fresh na osobnej bazie przedszkole_e2e (nigdy produkcja). */
export default function globalSetup(): void {
  assertE2eBackend();
  execSync('npm run e2e:seed', { stdio: 'inherit' });
}
