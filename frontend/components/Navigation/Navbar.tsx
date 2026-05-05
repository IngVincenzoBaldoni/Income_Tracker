import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function Navbar() {
  const { user, logout, isLoggedIn } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
  ];

  return (
    <nav className="bg-background-card border-b border-gray-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href={isLoggedIn ? '/dashboard' : '/'} className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">CT</div>
            <span className="text-white font-semibold text-lg hidden sm:block">Career Tracker</span>
          </Link>

          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      router.pathname === link.href
                        ? 'bg-primary/20 text-accent'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700/50 transition-colors"
                >
                  <div className="h-7 w-7 rounded-full bg-primary/30 flex items-center justify-center text-xs font-semibold text-accent">
                    {user?.email?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <span className="text-sm hidden sm:block">{user?.email}</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-background-card rounded-lg border border-gray-700 shadow-lg py-1 z-50">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700/50 md:hidden"
                        onClick={() => setMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                    <button
                      onClick={() => { setMenuOpen(false); logout(); }}
                      className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-gray-700/50"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/auth/login" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                Sign in
              </Link>
              <Link href="/auth/signup" className="btn-primary text-sm py-2 px-4">
                Get started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
