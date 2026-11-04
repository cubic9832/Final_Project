import { Fragment, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Car, ExternalLink, Search } from 'lucide-react';
import theme from '../../styles/theme';
import Pagination from '../../components/Pagination.jsx';
import { getRecommendationCandidates } from '../../features/admin/adminApi';
import { candidateModelImages } from '../../features/vehicle/candidateModelImages';
import { formatVehiclePrice } from './formatVehiclePrice.js';
import { candidateCounts, filterCandidates, fuelLabels, needsSeatCheck, qualityLabels, seatCheckLabel, seatStatusLabels, sortCandidates } from './recommendations/recommendationBoardData.js';
import './AdminRecommendationsPanel.css';

const PAGE_SIZE = 10;
const columns = [['number', '번호'], ['vehicle', '차량·트림'], ['year', '연식'], ['fuel', '연료'], ['price', '판매 가격'], ['status', '정원 확인'], ['checkedOn', '확인일']];
const priceLabel = won => formatVehiclePrice(won == null ? null : Number(won) / 10000);
const sourceLink = url => /^https?:\/\//i.test(url || '') ? url : null;

export default function AdminRecommendationsPanel() {
  const [state, setState] = useState({ status: 'loading', data: [], error: '' });
  const [reload, setReload] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState({ keyword: '', page: 0 });
  const [sort, setSort] = useState({ column: '', direction: 'ASC' });
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    getRecommendationCandidates(controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ status: 'done', error: '', data: data.map((car, index) => ({ ...car, listNumber: data.length - index, image: candidateModelImages[`${car.brand}::${car.model}`] ?? null })) });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ status: 'error', data: [], error: '추천 후보 차량을 불러오지 못했습니다.' });
    });
    return () => controller.abort();
  }, [reload]);

  const filtered = useMemo(() => filterCandidates(state.data, query.keyword), [state.data, query.keyword]);
  const sorted = useMemo(() => sortCandidates(filtered, sort), [filtered, sort]);
  const counts = candidateCounts(filtered);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(query.page, totalPages - 1);
  const rows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  function sortBy(column) {
    setSort(current => ({ column: current.column === column && current.direction === 'DESC' ? '' : column, direction: current.column === column && current.direction === 'ASC' ? 'DESC' : 'ASC' }));
    setQuery(current => ({ ...current, page: 0 })); setExpandedId(null);
  }

  return <section className="admin-card recommendation-board-panel">
    <div className="recommendation-board-heading"><h3>추천 후보 목록</h3>
      <form className="recommendation-board-search" onSubmit={event => { event.preventDefault(); setQuery({ keyword: keyword.trim(), page: 0 }); setExpandedId(null); }}>
        <div className="admin-search-field form-focus-group"><input type="search" maxLength={100} aria-label="브랜드, 차량명, 연료 또는 확인 상태 검색" placeholder="브랜드·차량명·연료·확인 상태 검색" value={keyword} onChange={event => setKeyword(event.target.value)} /><button type="submit" aria-label="추천 후보 검색"><Search size={theme.iconSize.md} aria-hidden="true" /></button></div>
      </form>
    </div>
    {state.status === 'loading' && <p className="admin-empty" role="status">추천 후보 차량을 불러오는 중…</p>}
    {state.status === 'error' && <p className="admin-empty" role="alert">{state.error} <button type="button" className="admin-text-button" onClick={() => { setState({ status: 'loading', data: [], error: '' }); setReload(value => value + 1); }}>다시 시도</button></p>}
    {state.status === 'done' && <>
      <p className="recommendation-board-counts" role="status"><span>차종 {counts.models.toLocaleString()}개</span><span>이미지 없는 차종 {counts.noImage.toLocaleString()}개</span><span>정원 확인 필요 {counts.seatCheck.toLocaleString()}건</span></p>
      <div className="recommendation-board-wrap"><table className="recommendation-board">
        <caption className="admin-sr-only">추천 후보 목록과 승차 정원 확인 상태</caption>
        <colgroup>{[7, 26, 9, 10, 13, 15, 13, 7].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
        <thead><tr>{columns.map(([column, label]) => {
          const active = sort.column === column;
          const Icon = sort.direction === 'ASC' ? ArrowUp : ArrowDown;
          const next = active ? sort.direction === 'ASC' ? '내림차순 정렬' : '정렬 해제' : '오름차순 정렬';
          return <th scope="col" key={column} aria-sort={active ? sort.direction === 'ASC' ? 'ascending' : 'descending' : 'none'}><button type="button" className="recommendation-board-sort" aria-label={`${label} ${next}`} onClick={() => sortBy(column)}>{label}<span aria-hidden="true">{active && <Icon size={theme.iconSize.sm} />}</span></button></th>;
        })}<th scope="col">상세</th></tr></thead>
        <tbody>{rows.length === 0 ? <tr><td colSpan={8} className="recommendation-board-empty">조건에 맞는 추천 후보가 없습니다.</td></tr> : rows.map(car => {
          const open = expandedId === car.id;
          const name = [car.brand, car.model, car.trim].filter(Boolean).join(' ');
          const toggle = () => setExpandedId(open ? null : car.id);
          const detailId = `recommendation-detail-${car.id}`;
          return <Fragment key={car.id}><tr className={open ? 'recommendation-board-selected' : ''}>
            <td>{car.listNumber}</td><td><button className="recommendation-board-subject" type="button" aria-expanded={open} aria-controls={detailId} onClick={toggle}>{car.brand} {car.model}<span>{car.trim || '트림 미입력'}</span></button></td>
            <td>{car.year || '미입력'}</td><td>{fuelLabels[car.fuel] ?? car.fuel ?? '미입력'}</td><td>{priceLabel(car.price)}</td>
            <td><span className={`admin-status ${needsSeatCheck(car) ? 'is-check' : 'is-ok'}`}>{seatCheckLabel(car)}</span></td><td>{car.checkedOn?.slice(0, 10) || '미입력'}</td>
            <td><button type="button" className="admin-text-button" aria-expanded={open} aria-controls={detailId} aria-label={`${name} 상세 ${open ? '접기' : '보기'}`} onClick={toggle}>{open ? '접기' : '보기'}</button></td>
          </tr>{open && <tr><td colSpan={8} className="recommendation-board-detail-cell"><RecommendationDetails key={car.id} car={car} detailId={detailId} /></td></tr>}</Fragment>;
        })}</tbody>
      </table></div>
      <Pagination ariaLabel="추천 후보 목록 페이지" page={page} totalPages={totalPages} onChange={next => { setQuery(current => ({ ...current, page: next })); setExpandedId(null); }} />
    </>}
  </section>;
}

function RecommendationDetails({ car, detailId }) {
  const [imageFailed, setImageFailed] = useState(false);
  const link = sourceLink(car.sourceUrl);
  const details = [
    ['판매 가격', priceLabel(car.price)], ['승차 정원', car.seatsLabel],
    ['연료', fuelLabels[car.fuel] ?? car.fuel], ['연비', car.efficiency == null ? null : `${car.efficiency} ${car.fuel === 'ELECTRIC' ? 'km/kWh' : 'km/L'}`],
    ['전장', car.lengthMm ? `${Number(car.lengthMm).toLocaleString('ko-KR')} mm` : null], ['확인일', car.checkedOn?.slice(0, 10)],
    ['수집 방식', qualityLabels[car.quality] ?? car.quality], ['정원 확인 근거', seatStatusLabels[car.seatsStatus] ?? car.seatsStatus],
  ];
  return <section className="recommendation-board-detail" id={detailId} aria-label={`${car.brand} ${car.model} 상세`}>
    <div className="recommendation-board-detail-main"><div>
      <div className="recommendation-board-image">{car.image && !imageFailed ? <img src={car.image.src} alt={car.image.alt || `${car.model} 대표 이미지`} loading="lazy" onError={() => setImageFailed(true)} /> : <div><Car size={theme.iconSize.lg} aria-hidden="true" /><p>{imageFailed ? '이미지를 불러오지 못했습니다.' : '등록된 대표 이미지가 없습니다.'}</p></div>}</div>
      <p className="recommendation-board-image-note">차종 대표 이미지로 색상·연식·트림은 다를 수 있습니다.</p>
    </div><div><h4>{car.brand} {car.model}</h4><p className="recommendation-board-trim">{car.trim}</p><dl className="recommendation-board-specs">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '미입력'}</dd></div>)}</dl></div></div>
    {car.seatsNote && <div className="recommendation-board-note"><h4>승차 정원 확인 메모</h4><p>{car.seatsNote}</p></div>}
    <div className="recommendation-board-source">{link ? <a className="admin-outline-button" href={link} target="_blank" rel="noreferrer">제조사 자료 확인<ExternalLink size={theme.iconSize.sm} aria-hidden="true" /></a> : <p>등록된 제조사 자료 링크가 없습니다.</p>}</div>
  </section>;
}
