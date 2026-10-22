// Uruchom: node --test scripts/optimize-images.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HEADERS, HEADER_WIDTHS, SEASONS, START_WIDTHS } from './optimize-images.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'public', 'images-kindergarten');

/** Budżety ze specyfikacji (sekcja 6): baner desktop ≤ 250 kB, telefon ≤ 120 kB, nagłówek podstrony ≤ 100 kB. */
const BUDGET = { 'start-1920': 250_000, 'start-768': 120_000, 'headers-960': 100_000 };

for (const season of SEASONS) {
  for (const w of START_WIDTHS) {
    test(`start/${season}-${w}.webp exists and fits the budget`, () => {
      const file = join(OUT, 'start', `${season}-${w}.webp`);
      assert.ok(existsSync(file), file);
      const max = BUDGET[`start-${w}`];
      if (max) assert.ok(statSync(file).size <= max, `${statSync(file).size} > ${max}`);
    });
  }
}

for (const name of HEADERS) {
  for (const w of HEADER_WIDTHS) {
    test(`headers/${name}-${w}.webp exists and fits the budget`, () => {
      const file = join(OUT, 'headers', `${name}-${w}.webp`);
      assert.ok(existsSync(file), file);
      const max = BUDGET[`headers-${w}`];
      if (max) assert.ok(statSync(file).size <= max, `${statSync(file).size} > ${max}`);
    });
  }
}

test('agreed sizes and sources', () => {
  assert.deepEqual(START_WIDTHS, [768, 1280, 1920]);
  assert.deepEqual(HEADER_WIDTHS, [480, 960]);
  assert.deepEqual(SEASONS, ['spring', 'summer', 'autumn', 'winter']);
  assert.deepEqual(HEADERS, ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
});
