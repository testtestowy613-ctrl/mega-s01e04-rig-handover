import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { readNight } from './digest/reader.js';
import { lastBeat, type Beat } from './heartbeat.js';

export type NightCount = { night: string; ok: number; retry: number; fail: number };

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: string[];
  nightCounts: NightCount[];
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

// plan.md § 2c: ok / retry / fail counts per night, for the links on the board.
export function nightCounts(runsDir: string, nights: string[]): NightCount[] {
  return nights.map((night) => {
    const digest = readNight(runsDir, night);
    const rows = digest?.rows ?? [];
    return {
      night,
      ok: rows.filter((r) => r.lastStatus === 'ok').length,
      retry: rows.filter((r) => r.retries > 0).length,
      fail: rows.filter((r) => r.lastStatus === 'fail').length,
    };
  });
}

export function readStatus(config: RigConfig): Status {
  const nights = nightsOnDisk(config.runsDir);
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights,
    nightCounts: nightCounts(config.runsDir, nights),
  };
}
