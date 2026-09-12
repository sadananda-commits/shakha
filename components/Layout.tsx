import Nav from './Nav';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-ink/10 py-8 mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-sm text-ink-muted">
          Hindu Swayamsevak Sangh — Denmark
        </div>
      </footer>
    </div>
  );
}
