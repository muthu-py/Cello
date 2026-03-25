import useRestockPlan from '../hooks/useRestockPlan';
import useDashboard from '../hooks/useDashboard';
import useWeights from '../hooks/useWeights';
import useFinance from '../hooks/useFinance';
import KpiCard from '../components/ui/KpiCard';
import ScoreBar from '../components/ui/ScoreBar';
import RiskChip from '../components/ui/RiskChip';
import MonoData from '../components/ui/MonoData';
import SectionLabel from '../components/ui/SectionLabel';
import WeightRow from '../components/ui/WeightRow';
import FinanceBar from '../components/ui/FinanceBar';
import ReasonCard from '../components/ui/ReasonCard';
import { formatCurrency, formatDays, formatDaysColor } from '../utils/formatters';
import './RestockPlan.css';

export default function RestockPlan() {
    const { data: plan, loading, error } = useRestockPlan();
    const { data: dash } = useDashboard();
    const { data: weights } = useWeights();
    const { data: finance } = useFinance();

    if (loading) return <div className="loading-state">LOADING...</div>;
    if (error) return <ReasonCard text={error} />;

    const latestW = weights?.[0];
    const topFinance = (finance || []).slice(0, 4);

    return (
        <div className="restock-page">
            <h1 className="page-title">Restock Plan</h1>

            {dash && (
                <div className="kpi-row">
                    <KpiCard label="Critical Items" value={dash.critical_count || 0} sub="Immediate action" variant="critical" />
                    <KpiCard label="High + Medium" value={(dash.high_count || 0) + (dash.medium_count || 0)} sub="Need attention" variant="warn" />
                    <KpiCard label="Low Risk" value={dash.low_count || 0} sub="Adequate stock" variant="ok" />
                    <KpiCard label="Total Restock Cost" value={formatCurrency(dash.total_estimated_cost)} sub="Estimated" variant="neutral" />
                </div>
            )}

            <div className="restock-layout">
                <div className="restock-table-wrap">
                    <SectionLabel>Priority Queue</SectionLabel>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Medicine</th>
                                <th>Score</th>
                                <th>Risk</th>
                                <th>Stock-out in</th>
                                <th>Order Qty</th>
                                <th>Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(plan || []).map(item => {
                                const sc = item.priority_score >= 8 ? 'rust' : item.priority_score >= 5 ? 'amber' : 'green';
                                return (
                                    <tr key={item.medicine_id}>
                                        <td><MonoData>{item.rank}</MonoData></td>
                                        <td>
                                            <span className="med-name">{item.medicine_name}</span>
                                            <span className="med-id"><MonoData variant="muted">{item.medicine_id}</MonoData></span>
                                        </td>
                                        <td><ScoreBar score={item.priority_score} color={sc} /></td>
                                        <td><RiskChip level={item.risk_level} /></td>
                                        <td><MonoData variant={formatDaysColor(item.days_until_stockout)}>{formatDays(item.days_until_stockout)}</MonoData></td>
                                        <td><MonoData>{item.ideal_quantity}</MonoData></td>
                                        <td><MonoData>{formatCurrency(item.estimated_cost)}</MonoData></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="restock-sidebar">
                    {topFinance.length > 0 && (
                        <div className="side-panel">
                            <SectionLabel>Top Payables</SectionLabel>
                            {topFinance.map((f, i) => (
                                <FinanceBar
                                    key={i}
                                    name={f.name}
                                    amount={formatCurrency(f.accumulated_amount || f.amount)}
                                    progress={f.priority_score || 0}
                                    urgencyTag={f.reason}
                                    urgencyColor={f.flexibility === 'low' ? 'rust' : f.flexibility === 'medium' ? 'amber' : 'gray'}
                                    tag={f.flexibility?.toUpperCase()}
                                />
                            ))}
                        </div>
                    )}
                    {latestW && (
                        <div className="side-panel">
                            <SectionLabel>Engine Weights (v{latestW.version})</SectionLabel>
                            <WeightRow label="Criticality" value={latestW.criticality_weight} />
                            <WeightRow label="Stockout" value={latestW.stockout_weight} />
                            <WeightRow label="Demand" value={latestW.demand_weight} />
                            <WeightRow label="Expiry" value={latestW.expiry_weight} />
                            <WeightRow label="Supplier" value={latestW.supplier_weight} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
