import client from '../../shared/api/client.js';

const endpoint = '/members/me/recommendation-inputs';

function savedInputs(response) {
  if (!response.data?.success || !Object.hasOwn(response.data, 'data')) {
    throw new Error('저장한 입력 응답 형식이 올바르지 않습니다.');
  }
  const saved = response.data.data;
  if (saved !== null && (saved.schemaVersion !== 1 || !Number.isSafeInteger(saved.version) || saved.version < 1)) {
    throw new Error('지원하지 않는 저장 형식입니다.');
  }
  return saved;
}

export async function getSavedRecommendationInputs(signal) {
  return savedInputs(await client.get(endpoint, { signal }));
}

export async function patchRecommendationInputs(request, signal) {
  const saved = savedInputs(await client.patch(endpoint, request, { signal }));
  if (!saved) throw new Error('저장 결과가 없습니다.');
  return saved;
}
