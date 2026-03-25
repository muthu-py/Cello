import { useState } from 'react';
import usePayments from '../hooks/usePayments';
import SectionLabel from '../components/ui/SectionLabel';
import MonoData from '../components/ui/MonoData';
import ActionButton from '../components/ui/ActionButton';
import ReasonCard from '../components/ui/ReasonCard';
import { formatCurrency } from '../utils/formatters';
import './PaymentSchedule.css';

const FLEX_COLORS = { low: 'var(--rust)', medium: 'var(--amber)', high: '#9E998F' };

export default function PaymentSchedule() {
    const { data, loading, error, fetch } = usePayments();
    const [cash, setCash] = useState(0);

    const handleSubmit = (e) => { e.preventDefault(); fetch(cash); };

    // Group schedule by day
    const dayMap = {};
    let maxCash = 1;
    if (data?.schedule) {
        data.schedule.forEach(s => {
            if (!dayMap[s.day]) dayMap[s.day] = { items: [], totalPaid: 0 };
            dayMap[s.day].items.push(s);
            dayMap[s.day].totalPaid += s.paid;
        });
    }
    if (data?.summary) maxCash = Math.max(1, data.summary.total_cash_allocated / Math.max(1, data.summary.days_planned));

    const days = data?.summary?.days_planned || 0;

    return (
        <div className="payment-page">
            <h1 className="page-title">Payment Schedule</h1>

            <form className="payment-form" onSubmit={handleSubmit}>
                <div className="cash-input-wrap">
                    <label className="cash-label">Initial Cash</label>
                    <input type="number" className="cash-input" value={cash} onChange={e => setCash(Number(e.target.value))} min="0" step="100" />
                </div>
                <ActionButton variant="solid" disabled={loading}>{loading ? 'Generating...' : 'Generate Schedule'}</ActionButton>
            </form>

            {error && <ReasonCard text={error} />}

            {data && (
                <div className="schedule-layout">
                    <div className="day-grid-scroll">
                        <div className="day-grid">
                            {Array.from({ length: days }, (_, d) => {
                                const day = dayMap[d] || { items: [], totalPaid: 0 };
                                const cashHeight = Math.min(100, (day.totalPaid / maxCash) * 100);
                                return (
                                    <div key={d} className="day-column">
                                        <span className="day-label">DAY {String(d + 1).padStart(2, '0')}</span>
                                        <div className="day-bar-wrap">
                                            <div className="day-bar" style={{ height: `${cashHeight}%`, background: 'var(--green)' }} />
                                        </div>
                                        <div className="day-items">
                                            {day.items.map((item, i) => (
                                                <div key={i} className="day-item" style={{ borderLeftColor: FLEX_COLORS[item.flexibility] }}>
                                                    <span className="day-item__name">{item.name}</span>
                                                    <span className="day-item__amount"><MonoData>{formatCurrency(item.paid)}</MonoData></span>
                                                    <span className="day-item__type"><MonoData variant="muted">{item.type}</MonoData></span>
                                                </div>
                                            ))}
                                            {day.items.length === 0 && <span className="day-empty"><MonoData variant="muted">—</MonoData></span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="unpaid-panel">
                        <SectionLabel>Unpaid ({(data.unpaid || []).length})</SectionLabel>
                        {(data.unpaid || []).map((u, i) => (
                            <div key={i} className="unpaid-item">
                                <span className="unpaid-item__name">{u.name}</span>
                                <MonoData variant="rust">{formatCurrency(u.remaining)}</MonoData>
                                <span className="unpaid-item__flex"><MonoData variant="muted">{u.flexibility}</MonoData></span>
                            </div>
                        ))}
                        {(data.unpaid || []).length === 0 && <MonoData variant="green">All payments scheduled</MonoData>}

                        {data.summary && (
                            <div className="summary-block">
                                <SectionLabel>Summary</SectionLabel>
                                <div className="summary-row"><span>Allocated</span><MonoData>{formatCurrency(data.summary.total_cash_allocated)}</MonoData></div>
                                <div className="summary-row"><span>Remaining Debt</span><MonoData variant="rust">{formatCurrency(data.summary.total_remaining_debt)}</MonoData></div>
                                <div className="summary-row"><span>Cash Left</span><MonoData variant="green">{formatCurrency(data.summary.remaining_cash)}</MonoData></div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
