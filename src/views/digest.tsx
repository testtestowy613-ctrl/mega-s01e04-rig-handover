import type { DigestRow, NightDigest } from '../digest/types.js';

// plan.md § 2a: one table, sorted by job (the reader sorts), retries >= 3 and any fail marked.
// Missing data renders as —, never dropped (styleguide).

const mark = (row: DigestRow) => (row.retries >= 3 || row.lastStatus === 'fail' ? ' ⚠' : '');

export function DigestPage({ night, digest }: { night: string; digest: NightDigest }) {
  return (
    <>
      <h1>digest · {night}</h1>
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((row) => (
              <tr>
                <td>{row.job}{mark(row)}</td>
                <td>{row.owner ?? '—'}</td>
                <td>{row.runs}</td>
                <td>{row.retries}</td>
                <td>{row.lastStatus ?? '—'}</td>
                <td>{row.lastError ?? '—'}</td>
                <td>{row.firstAt}</td>
                <td>{row.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {digest.badLines > 0 && (
        <p class="mute">{digest.badLines} bad line{digest.badLines === 1 ? '' : 's'} not shown</p>
      )}
    </>
  );
}
