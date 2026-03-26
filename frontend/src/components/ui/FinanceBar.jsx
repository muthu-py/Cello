const BAR = {
  rust: 'var(--rust)',
  amber: 'var(--amber)',
  green: 'var(--green)',
  gray: 'var(--gray-series)',
};

/**
 * @param {{
 *   name: string,
 *   amount: string,
 *   progress: number,
 *   tag?: React.ReactNode,
 *   urgencyTag?: React.ReactNode,
 *   urgencyColor?: 'rust'|'amber'|'green'|'gray',
 *   barColor: 'rust'|'amber'|'green'|'gray',
 * }} props
 */
export default function FinanceBar({
  name,
  amount,
  progress,
  tag,
  urgencyTag,
  urgencyColor = 'gray',
  barColor,
}) {
  const pct = Math.max(0, Math.min(100, Number(progress) * 100));
  const fill = BAR[barColor] || BAR.gray;
  const tagColor =
    urgencyColor === 'rust'
      ? 'var(--rust-text)'
      : urgencyColor === 'amber'
        ? 'var(--amber-text)'
        : urgencyColor === 'green'
          ? 'var(--green-text)'
          : 'var(--text-muted)';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
            className="truncate"
          >
            {name}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {tag ? (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--text-muted)',
                }}
              >
                {tag}
              </span>
            ) : null}
            {urgencyTag ? (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: tagColor,
                }}
              >
                {urgencyTag}
              </span>
            ) : null}
          </div>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
          }}
        >
          {amount}
        </div>
      </div>
      <div
        style={{
          height: 2,
          background: '#ebe8e2',
          borderRadius: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: fill,
          }}
        />
      </div>
    </div>
  );
}
