import { useEffect, useState } from 'react';
import { inventoryApi, financeApi } from '../../config/api';
import StatusPill from '../ui/StatusPill';

export default function TopBar() {
  const [status, setStatus] = useState('SYNCING');

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const [inv, fin] = await Promise.allSettled([
          inventoryApi.get('/api/inventory/service-health'),
          financeApi.get('/api/finance/service-health'),
        ]);
        const invOk =
          inv.status === 'fulfilled' && inv.value?.data?.ok === true;
        const finOk =
          fin.status === 'fulfilled' && fin.value?.data?.ok === true;
        if (!cancelled) setStatus(invOk && finOk ? 'LIVE' : 'OFFLINE');
      } catch {
        if (!cancelled) setStatus('OFFLINE');
      }
    }

    check();
    const t = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <header
      className="flex items-center justify-between px-5"
      style={{
        height: 'var(--topbar-h)',
        background: 'var(--bg-topbar)',
        borderBottom: '1px solid rgba(245,242,236,0.08)',
      }}
    >
      <div className="flex items-baseline gap-3">
        <div
          style={{
            fontFamily: 'var(--font-condensed)',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-inverse)',
          }}
        >
          Cello.Ops
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-ghost)',
          }}
        >
          Hospital operations
        </span>
      </div>
      <StatusPill status={status} />
    </header>
  );
}
