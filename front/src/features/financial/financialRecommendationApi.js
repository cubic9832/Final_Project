import client from '../../shared/api/client.js';
import { getVisitorId } from './visitorId.js';

// 추천은 Spring(/api/v1/recommendation)을 거친다 → 관리자가 정한 비율대로 여러 추천 서버(모델) 중 하나가 답한다.
// 같은 사용자는 같은 모델: 로그인했으면 회원 번호, 아니면 X-Visitor-Id 로 서버가 정한다
const visitorHeaders = () => ({ 'X-Visitor-Id': getVisitorId() });

export async function getRecommendationOptions(signal) {
  const response = await client.get('/recommendation/options', { headers: visitorHeaders(), signal });
  if (!response.data?.success || typeof response.data.data?.scenarioSupported !== 'boolean') {
    throw new Error('추천 입력 항목 응답 형식이 올바르지 않습니다.');
  }
  return response.data.data;
}

export async function getFinancialRecommendations(request, signal) {
  const response = await client.post('/recommendation/recommendations', { ...request, k: 9 }, { headers: visitorHeaders(), signal });
  return response.data.data;
}
