import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ScrollText, Cpu, Database, Mail, Server, UserRoundPen, Car, MessagesSquare } from 'lucide-react';
import theme from '../../styles/theme';
import { describeLog, formatLogTime, logActor, logTarget } from './adminLogFormat';
import { getAdminOverview, getAuditLogs, getMailStatus, getMemberSummary, getModelServerInfo, getSystemStatus } from '../../features/admin/adminApi';
import { getChatQueueSummary } from '../../features/chat/chatApi.js';
import { listAdminVehicles } from './vehicles/adminVehicleApi';
import './AdminOverviewPanel.css';
import './AdminMembersPanel.css'; // 7일 막대(admin-member-trend) 같이 씀

// 7단계 운영 현황 — 화면의 모든 값은 실제 데이터 (10-27: 남아 있던 고정 값도 모두 바꿈)
// 회원 · 진단 · 할 일 = 관리자 API(DB), 차량 = 차량 관리 API(managed_vehicles, 차량 관리 탭과 같은 기준), 추천 후보 · 모델 = 추천 서버(FastAPI) 정보
// 각 값은 따로 불러온다: 불러오는 중 undefined, 실패하면 null → 화면에는 "…" / "-"

// 불러오기 하나를 { key: 결과 } 로 모아 두는 작은 도우미 (화면을 떠나면 응답을 버린다)
function useLoads(loaders) {
  const [data, setData] = useState({});
  useEffect(() => {
    const controller = new AbortController();
    for (const [key, load] of Object.entries(loaders)) {
      load(controller.signal)
        .then((value) => !controller.signal.aborted && setData((prev) => ({ ...prev, [key]: value })))
        .catch(() => !controller.signal.aborted && setData((prev) => ({ ...prev, [key]: null })));
    }
    return () => controller.abort();
  }, [loaders]);
  return data;
}

// 컴포넌트 밖에 두어 매번 새로 만들어지지 않게 (useEffect 가 한 번만 돈다)
const LOADERS = {
  members: getMemberSummary,
  waitingChats: getChatQueueSummary,
  vehicles: (signal) => listAdminVehicles(signal).then((list) => list.filter((vehicle) => vehicle.status !== '삭제됨')),
  overview: getAdminOverview,
  system: getSystemStatus,
  mail: getMailStatus,
  model: getModelServerInfo,
  logs: (signal) => getAuditLogs({ size: 3 }, signal).then((result) => result.logs),
};

// 값 표시: 불러오는 중 "…", 실패 "-"
const show = (value, format) => (value === undefined ? '…' : value === null ? '-' : format(value));
const formatManwon = (won) => `${Math.round(won / 10000).toLocaleString('ko-KR')}만 원`;

const serviceIcons = { api: Server, database: Database, model: Cpu, mail: Mail };
const STATUS_VIEW = {
  checking: { label: '확인 중', className: 'is-neutral' },
  up: { label: '정상', className: 'is-ok' },
  down: { label: '연결 안 됨', className: 'is-check' },
  failed: { label: '실패 있음', className: 'is-check' },
  dev: { label: '개발 모드', className: 'is-neutral' },
};

// 보완 13: 메일 발송 줄 — 최근 24시간 실패가 있으면 "실패 있음" + 마지막 실패 시각 · 사유, 메일 계정이 없으면 "개발 모드"
function mailRow(mail) {
  if (mail === undefined) return { status: 'checking', detail: '확인 중…' };
  if (mail === null) return { status: 'down', detail: '메일 발송 기록을 불러오지 못했습니다.' };
  const counts = `최근 24시간 보냄 ${mail.sent}건 · 실패 ${mail.failed}건`;
  if (mail.failed > 0) return { status: 'failed', detail: `${counts} · 마지막 실패 ${formatLogTime(mail.lastFailedAt)} (${mail.lastFailedReason})` };
  if (!mail.mailEnabled) return { status: 'dev', detail: `${counts} · 메일 계정이 없어 서버 로그로 대신합니다.` };
  return { status: 'up', detail: `인증 메일 · ${counts}` };
}

// 서비스 연결 상태 4줄. Spring · MySQL · 메일은 관리자 API, 추천 서버는 화면이 직접 불러 본다
function serviceRows({ system, model, mail }) {
  const apiRow = system === undefined ? { status: 'checking', detail: '확인 중…' }
    : system ? { status: 'up', detail: `회원·차량 서비스 · ${formatLogTime(system.apiStartedAt)} 부터 실행 중` }
      : { status: 'down', detail: '서버가 응답하지 않습니다.' };
  const dbRow = system === undefined ? { status: 'checking', detail: '확인 중…' }
    : system?.databaseUp ? { status: 'up', detail: `${system.databaseVersion ? `최종 적용 버전 V${system.databaseVersion}` : '적용 기록 없음'} · 응답 ${system.databaseMillis}ms` }
      // 관리자 API 자체가 실패하면 권한 확인에 쓰는 DB 도 확인할 수 없다
      : { status: 'down', detail: system ? 'DB 에 연결할 수 없습니다.' : '서버를 거쳐 확인하므로 지금은 확인할 수 없습니다.' };
  const modelRow = model === undefined ? { status: 'checking', detail: '확인 중…' }
    : model ? { status: 'up', detail: `차량 추천 추론 · ${model.info.modelBundle ?? model.info.modelVersion} · 응답 ${model.ms}ms` }
      : { status: 'down', detail: '추천 서버가 켜져 있지 않거나 3초 안에 응답하지 않습니다.' };
  return [
    { id: 'api', name: 'Spring API', ...apiRow },
    { id: 'database', name: 'DB 변경 이력', ...dbRow },
    { id: 'model', name: '추천 서버', ...modelRow },
    { id: 'mail', name: '메일 발송', ...mailRow(mail) },
  ];
}

const SCREEN_BY_TAB = { overview: 'OVERVIEW', vehicles: 'VEHICLES', recommendations: 'RECOMMENDATIONS', members: 'MEMBERS', models: 'MODELS', logs: 'LOGS', chat: 'CHAT' };
const ALL_SCREENS = Object.values(SCREEN_BY_TAB);
const LOADER_SCREENS = { members: 'MEMBERS', vehicles: 'VEHICLES', logs: 'LOGS', waitingChats: 'CHAT' };
export default function AdminOverviewPanel({ allowedScreens = ALL_SCREENS }) {
  const can = code => allowedScreens.includes(code);
  const loaders = useMemo(() => Object.fromEntries(Object.entries(LOADERS).filter(([key]) => !LOADER_SCREENS[key] || allowedScreens.includes(LOADER_SCREENS[key]))), [allowedScreens]);
  const data = useLoads(loaders);
  const { members, vehicles, overview, model, mail, logs, waitingChats } = data;

  const cards = [
    { label: '차량 데이터', value: show(vehicles, (list) => `${list.length}건`), note: '차량·트림 정보 관리', tab: 'vehicles' },
    { label: '추천 후보 차량', value: show(model, (m) => `${m.info.catalogCount}건`), note: model ? `차종 ${model.info.modelNames}개 · 추천 서버 기준` : '추천 서버 기준', tab: 'recommendations' },
    { label: '회원 현황', value: show(members, (s) => `${s.total}명`), note: members ? `최근 7일 가입 ${members.newLast7Days}명` : '가입·상태·권한 확인', tab: 'members' },
    { label: '적용 모델', value: show(model, (m) => m.info.modelBundle ?? m.info.modelVersion), note: model ? `학습 구조 ${model.info.rankerSchema}` : '차량 추천 모델', tab: 'models' },
  ];

  const visibleCards = cards.filter(card => can(SCREEN_BY_TAB[card.tab]));

  // 점검 항목은 직접 처리 가능한 조치와 외부 확인이 필요한 상태를 구분한다.
  const tasks = [
    { title: '검수 대기 차량', count: vehicles?.filter(vehicle => vehicle.status === '검수 대기').length, unit: '건', action: '차량 정보 검수 필요', note: '차량 제원과 가격을 확인하고 검수를 마친 차량만 공개해 주세요.', tab: 'vehicles', to: '/console?tab=vehicles&status=REVIEW', icon: Car },
    { title: '미처리 상담', count: waitingChats?.waiting, unit: '건', action: '대기 상담 배정 필요', note: '상담원이 아직 맡지 않은 대기 상담입니다. 1:1 상담에서 맡기를 선택해 주세요.', tab: 'chat', icon: MessagesSquare },
    { title: '생년월일 · 성별 미입력 회원', count: overview?.profileMissing, action: '회원 입력 필요', note: '미입력 정보는 회원이 내 계정에서 직접 입력할 수 있습니다.', tab: 'members', icon: UserRoundPen },
    { title: '추천 서버 연결', count: model === null ? 1 : 0, unit: '', action: '서버 점검 필요', note: '연결 실패나 응답 지연일 수 있습니다. 모델 관리에서 상태를 확인하세요.', tab: 'models', icon: Cpu },
    { title: '인증 메일 발송 실패 (24시간)', count: mail?.failed, unit: '건', action: '발송 설정 점검 필요', note: '서비스 상태에서 실패 사유를 확인하세요. 해결 후에도 최근 24시간 실패 기록은 집계됩니다.', tab: 'overview', icon: Mail },
  ];
  const visibleTasks = tasks.filter(task => can(SCREEN_BY_TAB[task.tab]) && task.count > 0);
  const todo = visibleTasks.length;

  const stats = overview?.diagnoses;
  const maxDaily = Math.max(1, ...(stats?.daily ?? []).map((day) => day.count));
  const services = serviceRows(data);
  const maxDailyJoins = Math.max(1, ...(members?.daily ?? []).map(day => day.count));

  return <div className="admin-panel-stack">
    {visibleCards.length > 0 && <section className="admin-summary admin-overview-summary" aria-label="운영 요약">{visibleCards.map(card => <Link className="admin-stat" to={`/console?tab=${card.tab}`} key={card.label}><span>{card.label}</span><strong>{card.value}</strong><small>{card.note}</small></Link>)}</section>}
    {can('CHAT') && waitingChats === null && <p className="admin-empty" role="alert">대기 상담 현황을 조회하지 못했습니다. <Link className="admin-text-button" to="/console?tab=chat">1:1 상담에서 확인</Link></p>}
    <div className="admin-grid-2 admin-overview-services">
      {todo > 0 && <section className="admin-card"><div className="admin-card-heading"><div><h3>운영 점검 사항</h3><p>확인이 필요한 상태와 항목별 조치를 안내합니다.</p></div><span className="admin-count-badge">{`확인 필요 ${todo}개`}</span></div>
        <div className="admin-task-list">{visibleTasks.map(({ title, count, unit = '명', action, note, tab, to, icon: Icon }) => {
          const TaskLink = tab === 'overview' ? 'a' : Link;
          const destination = tab === 'overview' ? { href: '#admin-mail-status' } : { to: to || `/console?tab=${tab}` };
          return <TaskLink key={title} {...destination} className="admin-task"><span className="admin-icon-box"><Icon size={theme.iconSize.md} aria-hidden="true" /></span><div><strong>{title}{unit && ` · ${count}${unit}`}</strong><span className="admin-overview-task-action">{action}</span><p>{note}</p></div><ArrowRight size={theme.iconSize.sm} aria-hidden="true" /></TaskLink>;
        })}</div>
      </section>}
      <section className="admin-card"><div className="admin-card-heading"><div><h3>서비스 연결 상태</h3><p>화면을 열 때 서버 · DB · 추천 서버가 응답하는지, 인증 메일이 나가는지 확인합니다.</p></div></div>
        <div className="admin-service-list" aria-live="polite">{services.map(service => { const Icon = serviceIcons[service.id]; const view = STATUS_VIEW[service.status]; return <div className="admin-service-row" key={service.id} id={service.id === 'mail' ? 'admin-mail-status' : undefined} tabIndex={service.id === 'mail' ? -1 : undefined}><Icon size={theme.iconSize.md} aria-hidden="true" /><div><strong>{service.name}</strong><p>{service.detail}</p></div><span className={`admin-status ${view.className}`}>{view.label}</span></div>; })}</div>
      </section>
    </div>
    {can('MEMBERS') && <section className="admin-card" aria-label="최근 7일 회원 가입 추이">
      <div className="admin-card-heading"><div><h3>가입 추이</h3><p>최근 7일 날짜별 가입 수</p></div>{members && <span className="admin-count-badge">최근 7일 {members.newLast7Days.toLocaleString()}명</span>}</div>
      {members === undefined && <p className="admin-empty" role="status">가입 추이를 불러오는 중…</p>}
      {members === null && <p className="admin-empty" role="alert">가입 추이를 불러오지 못했습니다.</p>}
      {members && <ol className="admin-member-trend" aria-label="최근 7일 날짜별 가입 수">{members.daily.map(day => <li key={day.date}>
        <span className="admin-member-trend-count">{day.count}</span>
        <span className="admin-member-trend-bar" style={{ height: `${(day.count / maxDailyJoins) * 100}%` }} />
        <span className="admin-member-trend-date">{day.date.slice(5).replace('-', '.')}</span>
      </li>)}</ol>}
    </section>}
    {/* 재무 진단 이용 현황 — 회원이 재무 진단 결과 화면에서 저장한 기록 (탈퇴 회원 제외) */}
    <section className="admin-card"><div className="admin-card-heading"><div><h3>재무 진단 이용 현황</h3><p>회원이 재무 진단을 마칠 때 저장되는 기록입니다.</p></div></div>
      {overview === null && <p className="admin-empty" role="alert">재무 진단 현황을 불러오지 못했습니다.</p>}
      {stats && <div className="admin-grid-2">
        <dl className="admin-detail-list">
          <div><dt>전체 진단</dt><dd>{stats.total}건</dd></div>
          <div><dt>최근 7일</dt><dd>{stats.last7Days}건</dd></div>
          <div><dt>진단한 회원</dt><dd>{stats.members}명</dd></div>
          <div><dt>평균 구매 전 월 여유금</dt><dd>{stats.avgMonthlyAvailable == null ? '기록 없음' : formatManwon(stats.avgMonthlyAvailable)}</dd></div>
        </dl>
        <ol className="admin-member-trend" aria-label="최근 7일 날짜별 진단 수">{stats.daily.map(day => <li key={day.date}><span className="admin-member-trend-count">{day.count}</span><span className="admin-member-trend-bar" style={{ height: `${(day.count / maxDaily) * 100}%` }} /><span className="admin-member-trend-date">{day.date.slice(5).replace('-', '.')}</span></li>)}</ol>
      </div>}
    </section>
    {can('LOGS') && <section className="admin-card"><div className="admin-card-heading"><div><h3>최근 운영 이력</h3><p>최근 관리자 작업 내역을 확인합니다.</p></div><Link className="admin-text-button" to="/console?tab=logs">전체 이력 보기<ArrowRight size={theme.iconSize.sm} aria-hidden="true" /></Link></div><div className="admin-activity-list">{logs === undefined && <p className="admin-empty" role="status">불러오는 중…</p>}{logs === null && <p className="admin-empty" role="alert">운영 이력을 불러오지 못했습니다. <Link to="/console?tab=logs">이력 화면에서 다시 조회</Link></p>}{logs?.length === 0 && <p className="admin-empty">아직 기록된 관리자 작업이 없습니다.</p>}{logs?.map(log => <div className="admin-activity" key={log.id}><ScrollText size={theme.iconSize.sm} aria-hidden="true" /><div><strong>{logTarget(log)} · {describeLog(log)}</strong><span>{logActor(log)}</span></div><time>{formatLogTime(log.createdAt)}</time></div>)}</div></section>}
  </div>;
}
