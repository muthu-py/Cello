/**
 * @param {{ children: React.ReactNode, variant?: 'default'|'muted'|'rust' }} props
 */
export default function MonoData({ children, variant = 'default' }) {
  const color =
    variant === 'muted'
      ? 'var(--text-muted)'
      : variant === 'rust'
        ? 'var(--rust-text)'
        : 'var(--text-primary)';

  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color,
      }}
    >
      {children}
    </span>
  );
}
