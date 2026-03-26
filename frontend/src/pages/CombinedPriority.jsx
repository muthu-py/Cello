import SectionLabel from '../components/ui/SectionLabel';
import RiskChip from '../components/ui/RiskChip';
import ScoreBar from '../components/ui/ScoreBar';
import MonoData from '../components/ui/MonoData';
import ReasonCard from '../components/ui/ReasonCard';
import ActionButton from '../components/ui/ActionButton';
import { useCombined } from '../hooks/useCombined';
import { useFinance } from '../hooks/useFinance';
import {
  formatInr,
  formatStockoutLabel,
  formatPayableDue,
} from '../utils/formatters';

function scoreBarColor(score10) {
  if (score10 >= 8) return 'rust';
  if (score10 >= 5) return 'amber';
  return 'green';
}

function SourceChip({ source }) {
  const inv = source === 'inventory';
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-condensed)',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        padding: '2px 7px',
        borderRadius: 'var(--radius-chip)',
        border: inv ? '1px solid var(--rust)' : '1px solid var(--amber)',
        color: inv ? 'var(--rust-text)' : 'var(--amber-text)',
        background: 'transparent',
      }}
    >
      {inv ? 'INVENTORY' : 'PAYABLE'}
    </span>
  );
}

function payableRiskLevel(raw) {
  const r = raw?.risk_level;
  if (r === 'HIGH') return 'CRITICAL';
  if (r === 'MEDIUM') return 'HIGH';
  return 'LOW';
}

export default function CombinedPriority() {
  const { data, error, loading, refetch } = useCombined();
  const finance = useFinance();

  const rows = data ?? [];

  if (loading) {
    return <div className="mono-loading">LOADING...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="page-title">Combined priority</h1>
        <ReasonCard text="Unable to load combined priority. Verify inventory-intelligence is running on port 3000 (or your configured VITE_INVENTORY_API)." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Combined priority</h1>
          <p className="page-meta">
            Unified queue from the restock engine and finance due-priority, sorted with flexibility
            rules so clinical urgency and treasury constraints stay aligned.
          </p>
          <SectionLabel>Inventory + payables</SectionLabel>
        </div>
        <ActionButton variant="ghost" onClick={() => refetch()}>
          Refresh queue
        </ActionButton>
      </div>

      {finance.error ? (
        <div className="finance-offline-banner">
          Finance service offline — displaying inventory queue only
        </div>
      ) : null}

      <div className="cello-table-wrap">
        <table className="cello-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name / reference</th>
              <th>Source</th>
              <th>Flex</th>
              <th>Score</th>
              <th>Risk</th>
              <th>Stock-out / due</th>
              <th>Qty</th>
              <th>Cost / amt</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '24px 16px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                    No items returned. Run the decision engine after seeding MongoDB collections.
                  </span>
                </td>
              </tr>
            ) : (
              rows.map((item, idx) => {
                const raw = item.raw ?? {};
                const isInv = item.source === 'inventory';
                const score10 = (item.score ?? 0) * 10;
                const riskLevel = isInv ? raw.risk_level : payableRiskLevel(raw);
                const rawDays = raw.days_to_stockout_raw;
                const st = isInv
                  ? rawDays != null
                    ? formatStockoutLabel(rawDays)
                    : { text: '—', tone: 'muted' }
                  : formatPayableDue(raw.remaining_minutes, raw.status);
                const qty = isInv ? raw.ideal_quantity : '—';
                const cost = isInv
                  ? formatInr(raw.total_cost ?? 0)
                  : formatInr(raw.accumulated_amount ?? raw.base_amount ?? 0);
                const toneStyle =
                  st.tone === 'muted'
                    ? { color: 'var(--text-muted)' }
                    : st.tone === 'warn'
                      ? { color: 'var(--amber-text)' }
                      : { color: 'var(--rust-text)' };

                return (
                  <tr key={`${item.source}-${String(item.id)}`}>
                    <td>
                      <MonoData>{idx + 1}</MonoData>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>{item.name}</div>
                      <div className="cello-subtext">
                        {isInv
                          ? raw.medicine_id
                          : raw.reference || `${(raw.type || 'payable').toUpperCase()} record`}
                      </div>
                    </td>
                    <td>
                      <SourceChip source={item.source} />
                    </td>
                    <td>
                      <RiskChip flexibility={item.flexibility} />
                    </td>
                    <td>
                      <ScoreBar score={score10} color={scoreBarColor(score10)} />
                    </td>
                    <td>
                      <RiskChip level={riskLevel} />
                    </td>
                    <td>
                      <span style={toneStyle}>
                        <MonoData variant={st.tone === 'muted' ? 'muted' : 'rust'}>{st.text}</MonoData>
                      </span>
                    </td>
                    <td>
                      <MonoData>{qty}</MonoData>
                    </td>
                    <td>
                      <MonoData>{cost}</MonoData>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
