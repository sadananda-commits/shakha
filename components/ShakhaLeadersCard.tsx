import { useEffect, useState } from 'react';
import { callHssApi } from '@/lib/hssApi';
import { ShakhaLeader } from '@/lib/types';

/**
 * The Shakha's Pramukhs — Baudhik, Shareerik, Dhwaj, Mukhya Shikshak and
 * whatever else is defined. Roles come from the "Shakha Leaders" sheet as
 * free text, so a new role is a sheet edit, not a code change.
 */
export default function ShakhaLeadersCard({
  shakhaId,
  shakhaName,
}: {
  shakhaId: string;
  shakhaName?: string;
}) {
  const [leaders, setLeaders] = useState<ShakhaLeader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shakhaId) return;
    setLoading(true);
    callHssApi<ShakhaLeader[]>('getShakhaLeaders', { shakhaId })
      .then(setLeaders)
      .catch(() => setLeaders([]))
      .finally(() => setLoading(false));
  }, [shakhaId]);

  return (
    <div>
      <h3 className="font-display text-lg font-semibold text-ink mb-3">
        Pramukhs{shakhaName ? ` — ${shakhaName}` : ''}
      </h3>

      {loading && <p className="text-ink-muted text-sm">Loading…</p>}

      {!loading && leaders.length === 0 && (
        <p className="text-ink-muted text-sm">
          No Pramukhs have been listed for this Shakha yet.
        </p>
      )}

      {!loading && leaders.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {leaders.map((l) => (
            <div
              key={l.leaderId}
              className="bg-paper-raised rounded-card border border-ink/10 p-4"
            >
              <p className="text-xs font-mono uppercase tracking-wide text-marigold-dark">
                {l.role}
              </p>
              <p className="font-display font-semibold text-ink mt-1">{l.name}</p>
              {l.contact && <p className="text-sm text-ink-muted mt-0.5">{l.contact}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
