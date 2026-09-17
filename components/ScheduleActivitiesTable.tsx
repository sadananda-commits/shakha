import { ScheduleActivity } from '@/lib/types';

export default function ScheduleActivitiesTable({ activities }: { activities: ScheduleActivity[] }) {
  if (activities.length === 0) return null;

  return (
    <div className="bg-paper-raised rounded-card border border-ink/10 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-ink/5 text-ink-muted text-xs uppercase tracking-wide">
          <tr>
            <th className="text-left px-4 py-2">Time</th>
            <th className="text-left px-4 py-2">Activity</th>
            <th className="text-left px-4 py-2">Responsible</th>
            <th className="text-left px-4 py-2">Comments</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a) => (
            <tr key={a['Activity Row ID']} className="border-t border-ink/10">
              <td className="px-4 py-2 font-mono text-ink-light whitespace-nowrap">
                {a['Activity Time']}
              </td>
              <td className="px-4 py-2 text-ink font-medium">{a['Activity Name']}</td>
              <td className="px-4 py-2 text-ink-light">{a['Responsible Person']}</td>
              <td className="px-4 py-2 text-ink-light">{a['Remarks'] || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
