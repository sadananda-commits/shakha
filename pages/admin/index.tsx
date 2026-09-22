import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DashboardSidebar, { SidebarItem } from '@/components/DashboardSidebar';
import ActivityStatsPanel from '@/components/ActivityStatsPanel';
import ParticipationStats from '@/components/ParticipationStats';
import ShakhaLeadersCard from '@/components/ShakhaLeadersCard';
import ScheduleActivitiesTable from '@/components/ScheduleActivitiesTable';
import { setAdminSession } from '@/components/UserMenu';
import { callHssApi, HssApiError } from '@/lib/hssApi';
import { formatDisplayDate } from '@/lib/format';
import {
  AdminSummary,
  AreaOverviewRow,
  CountryParticipationStatsBundle,
  Participant,
  Shakha,
  ShakhaOverviewCard,
  ShakhaPreview,
  User,
} from '@/lib/types';

// TODO(backend): getShakhaOverviewCards should start returning these two
// fields per card. Kept as an intersection here so this file compiles
// whether or not lib/types.ts has been updated yet — once it has, this
// type alias can just become `ShakhaOverviewCard` again.
type OverviewCard = ShakhaOverviewCard & {
  registeredCount?: number;
  avgWeeklyAttendanceYTD?: number;
};

// Shape returned by the new admin-only getShakhaParticipantSummary action.
// Deliberately a separate call from getShakhaPreview (which is public —
// used by the unauthenticated "Find a Shakha" browser) rather than
// smuggled onto it, so participant names are never exposed there.
type ShakhaParticipantSummary = {
  shakhaId: string;
  total: number;
  composition: { key: string; label: string; count: number }[];
  participants: { participantId: string; name: string; age?: number; gender?: string; typeKey: string; typeLabel: string }[];
};

const SESSION_KEY = 'hss_admin_email';

type Section = 'overview' | 'summary' | 'areas' | 'activities' | 'participation' | 'search';

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
        setAdminSession(saved, localStorage.getItem('hss_admin_name') || saved);
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
        <AdminDashboard adminEmail={adminEmail} />
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
      const user = await callHssApi<User>('adminLogin', { email, password });
      setAdminSession(email, user['Full Name']);
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

function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const [section, setSection] = useState<Section>('overview');

  // Overview (default)
  const [overviewCards, setOverviewCards] = useState<OverviewCard[] | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  // Clicking a Shakha card drills into that Shakha's own dashboard view.
  const [drillShakhaId, setDrillShakhaId] = useState('');

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
    callHssApi<OverviewCard[]>('getShakhaOverviewCards', { adminEmail })
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
      key: 'activities',
      label: 'Activity Stats',
      description: 'Drill into any activity and break its numbers down by Shakha, participant type, age, and gender.',
      onClick: () => setSection('activities'),
      active: section === 'activities',
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
    {
      key: 'baudhik-repository',
      label: 'Baudhik Repository',
      description: 'Browse Baudhik session material.',
      href: '/baudhik',
    },
    {
      key: 'khel-repository',
      label: 'Khel Repository',
      description: 'Browse Khel session material.',
      href: '/khel',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-display font-semibold text-ink">Admin Dashboard</h1>

      <div className="flex flex-col sm:flex-row gap-6">
        <DashboardSidebar items={sidebarItems} />

        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {section === 'overview' && drillShakhaId && (
            <ShakhaDrillDown
              shakhaId={drillShakhaId}
              adminEmail={adminEmail}
              onBack={() => setDrillShakhaId('')}
            />
          )}

          {section === 'overview' && !drillShakhaId && (
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
                    <button
                      key={c.shakhaId}
                      onClick={() => setDrillShakhaId(c.shakhaId)}
                      className="text-left bg-paper-raised rounded-card border border-ink/10 p-4 hover:border-marigold transition-colors"
                    >
                      <p className="font-display font-semibold text-ink">{c.shakhaName}</p>
                      <p className="text-xs text-ink-muted mt-0.5">{c.area} · {c.dayOfWeek}s</p>

                      <div className="mt-3 pt-3 border-t border-ink/10 grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-ink-muted uppercase tracking-wide">Registered</p>
                          <p className="text-sm text-ink font-medium">
                            {c.registeredCount ?? '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-ink-muted uppercase tracking-wide">Avg/Week YTD</p>
                          <p className="text-sm text-ink font-medium">
                            {c.avgWeeklyAttendanceYTD != null ? c.avgWeeklyAttendanceYTD.toFixed(1) : '—'}
                          </p>
                        </div>
                      </div>

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
                    </button>
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

          {section === 'activities' && <ActivityStatsPanel adminEmail={adminEmail} />}

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

/**
 * Admin drill-down into a single Shakha: the same "next session" view a
 * participant sees on My Shakha, plus a condensed run-of-show and the
 * Shakha's Pramukhs. Read-only — to actually manage a Shakha, an Admin
 * uses the Coordinator Dashboard's Shakha picker as a super-user.
 */
function ShakhaDrillDown({
  shakhaId,
  adminEmail,
  onBack,
}: {
  shakhaId: string;
  adminEmail: string;
  onBack: () => void;
}) {
  const [preview, setPreview] = useState<ShakhaPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ShakhaParticipantSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [showLeaders, setShowLeaders] = useState(false);
  const [showDetailedList, setShowDetailedList] = useState(false);

  useEffect(() => {
    setLoading(true);
    setShowLeaders(false);
    setShowDetailedList(false);
    callHssApi<ShakhaPreview>('getShakhaPreview', { shakhaId })
      .then(setPreview)
      .catch(() => setPreview(null))
      .finally(() => setLoading(false));

    setSummaryLoading(true);
    callHssApi<ShakhaParticipantSummary>('getShakhaParticipantSummary', { adminEmail, shakhaId })
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  }, [shakhaId, adminEmail]);

  const participants = summary?.participants ?? [];
  const composition = summary?.composition ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <button onClick={onBack} className="text-sm text-ink-light underline underline-offset-2 mb-2">
          ← All Shakhas
        </button>
        <h2 className="text-lg font-display font-semibold text-ink">
          {preview?.shakha['Shakha Name'] || 'Shakha'}
        </h2>
        {preview && (
          <p className="text-sm text-ink-muted mt-0.5">
            {[preview.shakha.Area, preview.shakha.City].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {loading && <p className="text-ink-muted text-sm">Loading…</p>}

      {!loading && !preview && (
        <p className="text-ink-muted text-sm">Couldn't load this Shakha.</p>
      )}

      {!loading && preview && (
        <>
          <div className="bg-paper-raised rounded-card border border-ink/10 p-5">
            <p className="text-sm text-ink">
              Meets {preview.shakha['Day of Week']}s, {preview.shakha['Start Time']}–
              {preview.shakha['End Time']}
            </p>
            <p className="text-sm text-ink-muted mt-1">
              {preview.shakha.Venue || preview.shakha.Address}
            </p>
            {preview.shakha['Coordinator Name'] && (
              <p className="text-sm text-ink-muted mt-1">
                Coordinator: {preview.shakha['Coordinator Name']}
                {preview.shakha['Coordinator Contact']
                  ? ` · ${preview.shakha['Coordinator Contact']}`
                  : ''}
              </p>
            )}
          </div>

          {preview.nextSchedule ? (
            <div className="bg-ink text-paper rounded-card p-5">
              <p className="text-xs font-mono uppercase tracking-wide text-marigold mb-1">
                Next Session
              </p>
              <p className="text-lg font-display font-semibold">
                {formatDisplayDate(preview.nextSchedule.Date)} ·{' '}
                {preview.nextSchedule['Start Time']}–{preview.nextSchedule['End Time']}
              </p>
              <p className="text-sm opacity-80 mt-1">{preview.nextSchedule.Location}</p>
              {preview.nextSchedule.Notes && (
                <p className="text-sm opacity-80 mt-2">{preview.nextSchedule.Notes}</p>
              )}
            </div>
          ) : (
            <p className="text-ink-muted text-sm">
              No upcoming session is published for this Shakha.
            </p>
          )}

          {preview.scheduleActivities.length > 0 && (
            <div>
              <h3 className="text-sm font-display font-semibold text-ink mb-2">
                Run of Show
              </h3>
              <ScheduleActivitiesTable activities={preview.scheduleActivities} />
            </div>
          )}

          <div className="bg-paper-raised rounded-card border border-ink/10 p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs font-mono uppercase tracking-wide text-marigold-dark">
                  Registered Participants
                </p>
                <p className="text-2xl font-display font-semibold text-ink">
                  {summaryLoading ? '…' : summary?.total ?? 0}
                </p>
              </div>
              {participants.length > 0 && (
                <button
                  onClick={() => setShowDetailedList((o) => !o)}
                  className="text-sm text-marigold-dark underline underline-offset-2"
                >
                  {showDetailedList ? 'Hide detailed list' : 'Show detailed list'}
                </button>
              )}
            </div>

            {summaryLoading && <p className="text-ink-muted text-sm mt-3">Loading…</p>}

            {!summaryLoading && composition.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-card border border-ink/10">
                <table className="w-full text-sm">
                  <thead className="bg-ink/5 text-ink-muted text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-2">Category</th>
                      <th className="text-right px-4 py-2">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {composition.map((c) => (
                      <tr key={c.key || c.label} className="border-t border-ink/10">
                        <td className="px-4 py-2 text-ink">{c.label}</td>
                        <td className="px-4 py-2 text-right text-ink font-medium">{c.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {showDetailedList && participants.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-card border border-ink/10">
                <table className="w-full text-sm">
                  <thead className="bg-ink/5 text-ink-muted text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-2">Name</th>
                      <th className="text-left px-4 py-2">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p) => (
                      <tr key={p.participantId} className="border-t border-ink/10">
                        <td className="px-4 py-2 text-ink">{p.name}</td>
                        <td className="px-4 py-2 text-ink-light">{p.typeLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <button
              onClick={() => setShowLeaders((o) => !o)}
              className="w-full flex items-center justify-between text-left mb-2"
            >
              <h3 className="text-sm font-display font-semibold text-ink">Pramukhs</h3>
              <span className="text-sm text-ink-light underline underline-offset-2">
                {showLeaders ? 'Hide −' : 'Show +'}
              </span>
            </button>
            {showLeaders && <ShakhaLeadersCard shakhaId={shakhaId} />}
          </div>
        </>
      )}
    </div>
  );
}
