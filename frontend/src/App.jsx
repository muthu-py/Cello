import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import RestockPlan from './pages/RestockPlan';
import ForecastPage from './pages/ForecastPage';
import ForecastRedirect from './pages/ForecastRedirect';
import CombinedPriority from './pages/CombinedPriority';
import PaymentSchedule from './pages/PaymentSchedule';
import Settlements from './pages/Settlements';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<RestockPlan />} />
          <Route path="/forecast" element={<ForecastRedirect />} />
          <Route path="/forecast/:medicineId" element={<ForecastPage />} />
          <Route path="/priority" element={<CombinedPriority />} />
          <Route path="/payments" element={<Settlements />} />
          <Route path="/settlements" element={<Settlements />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
