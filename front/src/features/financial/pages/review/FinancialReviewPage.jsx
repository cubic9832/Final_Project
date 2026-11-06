import { useFinancialLocation } from '../../financialNavigation.js';
import { Navigate } from 'react-router-dom';

export default function FinancialReviewPage() {
  const { state } = useFinancialLocation();
  return <Navigate to={state?.values ? '/financial/vehicle' : '/financial'} state={state} replace />;
}
