import { useState } from 'react';
import { Info, Power, PowerOff, Shuffle } from 'lucide-react';
import theme from '../../styles/theme';
import { startModelServer, stopModelServer, updateModelTraffic } from '../../features/admin/adminApi';
import useAuthStore from '../../stores/useAuthStore';
import { showToast } from '../../stores/useToastStore';
import useActionLock from '../../features/admin/useActionLock';
import { formatLogTime } from './adminLogFormat';
import { baselineGap, count, logLoss, percent } from './modelMetricFormat';

// 모델 관리 — 트래픽 분배 (총관리자만 바꾼다, 서버도 확인)
// ① 분배 중인 모델: 켜진 추천 서버의 모델 + 저장된 비율이 남은 모델 → 비교 지표를 보며 비율을 정한다 (PUT /admin/model-traffic)
// ② 모델 추가: 화면 입력과 맞지만 꺼진 모델 → [켜기] 로 추천 서버를 띄운다 (POST /admin/model-servers). 켜지면 ①에 0%로 들어온다
// 같은 사용자는 같은 모델을 받는다 (회원 번호 · 비회원 익명 ID 기준, 서버 RecommendationTrafficRouter)

// 막대 · 목록 표시 색 (순서대로). 테마 색만 쓴다
const SEGMENT_COLORS = [theme.colors.primary, theme.colors.mint, theme.colors.blue, theme.colors.muted, theme.colors.blueStrong, theme.colors.mintStrong];
const errorMessage = (error, fallback) => error.response?.data?.error?.message ?? fallback;

// 비교 지표 한 줄 (분배 중 · 모델 추가 모두 같은 순서)
function ModelMetrics({ row }) {
  return (
    <dl className="model-metrics">
      <div><dt>시험 정확도</dt><dd>{percent(row.testAccuracy)}</dd></div>
      <div><dt>log loss</dt><dd>{logLoss(row.testLogLoss)}</dd></div>
      <div><dt>{row.baselineLabel ? `${row.baselineLabel} 대비` : '기준 대비'}</dt><dd>{baselineGap(row)}</dd></div>
      <div><dt>최근 7일 요청</dt><dd>{count(row.requests7Days)}건</dd></div>
    </dl>
  );
}

// 저장된 비율 지문 (비율이 있는 모델만) — 입력 중인 값이 어떤 저장 상태를 기준으로 고친 것인지 표시한다.
// 저장 뒤 새 비율이 오면 지문이 달라져 입력값 대신 저장된 값이 보인다 (새 값이 오기 전 예전 비율로 잠깐 돌아가지 않는다)
// 비율이 0인 모델이 켜지거나 꺼져도 지문은 그대로라 입력 중인 값이 남는다
const weightFingerprint = (models) => models.filter((row) => row.weightPercent > 0)
  .map((row) => `${row.runName}:${row.weightPercent}`).sort().join('|');

export default function ModelTrafficCard({ models, upstreams, trafficConfigured, launcherEnabled, onChanged }) {
  const isSuperAdmin = useAuthStore((state) => state.member?.role === 'SUPER_ADMIN');
  const fingerprint = weightFingerprint(models);
  const [draft, setDraft] = useState({ base: null, values: {} });
  // 켜기 · 끄기 · 저장은 한 번에 하나. 성공하면 새 목록(models)이 올 때까지 잠근다 (useActionLock)
  const lock = useActionLock(models, { waitForRefresh: false });
  const [action, setAction] = useState(''); // 'save' · 'start:<모델>' · 'stop:<모델>' — 잠긴 동안만 뜻이 있다
  const [error, setError] = useState('');
  const pending = lock.locked ? action : '';
  const stopping = pending.startsWith('stop:') ? pending.slice(5) : null;
  const starting = pending.startsWith('start:') ? pending.slice(6) : null;

  const canWeight = (row) => row.servable && row.compatible;
  // 끄는 중인 모델은 누르는 즉시 분배 목록에서 뺀다 (다시 누를 수 없게). 실패하면 잠금이 풀려 다시 보인다
  const active = models.filter((row) => (canWeight(row) || row.weightPercent > 0) && row.runName !== stopping);
  const addable = models.filter((row) => row.runId && row.compatible && !row.servable && row.weightPercent === 0);
  const incompatible = models.filter((row) => !row.compatible && !row.servable).length;

  const values = draft.base === fingerprint ? draft.values : {};
  const weightOf = (row) => values[row.runName] ?? row.weightPercent;
  const total = active.reduce((sum, row) => sum + weightOf(row), 0);
  const changed = active.some((row) => weightOf(row) !== row.weightPercent);
  const blocked = active.find((row) => !canWeight(row) && weightOf(row) > 0);
  const colorOf = (index) => SEGMENT_COLORS[index % SEGMENT_COLORS.length];
  const defaultServer = upstreams.find((upstream) => upstream.up);
  const busy = lock.locked;
  const inputsLocked = !isSuperAdmin || busy;

  function setWeight(row, value) {
    const parsed = Math.round(Number(value));
    const limit = canWeight(row) ? 100 : row.weightPercent; // 꺼진 모델은 낮추기만
    const next = Number.isFinite(parsed) ? Math.min(limit, Math.max(0, parsed)) : 0;
    setDraft((current) => ({ base: fingerprint, values: { ...(current.base === fingerprint ? current.values : {}), [row.runName]: next } }));
    setError('');
  }

  // 비율을 줄 수 있는 모델에 똑같이 나누고, 나머지는 앞에서부터 1%씩
  function splitEvenly() {
    const targets = active.filter(canWeight);
    if (targets.length === 0) return;
    const base = Math.floor(100 / targets.length);
    let rest = 100 - base * targets.length;
    setDraft({ base: fingerprint, values: Object.fromEntries(active.map((row) => {
      if (!canWeight(row)) return [row.runName, 0];
      const extra = rest > 0 ? 1 : 0;
      rest -= extra;
      return [row.runName, base + extra];
    })) });
    setError('');
  }

  // 서버 요청 하나: 잠금 · 성공하면 알림 + 다시 불러오기(새 목록이 오면 잠금이 풀린다), 실패하면 카드 안에 문구
  async function run(key, request, done, fallback) {
    if (busy) return;
    setAction(key);
    setError('');
    try {
      if (!(await lock.run(request))) return;
      showToast(done);
      onChanged();
    } catch (err) {
      setError(errorMessage(err, fallback));
    }
  }

  function save() {
    if (total !== 100) {
      setError(`비율 합이 100%가 되어야 합니다. (지금 ${total}%)`);
      return;
    }
    run('save', () => updateModelTraffic(active.map((row) => ({ modelBundle: row.runName, weightPercent: weightOf(row) }))),
      '모델별 트래픽 비율을 저장했습니다.', '비율을 저장하지 못했습니다. 다시 시도해 주세요.');
  }

  const start = (row) => run(`start:${row.runName}`, () => startModelServer(row.runId),
    `${row.runName} 모델을 켜는 중입니다. 몇 초 뒤 분배 목록에 들어옵니다.`, '모델을 켜지 못했습니다.');
  const stop = (row) => run(`stop:${row.runName}`, () => stopModelServer(row.serverPort),
    `${row.runName} 모델을 껐습니다.`, '모델을 끄지 못했습니다.');

  return (
    <section className="admin-card" aria-labelledby="model-traffic-title">
      <div className="admin-card-heading">
        <div>
          <h3 id="model-traffic-title">트래픽 분배</h3>
          <p>여러 모델을 켜고, 비교 지표를 보며 사용자를 비율대로 나눠 추천합니다. 같은 사용자는 계속 같은 모델을 받습니다.</p>
        </div>
        <Shuffle size={theme.iconSize.md} aria-hidden="true" />
      </div>

      {!trafficConfigured && (
        <div className="admin-inline-note model-traffic-note">
          <Info size={theme.iconSize.sm} aria-hidden="true" />
          <span>아직 비율을 정하지 않았습니다. 지금은 첫 번째로 켜진 추천 서버({defaultServer?.modelBundle ?? '없음'})가 모든 요청을 받습니다.</span>
        </div>
      )}

      <h4 className="model-traffic-section-title">분배 중인 모델 <span>{active.length}개</span></h4>
      {stopping && <p className="admin-inline-note model-traffic-note" role="status">{stopping} 모델을 끄는 중입니다…</p>}
      {active.length === 0 ? (
        <p className="admin-empty" role="status">켜진 모델이 없습니다. 아래 모델 추가에서 모델을 켜 주세요.</p>
      ) : (
        <>
          <div className="model-traffic-bar" aria-hidden="true">
            {active.map((row, index) => weightOf(row) > 0
              && <span key={row.runName} style={{ width: `${weightOf(row)}%`, background: colorOf(index) }} />)}
          </div>
          <ul className="model-traffic-list">
            {active.map((row, index) => {
              const inputId = `model-traffic-${index}`;
              const hasSavedTraffic = row.weightPercent > 0;
              return (
                <li key={row.runName}>
                  <div className="model-traffic-head">
                    <label htmlFor={inputId} className="model-traffic-name">
                      <i style={{ background: colorOf(index) }} aria-hidden="true" />
                      <strong>{row.runName}</strong>
                    </label>
                    {!row.servable && <span className="admin-status is-check">추천 서버 꺼짐 · 0%로만 바꿀 수 있음</span>}
                    {row.servable && !row.compatible && <span className="admin-status is-check">화면 입력과 다른 모델 · 0%로만 바꿀 수 있음</span>}
                    {isSuperAdmin && launcherEnabled && row.stoppable && (
                      <button type="button" className="admin-text-button model-traffic-power" onClick={() => stop(row)}
                        disabled={busy || hasSavedTraffic}
                        title={hasSavedTraffic ? '비율을 0%로 저장한 뒤 끌 수 있습니다' : undefined}>
                        <PowerOff size={theme.iconSize.sm} aria-hidden="true" />끄기
                      </button>
                    )}
                  </div>
                  <ModelMetrics row={row} />
                  <div className="model-traffic-control">
                    <input type="range" min="0" max="100" step="1" value={weightOf(row)} disabled={inputsLocked}
                      aria-label={`${row.runName} 비율 조절`} onChange={(event) => setWeight(row, event.target.value)} />
                    <span className="model-traffic-input">
                      <input id={inputId} type="number" inputMode="numeric" min="0" max="100" step="1" value={weightOf(row)}
                        disabled={inputsLocked} onChange={(event) => setWeight(row, event.target.value)} />
                      <span aria-hidden="true">%</span>
                    </span>
                  </div>
                  {isSuperAdmin && row.stoppable && hasSavedTraffic && (
                    <p className="admin-feedback">끄려면 먼저 비율을 0%로 저장해 주세요.</p>
                  )}
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
                <button type="button" className="admin-outline-button" onClick={() => { setDraft({ base: null, values: {} }); setError(''); }}
                  disabled={busy || !changed}>되돌리기</button>
                <button type="button" className="admin-primary-button" onClick={save}
                  disabled={busy || !changed || total !== 100 || Boolean(blocked)}>{pending === 'save' ? '저장 중…' : '비율 저장'}</button>
              </div>
            ) : (
              <p className="admin-feedback">비율 변경 · 모델 켜기와 끄기는 총관리자만 할 수 있습니다.</p>
            )}
          </div>
          {blocked && <p className="model-traffic-error" role="alert">{blocked.runName} 모델은 지금 비율을 줄 수 없습니다. 0%로 바꿔 주세요.</p>}
        </>
      )}
      {error && <p className="model-traffic-error" role="alert">{error}</p>}

      <h4 className="model-traffic-section-title">모델 추가 <span>{addable.length}개</span></h4>
      {!launcherEnabled ? (
        <div className="admin-inline-note">
          <Info size={theme.iconSize.sm} aria-hidden="true" />
          <span>이 서버에서는 화면으로 모델을 켤 수 없습니다. 개발 PC 에서는 ML_EXTRA_RUNS="&lt;폴더&gt;@&lt;포트&gt;" ./dev.sh 로 추천 서버를 더 띄워 주세요.</span>
        </div>
      ) : addable.length === 0 ? (
        <p className="admin-empty" role="status">더 켤 수 있는 모델이 없습니다.</p>
      ) : (
        <ul className="model-add-list">
          {addable.map((row) => {
            // 켜기를 누른 순간부터 "켜는 중" (202 응답 뒤 새 목록이 오기 전에 다시 눌리지 않게)
            const rowStarting = row.serverState === 'STARTING' || row.runName === starting;
            const failed = row.serverState === 'FAILED' && !rowStarting;
            return (
              <li key={row.runId}>
                <div className="model-traffic-head">
                  <strong>{row.runName}</strong>
                  <small>{row.trainedAt ? `학습 ${formatLogTime(row.trainedAt)}` : '학습일 -'} · 가상 가구 {count(row.profiles)}</small>
                  {rowStarting && <span className="admin-status is-neutral" role="status">켜는 중…{row.serverPort && row.serverState === 'STARTING' ? ` (포트 ${row.serverPort})` : ''}</span>}
                  {failed && <span className="admin-status is-check">켜기 실패</span>}
                  {isSuperAdmin && (
                    <button type="button" className="admin-outline-button model-traffic-power" onClick={() => start(row)}
                      disabled={busy || rowStarting}>
                      <Power size={theme.iconSize.sm} aria-hidden="true" />
                      {rowStarting ? '켜는 중…' : failed ? '다시 켜기' : '켜기'}
                    </button>
                  )}
                </div>
                <ModelMetrics row={row} />
                {failed && row.serverError && <p className="model-traffic-error">실패 사유: {row.serverError}</p>}
              </li>
            );
          })}
        </ul>
      )}
      {incompatible > 0 && (
        <p className="admin-result-count">입력 구조가 지금 화면과 달라 추가할 수 없는 모델 {incompatible}개는 아래 모델 비교 표에서 볼 수 있습니다.</p>
      )}
    </section>
  );
}
