import { useEffect, useState } from 'react';
import { callHssApi } from '@/lib/hssApi';
import { ParticipantType } from '@/lib/types';

// Participant Types (Shishu / Bal / Kishore / Tarun / Praudh / Jestha by
// default) are defined on the "Participant Types" Google Sheet tab, not
// hardcoded here. useParticipantTypes() fetches them once per session
// (cached in-memory below) so the report form, the stats table, and the
// Record Shakha Numbers grid all stay in sync automatically — editing
// that sheet is the only thing needed to add, rename, reorder, or retire
// a category anywhere in the app.

let cachedTypes: ParticipantType[] | null = null;
let inFlight: Promise<ParticipantType[]> | null = null;

function fetchParticipantTypes(): Promise<ParticipantType[]> {
  if (cachedTypes) return Promise.resolve(cachedTypes);
  if (!inFlight) {
    inFlight = callHssApi<ParticipantType[]>('getParticipantTypes', {})
      .then((types) => {
        cachedTypes = types;
        inFlight = null;
        return types;
      })
      .catch((err) => {
        inFlight = null;
        throw err;
      });
  }
  return inFlight;
}

/** Active Participant Types, in Display Order, with a loading flag. */
export function useParticipantTypes() {
  const [types, setTypes] = useState<ParticipantType[]>(cachedTypes ?? []);
  const [loading, setLoading] = useState(!cachedTypes);

  useEffect(() => {
    if (cachedTypes) return;
    let active = true;
    fetchParticipantTypes()
      .then((t) => {
        if (active) {
          setTypes(t);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { types, loading };
}

/** A zero-filled composition object for the given types — handy as a loading-state default. */
export function emptyComposition(types: ParticipantType[]): Record<string, number> {
  const out: Record<string, number> = {};
  types.forEach((t) => {
    out[t['Type Key']] = 0;
  });
  return out;
}
