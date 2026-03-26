/**
 * @param {{ children: React.ReactNode }} props
 */
export default function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 8,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}
