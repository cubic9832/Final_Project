import { useFinancialLocation } from '../../financialNavigation.js';
import { Navigate } from 'react-router-dom';

// Preserve bookmarked routes and saved inputs from the former separate step.
export default function FinancialAssetsPage() {
  const { state } = useFinancialLocation();
  return <Navigate to="/financial" state={state} replace />;
}
