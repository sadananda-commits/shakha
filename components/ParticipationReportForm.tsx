import { useEffect, useState } from 'react';
import { callHssApi, HssApiError } from '@/lib/hssApi';
import { ParticipationReport } from '@/lib/types';

const CATEGORIES = ['Swayamsevaka', 'Bal', 'Swayamsevak', 'Jestha'] as const;

type Counts = Record<(typeof CATEGORIES)[number], string>;

function emptyCounts(): Counts {
  return { Swayamsevaka: '', Bal: '', Swayamsevak: '', Jestha: '' };
}

export default function ParticipationReportForm({
  userId,
  shakhaId,
  scheduleId,
}: {
  userId: string;
  shakhaId: string;
  scheduleId: string;
}) {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Counts>(emptyCounts());
  const [existing, setExisting] = useState<ParticipationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    callHssApi<ParticipationReport | null>('getParticipationReport', { userId, shakhaId, scheduleId })
      .then((report) => {
        setExisting(report);
        if (report) {
          setCounts({
            Swayamsevaka: String(report['Swayamsevaka'] ?? ''),
            Bal: String(report['Bal'] ?? ''),
            Swayamsevak: String(report['Swayamsevak'] ?? ''),
            Jestha: String(report['Jestha'] ?? ''),
          });
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
      await callHssApi('submitParticipationReport', {
        userId,
        shakhaId,
        scheduleId,
        Swayamsevaka: Number(counts.Swayamsevaka) || 0,
        Bal: Number(counts.Bal) || 0,
        Swayamsevak: Number(counts.Swayamsevak) || 0,
        Jestha: Number(counts.Jestha) || 0,
      });
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

      {loading ? (
        <p className="text-ink-muted text-sm">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <table className="w-full text-sm max-w-xs">
            <tbody>
              {CATEGORIES.map((cat) => (
                <tr key={cat} className="border-t border-ink/10 first:border-t-0">
                  <td className="py-2 pr-3 text-ink font-medium">{cat}</td>
                  <td className="py-2">
                    <input
                      type="number"
                      min={0}
                      value={counts[cat]}
                      onChange={(e) => setCounts({ ...counts, [cat]: e.target.value })}
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
