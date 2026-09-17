import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import NextShakhaCard from '@/components/NextShakhaCard';
import ActivitiesCard from '@/components/ActivitiesCard';
import ProfileCard from '@/components/ProfileCard';
import AddParticipantForm from '@/components/AddParticipantForm';
import ScheduleActivitiesTable from '@/components/ScheduleActivitiesTable';
import ShakhaLeadersCard from '@/components/ShakhaLeadersCard';
import VisitRequestForm from '@/components/VisitRequestForm';
import { setSessionUser, clearSessionUser } from '@/components/UserMenu';
import { callHssApi, HssApiError } from '@/lib/hssApi';
import { formatDisplayDate } from '@/lib/format';
import {
  AttendanceResponse,
  DashboardBundle,
  Shakha,
  ShakhaPreview,
  User,
} from '@/lib/types';

type View = 'loading' | 'login' | 'register' | 'dashboard';
type Section = 'next' | 'activities' | 'pramukhs' | 'profile' | 'participants';

const SESSION_KEY = 'hss_user_id';

export default function MyShakhaPage() {
  const [view, setView] = useState<View>('loading');
  const [dashboard, setDashboard] = useState<DashboardBundle | null>(null);

  useEffect(() => {
    const savedUserId = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
    if (savedUserId) {
      loadDashboard(savedUserId);
    } else {
      setView('login');
    }
  }, []);

  async function loadDashboard(userId: string) {
    try {
      const data = await callHssApi<DashboardBundle>('getMyDashboard', { userId });
      setDashboard(data);
      setView('dashboard');
      // Keeps the header's name + Sign out in sync on every page.
      setSessionUser(userId, data.user['Full Name']);
    } catch (err) {
      clearSessionUser();
      setView('login');
    }
  }

  return (
    <Layout>
      <div
        className={
          view === 'dashboard'
            ? 'max-w-5xl mx-auto px-4 sm:px-6 py-12'
            : 'max-w-2xl mx-auto px-4 sm:px-6 py-12'
        }
      >
        {view === 'loading' && <p className="text-ink-muted">Loading…</p>}

        {view === 'login' && (
          <LoginForm
            onSuccess={loadDashboard}
            onSwitchToRegister={() => setView('register')}
          />
        )}

        {view === 'register' && (
          <RegisterForm
            onSuccess={loadDashboard}
            onSwitchToLogin={() => setView('login')}
          />
        )}

        {view === 'dashboard' && dashboard && (
          <Dashboard
            dashboard={dashboard}
            onRefresh={() => loadDashboard(dashboard.user['User ID'])}
          />
        )}
      </div>
    </Layout>
  );
}

function LoginForm({
  onSuccess,
  onSwitchToRegister,
}: {
  onSuccess: (userId: string) => void;
  onSwitchToRegister: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const user = await callHssApi<User>('login', { email, password });
      onSuccess(user['User ID']);
    } catch (err) {
      setError(err instanceof HssApiError ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="text-2xl font-display font-semibold text-ink">My Shakha</h1>
      <p className="text-ink-muted text-sm">Sign in to view your Shakha and confirm attendance.</p>

      <Field label="Email">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
      </Field>
      <Field label="Password">
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
      </Field>

      {error && <p className="text-sm text-vermilion">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>

      <button
        type="button"
        onClick={onSwitchToRegister}
        className="text-sm text-ink-light underline underline-offset-2"
      >
        New here? Create an account
      </button>
    </form>
  );
}

function RegisterForm({
  onSuccess,
  onSwitchToLogin,
}: {
  onSuccess: (userId: string) => void;
  onSwitchToLogin: () => void;
}) {
  const [shakhas, setShakhas] = useState<Shakha[]>([]);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    shakhaId: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    country: '',
    emergencyContact: '',
  });
  const [gdprConsent, setGdprConsent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    callHssApi<Shakha[]>('getShakhas').then(setShakhas).catch(() => setShakhas([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gdprConsent) {
      setError('Please review and accept the consent statement to continue.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await callHssApi<{ userId: string }>('registerUser', {
        ...form,
        gdprConsent: true,
      });
      onSuccess(result.userId);
    } catch (err) {
      setError(err instanceof HssApiError ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="text-2xl font-display font-semibold text-ink">Create your account</h1>

      <Field label="Full name">
        <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input" />
      </Field>
      <Field label="Email">
        <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
      </Field>
      <Field label="Phone">
        <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
      </Field>
      <Field label="Password">
        <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of birth">
          <input
            type="date"
            required
            value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Gender">
          <select
            required
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className="input"
          >
            <option value="">Select…</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </Field>
      </div>
      <p className="text-xs text-ink-muted -mt-2">
        Date of birth and gender are required — they're how the system works out
        Shakha participation composition automatically, instead of a coordinator
        having to estimate and count it by hand.
      </p>
      <Field label="Shakha">
        <select
          required
          value={form.shakhaId}
          onChange={(e) => setForm({ ...form, shakhaId: e.target.value })}
          className="input"
        >
          <option value="">Select your Shakha…</option>
          {shakhas.map((s) => (
            <option key={s['Shakha ID']} value={s['Shakha ID']}>
              {s['Shakha Name']} — {s.Area} ({s['Day of Week']}s)
            </option>
          ))}
        </select>
      </Field>
      <Field label="Address (optional)">
        <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Country (optional)">
          <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input" />
        </Field>
        <Field label="Emergency contact (optional)">
          <input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} className="input" />
        </Field>
      </div>

      <label className="flex items-start gap-3 bg-paper-raised rounded-card border border-ink/10 p-4">
        <input type="checkbox" checked={gdprConsent} onChange={(e) => setGdprConsent(e.target.checked)} className="mt-1" />
        <span className="text-sm text-ink-light leading-relaxed">
          I consent to HSS storing and processing my personal information for the
          purpose of Shakha administration, communication, participation tracking
          and community activities, in accordance with applicable GDPR requirements.
        </span>
      </label>

      {error && <p className="text-sm text-vermilion">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? 'Creating account…' : 'Create account'}
      </button>

      <button
        type="button"
        onClick={onSwitchToLogin}
        className="text-sm text-ink-light underline underline-offset-2"
      >
        Already have an account? Sign in
      </button>
    </form>
  );
}

const NAV_ITEMS: { key: Section; label: string }[] = [
  { key: 'next', label: 'Next Shakha' },
  { key: 'activities', label: 'Activities' },
  { key: 'pramukhs', label: 'Pramukhs' },
  { key: 'profile', label: 'My Profile' },
  { key: 'participants', label: 'My Participants' },
];

// Repository pages are separate routes, not in-page sections, so they're
// rendered as links inside the same nav column rather than as NAV_ITEMS.
const REPOSITORY_LINKS: { href: string; label: string }[] = [
  { href: '/baudhik', label: 'Baudhik Repository' },
  { href: '/khel', label: 'Khel Repository' },
];

function Dashboard({
  dashboard,
  onRefresh,
}: {
  dashboard: DashboardBundle;
  onRefresh: () => void;
}) {
  const { user, shakha, nextSchedule, scheduleActivities, participants, attendance } = dashboard;
  const [section, setSection] = useState<Section>('next');
  const [addingParticipant, setAddingParticipant] = useState(false);

  // --- Shakha switcher -------------------------------------------------
  // The person's own Shakha is the default. "Select Shakha" reveals a
  // dropdown of every active Shakha; picking a different one loads that
  // Shakha's schedule and lets them say they plan to attend it, without
  // changing which Shakha they're actually registered with (that's a
  // bigger action — a transfer — and stays a separate flow).
  const homeShakhaId = shakha?.['Shakha ID'] || '';
  const [picking, setPicking] = useState(false);
  const [shakhas, setShakhas] = useState<Shakha[]>([]);
  const [viewingId, setViewingId] = useState(homeShakhaId);
  const [preview, setPreview] = useState<ShakhaPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const viewingHome = viewingId === homeShakhaId;

  useEffect(() => {
    if (!picking || shakhas.length > 0) return;
    callHssApi<Shakha[]>('getShakhas').then(setShakhas).catch(() => setShakhas([]));
  }, [picking, shakhas.length]);

  useEffect(() => {
    if (viewingHome || !viewingId) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    callHssApi<ShakhaPreview>('getShakhaPreview', { shakhaId: viewingId })
      .then(setPreview)
      .catch(() => setPreview(null))
      .finally(() => setPreviewLoading(false));
  }, [viewingId, viewingHome]);

  const initialResponses: Record<string, AttendanceResponse> = {};
  attendance.forEach((a) => {
    initialResponses[a['Participant ID']] = a['Attendance Response'];
  });

  async function handleAttendanceSubmit(responses: Record<string, AttendanceResponse>) {
    if (!nextSchedule) return;
    await callHssApi('submitAttendance', {
      scheduleId: nextSchedule['Schedule ID'],
      userId: user['User ID'],
      responses: Object.entries(responses).map(([participantId, response]) => ({
        participantId,
        response,
      })),
    });
    onRefresh();
  }

  const displayedShakha = viewingHome ? shakha : preview?.shakha ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs font-mono uppercase tracking-wide text-marigold-dark">
            {viewingHome ? 'My Shakha' : 'Viewing Shakha'}
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-display font-semibold text-ink">
              {displayedShakha?.['Shakha Name'] || 'Your Shakha'}
            </h1>
            {!picking && (
              <button
                onClick={() => setPicking(true)}
                className="text-sm text-marigold-dark underline underline-offset-2 whitespace-nowrap"
              >
                Select Shakha
              </button>
            )}
          </div>

          {picking && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <select
                value={viewingId}
                onChange={(e) => setViewingId(e.target.value)}
                className="input w-auto"
              >
                {shakhas.length === 0 && <option value={homeShakhaId}>Loading…</option>}
                {shakhas.map((s) => (
                  <option key={s['Shakha ID']} value={s['Shakha ID']}>
                    {s['Shakha Name']} — {s.Area}
                    {s['Shakha ID'] === homeShakhaId ? ' (mine)' : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setPicking(false);
                  setViewingId(homeShakhaId);
                }}
                className="text-sm text-ink-light underline underline-offset-2"
              >
                {viewingHome ? 'Close' : 'Back to my Shakha'}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Viewing someone else's Shakha: schedule + pramukhs + attend option. */}
      {!viewingHome && (
        <>
          {previewLoading && <p className="text-ink-muted text-sm">Loading…</p>}

          {!previewLoading && preview && (
            <div className="flex flex-col gap-6">
              <div className="bg-paper-raised rounded-card border border-ink/10 p-5 sm:p-6">
                <p className="text-sm text-ink-muted">
                  {[preview.shakha.Area, preview.shakha.City].filter(Boolean).join(' · ')}
                </p>
                <p className="text-sm text-ink mt-2">
                  Meets {preview.shakha['Day of Week']}s, {preview.shakha['Start Time']}–
                  {preview.shakha['End Time']}
                </p>
                <p className="text-sm text-ink-muted mt-1">
                  {preview.shakha.Venue || preview.shakha.Address}
                </p>
                {preview.shakha['Map Link'] && (
                  <a
                    href={preview.shakha['Map Link']}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 text-sm text-marigold-dark underline underline-offset-2"
                  >
                    Open in Maps
                  </a>
                )}
              </div>

              {preview.nextSchedule ? (
                <div className="bg-ink text-paper rounded-card p-5 sm:p-6">
                  <p className="text-xs font-mono uppercase tracking-wide text-marigold mb-1">
                    Next Session
                  </p>
                  <p className="text-lg font-display font-semibold">
                    {formatDisplayDate(preview.nextSchedule.Date)} ·{' '}
                    {preview.nextSchedule['Start Time']}–{preview.nextSchedule['End Time']}
                  </p>
                  <p className="text-sm opacity-80 mt-1">{preview.nextSchedule.Location}</p>
                </div>
              ) : (
                <p className="text-ink-muted text-sm">
                  No upcoming session is published for this Shakha yet.
                </p>
              )}

              {preview.scheduleActivities.length > 0 && (
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink mb-3">Schedule</h3>
                  <ScheduleActivitiesTable activities={preview.scheduleActivities} />
                </div>
              )}

              <ShakhaLeadersCard shakhaId={viewingId} />

              <VisitRequestForm
                shakhaId={viewingId}
                shakhaName={preview.shakha['Shakha Name']}
                sessionDate={preview.nextSchedule ? preview.nextSchedule.Date : ''}
                defaultName={user['Full Name']}
                defaultEmail={user.Email}
                defaultPhone={user.Phone}
              />
            </div>
          )}
        </>
      )}

      {/* Own Shakha: the full dashboard. */}
      {viewingHome && (
        <div className="flex flex-col sm:flex-row gap-6">
          <nav className="sm:w-52 flex-shrink-0">
            <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSection(item.key)}
                  className={`text-left px-4 py-2.5 rounded-card whitespace-nowrap text-sm font-medium transition-colors ${
                    section === item.key
                      ? 'bg-ink text-paper'
                      : 'text-ink-light hover:bg-paper-raised'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {REPOSITORY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-left px-4 py-2.5 rounded-card whitespace-nowrap text-sm font-medium text-ink-light hover:bg-paper-raised transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {section === 'next' && (
              <>
                <NextShakhaCard
                  shakha={shakha}
                  schedule={nextSchedule}
                  participants={participants}
                  initialResponses={initialResponses}
                  onSubmitAttendance={handleAttendanceSubmit}
                />

                {nextSchedule && scheduleActivities.length > 0 && (
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink mb-3">Schedule</h3>
                    <ScheduleActivitiesTable activities={scheduleActivities} />
                  </div>
                )}
              </>
            )}

            {section === 'activities' && (
              <ActivitiesCard userId={user['User ID']} participants={participants} />
            )}

            {section === 'pramukhs' && (
              <ShakhaLeadersCard shakhaId={homeShakhaId} shakhaName={shakha?.['Shakha Name']} />
            )}

            {section === 'profile' && <ProfileCard user={user} onUpdated={onRefresh} />}

            {section === 'participants' && (
              <>
                <div className="bg-paper-raised rounded-card border border-ink/10 p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-lg font-semibold text-ink">My Participants</h3>
                    {!addingParticipant && (
                      <button
                        onClick={() => setAddingParticipant(true)}
                        className="text-sm text-marigold-dark underline underline-offset-2"
                      >
                        + Add Participant
                      </button>
                    )}
                  </div>
                  <ul className="flex flex-col gap-2">
                    {participants.map((p) => (
                      <li key={p['Participant ID']} className="flex justify-between text-sm">
                        <span className="text-ink">{p['Participant Name']}</span>
                        <span className="text-ink-muted">{p.Relationship}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {addingParticipant && (
                  <AddParticipantForm
                    userId={user['User ID']}
                    onAdded={() => {
                      setAddingParticipant(false);
                      onRefresh();
                    }}
                    onCancel={() => setAddingParticipant(false)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
