'use client';

import { useEffect, useState } from 'react';

export function LocalClock({ label = 'Local Time' }: { label?: string }) {
  const [t, setT] = useState<{ h: string; m: string; ampm: string } | null>(null);
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      let h = d.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12; if (h === 0) h = 12;
      setT({
        h: String(h).padStart(2, '0'),
        m: String(d.getMinutes()).padStart(2, '0'),
        ampm,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs faint uppercase" style={{ letterSpacing: '0.08em' }}>{label}</span>
      <span className="text-sm tab-nums">
        {t ? (
          <>
            {t.h}<span className="blink">:</span>{t.m} <span className="muted">{t.ampm}</span>
          </>
        ) : '— : —'}
      </span>
    </div>
  );
}
