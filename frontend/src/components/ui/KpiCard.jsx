const TOP = {
  critical: 'var(--rust)',
  warn: 'var(--amber)',
  ok: 'var(--green)',
  neutral: 'var(--neutral-border)',
};

/**
 * @param {{
 *   label: string,
 *   value: React.ReactNode,
 *   sub?: React.ReactNode,
 *   variant: 'critical'|'warn'|'ok'|'neutral'
 * }} props
 */
export default function KpiCard({ label, value, sub, variant }) {
  return (
    <div
      className="flex flex-col gap-1 min-w-0"
      style={{
        background: 'var(--bg-panel)',
        border: 'var(--border-default)',
        borderRadius: 'var(--radius-panel)',
        borderTop: `2px solid ${TOP[variant] || TOP.neutral}`,
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-condensed)',
          fontSize: 'clamp(22px, 3vw, 32px)',
          fontWeight: 600,
          lineHeight: 1,
          color: 'var(--text-primary)',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
      {sub ? (
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 10,
            fontWeight: 300,
            color: 'var(--text-muted)',
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}
