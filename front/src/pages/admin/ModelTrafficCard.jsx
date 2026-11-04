import { useMemo, useState } from 'react';
import { Info, Shuffle } from 'lucide-react';
import theme from '../../styles/theme';
import { updateModelTraffic } from '../../features/admin/adminApi';
import useAuthStore from '../../stores/useAuthStore';
import { showToast } from '../../stores/useToastStore';

// 모델 관리 — 트래픽 분배: 여러 추천 모델에 사용자를 몇 %씩 보낼지 정한다 (PUT /admin/model-traffic, 총관리자만)
// 같은 사용자는 같은 모델을 받는다 (회원 번호 · 비회원 익명 ID 기준, 서버 RecommendationTrafficRouter)
// 비율을 줄 수 있는 모델 = 켜진 추천 서버가 쓰고 있고, 지금 화면 입력과 맞는 모델. 저장한 비율이 남은 꺼진 모델은 0%로 낮출 수만 있다

// 막대 · 목록 표시 색 (순서대로). 테마 색만 쓴다
const SEGMENT_COLORS = [theme.colors.primary, theme.colors.mint, theme.colors.blue, theme.colors.muted, theme.colors.blueStrong, theme.colors.mintStrong];

const initialDraft = (rows) => Object.fromEntries(rows.map((row) => [row.runName, row.weightPercent]));

export default function ModelTrafficCard({ models, upstreams, trafficConfigured, onSaved }) {
  const isSuperAdmin = useAuthStore((state) => state.member?.role === 'SUPER_ADMIN');
  // 분배 대상: 비율을 줄 수 있는 모델 + 저장된 비율이 남아 있는 모델
  const rows = useMemo(() => models.filter((row) => (row.servable && row.compatible) || row.weightPercent > 0), [models]);
  const [draft, setDraft] = useState(() => initialDraft(rows));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canWeight = (row) => row.servable && row.compatible;
  const total = rows.reduce((sum, row) => sum + (Number(draft[row.runName]) || 0), 0);
  const changed = rows.some((row) => (Number(draft[row.runName]) || 0) !== row.weightPercent);
  const blocked = rows.find((row) => !canWeight(row) && (Number(draft[row.runName]) || 0) > 0);
  const colorOf = (index) => SEGMENT_COLORS[index % SEGMENT_COLORS.length];
  const defaultServer = upstreams.find((upstream) => upstream.up);

  function setWeight(runName, value, row) {
    const parsed = Math.round(Number(value));
    const limit = canWeight(row) ? 100 : row.weightPercent; // 꺼진 모델은 낮추기만
    setDraft((current) => ({ ...current, [runName]: Number.isFinite(parsed) ? Math.min(limit, Math.max(0, parsed)) : 0 }));
    setError('');
  }

  // 비율을 줄 수 있는 모델에 똑같이 나누고, 나머지는 앞에서부터 1%씩
  function splitEvenly() {
    const targets = rows.filter(canWeight);
    if (targets.length === 0) return;
    const base = Math.floor(100 / targets.length);
    let rest = 100 - base * targets.length;
    setDraft(Object.fromEntries(rows.map((row) => {
      if (!canWeight(row)) return [row.runName, 0];
      const extra = rest > 0 ? 1 : 0;
      rest -= extra;
      return [row.runName, base + extra];
    })));
    setError('');
  }

  async function save() {
    if (busy) return;
    if (total !== 100) {
      setError(`비율 합이 100%가 되어야 합니다. (지금 ${total}%)`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await updateModelTraffic(rows.map((row) => ({ modelBundle: row.runName, weightPercent: Number(draft[row.runName]) || 0 })));
      showToast('모델별 트래픽 비율을 저장했습니다.');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error?.message ?? '비율을 저장하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-card" aria-labelledby="model-traffic-title">
      <div className="admin-card-heading">
        <div>
          <h3 id="model-traffic-title">트래픽 분배</h3>
          <p>사용자를 모델별 비율로 나눠 추천합니다. 같은 사용자는 계속 같은 모델을 받습니다.</p>
        </div>
        <Shuffle size={theme.iconSize.md} aria-hidden="true" />
      </div>

      {!trafficConfigured && (
        <div className="admin-inline-note model-traffic-note">
          <Info size={theme.iconSize.sm} aria-hidden="true" />
          <span>아직 비율을 정하지 않았습니다. 지금은 첫 번째로 켜진 추천 서버({defaultServer?.modelBundle ?? '없음'})가 모든 요청을 받습니다.</span>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="admin-empty" role="status">비율을 줄 수 있는 모델이 없습니다. 추천 서버가 켜져 있는지 확인해 주세요.</p>
      ) : (
        <>
          <div className="model-traffic-bar" aria-hidden="true">
            {rows.map((row, index) => {
              const weight = Number(draft[row.runName]) || 0;
              return weight > 0 && <span key={row.runName} style={{ width: `${weight}%`, background: colorOf(index) }} />;
            })}
          </div>

          <ul className="model-traffic-list">
            {rows.map((row, index) => {
              const weight = Number(draft[row.runName]) || 0;
              const inputId = `model-traffic-${index}`;
              const readOnly = !isSuperAdmin || busy;
              return (
                <li key={row.runName}>
                  <label htmlFor={inputId} className="model-traffic-name">
                    <i style={{ background: colorOf(index) }} aria-hidden="true" />
                    <span>
                      <strong>{row.runName}</strong>
                      {!row.servable && <small className="admin-status is-check">추천 서버 꺼짐 · 0%로만 바꿀 수 있음</small>}
                      {row.servable && !row.compatible && <small className="admin-status is-check">화면 입력과 다른 모델 · 0%로만 바꿀 수 있음</small>}
                    </span>
                  </label>
                  <input type="range" min="0" max="100" step="1" value={weight} disabled={readOnly}
                    aria-label={`${row.runName} 비율 조절`} onChange={(event) => setWeight(row.runName, event.target.value, row)} />
                  <span className="model-traffic-input">
                    <input id={inputId} type="number" inputMode="numeric" min="0" max="100" step="1" value={weight}
                      disabled={readOnly} onChange={(event) => setWeight(row.runName, event.target.value, row)} />
                    <span aria-hidden="true">%</span>
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="model-traffic-footer">
            <p className={`model-traffic-total ${total === 100 ? 'is-ok' : 'is-invalid'}`} role="status">
              합계 <strong>{total}%</strong>{total !== 100 && ' · 100%가 되어야 저장할 수 있습니다'}
            </p>
            {isSuperAdmin ? (
              <div className="model-traffic-actions">
                <button type="button" className="admin-outline-button" onClick={splitEvenly} disabled={busy}>똑같이 나누기</button>
                <button type="button" className="admin-outline-button" onClick={() => { setDraft(initialDraft(rows)); setError(''); }}
                  disabled={busy || !changed}>되돌리기</button>
                <button type="button" className="admin-primary-button" onClick={save}
                  disabled={busy || !changed || total !== 100 || Boolean(blocked)}>{busy ? '저장 중…' : '비율 저장'}</button>
              </div>
            ) : (
              <p className="admin-feedback">비율은 총관리자만 바꿀 수 있습니다.</p>
            )}
          </div>
          {blocked && <p className="model-traffic-error" role="alert">{blocked.runName} 모델은 지금 비율을 줄 수 없습니다. 0%로 바꿔 주세요.</p>}
          {error && <p className="model-traffic-error" role="alert">{error}</p>}
        </>
      )}
    </section>
  );
}
