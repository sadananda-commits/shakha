import { useEffect, useState } from 'react';
import { callHssApi, HssApiError } from '@/lib/hssApi';
import { ParticipationReport } from '@/lib/types';
import { useParticipantTypes } from '@/lib/participation';

type Counts = Record<string, string>;

export default function ParticipationReportForm({
  userId,
  shakhaId,
  scheduleId,
}: {
  userId: string;
  shakhaId: string;
  scheduleId: string;
}) {
  const { types } = useParticipantTypes();
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Counts>({});
  const [existing, setExisting] = useState<ParticipationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Once the Participant Types are known, seed blank counts for any type
  // that doesn't have one yet — covers first render and a type added to
  // the sheet after the form was already open.
  useEffect(() => {
    if (types.length === 0) return;
    setCounts((prev) => {
      const next = { ...prev };
      types.forEach((t) => {
        if (next[t['Type Key']] === undefined) next[t['Type Key']] = '';
      });
      return next;
    });
  }, [types]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    callHssApi<ParticipationReport | null>('getParticipationReport', { userId, shakhaId, scheduleId })
      .then((report) => {
        setExisting(report);
        if (report) {
          setCounts(
            types.reduce((acc, t) => {
              acc[t['Type Key']] = String(report[t['Type Key']] ?? '');
              return acc;
            }, {} as Counts)
          );
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const total = Object.values(counts).reduce((sum, v) => sum + (Number(v) || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSaved(false);
    setError('');
    try {
      const payload: Record<string, unknown> = { userId, shakhaId, scheduleId };
      types.forEach((t) => {
        payload[t['Type Key']] = Number(counts[t['Type Key']]) || 0;
      });
      await callHssApi('submitParticipationReport', payload);
      setSaved(true);
    } catch (err) {
      setError(err instanceof HssApiError ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-marigold-dark underline underline-offset-2 self-start"
      >
        Report participation
      </button>
    );
  }

  return (
    <div className="bg-paper-raised rounded-card border border-ink/10 p-5 sm:p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-ink">
          {existing ? 'Edit participation report' : 'Report participation'}
        </h3>
        <button onClick={() => setOpen(false)} className="text-sm text-ink-light underline underline-offset-2">
          Close
        </button>
      </div>
      <p className="text-xs text-ink-muted -mt-1">Number of attendees by category.</p>

      {loading || types.length === 0 ? (
        <p className="text-ink-muted text-sm">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <table className="w-full text-sm max-w-sm">
            <tbody>
              {types.map((t) => (
                <tr key={t['Type Key']} className="border-t border-ink/10 first:border-t-0">
                  <td className="py-2 pr-3">
                    <div className="text-ink font-medium">{t['Label']}</div>
                    <div className="text-xs text-ink-muted">{t['Age Range Label']}</div>
                  </td>
                  <td className="py-2 align-top">
                    <input
                      type="number"
                      min={0}
                      value={counts[t['Type Key']] ?? ''}
                      onChange={(e) => setCounts({ ...counts, [t['Type Key']]: e.target.value })}
                      className="input w-24"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-sm text-ink">
            Total: <span className="font-semibold">{total}</span>
          </p>

          {error && <p className="text-sm text-vermilion">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary self-start">
            {submitting ? 'Saving…' : existing ? 'Update report' : 'Save report'}
          </button>
          {saved && !submitting && <p className="text-sm text-sage">Saved.</p>}
        </form>
      )}
    </div>
  );
}
