export default function SectionLabel({ children }) {
    return <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: '10px' }}>{children}</h3>;
}
