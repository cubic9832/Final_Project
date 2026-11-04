import { GitCompare } from 'lucide-react';
import theme from '../../styles/theme';
import { formatLogTime } from './adminLogFormat';

// 모델 관리 — 모델 비교 표: 학습 결과 폴더(ml/outputs/models/<계열>/<폴더>)마다 한 줄 (GET /admin/models)
// 학습 · 평가 지표 = 학습 결과 파일, 서빙 상태 = 추천 서버 응답, 요청 수 = recommendation_model_daily_usage, 진단 수 = model_versions · analysis_runs
// 정확도의 뜻(시나리오 선택 / 쌍 비교)이 계열마다 달라, 같은 평가 방식끼리만 비교하도록 줄마다 평가 방식을 함께 보여 준다

const percent = (value) => (value == null ? '-' : `${(value * 100).toFixed(1)}%`);
const count = (value) => (value == null ? '-' : value.toLocaleString('ko-KR'));

// 기준(선형 모델 · 이전 모델) 대비 정확도 차이 (%p)
function baselineGap(row) {
  if (row.testAccuracy == null || row.baselineAccuracy == null) return '-';
  const gap = (row.testAccuracy - row.baselineAccuracy) * 100;
  return `${gap >= 0 ? '+' : ''}${gap.toFixed(1)}%p`;
}

export default function ModelComparisonTable({ models, selectedRunId, onSelect }) {
  return (
    <section className="admin-card" aria-labelledby="model-comparison-title">
      <div className="admin-card-heading">
        <div>
          <h3 id="model-comparison-title">모델 비교</h3>
          <p>학습 결과 폴더별 평가 지표와 실제 사용량 (모델 이름을 누르면 아래에 상세가 보입니다)</p>
        </div>
        <GitCompare size={theme.iconSize.md} aria-hidden="true" />
      </div>
      {models.length === 0 ? (
        <p className="admin-empty" role="status">학습 결과 폴더가 없습니다 (ml/outputs/models/…).</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table model-comparison-table">
            <caption className="admin-sr-only">모델별 평가 지표 · 서빙 상태 · 사용량</caption>
            <thead>
              <tr>
                <th scope="col">모델</th>
                <th scope="col">학습일</th>
                <th scope="col">시험 정확도</th>
                <th scope="col">log loss</th>
                <th scope="col">기준 대비</th>
                <th scope="col">학습 가구</th>
                <th scope="col">상태</th>
                <th scope="col">비율</th>
                <th scope="col">최근 7일 요청</th>
                <th scope="col">저장된 진단</th>
              </tr>
            </thead>
            <tbody>
              {models.map((row) => {
                const selected = row.runId != null && row.runId === selectedRunId;
                return (
                  <tr key={row.runId ?? row.runName} className={selected ? 'is-selected' : undefined}>
                    <th scope="row">
                      {row.runId ? (
                        <button type="button" className="model-comparison-name" aria-pressed={selected} onClick={() => onSelect(row.runId)}>
                          {row.runName}
                        </button>
                      ) : <strong className="model-comparison-name">{row.runName}</strong>}
                      <small>{row.family ?? '학습 결과 폴더 없음'} · {row.schema ?? '-'}</small>
                    </th>
                    <td>{row.trainedAt ? formatLogTime(row.trainedAt) : '-'}</td>
                    <td><strong>{percent(row.testAccuracy)}</strong>{row.metricKind && <small>{row.metricKind}</small>}</td>
                    <td>{row.testLogLoss == null ? '-' : row.testLogLoss.toFixed(4)}</td>
                    <td>{baselineGap(row)}{row.baselineLabel && <small>{row.baselineLabel} {percent(row.baselineAccuracy)}</small>}</td>
                    <td>{count(row.profiles)}</td>
                    <td>
                      <span className="model-comparison-badges">
                        <span className={`admin-status ${row.servable ? 'is-ok' : 'is-neutral'}`}>{row.servable ? '서빙 중' : '꺼짐'}</span>
                        {!row.compatible && <span className="admin-status is-check">입력 구조 다름</span>}
                      </span>
                    </td>
                    <td><strong>{row.weightPercent}%</strong></td>
                    <td>{count(row.requests7Days)}건</td>
                    <td>{count(row.diagnoses)}건</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="admin-result-count">
        정확도는 가상 가구 데이터로 만든 정답과의 일치도이며 실제 사용자 만족도는 아닙니다. 평가 방식이 다른 모델끼리는 그대로 비교하지 마세요.
      </p>
    </section>
  );
}
