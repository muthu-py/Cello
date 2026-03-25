import './ScoreBar.css';
const colors = { rust: 'var(--rust)', amber: 'var(--amber)', green: 'var(--green)' };
export default function ScoreBar({ score, color = 'rust' }) {
    const pct = Math.min(100, Math.max(0, (score / 10) * 100));
    const c = score >= 8 ? 'rust' : score >= 5 ? 'amber' : 'green';
    const fill = colors[color] || colors[c];
    return (
        <div className="score-bar">
            <div className="score-bar__track"><div className="score-bar__fill" style={{ width: `${pct}%`, background: fill }} /></div>
            <span className="score-bar__num">{score?.toFixed(1)}</span>
        </div>
    );
}
