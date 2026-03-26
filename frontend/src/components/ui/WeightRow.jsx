/**
 * @param {{ label: string, value: number }} props — value 0..1
 */
export default function WeightRow({ label, value }) {
  const pct = Math.max(0, Math.min(100, Number(value) * 100));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-muted)',
          }}
        >
          {pct.toFixed(0)}%
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: '#ebe8e2',
          borderRadius: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'var(--rust)',
          }}
        />
      </div>
    </div>
  );
}
