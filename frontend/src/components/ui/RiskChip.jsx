const LEVEL_STYLES = {
  CRITICAL: {
    background: 'var(--rust-bg)',
    border: '1px solid var(--rust-border)',
    color: 'var(--rust-text)',
  },
  HIGH: {
    background: 'var(--amber-bg)',
    border: '1px solid var(--amber-border)',
    color: 'var(--amber-text)',
  },
  MEDIUM: {
    background: 'var(--green-bg)',
    border: '1px solid var(--green-border)',
    color: 'var(--green-text)',
  },
  LOW: {
    background: 'var(--neutral-bg)',
    border: '1px solid var(--neutral-border)',
    color: 'var(--neutral-text)',
  },
};

/**
 * @param {{
 *   level?: 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW',
 *   flexibility?: 'low'|'medium'|'high',
 *   children?: React.ReactNode,
 *   className?: string,
 * }} props
 */
export default function RiskChip({ level, flexibility, children, className = '' }) {
  let key = level;
  if (flexibility) {
    const f = String(flexibility).toLowerCase();
    if (f === 'low') key = 'CRITICAL';
    else if (f === 'medium') key = 'HIGH';
    else if (f === 'high') key = 'MEDIUM';
  }
  const styles = LEVEL_STYLES[key] || LEVEL_STYLES.LOW;
  let label = children;
  if (!label) {
    if (flexibility) {
      const f = String(flexibility).toLowerCase();
      label = f === 'medium' ? 'MED' : f.toUpperCase();
    } else label = key;
  }

  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-condensed)',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        padding: '2px 7px',
        borderRadius: 'var(--radius-chip)',
        ...styles,
      }}
    >
      {label}
    </span>
  );
}
