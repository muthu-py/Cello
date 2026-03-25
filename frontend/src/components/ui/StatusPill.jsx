import './StatusPill.css';
const map = { LIVE: 'green', OFFLINE: 'rust', SYNCING: 'amber' };
export default function StatusPill({ status = 'LIVE' }) {
    return <span className={`status-pill status-pill--${map[status] || 'neutral'}`}><span className="status-pill__dot" />{status}</span>;
}
