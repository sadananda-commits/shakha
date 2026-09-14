import Link from 'next/link';
import { useRouter } from 'next/router';

const LINKS = [
  { href: '/', label: 'HSS Home' },
  { href: '/my-shakha', label: 'My Shakha' },
  { href: '/baudhik', label: 'Baudhik Repository' },
  { href: '/khel', label: 'Khel Repository' },
];

export default function Nav() {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur border-b border-ink/10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-lg font-semibold text-ink tracking-tight">
          HSS Denmark
        </Link>

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
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/coordinator"
            className="text-sm font-medium px-4 py-2 rounded-card border border-ink/15 text-ink hover:border-ink/30 transition-colors"
          >
            Coordinator
          </Link>
          <Link
            href="/admin"
            className="text-sm font-medium px-4 py-2 rounded-card border border-ink/15 text-ink hover:border-ink/30 transition-colors"
          >
            Admin Login
          </Link>
        </div>
      </div>

      {/* mobile nav */}
      <nav className="md:hidden flex items-center gap-4 overflow-x-auto px-4 pb-3 text-sm font-medium">
        {LINKS.map((link) => (
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
        <Link
          href="/coordinator"
          className={
            router.pathname === '/coordinator'
              ? 'text-marigold-dark whitespace-nowrap'
              : 'text-ink-light whitespace-nowrap'
          }
        >
          Coordinator
        </Link>
        <Link
          href="/admin"
          className={
            router.pathname === '/admin'
              ? 'text-marigold-dark whitespace-nowrap'
              : 'text-ink-light whitespace-nowrap'
          }
        >
          Admin Login
        </Link>
      </nav>
    </header>
  );
}
