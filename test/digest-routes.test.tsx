import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { RigConfig } from '../src/config.js';

// plan.md § 2d: route tests for 2a (page) and 2b (JSON) — 200, 404 for a night with
// no file, the empty night, a night with a bad line. Temp runs dir; runs/ is read-only.

let runsDir: string;

function writeNight(night: string, lines: string[]): void {
  writeFileSync(join(runsDir, `${night}.jsonl`), lines.join('\n') + '\n', 'utf8');
}

function configFor(dir: string): RigConfig {
  return { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir };
}

beforeEach(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
});

afterEach(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

describe('GET /digest/:night', () => {
  it('renders 200 for a night with a file', async () => {
    writeNight('2026-10-28', [
      JSON.stringify({ at: '2026-10-28T23:00:06+01:00', job: 'lane/sync', status: 'ok', owner: 'rook' }),
      JSON.stringify({ at: '2026-10-29T01:00:00+01:00', job: 'lane/sync', status: 'retry', owner: 'rook', error: 'lock held' }),
      JSON.stringify({ at: '2026-10-29T05:00:04+01:00', job: 'notes/backup', status: 'fail', owner: null, error: 'quota exceeded' }),
    ]);
    const res = await createApp(configFor(runsDir)).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('lane/sync');
    expect(html).toContain('notes/backup');
    expect(html).toContain('quota exceeded');
  });

  it('returns 404 for a night with no file', async () => {
    const res = await createApp(configFor(runsDir)).request('/digest/1999-01-01');
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('no such night');
  });

  it('renders "nothing ran" for an empty file', async () => {
    writeNight('2026-10-27', []);
    const res = await createApp(configFor(runsDir)).request('/digest/2026-10-27');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
  });

  it('still renders 200 for a night with a bad line', async () => {
    writeNight('2026-10-26', [
      'this line is not json',
      JSON.stringify({ at: '2026-10-26T23:00:00+01:00', job: 'lane/sync', status: 'ok', owner: 'rook' }),
    ]);
    const res = await createApp(configFor(runsDir)).request('/digest/2026-10-26');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('lane/sync');
    expect(html).toContain('1 bad line not shown');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns 200 with the rows as JSON, sorted by job', async () => {
    writeNight('2026-10-28', [
      JSON.stringify({ at: '2026-10-28T23:00:06+01:00', job: 'notes/backup', status: 'fail', owner: null, error: 'quota exceeded' }),
      JSON.stringify({ at: '2026-10-29T01:00:00+01:00', job: 'lane/sync', status: 'retry', owner: 'rook', error: 'lock held' }),
      JSON.stringify({ at: '2026-10-29T05:00:04+01:00', job: 'lane/sync', status: 'ok', owner: 'rook' }),
      JSON.stringify({ at: '2026-10-29T05:05:00+01:00', job: 'digest/render', status: 'ok', owner: null }),
    ]);
    const res = await createApp(configFor(runsDir)).request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const digest = (await res.json()) as { rows: { job: string; runs: number; retries: number; lastStatus: string }[]; badLines: number };
    expect(digest.rows.map((r) => r.job)).toEqual(['digest/render', 'lane/sync', 'notes/backup']);
    const sync = digest.rows.find((r) => r.job === 'lane/sync');
    expect(sync).toMatchObject({ runs: 2, retries: 1, lastStatus: 'ok' });
    expect(digest.badLines).toBe(0);
  });

  it('returns 404 with an error body for a night with no file', async () => {
    const res = await createApp(configFor(runsDir)).request('/api/digest/1999-01-01');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no such night' });
  });

  it('returns the empty night and bad lines in JSON', async () => {
    writeNight('2026-10-26', [
      '{broken',
      JSON.stringify({ at: '2026-10-26T23:00:00+01:00', job: 'lane/sync', status: 'ok', owner: 'rook' }),
    ]);
    const res = await createApp(configFor(runsDir)).request('/api/digest/2026-10-26');
    expect(res.status).toBe(200);
    const digest = (await res.json()) as { rows: unknown[]; badLines: number };
    expect(digest.rows.length).toBe(1);
    expect(digest.badLines).toBe(1);
  });
});
