import { Navigate } from 'react-router-dom';
import { useRestockPlan } from '../hooks/useRestockPlan';
import ReasonCard from '../components/ui/ReasonCard';
import SectionLabel from '../components/ui/SectionLabel';

export default function ForecastRedirect() {
  const { data, loading, error } = useRestockPlan();

  if (loading) {
    return <div className="mono-loading">LOADING...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="page-title">Forecast</h1>
        <SectionLabel>Demand</SectionLabel>
        <ReasonCard text="Cannot reach the inventory API. Start inventory-intelligence (port 3000), ensure MongoDB is running, or set VITE_INVENTORY_API if using a remote host." />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="page-title">Forecast</h1>
        <SectionLabel>Demand</SectionLabel>
        <ReasonCard text="No medicines in the restock plan yet. Run the inventory simulation or seed data, then open Forecast again." />
      </div>
    );
  }

  return <Navigate to={`/forecast/${encodeURIComponent(data[0].medicine_id)}`} replace />;
}
