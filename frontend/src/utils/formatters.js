/**
 * Indian numbering + ₹ prefix
 * @param {number} n
 */
export function formatInr(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return '₹0';
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/**
 * @param {number} days
 * @returns {{ text: string, tone: 'rust' | 'danger' | 'warn' | 'muted' }}
 */
/**
 * @param {number | null | undefined} remainingMinutes
 * @param {string} [status]
 */
export function formatPayableDue(remainingMinutes, status) {
  const overdue = status === 'overdue' || (remainingMinutes != null && remainingMinutes < 0);
  if (overdue) {
    return { text: 'OVERDUE', tone: 'rust' };
  }
  if (remainingMinutes == null) {
    return { text: '—', tone: 'muted' };
  }
  const days = remainingMinutes / 1440;
  if (days < 1) {
    const h = Math.max(1, Math.round(remainingMinutes / 60));
    return { text: `Due ~${h}h`, tone: 'danger' };
  }
  return { text: `Due ~${Math.round(days)}d`, tone: 'warn' };
}

export function formatStockoutLabel(days) {
  if (days <= 0) {
    return { text: 'STOCKOUT NOW', tone: 'rust' };
  }
  if (days < 1) {
    const h = Math.round(days * 24);
    return { text: `~${h}h`, tone: 'danger' };
  }
  if (days < 2) {
    return { text: '~1 day', tone: 'warn' };
  }
  return { text: `~${Math.round(days)} days`, tone: 'muted' };
}
