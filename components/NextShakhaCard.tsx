import { ScheduleEntry, Shakha } from '@/lib/types';

export default function NextShakhaCard({
  shakha,
  schedule,
}: {
  shakha: Shakha | null;
  schedule: ScheduleEntry | null;
}) {
  if (!shakha) return null;

  return (
    <div className="bg-ink text-paper rounded-card p-6 sm:p-8">
      <p className="text-xs font-mono uppercase tracking-wide text-marigold mb-2">
        Next Shakha
      </p>
      {schedule ? (
        <>
          <p className="text-2xl font-display font-semibold">
            {formatDate(schedule.Date)}
          </p>
          <p className="text-paper/80 mt-1">
            {schedule['Start Time']} – {schedule['End Time']} · {schedule.Location}
          </p>
          {schedule.Status === 'Special Event' && (
            <span className="inline-block mt-3 text-xs font-mono bg-marigold text-ink px-2 py-1 rounded">
              Special Event
            </span>
          )}
        </>
      ) : (
        <p className="text-paper/80">No upcoming date has been scheduled yet.</p>
      )}
      <div className="mt-5 pt-5 border-t border-paper/15 text-sm text-paper/70">
        {shakha['Shakha Name']} · {shakha.Area}
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
