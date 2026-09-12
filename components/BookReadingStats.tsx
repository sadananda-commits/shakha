import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { callHssApi } from '@/lib/hssApi';
import { ActivityStatsBundle, CommunityActivity } from '@/lib/types';

export default function BookReadingStats() {
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [activityId, setActivityId] = useState('');
  const [stats, setStats] = useState<ActivityStatsBundle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    callHssApi<CommunityActivity[]>('getActivityList', { status: 'All' })
      .then((all) => {
        const readingActivities = all.filter((a) => a['Type'] === 'Reading Marathon');
        setActivities(readingActivities);
        const preferred =
          readingActivities.find((a) => a['Status'] === 'Ongoing') || readingActivities[0];
        if (preferred) setActivityId(preferred['Activity ID']);
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activityId) return;
    setLoading(true);
    callHssApi<ActivityStatsBundle>('getActivityStats', { activityId })
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [activityId]);

  if (activities.length === 0 && !loading) {
    return null; // nothing to show until at least one Reading Marathon activity exists
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-lg font-display font-semibold text-ink">Book Reading — Shakha Contribution</h2>
        {activities.length > 1 && (
          <select value={activityId} onChange={(e) => setActivityId(e.target.value)} className="input w-auto">
            {activities.map((a) => (
              <option key={a['Activity ID']} value={a['Activity ID']}>
                {a['Activity Name']} ({a['Status']})
              </option>
            ))}
          </select>
        )}
      </div>

      {loading && <p className="text-ink-muted text-sm">Loading…</p>}

      {!loading && stats && (
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm text-ink-muted">
              {stats.activity['Activity Name']} — {stats.activity['Start Date']} to {stats.activity['End Date']}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard label="Participants" value={stats.overall.totalParticipants} />
            <StatCard label="Distinct Books" value={stats.overall.totalBooks} accent="marigold" />
            <StatCard label="Total Pages Read" value={stats.overall.totalPagesRead} accent="sage" />
            <StatCard label="Entries Logged" value={stats.overall.totalEntries} />
            <StatCard label="Shakhas Contributing" value={stats.overall.totalShakhas} />
          </div>

          {stats.byShakha.length > 0 ? (
            <>
              <div className="bg-paper-raised rounded-card border border-ink/10 p-4 sm:p-5">
                <h3 className="text-sm font-display font-semibold text-ink mb-4">Pages Read by Shakha</h3>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={stats.byShakha} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                      <XAxis
                        dataKey="shakhaName"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        formatter={(value: number) => [value, 'Pages Read']}
                      />
                      <Bar dataKey="pagesRead" fill="#C24914" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-paper-raised rounded-card border border-ink/10 p-4 sm:p-5">
                <h3 className="text-sm font-display font-semibold text-ink mb-4">Participants by Shakha</h3>
                <div style={{ width: '100%', height: 240 }}>
                  <ResponsiveContainer>
                    <BarChart data={stats.byShakha} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                      <XAxis
                        dataKey="shakhaName"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        formatter={(value: number) => [value, 'Participants']}
                      />
                      <Bar dataKey="participants" fill="#2E4374" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-display font-semibold text-ink mb-3">Detailed Breakdown</h3>
                <div className="overflow-x-auto rounded-card border border-ink/10">
                  <table className="w-full text-sm">
                    <thead className="bg-paper-raised text-ink-muted text-xs uppercase tracking-wide">
                      <tr>
                        <th className="text-left px-4 py-2">Shakha</th>
                        <th className="text-right px-4 py-2">Participants</th>
                        <th className="text-right px-4 py-2">Books</th>
                        <th className="text-right px-4 py-2">Pages Read</th>
                        <th className="text-right px-4 py-2">Entries</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.byShakha.map((row) => (
                        <tr key={row.shakhaId} className="border-t border-ink/10">
                          <td className="px-4 py-2 text-ink">{row.shakhaName}</td>
                          <td className="px-4 py-2 text-right text-ink-light">{row.participants}</td>
                          <td className="px-4 py-2 text-right text-ink-light">{row.books}</td>
                          <td className="px-4 py-2 text-right text-ink font-medium">{row.pagesRead}</td>
                          <td className="px-4 py-2 text-right text-ink-light">{row.entries}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <p className="text-ink-muted text-sm">No reading has been logged for this activity yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'marigold' | 'sage';
}) {
  return (
    <div className="bg-paper-raised rounded-card border border-ink/10 p-4">
      <p
        className={`text-2xl font-display font-semibold ${
          accent === 'marigold' ? 'text-marigold-dark' : accent === 'sage' ? 'text-sage' : 'text-ink'
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-ink-muted mt-1">{label}</p>
    </div>
  );
}
