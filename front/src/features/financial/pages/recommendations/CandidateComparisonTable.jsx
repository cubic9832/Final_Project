import { useVehicle } from '../../../vehicle/useVehicle.js';
import { Check } from 'lucide-react';
import VehicleArtwork from '../../../vehicle/components/VehicleArtwork.jsx';
import theme from '../../../../styles/theme.js';
import { candidateImage, candidateMoney } from './candidatePresentation.js';

export default function CandidateComparisonTable({ views, canToggleVehicles, selectedIds, onToggleVehicle }) {
  const { comparison, toggleComparison } = useVehicle();
  const selected = (selectedIds ?? comparison).map(String);
  const toggleVehicle = onToggleVehicle ?? toggleComparison;
  const includedViews = canToggleVehicles ? views.filter(view => selected.includes(String(view.id))) : views;
  const lengths = includedViews.map(view => view.candidate.vehicle.length_mm)
    .filter(length => Number.isFinite(length) && length > 0);
  const longest = Math.max(...lengths);
  const hasDifferentLengths = lengths.some(length => length !== longest);
  const financialMetrics = [
    ['차량 가격', 'purchasePrice', view => view.candidate.cost.total_purchase_cost ?? view.candidate.vehicle.price, false],
    ['월 할부금', 'monthlyPayment', view => view.candidate.cost.monthly_payment ?? 0, false],
    ['예상 월 유지비', 'monthlyCost', view => view.candidate.cost.monthly_running_cost, false],
    ['구매 후 남는 목돈', 'cashRemaining', view => view.financial?.cashAfterPurchase, true],
    ['차량비 지출 후 월 잔여금', 'monthlyRemaining', view => view.candidate.cost.remaining_monthly, true],
  ];
  const rows = financialMetrics.map(([label, field, amount, higherIsBetter]) => {
    const amounts = includedViews.map(amount).filter(Number.isFinite);
    const best = higherIsBetter ? Math.max(...amounts) : Math.min(...amounts);
    const tied = amounts.every(value => value === best);
    return [label, view => {
      const value = amount(view);
      if (amounts.length < 2 || !Number.isFinite(value)) return view[field];
      const isBest = value === best;
      const color = tied ? undefined : isBest ? 'comparison-match' : 'comparison-difference';
      const direction = higherIsBetter ? '최고액' : '최저액';
      const difference = candidateMoney(Math.abs(value - best));
      return <><span className={color}>{view[field]}</span><small className={color}>
        {tied ? '같은 금액' : isBest ? direction : `${direction}보다 ${difference} ${higherIsBetter ? '적음' : '많음'}`}
      </small></>;
    }];
  });
  const specifications = [
    ['연료', 'fuel', 'fuel'],
    ['차체 형태', 'body', 'body'],
    ['차량 길이', 'length', 'space'],
    ['승차 정원', 'seats', 'seating'],
  ];
  const groups = [
    ['구매 및 유지 비용', rows],
    ['차량 제원', specifications.map(([label, field, preference]) => [label, view => {
      const match = view.matches.find(item => item.key === preference);
      const mismatch = view.mismatches.find(item => item.key === preference);
      const evidence = match ?? mismatch ?? view.unknowns.find(item => item.key === preference);
      let color = match ? 'comparison-match' : mismatch ? 'comparison-difference' : undefined;
      if (field === 'length') {
        const length = view.candidate.vehicle.length_mm;
        color = undefined;
        if (hasDifferentLengths && Number.isFinite(length) && length > 0) {
          color = length === longest ? 'comparison-match' : 'comparison-difference';
        }
      }
      const compareLength = field === 'length' && lengths.length >= 2
        && Number.isFinite(view.candidate.vehicle.length_mm) && view.candidate.vehicle.length_mm > 0;
      const note = field === 'length'
        ? compareLength && (color === 'comparison-match' ? '길이가 더 김' : color === 'comparison-difference' ? '길이가 더 짧음' : '비교 차량과 동일')
        : match ? '내 조건과 일치' : mismatch ? '내 조건과 불일치' : evidence && '일치 여부 확인 필요';
      return <><span className={color} title={evidence?.text}>{view[field]}</span>
        {note && <small className={color}>{note}</small>}
      </>;
    }])],
  ];

  return <>
    {includedViews.length ? <div className="candidate-comparison-table-wrap" tabIndex={0} role="region" aria-label="추천 후보 공통 지표 비교표">
    <table className="candidate-comparison-table"><caption className="sr-only">차량 비용 및 제원 비교</caption>
      <thead><tr><th scope="col">비교 항목</th>{includedViews.map(({ id, candidate: { vehicle } }) => {
        const name = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');
        return <th scope="col" key={id}>
          <div className="candidate-comparison-artwork"><VehicleArtwork vehicle={{ name, imageUrl: vehicle.imageUrl ?? candidateImage(vehicle)?.src }} /></div>
          <span className="candidate-comparison-model">{name}</span>
          <small>{vehicle.trim}</small>
        </th>;
      })}</tr></thead>
      {groups.map(([title, items]) => <tbody key={title}>
        <tr className="candidate-comparison-group"><th scope="rowgroup" colSpan={includedViews.length + 1}>{title}</th></tr>
        {items.map(([label, value]) => <tr key={label}><th scope="row">{label}</th>{includedViews.map(view => <td key={view.id}>{value(view)}</td>)}</tr>)}
      </tbody>)}
    </table>
    </div> : <p role="status">아래에서 차량을 선택하면 비교 정보가 표시됩니다.</p>}
    {canToggleVehicles && <div className="financial-recommendations-actions" role="group" aria-label="비교할 차량 선택">
      {views.map(({ id, candidate: { vehicle } }) => {
        const included = selected.includes(String(id));
        return <button key={id} type="button" className="candidate-comparison-remove" onClick={() => toggleVehicle(id)} disabled={!included && selected.length >= 3} aria-pressed={included}>
          <Check size={theme.iconSize.sm} aria-hidden="true" style={{ visibility: included ? 'visible' : 'hidden' }} />
          {vehicle.brand} {vehicle.model} {vehicle.trim}
        </button>;
      })}
    </div>}
  </>;
}
