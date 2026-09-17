import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import DashboardSidebar, { SidebarItem } from '@/components/DashboardSidebar';
import VisitRequestsCard from '@/components/VisitRequestsCard';
import { callHssApi } from '@/lib/hssApi';
import { formatDisplayDate } from '@/lib/format';
import {
  CoordinatorDashboardBundle,
  DashboardBundle,
  Participant,
  Shakha,
} from '@/lib/types';

const SESSION_KEY = 'hss_user_id';

export default function CoordinatorPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'denied' | 'pickShakha' | 'ready'>('loading');
  const [userId, setUserId] = useState('');
  const [dash, setDash] = useState<DashboardBundle | null>(null);
  const [shakhas, setShakhas] = useState<Shakha[]>([]);
  const [selectedShakhaId, setSelectedShakhaId] = useState('');
  const [bundle, setBundle] = useState<CoordinatorDashboardBundle | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [query, setQuery] = useState('');
  const [deniedReason, setDeniedReason] = useState('');

  // Collapsed by default — these sections only load/render once the
  // Coordinator actually clicks in to see them.
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [visitRequestsOpen, setVisitRequestsOpen] = useState(false);

  // Step 1: figure out who's logged in and whether they're a Coordinator
  // or an Admin acting as a super-user (Admins aren't tied to one Shakha,
  // so they get a picker instead of loading a fixed shakha).
  useEffect(() => {
    const savedUserId = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
    if (!savedUserId) {
      setStatus('denied');
      return;
    }
    setUserId(savedUserId);

    callHssApi<DashboardBundle>('getMyDashboard', { userId: savedUserId })
      .then((d) => {
        setDash(d);
        const isSuperUser = !!d.isAdmin || d.user.Role === 'Admin';

        if (isSuperUser) {
          callHssApi<Shakha[]>('getShakhas').then(setShakhas).catch(() => setShakhas([]));
          // If the admin already has a home Shakha, preselect it but still
          // let them switch — otherwise wait for them to pick one.
          if (d.shakha) setSelectedShakhaId(d.shakha['Shakha ID']);
          setStatus('pickShakha');
          return;
        }

        if (!d.isCoordinator || !d.shakha) {
          setDeniedReason('Your account is not marked as a Shakha Coordinator.');
          setStatus('denied');
          return;
        }

        setSelectedShakhaId(d.shakha['Shakha ID']);
        setStatus('ready');
      })
      .catch((err) => {
        setDeniedReason(err instanceof Error ? err.message : 'Something went wrong.');
        setStatus('denied');
      });
  }, []);

  // Step 2: once we know which Shakha to load (either the coordinator's own,
  // or the one an Admin picked), fetch that Shakha's dashboard bundle.
  useEffect(() => {
    if (!userId || !selectedShakhaId) return;
    if (status !== 'ready' && status !== 'pickShakha') return;

    callHssApi<CoordinatorDashboardBundle>('getCoordinatorDashboard', {
      userId,
      shakhaId: selectedShakhaId,
    })
      .then((cd) => {
        setBundle(cd);
        setStatus('ready');
      })
      .catch((err) => {
        setDeniedReason(err instanceof Error ? err.message : 'Something went wrong.');
        setStatus('denied');
      });
  }, [userId, selectedShakhaId]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedShakhaId) return;
    try {
      const rows = await callHssApi<Participant[]>('getShakhaParticipants', {
        userId,
        shakhaId: selectedShakhaId,
        query,
      });
      setParticipants(rows);
    } catch {
      setParticipants([]);
    }
  }

  if (status === 'loading') {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-ink-muted">Loading…</div>
      </Layout>
    );
  }

  if (status === 'denied') {
    return (
      <Layout>
        <div className="max-w-md mx-auto px-4 sm:px-6 py-16 text-center">
          <h1 className="text-xl font-display font-semibold text-ink mb-2">
            Coordinator access required
          </h1>
          <p className="text-ink-muted mb-6">
            {deniedReason || 'This page is only available to Shakha Coordinators. Sign in from My Shakha first.'}
          </p>
          <Link href="/my-shakha" className="btn-primary inline-block">
            Go to My Shakha
          </Link>
        </div>
      </Layout>
    );
  }

  const isSuperUser = !!dash?.isAdmin || dash?.user.Role === 'Admin';

  const sidebarItems: SidebarItem[] = [
    {
      key: 'overview',
      label: 'Overview',
      description: 'Summary stats, next Shakha attendance, and participant search.',
      href: '/coordinator',
      active: router.pathname === '/coordinator',
    },
    {
      key: 'schedule',
      label: 'Manage Schedule',
      description: 'Add, edit, or cancel upcoming Shakha dates.',
      href: '/coordinator/schedule',
    },
    {
      key: 'activities',
      label: 'Manage Activities',
      description: 'Set the run-of-show and activity list for a Shakha date.',
      href: '/coordinator/activities',
    },
    {
      key: 'participation',
      label: 'Record Shakha Numbers',
      description: 'Log attendee headcounts by category for each Shakha date.',
      href: '/coordinator/participation',
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
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-wide text-marigold-dark">
              Coordinator Dashboard{isSuperUser ? ' — Admin view' : ''}
            </p>
            <h1 className="text-2xl font-display font-semibold text-ink">
              {bundle?.shakha['Shakha Name'] || 'Select a Shakha'}
            </h1>
          </div>

          {isSuperUser && (
            <select
              value={selectedShakhaId}
              onChange={(e) => {
                setSelectedShakhaId(e.target.value);
                setBundle(null);
              }}
              className="input w-auto"
            >
              <option value="">Select a Shakha…</option>
              {shakhas.map((s) => (
                <option key={s['Shakha ID']} value={s['Shakha ID']}>
                  {s['Shakha Name']} — {s.Area}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          <DashboardSidebar items={sidebarItems} />

          <div className="flex-1 min-w-0 flex flex-col gap-8">
            {!bundle && isSuperUser && (
              <p className="text-ink-muted text-sm">Pick a Shakha above to view its dashboard.</p>
            )}

            {bundle && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Total Participants', value: bundle.summary.totalParticipants },
                    { label: 'Adults', value: bundle.summary.adults },
                    { label: 'Children', value: bundle.summary.children },
                    { label: 'Families', value: bundle.summary.families },
                    { label: 'New (30 days)', value: bundle.summary.newParticipants },
                    { label: 'Sessions Conducted', value: bundle.sessionsConducted },
                  ].map((c) => (
                    <div key={c.label} className="bg-paper-raised rounded-card border border-ink/10 p-4">
                      <p className="text-2xl font-display font-semibold text-ink">{c.value}</p>
                      <p className="text-xs text-ink-muted mt-1">{c.label}</p>
                    </div>
                  ))}
                </div>

                {bundle.nextSchedule && (
                  <div className="bg-ink text-paper rounded-card p-5 sm:p-6">
                    <p className="text-xs font-mono uppercase tracking-wide text-marigold mb-2">
                      Next Shakha — {formatDisplayDate(bundle.nextSchedule.Date)}
                    </p>
                    <div className="flex gap-6 text-sm">
                      <span>Going: <strong>{bundle.nextShakhaAttendance.going}</strong></span>
                      <span>Maybe: <strong>{bundle.nextShakhaAttendance.maybe}</strong></span>
                      <span>Not attending: <strong>{bundle.nextShakhaAttendance.notGoing}</strong></span>
                    </div>
                  </div>
                )}

                <CollapsibleSection
                  title="Participants"
                  open={participantsOpen}
                  onToggle={() => setParticipantsOpen((o) => !o)}
                >
                  <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by name…"
                      className="input"
                    />
                    <button type="submit" className="btn-primary whitespace-nowrap">Search</button>
                  </form>

                  {participants.length > 0 && (
                    <div className="overflow-x-auto rounded-card border border-ink/10">
                      <table className="w-full text-sm">
                        <thead className="bg-paper-raised text-ink-muted text-xs uppercase tracking-wide">
                          <tr>
                            <th className="text-left px-4 py-2">Name</th>
                            <th className="text-left px-4 py-2">Age</th>
                            <th className="text-left px-4 py-2">Type</th>
                            <th className="text-left px-4 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {participants.map((p) => (
                            <tr key={p['Participant ID']} className="border-t border-ink/10">
                              <td className="px-4 py-2 text-ink">{p['Participant Name']}</td>
                              <td className="px-4 py-2 text-ink-light">{p.Age || '—'}</td>
                              <td className="px-4 py-2 text-ink-light">{p['Participant Type']}</td>
                              <td className="px-4 py-2 text-ink-light">{p['Active Status']}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CollapsibleSection>

                <CollapsibleSection
                  title="Visit Requests"
                  open={visitRequestsOpen}
                  onToggle={() => setVisitRequestsOpen((o) => !o)}
                >
                  <VisitRequestsCard userId={userId} shakhaId={selectedShakhaId} />
                </CollapsibleSection>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left mb-3"
      >
        <h2 className="text-lg font-display font-semibold text-ink">{title}</h2>
        <span className="text-sm text-ink-light underline underline-offset-2">
          {open ? 'Hide −' : 'Show +'}
        </span>
      </button>
      {open && children}
    </div>
  );
}
