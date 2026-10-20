import { bannerSeason } from './banner-season';

describe('bannerSeason', () => {
  it('uses the key of an active season theme, even out of its season (manual mode)', () => {
    expect(bannerSeason({ type: 'season', key: 'winter' }, new Date('2026-07-15T12:00:00+02:00'))).toBe('winter');
  });

  it('uses the date season for a special theme', () => {
    expect(bannerSeason({ type: 'special', key: 'mikolajki' }, new Date('2026-12-06T12:00:00+01:00'))).toBe('autumn');
  });

  it('uses the date season when there is no theme yet', () => {
    expect(bannerSeason(null, new Date('2026-07-01T12:00:00+02:00'))).toBe('summer');
  });

  it('uses the date season for a season theme with an unknown key', () => {
    expect(bannerSeason({ type: 'season', key: 'bogus' }, new Date('2026-04-01T12:00:00+02:00'))).toBe('spring');
  });
});
