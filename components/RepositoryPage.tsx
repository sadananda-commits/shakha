import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import FlameDivider from '@/components/FlameDivider';
import { callHssApi } from '@/lib/hssApi';
import { RepositoryResource } from '@/lib/types';

export default function RepositoryPage({
  category,
  title,
}: {
  category: string;
  title: string;
}) {
  const [resources, setResources] = useState<RepositoryResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    callHssApi<RepositoryResource[]>('getRepository', { category })
      .then(setResources)
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-xs font-mono uppercase tracking-widest text-marigold-dark mb-3">
          Repository
        </p>
        <h1 className="text-3xl font-display font-semibold text-ink">{title}</h1>
        <FlameDivider className="my-6 max-w-[200px]" />

        {loading && <p className="text-ink-muted">Loading resources…</p>}

        {!loading && resources.length === 0 && (
          <p className="text-ink-muted">
            No resources are available yet. Check back soon, or contact your Shakha
            coordinator to add one.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {resources.map((r) => (
            <a
              key={r['Resource ID']}
              href={r.URL || '#'}
              target="_blank"
              rel="noreferrer"
              className="block bg-paper-raised rounded-card border border-ink/10 p-4 hover:border-marigold transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-ink">{r['Resource Name']}</p>
                  <p className="text-sm text-ink-light mt-0.5">{r.Description}</p>
                </div>
                <span className="text-xs font-mono text-ink-muted whitespace-nowrap">
                  {r['Resource Type']}
                </span>
              </div>
              <div className="flex gap-3 mt-2 text-xs text-ink-muted">
                <span>{r['Age Group']}</span>
                <span>·</span>
                <span>{r.Language}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </Layout>
  );
}
