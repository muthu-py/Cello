import { NavLink } from 'react-router-dom';
import './Sidebar.css';
const links = [
    { to: '/', label: 'Restock Plan' },
    { to: '/forecast', label: 'Forecast' },
    { to: '/priority', label: 'Combined Priority' },
    { to: '/weights', label: 'Weights' },
    { to: '/payments', label: 'Payment Schedule' },
];
export default function Sidebar() {
    return (
        <nav className="sidebar">
            <div className="sidebar__section-label">Navigation</div>
            {links.map(l => (
                <NavLink key={l.to} to={l.to} className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}>
                    {l.label}
                </NavLink>
            ))}
        </nav>
    );
}
