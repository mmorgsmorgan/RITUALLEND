'use client';

import { useEffect } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';

export function TxStatusToast({ hash, onSuccess }: { hash?: `0x${string}`; onSuccess?: () => void }) {
  const { isLoading, isSuccess, isError } = useWaitForTransactionReceipt({ hash });
  useEffect(() => { if (isSuccess) onSuccess?.(); }, [isSuccess, onSuccess]);
  if (!hash) return null;

  let color = 'var(--color-warning)';
  let label = 'pending';
  if (isSuccess) { color = 'var(--color-positive)'; label = 'confirmed'; }
  else if (isError) { color = 'var(--color-danger)'; label = 'failed'; }

  return (
    <div
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 card max-w-[calc(100vw-2rem)] flex items-center gap-3"
      style={{ background: 'var(--color-bg)', borderColor: color }}
    >
      <span className="dot-accent pulse" style={{ background: color }} />
      <span className="text-xs uppercase tab-nums" style={{ color, letterSpacing: '0.08em' }}>{label}</span>
      <a
        href={`https://explorer.ritualfoundation.org/tx/${hash}`}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-mono underline truncate"
      >
        {hash.slice(0, 10)}…
      </a>
      {isLoading && <span className="text-xs faint">waiting</span>}
    </div>
  );
}
