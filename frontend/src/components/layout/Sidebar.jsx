import { NavLink } from 'react-router-dom';

const linkBase = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  padding: '10px 14px',
  borderRadius: 'var(--radius-panel)',
  border: '1px solid transparent',
};

export default function Sidebar() {
  return (
    <aside
      className="shrink-0 flex flex-col gap-1 px-3 py-4"
      style={{
        width: 'var(--sidebar-w)',
        background: 'var(--bg-sidebar)',
        borderRight: 'var(--border-default)',
        minHeight: 'calc(100vh - var(--topbar-h))',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          padding: '0 14px 10px',
        }}
      >
        Views
      </div>
      <NavItem to="/" label="Restock" />
      <NavItem to="/forecast" label="Forecast" />
      <NavItem to="/priority" label="Priority" />
      <NavItem to="/payments" label="Settlements" />
    </aside>
  );
}

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        ...linkBase,
        color: isActive ? 'var(--rust-text)' : 'var(--text-secondary)',
        background: isActive ? 'var(--bg-panel)' : 'transparent',
        borderColor: isActive ? 'var(--rust-border)' : 'transparent',
        fontWeight: isActive ? 500 : 400,
      })}
    >
      {label}
    </NavLink>
  );
}
