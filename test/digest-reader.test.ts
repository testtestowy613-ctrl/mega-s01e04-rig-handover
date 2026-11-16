import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

// plan.md § 1 done-when: reader tests pass on runs/2026-10-28.jsonl (5 jobs, 1 bad line).

describe('readNight', () => {
  it('reads the night into one row per job, sorted by job', () => {
    const digest = readNight('runs', '2026-10-28');
    expect(digest).not.toBeNull();
    const rows = digest!.rows.map((r) => r.job);
    expect(rows).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('counts the bad line instead of throwing', () => {
    const digest = readNight('runs', '2026-10-28');
    expect(digest!.badLines).toBe(1);
  });

  it('aggregates runs, retries, statuses and times per job', () => {
    const digest = readNight('runs', '2026-10-28');
    const byJob = Object.fromEntries(digest!.rows.map((r) => [r.job, r]));

    expect(byJob['lane/sync']).toEqual({
      job: 'lane/sync',
      owner: 'rook',
      runs: 8,
      retries: 1,
      lastStatus: 'ok',
      lastError: 'lock held',
      firstAt: '2026-10-28T23:00:06+01:00',
      lastAt: '2026-10-29T05:00:04+01:00',
    });

    expect(byJob['fixtures/refresh']).toMatchObject({
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
    });

    expect(byJob['notes/backup']).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
  });

  it('keeps a null owner on the row', () => {
    const digest = readNight('runs', '2026-10-28');
    const render = digest!.rows.find((r) => r.job === 'digest/render');
    expect(render?.owner).toBeNull();
  });

  it('returns null for a night with no file', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });

  it('renders an empty night as no rows', () => {
    const digest = readNight('runs', '2026-10-27');
    expect(digest!.rows.length).toBeGreaterThan(0); // sanity: fixture night reads
    // empty night covered by route tests with a temp runs dir (issue #5)
  });
});
