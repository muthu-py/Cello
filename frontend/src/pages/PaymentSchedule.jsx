import { useMemo, useState } from 'react';
import ActionButton from '../components/ui/ActionButton';
import MonoData from '../components/ui/MonoData';
import ReasonCard from '../components/ui/ReasonCard';
import { usePayments } from '../hooks/usePayments';
import { formatInr } from '../utils/formatters';

const STATIONS = ['STATION ALPHA', 'STATION BRAVO'];

function flexCategory(flex) {
  const f = String(flex || '').toLowerCase();
  if (f === 'low') return 'CRITICAL OBLIGATION';
  if (f === 'medium') return 'CORE PAYABLE';
  return 'FLEXIBLE PAYABLE';
}

function flexTagline(flex) {
  const f = String(flex || '').toLowerCase();
  if (f === 'low') return 'LOW FLEXIBILITY — FULL SETTLEMENT ONLY';
  if (f === 'medium') return 'MEDIUM FLEXIBILITY — PARTIALS ALLOWED';
  return 'HIGH FLEXIBILITY — DEFERRED SEQUENCE';
}

function deferralReason(flex) {
  const f = String(flex || '').toLowerCase();
  if (f === 'low') {
    return 'REASON FOR DEFERRAL: Low-flex obligation must clear in full. Insufficient closing cash within the planning horizon after higher-priority settlements.';
  }
  if (f === 'medium') {
    return 'REASON FOR DEFERRAL: Cash reserved for critical/low-flex pipeline; this obligation remains for the next inflow cycle or re-allocation.';
  }
  return 'REASON FOR DEFERRAL: Sequenced after higher-priority treasury rails; eligible once upstream items clear or injection increases.';
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

export default function PaymentSchedule() {
  const { data, error, loading, load } = usePayments();
  const [cashInput, setCashInput] = useState('0');

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
    let maxCash = Math.max(initial, 1, ...profits.map(Number));

    for (let d = 0; d < n; d++) {
      running += Number(profits[d] ?? 0);
      const afterInflow = running;
      const items = byDay[d] ?? [];
      const paid = items.reduce((a, x) => a + Number(x.paid), 0);
      const after = running - paid;
      maxCash = Math.max(maxCash, afterInflow, after);
      const hasPartial = items.some((x) => x.type === 'partial');
      const utilizationPct =
        afterInflow > 0 ? Math.min(100, Math.round((paid / afterInflow) * 100)) : 0;

      cols.push({
        day: d,
        items,
        endCash: after,
        afterInflow,
        paid,
        hasPartial,
        utilizationPct,
        station: STATIONS[d % STATIONS.length],
      });
      running = after;
    }

    return cols.map((c) => ({
      ...c,
      liquidityPct: Math.round((c.endCash / maxCash) * 100),
    }));
  }, [data]);

  const unpaid = data?.unpaid ?? [];
  const totalDeferred = unpaid.reduce((s, u) => s + Number(u.remaining ?? 0), 0);

  function onGenerate(e) {
    e.preventDefault();
    const v = Number.parseFloat(String(cashInput).replace(/,/g, ''));
    const initial = Number.isFinite(v) ? v : 0;
    load(initial);
  }

  function onReallocate() {
    const v = Number.parseFloat(String(cashInput).replace(/,/g, ''));
    load(Number.isFinite(v) ? v : 0);
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              margin: '0 0 10px',
            }}
          >
            Treasury optimization engine v4.0
          </p>
          <h1
            className="page-title"
            style={{ marginBottom: 6, fontSize: 'clamp(26px, 3vw, 30px)' }}
          >
            Cash flow · Payment schedule
          </h1>
          <p className="page-meta" style={{ marginBottom: 0 }}>
            Day-by-day settlement rails with hybrid low-flex guardrails. Scroll horizontally to follow
            cash movement across the horizon; deferred obligations consolidate on the right.
          </p>
        </div>

        <form
          className="flex flex-wrap items-end gap-4"
          onSubmit={onGenerate}
          style={{ minWidth: 280 }}
        >
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
              Initial cash injection
            </span>
            <input
              className="cello-cash-input"
              style={{ minWidth: 160, fontSize: 13, padding: '10px 12px' }}
              value={cashInput}
              onChange={(e) => setCashInput(e.target.value)}
              inputMode="decimal"
              placeholder="0"
            />
          </div>
          <ActionButton type="submit" disabled={loading}>
            Generate schedule
          </ActionButton>
        </form>
        </div>
        {data?.initial_cash != null && data.initial_cash !== undefined ? (
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
              margin: 0,
            }}
          >
            Applied opening balance: {formatInr(data.initial_cash)}
          </p>
        ) : null}
      </header>

      {data && !loading && !error && data.summary ? (
        <div
          className="flex flex-wrap gap-6 py-3 px-4"
          style={{
            border: 'var(--border-inner)',
            borderRadius: 'var(--radius-panel)',
            background: 'var(--bg-header)',
          }}
        >
          <HeaderMetric label="Allocated" value={formatInr(data.summary.total_cash_allocated ?? 0)} />
          <HeaderMetric label="Deferred pool" value={formatInr(data.summary.total_remaining_debt ?? 0)} />
          <HeaderMetric label="Closing liquidity" value={formatInr(data.summary.remaining_cash ?? 0)} />
          <HeaderMetric
            label="Horizon"
            value={<MonoData>{data.summary.days_planned ?? '—'} days</MonoData>}
          />
        </div>
      ) : null}

      {loading ? <div className="mono-loading">LOADING...</div> : null}
      {error ? (
        <ReasonCard text="Settlement engine unavailable. Run inventory-intelligence and finance services so payables can be fetched." />
      ) : null}

      {data && !loading && !error ? (
        <div className="flex gap-0 min-w-0 items-stretch">
          <div
            className="grow min-w-0 overflow-x-auto"
            style={{
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: 8,
            }}
          >
            <div className="flex gap-0 min-h-[420px]">
              {columns.map((col) => (
                <DayColumn key={col.day} col={col} />
              ))}
            </div>
          </div>

          <aside
            className="shrink-0 flex flex-col border-l"
            style={{
              width: 300,
              borderLeft: 'var(--border-default)',
              background: 'var(--bg-panel)',
            }}
          >
            <div
              className="px-4 py-3 flex items-center gap-2"
              style={{ borderBottom: 'var(--border-row)' }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--text-primary)',
                }}
              >
                Unpaid / deferred
              </span>
            </div>

            <div className="flex flex-col gap-0 flex-1 overflow-y-auto px-4 py-3">
              {unpaid.length === 0 ? (
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  No deferred obligations — all items cleared inside the horizon.
                </p>
              ) : (
                unpaid.map((u) => (
                  <div
                    key={String(u.id)}
                    style={{
                      borderBottom: 'var(--border-row)',
                      paddingBottom: 14,
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        marginBottom: 6,
                      }}
                    >
                      {syntheticInvoiceId(u.id)}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        lineHeight: 1.35,
                        marginBottom: 8,
                      }}
                    >
                      {u.name}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 14,
                        fontWeight: 500,
                        color: 'var(--rust-text)',
                        textAlign: 'right',
                        marginBottom: 10,
                      }}
                    >
                      {formatInr(u.remaining)}
                    </div>
                    <DeferralBox text={deferralReason(u.flexibility)} />
                  </div>
                ))
              )}
            </div>

            <div
              className="px-4 py-3 mt-auto"
              style={{ borderTop: 'var(--border-default)', background: 'var(--bg-header)' }}
            >
              <div className="flex justify-between items-baseline gap-2 mb-3">
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 8,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}
                >
                  Total deferred
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 15,
                    color: 'var(--text-primary)',
                  }}
                >
                  {formatInr(totalDeferred)}
                </span>
              </div>
              <ActionButton variant="ghost" onClick={onReallocate} disabled={loading}>
                Re-allocate funds
              </ActionButton>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function HeaderMetric({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </span>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}

function DeferralBox({ text }) {
  return (
    <div
      style={{
        background: 'var(--neutral-bg)',
        border: 'var(--border-inner)',
        borderRadius: 'var(--radius-panel)',
        padding: '10px 12px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 7,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 6,
        }}
      >
        Reason for deferral
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 400,
          lineHeight: 1.55,
          color: 'var(--text-secondary)',
        }}
      >
        {text.replace(/^REASON FOR DEFERRAL:\s*/, '')}
      </p>
    </div>
  );
}

function DayColumn({ col }) {
  const statusLabel = col.hasPartial ? 'ADJUSTED' : 'BALANCED';
  const statusColor = col.hasPartial ? 'var(--amber-text)' : 'var(--green-text)';

  return (
    <div
      className="shrink-0 flex flex-col"
      style={{
        width: 172,
        scrollSnapAlign: 'start',
        borderRight: 'var(--border-row)',
        background: col.day % 2 === 0 ? 'var(--bg-panel)' : 'var(--bg-header)',
      }}
    >
      <div className="px-3 pt-3 pb-2 flex flex-col gap-1">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          {col.station}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-condensed)',
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-primary)',
          }}
        >
          Day {(col.day + 1).toString().padStart(2, '0')}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: statusColor }}>
          {statusLabel}
        </span>
        <div
          style={{
            height: 3,
            background: '#ebe8e2',
            borderRadius: 0,
            marginTop: 6,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${col.utilizationPct}%`,
              background: col.paid > 0 ? 'var(--rust)' : 'var(--green-border)',
              transition: 'width 0.35s ease',
            }}
          />
        </div>
      </div>

      <div
        className="flex justify-center px-2 py-2"
        style={{ borderTop: 'var(--border-row)', borderBottom: 'var(--border-row)' }}
      >
        <div
          className="flex items-end justify-center"
          style={{ height: 56, width: 5, background: '#ebe8e2' }}
        >
          <div
            style={{
              width: '100%',
              height: `${Math.max(6, col.liquidityPct)}%`,
              background: 'var(--green)',
              transition: 'height 0.35s ease',
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 px-2 py-3 flex-1">
        {col.items.length === 0 ? (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--text-ghost)',
              textAlign: 'center',
              padding: '12px 4px',
            }}
          >
            No settlements
          </div>
        ) : (
          col.items.map((p) => <PaymentCard key={`${String(p.payment_id)}-${p.paid}-${p.day}`} p={p} />)
        )}
      </div>

      <div
        className="px-3 py-3 mt-auto"
        style={{
          borderTop: 'var(--border-default)',
          background: 'var(--bg-panel)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 7,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 4,
          }}
        >
          Remaining
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>
          {formatInr(col.endCash)}
        </div>
      </div>
    </div>
  );
}

function PaymentCard({ p }) {
  const f = String(p.flexibility || '').toLowerCase();
  const accent =
    f === 'low' ? 'var(--rust-text)' : f === 'medium' ? 'var(--amber-text)' : 'var(--text-muted)';
  const borderLeft =
    f === 'low' ? '3px solid var(--rust)' : f === 'medium' ? '3px solid var(--amber)' : '3px solid var(--border-muted)';

  return (
    <div
      style={{
        border: 'var(--border-inner)',
        borderLeft,
        borderRadius: 'var(--radius-panel)',
        background: 'var(--bg-panel)',
        padding: '10px 10px 10px 11px',
        transition: 'transform 0.2s ease',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-condensed)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--rust-text)',
          marginBottom: 6,
        }}
      >
        {flexCategory(p.flexibility)}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          fontWeight: 500,
          lineHeight: 1.35,
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}
      >
        {p.name}
      </div>
      <div className="flex items-start justify-between gap-2">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 7,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            lineHeight: 1.3,
            maxWidth: '58%',
          }}
        >
          {flexTagline(p.flexibility)}
        </span>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {p.type === 'partial' ? (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 7,
                color: 'var(--amber-text)',
                letterSpacing: '0.08em',
              }}
            >
              PARTIAL
            </span>
          ) : null}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: accent }}>
            {formatInr(p.paid)}
          </span>
        </div>
      </div>
    </div>
  );
}
