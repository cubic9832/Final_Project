import { useCallback, useEffect, useState } from 'react';
import { getPermissionAccounts, getPermissionCatalog } from '../../../features/admin/adminPermissionApi.js';

export const permissionError = error => error.response?.data?.detail || error.response?.data?.error?.message || '권한 정보를 처리하지 못했습니다. 다시 시도해 주세요.';
export default function usePermissionData(includeAccounts = false) {
  const [state, setState] = useState({ status: 'loading', roles: [], screens: [], accounts: [], error: '' });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => { setState(current => ({ ...current, status: 'loading', error: '' })); setVersion(current => current + 1); }, []);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getPermissionCatalog(controller.signal), includeAccounts ? getPermissionAccounts(controller.signal) : Promise.resolve([])])
      .then(([catalog, accounts]) => { if (!controller.signal.aborted) setState({ status: 'done', ...catalog, accounts, error: '' }); })
      .catch(error => { if (!controller.signal.aborted) setState(current => ({ ...current, status: 'error', error: permissionError(error) })); });
    return () => controller.abort();
  }, [version, includeAccounts]);
  return { state, reload };
}
