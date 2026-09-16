import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DashboardSidebar, { SidebarItem } from '@/components/DashboardSidebar';
import BookReadingStats from '@/components/BookReadingStats';
import ParticipationStats from '@/components/ParticipationStats';
import { callHssApi, HssApiError } from '@/lib/hssApi';
import {
  AdminSummary,
  AreaOverviewRow,
  CountryParticipationStatsBundle,
  Participant,
  Shakha,
  ShakhaOverviewCard,
} from '@/lib/types';

const SESSION_KEY = 'hss_admin_email';

type Section = 'overview' | 'summary' | 'areas' | 'reading' | 'participation' | 'search';

export default function AdminPage() {
  const [status, setStatus] = useState<'checking' | 'loggedOut' | 'loggedIn'>('checking');
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
    if (!saved) {
      setStatus('loggedOut');
      return;
    }
    // Re-verify against the backend on every load — a leftover or
    // manually-set localStorage value must never grant access on its own.
    callHssApi('getAdminSummary', { adminEmail: saved })
      .then(() => {
        setAdminEmail(saved);
        setStatus('loggedIn');
      })
      .catch(() => {
        localStorage.removeItem(SESSION_KEY);
        setStatus('loggedOut');
      });
  }, []);

  if (status === 'checking') {
    return (
      <Layout>
        <div className="max-w-sm mx-auto px-4 sm:px-6 py-16 text-ink-muted">Loading…</div>
      </Layout>
    );
  }

  if (status === 'loggedOut' || !adminEmail) {
    return (
      <Layout>
        <div className="max-w-sm mx-auto px-4 sm:px-6 py-16">
          <AdminLoginForm
            onSuccess={(email) => {
              localStorage.setItem(SESSION_KEY, email);
              setAdminEmail(email);
              setStatus('loggedIn');
            }}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <AdminDashboard
          adminEmail={adminEmail}
          onLogout={() => {
            localStorage.removeItem(SESSION_KEY);
            setAdminEmail(null);
            setStatus('loggedOut');
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
      <p className="text-xs text-ink-muted -mt-1">
        Signing into My Shakha with the same credentials also gives Admins full
        Coordinator access — pick any Shakha from the picker on that page.
      </p>
    </form>
  );
}

function AdminDashboard({ adminEmail, onLogout }: { adminEmail: string; onLogout: () => void }) {
  const [section, setSection] = useState<Section>('overview');

  // Overview (default)
  const [overviewCards, setOverviewCards] = useState<ShakhaOverviewCard[] | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // Summary counts
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Areas
  const [areas, setAreas] = useState<AreaOverviewRow[] | null>(null);
  const [areasLoading, setAreasLoading] = useState(false);

  // Participation
  const [shakhas, setShakhas] = useState<Shakha[]>([]);
  const [participationYear, setParticipationYear] = useState(String(new Date().getFullYear()));
  const [participationShakhaId, setParticipationShakhaId] = useState('');
  const [participationArea, setParticipationArea] = useState('');
  const [participationStats, setParticipationStats] = useState<CountryParticipationStatsBundle | null>(null);
  const [participationLoading, setParticipationLoading] = useState(false);

  // Search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Participant[]>([]);

  // Load the default Overview cards once, right away.
  useEffect(() => {
    setOverviewLoading(true);
    callHssApi<ShakhaOverviewCard[]>('getShakhaOverviewCards', { adminEmail })
      .then(setOverviewCards)
      .catch(() => setOverviewCards([]))
      .finally(() => setOverviewLoading(false));
  }, [adminEmail]);

  // Everything else loads only the first time its menu item is opened.
  useEffect(() => {
    if (section === 'summary' && !summary) {
      setSummaryLoading(true);
      callHssApi<AdminSummary>('getAdminSummary', { adminEmail })
        .then(setSummary)
        .catch(() => setSummary(null))
        .finally(() => setSummaryLoading(false));
    }
    if (section === 'areas' && !areas) {
      setAreasLoading(true);
      callHssApi<AreaOverviewRow[]>('getAreaOverview', { adminEmail })
        .then(setAreas)
        .catch(() => setAreas([]))
        .finally(() => setAreasLoading(false));
    }
    if (section === 'participation' && shakhas.length === 0) {
      callHssApi<Shakha[]>('getShakhas', { includeInactive: true }).then(setShakhas).catch(() => setShakhas([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  // Participation stats re-fetch whenever the section is open and a filter changes.
  useEffect(() => {
    if (section !== 'participation') return;
    setParticipationLoading(true);
    callHssApi<CountryParticipationStatsBundle>('getCountryParticipationStats', {
      adminEmail,
      year: participationYear,
      shakhaId: participationShakhaId || undefined,
      area: participationArea || undefined,
    })
      .then(setParticipationStats)
      .catch(() => setParticipationStats(null))
      .finally(() => setParticipationLoading(false));
  }, [section, adminEmail, participationYear, participationShakhaId, participationArea]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    try {
      const rows = await callHssApi<Participant[]>('searchParticipants', { adminEmail, query });
      setResults(rows);
    } catch {
      setResults([]);
    }
  }

  const sidebarItems: SidebarItem[] = [
    {
      key: 'overview',
      label: 'Overview',
      description: 'All Shakhas and their next scheduled session date.',
      onClick: () => setSection('overview'),
      active: section === 'overview',
    },
    {
      key: 'summary',
      label: 'Summary Stats',
      description: 'Denmark-wide totals: users, participants, Shakhas, and next-session RSVP counts.',
      onClick: () => setSection('summary'),
      active: section === 'summary',
    },
    {
      key: 'areas',
      label: 'Areas Overview',
      description: 'Shakha and participant counts broken down by Area.',
      onClick: () => setSection('areas'),
      active: section === 'areas',
    },
    {
      key: 'reading',
      label: 'Book Reading Stats',
      description: 'Reading Marathon progress across all Shakhas.',
      onClick: () => setSection('reading'),
      active: section === 'reading',
    },
    {
      key: 'participation',
      label: 'Participation Stats',
      description: 'Weekly attendance, cumulative totals, and category composition — Denmark-wide or per Shakha/Area.',
      onClick: () => setSection('participation'),
      active: section === 'participation',
    },
    {
      key: 'search',
      label: 'Search Participants',
      description: 'Find a participant by name or Participant ID, with filters.',
      onClick: () => setSection('search'),
      active: section === 'search',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-semibold text-ink">Admin Dashboard</h1>
        <button onClick={onLogout} className="text-sm text-ink-light underline underline-offset-2">
          Sign out
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        <DashboardSidebar items={sidebarItems} />

        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {section === 'overview' && (
            <div>
              <h2 className="text-lg font-display font-semibold text-ink mb-3">
                All Shakhas — Next Session
              </h2>
              {overviewLoading && <p className="text-ink-muted text-sm">Loading…</p>}
              {!overviewLoading && overviewCards && overviewCards.length === 0 && (
                <p className="text-ink-muted text-sm">No active Shakhas found.</p>
              )}
              {!overviewLoading && overviewCards && overviewCards.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {overviewCards.map((c) => (
                    <div key={c.shakhaId} className="bg-paper-raised rounded-card border border-ink/10 p-4">
                      <p className="font-display font-semibold text-ink">{c.shakhaName}</p>
                      <p className="text-xs text-ink-muted mt-0.5">{c.area} · {c.dayOfWeek}s</p>
                      <div className="mt-3 pt-3 border-t border-ink/10">
                        {c.nextDate ? (
                          <>
                            <p className="text-xs text-ink-muted uppercase tracking-wide">Next Session</p>
                            <p className="text-sm text-ink font-medium">{c.nextDate}</p>
                            {c.nextStatus && c.nextStatus !== 'Scheduled' && (
                              <p className="text-xs text-vermilion mt-0.5">{c.nextStatus}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-ink-muted">No upcoming session scheduled</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'summary' && (
            <div>
              <h2 className="text-lg font-display font-semibold text-ink mb-3">Summary Stats</h2>
              {summaryLoading && <p className="text-ink-muted text-sm">Loading…</p>}
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Users', value: summary.totalUsers },
                    { label: 'Total Participants', value: summary.totalParticipants },
                    { label: 'Total Shakhas', value: summary.totalShakhas },
                    { label: 'Total Areas', value: summary.totalAreas },
                    { label: 'Confirmed for Next Shakha', value: summary.confirmedForNextShakha, accent: 'sage' },
                    { label: 'Not Attending', value: summary.notAttending, accent: 'vermilion' },
                    { label: 'Not Sure', value: summary.notSure, accent: 'marigold' },
                    { label: 'No Response', value: summary.noResponse },
                  ].map((c) => (
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
              )}
            </div>
          )}

          {section === 'areas' && (
            <div>
              <h2 className="text-lg font-display font-semibold text-ink mb-3">Denmark-Wide Overview</h2>
              {areasLoading && <p className="text-ink-muted text-sm">Loading…</p>}
              {areas && (
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
              )}
            </div>
          )}

          {section === 'reading' && <BookReadingStats />}

          {section === 'participation' && (
            <>
              <ParticipationStats
                title="Denmark-Wide Participation"
                year={participationYear}
                onYearChange={setParticipationYear}
                weekly={participationStats?.weekly ?? []}
                cumulativeTotal={participationStats?.cumulativeTotal ?? 0}
                composition={participationStats?.composition ?? {}}
                loading={participationLoading}
                filters={
                  <>
                    <select
                      value={participationArea}
                      onChange={(e) => setParticipationArea(e.target.value)}
                      className="input w-auto"
                    >
                      <option value="">All Areas</option>
                      {Array.from(new Set(shakhas.map((s) => s.Area))).map((area) => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                    <select
                      value={participationShakhaId}
                      onChange={(e) => setParticipationShakhaId(e.target.value)}
                      className="input w-auto"
                    >
                      <option value="">All Shakhas</option>
                      {shakhas.map((s) => (
                        <option key={s['Shakha ID']} value={s['Shakha ID']}>{s['Shakha Name']}</option>
                      ))}
                    </select>
                  </>
                }
              />

              {participationStats && participationStats.byShakha.length > 0 && (
                <div>
                  <h2 className="text-lg font-display font-semibold text-ink mb-3">
                    Participation by Shakha ({participationYear})
                  </h2>
                  <div className="overflow-x-auto rounded-card border border-ink/10">
                    <table className="w-full text-sm">
                      <thead className="bg-paper-raised text-ink-muted text-xs uppercase tracking-wide">
                        <tr>
                          <th className="text-left px-4 py-2">Shakha</th>
                          <th className="text-right px-4 py-2">Sessions Reported</th>
                          <th className="text-right px-4 py-2">Total Attendance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participationStats.byShakha.map((row) => (
                          <tr key={row.shakhaId} className="border-t border-ink/10">
                            <td className="px-4 py-2 text-ink">{row.shakhaName}</td>
                            <td className="px-4 py-2 text-right text-ink-light">{row.reports}</td>
                            <td className="px-4 py-2 text-right text-ink font-medium">{row.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {section === 'search' && (
            <div>
              <h2 className="text-lg font-display font-semibold text-ink mb-3">Search Participants</h2>
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
          )}
        </div>
      </div>
    </div>
  );
}
