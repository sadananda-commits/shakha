import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import DashboardSidebar, { SidebarItem } from '@/components/DashboardSidebar';
import { callHssApi } from '@/lib/hssApi';
import { formatDisplayDate } from '@/lib/format';
import { DashboardBundle, Shakha, ScheduleParticipationRow, ParticipantType } from '@/lib/types';
import { useParticipantTypes } from '@/lib/participation';

const SESSION_KEY = 'hss_user_id';

/** One person in the day payload from getShakhaDayAttendance (see Actions_ShakhaDay.gs). */
type Person = {
  participantId: string;
  name: string;
  familyId: string;
  familyName: string;
  relationship: string;
  age: number | null;
  typeKey: string; // '' when no category could be worked out
  rsvp: string; // 'Yes' | 'No' | 'Not Sure' | 'No Response' | ''
  attended: boolean; // already confirmed and saved
};

type ShakhaDay = {
  scheduleId: string;
  date: string;
  reported: boolean;
  headcountOnly: boolean; // numbers from the old count form, no named attendees
  summary: { counts: Record<string, number>; total: number };
  people: Person[];
};

type DateRow = ScheduleParticipationRow & { status?: string };

// ---------- small helpers ----------

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function todayIsoLocal() {
  const n = new Date();
  return toIso(n.getFullYear(), n.getMonth(), n.getDate());
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong.';
}

/** Families together (A–Z by family name), Self first, then oldest to youngest inside a family. */
function sortIds(ids: string[], byId: Record<string, Person>): string[] {
  const groups: Record<string, Person[]> = {};
  ids.forEach((id) => {
    const p = byId[id];
    if (!p) return;
    const key = p.familyId || `solo-${p.participantId}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  const label = (g: Person[]) => (g[0].familyName || g[0].name).toLowerCase();

  return Object.values(groups)
    .sort((a, b) => label(a).localeCompare(label(b)))
    .flatMap((g) =>
      g
        .sort((a, b) => {
          const aSelf = a.relationship === 'Self';
          const bSelf = b.relationship === 'Self';
          if (aSelf !== bSelf) return aSelf ? -1 : 1;
          const ageDiff = (b.age ?? -1) - (a.age ?? -1);
          return ageDiff !== 0 ? ageDiff : a.name.localeCompare(b.name);
        })
        .map((p) => p.participantId)
    );
}

function personLabel(p: Person) {
  return p.familyName && p.familyName !== p.name ? `${p.name} — ${p.familyName}'s family` : p.name;
}

function describeAttendance(types: ParticipantType[], counts: Record<string, number>, date: string) {
  const parts = types
    .filter((t) => (counts[t['Type Key']] || 0) > 0)
    .map((t) => `${counts[t['Type Key']]} ${t['Label']}`);
  if (parts.length === 0) return 'No attendance has been confirmed for this date.';
  return `On ${formatDisplayDate(date)} the Shakha was attended by ${parts.join(', ')}.`;
}

// ---------- small calendar ----------

function MonthCalendar({
  month,
  onMonthChange,
  rowByDate,
  selectedDate,
  today,
  onSelect,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  rowByDate: Record<string, DateRow>;
  selectedDate: string;
  today: string;
  onSelect: (iso: string) => void;
}) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7; // weeks start on Monday
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const label = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(month);

  return (
    <div className="bg-paper-raised rounded-card border border-ink/10 p-3 w-full lg:w-72">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => onMonthChange(new Date(y, m - 1, 1))}
          className="h-8 w-8 rounded-md text-ink hover:bg-paper"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-sm font-medium text-ink">{label}</span>
        <button
          type="button"
          onClick={() => onMonthChange(new Date(y, m + 1, 1))}
          className="h-8 w-8 rounded-md text-ink hover:bg-paper"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-ink-muted mb-1">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (day === null) return <span key={`blank-${i}`} />;

          const iso = toIso(y, m, day);
          const row = rowByDate[iso];
          const cancelled = !!row && /cancel/i.test(row.status || '');
          const past = iso <= today;
          const selectable = !!row && !cancelled && past;
          const isSelected = iso === selectedDate;

          let title = 'No Shakha on this date';
          if (row && cancelled) title = 'Cancelled';
          else if (row && !past) title = 'Upcoming — numbers can be recorded after the Shakha';
          else if (row) title = row.reported ? 'Reported' : 'Not reported yet';

          const dot = !row || cancelled ? '' : !past ? 'bg-ink/30' : row.reported ? 'bg-sage' : 'bg-marigold';

          return (
            <button
              key={iso}
              type="button"
              disabled={!selectable}
              onClick={() => onSelect(iso)}
              aria-pressed={isSelected}
              title={title}
              className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-md text-sm ${
                isSelected
                  ? 'bg-ink text-paper'
                  : selectable
                  ? 'border border-ink/20 font-medium text-ink hover:bg-paper'
                  : row && !cancelled
                  ? 'text-ink-light'
                  : 'text-ink-muted opacity-50'
              }`}
            >
              {day}
              {dot && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${dot}`} />}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-sage" /> Reported
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-marigold" /> Not reported yet
        </span>
      </div>
    </div>
  );
}

// ---------- page ----------

export default function RecordShakhaNumbersPage() {
  const router = useRouter();
  const { types } = useParticipantTypes();

  const [status, setStatus] = useState<'loading' | 'denied' | 'pickShakha' | 'ready'>('loading');
  const [userId, setUserId] = useState('');
  const [dash, setDash] = useState<DashboardBundle | null>(null);
  const [shakhas, setShakhas] = useState<Shakha[]>([]);
  const [selectedShakhaId, setSelectedShakhaId] = useState('');
  const [deniedReason, setDeniedReason] = useState('');

  // Calendar + year data (also feeds the minimised "Year overview" panel)
  const today = useMemo(() => todayIsoLocal(), []);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [rows, setRows] = useState<DateRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [onlyUnreported, setOnlyUnreported] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(true);

  // Selected date
  const [selectedDate, setSelectedDate] = useState('');
  const [day, setDay] = useState<ShakhaDay | null>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState('');
  const [mode, setMode] = useState<'summary' | 'edit'>('edit');
  const [rowIds, setRowIds] = useState<string[]>([]); // people shown in the table, in display order
  const [attendedIds, setAttendedIds] = useState<string[]>([]); // people the coordinator has confirmed
  const [addingRow, setAddingRow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const dayRequest = useRef(0);

  // ----- auth (unchanged from before) -----
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
        setDeniedReason(errorMessage(err));
        setStatus('denied');
      });
  }, []);

  // ----- schedule dates for the year (calendar dots + overview panel) -----
  function loadRows() {
    if (!userId || !selectedShakhaId) return;
    setRowsLoading(true);
    // Routed in Code.gs to Actions_Participation.getScheduleWithReports (as before).
    callHssApi<DateRow[]>('getShakhaParticipationSchedule', {
      userId,
      shakhaId: selectedShakhaId,
      year,
    })
      .then((data) => setRows(data))
      .catch(() => setRows([]))
      .finally(() => setRowsLoading(false));
  }

  useEffect(() => {
    if (!userId || !selectedShakhaId) return;
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedShakhaId, year]);

  const rowByDate = useMemo(() => {
    const map: Record<string, DateRow> = {};
    rows.forEach((r) => {
      if (!map[r.date]) map[r.date] = r;
    });
    return map;
  }, [rows]);

  function goToMonth(d: Date) {
    setViewMonth(d);
    if (String(d.getFullYear()) !== year) setYear(String(d.getFullYear()));
  }

  // ----- one date -----
  const peopleById = useMemo(() => {
    const map: Record<string, Person> = {};
    (day?.people ?? []).forEach((p) => {
      map[p.participantId] = p;
    });
    return map;
  }, [day]);

  const dirty = useMemo(() => {
    if (!day) return false;
    const saved = day.people.filter((p) => p.attended).map((p) => p.participantId).sort().join('|');
    const current = [...attendedIds].sort().join('|');
    return saved !== current;
  }, [day, attendedIds]);

  // Warn before closing the tab with unsaved confirmations.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const typeLabel = (key: string) => types.find((t) => t['Type Key'] === key)?.['Label'] ?? '';

  /** Puts a server payload on screen. Rows = everyone who RSVP'd Yes plus anyone already confirmed. */
  function applyDay(d: ShakhaDay, nextMode: 'summary' | 'edit') {
    const byId: Record<string, Person> = {};
    d.people.forEach((p) => {
      byId[p.participantId] = p;
    });
    const shown = d.people.filter((p) => p.rsvp === 'Yes' || p.attended).map((p) => p.participantId);
    setDay(d);
    setRowIds(sortIds(shown, byId));
    setAttendedIds(d.people.filter((p) => p.attended).map((p) => p.participantId));
    setMode(nextMode);
    setAddingRow(false);
  }

  function loadDay(scheduleId: string) {
    const req = ++dayRequest.current;
    setDayLoading(true);
    setDayError('');
    callHssApi<ShakhaDay>('getShakhaDayAttendance', {
      userId,
      shakhaId: selectedShakhaId,
      scheduleId,
    })
      .then((d) => {
        if (req !== dayRequest.current) return; // a newer date was picked meanwhile
        // Already-reported dates open as the short summary; new ones open straight into the list.
        applyDay(d, d.reported ? 'summary' : 'edit');
      })
      .catch((err) => {
        if (req !== dayRequest.current) return;
        setDay(null);
        setDayError(errorMessage(err));
      })
      .finally(() => {
        if (req === dayRequest.current) setDayLoading(false);
      });
  }

  function confirmDiscard() {
    return !dirty || window.confirm('You have unsaved changes for this date. Discard them?');
  }

  function selectDate(iso: string) {
    if (iso === selectedDate) return;
    const row = rowByDate[iso];
    if (!row || !confirmDiscard()) return;
    setSelectedDate(iso);
    setDay(null);
    setJustSaved(false);
    setSaveError('');
    setCalendarOpen(false); // on phones the calendar folds away once a date is chosen
    loadDay(row.scheduleId);
  }

  function resetSelection() {
    dayRequest.current++;
    setSelectedDate('');
    setDay(null);
    setDayError('');
    setRowIds([]);
    setAttendedIds([]);
    setAddingRow(false);
    setCalendarOpen(true);
  }

  function toggleAttended(id: string) {
    setJustSaved(false);
    setAttendedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function addPerson(id: string) {
    if (!id) return;
    setJustSaved(false);
    setRowIds((prev) => (prev.includes(id) ? prev : [...prev, id])); // new rows go to the bottom until Save re-sorts
    setAttendedIds((prev) => (prev.includes(id) ? prev : [...prev, id])); // adding someone = they were there
    setAddingRow(false);
  }

  function removeAddedPerson(id: string) {
    setJustSaved(false);
    setRowIds((prev) => prev.filter((x) => x !== id));
    setAttendedIds((prev) => prev.filter((x) => x !== id));
  }

  async function handleSave() {
    if (!day) return;
    setSaving(true);
    setSaveError('');
    setJustSaved(false);
    try {
      const saved = await callHssApi<ShakhaDay>('saveShakhaDayAttendance', {
        userId,
        shakhaId: selectedShakhaId,
        scheduleId: day.scheduleId,
        attendedIds: JSON.stringify(attendedIds),
      });
      applyDay(saved, 'edit'); // rebuilds the list re-sorted by family
      setJustSaved(true);
      loadRows(); // refresh the calendar dots
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // Live counts for the summary under the table
  const liveCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let uncategorised = 0;
    attendedIds.forEach((id) => {
      const p = peopleById[id];
      if (!p) return;
      if (p.typeKey && types.some((t) => t['Type Key'] === p.typeKey)) {
        counts[p.typeKey] = (counts[p.typeKey] || 0) + 1;
      } else {
        uncategorised++;
      }
    });
    return { counts, uncategorised };
  }, [attendedIds, peopleById, types]);

  // Consecutive rows from the same family are drawn as one group.
  const runs = useMemo(() => {
    const out: Person[][] = [];
    rowIds.forEach((id) => {
      const p = peopleById[id];
      if (!p) return;
      const last = out[out.length - 1];
      if (last && p.familyId && last[0].familyId === p.familyId) last.push(p);
      else out.push([p]);
    });
    return out;
  }, [rowIds, peopleById]);

  const candidates = useMemo(
    () => (day?.people ?? []).filter((p) => !rowIds.includes(p.participantId)),
    [day, rowIds]
  );

  const visibleRows = useMemo(
    () =>
      rows.filter((r) => {
        if (onlyUnreported && r.reported) return false;
        if (dateFilter && !r.date.includes(dateFilter)) return false;
        return true;
      }),
    [rows, onlyUnreported, dateFilter]
  );

  // ----- early returns (all hooks are above this line) -----
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
          <h1 className="text-xl font-display font-semibold text-ink mb-2">Coordinator access required</h1>
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
      description: 'Confirm who attended each Shakha date.',
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

  const liveTotal = Object.values(liveCounts.counts).reduce((a, b) => a + b, 0);
  const typesReady = types.length > 0;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-wide text-marigold-dark">
              Record Shakha Numbers{isSuperUser ? ' — Admin view' : ''}
            </p>
            <h1 className="text-2xl font-display font-semibold text-ink">Shakha attendance</h1>
          </div>

          {isSuperUser && (
            <select
              value={selectedShakhaId}
              onChange={(e) => {
                if (!confirmDiscard()) return;
                resetSelection();
                setRows([]);
                setSelectedShakhaId(e.target.value);
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

          <div className="flex-1 min-w-0 flex flex-col gap-5">
            {!selectedShakhaId && isSuperUser && (
              <p className="text-ink-muted text-sm">Pick a Shakha above to record its attendance.</p>
            )}

            {selectedShakhaId && (
              <>
                {/* Minimised: year, date filter, un-reported filter and the list of scheduled dates */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowOverview((v) => !v)}
                    aria-expanded={showOverview}
                    className="text-sm text-marigold-dark underline underline-offset-2"
                  >
                    {showOverview ? 'Hide year overview' : 'Year overview and filters'}
                  </button>

                  {showOverview && (
                    <div className="mt-3 rounded-card border border-ink/10 p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <select
                          value={year}
                          onChange={(e) => {
                            setYear(e.target.value);
                            setViewMonth(new Date(Number(e.target.value), viewMonth.getMonth(), 1));
                          }}
                          className="input w-auto"
                        >
                          {years.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
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

                      {(rowsLoading || !typesReady) && <p className="text-ink-muted text-sm">Loading…</p>}

                      {!rowsLoading && typesReady && visibleRows.length === 0 && (
                        <p className="text-ink-muted text-sm">No Shakha dates match this filter.</p>
                      )}

                      {!rowsLoading && typesReady && visibleRows.length > 0 && (
                        <div className="overflow-x-auto rounded-card border border-ink/10">
                          <table className="w-full text-sm border-collapse">
                            <thead className="bg-paper-raised text-ink-muted text-xs uppercase tracking-wide">
                              <tr>
                                <th className="text-left px-4 py-2">Date</th>
                                {types.map((t) => (
                                  <th key={t['Type Key']} className="px-3 py-2 text-center" title={t['Label']}>
                                    {t['Type Key']}
                                  </th>
                                ))}
                                <th className="px-3 py-2 text-center">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {visibleRows.map((row) => {
                                const cancelled = /cancel/i.test(row.status || '');
                                const openable = !cancelled && row.date <= today;
                                const record = row as unknown as Record<string, unknown>;
                                return (
                                  <tr key={row.scheduleId} className="border-t border-ink/10">
                                    <td className="px-4 py-2 whitespace-nowrap">
                                      <span className="flex items-center gap-2">
                                        <span
                                          className={`h-1.5 w-1.5 rounded-full ${
                                            row.reported ? 'bg-sage' : 'bg-marigold'
                                          }`}
                                          title={row.reported ? 'Reported' : 'Not reported'}
                                        />
                                        {openable ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              selectDate(row.date);
                                              const d = new Date(`${row.date}T00:00:00`);
                                              goToMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                                              window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            className="text-ink underline underline-offset-2"
                                          >
                                            {formatDisplayDate(row.date)}
                                          </button>
                                        ) : (
                                          <span className="text-ink-muted">
                                            {formatDisplayDate(row.date)}
                                            {cancelled ? ' (cancelled)' : ' (upcoming)'}
                                          </span>
                                        )}
                                      </span>
                                    </td>
                                    {types.map((t) => (
                                      <td key={t['Type Key']} className="px-3 py-2 text-center text-ink-light">
                                        {row.reported ? Number(record[t['Type Key']]) || 0 : '—'}
                                      </td>
                                    ))}
                                    <td className="px-3 py-2 text-center font-medium text-ink">
                                      {row.reported ? Number(record['Total']) || 0 : '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col lg:flex-row gap-5 items-start">
                  <div className={`${calendarOpen ? 'block' : 'hidden'} lg:block w-full lg:w-auto`}>
                    <MonthCalendar
                      month={viewMonth}
                      onMonthChange={goToMonth}
                      rowByDate={rowByDate}
                      selectedDate={selectedDate}
                      today={today}
                      onSelect={selectDate}
                    />
                  </div>

                  <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
                    {!selectedDate && (
                      <p className="text-ink-muted text-sm">
                        {!rowsLoading && rows.length === 0
                          ? `No Shakha dates are scheduled in ${year}.`
                          : 'Choose a Shakha date from the calendar to record who attended.'}
                      </p>
                    )}

                    {selectedDate && (
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h2 className="text-lg font-display font-semibold text-ink">
                          {formatDisplayDate(selectedDate)}
                        </h2>
                        <div className="flex items-center gap-3">
                          {mode === 'edit' && day?.reported && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!confirmDiscard()) return;
                                applyDay(day, 'summary');
                              }}
                              className="text-sm text-ink-light underline underline-offset-2"
                            >
                              Back to summary
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setCalendarOpen(true)}
                            className="lg:hidden text-sm text-ink-light underline underline-offset-2"
                          >
                            Change date
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedDate && (dayLoading || !typesReady) && !dayError && (
                      <p className="text-ink-muted text-sm">Loading…</p>
                    )}

                    {dayError && (
                      <p className="text-sm text-marigold-dark" role="alert">
                        {dayError}
                      </p>
                    )}

                    {/* ---- Saved date: short summary ---- */}
                    {day && typesReady && !dayLoading && mode === 'summary' && (
                      <div className="bg-paper-raised rounded-card border border-ink/10 p-4 sm:p-5 flex flex-col gap-4">
                        <p className="text-sm text-ink">{describeAttendance(types, day.summary.counts, day.date)}</p>

                        {day.summary.total > 0 && (
                          <table className="text-sm border-collapse w-full max-w-xs">
                            <tbody>
                              {types
                                .filter((t) => (day.summary.counts[t['Type Key']] || 0) > 0)
                                .map((t) => (
                                  <tr key={t['Type Key']} className="border-t border-ink/10">
                                    <td className="py-1.5 pr-4 text-ink-light">{t['Label']}</td>
                                    <td className="py-1.5 text-right text-ink">{day.summary.counts[t['Type Key']]}</td>
                                  </tr>
                                ))}
                              <tr className="border-t border-ink/20">
                                <td className="py-1.5 pr-4 font-semibold text-ink">Total</td>
                                <td className="py-1.5 text-right font-semibold text-ink">{day.summary.total}</td>
                              </tr>
                            </tbody>
                          </table>
                        )}

                        {day.headcountOnly && (
                          <p className="text-xs text-ink-muted">
                            These numbers were entered as a headcount, without names.
                          </p>
                        )}

                        <button type="button" onClick={() => setMode('edit')} className="btn-primary self-start">
                          See and edit details
                        </button>
                      </div>
                    )}

                    {/* ---- Attendance table ---- */}
                    {day && typesReady && !dayLoading && mode === 'edit' && (
                      <>
                        {day.headcountOnly && (
                          <p className="text-sm text-marigold-dark">
                            This date currently has headcount-only numbers ({day.summary.total} in total). Saving will
                            replace them with the names confirmed below.
                          </p>
                        )}

                        <div className="overflow-x-auto rounded-card border border-ink/10">
                          <table className="w-full text-sm border-collapse">
                            <thead className="bg-paper-raised text-ink-muted text-xs uppercase tracking-wide">
                              <tr>
                                <th className="text-left px-4 py-2">Participant Name</th>
                                <th className="text-left px-4 py-2">Participant Type</th>
                                <th className="text-left px-4 py-2">Attendance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {runs.length === 0 && !addingRow && (
                                <tr className="border-t border-ink/10">
                                  <td colSpan={3} className="px-4 py-4 text-ink-muted">
                                    No one has said they are coming to this date. Use Add participant to record who
                                    attended.
                                  </td>
                                </tr>
                              )}

                              {runs.map((run) => (
                                <Fragment key={run[0].participantId}>
                                  {run.length > 1 && (
                                    <tr className="border-t border-ink/10 bg-paper-raised">
                                      <td colSpan={3} className="px-4 py-1.5 text-xs font-medium text-ink-muted">
                                        {run[0].familyName || run[0].name}&apos;s family
                                      </td>
                                    </tr>
                                  )}
                                  {run.map((p) => {
                                    const confirmed = attendedIds.includes(p.participantId);
                                    const addedByCoordinator = p.rsvp !== 'Yes';
                                    return (
                                      <tr key={p.participantId} className="border-t border-ink/10">
                                        <td className={`px-4 py-2 text-ink ${run.length > 1 ? 'pl-8' : ''}`}>
                                          {p.name}
                                          {addedByCoordinator && (
                                            <span className="ml-2 text-xs text-ink-muted">Added</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-2 text-ink-light">
                                          {typeLabel(p.typeKey) || (
                                            <span
                                              className="text-ink-muted"
                                              title="No category: date of birth missing or outside every age range"
                                            >
                                              —
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-4 py-2">
                                          <div className="flex items-center gap-3">
                                            <button
                                              type="button"
                                              aria-pressed={confirmed}
                                              onClick={() => toggleAttended(p.participantId)}
                                              className={`rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap border ${
                                                confirmed
                                                  ? 'bg-sage text-paper border-transparent'
                                                  : 'border-ink/30 text-ink hover:bg-paper-raised'
                                              }`}
                                            >
                                              {confirmed ? '✓ Confirmed' : 'Confirm'}
                                            </button>
                                            {addedByCoordinator && (
                                              <button
                                                type="button"
                                                onClick={() => removeAddedPerson(p.participantId)}
                                                aria-label={`Remove ${p.name}`}
                                                className="text-xs text-ink-muted underline underline-offset-2"
                                              >
                                                Remove
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </Fragment>
                              ))}

                              {addingRow && (
                                <tr className="border-t border-ink/10 bg-paper-raised">
                                  <td colSpan={3} className="px-4 py-2">
                                    {candidates.length === 0 ? (
                                      <div className="flex items-center gap-3">
                                        <span className="text-ink-muted">Everyone in this Shakha is already listed.</span>
                                        <button
                                          type="button"
                                          onClick={() => setAddingRow(false)}
                                          className="text-sm text-ink-muted underline underline-offset-2"
                                        >
                                          Close
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <select
                                          autoFocus
                                          value=""
                                          onChange={(e) => addPerson(e.target.value)}
                                          className="input w-full max-w-sm"
                                          aria-label="Select a participant to add"
                                        >
                                          <option value="">Select participant…</option>
                                          {candidates.map((p) => (
                                            <option key={p.participantId} value={p.participantId}>
                                              {personLabel(p)}
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          type="button"
                                          onClick={() => setAddingRow(false)}
                                          className="text-sm text-ink-muted underline underline-offset-2"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => setAddingRow(true)}
                            disabled={addingRow}
                            className="rounded-md border border-ink/30 px-3 py-1.5 text-sm text-ink hover:bg-paper-raised disabled:opacity-50"
                          >
                            + Add participant
                          </button>

                          <div className="flex items-center gap-3">
                            {dirty && <span className="text-xs text-marigold-dark">Unsaved changes</span>}
                            {justSaved && !dirty && <span className="text-xs text-sage">Saved</span>}
                            <button
                              type="button"
                              onClick={handleSave}
                              disabled={saving || (!dirty && day.reported)}
                              className="btn-primary"
                            >
                              {saving ? 'Saving…' : 'Save attendance'}
                            </button>
                          </div>
                        </div>

                        {saveError && (
                          <p className="text-sm text-marigold-dark" role="alert">
                            {saveError}
                          </p>
                        )}

                        <div className="bg-paper-raised rounded-card border border-ink/10 p-4 flex flex-col gap-1">
                          <p className="text-sm text-ink">{describeAttendance(types, liveCounts.counts, day.date)}</p>
                          {liveTotal > 0 && <p className="text-xs text-ink-muted">Total confirmed: {liveTotal}</p>}
                          {liveCounts.uncategorised > 0 && (
                            <p className="text-xs text-marigold-dark">
                              {liveCounts.uncategorised} confirmed{' '}
                              {liveCounts.uncategorised === 1 ? 'person has' : 'people have'} no category (date of
                              birth missing or outside every age range) and{' '}
                              {liveCounts.uncategorised === 1 ? 'is' : 'are'} not in these numbers.
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
