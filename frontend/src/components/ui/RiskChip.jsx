import './RiskChip.css';
const colorMap = {
    CRITICAL: 'rust', HIGH: 'amber', MEDIUM: 'green', LOW: 'neutral',
    low: 'rust', medium: 'amber', high: 'green',
};
export default function RiskChip({ level }) {
    const c = colorMap[level] || 'neutral';
    return <span className={`risk-chip risk-chip--${c}`}>{level}</span>;
}
