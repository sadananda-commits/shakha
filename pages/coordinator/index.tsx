import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { callHssApi } from '@/lib/hssApi';
import { formatDisplayDate } from '@/lib/format';
import ParticipationStats from '@/components/ParticipationStats';
import {
  CoordinatorDashboardBundle,
  DashboardBundle,
  Participant,
  ParticipationStatsBundle,
} from '@/lib/types';

const SESSION_KEY = 'hss_user_id';

export default function CoordinatorPage() {
  const [status, setStatus] = useState<'loading' | 'denied' | 'ready'>('loading');
  const [userId, setUserId] = useState('');
  const [bundle, setBundle] = useState<CoordinatorDashboardBundle | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [query, setQuery] = useState('');
  const [deniedReason, setDeniedReason] = useState('');
  const [participationYear, setParticipationYear] = useState(String(new Date().getFullYear()));
  const [participationStats, setParticipationStats] = useState<ParticipationStatsBundle | null>(null);
  const [participationLoading, setParticipationLoading] = useState(false);

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
          setDeniedReason('Your account is not marked as a Shakha Coordinator.');
          setStatus('denied');
          return;
        }
        return callHssApi<CoordinatorDashboardBundle>('getCoordinatorDashboard', {
          userId: savedUserId,
          shakhaId: dash.shakha['Shakha ID'],
        }).then((cd) => {
          setBundle(cd);
          setStatus('ready');
        });
      })
      .catch((err) => {
        setDeniedReason(err instanceof Error ? err.message : 'Something went wrong.');
        setStatus('denied');
      });
  }, []);

  useEffect(() => {
    if (!bundle || !userId) return;
    setParticipationLoading(true);
    callHssApi<ParticipationStatsBundle>('getMyParticipationStats', {
      userId,
      shakhaId: bundle.shakha['Shakha ID'],
      year: participationYear,
    })
      .then(setParticipationStats)
      .catch(() => setParticipationStats(null))
      .finally(() => setParticipationLoading(false));
  }, [bundle, userId, participationYear]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!bundle) return;
    try {
      const rows = await callHssApi<Participant[]>('getShakhaParticipants', {
        userId,
        shakhaId: bundle.shakha['Shakha ID'],
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

  if (!bundle) return null;

  const cards = [
    { label: 'Total Participants', value: bundle.summary.totalParticipants },
    { label: 'Adults', value: bundle.summary.adults },
    { label: 'Children', value: bundle.summary.children },
    { label: 'Families', value: bundle.summary.families },
    { label: 'New (30 days)', value: bundle.summary.newParticipants },
    { label: 'Sessions Conducted', value: bundle.sessionsConducted },
  ];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wide text-marigold-dark">
              Coordinator Dashboard
            </p>
            <h1 className="text-2xl font-display font-semibold text-ink">
              {bundle.shakha['Shakha Name']}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link href="/coordinator/schedule" className="btn-primary">
              Manage Schedule
            </Link>
            <Link href="/coordinator/activities" className="btn-primary">
              Manage Activities
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {cards.map((c) => (
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

        <div>
          <h2 className="text-lg font-display font-semibold text-ink mb-3">Participants</h2>
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
        </div>

        <ParticipationStats
          title="Participation This Year"
          year={participationYear}
          onYearChange={setParticipationYear}
          weekly={participationStats?.weekly ?? []}
          cumulativeTotal={participationStats?.cumulativeTotal ?? 0}
          composition={
            participationStats?.composition ?? {
              'Children Male': 0, 'Children Female': 0,
              'Youth Male': 0, 'Youth Female': 0,
              'Adult Male': 0, 'Adult Female': 0,
              'Senior Male': 0, 'Senior Female': 0,
            }
          }
          loading={participationLoading}
        />
      </div>
    </Layout>
  );
}
