import './KpiCard.css';
const borderMap = { critical: 'var(--rust)', warn: 'var(--amber)', ok: 'var(--green)', neutral: 'var(--neutral-border)' };
export default function KpiCard({ label, value, sub, variant = 'neutral' }) {
    return (
        <div className="kpi-card" style={{ borderTopColor: borderMap[variant] }}>
            <span className="kpi-card__label">{label}</span>
            <span className="kpi-card__value">{value}</span>
            {sub && <span className="kpi-card__sub">{sub}</span>}
        </div>
    );
}
