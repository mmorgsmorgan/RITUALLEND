'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { ThemeToggle } from './ThemeToggle';

const links = [
  { href: '/',       label: 'Market', num: '01' },
  { href: '/lend',   label: 'Lend',   num: '02' },
  { href: '/borrow', label: 'Borrow', num: '03' },
  { href: '/credit', label: 'Credit', num: '04' },
];

const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

export function Nav() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const injected = connectors.find((c) => c.id === 'injected') ?? connectors[0];
  const [open, setOpen] = useState(false);

  return (
    <header className="rule-bottom">
      <div className="l-wrapper flex items-center justify-between h-[clamp(56px,48px+1.25vw,72px)] gap-4">
        <Link href="/" className="flex items-center gap-2 font-serif text-base sm:text-lg">
          <span className="dot-accent pulse" />
          <span style={{ letterSpacing: '0.08em' }}>RITUALLEND</span>
        </Link>

        {/* desktop nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-baseline gap-2 transition"
                style={{ color: active ? 'var(--color-ink)' : 'var(--color-ink-muted)' }}
              >
                <span className="menu-num text-xs">{l.num}</span>
                <span className="text-sm">{l.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isConnected ? (
            <button className="btn btn-outline-accent" onClick={() => disconnect()}>
              <span className="dot-accent" style={{ marginRight: 4 }} />
              {short(address)}
            </button>
          ) : (
            <button
              className="btn btn-accent"
              onClick={() => injected && connect({ connector: injected })}
            >
              Connect Wallet
              <span className="arrow">→</span>
            </button>
          )}
          <button
            aria-label="menu"
            aria-expanded={open}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 border border-[color:var(--color-rule)] rounded-full"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="flex flex-col gap-[5px]">
              <span className="block w-4 h-px bg-current" />
              <span className="block w-4 h-px bg-current" />
            </span>
          </button>
        </div>
      </div>

      {/* mobile drawer */}
      {open && (
        <nav className="lg:hidden rule-top">
          <ul className="l-wrapper py-4 flex flex-col gap-3">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex items-baseline gap-3 py-2"
                    style={{ color: active ? 'var(--color-ink)' : 'var(--color-ink-muted)' }}
                  >
                    <span className="menu-num text-xs">{l.num}</span>
                    <span className="text-base">{l.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
