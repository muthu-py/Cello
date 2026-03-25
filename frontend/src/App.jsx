import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import RestockPlan from './pages/RestockPlan';
import ForecastPage from './pages/ForecastPage';
import CombinedPriority from './pages/CombinedPriority';
import WeightsHistory from './pages/WeightsHistory';
import PaymentSchedule from './pages/PaymentSchedule';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<AppShell />}>
                    <Route path="/" element={<RestockPlan />} />
                    <Route path="/forecast" element={<ForecastPage />} />
                    <Route path="/forecast/:medicineId" element={<ForecastPage />} />
                    <Route path="/priority" element={<CombinedPriority />} />
                    <Route path="/weights" element={<WeightsHistory />} />
                    <Route path="/payments" element={<PaymentSchedule />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
