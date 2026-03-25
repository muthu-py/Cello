import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip } from 'recharts';
import useForecast from '../hooks/useForecast';
import useRestockPlan from '../hooks/useRestockPlan';
import SectionLabel from '../components/ui/SectionLabel';
import MonoData from '../components/ui/MonoData';
import ReasonCard from '../components/ui/ReasonCard';
import WeightRow from '../components/ui/WeightRow';
import './ForecastPage.css';

export default function ForecastPage() {
    const { medicineId } = useParams();
    const navigate = useNavigate();
    const { data: plan } = useRestockPlan();
    const [selected, setSelected] = useState(medicineId || '');

    useEffect(() => {
        if (!medicineId && plan?.length) {
            navigate(`/forecast/${plan[0].medicine_id}`, { replace: true });
        }
    }, [medicineId, plan, navigate]);

    useEffect(() => { if (medicineId) setSelected(medicineId); }, [medicineId]);

    const { data, loading, error } = useForecast(selected);

    const handleChange = (e) => navigate(`/forecast/${e.target.value}`);

    // Build chart data
    const forecast = data?.forecast || [];
    const chartData = forecast.map((f, i) => ({
        day: `Day ${i + 1}`,
        predicted: f.predicted_demand,
        historical: f.historical_avg,
    }));

    const inv = data?.inventory || {};
    const breakdown = data?.score_breakdown || {};
    const item = plan?.find(p => p.medicine_id === selected);

    if (loading) return <div className="loading-state">LOADING...</div>;

    return (
        <div className="forecast-page">
            <div className="forecast-header">
                <h1 className="page-title">Demand Forecast</h1>
                <select className="medicine-select" value={selected} onChange={handleChange}>
                    {(plan || []).map(p => (
                        <option key={p.medicine_id} value={p.medicine_id}>{p.medicine_name} ({p.medicine_id})</option>
                    ))}
                </select>
            </div>

            {error && <ReasonCard text={error} />}

            {data && (
                <>
                    <div className="chart-wrap">
                        <div className="chart-legend">
                            <span className="chart-legend__item"><span className="chart-legend__line chart-legend__line--rust" /> Predicted Demand</span>
                            <span className="chart-legend__item"><span className="chart-legend__line chart-legend__line--gray" /> Historical Avg</span>
                        </div>
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                                <CartesianGrid stroke="#EBE8E2" strokeDasharray="2 3" vertical={false} />
                                <XAxis dataKey="day" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9, fill: '#9E998F' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9, fill: '#9E998F' }} axisLine={false} tickLine={false} />
                                <ReferenceLine x="Day 1" stroke="#C4C0B8" strokeDasharray="4 2" label={{ value: 'Today', position: 'top', fill: '#9E998F', fontFamily: 'IBM Plex Mono', fontSize: 8 }} />
                                <Line type="monotone" dataKey="predicted" stroke="var(--rust)" strokeWidth={1.5} dot={false} />
                                <Line type="monotone" dataKey="historical" stroke="#C4C0B8" strokeWidth={1} strokeDasharray="4 2" dot={false} />
                                <Tooltip contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 10, border: '1px solid #D8D3C9', borderRadius: 2, background: '#fff' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="forecast-panels">
                        <div className="panel">
                            <SectionLabel>Inventory Snapshot</SectionLabel>
                            <div className="snapshot-grid">
                                <div className="snapshot-row"><span className="snapshot-label">Current Stock</span><MonoData>{inv.current_stock}</MonoData></div>
                                <div className="snapshot-row"><span className="snapshot-label">Expiry Date</span><MonoData variant="muted">{inv.expiry_date ? new Date(inv.expiry_date).toLocaleDateString('en-IN') : '—'}</MonoData></div>
                                <div className="snapshot-row"><span className="snapshot-label">Lead Time</span><MonoData>{item?.lead_time_days || '—'} days</MonoData></div>
                                <div className="snapshot-row"><span className="snapshot-label">Supplier</span><MonoData variant="muted">{item?.supplier_name || '—'}</MonoData></div>
                                {item?.reliability != null && (
                                    <div className="snapshot-row">
                                        <span className="snapshot-label">Reliability</span>
                                        <div className="reliability-bar-wrap">
                                            <div className="reliability-track"><div className="reliability-fill" style={{ width: `${(item.reliability || 0) * 100}%` }} /></div>
                                            <MonoData variant="muted">{((item.reliability || 0) * 100).toFixed(0)}%</MonoData>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="panel">
                            <SectionLabel>Score Breakdown</SectionLabel>
                            <table className="breakdown-table">
                                <thead><tr><th>Factor</th><th>Score</th><th>Weight</th></tr></thead>
                                <tbody>
                                    {item?.score_breakdown && Object.entries(item.score_breakdown).map(([k, v]) => (
                                        <tr key={k}>
                                            <td>{k.replace(/_/g, ' ')}</td>
                                            <td><MonoData>{typeof v === 'number' ? v.toFixed(2) : v}</MonoData></td>
                                            <td><MonoData variant="muted">—</MonoData></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {item?.reason && <ReasonCard text={item.reason} />}
                </>
            )}
        </div>
    );
}
