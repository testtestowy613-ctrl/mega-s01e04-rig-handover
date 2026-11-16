import { existsSync, readFileSync } from 'node:fs';
import type { DigestRow, JobStatus, NightDigest, NightLine, ReadNight } from './types.js';

// plan.md § 1: read runs/<night>.jsonl into one row per job. A line that doesn't parse is
// counted, never thrown; the night still renders. owner can be null — the row stays.

const isJobStatus = (s: unknown): s is JobStatus => s === 'ok' || s === 'retry' || s === 'fail';

function parseLine(raw: string): NightLine | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.at !== 'string' || typeof v.job !== 'string' || !isJobStatus(v.status)) return null;
  if (v.owner !== null && typeof v.owner !== 'string') return null;
  if (v.error !== undefined && typeof v.error !== 'string') return null;
  return { at: v.at, job: v.job, status: v.status, owner: v.owner as string | null, error: v.error as string | undefined };
}

export const readNight: ReadNight = (runsDir, night) => {
  const file = `${runsDir}/${night}.jsonl`;
  if (!existsSync(file)) return null;

  const perJob = new Map<string, { lines: NightLine[] }>();
  let badLines = 0;

  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (line === null) {
      badLines += 1; // counted, never thrown
      continue;
    }
    const entry = perJob.get(line.job) ?? { lines: [] };
    entry.lines.push(line);
    perJob.set(line.job, entry);
  }

  const rows: DigestRow[] = [...perJob.entries()].map(([job, { lines }]) => {
    // The log is append-ordered; first and last line carry first and last time.
    const first = lines[0];
    const last = lines[lines.length - 1];
    // The last error seen for this job, even if the night ended ok.
    const lastErrorLine = [...lines].reverse().find((l) => l.error !== undefined);
    return {
      job,
      owner: last.owner,
      runs: lines.length,
      retries: lines.filter((l) => l.status === 'retry').length,
      lastStatus: last.status,
      lastError: lastErrorLine?.error ?? null,
      firstAt: first.at,
      lastAt: last.at,
    };
  });

  rows.sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { rows, badLines };
};
