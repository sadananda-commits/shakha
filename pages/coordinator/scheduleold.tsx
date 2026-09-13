import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { callHssApi, HssApiError } from '@/lib/hssApi';
import { DashboardBundle, ScheduleActivity, ScheduleEntry, Shakha } from '@/lib/types';

const SESSION_KEY = 'hss_user_id';

export default function CoordinatorSchedulePage() {
  const [status, setStatus] = useState<'loading' | 'denied' | 'ready'>('loading');
  const [userId, setUserId] = useState('');
  const [shakha, setShakha] = useState<Shakha | null>(null);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const savedUserId = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
    if (!savedUserId) {
      setStatus('denied');
      return;
    }
    setUserId(savedUserId);

    callHssApi<DashboardBundle>('getMyDashboard', { userId: savedUserId })
      .then((dash) => {
        if (!dash.isCoordinator || !dash.shakha) {
          setStatus('denied');
          return;
        }
        setShakha(dash.shakha);
        return loadEntries(savedUserId, dash.shakha['Shakha ID']);
      })
      .then(() => setStatus('ready'))
      .catch(() => setStatus('denied'));
  }, []);

  async function loadEntries(uid: string, shakhaId: string) {
    const rows = await callHssApi<ScheduleEntry[]>('getScheduleForShakha', {
      userId: uid,
      shakhaId,
      includeDrafts: true,
    });
    setEntries(rows);
  }

  function refreshEntries() {
    if (shakha) loadEntries(userId, shakha['Shakha ID']);
  }

  if (status === 'loading') {
    return <Layout><div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-ink-muted">Loading…</div></Layout>;
  }

  if (status === 'denied' || !shakha) {
    return (
      <Layout>
        <div className="max-w-md mx-auto px-4 sm:px-6 py-16 text-center">
          <h1 className="text-xl font-display font-semibold text-ink mb-2">
            Coordinator access required
          </h1>
          <Link href="/my-shakha" className="btn-primary inline-block mt-4">Go to My Shakha</Link>
        </div>
      </Layout>
    );
  }

  const selectedEntry = entries.find((e) => e['Schedule ID'] === selectedId) || null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wide text-marigold-dark">
              Manage Schedule
            </p>
            <h1 className="text-2xl font-display font-semibold text-ink">
              {shakha['Shakha Name']}
            </h1>
          </div>
          <Link href="/coordinator" className="text-sm text-ink-light underline underline-offset-2">
            ← Back to dashboard
          </Link>
        </div>

        <NewScheduleForm userId={userId} shakhaId={shakha['Shakha ID']} shakha={shakha} onCreated={refreshEntries} />

        <div>
          <h2 className="text-lg font-display font-semibold text-ink mb-3">Dates</h2>
          <div className="flex flex-col gap-2">
            {entries.map((entry) => (
              <button
                key={entry['Schedule ID']}
                onClick={() => setSelectedId(entry['Schedule ID'])}
                className={`text-left rounded-card border p-4 transition-colors ${
                  selectedId === entry['Schedule ID']
                    ? 'border-marigold bg-marigold/10'
                    : 'border-ink/10 bg-paper-raised hover:border-ink/25'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">{entry.Date} · {entry.Day}</span>
                  <span className="flex gap-2">
                    <Badge text={entry.Status} />
                    <Badge
                      text={entry['Publish Status'] || 'Published'}
                      tone={entry['Publish Status'] === 'Draft' ? 'marigold' : 'sage'}
                    />
                  </span>
                </div>
                <p className="text-sm text-ink-light mt-1">
                  {entry['Start Time']} – {entry['End Time']} · {entry.Location}
                </p>
              </button>
            ))}
            {entries.length === 0 && (
              <p className="text-ink-muted text-sm">No dates yet — create one above.</p>
            )}
          </div>
        </div>

        {selectedEntry && (
          <ActivityManager
            userId={userId}
            shakhaId={shakha['Shakha ID']}
            entry={selectedEntry}
            allEntries={entries}
            onChanged={refreshEntries}
          />
        )}
      </div>
    </Layout>
  );
}

function Badge({ text, tone = 'ink' }: { text: string; tone?: 'ink' | 'marigold' | 'sage' }) {
  const toneClass =
    tone === 'marigold' ? 'bg-marigold/15 text-marigold-dark' :
    tone === 'sage' ? 'bg-sage/15 text-sage' :
    'bg-ink/10 text-ink-light';
  return <span className={`text-xs font-mono px-2 py-0.5 rounded ${toneClass}`}>{text}</span>;
}

function NewScheduleForm({
  userId,
  shakhaId,
  shakha,
  onCreated,
}: {
  userId: string;
  shakhaId: string;
  shakha: Shakha;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    Date: '',
    Day: shakha['Day of Week'] || '',
    'Start Time': shakha['Start Time'] || '',
    'End Time': shakha['End Time'] || '',
    Location: shakha.Venue || shakha.Address || '',
    Status: 'Scheduled',
    Notes: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await callHssApi('coordinatorUpsertSchedule', { userId, shakhaId, ...form });
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof HssApiError ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary self-start">
        + New date
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-paper-raised rounded-card border border-ink/10 p-5 flex flex-col gap-3">
      <h3 className="font-display font-semibold text-ink">New Shakha date</h3>
      <p className="text-xs text-ink-muted -mt-2">Created as a Draft — publish it once the schedule is ready.</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Date</span>
          <input type="date" required value={form.Date} onChange={(e) => setForm({ ...form, Date: e.target.value })} className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Day</span>
          <input value={form.Day} onChange={(e) => setForm({ ...form, Day: e.target.value })} className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Start time</span>
          <input value={form['Start Time']} onChange={(e) => setForm({ ...form, 'Start Time': e.target.value })} className="input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">End time</span>
          <input value={form['End Time']} onChange={(e) => setForm({ ...form, 'End Time': e.target.value })} className="input" />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Location</span>
        <input value={form.Location} onChange={(e) => setForm({ ...form, Location: e.target.value })} className="input" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Notes (optional)</span>
        <input value={form.Notes} onChange={(e) => setForm({ ...form, Notes: e.target.value })} className="input" />
      </label>

      {error && <p className="text-sm text-vermilion">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Creating…' : 'Create date'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-ink-light underline underline-offset-2">
          Cancel
        </button>
      </div>
    </form>
  );
}

function ActivityManager({
  userId,
  shakhaId,
  entry,
  allEntries,
  onChanged,
}: {
  userId: string;
  shakhaId: string;
  entry: ScheduleEntry;
  allEntries: ScheduleEntry[];
  onChanged: () => void;
}) {
  const [activities, setActivities] = useState<ScheduleActivity[]>([]);
  const [form, setForm] = useState({ activityTime: '', activityName: '', responsiblePerson: '', remarks: '' });
  const [copyFrom, setCopyFrom] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, [entry['Schedule ID']]);

  async function load() {
    const rows = await callHssApi<ScheduleActivity[]>('getScheduleActivities', { scheduleId: entry['Schedule ID'] });
    setActivities(rows);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await callHssApi('addScheduleActivity', { userId, shakhaId, scheduleId: entry['Schedule ID'], ...form });
      setForm({ activityTime: '', activityName: '', responsiblePerson: '', remarks: '' });
      load();
    } catch (err) {
      setError(err instanceof HssApiError ? err.message : 'Something went wrong.');
    }
  }

  async function handleRemove(activityRowId: string) {
    await callHssApi('removeScheduleActivity', { userId, shakhaId, activityRowId });
    load();
  }

  async function handleCopy() {
    if (!copyFrom) return;
    await callHssApi('copyPreviousWeekActivities', {
      userId, shakhaId, fromScheduleId: copyFrom, toScheduleId: entry['Schedule ID'],
    });
    load();
  }

  async function handlePublish() {
    await callHssApi('publishSchedule', { userId, shakhaId, scheduleId: entry['Schedule ID'] });
    onChanged();
  }

  const otherEntries = allEntries.filter((e) => e['Schedule ID'] !== entry['Schedule ID']);

  return (
    <div className="bg-paper-raised rounded-card border border-ink/10 p-5 sm:p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-ink">
          Run of show — {entry.Date}
        </h3>
        {entry['Publish Status'] === 'Draft' && (
          <button onClick={handlePublish} className="btn-primary">Publish</button>
        )}
      </div>

      {activities.length > 0 && (
        <table className="w-full text-sm">
          <tbody>
            {activities.map((a) => (
              <tr key={a['Activity Row ID']} className="border-t border-ink/10">
                <td className="py-2 pr-3 font-mono text-ink-light whitespace-nowrap">{a['Activity Time']}</td>
                <td className="py-2 pr-3 text-ink font-medium">{a['Activity Name']}</td>
                <td className="py-2 pr-3 text-ink-light">{a['Responsible Person']}</td>
                <td className="py-2 text-right">
                  <button onClick={() => handleRemove(a['Activity Row ID'])} className="text-xs text-vermilion underline underline-offset-2">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {otherEntries.length > 0 && (
        <div className="flex gap-2 items-center">
          <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className="input flex-1">
            <option value="">Copy activities from…</option>
            {otherEntries.map((e) => (
              <option key={e['Schedule ID']} value={e['Schedule ID']}>{e.Date}</option>
            ))}
          </select>
          <button onClick={handleCopy} className="btn-primary whitespace-nowrap">Copy</button>
        </div>
      )}

      <form onSubmit={handleAdd} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink">Time</span>
          <input required value={form.activityTime} onChange={(e) => setForm({ ...form, activityTime: e.target.value })} className="input" placeholder="10:30" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink">Activity</span>
          <input required value={form.activityName} onChange={(e) => setForm({ ...form, activityName: e.target.value })} className="input" placeholder="Khel" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink">Responsible</span>
          <input value={form.responsiblePerson} onChange={(e) => setForm({ ...form, responsiblePerson: e.target.value })} className="input" />
        </label>
        <button type="submit" className="btn-primary">Add</button>
      </form>

      {error && <p className="text-sm text-vermilion">{error}</p>}
    </div>
  );
}
