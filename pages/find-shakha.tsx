import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import UtilitiesSection from '@/components/UtilitiesSection';
import ScheduleActivitiesTable from '@/components/ScheduleActivitiesTable';
import { callHssApi, HssApiError } from '@/lib/hssApi';
import { formatDisplayDate } from '@/lib/format';
import { Shakha, ShakhaPreview, VisitRequestResult } from '@/lib/types';

/**
 * Public "find a Shakha near you" page. Anyone — with or without an
 * account — can browse every active Shakha, see where and when it meets
 * and what's planned for the next session, and tell that Shakha they
 * plan to attend.
 *
 * The "I plan to attend" note is deliberately lighter than the attendance
 * confirmation on My Shakha: it doesn't require an account, and it lands
 * in the Visit Requests tab for the coordinator to follow up, rather than
 * in the Attendance tab.
 */
export default function FindShakhaPage() {
  const [shakhas, setShakhas] = useState<Shakha[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [preview, setPreview] = useState<ShakhaPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [areaFilter, setAreaFilter] = useState('');

  useEffect(() => {
    callHssApi<Shakha[]>('getShakhas').then(setShakhas).catch(() => setShakhas([]));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setPreview(null);
      return;
    }
    setLoading(true);
    callHssApi<ShakhaPreview>('getShakhaPreview', { shakhaId: selectedId })
      .then(setPreview)
      .catch(() => setPreview(null))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const areas = Array.from(new Set(shakhas.map((s) => s.Area).filter(Boolean)));
  const visibleShakhas = areaFilter ? shakhas.filter((s) => s.Area === areaFilter) : shakhas;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-8">
        <div>
          <p className="text-xs font-mono uppercase tracking-wide text-marigold-dark">
            Find a Shakha
          </p>
          <h1 className="text-2xl font-display font-semibold text-ink">
            Find the Shakha closest to you
          </h1>
          <p className="text-ink-muted text-sm mt-2">
            Browse every Shakha in Denmark, see when and where it meets, and let
            them know you'd like to come along to the next session.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {areas.length > 1 && (
            <label className="flex flex-col gap-1.5 sm:w-52">
              <span className="text-sm font-medium text-ink">Area</span>
              <select
                value={areaFilter}
                onChange={(e) => {
                  setAreaFilter(e.target.value);
                  setSelectedId('');
                }}
                className="input"
              >
                <option value="">All areas</option>
                {areas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1.5 flex-1">
            <span className="text-sm font-medium text-ink">Shakha</span>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="input"
            >
              <option value="">Select a Shakha…</option>
              {visibleShakhas.map((s) => (
                <option key={s['Shakha ID']} value={s['Shakha ID']}>
                  {s['Shakha Name']} — {s.City || s.Area} ({s['Day of Week']}s)
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading && <p className="text-ink-muted text-sm">Loading…</p>}

        {!loading && preview && (
          <ShakhaDetails preview={preview} />
        )}

        <UtilitiesSection />
      </div>
    </Layout>
  );
}

function ShakhaDetails({ preview }: { preview: ShakhaPreview }) {
  const { shakha, nextSchedule, scheduleActivities } = preview;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-paper-raised rounded-card border border-ink/10 p-5 sm:p-6">
        <h2 className="text-xl font-display font-semibold text-ink">{shakha['Shakha Name']}</h2>
        <p className="text-sm text-ink-muted mt-0.5">
          {[shakha.Area, shakha.City].filter(Boolean).join(' · ')}
        </p>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-4 text-sm">
          <Detail label="Meets">
            {shakha['Day of Week']}s, {shakha['Start Time']}–{shakha['End Time']}
          </Detail>
          <Detail label="Venue">{shakha.Venue || shakha.Address || '—'}</Detail>
          {shakha['Hall/Room Details'] && (
            <Detail label="Room">{shakha['Hall/Room Details']}</Detail>
          )}
          {shakha['Location Type'] && (
            <Detail label="Setting">{shakha['Location Type']}</Detail>
          )}
          <Detail label="Coordinator">{shakha['Coordinator Name'] || '—'}</Detail>
          {shakha['Coordinator Contact'] && (
            <Detail label="Contact">{shakha['Coordinator Contact']}</Detail>
          )}
        </dl>

        {shakha['Map Link'] && (
          <a
            href={shakha['Map Link']}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-sm text-marigold-dark underline underline-offset-2"
          >
            Open in Maps
          </a>
        )}
      </div>

      {nextSchedule ? (
        <div className="bg-ink text-paper rounded-card p-5 sm:p-6">
          <p className="text-xs font-mono uppercase tracking-wide text-marigold mb-1">
            Next Session
          </p>
          <p className="text-lg font-display font-semibold">
            {formatDisplayDate(nextSchedule.Date)} · {nextSchedule['Start Time']}–{nextSchedule['End Time']}
          </p>
          <p className="text-sm opacity-80 mt-1">{nextSchedule.Location}</p>
          {nextSchedule.Notes && <p className="text-sm opacity-80 mt-2">{nextSchedule.Notes}</p>}
        </div>
      ) : (
        <p className="text-ink-muted text-sm">
          No upcoming session is published for this Shakha yet — you can still send a
          note below and the coordinator will get in touch.
        </p>
      )}

      {nextSchedule && scheduleActivities.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-semibold text-ink mb-3">
            What happens at the session
          </h3>
          <ScheduleActivitiesTable activities={scheduleActivities} />
        </div>
      )}

      <VisitRequestForm
        shakhaId={shakha['Shakha ID']}
        shakhaName={shakha['Shakha Name']}
        sessionDate={nextSchedule ? nextSchedule.Date : ''}
      />

      <p className="text-sm text-ink-muted">
        Ready to join properly?{' '}
        <Link href="/my-shakha" className="text-marigold-dark underline underline-offset-2">
          Create an account
        </Link>{' '}
        to confirm attendance each week and add your family members.
      </p>
    </div>
  );
}

function VisitRequestForm({
  shakhaId,
  shakhaName,
  sessionDate,
}: {
  shakhaId: string;
  shakhaName: string;
  sessionDate: string;
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    attendeeCount: '1',
    message: '',
  });
  const [result, setResult] = useState<VisitRequestResult | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset when the visitor switches to a different Shakha.
  useEffect(() => {
    setResult(null);
    setError('');
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
          {sessionDate ? ` on ${formatDisplayDate(sessionDate)}` : ''}. No account needed —
          just a way to reach you.
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

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted uppercase tracking-wide">{label}</dt>
      <dd className="text-ink mt-0.5">{children}</dd>
    </div>
  );
}
