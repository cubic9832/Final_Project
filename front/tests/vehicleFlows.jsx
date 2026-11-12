// Vite 개발 서버 전용 E2E fixture. 실제 저장소·인증·백엔드를 변경하지 않는다.
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import client from '../src/shared/api/client.js';
import useAuthStore from '../src/stores/useAuthStore.js';
import { scopeFinancialState } from '../src/features/financial/financialSession.js';
import { VehicleProvider } from '../src/features/vehicle/VehicleContext.jsx';
import { useVehicle } from '../src/features/vehicle/useVehicle.js';
import VehicleComparePage from '../src/features/vehicle/pages/compare/VehicleComparePage.jsx';
import VehicleSimulationPage from '../src/features/vehicle/pages/simulation/VehicleSimulationPage.jsx';
import FinancialRecommendationsPage from '../src/features/financial/pages/recommendations/FinancialRecommendationsPage.jsx';

function storage() {
  const values = new Map();
  return { get length() { return values.size; }, key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(String(key)) ?? null, setItem: (key, value) => values.set(String(key), String(value)),
    removeItem: key => values.delete(String(key)), clear: () => values.clear() };
}
Object.defineProperty(window, 'localStorage', { configurable: true, value: storage() });
Object.defineProperty(window, 'sessionStorage', { configurable: true, value: storage() });
useAuthStore.setState({ member: null, accessToken: null, initialized: true });
const cars = ['검증가', '검증나', '검증다', '일반차'].map((name, index) => ({
  id: `verification-${index}`, brand: '검증', name, trimName: '기본', modelYear: '2026', classCode: 'SUV',
  fuelCode: 'GASOLINE', efficiencyValue: 12, conditionCode: 'NEW', price: (index === 3 ? 3800 : 2300 + index * 200) * 10000,
  sourceName: '검증 전용', sourceUrl: '', imageUrl: '/images/recommendations/cutouts/avante.webp',
}));
const planning = cars.map(car => ({ id: car.id, brand: car.brand, model: car.name, price: car.price, fuel: 'GASOLINE', body_type: 'SUV', seats: 5, length_mm: 4500, efficiency: 12 }));
const diagnosis = { values: { income: '300', monthlyExpenses: '100' }, assets: { deposit: '3000' }, loans: [], vehicle: { annualDistance: '15,000km' } };
const result = { modelVersion: 'candidate-v2', recommendations: planning.slice(0, 3).map((vehicle, index) => ({
  vehicle: { ...vehicle, imageUrl: cars[index].imageUrl }, cost: { total_purchase_cost: vehicle.price,
    monthly_payment: 0, monthly_total: 362000, monthly_running_cost: 362000, remaining_monthly: 1638000,
    financing_months: 0, financing_annual_rate: 0 },
  decisionEvidence: { preferences: [], financial: { cashAfterPurchase: Math.max(0, 30000000 - vehicle.price) } },
})) };
client.defaults.adapter = async config => {
  const data = config.url === '/vehicles' ? cars : config.url === '/vehicles/recommendation-catalog' ? planning : null;
  if (data === null) throw new Error(`검증 fixture가 허용하지 않는 API: ${config.url}`);
  return { config, status: 200, statusText: 'OK', headers: {}, data: { success: true, data } };
};

export function Controls() {
  const navigate = useNavigate();
  const { comparison, comparisonMode, favorites, toggleFavorite, toggleComparison, toggleFinancialComparison, financialComparison } = useVehicle();
  const memberId = useAuthStore(state => state.member?.id ?? null);
  function owner(id) { useAuthStore.setState({ member: id == null ? null : { id, nickName: `검증 ${id}`, role: 'USER' }, accessToken: null }); }
  return <aside aria-label="회귀 검증 도구">
    <p>검증 전용 데이터입니다. 실제 API와 저장소는 사용하지 않습니다.</p>
    <button onClick={() => navigate('/financial/recommendations', { state: scopeFinancialState({ diagnosis, result }) })}>추천 화면 열기</button>
    <button onClick={() => navigate('/vehicles/compare')}>공통 비교 열기</button>
    <button onClick={() => toggleComparison('verification-3')}>일반 차량 추가</button>
    <button onClick={() => toggleFinancialComparison('verification-0', result, diagnosis)}>추천 비교로 선택</button>
    <button onClick={() => owner(null)}>비회원 전환</button><button onClick={() => owner('verification-A')}>A회원 전환</button><button onClick={() => owner('verification-B')}>B회원 전환</button>
    <button onClick={() => toggleFavorite('verification-0')}>관심 차량 토글</button>
    <button onClick={() => window.dispatchEvent(new StorageEvent('storage', { key: null }))}>저장소 다시 읽기</button>
    <output aria-label="현재 소유자">{memberId ?? 'guest'}</output>
    <output aria-label="현재 관심 차량">{JSON.stringify(favorites)}</output>
    <output aria-label="현재 비교 상태">{JSON.stringify({ mode: comparisonMode, ids: comparison, recommendationIds: financialComparison?.ids ?? [] })}</output>
  </aside>;
}
createRoot(document.getElementById('root')).render(<MemoryRouter><VehicleProvider><Controls /><Routes>
  <Route path="/financial/recommendations" element={<FinancialRecommendationsPage />} />
  <Route path="/vehicles/compare" element={<VehicleComparePage />} />
  <Route path="/vehicles/:id/simulation" element={<VehicleSimulationPage />} />
  <Route path="*" element={<p>상단 도구에서 검증할 화면을 열어 주세요.</p>} />
</Routes></VehicleProvider></MemoryRouter>);
