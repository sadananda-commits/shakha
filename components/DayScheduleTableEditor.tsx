import { useState } from 'react';

export type DayScheduleRow = {
  id: string;
  time: string;
  activity: string;
  responsible: string;
  comments: string;
};

let rowSeq = 0;
function newRowId() {
  rowSeq += 1;
  return `row-${Date.now()}-${rowSeq}`;
}

function emptyRow(): DayScheduleRow {
  return { id: newRowId(), time: '', activity: '', responsible: '', comments: '' };
}

/**
 * Parses a stored "Day Schedule" string back into rows.
 * Understands the current "Time - Activity - Responsible - Comments" format
 * as well as older free-text lines (e.g. "10:00 Start of Shakha: Shreya Ji"),
 * so existing schedules don't break when reopened for editing.
 */
export function parseDaySchedule(text: string): DayScheduleRow[] {
  if (!text || !text.trim()) return [];

  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      // Pull a leading time like "10:00", "10.00", or "10:00 -" off the front.
      const timeMatch = line.match(/^(\d{1,2}[:.]\d{2})\s*[-–:]?\s*/);
      const time = timeMatch ? timeMatch[1].replace('.', ':') : '';
      const rest = timeMatch ? line.slice(timeMatch[0].length) : line;

      // Prefer " - " separated segments (the current format).
      let segments = rest.split(' - ').map((s) => s.trim()).filter(Boolean);

      // Fall back to "Activity: Responsible" for older entries.
      if (segments.length < 2 && rest.includes(':')) {
        segments = rest.split(':').map((s) => s.trim()).filter(Boolean);
      }

      const [activity = '', responsible = '', ...commentParts] = segments;

      return {
        id: newRowId(),
        time,
        activity: activity || rest,
        responsible,
        comments: commentParts.join(' - '),
      };
    });
}

/** Serializes rows back into the "Time - Activity - Responsible - Comments" string stored on the schedule. */
export function serializeDaySchedule(rows: DayScheduleRow[]): string {
  return rows
    .filter((r) => r.time || r.activity || r.responsible || r.comments)
    .map((r) => [r.time, r.activity, r.responsible, r.comments].filter((v) => v).join(' - '))
    .join('\n');
}

export default function DayScheduleTableEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [rows, setRows] = useState<DayScheduleRow[]>(() => {
    const parsed = parseDaySchedule(value);
    return parsed.length > 0 ? parsed : [emptyRow()];
  });

  function updateRows(next: DayScheduleRow[]) {
    setRows(next);
    onChange(serializeDaySchedule(next));
  }

  function updateCell(id: string, field: keyof Omit<DayScheduleRow, 'id'>, val: string) {
    updateRows(rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  }

  function addRow() {
    updateRows([...rows, emptyRow()]);
  }

  function removeRow(id: string) {
    const next = rows.filter((r) => r.id !== id);
    updateRows(next.length > 0 ? next : [emptyRow()]);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-card border border-ink/10">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-paper-raised text-ink-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2 w-24">Time</th>
              <th className="text-left px-3 py-2">Activity</th>
              <th className="text-left px-3 py-2">Responsible</th>
              <th className="text-left px-3 py-2">Comments / Link</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-ink/10">
                <td className="p-1.5">
                  <input
                    value={row.time}
                    onChange={(e) => updateCell(row.id, 'time', e.target.value)}
                    className="input"
                    placeholder="11:40"
                  />
                </td>
                <td className="p-1.5">
                  <input
                    value={row.activity}
                    onChange={(e) => updateCell(row.id, 'activity', e.target.value)}
                    className="input"
                    placeholder="Baudhik"
                  />
                </td>
                <td className="p-1.5">
                  <input
                    value={row.responsible}
                    onChange={(e) => updateCell(row.id, 'responsible', e.target.value)}
                    className="input"
                    placeholder="Bimal Ji"
                  />
                </td>
                <td className="p-1.5">
                  <input
                    value={row.comments}
                    onChange={(e) => updateCell(row.id, 'comments', e.target.value)}
                    className="input"
                    placeholder="Optional comment or link"
                  />
                </td>
                <td className="p-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="text-ink-muted hover:text-vermilion"
                    aria-label="Remove row"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addRow}
        className="text-sm text-marigold-dark underline underline-offset-2 self-start"
      >
        + Add row
      </button>
    </div>
  );
}
