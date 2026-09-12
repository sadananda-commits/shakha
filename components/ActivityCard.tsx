import { Activity } from '@/lib/types';

export default function ActivityCard({ activity }: { activity: Activity }) {
  return (
    <div className="bg-paper-raised rounded-card border border-ink/10 p-5 flex flex-col gap-2">
      <span className="text-xs font-mono uppercase tracking-wide text-marigold-dark">
        {activity.Category}
      </span>
      <h3 className="text-lg font-display font-semibold text-ink">
        {activity['Activity Name']}
      </h3>
      <p className="text-sm text-ink-light leading-relaxed">{activity.Description}</p>
    </div>
  );
}
