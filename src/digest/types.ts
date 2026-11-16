// The digest's contract (plan.md § 1). Every part of section 2 starts against this file:
// the DigestRow type and the readNight(runsDir, night) signature live here.

export type JobStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, as the log writes it.
export type NightLine = {
  at: string;
  job: string;
  status: JobStatus;
  owner: string | null;
  error?: string;
};

// One row per job, what the digest table shows.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: JobStatus | null;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

// A night's digest: one row per job, sorted by job, plus how many lines didn't parse.
// Bad lines are counted, never thrown (plan.md § 1). null means: no file for that night.
export type NightDigest = { rows: DigestRow[]; badLines: number };

// The signature every consumer codes against. The implementation is src/digest/reader.ts,
// which exports readNight typed as ReadNight.
export type ReadNight = (runsDir: string, night: string) => NightDigest | null;
