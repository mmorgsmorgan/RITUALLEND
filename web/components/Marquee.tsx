'use client';

export function Marquee({ text }: { text: string }) {
  const items = Array.from({ length: 8 }, (_, i) => i);
  return (
    <div className="marquee" aria-hidden>
      <div className="marquee__track">
        {items.map((i) => (
          <span key={`a-${i}`} className="text-sm muted">{text}</span>
        ))}
      </div>
      <div className="marquee__track">
        {items.map((i) => (
          <span key={`b-${i}`} className="text-sm muted">{text}</span>
        ))}
      </div>
    </div>
  );
}
