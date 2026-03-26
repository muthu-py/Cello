import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SectionLabel from '../components/ui/SectionLabel';
import ReasonCard from '../components/ui/ReasonCard';
import ScoreBar from '../components/ui/ScoreBar';
import MonoData from '../components/ui/MonoData';
import { useForecast } from '../hooks/useForecast';
import { useRestockPlan } from '../hooks/useRestockPlan';

function scoreBarColor(score) {
  if (score >= 8) return 'rust';
  if (score >= 5) return 'amber';
  return 'green';
}

export default function ForecastPage() {
  const { medicineId: rawId } = useParams();
  const medicineId = rawId ? decodeURIComponent(rawId) : '';
  const navigate = useNavigate();
  const planHook = useRestockPlan();
  const forecastHook = useForecast(medicineId);

  useEffect(() => {
    const list = planHook.data;
    if (planHook.loading || planHook.error || !list?.length) return;
    const exists = list.some((p) => p.medicine_id === medicineId);
    if (medicineId && !exists) {
      navigate(`/forecast/${encodeURIComponent(list[0].medicine_id)}`, {
        replace: true,
      });
    }
  }, [planHook.loading, planHook.error, planHook.data, medicineId, navigate]);

  const planRow = useMemo(() => {
    const list = planHook.data;
    if (!list?.length || !medicineId) return null;
    return list.find((p) => p.medicine_id === medicineId) ?? null;
  }, [planHook.data, medicineId]);


  const breakdownRows = useMemo(() => {
    const b = planRow?.score_breakdown;
    if (!b?.weights_used) return [];
    const w = b.weights_used;
    return [
      { name: 'Criticality', raw: b.criticality_score, wt: w.W_c, c: b.criticality_score * w.W_c },
      { name: 'Stock-out', raw: b.stockout_risk_score, wt: w.W_s, c: b.stockout_risk_score * w.W_s },
      { name: 'Demand', raw: b.demand_urgency_score, wt: w.W_d, c: b.demand_urgency_score * w.W_d },
      { name: 'Supplier', raw: b.supplier_risk_score, wt: w.W_r, c: b.supplier_risk_score * w.W_r },
      { name: 'Expiry', raw: b.expiry_risk_score, wt: w.W_e, c: -b.effective_expiry_penalty },
    ];
  }, [planRow]);

  if (planHook.loading) {
    return <div className="mono-loading">LOADING...</div>;
  }

  if (planHook.error) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="page-title">Forecast</h1>
        <p className="page-meta">
          Seven-day demand projection, inventory context, and scoring breakdown for each SKU.
        </p>
        <SectionLabel>Demand</SectionLabel>
        <ReasonCard text="Cannot reach the inventory API. Confirm the service is running and that your browser can reach it (same-origin via Vite proxy, or set VITE_INVENTORY_API)." />
      </div>
    );
  }

  if (!planHook.data?.length) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="page-title">Forecast</h1>
        <ReasonCard text="No medicines available. Seed or simulate inventory data first." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Forecast</h1>
          <p className="page-meta">
            30-day demand projection with historical baseline, live snapshot, and engine score
            contributions for the selected SKU.
          </p>
          <SectionLabel>Demand & snapshot</SectionLabel>
        </div>
        <div className="flex flex-col gap-1">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            Medicine
          </span>
          <select
            className="cello-select"
            value={medicineId}
            onChange={(e) => navigate(`/forecast/${encodeURIComponent(e.target.value)}`)}
          >
            {(planHook.data ?? []).map((m) => (
              <option key={m.medicine_id} value={m.medicine_id}>
                {m.medicine_name} ({m.medicine_id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {forecastHook.loading ? <div className="mono-loading">LOADING...</div> : null}
      {forecastHook.error ? (
        <ReasonCard text="Forecast request failed for this medicine. Check the inventory API logs and that this medicine_id exists in MongoDB." />
      ) : null}

      {forecastHook.data && !forecastHook.error ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="cello-panel p-5 flex flex-col gap-3">
              <SectionLabel>Inventory snapshot</SectionLabel>
              <div className="flex flex-wrap gap-6 mb-2">
                <MonoData variant="muted">
                  Confidence: {forecastHook.data.confidence ?? '—'}
                </MonoData>
                <MonoData variant="muted">
                  Daily prediction: {forecastHook.data.daily_prediction ?? '—'} units
                </MonoData>
              </div>
              <div className="flex flex-col gap-2">
                <Row label="Current stock" value={forecastHook.data.current_stock} />
                <Row
                  label="Expiry"
                  value={
                    forecastHook.data.expiry_days != null
                      ? `${forecastHook.data.expiry_days} days`
                      : '—'
                  }
                />
                <Row label="Lead time" value={planRow ? `${planRow.lead_time_days}d` : '—'} />
                <Row label="Supplier" value={planRow?.supplier_name ?? '—'} />
                <div className="flex flex-col gap-1 mt-1">
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
                    Reliability
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className="grow"
                      style={{
                        height: 4,
                        background: '#ebe8e2',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.round((planRow?.reliability ?? 0) * 100)}%`,
                          height: '100%',
                          background: 'var(--rust)',
                        }}
                      />
                    </div>
                    <MonoData>
                      {planRow?.reliability != null ? Number(planRow.reliability).toFixed(2) : '—'}
                    </MonoData>
                  </div>
                </div>
              </div>
            </div>

            <div className="cello-panel p-5 flex flex-col gap-3">
              <SectionLabel>Score breakdown</SectionLabel>
              <div className="cello-table-wrap">
                <table className="cello-table">
                  <thead>
                    <tr>
                      <th>Factor</th>
                      <th>Raw</th>
                      <th>Weight</th>
                      <th>Contrib.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdownRows.length ? (
                      breakdownRows.map((r) => (
                        <tr key={r.name}>
                          <td style={{ fontFamily: 'var(--font-body)', fontSize: 12 }}>{r.name}</td>
                          <td>
                            <ScoreBar score={r.raw} color={scoreBarColor(r.raw)} />
                          </td>
                          <td>
                            <MonoData variant="muted">{(r.wt * 100).toFixed(0)}%</MonoData>
                          </td>
                          <td>
                            <MonoData>{r.c.toFixed(2)}</MonoData>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ padding: '16px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                            Load the restock plan to see factor breakdown for this SKU.
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {planRow?.reason ? <ReasonCard text={planRow.reason} /> : null}
        </>
      ) : null}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <MonoData>{value}</MonoData>
    </div>
  );
}
