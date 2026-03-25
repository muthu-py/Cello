export function formatCurrency(n) {
    if (n == null) return '—';
    return '₹' + Number(n).toLocaleString('en-IN');
}

export function formatDays(d) {
    if (d == null) return '—';
    if (d <= 0) return 'STOCKOUT NOW';
    if (d < 1) return `~${Math.round(d * 24)}h`;
    if (d < 2) return '~1 day';
    return `~${Math.round(d)} days`;
}

export function formatDaysColor(d) {
    if (d == null) return 'muted';
    if (d <= 0) return 'rust';
    if (d < 1) return 'rust';
    if (d < 3) return 'amber';
    return 'green';
}
