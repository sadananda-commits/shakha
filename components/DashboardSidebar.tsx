import Link from 'next/link';

export interface SidebarItem {
  key: string;
  label: string;
  description: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}

/**
 * Left-hand navigation used by both the Coordinator and Admin dashboards.
 * Each item shows a short description tooltip on hover/focus so the admin
 * (or coordinator) can tell what a menu item does before clicking it.
 *
 * Pass `href` for items that are their own page (e.g. /coordinator/schedule)
 * and `onClick` for items that just switch a section within the same page
 * (used by the condensed Admin Dashboard).
 */
export default function DashboardSidebar({ items }: { items: SidebarItem[] }) {
  return (
    <nav className="sm:w-56 flex-shrink-0">
      <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
        {items.map((item) => {
          const buttonClasses = `block text-left w-full px-4 py-2.5 rounded-card whitespace-nowrap text-sm font-medium transition-colors ${
            item.active ? 'bg-ink text-paper' : 'text-ink-light hover:bg-paper-raised'
          }`;

          const inner = (
            <div className="group relative">
              <span className={buttonClasses} tabIndex={item.href ? -1 : 0}>
                {item.label}
              </span>
              <div
                role="tooltip"
                className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-60 rounded-md bg-ink px-3 py-2 text-xs leading-snug text-paper shadow-lg group-hover:block group-focus-within:block"
              >
                {item.description}
              </div>
            </div>
          );

          if (item.href) {
            return (
              <Link key={item.key} href={item.href} className="focus:outline-none">
                {inner}
              </Link>
            );
          }

          return (
            <button key={item.key} onClick={item.onClick} className="focus:outline-none">
              {inner}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
