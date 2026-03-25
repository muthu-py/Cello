import './TopBar.css';
import StatusPill from '../ui/StatusPill';
export default function TopBar() {
    return (
        <header className="topbar">
            <div className="topbar__brand">
                <span className="topbar__logo">Cello</span>
                <span className="topbar__dot">.</span>
                <span className="topbar__ops">Ops</span>
            </div>
            <div className="topbar__right">
                <StatusPill status="LIVE" />
                <span className="topbar__time">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </header>
    );
}
