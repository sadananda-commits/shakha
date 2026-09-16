import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const SESSION_KEY = 'hss_user_id';
const NAME_KEY = 'hss_user_name';

/**
 * Shows the signed-in person's name with a Sign out button, or a Sign in
 * link when signed out. Place this in the right-hand side of the header
 * in components/Layout.tsx so it appears on every page.
 *
 * The name is read from localStorage rather than fetched, so the header
 * renders instantly on every page without an API round-trip. My Shakha
 * writes it there on sign-in (see setSessionUser below) and clears it on
 * sign-out; the 'hss-session-change' event keeps this component in sync
 * when that happens in the same tab, and the native 'storage' event
 * covers other tabs.
 */
export default function UserMenu() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function sync() {
      const userId = localStorage.getItem(SESSION_KEY);
      setName(userId ? localStorage.getItem(NAME_KEY) || 'My Account' : null);
      setReady(true);
    }
    sync();
    window.addEventListener('hss-session-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('hss-session-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  function handleSignOut() {
    clearSessionUser();
    router.push('/my-shakha');
  }

  // Render nothing until localStorage has been read, so the server-rendered
  // markup and the first client render agree (avoids a hydration mismatch).
  if (!ready) return <div className="h-5" aria-hidden="true" />;

  if (!name) {
    return (
      <Link
        href="/my-shakha"
        className="text-sm font-medium text-ink-light hover:text-ink transition-colors"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-ink font-medium truncate max-w-[10rem]" title={name}>
        {name}
      </span>
      <span className="text-ink/20" aria-hidden="true">|</span>
      <button
        onClick={handleSignOut}
        className="text-sm text-ink-light hover:text-ink underline underline-offset-2 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}

/** Call on successful sign-in so the header picks up the name immediately. */
export function setSessionUser(userId: string, fullName: string) {
  localStorage.setItem(SESSION_KEY, userId);
  localStorage.setItem(NAME_KEY, fullName || '');
  window.dispatchEvent(new Event('hss-session-change'));
}

/** Call on sign-out. */
export function clearSessionUser() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(NAME_KEY);
  window.dispatchEvent(new Event('hss-session-change'));
}
