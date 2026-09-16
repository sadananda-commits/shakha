import { useEffect, useState } from 'react';
import { callHssApi } from '@/lib/hssApi';
import { useParticipantTypes } from '@/lib/participation';
import {
  ActivityStatsListItem,
  ActivityStatsDetailed,
  StatsBreakdownRow,
  Shakha,
} from '@/lib/types';

/**
 * Activity Stats for the Admin dashboard. Two levels: a list of every
 * Community Activity, and — once one is opened — its full breakdown.
 *
 * The breakdowns are tables rather than charts on purpose: the question
 * being asked here is "how is this performing across Shakhas / participant
 * types / age / gender", which is comparative and needs exact numbers
 * alongside filters, not a shape to eyeball.
 */
export default function ActivityStatsPanel({ adminEmail }: { adminEmail: string }) {
  const [activities, setActivities] = useState<ActivityStatsListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    setListLoading(true);
    callHssApi<ActivityStatsListItem[]>('listActivitiesForStats', { adminEmail })
      .then(setActivities)
      .catch(() => setActivities([]))
      .finally(() => setListLoading(false));
  }, [adminEmail]);

  if (selectedId) {
    return (
      <ActivityDetail
        adminEmail={adminEmail}
        activityId={selectedId}
        onBack={() => setSelectedId('')}
      />
    );
  }

  return (
    <div>
      <h2 className="text-lg font-display font-semibold text-ink mb-3">Activity Stats</h2>

      {listLoading && <p className="text-ink-muted text-sm">Loading…</p>}

      {!listLoading && activities.length === 0 && (
        <p className="text-ink-muted text-sm">No activities have been created yet.</p>
      )}

      {!listLoading && activities.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activities.map((a) => (
            <button
              key={a.activityId}
              onClick={() => setSelectedId(a.activityId)}
              className="text-left bg-paper-raised rounded-card border border-ink/10 p-4 hover:border-marigold transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-display font-semibold text-ink">{a.activityName}</p>
                <StatusPill status={a.status} />
              </div>
              <p className="text-xs text-marigold-dark font-mono uppercase tracking-wide mt-1">
                {a.type}
              </p>
              {a.shakhaName && (
                <p className="text-xs text-ink-muted mt-1">{a.shakhaName}</p>
              )}
              {(a.startDate || a.endDate) && (
                <p className="text-xs text-ink-muted mt-2">
                  {a.startDate} {a.endDate ? `– ${a.endDate}` : ''}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityDetail({
  adminEmail,
  activityId,
  onBack,
}: {
  adminEmail: string;
  activityId: string;
  onBack: () => void;
}) {
  const { types } = useParticipantTypes();
  const [shakhas, setShakhas] = useState<Shakha[]>([]);
  const [stats, setStats] = useState<ActivityStatsDetailed | null>(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    shakhaId: '',
    area: '',
    participantType: '',
    gender: '',
    minAge: '',
    maxAge: '',
    fromDate: '',
    toDate: '',
  });

  useEffect(() => {
    callHssApi<Shakha[]>('getShakhas', { includeInactive: true })
      .then(setShakhas)
      .catch(() => setShakhas([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    callHssApi<ActivityStatsDetailed>('getActivityStatsDetailed', {
      adminEmail,
      activityId,
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')),
    })
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [adminEmail, activityId, filters]);

  const areas = Array.from(new Set(shakhas.map((s) => s.Area).filter(Boolean)));
  const filtersActive = Object.values(filters).some((v) => v !== '');

  function set(key: keyof typeof filters, value: string) {
    setFilters({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <button
          onClick={onBack}
          className="text-sm text-ink-light underline underline-offset-2 mb-2"
        >
          ← All activities
        </button>
        <h2 className="text-lg font-display font-semibold text-ink">
          {stats?.activity.activityName || 'Activity Stats'}
        </h2>
        {stats?.activity.description && (
          <p className="text-sm text-ink-muted mt-1">{stats.activity.description}</p>
        )}
      </div>

      {/* Filters */}
      <div className="bg-paper-raised rounded-card border border-ink/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-display font-semibold text-ink">Filters</h3>
          {filtersActive && (
            <button
              onClick={() =>
                setFilters({
                  shakhaId: '', area: '', participantType: '', gender: '',
                  minAge: '', maxAge: '', fromDate: '', toDate: '',
                })
              }
              className="text-xs text-marigold-dark underline underline-offset-2"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <FilterField label="Area">
            <select value={filters.area} onChange={(e) => set('area', e.target.value)} className="input">
              <option value="">All areas</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </FilterField>

          <FilterField label="Shakha">
            <select value={filters.shakhaId} onChange={(e) => set('shakhaId', e.target.value)} className="input">
              <option value="">All Shakhas</option>
              {shakhas.map((s) => (
                <option key={s['Shakha ID']} value={s['Shakha ID']}>{s['Shakha Name']}</option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Participant Type">
            <select
              value={filters.participantType}
              onChange={(e) => set('participantType', e.target.value)}
              className="input"
            >
              <option value="">All types</option>
              {types.map((t) => (
                <option key={t['Type Key']} value={t['Type Key']}>{t['Label']}</option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Gender">
            <select value={filters.gender} onChange={(e) => set('gender', e.target.value)} className="input">
              <option value="">All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </FilterField>

          <FilterField label="Min age">
            <input
              type="number" min={0} value={filters.minAge}
              onChange={(e) => set('minAge', e.target.value)} className="input"
            />
          </FilterField>

          <FilterField label="Max age">
            <input
              type="number" min={0} value={filters.maxAge}
              onChange={(e) => set('maxAge', e.target.value)} className="input"
            />
          </FilterField>

          <FilterField label="From date">
            <input
              type="date" value={filters.fromDate}
              onChange={(e) => set('fromDate', e.target.value)} className="input"
            />
          </FilterField>

          <FilterField label="To date">
            <input
              type="date" value={filters.toDate}
              onChange={(e) => set('toDate', e.target.value)} className="input"
            />
          </FilterField>
        </div>
      </div>

      {loading && <p className="text-ink-muted text-sm">Loading…</p>}

      {!loading && !stats && (
        <p className="text-ink-muted text-sm">Couldn't load stats for this activity.</p>
      )}

      {!loading && stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label={stats.valueLabel} value={stats.overall.totalValue} accent />
            <SummaryCard label="Participants" value={stats.overall.totalParticipants} />
            <SummaryCard label="Entries Logged" value={stats.overall.totalEntries} />
            <SummaryCard label="Shakhas Taking Part" value={stats.overall.totalShakhas} />
          </div>

          {stats.overall.totalEntries === 0 ? (
            <p className="text-ink-muted text-sm">
              {filtersActive
                ? 'No entries match these filters.'
                : 'Nothing has been logged for this activity yet.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BreakdownTable title="By Shakha" rows={stats.byShakha} valueLabel={stats.valueLabel} />
              <BreakdownTable title="By Participant Type" rows={stats.byParticipantType} valueLabel={stats.valueLabel} />
              <BreakdownTable title="By Age Band" rows={stats.byAgeBand} valueLabel={stats.valueLabel} />
              <BreakdownTable title="By Gender" rows={stats.byGender} valueLabel={stats.valueLabel} />
              <BreakdownTable title="By Area" rows={stats.byArea} valueLabel={stats.valueLabel} />
              <BreakdownTable
                title="Top Participants"
                rows={stats.topParticipants}
                valueLabel={stats.valueLabel}
                hideParticipants
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
  valueLabel,
  hideParticipants,
}: {
  title: string;
  rows: StatsBreakdownRow[];
  valueLabel: string;
  hideParticipants?: boolean;
}) {
  if (rows.length === 0) return null;

  const max = Math.max(...rows.map((r) => r.total), 1);

  return (
    <div>
      <h3 className="text-sm font-display font-semibold text-ink mb-2">{title}</h3>
      <div className="overflow-x-auto rounded-card border border-ink/10">
        <table className="w-full text-sm">
          <thead className="bg-paper-raised text-ink-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-right px-3 py-2 whitespace-nowrap">{valueLabel}</th>
              {!hideParticipants && <th className="text-right px-3 py-2">People</th>}
              <th className="text-right px-3 py-2">Entries</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-ink/10">
                <td className="px-3 py-2 text-ink">
                  <div>{r.label}</div>
                  {/* Inline proportion bar — keeps the visual comparison a
                      chart would give without a separate chart component. */}
                  <div className="h-1 bg-ink/5 rounded mt-1 overflow-hidden">
                    <div
                      className="h-full bg-marigold"
                      style={{ width: `${Math.round((r.total / max) * 100)}%` }}
                    />
                  </div>
                </td>
                <td className="px-3 py-2 text-right text-ink font-medium align-top">{r.total}</td>
                {!hideParticipants && (
                  <td className="px-3 py-2 text-right text-ink-light align-top">{r.participants}</td>
                )}
                <td className="px-3 py-2 text-right text-ink-light align-top">{r.entries}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-paper-raised rounded-card border border-ink/10 p-4">
      <p className={`text-2xl font-display font-semibold ${accent ? 'text-marigold-dark' : 'text-ink'}`}>
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-ink-muted mt-1">{label}</p>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'Ongoing'
      ? 'bg-sage/15 text-sage'
      : status === 'Upcoming'
      ? 'bg-marigold/15 text-marigold-dark'
      : 'bg-ink/10 text-ink-muted';
  return (
    <span className={`text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded whitespace-nowrap ${cls}`}>
      {status}
    </span>
  );
}
