export default function MonoData({ children, variant = '' }) {
    const style = { fontFamily: 'var(--font-mono)', fontSize: '11px' };
    if (variant === 'muted') style.color = 'var(--text-muted)';
    if (variant === 'rust') style.color = 'var(--rust)';
    if (variant === 'amber') style.color = 'var(--amber)';
    if (variant === 'green') style.color = 'var(--green)';
    return <span style={style}>{children}</span>;
}
