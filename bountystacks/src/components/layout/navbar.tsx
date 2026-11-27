'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { ConnectButton } from '../wallet/connect-button';

const links = [
  { href: '/', label: 'Browse' },
  { href: '/bounties/create', label: 'Post a bounty' },
  { href: '/verify', label: 'Verify' },
  { href: '/dashboard/contributor', label: 'Dashboard' },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="shell site-header-inner">
        <Link href="/" className="brand" onClick={closeMenu}>
          <span className="brand-mark">B</span>
          <span>BountyStacks</span>
        </Link>

        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map((link) => (
            <Link href={link.href} className="muted nav-link" key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          <div className="desktop-wallet">
            <ConnectButton />
          </div>
          <button
            type="button"
            className="mobile-menu-button btn btn-secondary"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">
          {links.map((link) => (
            <Link href={link.href} className="mobile-nav-link" key={link.href} onClick={closeMenu}>
              {link.label}
            </Link>
          ))}
          <div className="mobile-wallet">
            <ConnectButton />
          </div>
        </nav>
      )}
    </header>
  );
}
