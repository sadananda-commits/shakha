import { useEffect, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ParticipationComposition, WeeklyParticipation } from '@/lib/types';
import { formatDisplayDate } from '@/lib/format';
import {
  PARTICIPATION_CATEGORIES,
  PARTICIPATION_CATEGORY_LABELS,
  PARTICIPATION_CATEGORY_AGE_RANGES,
} from '@/lib/participation';

export default function ParticipationStats({
  title,
  year,
  onYearChange,
  weekly,
  cumulativeTotal,
  composition,
  loading,
  filters,
}: {
  title: string;
  year: string;
  onYearChange: (year: string) => void;
  weekly: WeeklyParticipation[];
  cumulativeTotal: number;
  composition: ParticipationComposition;
  loading: boolean;
  filters?: React.ReactNode;
}) {
  const [years, setYears] = useState<string[]>([]);

  useEffect(() => {
    const current = new Date().getFullYear();
    const list: string[] = [];
    for (let y = current; y >= current - 4; y--) list.push(String(y));
    setYears(list);
  }, []);

  const weeklyAverage = weekly.length > 0 ? Math.round(cumulativeTotal / weekly.length) : 0;

  const chartData = weekly.map((w) => ({
    label: formatDisplayDate(w.date),
    total: w.total,
    cumulative: w.cumulativeTotal,
  }));

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-lg font-display font-semibold text-ink">{title}</h2>
        <div className="flex items-center gap-2">
          {filters}
          <select value={year} onChange={(e) => onYearChange(e.target.value)} className="input w-auto">
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="text-ink-muted text-sm">Loading…</p>}

      {!loading && weekly.length === 0 && (
        <p className="text-ink-muted text-sm">No participation reports for {year} yet.</p>
      )}

      {!loading && weekly.length > 0 && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Cumulative Total" value={cumulativeTotal} />
            <StatCard label="Sessions Reported" value={weekly.length} />
            <StatCard label="Average per Session" value={weeklyAverage} accent="marigold" />
          </div>

          <div className="bg-paper-raised rounded-card border border-ink/10 p-4 sm:p-5">
            <h3 className="text-sm font-display font-semibold text-ink mb-4">
              Weekly Attendance &amp; Cumulative Total
            </h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="total" name="Weekly Attendance" fill="#C24914" radius={[4, 4, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    name="Cumulative Total"
                    stroke="#2E4374"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-display font-semibold text-ink mb-3">
              Composition ({year} total)
            </h3>
            <div className="overflow-x-auto rounded-card border border-ink/10 max-w-sm">
              <table className="w-full text-sm">
                <thead className="bg-paper-raised text-ink-muted text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2">Category</th>
                    <th className="text-right px-4 py-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {PARTICIPATION_CATEGORIES.map((cat) => (
                    <tr key={cat} className="border-t border-ink/10">
                      <td className="px-4 py-2 text-ink">
                        <div className="font-medium">{PARTICIPATION_CATEGORY_LABELS[cat]}</div>
                        <div className="text-xs text-ink-muted">{PARTICIPATION_CATEGORY_AGE_RANGES[cat]}</div>
                      </td>
                      <td className="px-4 py-2 text-right text-ink font-medium align-top">
                        {composition[cat] || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: 'marigold' }) {
  return (
    <div className="bg-paper-raised rounded-card border border-ink/10 p-4">
      <p className={`text-2xl font-display font-semibold ${accent === 'marigold' ? 'text-marigold-dark' : 'text-ink'}`}>
        {value}
      </p>
      <p className="text-xs text-ink-muted mt-1">{label}</p>
    </div>
  );
}
