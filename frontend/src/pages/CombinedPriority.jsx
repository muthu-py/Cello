import useCombined from '../hooks/useCombined';
import ScoreBar from '../components/ui/ScoreBar';
import RiskChip from '../components/ui/RiskChip';
import MonoData from '../components/ui/MonoData';
import SectionLabel from '../components/ui/SectionLabel';
import ReasonCard from '../components/ui/ReasonCard';
import './CombinedPriority.css';

function SourceChip({ source }) {
    const s = source === 'inventory' ? 'inv' : 'pay';
    return <span className={`source-chip source-chip--${s}`}>{source === 'inventory' ? 'INVENTORY' : 'PAYABLE'}</span>;
}

function FlexChip({ flex }) {
    const map = { low: 'CRITICAL', medium: 'MEDIUM', high: 'LOW' };
    return <RiskChip level={map[flex] || 'LOW'} />;
}

export default function CombinedPriority() {
    const { data, loading, error } = useCombined();

    if (loading) return <div className="loading-state">LOADING...</div>;
    if (error) return <ReasonCard text={error} />;

    const items = data?.data || [];
    const noFinance = items.length > 0 && items.every(i => i.source === 'inventory');

    return (
        <div className="combined-page">
            <h1 className="page-title">Combined Priority</h1>

            {noFinance && (
                <div className="offline-banner">
                    <MonoData variant="amber">Finance service offline — displaying inventory queue only</MonoData>
                </div>
            )}

            <SectionLabel>Unified Priority Queue ({items.length} items)</SectionLabel>
            <table className="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Source</th>
                        <th>Name</th>
                        <th>Score</th>
                        <th>Flexibility</th>
                        <th>Reason</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, i) => (
                        <tr key={`${item.source}-${item.id}-${i}`}>
                            <td><MonoData>{i + 1}</MonoData></td>
                            <td><SourceChip source={item.source} /></td>
                            <td><span className="med-name">{item.name}</span></td>
                            <td><ScoreBar score={item.score * 10} color={item.score >= 0.8 ? 'rust' : item.score >= 0.5 ? 'amber' : 'green'} /></td>
                            <td><FlexChip flex={item.flexibility} /></td>
                            <td className="reason-cell"><MonoData variant="muted">{(item.reason || '').substring(0, 50)}{(item.reason || '').length > 50 ? '…' : ''}</MonoData></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
