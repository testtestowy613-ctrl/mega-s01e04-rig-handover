import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { readNight } from './digest/reader.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';
import { DigestPage } from './views/digest.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  // plan.md § 2a: the digest page. No file for the night: 404.
  app.get('/digest/:night', (c) => {
    const digest = readNight(config.runsDir, c.req.param('night'));
    if (digest === null) return c.text('no such night', 404);
    return c.html(
      <Layout title={`digest ${c.req.param('night')}`} lane={lane()}>
        <DigestPage night={c.req.param('night')} digest={digest} />
      </Layout>,
    );
  });

  // plan.md § 2b: the same rows as JSON, in the same order (ADR 0001).
  app.get('/api/digest/:night', (c) => {
    const digest = readNight(config.runsDir, c.req.param('night'));
    if (digest === null) return c.json({ error: 'no such night' }, 404);
    return c.json(digest);
  });

  return app;
}
