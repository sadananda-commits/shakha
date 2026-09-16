import { useEffect, useState } from 'react';
import { callHssApi } from '@/lib/hssApi';
import { Announcement } from '@/lib/types';

/**
 * Scrolling announcement bar. Content comes from the "Announcements"
 * Sheet tab — message text, an optional link, an optional start/end date
 * window, and a priority order. Nothing renders when there's no active
 * announcement, so the bar costs no vertical space the rest of the time.
 *
 * Add this once near the top of components/Layout.tsx, above the header,
 * and it appears on every page.
 */
export default function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    callHssApi<Announcement[]>('getAnnouncements', {})
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]));
  }, []);

  if (announcements.length === 0) return null;

  // Duplicated so the marquee loop has no visible gap when it wraps.
  const items = [...announcements, ...announcements];

  return (
    <div className="bg-ink text-paper overflow-hidden relative" role="region" aria-label="Announcements">
      <div className="announcement-track flex whitespace-nowrap py-2">
        {items.map((a, i) => (
          <span key={`${a.id}-${i}`} className="inline-flex items-center gap-2 px-8 text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-marigold flex-shrink-0" aria-hidden="true" />
            <span>{a.message}</span>
            {a.linkUrl && (
              <a
                href={a.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-marigold underline underline-offset-2"
              >
                {a.linkLabel || 'Read more'}
              </a>
            )}
          </span>
        ))}
      </div>

      {/* Screen readers get a static, non-duplicated copy instead of the
          scrolling text, which is unreadable when announced. */}
      <div className="sr-only">
        {announcements.map((a) => (
          <p key={a.id}>{a.message}</p>
        ))}
      </div>

      <style jsx>{`
        .announcement-track {
          animation: announcement-scroll 40s linear infinite;
          width: max-content;
        }
        .announcement-track:hover {
          animation-play-state: paused;
        }
        @keyframes announcement-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .announcement-track {
            animation: none;
            width: 100%;
            white-space: normal;
          }
        }
      `}</style>
    </div>
  );
}
