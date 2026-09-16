import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import DashboardSidebar, { SidebarItem } from '@/components/DashboardSidebar';
import { callHssApi } from '@/lib/hssApi';
import { formatDisplayDate } from '@/lib/format';
import { DashboardBundle, Shakha, ScheduleParticipationRow, ParticipantType } from '@/lib/types';
import { useParticipantTypes } from '@/lib/participation';

const SESSION_KEY = 'hss_user_id';

type Draft = Record<string, string>;

function draftFromRow(row: ScheduleParticipationRow, types: ParticipantType[]): Draft {
  return types.reduce((acc, t) => {
    acc[t['Type Key']] = String(row[t['Type Key']] ?? 0);
    return acc;
  }, {} as Draft);
}

export default function RecordShakhaNumbersPage() {
  const router = useRouter();
  const { types } = useParticipantTypes();
  const [status, setStatus] = useState<'loading' | 'denied' | 'pickShakha' | 'ready'>('loading');
  const [userId, setUserId] = useState('');
  const [dash, setDash] = useState<DashboardBundle | null>(null);
  const [shakhas, setShakhas] = useState<Shakha[]>([]);
  const [selectedShakhaId, setSelectedShakhaId] = useState('');
  const [deniedReason, setDeniedReason] = useState('');

  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [dateFilter, setDateFilter] = useState('');
  const [onlyUnreported, setOnlyUnreported] = useState(false);
  const [rows, setRows] = useState<ScheduleParticipationRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState('');
  const [savedId, setSavedId] = useState('');

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

  function loadRows() {
    if (!userId || !selectedShakhaId) return;
    setRowsLoading(true);
    // NOTE: action name here ('getShakhaParticipationSchedule') needs to be
    // routed in your dispatcher (code.gs) to Actions_Participation.getScheduleWithReports.
    callHssApi<ScheduleParticipationRow[]>('getShakhaParticipationSchedule', {
      userId,
      shakhaId: selectedShakhaId,
      year,
    })
      .then((data) => {
        setRows(data);
        if (types.length > 0) {
          const nextDrafts: Record<string, Draft> = {};
          data.forEach((row) => { nextDrafts[row.scheduleId] = draftFromRow(row, types); });
          setDrafts(nextDrafts);
        }
        setStatus('ready');
      })
      .catch(() => setRows([]))
      .finally(() => setRowsLoading(false));
  }

  useEffect(() => {
    if (!userId || !selectedShakhaId) return;
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedShakhaId, year]);

  // Rebuild drafts once types finish loading (they arrive async, and may
  // resolve after the schedule rows already have).
  useEffect(() => {
    if (types.length === 0 || rows.length === 0) return;
    setDrafts((prev) => {
      const next = { ...prev };
      rows.forEach((row) => {
        if (!next[row.scheduleId]) next[row.scheduleId] = draftFromRow(row, types);
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types, rows]);

  const visibleRows = useMemo(() => {
    return rows.filter((r) => {
      if (onlyUnreported && r.reported) return false;
      if (dateFilter && !r.date.includes(dateFilter)) return false;
      return true;
    });
  }, [rows, onlyUnreported, dateFilter]);

  async function handleSave(row: ScheduleParticipationRow) {
    const draft = drafts[row.scheduleId];
    if (!draft) return;
    setSavingId(row.scheduleId);
    setSavedId('');
    try {
      const payload: Record<string, unknown> = {
        userId,
        shakhaId: selectedShakhaId,
        scheduleId: row.scheduleId,
      };
      types.forEach((t) => {
        payload[t['Type Key']] = Number(draft[t['Type Key']]) || 0;
      });
      await callHssApi('submitParticipationReport', payload);
      setSavedId(row.scheduleId);
      loadRows();
    } finally {
      setSavingId('');
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
      active: router.pathname === '/coordinator/participation',
    },
  ];

  const years = (() => {
    const current = new Date().getFullYear();
    const list: string[] = [];
    for (let y = current; y >= current - 4; y--) list.push(String(y));
    return list;
  })();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-wide text-marigold-dark">
              Record Shakha Numbers{isSuperUser ? ' — Admin view' : ''}
            </p>
            <h1 className="text-2xl font-display font-semibold text-ink">Participation by Date</h1>
          </div>

          {isSuperUser && (
            <select
              value={selectedShakhaId}
              onChange={(e) => setSelectedShakhaId(e.target.value)}
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

          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {!selectedShakhaId && isSuperUser && (
              <p className="text-ink-muted text-sm">Pick a Shakha above to view its participation records.</p>
            )}

            {selectedShakhaId && (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <select value={year} onChange={(e) => setYear(e.target.value)} className="input w-auto">
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <input
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    placeholder="Filter by date…"
                    className="input w-auto"
                  />
                  <label className="flex items-center gap-2 text-sm text-ink-light">
                    <input
                      type="checkbox"
                      checked={onlyUnreported}
                      onChange={(e) => setOnlyUnreported(e.target.checked)}
                    />
                    Only un-reported dates
                  </label>
                </div>

                {(rowsLoading || types.length === 0) && <p className="text-ink-muted text-sm">Loading…</p>}

                {!rowsLoading && types.length > 0 && visibleRows.length === 0 && (
                  <p className="text-ink-muted text-sm">No Shakha dates match this filter.</p>
                )}

                {!rowsLoading && types.length > 0 && visibleRows.length > 0 && (
                  <div className="overflow-x-auto rounded-card border border-ink/10">
                    <table className="text-sm border-collapse">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 bg-paper-raised text-ink-muted text-xs uppercase tracking-wide text-left px-4 py-2 align-bottom min-w-[11rem]">
                            Participant Type
                          </th>
                          {visibleRows.map((row) => (
                            <th
                              key={row.scheduleId}
                              className="bg-paper-raised px-1 py-2 align-bottom border-l border-ink/10"
                            >
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    row.reported ? 'bg-sage' : 'bg-marigold'
                                  }`}
                                  title={row.reported ? 'Reported' : 'Not reported'}
                                />
                                <div
                                  className="text-xs font-medium text-ink whitespace-nowrap py-1"
                                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                                >
                                  {formatDisplayDate(row.date)}
                                </div>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {types.map((t) => (
                          <tr key={t['Type Key']} className="border-t border-ink/10">
                            <td className="sticky left-0 z-10 bg-paper px-4 py-2 whitespace-nowrap">
                              <div className="text-ink font-medium">{t['Label']}</div>
                              <div className="text-xs text-ink-muted">{t['Age Range Label']}</div>
                            </td>
                            {visibleRows.map((row) => {
                              const draft = drafts[row.scheduleId] ?? draftFromRow(row, types);
                              return (
                                <td key={row.scheduleId} className="px-1 py-2 border-l border-ink/10">
                                  <input
                                    type="number"
                                    min={0}
                                    value={draft[t['Type Key']] ?? ''}
                                    onChange={(e) =>
                                      setDrafts({
                                        ...drafts,
                                        [row.scheduleId]: { ...draft, [t['Type Key']]: e.target.value },
                                      })
                                    }
                                    className="input w-14 px-1 text-center"
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}

                        <tr className="border-t border-ink/10">
                          <td className="sticky left-0 z-10 bg-paper-raised px-4 py-2 text-ink font-semibold whitespace-nowrap">
                            Total
                          </td>
                          {visibleRows.map((row) => {
                            const draft = drafts[row.scheduleId] ?? draftFromRow(row, types);
                            const total = types.reduce(
                              (sum, t) => sum + (Number(draft[t['Type Key']]) || 0),
                              0
                            );
                            return (
                              <td
                                key={row.scheduleId}
                                className="px-1 py-2 border-l border-ink/10 text-center font-semibold text-ink bg-paper-raised"
                              >
                                {total}
                              </td>
                            );
                          })}
                        </tr>

                        <tr className="border-t border-ink/10">
                          <td className="sticky left-0 z-10 bg-paper px-4 py-2"></td>
                          {visibleRows.map((row) => (
                            <td key={row.scheduleId} className="px-1 py-2 border-l border-ink/10 text-center">
                              <button
                                onClick={() => handleSave(row)}
                                disabled={savingId === row.scheduleId}
                                className="btn-primary py-1 px-2 text-xs whitespace-nowrap"
                              >
                                {savingId === row.scheduleId ? '…' : 'Save'}
                              </button>
                              {savedId === row.scheduleId && savingId !== row.scheduleId && (
                                <span className="block text-xs text-sage mt-1">Saved</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
