'use client';

import { useTheme } from '@/lib/theme';

export function ThemeToggle() {
  const { choice, resolved, cycle } = useTheme();
  const label =
    choice === 'system'
      ? `auto · ${resolved}`
      : choice;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${label}. Click to change.`}
      title={`Theme: ${label}`}
      className="inline-flex items-center justify-center w-10 h-10 rounded-full border"
      style={{ borderColor: 'var(--color-rule-strong)', color: 'var(--color-ink)' }}
    >
      {resolved === 'dark' ? <MoonIcon /> : <SunIcon />}
      {choice === 'system' && (
        <span
          aria-hidden
          className="absolute -mt-6 ml-6 w-1.5 h-1.5 rounded-full dot-pulse"
          style={{ background: 'var(--color-accent)', position: 'relative' }}
        />
      )}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
