import { useEffect, useState } from 'react';
import { callHssApi, HssApiError } from '@/lib/hssApi';
import { ParticipationReport } from '@/lib/types';

const AGE_GROUPS: { key: string; label: string }[] = [
  { key: 'Children', label: 'Children (0–12)' },
  { key: 'Youth', label: 'Youth (13–18)' },
  { key: 'Adult', label: 'Adult (19–59)' },
  { key: 'Senior', label: 'Senior (60+)' },
];

type Counts = Record<string, string>; // e.g. "Children Male" -> "3"

function emptyCounts(): Counts {
  const c: Counts = {};
  AGE_GROUPS.forEach((g) => {
    c[`${g.key} Male`] = '';
    c[`${g.key} Female`] = '';
  });
  return c;
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
          const c: Counts = {};
          AGE_GROUPS.forEach((g) => {
            c[`${g.key} Male`] = String(report[`${g.key} Male` as keyof ParticipationReport] ?? '');
            c[`${g.key} Female`] = String(report[`${g.key} Female` as keyof ParticipationReport] ?? '');
          });
          setCounts(c);
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
      const numericCounts: Record<string, number> = {};
      Object.entries(counts).forEach(([k, v]) => {
        numericCounts[k] = Number(v) || 0;
      });
      await callHssApi('submitParticipationReport', {
        userId,
        shakhaId,
        scheduleId,
        ...numericCounts,
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
      <p className="text-xs text-ink-muted -mt-1">
        Headcount of who actually attended, by age group and gender.
      </p>

      {loading ? (
        <p className="text-ink-muted text-sm">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-ink-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left py-1">Age group</th>
                  <th className="text-left py-1 px-2">Male</th>
                  <th className="text-left py-1 px-2">Female</th>
                </tr>
              </thead>
              <tbody>
                {AGE_GROUPS.map((g) => (
                  <tr key={g.key} className="border-t border-ink/10">
                    <td className="py-2 pr-3 text-ink">{g.label}</td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min={0}
                        value={counts[`${g.key} Male`]}
                        onChange={(e) => setCounts({ ...counts, [`${g.key} Male`]: e.target.value })}
                        className="input w-20"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min={0}
                        value={counts[`${g.key} Female`]}
                        onChange={(e) => setCounts({ ...counts, [`${g.key} Female`]: e.target.value })}
                        className="input w-20"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
