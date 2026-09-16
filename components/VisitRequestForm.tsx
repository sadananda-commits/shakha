import { useEffect, useState } from 'react';
import { callHssApi, HssApiError } from '@/lib/hssApi';
import { formatDisplayDate } from '@/lib/format';
import { VisitRequestResult } from '@/lib/types';

/**
 * "I plan to attend" for a Shakha the person isn't registered with.
 * Deliberately separate from the weekly attendance confirmation on their
 * own Shakha: that one updates the Attendance tab and feeds the
 * coordinator's headcount, whereas this lands in Visit Requests as a
 * heads-up that someone new is coming. No account required.
 *
 * Pass defaults when the visitor is already signed in, so they don't
 * retype what the system already knows.
 */
export default function VisitRequestForm({
  shakhaId,
  shakhaName,
  sessionDate,
  defaultName = '',
  defaultEmail = '',
  defaultPhone = '',
}: {
  shakhaId: string;
  shakhaName: string;
  sessionDate: string;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
}) {
  const [form, setForm] = useState({
    name: defaultName,
    email: defaultEmail,
    phone: defaultPhone,
    attendeeCount: '1',
    message: '',
  });
  const [result, setResult] = useState<VisitRequestResult | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset when switching to a different Shakha.
  useEffect(() => {
    setResult(null);
    setError('');
    setForm((f) => ({ ...f, name: defaultName, email: defaultEmail, phone: defaultPhone }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shakhaId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email && !form.phone) {
      setError('Please give either an email or a phone number so the Shakha can reach you.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await callHssApi<VisitRequestResult>('submitVisitRequest', {
        shakhaId,
        ...form,
        attendeeCount: Number(form.attendeeCount) || 1,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof HssApiError ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="bg-sage/10 border border-sage/30 rounded-card p-5 sm:p-6">
        <p className="font-display font-semibold text-ink">Thank you — we'll see you there.</p>
        <p className="text-sm text-ink-light mt-1">
          {shakhaName} has been notified that you plan to attend
          {result.sessionDate ? ` on ${formatDisplayDate(result.sessionDate)}` : ''}. The
          coordinator will reach out with any joining details.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-paper-raised rounded-card border border-ink/10 p-5 sm:p-6 flex flex-col gap-4"
    >
      <div>
        <h3 className="font-display text-lg font-semibold text-ink">I plan to attend</h3>
        <p className="text-xs text-ink-muted mt-1">
          Let {shakhaName} know you're coming
          {sessionDate ? ` on ${formatDisplayDate(sessionDate)}` : ''}.
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Your name</span>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Phone</span>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input"
          />
        </label>
      </div>
      <p className="text-xs text-ink-muted -mt-2">Either one is enough.</p>

      <label className="flex flex-col gap-1.5 sm:max-w-[10rem]">
        <span className="text-sm font-medium text-ink">How many coming?</span>
        <input
          type="number"
          min={1}
          value={form.attendeeCount}
          onChange={(e) => setForm({ ...form, attendeeCount: e.target.value })}
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Anything to add? (optional)</span>
        <textarea
          rows={3}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="input"
        />
      </label>

      {error && <p className="text-sm text-vermilion">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary self-start">
        {submitting ? 'Sending…' : 'Let them know'}
      </button>
    </form>
  );
}
