import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const USER_KEY = 'hss_user_id';
const USER_NAME_KEY = 'hss_user_name';
const ADMIN_KEY = 'hss_admin_email';
const ADMIN_NAME_KEY = 'hss_admin_name';

/**
 * The single sign-in / sign-out control for the whole app. Renders as its
 * own slim strip BELOW the header rather than inside it, so it never
 * competes with the nav for horizontal space on narrow screens.
 *
 * Place it in components/Layout.tsx directly after the sticky header
 * wrapper. Because it's the one place sign-out lives, individual pages
 * (My Shakha, Coordinator, Admin) must NOT render their own sign-out
 * button — that's what caused it to appear twice.
 *
 * Handles both session kinds: the participant/coordinator session
 * (hss_user_id) and the admin session (hss_admin_email).
 */
export default function UserMenu() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function sync() {
      const userId = localStorage.getItem(USER_KEY);
      const adminEmail = localStorage.getItem(ADMIN_KEY);

      if (userId) {
        setName(localStorage.getItem(USER_NAME_KEY) || 'My Account');
        setIsAdmin(false);
      } else if (adminEmail) {
        setName(localStorage.getItem(ADMIN_NAME_KEY) || adminEmail);
        setIsAdmin(true);
      } else {
        setName(null);
        setIsAdmin(false);
      }
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
    const wasAdmin = isAdmin;
    clearSessionUser();
    router.push(wasAdmin ? '/admin' : '/my-shakha');
  }

  // Render a fixed-height placeholder until localStorage has been read, so
  // the server markup and first client render agree (no hydration mismatch)
  // and the page doesn't jump.
  if (!ready) return <div className="h-9" aria-hidden="true" />;

  return (
    <div className="border-b border-ink/10 bg-paper">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-end gap-3">
        {name ? (
          <>
            <span className="text-sm text-ink-muted">Signed in as</span>
            <span className="text-sm text-ink font-medium truncate max-w-[12rem]" title={name}>
              {name}
            </span>
            {isAdmin && (
              <span className="text-[10px] font-mono uppercase tracking-wide bg-marigold/15 text-marigold-dark px-1.5 py-0.5 rounded">
                Admin
              </span>
            )}
            <span className="text-ink/20" aria-hidden="true">|</span>
            <button
              onClick={handleSignOut}
              className="text-sm text-ink-light hover:text-ink underline underline-offset-2 transition-colors"
            >
              Sign out
            </button>
          </>
        ) : (
          <Link
            href="/my-shakha"
            className="text-sm font-medium text-ink-light hover:text-ink transition-colors"
          >
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}

/** Call on participant/coordinator sign-in. */
export function setSessionUser(userId: string, fullName: string) {
  localStorage.setItem(USER_KEY, userId);
  localStorage.setItem(USER_NAME_KEY, fullName || '');
  window.dispatchEvent(new Event('hss-session-change'));
}

/** Call on admin sign-in. */
export function setAdminSession(email: string, fullName: string) {
  localStorage.setItem(ADMIN_KEY, email);
  localStorage.setItem(ADMIN_NAME_KEY, fullName || email);
  window.dispatchEvent(new Event('hss-session-change'));
}

/** Clears whichever session is active. */
export function clearSessionUser() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(ADMIN_KEY);
  localStorage.removeItem(ADMIN_NAME_KEY);
  window.dispatchEvent(new Event('hss-session-change'));
}
