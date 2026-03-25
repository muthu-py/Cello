import './WeightRow.css';
export default function WeightRow({ label, value }) {
    const pct = Math.round((value || 0) * 100);
    return (
        <div className="weight-row">
            <span className="weight-row__label">{label}</span>
            <div className="weight-row__track"><div className="weight-row__fill" style={{ width: `${pct}%` }} /></div>
            <span className="weight-row__pct">{pct}%</span>
        </div>
    );
}
