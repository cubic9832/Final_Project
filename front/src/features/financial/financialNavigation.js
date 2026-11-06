import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { readScopedFinancialState, scopeFinancialState } from './financialSession.js';

export function useFinancialLocation() {
  const location = useLocation();
  return { ...location, state: readScopedFinancialState(location.state) };
}

export function useFinancialNavigate() {
  const navigate = useNavigate();
  return useCallback((to, options) => navigate(to, options?.state
    ? { ...options, state: scopeFinancialState(options.state) }
    : options), [navigate]);
}
