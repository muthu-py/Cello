import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import useWeights from '../hooks/useWeights';
import axios from 'axios';
import { INVENTORY_API } from '../config/api';
import SectionLabel from '../components/ui/SectionLabel';
import WeightRow from '../components/ui/WeightRow';
import ActionButton from '../components/ui/ActionButton';
import MonoData from '../components/ui/MonoData';
import ReasonCard from '../components/ui/ReasonCard';
import './WeightsHistory.css';

const PIE_COLORS = ['#C4622D', '#B8952A', '#4A7C59', '#9E998F', '#6B665E'];
const WEIGHT_KEYS = ['criticality_weight', 'stockout_weight', 'demand_weight', 'expiry_weight', 'supplier_weight'];
const WEIGHT_LABELS = ['Criticality', 'Stockout', 'Demand', 'Expiry', 'Supplier'];

export default function WeightsHistory() {
    const { data, loading, error, refetch } = useWeights();
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [adjusting, setAdjusting] = useState(false);

    if (loading) return <div className="loading-state">LOADING...</div>;
    if (error) return <ReasonCard text={error} />;

    const versions = data || [];
    const selected = versions[selectedIdx];

    const pieData = selected ? WEIGHT_KEYS.map((k, i) => ({ name: WEIGHT_LABELS[i], value: selected[k] || 0 })) : [];

    const handleAdjust = async () => {
        setAdjusting(true);
        try {
            await axios.post(`${INVENTORY_API}/api/inventory/weights/adjust`);
            refetch();
        } catch (e) { /* silent */ }
        setAdjusting(false);
    };

    return (
        <div className="weights-page">
            <h1 className="page-title">Weight History</h1>

            <div className="weights-layout">
                <div className="weights-timeline">
                    <SectionLabel>Version Timeline</SectionLabel>
                    {versions.map((v, i) => (
                        <div key={v._id || i} className={`timeline-item ${i === selectedIdx ? 'timeline-item--active' : ''}`} onClick={() => setSelectedIdx(i)}>
                            <div className="timeline-item__header">
                                <span className="timeline-item__version">v{v.version}</span>
                                <span className="timeline-item__badge">{v.auto_adjusted ? 'AUTO' : 'MANUAL'}</span>
                            </div>
                            <span className="timeline-item__date">{new Date(v.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            {v.adjustment_reason && <span className="timeline-item__reason">{v.adjustment_reason}</span>}
                            <div className="timeline-item__bars">
                                {WEIGHT_KEYS.map((k, j) => (
                                    <div key={k} className="mini-bar-wrap">
                                        <div className="mini-bar__track"><div className="mini-bar__fill" style={{ width: `${(v[k] || 0) * 100}%`, background: PIE_COLORS[j] }} /></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="weights-chart-panel">
                    {selected && (
                        <>
                            <SectionLabel>Weight Distribution</SectionLabel>
                            <div className="donut-wrap">
                                <ResponsiveContainer width="100%" height={240}>
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" stroke="none">
                                            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="donut-center"><MonoData>v{selected.version}</MonoData></div>
                            </div>
                            <div className="donut-legend">
                                {WEIGHT_LABELS.map((l, i) => (
                                    <span key={l} className="donut-legend__item"><span className="donut-legend__dot" style={{ background: PIE_COLORS[i] }} />{l}</span>
                                ))}
                            </div>
                            <div className="weight-rows-detail">
                                {WEIGHT_KEYS.map((k, i) => <WeightRow key={k} label={WEIGHT_LABELS[i]} value={selected[k]} />)}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="weights-action">
                <ActionButton onClick={handleAdjust} disabled={adjusting}>{adjusting ? 'Running...' : 'Run Weight Adjustment'}</ActionButton>
            </div>
        </div>
    );
}
