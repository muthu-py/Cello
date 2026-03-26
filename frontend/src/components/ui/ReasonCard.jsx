/**
 * @param {{ text: string }} props
 */
export default function ReasonCard({ text }) {
  return (
    <div
      style={{
        borderLeft: '4px solid var(--rust)',
        padding: '14px 18px',
        background: 'var(--bg-panel)',
        borderRadius: 0,
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 14,
          lineHeight: 1.6,
          color: 'var(--text-primary)',
        }}
      >
        {text}
      </p>
    </div>
  );
}
