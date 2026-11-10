// 약관 보기 팝업 (Figma에는 없음. 회원가입 약관 옆 "보기" 버튼용으로 추가)
// 11-05: 테스트용 문구 대신 지금 사이트(CreditCompass) 기능과 실제로 저장하는 데이터에 맞춰 다시 썼다
//   - 서비스 이용약관: 실제로 있는 기능 · 규칙만 (재무 진단 · 차량 추천 · 콤파 · 1:1 상담 · 계정 정지 · 탈퇴)
//   - 개인정보 수집 · 이용: 코드에서 실제로 저장하는 항목 · 쓰는 곳 · 탈퇴할 때 처리 (MemberServiceImpl.withdraw 기준)
//   - [선택] 약관(차량 추천 업데이트 수신)은 없앴다 — 필수 2개만
// 법률 검토를 거친 문구가 아니라서 맨 위에 안내를 남긴다
import Modal from '../../shared/ui/Modal.jsx';
import './TermsModal.css';

// 서비스 이용약관 — 조항 제목 + 내용 (내용 줄마다 한 문단)
const SERVICE_ARTICLES = [
  {
    title: '제1조 (목적)',
    lines: ['이 약관은 CreditCompass(이하 "서비스")가 제공하는 재무 진단 · 차량 추천 · 차량 비교 · 드림카 플래너 · AI 안내(콤파) · 1:1 상담 기능을 이용하는 조건과 절차, 회원과 서비스의 권리 · 의무를 정합니다.'],
  },
  {
    title: '제2조 (회원가입)',
    lines: [
      '만 18세 이상이면 이메일 인증 또는 구글 계정으로 가입할 수 있습니다. 차량 구매를 돕는 서비스라 운전면허를 딸 수 있는 나이부터 가입을 받습니다.',
      '가입할 때 입력한 정보가 사실과 다르면 서비스 이용이 제한될 수 있습니다.',
    ],
  },
  {
    title: '제3조 (계정 관리)',
    lines: [
      '아이디(이메일)와 비밀번호는 회원이 직접 관리합니다. 비밀번호는 암호화해 저장하며 서비스도 원래 비밀번호를 알 수 없습니다.',
      '모르는 기기에서 로그인된 기록이 보이면 개인정보 · 계정 관리에서 그 기기를 로그아웃하고 비밀번호를 바꿔 주세요.',
      '로그인을 여러 번 틀리면 잠시 로그인이 막히거나 자동 입력 방지 확인을 거쳐야 합니다.',
    ],
  },
  {
    title: '제4조 (서비스 내용)',
    lines: [
      '재무 진단: 회원이 입력한 소득 · 지출 · 대출 정보로 차량 구매에 쓸 수 있는 예산을 계산합니다.',
      '차량 추천 · 비교: 진단 결과와 취향 테스트를 바탕으로 차량을 추천하고, 차량 제원과 비용을 비교해 보여 줍니다.',
      '드림카 플래너: 목표 차량의 구매 계획과 저축 기록을 관리하고, 목표 달성 · 정기 저축 알림을 보냅니다.',
      '콤파(AI 안내): 서비스 이용 방법과 자동차 · 금융 용어를 AI 가 안내합니다.',
      '1:1 상담: 로그인한 회원이 상담원과 실시간으로 대화합니다.',
    ],
  },
  {
    title: '제5조 (진단 · 추천 결과의 성격)',
    lines: [
      '재무 진단 · 차량 추천 · 비용 계산은 회원이 입력한 값과 공개된 자료로 만든 참고 정보입니다. 실제 대출 승인, 금리, 보험료, 차량 가격을 보장하지 않습니다.',
      '차량 구매와 대출 같은 최종 결정은 회원이 판매처 · 금융회사의 실제 조건을 확인한 뒤 직접 내려야 합니다.',
      '콤파의 답변은 AI 가 만든 것이라 틀릴 수 있습니다. 원하는 답을 얻지 못하면 1:1 상담을 이용해 주세요.',
    ],
  },
  {
    title: '제6조 (1:1 상담 이용 규칙)',
    lines: [
      '욕설 · 비하 · 성적인 표현은 보낼 수 없습니다. 반복하면 상담원이 경고하고, 그래도 계속되면 일정 기간 또는 영구적으로 상담이 제한됩니다.',
      '상담원이 답한 뒤 회원의 응답이 오래 없으면 안내 후 상담이 자동으로 종료됩니다. 종료된 뒤에는 잠시 뒤 다시 상담을 시작할 수 있습니다.',
      '상담이 끝나면 만족도와 상담원 응대 신고를 남길 수 있습니다.',
    ],
  },
  {
    title: '제7조 (회원의 의무)',
    lines: ['다른 사람의 정보를 쓰거나, 서비스를 방해하거나, 자동화된 방법으로 대량 요청을 보내서는 안 됩니다. 콤파 질문은 하루 30회까지 할 수 있습니다.'],
  },
  {
    title: '제8조 (이용 정지)',
    lines: ['이 약관을 어기거나 다른 회원 · 상담원에게 피해를 주면 운영 관리자가 계정 이용을 일정 기간 정지할 수 있습니다. 정지 중에는 로그인 · 상담 · 탈퇴가 제한됩니다.'],
  },
  {
    title: '제9조 (탈퇴)',
    lines: ['회원은 개인정보 · 계정 관리에서 언제든 탈퇴할 수 있습니다. 탈퇴하면 같은 계정으로 되돌릴 수 없으며, 같은 이메일로 다시 가입하면 새 회원이 됩니다. 탈퇴할 때 남는 기록은 개인정보 수집 · 이용 동의의 "보유 기간" 에 적혀 있습니다.'],
  },
  {
    title: '제10조 (약관 변경)',
    lines: ['약관이 바뀌면 서비스 화면에 미리 알립니다. 바뀐 약관에 동의하지 않으면 탈퇴할 수 있습니다.'],
  },
];

// 코드에서 실제로 저장하는 항목 기준 (users · user_profiles · email_verifications · social_accounts · 진단 · 상담 · 콤파 · 로그인 기기)
const PRIVACY_ROWS = [
  { group: '필수 (이메일 가입)', items: '이메일, 비밀번호(암호화해 저장), 이름 또는 닉네임', purpose: '회원 식별, 로그인' },
  { group: '필수', items: '생년월일, 성별, 전화번호', purpose: '만 18세 이상 확인, 연령대별 차량 추천 · 통계, 서비스 관련 연락' },
  { group: '필수 (이메일 가입)', items: '이메일 인증 기록', purpose: '본인 이메일 확인' },
  { group: '구글로 가입 · 연결 시', items: '구글 계정 고유번호, 구글 이메일, 이름', purpose: '구글 로그인 연결' },
  { group: '입력할 때만', items: '운전 경력, 구매 예정 시기', purpose: '보험료 · 구매 계획 같은 비용 계산' },
  { group: '이용하면서 생기는 정보', items: '재무 진단 입력값(소득 · 지출 · 대출) · 결과, 취향 테스트 결과', purpose: '진단 결과 · 차량 추천, 마이페이지 기록' },
  { group: '이용하면서 생기는 정보', items: '콤파 질문 · 답변 · 평가, 1:1 상담 대화 · 만족도 · 신고', purpose: '답변 · 상담 제공, 품질 관리, 분쟁 확인' },
  { group: '이용하면서 생기는 정보', items: '로그인 기기(브라우저 · 운영체제) · 로그인 시각', purpose: '로그인 유지, 다른 기기 로그아웃' },
];

function ServiceBody() {
  return (
    <>
      <p className="terms-example">법률 검토 전 문구입니다. 실제 운영 전에 검토가 필요합니다.</p>
      {SERVICE_ARTICLES.map((article) => (
        <section key={article.title} className="terms-article">
          <h3>{article.title}</h3>
          {article.lines.map((line) => <p key={line}>{line}</p>)}
        </section>
      ))}
    </>
  );
}

function PrivacyBody() {
  return (
    <>
      <p className="terms-example">법률 검토 전 문구입니다. 실제 운영 전에 검토가 필요합니다.</p>
      <table className="terms-table">
        <thead>
          <tr>
            <th scope="col">구분</th>
            <th scope="col">수집 항목</th>
            <th scope="col">이용 목적</th>
          </tr>
        </thead>
        <tbody>
          {PRIVACY_ROWS.map((row) => (
            <tr key={row.items}>
              <td>{row.group}</td>
              <td>{row.items}</td>
              <td>{row.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="terms-article">
        <h3>외부 서비스에 맡기는 일</h3>
        <p>구글 로그인 · 자동 입력 방지 확인은 Google, 콤파 답변 생성은 외부 AI 서비스, 인증 메일 발송은 메일 서비스를 이용합니다. 콤파에 보내는 글은 주민등록번호 · 카드 · 계좌번호 · 전화번호 · 이메일을 가린 뒤 보냅니다.</p>
      </section>
      <section className="terms-article">
        <h3>보유 기간</h3>
        <p>회원 탈퇴 시 생년월일 · 성별 · 전화번호 · 구글 연결 · 약관 동의 기록 · 취향 결과 · 로그인 기기를 지우고, 이메일 · 닉네임은 알아볼 수 없는 값으로 바꿉니다.</p>
        <p>재무 진단 입력값은 회원과의 연결을 끊고 통계용으로만 남기며, 1:1 상담 · 콤파 대화 기록은 "탈퇴한 회원" 으로 남겨 운영 기록 · 분쟁 확인에 씁니다.</p>
      </section>
      <p>필수 항목에 동의하지 않으면 회원가입을 할 수 없습니다.</p>
    </>
  );
}

export default function TermsModal({ term, agreed, onAgree, onClose }) {
  return (
    <Modal title={`[필수] ${term.title}`} onClose={onClose} size="lg">
      <div className="terms-body" tabIndex={0} aria-label={`${term.title} 본문`}>
        {term.id === 'privacy' ? <PrivacyBody /> : <ServiceBody />}
      </div>

      <div className="auth-modal-actions">
        <button className="auth-modal-button" type="button" onClick={onClose}>
          닫기
        </button>
        {/* 이미 동의했으면 동의 버튼 대신 상태만 보여 준다 */}
        <button
          className="auth-modal-button auth-modal-button-primary"
          type="button"
          onClick={onAgree}
          disabled={agreed}
        >
          {agreed ? '동의함' : '동의하고 닫기'}
        </button>
      </div>
    </Modal>
  );
}
