import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import './AppShell.css';
export default function AppShell() {
    return (
        <div className="app-shell">
            <TopBar />
            <Sidebar />
            <main className="app-shell__main"><Outlet /></main>
        </div>
    );
}
