import './FinanceBar.css';
export default function FinanceBar({ name, amount, progress = 0, tag, urgencyTag, urgencyColor = 'gray' }) {
    const barColor = { rust: 'var(--rust)', amber: 'var(--amber)', green: 'var(--green)', gray: 'var(--neutral-border)' }[urgencyColor] || 'var(--neutral-border)';
    return (
        <div className="finance-bar">
            <div className="finance-bar__header">
                <span className="finance-bar__name">{name}</span>
                <span className="finance-bar__amount">{amount}</span>
            </div>
            <div className="finance-bar__track"><div className="finance-bar__fill" style={{ width: `${Math.min(100, progress * 100)}%`, background: barColor }} /></div>
            <div className="finance-bar__tags">
                {tag && <span className="finance-bar__tag">{tag}</span>}
                {urgencyTag && <span className="finance-bar__urgency" style={{ color: barColor }}>{urgencyTag}</span>}
            </div>
        </div>
    );
}
