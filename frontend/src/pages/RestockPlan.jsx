import { useMemo } from 'react';
import SectionLabel from '../components/ui/SectionLabel';
import KpiCard from '../components/ui/KpiCard';
import RiskChip from '../components/ui/RiskChip';
import ScoreBar from '../components/ui/ScoreBar';
import WeightRow from '../components/ui/WeightRow';
import FinanceBar from '../components/ui/FinanceBar';
import ReasonCard from '../components/ui/ReasonCard';
import MonoData from '../components/ui/MonoData';
import AiExecutiveBrief from '../components/insights/AiExecutiveBrief';
import { useRestockPlan } from '../hooks/useRestockPlan';
import { useFinance } from '../hooks/useFinance';
import { useDashboard } from '../hooks/useDashboard';
import { useWeights } from '../hooks/useWeights';
import { formatInr } from '../utils/formatters';
import { formatStockoutLabel } from '../utils/formatters';

function scoreBarColor(score) {
  if (score >= 8) return 'rust';
  if (score >= 5) return 'amber';
  return 'green';
}

export default function RestockPlan() {
  const restock = useRestockPlan();
  const finance = useFinance();
  const dash = useDashboard();
  const weights = useWeights();

  const coreLoading = restock.loading || dash.loading || finance.loading;

  const latestWeights = weights.data?.[0];

  const kpis = useMemo(() => {
    const dist = dash.data?.risk_distribution;
    if (!dist) return null;
    return {
      critical: dist.CRITICAL ?? 0,
      mediumHigh: (dist.MEDIUM ?? 0) + (dist.HIGH ?? 0),
      adequate: dist.LOW ?? 0,
      cost: dash.data?.total_estimated_restock_cost ?? 0,
    };
  }, [dash.data]);

  const topPayables = useMemo(() => {
    const list = finance.data;
    if (!list?.length) return [];
    return [...list]
      .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0))
      .slice(0, 4);
  }, [finance.data]);

  if (coreLoading) {
    return <div className="mono-loading">LOADING...</div>;
  }

  if (restock.error && dash.error) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="page-title">Command center</h1>
        <ReasonCard text="Unable to load inventory data. Start inventory-intelligence (port 3000) with MongoDB, or run the dev server with Vite proxy and no custom VITE_INVENTORY_API." />
      </div>
    );
  }

  const plan = restock.data ?? [];

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="page-title">Command center</h1>
        <p className="page-meta">
          Pharmacy replenishment priority, treasury pressure, and engine weights in one view — built
          for hospital decisions that balance patient risk and cash.
        </p>
        <SectionLabel>TODAY</SectionLabel>
      </div>

      {kpis ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Critical"
            variant="critical"
            value={<MonoData>{kpis.critical}</MonoData>}
            sub="SKUs at CRITICAL risk"
          />
          <KpiCard
            label="Medium / high"
            variant="warn"
            value={<MonoData>{kpis.mediumHigh}</MonoData>}
            sub="Combined MEDIUM + HIGH"
          />
          <KpiCard
            label="Adequate"
            variant="ok"
            value={<MonoData>{kpis.adequate}</MonoData>}
            sub="LOW risk band"
          />
          <KpiCard
            label="Total restock"
            variant="neutral"
            value={<MonoData>{formatInr(kpis.cost)}</MonoData>}
            sub="Estimated order cost"
          />
        </div>
      ) : null}

      <AiExecutiveBrief disabled={restock.error || !plan.length} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-3 cello-panel p-5">
          <SectionLabel>Restock priority queue</SectionLabel>
          <div className="cello-table-wrap">
            <table className="cello-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Medicine</th>
                  <th>Score</th>
                  <th>Risk</th>
                  <th>Stock-out</th>
                  <th>Qty</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((row) => {
                  const rawDays = row.days_to_stockout_raw ?? 0;
                  const st = formatStockoutLabel(rawDays);
                  const toneStyle =
                    st.tone === 'rust'
                      ? { color: 'var(--rust-text)' }
                      : st.tone === 'danger'
                        ? { color: 'var(--rust-text)' }
                        : st.tone === 'warn'
                          ? { color: 'var(--amber-text)' }
                          : { color: 'var(--text-muted)' };
                  return (
                    <tr key={row.medicine_id}>
                      <td>
                        <MonoData>{row.rank}</MonoData>
                      </td>
                      <td>
                        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>{row.medicine_name}</div>
                        <div className="cello-subtext">{row.medicine_id}</div>
                      </td>
                      <td>
                        <ScoreBar
                          score={row.priority_score}
                          color={scoreBarColor(row.priority_score)}
                        />
                      </td>
                      <td>
                        <RiskChip level={row.risk_level} />
                      </td>
                      <td>
                        <span style={toneStyle}>
                          <MonoData variant={st.tone === 'muted' ? 'muted' : 'rust'}>{st.text}</MonoData>
                        </span>
                      </td>
                      <td>
                        <MonoData>{row.ideal_quantity}</MonoData>
                      </td>
                      <td>
                        <MonoData>{formatInr(row.total_cost)}</MonoData>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="cello-panel p-5 flex flex-col gap-4">
            <SectionLabel>Finance — top due</SectionLabel>
            {finance.error ? (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                Finance API unavailable. Start the finance service on port 5002 for payable signals.
              </p>
            ) : null}
            <div className="flex flex-col gap-4">
              {topPayables.map((p) => (
                <FinanceBar
                  key={String(p.id)}
                  name={p.name}
                  amount={formatInr(p.accumulated_amount ?? p.base_amount ?? 0)}
                  progress={p.priority_score ?? 0}
                  tag={p.reference ? `${p.type} · ${p.reference}` : p.type}
                  urgencyTag={p.risk_level}
                  urgencyColor={
                    p.risk_level === 'HIGH' ? 'rust' : p.risk_level === 'MEDIUM' ? 'amber' : 'gray'
                  }
                  barColor={
                    p.risk_level === 'HIGH' ? 'rust' : p.risk_level === 'MEDIUM' ? 'amber' : 'gray'
                  }
                />
              ))}
              {!topPayables.length && !finance.error ? (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                  No payables in queue.
                </p>
              ) : null}
            </div>
          </div>

          <div className="cello-panel p-5 flex flex-col gap-3">
            <SectionLabel>Scoring weights (latest)</SectionLabel>
            {weights.loading ? (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                LOADING...
              </p>
            ) : null}
            {!weights.loading && latestWeights ? (
              <div className="flex flex-col gap-3">
                <WeightRow label="Criticality" value={latestWeights.criticality_weight} />
                <WeightRow label="Stock-out" value={latestWeights.stockout_weight} />
                <WeightRow label="Demand" value={latestWeights.demand_weight} />
                <WeightRow label="Expiry" value={latestWeights.expiry_weight} />
                <WeightRow label="Supplier" value={latestWeights.supplier_weight} />
                <MonoData variant="muted">v{latestWeights.version}</MonoData>
              </div>
            ) : null}
            {!weights.loading && !latestWeights ? (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                No weights on record.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
