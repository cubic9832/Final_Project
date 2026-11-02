import client from '../../shared/api/client.js';

export async function getRecommendationOptions(signal) {
  const response = await client.get('/recommendation-options', { baseURL: '/api/v2', signal });
  if (!response.data?.success || typeof response.data.data?.scenarioSupported !== 'boolean') {
    throw new Error('추천 입력 항목 응답 형식이 올바르지 않습니다.');
  }
  return response.data.data;
}

export async function getFinancialRecommendations(request, signal) {
  const response = await client.post('/recommendations', { ...request, k: 9 }, { baseURL: '/api/v2', signal });
  return response.data.data;
}
