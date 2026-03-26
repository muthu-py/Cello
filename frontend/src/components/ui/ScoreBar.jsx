const FILL = {
  rust: 'var(--rust)',
  amber: 'var(--amber)',
  green: 'var(--green)',
};

/**
 * @param {{ score: number, color: 'rust'|'amber'|'green' }} props
 */
export default function ScoreBar({ score, color }) {
  const pct = Math.max(0, Math.min(100, (Number(score) / 10) * 100));
  const fill = FILL[color] || FILL.green;

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div
        className="grow"
        style={{
          height: 3,
          background: '#ebe8e2',
          borderRadius: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: fill,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          minWidth: 28,
          textAlign: 'right',
          color: 'var(--text-primary)',
        }}
      >
        {Number(score).toFixed(1)}
      </span>
    </div>
  );
}
