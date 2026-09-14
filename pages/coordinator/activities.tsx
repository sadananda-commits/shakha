import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { callHssApi, HssApiError } from '@/lib/hssApi';
import { formatDisplayDate } from '@/lib/format';
import { CommunityActivity, DashboardBundle, Shakha } from '@/lib/types';

const SESSION_KEY = 'hss_user_id';
const ACTIVITY_TYPES = ['Reading Marathon', 'Exercise Marathon', 'Event'];

type FormState = {
  'Activity Name': string;
  Type: string;
  Description: string;
  'Start Date': string;
  'End Date': string;
  'Event Time': string;
  Location: string;
  'Dress Code': string;
  'Day Schedule': string;
};

const EMPTY_FORM: FormState = {
  'Activity Name': '',
  Type: 'Reading Marathon',
  Description: '',
  'Start Date': '',
  'End Date': '',
  'Event Time': '',
  Location: '',
  'Dress Code': '',
  'Day Schedule': '',
};

export default function CoordinatorActivitiesPage() {
  const [status, setStatus] = useState<'loading' | 'denied' | 'ready'>('loading');
  const [userId, setUserId] = useState('');
  const [shakha, setShakha] = useState<Shakha | null>(null);
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
        return loadActivities(savedUserId, dash.shakha['Shakha ID']);
      })
      .then(() => setStatus('ready'))
      .catch(() => setStatus('denied'));
  }, []);

  async function loadActivities(uid: string, shakhaId: string) {
    const rows = await callHssApi<CommunityActivity[]>('getMyCoordinatorActivities', {
      userId: uid,
      shakhaId,
    });
    setActivities(rows);
  }

  function refresh() {
    if (shakha) loadActivities(userId, shakha['Shakha ID']);
  }

  function startNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError('');
  }

  function startEdit(a: CommunityActivity) {
    setEditingId(a['Activity ID']);
    setForm({
      'Activity Name': a['Activity Name'],
      Type: a['Type'],
      Description: a['Description'],
      'Start Date': a['Start Date'],
      'End Date': a['End Date'],
      'Event Time': a['Event Time'] || '',
      Location: a['Location'] || '',
      'Dress Code': a['Dress Code'] || '',
      'Day Schedule': a['Day Schedule'] || '',
    });
    setShowForm(true);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shakha) return;
    setSubmitting(true);
    setError('');
    try {
      await callHssApi('coordinatorUpsertActivity', {
        userId,
        shakhaId: shakha['Shakha ID'],
        activityId: editingId || undefined,
        ...form,
      });
      setShowForm(false);
      refresh();
    } catch (err) {
      setError(err instanceof HssApiError ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
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

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wide text-marigold-dark">
              Manage Activities
            </p>
            <h1 className="text-2xl font-display font-semibold text-ink">{shakha['Shakha Name']}</h1>
          </div>
          <Link href="/coordinator" className="text-sm text-ink-light underline underline-offset-2">
            ← Back to dashboard
          </Link>
        </div>

        {!showForm && (
          <button onClick={startNew} className="btn-primary self-start">
            + New Activity
          </button>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-paper-raised rounded-card border border-ink/10 p-5 sm:p-6 flex flex-col gap-3">
            <h3 className="font-display font-semibold text-ink">
              {editingId ? 'Edit activity' : 'New activity'}
            </h3>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">Type</span>
              <select
                value={form.Type}
                onChange={(e) => setForm({ ...form, Type: e.target.value })}
                className="input"
                disabled={!!editingId}
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">Activity name</span>
              <input
                required
                value={form['Activity Name']}
                onChange={(e) => setForm({ ...form, 'Activity Name': e.target.value })}
                className="input"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">Description</span>
              <input
                value={form.Description}
                onChange={(e) => setForm({ ...form, Description: e.target.value })}
                className="input"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink">Start date</span>
                <input
                  type="date"
                  required
                  value={form['Start Date']}
                  onChange={(e) => setForm({ ...form, 'Start Date': e.target.value })}
                  className="input"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink">End date</span>
                <input
                  type="date"
                  required
                  value={form['End Date']}
                  onChange={(e) => setForm({ ...form, 'End Date': e.target.value })}
                  className="input"
                />
              </label>
            </div>

            {form.Type === 'Event' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-ink">Event time</span>
                    <input
                      value={form['Event Time']}
                      onChange={(e) => setForm({ ...form, 'Event Time': e.target.value })}
                      className="input"
                      placeholder="10:00 AM"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-ink">Location</span>
                    <input
                      value={form.Location}
                      onChange={(e) => setForm({ ...form, Location: e.target.value })}
                      className="input"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink">Dress code</span>
                  <input
                    value={form['Dress Code']}
                    onChange={(e) => setForm({ ...form, 'Dress Code': e.target.value })}
                    className="input"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink">Day schedule</span>
                  <p className="text-xs text-ink-muted -mt-1">One line per activity, e.g. "10:00 Registration"</p>
                  <textarea
                    value={form['Day Schedule']}
                    onChange={(e) => setForm({ ...form, 'Day Schedule': e.target.value })}
                    className="input min-h-[120px] font-mono text-sm"
                  />
                </label>
              </>
            )}

            {error && <p className="text-sm text-vermilion">{error}</p>}

            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Create activity'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-ink-light underline underline-offset-2"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="flex flex-col gap-2">
          {activities.map((a) => (
            <button
              key={a['Activity ID']}
              onClick={() => startEdit(a)}
              className="text-left rounded-card border border-ink/10 bg-paper-raised hover:border-ink/25 p-4 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-ink">{a['Activity Name']}</span>
                <span className="flex gap-2 flex-shrink-0">
                  <Badge text={a['Type']} />
                  <Badge
                    text={a['Status']}
                    tone={a['Status'] === 'Ongoing' ? 'sage' : a['Status'] === 'Upcoming' ? 'marigold' : 'ink'}
                  />
                </span>
              </div>
              <p className="text-sm text-ink-light mt-1">
                {formatDisplayDate(a['Start Date'])} – {formatDisplayDate(a['End Date'])}
              </p>
            </button>
          ))}
          {activities.length === 0 && (
            <p className="text-ink-muted text-sm">No activities yet — create one above.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Badge({ text, tone = 'ink' }: { text: string; tone?: 'ink' | 'marigold' | 'sage' }) {
  const toneClass =
    tone === 'marigold' ? 'bg-marigold/15 text-marigold-dark' :
    tone === 'sage' ? 'bg-sage/15 text-sage' :
    'bg-ink/10 text-ink-light';
  return <span className={`text-xs font-mono px-2 py-0.5 rounded whitespace-nowrap ${toneClass}`}>{text}</span>;
}
