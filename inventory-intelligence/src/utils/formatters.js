function formatDays(days) {
    if (days <= 0) return 'STOCKOUT NOW';
    if (days < 1) return `${Math.round(days * 24)}h`;
    if (days < 2) return '~1 day';
    return `${Math.round(days)} days`;
}

function formatDaysVerbose(days) {
    if (days <= 0) return 'already stocked out';
    if (days < 1) return `in ~${Math.round(days * 24)} hours`;
    if (days < 2) return 'in ~1 day';
    return `in ~${Math.round(days)} days`;
}

module.exports = { formatDays, formatDaysVerbose };
