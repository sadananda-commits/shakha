import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import BookReadingStats from '@/components/BookReadingStats';
import { callHssApi, HssApiError } from '@/lib/hssApi';
import { AdminSummary, AreaOverviewRow, Participant } from '@/lib/types';

const SESSION_KEY = 'hss_admin_email';

export default function AdminPage() {
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
    if (saved) setAdminEmail(saved);
  }, []);

  if (!adminEmail) {
    return (
      <Layout>
        <div className="max-w-sm mx-auto px-4 sm:px-6 py-16">
          <AdminLoginForm
            onSuccess={(email) => {
              localStorage.setItem(SESSION_KEY, email);
              setAdminEmail(email);
            }}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <AdminDashboard
          onLogout={() => {
            localStorage.removeItem(SESSION_KEY);
            setAdminEmail(null);
          }}
        />
      </div>
    </Layout>
  );
}

function AdminLoginForm({ onSuccess }: { onSuccess: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await callHssApi('adminLogin', { email, password });
      onSuccess(email);
    } catch (err) {
      setError(err instanceof HssApiError ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="text-2xl font-display font-semibold text-ink">Admin Login</h1>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Password</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
      </label>
      {error && <p className="text-sm text-vermilion">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [areas, setAreas] = useState<AreaOverviewRow[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Participant[]>([]);

  useEffect(() => {
    callHssApi<AdminSummary>('getAdminSummary').then(setSummary).catch(() => {});
    callHssApi<AreaOverviewRow[]>('getAreaOverview').then(setAreas).catch(() => {});
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    try {
      const rows = await callHssApi<Participant[]>('searchParticipants', { query });
      setResults(rows);
    } catch {
      setResults([]);
    }
  }

  const cards = summary
    ? [
        { label: 'Total Users', value: summary.totalUsers },
        { label: 'Total Participants', value: summary.totalParticipants },
        { label: 'Total Shakhas', value: summary.totalShakhas },
        { label: 'Total Areas', value: summary.totalAreas },
        { label: 'Confirmed for Next Shakha', value: summary.confirmedForNextShakha, accent: 'sage' },
        { label: 'Not Attending', value: summary.notAttending, accent: 'vermilion' },
        { label: 'Not Sure', value: summary.notSure, accent: 'marigold' },
        { label: 'No Response', value: summary.noResponse },
      ]
    : [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-semibold text-ink">Admin Dashboard</h1>
        <button onClick={onLogout} className="text-sm text-ink-light underline underline-offset-2">
          Sign out
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-paper-raised rounded-card border border-ink/10 p-4">
            <p
              className={`text-2xl font-display font-semibold ${
                c.accent === 'sage'
                  ? 'text-sage'
                  : c.accent === 'vermilion'
                  ? 'text-vermilion'
                  : c.accent === 'marigold'
                  ? 'text-marigold-dark'
                  : 'text-ink'
              }`}
            >
              {c.value}
            </p>
            <p className="text-xs text-ink-muted mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-display font-semibold text-ink mb-3">
          Denmark-Wide Overview
        </h2>
        <div className="overflow-x-auto rounded-card border border-ink/10">
          <table className="w-full text-sm">
            <thead className="bg-paper-raised text-ink-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2">Area</th>
                <th className="text-right px-4 py-2">Shakhas</th>
                <th className="text-right px-4 py-2">Participants</th>
                <th className="text-right px-4 py-2">Confirmed</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((a) => (
                <tr key={a.area} className="border-t border-ink/10">
                  <td className="px-4 py-2 text-ink">{a.area}</td>
                  <td className="px-4 py-2 text-right">{a.shakhas}</td>
                  <td className="px-4 py-2 text-right">{a.participants}</td>
                  <td className="px-4 py-2 text-right">{a.confirmed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BookReadingStats />

      <div>
        <h2 className="text-lg font-display font-semibold text-ink mb-3">
          Search Participants
        </h2>
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or Participant ID…"
            className="input"
          />
          <button type="submit" className="btn-primary whitespace-nowrap">
            Search
          </button>
        </form>

        {results.length > 0 && (
          <div className="overflow-x-auto rounded-card border border-ink/10">
            <table className="w-full text-sm">
              <thead className="bg-paper-raised text-ink-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Shakha</th>
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-left px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((p) => (
                  <tr key={p['Participant ID']} className="border-t border-ink/10">
                    <td className="px-4 py-2 text-ink">{p['Participant Name']}</td>
                    <td className="px-4 py-2 text-ink-light">{p['Shakha Name']}</td>
                    <td className="px-4 py-2 text-ink-light">{p['Participant Type']}</td>
                    <td className="px-4 py-2 text-ink-light">{p['Active Status']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
