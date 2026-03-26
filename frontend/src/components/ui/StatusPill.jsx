const MAP = {
  LIVE: {
    bg: 'var(--green-bg)',
    border: '1px solid var(--green-border)',
    color: 'var(--green-text)',
  },
  OFFLINE: {
    bg: 'var(--rust-bg)',
    border: '1px solid var(--rust-border)',
    color: 'var(--rust-text)',
  },
  SYNCING: {
    bg: 'var(--amber-bg)',
    border: '1px solid var(--amber-border)',
    color: 'var(--amber-text)',
  },
};

/**
 * @param {{ status: 'LIVE'|'OFFLINE'|'SYNCING' }} props
 */
export default function StatusPill({ status }) {
  const s = MAP[status] || MAP.OFFLINE;
  return (
    <span
      style={{
        ...s,
        fontFamily: 'var(--font-mono)',
        fontSize: 8,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        padding: '3px 8px',
        borderRadius: 'var(--radius-chip)',
      }}
    >
      {status}
    </span>
  );
}
