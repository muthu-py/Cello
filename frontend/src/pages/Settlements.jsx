import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { usePayments } from '../hooks/usePayments';
import { formatInr } from '../utils/formatters';

const STATIONS = ['STATION ALPHA', 'STATION BRAVO', 'STATION CHARLIE', 'STATION DELTA'];

function flexCategory(flex) {
    const f = String(flex || '').toLowerCase();
    if (f === 'low') return 'Critical Vendor';
    if (f === 'medium') return 'Maintenance';
    return 'Office Supply';
}

function deferralReason(flex) {
    const f = String(flex || '').toLowerCase();
    if (f === 'low') {
        return 'Awaiting quality verification from Lab 04. Payment hold until certification is received.';
    }
    if (f === 'medium') {
        return 'Deferred to maintain liquidity ratio above 0.85 during payroll cycle.';
    }
    return 'Scheduled for Year-End CapEx cycle. Pending Board approval of revised amortization schedule.';
}

function syntheticInvoiceId(id) {
    const raw = String(id);
    let h = 0;
    for (let i = 0; i < raw.length; i++) {
        h = (h * 31 + raw.charCodeAt(i)) >>> 0;
    }
    const n = (h % 9000) + 1000;
    return `INV-2025-${n}`;
}

export default function Settlements() {
    const { data, loading, error, load } = usePayments();
    const [cashInput, setCashInput] = useState('450,000.00');

    const columns = useMemo(() => {
        if (!data) return [];
        const profits = data.daily_profits ?? [];
        const n = data.summary?.days_planned ?? profits.length;
        const schedule = data.schedule ?? [];
        const initial = Number(data.initial_cash ?? 0);
        const byDay = {};
        for (const s of schedule) {
            byDay[s.day] = byDay[s.day] || [];
            byDay[s.day].push(s);
        }

        let running = initial;
        const cols = [];

        for (let d = 0; d < n; d++) {
            running += Number(profits[d] ?? 0);
            const afterInflow = running;
            const items = byDay[d] ?? [];
            const paid = items.reduce((a, x) => a + Number(x.paid), 0);
            const after = running - paid;
            const utilizationPct = afterInflow > 0 ? Math.min(100, Math.round((paid / afterInflow) * 100)) : 0;
            const hasPartial = items.some((x) => x.type === 'partial');

            cols.push({
                day: d,
                items,
                endCash: after,
                utilizationPct,
                hasPartial,
                station: STATIONS[d % STATIONS.length],
            });
            running = after;
        }
        return cols;
    }, [data]);

    const unpaid = data?.unpaid ?? [];
    const totalDeferred = unpaid.reduce((s, u) => s + Number(u.remaining ?? 0), 0);

    const onGenerate = (e) => {
        e.preventDefault();
        const v = parseFloat(cashInput.replace(/,/g, ''));
        load(isNaN(v) ? 0 : v);
    };

    const onReallocate = () => {
        const v = parseFloat(cashInput.replace(/,/g, ''));
        load(isNaN(v) ? 0 : v);
    };

    return (
        <div className="flex flex-col gap-8 min-h-screen bg-[#C4622D] p-8 rounded-3xl shadow-[inset_0_0_100px_rgba(0,0,0,0.1)]">
            {/* Page Header & Input */}
            <section className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-10 border-b border-white/20 overflow-hidden">
                <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <h1 className="font-headline text-7xl text-white leading-tight tracking-tight">
                        Cash Flow <span className="italic text-white/40 font-light">·</span> Settlements
                    </h1>
                    <div className="flex items-center gap-3 mt-3">
                        <div className="h-px w-8 bg-white/30"></div>
                        <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/60 font-medium">Liquidity Protocol v4.2</p>
                    </div>
                </div>
                <form onSubmit={onGenerate} className="relative z-10 flex items-stretch gap-0 shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-2xl overflow-hidden group border border-white/20 h-20">
                    <div className="relative flex-1 bg-white/5 backdrop-blur-md group-focus-within:bg-white/10 transition-all duration-300">
                        <label className="absolute top-3 left-6 font-mono text-[9px] text-white/40 uppercase z-10 font-black tracking-[0.3em] leading-none">Initial Injection</label>
                        <div className="flex items-center px-6 h-full">
                            <span className="font-mono text-xl text-white/20 mr-3 mt-4 pr-1 font-black">$</span>
                            <input
                                className="border-none focus:ring-0 font-mono text-3xl text-white bg-transparent pt-6 pb-1 w-full font-black tracking-tighter placeholder:text-white/10"
                                type="text"
                                value={cashInput}
                                onChange={(e) => setCashInput(e.target.value)}
                            />
                        </div>
                    </div>
                    <button type="submit" className="bg-white text-[#C4622D] font-label uppercase text-sm font-black px-12 hover:bg-[#F5F2EC] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-3 border-l border-white/10 h-full" disabled={loading}>
                        {loading ? (
                            <span className="animate-pulse tracking-widest text-[10px]">RUNNING</span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>

                            </>
                        )}
                    </button>
                </form>
            </section>

            <div className="flex-1 flex gap-8 min-h-0">
                {/* Day-by-Day Grid */}
                <div className="flex-1 overflow-x-auto no-scrollbar py-4">
                    <div className="flex h-full min-w-max gap-8 pb-10 pr-10">
                        {columns.map((col) => (
                            <div key={col.day} className="w-80 bg-white flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-white/10 group/col transition-all duration-300 hover:-translate-y-2">
                                <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-mono text-[10px] tracking-[0.3em] text-[#C4622D] font-black uppercase opacity-60">{col.station}</h4>
                                        <div className={`h-2.5 w-2.5 rounded-full ${col.hasPartial ? 'bg-[#99420d]' : 'bg-[#C4622D]'} shadow-sm`}></div>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col">
                                            <span className="font-headline text-6xl font-black text-[#1a1814] tracking-tighter leading-none">
                                                {(col.day + 1).toString().padStart(2, '0')}
                                            </span>
                                            <span className="font-mono text-[9px] text-[#C4622D] font-black uppercase tracking-[0.25em] mt-2 opacity-40">Period Index</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`font-mono text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 ${col.hasPartial ? 'text-[#99420d]' : 'text-[#C4622D]'}`}>
                                                {col.hasPartial ? 'ADJUSTED' : 'NOMINAL'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-3 w-full bg-slate-100 relative">
                                    <div className={`h-full ${col.hasPartial ? 'bg-[#99420d]' : 'bg-[#C4622D]'} transition-all duration-1000 ease-out`} style={{ width: `${col.utilizationPct}%` }}></div>
                                </div>
                                <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar bg-white">
                                    {col.items.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-24 opacity-10">
                                            <span className="material-symbols-outlined text-5xl mb-4">inventory_2</span>
                                            <p className="font-mono text-[10px] uppercase tracking-[0.4em] font-black">Empty Queue</p>
                                        </div>
                                    ) : (
                                        col.items.map((item, idx) => {
                                            const flex = String(item.flexibility || 'high').toLowerCase();
                                            const borderColor = flex === 'low' ? 'border-primary' : flex === 'medium' ? 'border-secondary' : 'border-outline-variant';
                                            const textColor = flex === 'low' ? 'text-primary' : flex === 'medium' ? 'text-secondary' : 'text-on-surface/40';
                                            const icon = flex === 'low' ? 'priority_high' : flex === 'medium' ? 'sync_alt' : 'low_priority';

                                            return (
                                                <div key={idx} className={`group/card relative border border-slate-100 bg-slate-50/50 p-6 shadow-sm hover:shadow-xl hover:bg-white transition-all duration-300 rounded-xl active:scale-[0.98]`}>
                                                    <div className={`absolute top-0 left-0 bottom-0 w-1 ${borderColor} opacity-40 group-hover/card:opacity-100 transition-opacity`}></div>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <span className={`font-label uppercase text-[9px] font-black tracking-[0.2em] ${textColor} opacity-60`}>{flexCategory(item.flexibility)}</span>
                                                        <span className="font-mono text-base font-black tracking-tighter text-[#1a1814]">{formatInr(item.paid)}</span>
                                                    </div>
                                                    <p className="text-[15px] font-black leading-tight mb-5 text-[#1a1814] group-hover/card:text-[#C4622D] transition-colors">{item.name}</p>
                                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 ${textColor}`}>
                                                                <span className="material-symbols-outlined text-[16px]">{icon}</span>
                                                            </div>
                                                            <span className={`font-mono text-[9px] uppercase font-black tracking-[0.2em] text-slate-400`}>{item.flexibility}</span>
                                                        </div>
                                                        <span className="material-symbols-outlined text-slate-200 text-lg group-hover/card:translate-x-1 transition-transform">chevron_right</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                                <div className="p-8 border-t border-slate-50 bg-slate-50/20 flex justify-between items-center group-hover/col:bg-[#C4622D]/5 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#C4622D] font-black opacity-30">Reserve Pool</span>
                                        <span className="font-mono text-2xl font-black text-[#1a1814] tracking-tighter">{formatInr(col.endCash)}</span>
                                    </div>
                                    <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 group-hover/col:bg-[#C4622D] group-hover/col:text-white transition-all shadow-inner">
                                        <span className="material-symbols-outlined">query_stats</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Projection Gap Placeholder */}
                        <div className="w-80 border-2 border-dashed border-slate-200 bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center text-slate-300 rounded-3xl hover:bg-white hover:border-[#C4622D]/30 transition-all group/gap cursor-pointer shadow-inner">
                            <span className="material-symbols-outlined text-6xl mb-4 group-hover/gap:scale-110 group-hover/gap:text-[#C4622D] transition-all">add_circle</span>
                            <p className="font-mono text-[10px] uppercase tracking-[0.4em] font-black">Projection Gap</p>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Unpaid List */}
                <aside className="w-[450px] bg-white rounded-3xl shadow-2xl p-10 flex flex-col relative overflow-hidden ml-4">
                    <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#C4622D]/5 rounded-full blur-[100px]"></div>
                    <div className="relative z-10 flex items-center gap-5 mb-12">
                        <div className="w-16 h-16 rounded-3xl bg-[#C4622D] flex items-center justify-center shadow-xl">
                            <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                        </div>
                        <div className="flex flex-col">
                            <h3 className="font-label uppercase tracking-[0.3em] text-xl font-black leading-none text-[#1a1814]">Deferred</h3>
                            <span className="font-mono text-[10px] text-[#C4622D] font-black uppercase tracking-[0.25em] mt-2 opacity-40">Portfolio Hedge</span>
                        </div>
                    </div>
                    <div className="relative z-10 space-y-12 flex-1 overflow-y-auto no-scrollbar pr-4">
                        {unpaid.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-28 opacity-20 italic">
                                <span className="material-symbols-outlined text-5xl mb-4">check_circle</span>
                                <p className="font-mono text-xs tracking-[0.4em] font-black uppercase">Cleared</p>
                            </div>
                        ) : (
                            unpaid.map((u) => (
                                <div key={u.id} className="group/unpaid cursor-help transition-all hover:translate-x-1">
                                    <div className="flex justify-between items-end mb-4">
                                        <div className="flex flex-col">
                                            <span className="font-mono text-[9px] uppercase text-slate-400 font-black tracking-widest mb-1">Entry Id</span>
                                            <p className="font-mono text-sm font-black text-slate-600">{syntheticInvoiceId(u.id)}</p>
                                        </div>
                                        <span className="font-mono text-2xl font-black text-[#C4622D] tracking-tighter">{formatInr(u.remaining)}</span>
                                    </div>
                                    <p className="text-lg font-black text-[#1a1814] mb-5 leading-tight group-hover/unpaid:text-[#C4622D] transition-colors">{u.name}</p>
                                    <div className="bg-slate-50 p-6 border border-slate-100 relative group-hover/unpaid:bg-white group-hover/unpaid:shadow-lg transition-all rounded-2xl overflow-hidden shadow-inner">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#C4622D]/20 group-hover/unpaid:bg-[#C4622D] transition-colors"></div>
                                        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#C4622D] mb-4 font-black opacity-40">Strategic Protocol</p>
                                        <p className="text-sm font-bold leading-relaxed text-slate-500 italic">"{deferralReason(u.flexibility)}"</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="relative z-10 mt-12 pt-10 border-t border-slate-100">
                        <div className="flex justify-between mb-10 items-end">
                            <div className="flex flex-col">
                                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#C4622D] font-black opacity-40 mb-2">Total Exposure</span>
                                <span className="font-mono text-4xl font-black text-[#1a1814] tracking-tighter">{formatInr(totalDeferred)}</span>
                            </div>
                            <div className="w-14 h-14 rounded-3xl border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-[#C4622D] hover:text-white transition-all shadow-sm cursor-pointer active:scale-95">
                                <span className="material-symbols-outlined text-2xl">open_in_new</span>
                            </div>
                        </div>
                        <button onClick={onReallocate} className="w-full py-6 bg-[#C4622D] text-white font-label uppercase text-sm font-black tracking-[0.3em] shadow-xl hover:bg-[#99420d] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4 rounded-2xl group/realloc" disabled={loading}>
                            <span className="material-symbols-outlined group-hover:rotate-180 transition-transform">refresh</span>
                            Re-allocate Portfolio
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
}
