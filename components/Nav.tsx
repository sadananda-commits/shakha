import Link from 'next/link';
import { useRouter } from 'next/router';

// Baudhik/Khel Repository moved into the My Shakha, Coordinator, and Admin
// page menus — they no longer live in the top bar.
const LINKS = [
  { href: '/', label: 'HSS Home' },
  { href: '/find-shakha', label: 'Find a Shakha' },
  { href: '/my-shakha', label: 'My Shakha' },
];

const ACTION_LINKS = [
  { href: '/coordinator', label: 'Coordinator' },
  { href: '/admin', label: 'Admin Login' },
];

export default function Nav() {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur border-b border-ink/10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        <Link
          href="/"
          className="font-display text-lg font-semibold text-ink tracking-tight flex-shrink-0"
        >
          HSS Denmark
        </Link>

        {/* Everything else shares one row with a single, consistent gap so
            spacing stays even end to end instead of clumping the action
            buttons against the last nav link. */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                router.pathname === link.href
                  ? 'text-marigold-dark'
                  : 'text-ink-light hover:text-ink transition-colors'
              }
            >
              {link.label}
            </Link>
          ))}

          <span className="w-px h-5 bg-ink/10" aria-hidden="true" />

          {ACTION_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-card border transition-colors ${
                router.pathname === link.href
                  ? 'border-marigold-dark text-marigold-dark'
                  : 'border-ink/15 text-ink hover:border-ink/30'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* mobile nav */}
      <nav className="md:hidden flex items-center gap-5 overflow-x-auto px-4 pb-3 text-sm font-medium">
        {[...LINKS, ...ACTION_LINKS].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              router.pathname === link.href
                ? 'text-marigold-dark whitespace-nowrap'
                : 'text-ink-light whitespace-nowrap'
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}