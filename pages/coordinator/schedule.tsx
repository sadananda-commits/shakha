import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ParticipationReportForm from '@/components/ParticipationReportForm';
import DayScheduleTableEditor from '@/components/DayScheduleTableEditor';
import { callHssApi, HssApiError } from '@/lib/hssApi';
import { formatDisplayDate, formatDisplayTime } from '@/lib/format';
import { DashboardBundle, ScheduleActivity, ScheduleEntry, Shakha } from '@/lib/types';

const SESSION_KEY = 'hss_user_id';

/** 'yyyy-MM-dd' for today, using the browser's local date (not UTC). */
function todayLocalDateString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'yyyy-MM-dd' for an arbitrary Date, using local time. */
function toDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CoordinatorSchedulePage() {
  const [status, setStatus] = useState<'loading' | 'denied' | 'ready'>('loading');
  const [userId, setUserId] = useState('');
  const [shakha, setShakha] = useState<Shakha | null>(null);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);

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

        <NewScheduleForm
          key={prefillDate || 'manual'}
          userId={userId}
          shakhaId={shakha['Shakha ID']}
          shakha={shakha}
          initialDate={prefillDate}
          onCreated={() => {
            refreshEntries();
            setPrefillDate(null);
          }}
        />

        <div>
          <h2 className="text-lg font-display font-semibold text-ink mb-3">Dates</h2>
          <ScheduleCalendar
            entries={entries}
            selectedId={selectedId}
            onSelectExisting={(id) => {
              setSelectedId(id);
              setPrefillDate(null);
            }}
            onSelectEmpty={(dateStr) => {
              setPrefillDate(dateStr);
              setSelectedId(null);
            }}
          />
        </div>

        {selectedEntry && (
          <EditScheduleDetails
            key={selectedEntry['Schedule ID']}
            userId={userId}
            shakhaId={shakha['Shakha ID']}
            entry={selectedEntry}
            onSaved={refreshEntries}
          />
        )}

        {selectedEntry && selectedEntry.Date <= todayLocalDateString() && (
          <ParticipationReportForm
            key={`pr-${selectedEntry['Schedule ID']}`}
            userId={userId}
            shakhaId={shakha['Shakha ID']}
            scheduleId={selectedEntry['Schedule ID']}
          />
        )}

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

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Month calendar for the Dates list. Each day is a small card; days with a
 * scheduled Shakha/event are highlighted and labeled. Clicking a day with an
 * entry opens it for editing below; clicking an empty day starts a new one
 * pre-filled with that date.
 */
function ScheduleCalendar({
  entries,
  selectedId,
  onSelectExisting,
  onSelectEmpty,
}: {
  entries: ScheduleEntry[];
  selectedId: string | null;
  onSelectExisting: (id: string) => void;
  onSelectEmpty: (dateStr: string) => void;
}) {
  const today = new Date();
  const [monthCursor, setMonthCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const entriesByDate = new Map<string, ScheduleEntry>();
  entries.forEach((e) => entriesByDate.set(e.Date, e));

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ date: Date; dateStr: string; inMonth: boolean } | null> = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ date, dateStr: toDateString(date), inMonth: true });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = toDateString(today);
  const monthLabel = monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthCursor(new Date(year, month - 1, 1))}
          className="text-sm text-ink-light underline underline-offset-2"
        >
          ← Prev
        </button>
        <h3 className="font-display font-semibold text-ink">{monthLabel}</h3>
        <button
          type="button"
          onClick={() => setMonthCursor(new Date(year, month + 1, 1))}
          className="text-sm text-ink-light underline underline-offset-2"
        >
          Next →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-mono uppercase tracking-wide text-ink-muted">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} />;
          const entry = entriesByDate.get(cell.dateStr);
          const isSelected = !!entry && entry['Schedule ID'] === selectedId;
          const isToday = cell.dateStr === todayStr;

          let toneClass = 'border-ink/10 bg-paper-raised hover:border-ink/25';
          if (entry) {
            toneClass =
              entry['Publish Status'] === 'Draft'
                ? 'border-marigold bg-marigold/15'
                : entry.Status === 'Cancelled'
                ? 'border-ink/20 bg-ink/5 text-ink-muted'
                : 'border-sage bg-sage/15';
          }
          if (isSelected) toneClass += ' ring-2 ring-ink';

          return (
            <button
              key={cell.dateStr}
              type="button"
              onClick={() =>
                entry ? onSelectExisting(entry['Schedule ID']) : onSelectEmpty(cell.dateStr)
              }
              className={`min-h-[64px] sm:min-h-[76px] rounded-card border p-1.5 text-left flex flex-col gap-0.5 transition-colors ${toneClass}`}
            >
              <span className={`text-xs font-mono ${isToday ? 'font-bold text-ink' : 'text-ink-light'}`}>
                {cell.date.getDate()}
              </span>
              {entry && (
                <span className="text-[11px] leading-tight text-ink font-medium line-clamp-2">
                  {entry['Publish Status'] === 'Draft' ? 'Draft' : entry.Status}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-4 text-xs text-ink-muted flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sage inline-block" /> Published</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-marigold inline-block" /> Draft</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-ink/20 inline-block" /> Cancelled</span>
        <span>Click an empty day to add a new date.</span>
      </div>
    </div>
  );
}

function NewScheduleForm({
  userId,
  shakhaId,
  shakha,
  initialDate,
  onCreated,
}: {
  userId: string;
  shakhaId: string;
  shakha: Shakha;
  initialDate?: string | null;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(!!initialDate);
  const [form, setForm] = useState({
    Date: initialDate || '',
    Day: shakha['Day of Week'] || '',
    'Start Time': shakha['Start Time'] || '',
    'End Time': shakha['End Time'] || '',
    Location: shakha.Venue || shakha.Address || '',
    Status: 'Scheduled',
    Notes: '',
    'Day Schedule': '',
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
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Day schedule (optional)</span>
        <p className="text-xs text-ink-muted -mt-1">
          Add each activity as a row — Time, Activity, Responsible, and an optional comment or link.
        </p>
        <DayScheduleTableEditor
          value={form['Day Schedule']}
          onChange={(v) => setForm({ ...form, 'Day Schedule': v })}
        />
      </div>

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

function EditScheduleDetails({
  userId,
  shakhaId,
  entry,
  onSaved,
}: {
  userId: string;
  shakhaId: string;
  entry: ScheduleEntry;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    Date: entry.Date,
    Day: entry.Day,
    'Start Time': entry['Start Time'],
    'End Time': entry['End Time'],
    Location: entry.Location,
    Status: entry.Status,
    Notes: entry.Notes,
    'Day Schedule': entry['Day Schedule'] || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSubmitting(true);
    setSaved(false);
    setError('');
    try {
      await callHssApi('coordinatorUpsertSchedule', {
        userId,
        shakhaId,
        scheduleId: entry['Schedule ID'],
        ...form,
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof HssApiError ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-marigold-dark underline underline-offset-2 self-start">
        Edit this date's details
      </button>
    );
  }

  return (
    <div className="bg-paper-raised rounded-card border border-ink/10 p-5 sm:p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-ink">Edit date details</h3>
        <button onClick={() => setOpen(false)} className="text-sm text-ink-light underline underline-offset-2">
          Close
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Date</span>
          <input type="date" value={form.Date} onChange={(e) => setForm({ ...form, Date: e.target.value })} className="input" />
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
        <span className="text-sm font-medium text-ink">Status</span>
        <select
          value={form.Status}
          onChange={(e) => setForm({ ...form, Status: e.target.value as ScheduleEntry['Status'] })}
          className="input"
        >
          <option value="Scheduled">Scheduled</option>
          <option value="Special Event">Special Event</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Completed">Completed</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Notes</span>
        <input value={form.Notes} onChange={(e) => setForm({ ...form, Notes: e.target.value })} className="input" />
      </label>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Day schedule</span>
        <p className="text-xs text-ink-muted -mt-1">
          Add each activity as a row — Time, Activity, Responsible, and an optional comment or link.
        </p>
        <DayScheduleTableEditor
          value={form['Day Schedule']}
          onChange={(v) => setForm({ ...form, 'Day Schedule': v })}
        />
      </div>

      {error && <p className="text-sm text-vermilion">{error}</p>}

      <button onClick={handleSave} disabled={submitting} className="btn-primary self-start">
        {submitting ? 'Saving…' : 'Save details'}
      </button>
      {saved && !submitting && <p className="text-sm text-sage">Saved.</p>}
    </div>
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ activityTime: '', activityName: '', responsiblePerson: '', remarks: '' });

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

  function handleStartEdit(a: ScheduleActivity) {
    setEditingId(a['Activity Row ID']);
    setEditForm({
      activityTime: a['Activity Time'],
      activityName: a['Activity Name'],
      responsiblePerson: a['Responsible Person'],
      remarks: a['Remarks'] || '',
    });
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    await callHssApi('updateScheduleActivity', {
      userId,
      shakhaId,
      activityRowId: editingId,
      ...editForm,
    });
    setEditingId(null);
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
          Run of show — {formatDisplayDate(entry.Date)}
        </h3>
        {entry['Publish Status'] === 'Draft' && (
          <button onClick={handlePublish} className="btn-primary">Publish</button>
        )}
      </div>

      {activities.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="pb-2 pr-2 font-medium">Time</th>
                <th className="pb-2 pr-2 font-medium">Activity</th>
                <th className="pb-2 pr-2 font-medium">Responsible</th>
                <th className="pb-2 pr-2 font-medium">Comments</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {activities.map((a) =>
                editingId === a['Activity Row ID'] ? (
                  <tr key={a['Activity Row ID']} className="border-t border-ink/10 bg-marigold/5">
                    <td className="py-2 pr-2">
                      <input
                        value={editForm.activityTime}
                        onChange={(e) => setEditForm({ ...editForm, activityTime: e.target.value })}
                        className="input w-24"
                        placeholder="10:30"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        value={editForm.activityName}
                        onChange={(e) => setEditForm({ ...editForm, activityName: e.target.value })}
                        className="input w-full"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        value={editForm.responsiblePerson}
                        onChange={(e) => setEditForm({ ...editForm, responsiblePerson: e.target.value })}
                        className="input w-full"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        value={editForm.remarks}
                        onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                        className="input w-full"
                        placeholder="Optional comment or link"
                      />
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button onClick={handleSaveEdit} className="text-xs text-sage underline underline-offset-2 mr-3">
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-ink-light underline underline-offset-2"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={a['Activity Row ID']} className="border-t border-ink/10">
                    <td className="py-2 pr-3 font-mono text-ink-light whitespace-nowrap">{formatDisplayTime(a['Activity Time'])}</td>
                    <td className="py-2 pr-3 text-ink font-medium">{a['Activity Name']}</td>
                    <td className="py-2 pr-3 text-ink-light">{a['Responsible Person']}</td>
                    <td className="py-2 pr-3 text-ink-light">{a['Remarks'] || '—'}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleStartEdit(a)}
                        className="text-xs text-ink-light underline underline-offset-2 mr-3"
                      >
                        Edit
                      </button>
                      <button onClick={() => handleRemove(a['Activity Row ID'])} className="text-xs text-vermilion underline underline-offset-2">
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {otherEntries.length > 0 && (
        <div className="flex gap-2 items-center">
          <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className="input flex-1">
            <option value="">Copy activities from…</option>
            {otherEntries.map((e) => (
              <option key={e['Schedule ID']} value={e['Schedule ID']}>{formatDisplayDate(e.Date)}</option>
            ))}
          </select>
          <button onClick={handleCopy} className="btn-primary whitespace-nowrap">Copy</button>
        </div>
      )}

      <form onSubmit={handleAdd} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
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
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink">Comments</span>
          <input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className="input" placeholder="Optional" />
        </label>
        <button type="submit" className="btn-primary">Add</button>
      </form>

      {error && <p className="text-sm text-vermilion">{error}</p>}
    </div>
  );
}
