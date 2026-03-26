import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

export default function AppShell() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-page)' }}>
      <TopBar />
      <div className="flex flex-1 min-w-0">
        <Sidebar />
        <main
          className="flex-1 min-w-0 overflow-auto"
          style={{
            background: 'var(--bg-page)',
            borderLeft: 'var(--border-inner)',
          }}
        >
          <div className="page-shell px-6 py-8 md:px-10 md:py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
