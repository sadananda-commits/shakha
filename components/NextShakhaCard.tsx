import { useState } from 'react';
import { AttendanceResponse, Participant, ScheduleEntry, Shakha } from '@/lib/types';
import { formatDisplayDate, formatDisplayTime } from '@/lib/format';
import { parseDaySchedule } from '@/lib/daySchedule';

const ATTENDANCE_OPTIONS: { value: AttendanceResponse; label: string; emoji: string }[] = [
  { value: 'Yes', label: 'Yes, I will attend', emoji: '✅' },
  { value: 'No', label: 'No, I will not attend', emoji: '❌' },
  { value: 'Not Sure', label: 'Not sure yet', emoji: '❓' },
];

export default function NextShakhaCard({
  shakha,
  schedule,
  participants,
  initialResponses,
  onSubmitAttendance,
}: {
  shakha: Shakha | null;
  schedule: ScheduleEntry | null;
  participants: Participant[];
  initialResponses: Record<string, AttendanceResponse>;
  onSubmitAttendance: (responses: Record<string, AttendanceResponse>) => Promise<void>;
}) {
  const [showSchedule, setShowSchedule] = useState(false);

  if (!shakha) return null;

  const dayScheduleRows = schedule?.['Day Schedule'] ? parseDaySchedule(schedule['Day Schedule']) : [];

  return (
    <div className="bg-ink text-paper rounded-card p-6 sm:p-8 flex flex-col gap-6">
      <div>
        <p className="text-xs font-mono uppercase tracking-wide text-marigold mb-2">Next Shakha</p>

        {schedule ? (
          <>
            <p className="text-2xl font-display font-semibold">{formatDisplayDate(schedule.Date)}</p>
            <p className="text-paper/80 mt-1">
              {formatDisplayTime(schedule['Start Time'])} – {formatDisplayTime(schedule['End Time'])} ·{' '}
              {schedule.Location}
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
      </div>

      <div className="pt-1 flex items-center justify-between gap-3 text-sm text-paper/70">
        <span>
          {shakha['Shakha Name']} · {shakha.Area}
        </span>
        {dayScheduleRows.length > 0 && (
          <button
            onClick={() => setShowSchedule((v) => !v)}
            className="text-marigold underline underline-offset-2 font-medium whitespace-nowrap"
          >
            {showSchedule ? 'Hide schedule' : "View today's schedule"}
          </button>
        )}
      </div>

      {showSchedule && dayScheduleRows.length > 0 && (
        <div className="bg-paper text-ink rounded-card border border-ink/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper-raised text-ink-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2">Time</th>
                <th className="text-left px-4 py-2">Activity</th>
                <th className="text-left px-4 py-2">Led by</th>
              </tr>
            </thead>
            <tbody>
              {dayScheduleRows.map((row, i) => (
                <tr key={i} className="border-t border-ink/10">
                  <td className="px-4 py-2 font-mono text-ink-light whitespace-nowrap">
                    {row.displayTime || '—'}
                  </td>
                  <td className="px-4 py-2 text-ink font-medium">{row.activity}</td>
                  <td className="px-4 py-2 text-ink-light">{row.responsible || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {schedule && participants.length > 0 && (
        <AttendancePanel
          participants={participants}
          initialResponses={initialResponses}
          onSubmit={onSubmitAttendance}
        />
      )}
    </div>
  );
}

function AttendancePanel({
  participants,
  initialResponses,
  onSubmit,
}: {
  participants: Participant[];
  initialResponses: Record<string, AttendanceResponse>;
  onSubmit: (responses: Record<string, AttendanceResponse>) => Promise<void>;
}) {
  const [responses, setResponses] = useState<Record<string, AttendanceResponse>>(initialResponses);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  function setResponse(participantId: string, value: AttendanceResponse) {
    setResponses((prev) => ({ ...prev, [participantId]: value }));
    setStatus('idle');
  }

  async function handleSubmit() {
    setStatus('saving');
    try {
      await onSubmit(responses);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="bg-paper text-ink rounded-card border border-ink/10 p-5 sm:p-6">
      <h3 className="font-display text-lg font-semibold text-ink mb-1">
        Will you attend the next Shakha?
      </h3>
      <p className="text-sm text-ink-muted mb-5">Takes less than 30 seconds.</p>

      <div className="flex flex-col gap-5">
        {participants.map((p) => (
          <div key={p['Participant ID']}>
            <p className="text-sm font-medium text-ink mb-2">{p['Participant Name']}</p>
            <div className="grid grid-cols-3 gap-2">
              {ATTENDANCE_OPTIONS.map((opt) => {
                const active = responses[p['Participant ID']] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setResponse(p['Participant ID'], opt.value)}
                    className={`rounded-card border px-2 py-3 text-xs sm:text-sm font-medium transition-colors ${
                      active
                        ? opt.value === 'Yes'
                          ? 'bg-sage/15 border-sage text-sage'
                          : opt.value === 'No'
                          ? 'bg-vermilion/10 border-vermilion text-vermilion'
                          : 'bg-marigold/15 border-marigold-dark text-marigold-dark'
                        : 'border-ink/15 text-ink-light hover:border-ink/30'
                    }`}
                  >
                    <span className="block text-lg mb-1">{opt.emoji}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={status === 'saving'}
        className="mt-6 w-full sm:w-auto px-6 py-3 rounded-card bg-ink text-paper font-medium disabled:opacity-60"
      >
        {status === 'saving' ? 'Saving…' : 'Submit attendance'}
      </button>

      {status === 'saved' && (
        <p className="mt-3 text-sm text-sage">Your response has been recorded successfully.</p>
      )}
      {status === 'error' && (
        <p className="mt-3 text-sm text-vermilion">
          We couldn't save your response right now. Please try again.
        </p>
      )}
    </div>
  );
}