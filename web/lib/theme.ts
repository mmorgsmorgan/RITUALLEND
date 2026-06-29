'use client';

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
export type ThemeChoice = Theme | 'system';

const STORAGE_KEY = 'rl-theme';

function readStored(): ThemeChoice {
  if (typeof window === 'undefined') return 'system';
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch { return 'system'; }
}

function systemPref(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyToDOM(choice: ThemeChoice) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (choice === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', choice);
  }
}

/** Hook returning current resolved theme + the user's choice + a setter. */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>('system');
  const [resolved, setResolved] = useState<Theme>('light');

  useEffect(() => {
    setChoice(readStored());

    const recompute = () => {
      const c = readStored();
      setChoice(c);
      setResolved(c === 'system' ? systemPref() : c);
    };
    recompute();

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', recompute);
    return () => mq.removeEventListener('change', recompute);
  }, []);

  const set = (next: ThemeChoice) => {
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    applyToDOM(next);
    setChoice(next);
    setResolved(next === 'system' ? systemPref() : next);
  };

  // 3-way cycle: light → dark → system → light
  const cycle = () => {
    const next: ThemeChoice = choice === 'light' ? 'dark' : choice === 'dark' ? 'system' : 'light';
    set(next);
  };

  return { choice, resolved, set, cycle };
}

/** Read a CSS variable from <html>. Returns its computed value. */
export function readCssVar(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Reactive hook: returns the live computed values of a set of CSS vars,
 * re-reading them whenever the resolved theme changes. */
export function useCssVars<K extends string>(names: readonly K[]): Record<K, string> {
  const { resolved } = useTheme();
  const [vals, setVals] = useState<Record<K, string>>(() => {
    const v: Record<string, string> = {};
    names.forEach((n) => (v[n] = ''));
    return v as Record<K, string>;
  });
  useEffect(() => {
    const v: Record<string, string> = {};
    names.forEach((n) => (v[n] = readCssVar(n)));
    setVals(v as Record<K, string>);
  }, [resolved, names]);
  return vals;
}
