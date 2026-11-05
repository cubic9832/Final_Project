import client from '../../shared/api/client';

// 7단계: 관리자 API — /api/v1/admin/** 는 서버가 ADMIN 에게만 준다 (일반 회원 403, 비회원 401)

// 회원 목록 한 페이지 (최근 가입 순). keyword: 닉네임 · 이메일 일부, role: USER · ADMIN (비우면 전체)
// → { members: [...], meta: { page, size, total, totalPages } }
export const getAdminMembers = async ({ keyword, role, page, size = 10 }, signal) => {
  const res = await client.get('/admin/members', {
    params: { keyword: keyword || undefined, role: role || undefined, page, size },
    signal,
  });
  return { members: res.data.data, meta: res.data.meta };
};

// 기존 API의 최대 50명 제한을 지켜 검색 결과 전체를 모은다.
// 전체 조회에 성공했을 때만 반환하여 일부 페이지만 정렬되는 것을 방지한다.
export const getAllAdminMembers = async ({ keyword, role }, signal) => {
  const size = 50;
  const first = await getAdminMembers({ keyword, role, page: 1, size }, signal);
  const members = [...first.members];
  for (let page = 2; page <= first.meta.totalPages; page += 1) {
    signal?.throwIfAborted();
    const next = await getAdminMembers({ keyword, role, page, size }, signal);
    members.push(...next.members);
  }
  return members.map((member, index) => ({ ...member, listNumber: members.length - index }));
};

// 총관리자만: 회원 권한 바꾸기 (ADMIN = 관리자로 지정, USER = 관리자 해제). 바뀐 회원은 다시 로그인해야 적용된다
export const changeMemberRole = async (id, role) => {
  await client.patch(`/admin/members/${id}/role`, { role });
};

// 관리자 · 총관리자: 회원의 로그인 5번 실패 잠금 풀기 (운영 로그에 남는다)
export const unlockMemberLogin = async (id) => {
  await client.post(`/admin/members/${id}/unlock`);
};

// 9단계 총관리자: 계정 정지 (days 0 = 영구, reason 은 운영 로그에만) · 정지 풀기
export const suspendMember = async (id, days, reason) => {
  await client.post(`/admin/members/${id}/suspend`, { days, reason });
};

export const unsuspendMember = async (id) => {
  await client.post(`/admin/members/${id}/unsuspend`);
};

// 회원 현황 → { total, admins, newLast7Days, google, daily: [{ date, count }], ageBands, genders }
export const getMemberSummary = async (signal) => {
  const res = await client.get('/admin/members/summary', { signal });
  return res.data.data;
};

// 운영 로그 (관리자 작업 기록, 최근 순) → { logs: [...], meta }. action: ROLE_CHANGE (비우면 전체)
export const getAuditLogs = async ({ action, page = 1, size = 20, sort = '', direction = 'ASC' } = {}, signal) => {
  const res = await client.get('/admin/audit-logs', { params: { action: action || undefined, page, size, sort, direction }, signal });
  return { logs: res.data.data, meta: res.data.meta };
};

// 서비스 연결 상태 → { apiStartedAt, databaseUp, databaseMillis, databaseVersion }
export const getSystemStatus = async (signal) => {
  const res = await client.get('/admin/system-status', { signal });
  return res.data.data;
};

// 보완 13: 메일 발송 최근 24시간 → { mailEnabled, sent, failed, lastFailedAt, lastFailedReason }
export const getMailStatus = async (signal) => {
  const res = await client.get('/admin/system-status/mail', { signal });
  return res.data.data;
};

// 추천 서버(FastAPI) 상태 · 정보: 화면이 추천을 받을 때와 같은 길(Vite proxy /api/v2)로 선택지 정보를 불러 본다
// → { ms: 응답 시간, info: { modelVersion, modelBundle(학습 결과 폴더 이름), catalogCount, modelNames, rankerSchema, ... } }. 3초 안에 응답이 없거나 실패하면 오류
export const getModelServerInfo = async (signal) => {
  const start = performance.now();
  const res = await client.get('/recommendation-options', { baseURL: '/api/v2', timeout: 3000, signal });
  return { ms: Math.round(performance.now() - start), info: res.data.data };
};

// 운영 현황: 먼저 확인할 작업(개인정보 미입력 · 로그인 잠금 회원 수) · 재무 진단 이용 현황
// → { profileMissing, lockedMembers, diagnoses: { total, last7Days, members, avgMonthlyAvailable, daily: [{ date, count }] } }
export const getAdminOverview = async (signal) => {
  const res = await client.get('/admin/overview', { signal });
  return res.data.data;
};

// 모델 관리: 학습 · 평가 결과(ml 학습 결과 파일) + 모델 버전 기록(DB)
// → { available, runName, schema, trainedAt, testPairAccuracy, metrics: [{ name, previous, current }], history, versions, ... }
// run: 비교 표의 "계열/폴더" (비우면 기본 폴더)
export const getModelReport = async (signal, run) => {
  const res = await client.get('/admin/model-report', { params: { run: run || undefined }, signal });
  return res.data.data;
};

// 모델 비교: 학습 결과 폴더 전체 + 추천 서버 상태 · 트래픽 비율 · 최근 7일 요청 수 · 저장된 진단 수
// → { models: [{ runId, runName, family, schema, trainedAt, testAccuracy, testLogLoss, baselineLabel, baselineAccuracy,
//                compatible, servable, weightPercent, requests7Days, diagnoses, ... }], upstreams: [...], trafficConfigured }
export const getModels = async (signal) => {
  const res = await client.get('/admin/models', { signal });
  return res.data.data;
};

// 총관리자만: 모델별 트래픽 비율 전체 바꾸기. allocations = [{ modelBundle, weightPercent }] (합 100)
export const updateModelTraffic = async (allocations) => {
  await client.put('/admin/model-traffic', { allocations });
};

// 추천 관리: 추천 서버가 쓰는 후보 차량 전체 (학습 결과 폴더의 catalog.json)
// → [{ id, brand, model, trim, year, price, fuel, efficiency, lengthMm, seatsLabel, seatsStatus, seatsNote, sourceUrl, checkedOn, quality }]
export const getRecommendationCandidates = async (signal) => {
  const res = await client.get('/admin/recommendation-candidates', { signal });
  return res.data.data;
};

// 총관리자만: 그 모델(runId = "계열/폴더")로 추천 서버 켜기 → { port, runName, state: 'STARTING' }
// 켜는 데 몇 초 걸린다 → 화면이 getModels 를 다시 불러 RUNNING · FAILED 를 확인한다
export const startModelServer = async (runId) => {
  const res = await client.post('/admin/model-servers', { runId });
  return res.data.data;
};

// 총관리자만: 관리자 화면에서 켠 추천 서버 끄기 (비율이 남아 있으면 409 MODEL_HAS_TRAFFIC)
export const stopModelServer = async (port) => {
  await client.delete(`/admin/model-servers/${port}`);
};
