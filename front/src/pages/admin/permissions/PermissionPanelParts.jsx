import { Search } from 'lucide-react';
import theme from '../../../styles/theme';

export function PermissionSearch({ value, onChange, onSubmit, placeholder }) {
  return <form className="permission-search" onSubmit={onSubmit}><div className="admin-search-field form-focus-group"><input type="search" maxLength={100} aria-label={placeholder} placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)} /><button type="submit" aria-label="검색"><Search size={theme.iconSize.md} aria-hidden="true" /></button></div></form>;
}
export function PermissionLoadState({ state, onRetry }) {
  if (state.status === 'loading') return <p className="admin-empty" role="status">권한 정보를 불러오는 중…</p>;
  if (state.status === 'error') return <p className="admin-empty" role="alert">{state.error} <button type="button" className="admin-text-button" onClick={onRetry}>다시 시도</button></p>;
  return null;
}
