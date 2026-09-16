import { useEffect, useState } from 'react';
import { callHssApi } from '@/lib/hssApi';
import { UtilityLink } from '@/lib/types';

/**
 * Important links list. Content comes from the "Utility Links" Sheet tab,
 * grouped by its Category column and ordered by Display Order — so adding
 * or reordering a link is a Sheet edit, not a deploy.
 *
 * Give it id="utilities" wherever it's placed so /#utilities anchors to it.
 */
export default function UtilitiesSection({ title = 'Utilities' }: { title?: string }) {
  const [links, setLinks] = useState<UtilityLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    callHssApi<UtilityLink[]>('getUtilityLinks', {})
      .then(setLinks)
      .catch(() => setLinks([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section id="utilities" className="scroll-mt-20">
        <h2 className="text-lg font-display font-semibold text-ink mb-3">{title}</h2>
        <p className="text-ink-muted text-sm">Loading…</p>
      </section>
    );
  }

  if (links.length === 0) return null;

  // Preserve the sheet's Display Order for categories: a category's
  // position is decided by the first link that appears in it.
  const categories: string[] = [];
  links.forEach((l) => {
    const cat = l.category || 'General';
    if (!categories.includes(cat)) categories.push(cat);
  });

  return (
    <section id="utilities" className="scroll-mt-20">
      <h2 className="text-lg font-display font-semibold text-ink mb-4">{title}</h2>

      <div className="flex flex-col gap-6">
        {categories.map((cat) => (
          <div key={cat}>
            {categories.length > 1 && (
              <h3 className="text-xs font-mono uppercase tracking-wide text-marigold-dark mb-2">
                {cat}
              </h3>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {links
                .filter((l) => (l.category || 'General') === cat)
                .map((l) => (
                  <a
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-paper-raised rounded-card border border-ink/10 p-4 hover:border-marigold transition-colors group"
                  >
                    <p className="font-display font-semibold text-ink group-hover:text-marigold-dark transition-colors">
                      {l.title}
                    </p>
                    {l.description && (
                      <p className="text-xs text-ink-muted mt-1 leading-relaxed">{l.description}</p>
                    )}
                  </a>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
