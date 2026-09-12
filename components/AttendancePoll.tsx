import { useState } from 'react';
import { AttendanceResponse, Participant } from '@/lib/types';

const OPTIONS: { value: AttendanceResponse; label: string; emoji: string }[] = [
  { value: 'Yes', label: 'Yes, I will attend', emoji: '✅' },
  { value: 'No', label: 'No, I will not attend', emoji: '❌' },
  { value: 'Not Sure', label: 'Not sure yet', emoji: '❓' },
];

export default function AttendancePoll({
  participants,
  initialResponses,
  onSubmit,
}: {
  participants: Participant[];
  initialResponses: Record<string, AttendanceResponse>;
  onSubmit: (responses: Record<string, AttendanceResponse>) => Promise<void>;
}) {
  const [responses, setResponses] = useState<Record<string, AttendanceResponse>>(
    initialResponses
  );
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
    <div className="bg-paper-raised rounded-card border border-ink/10 p-5 sm:p-6">
      <h3 className="font-display text-lg font-semibold text-ink mb-1">
        Will you attend the next Shakha?
      </h3>
      <p className="text-sm text-ink-muted mb-5">Takes less than 30 seconds.</p>

      <div className="flex flex-col gap-5">
        {participants.map((p) => (
          <div key={p['Participant ID']}>
            <p className="text-sm font-medium text-ink mb-2">{p['Participant Name']}</p>
            <div className="grid grid-cols-3 gap-2">
              {OPTIONS.map((opt) => {
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
