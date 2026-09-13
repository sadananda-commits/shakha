import { formatDisplayTime } from './format';

/**
 * A single row of a parsed "Day Schedule" cell.
 *
 * The sheet stores one line per activity, e.g.:
 *   10:00 Start of Shakha: Shreya Ji
 *   10:05 Warm up - Krish Ji
 *   10:50 Break
 *   11:10 Baudhik- Shubhalaxmi Ji + Abhinav Ji + Devyansh Ji
 *
 * Each line starts with an HH:MM time, followed by the activity name,
 * optionally followed by a ':' or '-' separator and the person
 * responsible. Some lines (e.g. "Break") have no separator/person.
 */
export interface DayScheduleRow {
  /** Raw 'HH:MM' time as it appears in the sheet. */
  time: string;
  /** Human-friendly display time, e.g. '10:00 AM'. */
  displayTime: string;
  /** The activity name. */
  activity: string;
  /** The person/people responsible, if given. */
  responsible?: string;
}

const LINE_PATTERN = /^(\d{1,2}:\d{2})\s*(.*)$/;

/**
 * Parses a raw multi-line "Day Schedule" cell into structured rows.
 * Blank lines are ignored. Lines that don't start with a time are
 * skipped, since they don't match the expected format.
 */
export function parseDaySchedule(raw: string | null | undefined): DayScheduleRow[] {
  if (!raw) return [];

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(LINE_PATTERN);
      if (!match) return null;

      const [, time, rest] = match;

      // Split on the first ':' or '-' to separate activity from the
      // person responsible. Some lines (e.g. "Break") have neither.
      const sepMatch = rest.match(/[:-]/);
      let activity = rest.trim();
      let responsible: string | undefined;

      if (sepMatch && sepMatch.index !== undefined) {
        activity = rest.slice(0, sepMatch.index).trim();
        responsible = rest.slice(sepMatch.index + 1).trim() || undefined;
      }

      const row: DayScheduleRow = {
        time,
        displayTime: formatDisplayTime(time),
        activity,
        responsible,
      };
      return row;
    })
    .filter((row): row is DayScheduleRow => row !== null);
}
