import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import NextShakhaCard from '@/components/NextShakhaCard';
import ActivitiesCard from '@/components/ActivitiesCard';
import ProfileCard from '@/components/ProfileCard';
import AddParticipantForm from '@/components/AddParticipantForm';
import ScheduleActivitiesTable from '@/components/ScheduleActivitiesTable';
import { callHssApi, HssApiError } from '@/lib/hssApi';
import {
  AttendanceResponse,
  DashboardBundle,
  Shakha,
  User,
} from '@/lib/types';

type View = 'loading' | 'login' | 'register' | 'dashboard';

const SESSION_KEY = 'hss_user_id';

export default function MyShakhaPage() {
  const [view, setView] = useState<View>('loading');
  const [dashboard, setDashboard] = useState<DashboardBundle | null>(null);
  const [error, setError] = useState('');

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
      localStorage.setItem(SESSION_KEY, userId);
    } catch (err) {
      localStorage.removeItem(SESSION_KEY);
      setView('login');
    }
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    setDashboard(null);
    setView('login');
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
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
            onLogout={handleLogout}
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
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Password">
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
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
        <input
          required
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          className="input"
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="input"
        />
      </Field>
      <Field label="Phone">
        <input
          required
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="input"
        />
      </Field>
      <Field label="Password">
        <input
          type="password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="input"
        />
      </Field>
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
        <input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="input"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Country (optional)">
          <input
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Emergency contact (optional)">
          <input
            value={form.emergencyContact}
            onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
            className="input"
          />
        </Field>
      </div>

      <label className="flex items-start gap-3 bg-paper-raised rounded-card border border-ink/10 p-4">
        <input
          type="checkbox"
          checked={gdprConsent}
          onChange={(e) => setGdprConsent(e.target.checked)}
          className="mt-1"
        />
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

function Dashboard({
  dashboard,
  onLogout,
  onRefresh,
}: {
  dashboard: DashboardBundle;
  onLogout: () => void;
  onRefresh: () => void;
}) {
  const { user, shakha, nextSchedule, scheduleActivities, participants, attendance, isCoordinator } = dashboard;
  const [addingParticipant, setAddingParticipant] = useState(false);

  const initialResponses: Record<string, AttendanceResponse> = {};
  attendance.forEach((a) => {
    initialResponses[a['Participant ID']] = a['Attendance Response'];
  });

  async function handleSubmit(responses: Record<string, AttendanceResponse>) {
    if (!nextSchedule) return;
    await callHssApi('submitAttendance', {
      scheduleId: nextSchedule['Schedule ID'],
      userId: user['User ID'],
      responses: Object.entries(responses).map(([participantId, response]) => ({
        participantId,
        response,
      })),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wide text-marigold-dark">
            My Shakha
          </p>
          <h1 className="text-2xl font-display font-semibold text-ink">
            {shakha?.['Shakha Name'] || 'Your Shakha'}
          </h1>
        </div>
        <button onClick={onLogout} className="text-sm text-ink-light underline underline-offset-2">
          Sign out
        </button>
      </div>

      {isCoordinator && (
        <Link
          href="/coordinator"
          className="flex items-center justify-between bg-ink text-paper rounded-card px-5 py-4"
        >
          <span className="font-medium">Shakha Coordinator Dashboard</span>
          <span aria-hidden="true">→</span>
        </Link>
      )}

      <NextShakhaCard
        shakha={shakha}
        schedule={nextSchedule}
        participants={participants}
        initialResponses={initialResponses}
        onSubmitAttendance={async (r) => {
          await handleSubmit(r);
          onRefresh();
        }}
      />

      <ActivitiesCard userId={user['User ID']} participants={participants} />

      {nextSchedule && scheduleActivities.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-semibold text-ink mb-3">Schedule</h3>
          <ScheduleActivitiesTable activities={scheduleActivities} />
        </div>
      )}

      <ProfileCard user={user} onUpdated={onRefresh} />

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
