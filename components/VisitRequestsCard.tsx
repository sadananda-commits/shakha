import { useEffect, useState } from 'react';
import { callHssApi } from '@/lib/hssApi';
import { formatDisplayDate } from '@/lib/format';

interface VisitRequest {
  'Request ID': string;
  'Shakha ID': string;
  'Shakha Name': string;
  'Session Date': string;
  Name: string;
  Email: string;
  Phone: string;
  'Attendee Count': number | string;
  Message: string;
  'Created Date': string;
}

/**
 * People who used the public "Find a Shakha" page to say they plan to
 * attend. These are prospective visitors without accounts, so they never
 * appear in the Attendance tab — this is where the coordinator sees them.
 */
export default function VisitRequestsCard({
  userId,
  shakhaId,
}: {
  userId: string;
  shakhaId: string;
}) {
  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !shakhaId) return;
    setLoading(true);
    callHssApi<VisitRequest[]>('getVisitRequests', { userId, shakhaId })
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [userId, shakhaId]);

  return (
    <div>
      <h2 className="text-lg font-display font-semibold text-ink mb-3">
        Visit Requests
      </h2>

      {loading && <p className="text-ink-muted text-sm">Loading…</p>}

      {!loading && requests.length === 0 && (
        <p className="text-ink-muted text-sm">
          No one has asked to visit through the public Shakha finder yet.
        </p>
      )}

      {!loading && requests.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-ink/10">
          <table className="w-full text-sm">
            <thead className="bg-paper-raised text-ink-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Contact</th>
                <th className="text-right px-4 py-2">Coming</th>
                <th className="text-left px-4 py-2">For Session</th>
                <th className="text-left px-4 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r['Request ID']} className="border-t border-ink/10 align-top">
                  <td className="px-4 py-2 text-ink whitespace-nowrap">{r.Name}</td>
                  <td className="px-4 py-2 text-ink-light whitespace-nowrap">
                    {r.Email && <div>{r.Email}</div>}
                    {r.Phone && <div>{r.Phone}</div>}
                  </td>
                  <td className="px-4 py-2 text-right text-ink">{r['Attendee Count']}</td>
                  <td className="px-4 py-2 text-ink-light whitespace-nowrap">
                    {r['Session Date'] ? formatDisplayDate(r['Session Date']) : '—'}
                  </td>
                  <td className="px-4 py-2 text-ink-light">{r.Message || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
