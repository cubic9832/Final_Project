import { useRef, useState } from 'react';

// 관리자 화면의 비동기 버튼(권한 변경 · 계정 정지 · 상담 처리 · 모델 켜기와 끄기 · 비율 저장) 중복 요청 막기
// ① 요청 중에는 한 번만 보낸다 — state 는 다시 그려지기 전의 빠른 연속 클릭을 못 막아 useRef 로 막는다
// ② 성공하면 부모가 새 데이터(source)를 내려 줄 때까지 잠근다 — 다시 불러오기 전까지 같은 버튼이 다시 눌리지 않게
//    다시 불러온 데이터는 새 객체라 source 가 바뀌면 effect 없이 자동으로 풀린다
// 실패하면 잠그지 않고 오류를 그대로 던진다 (호출한 쪽이 사유를 보여 준다)
export default function useActionLock(source, { waitForRefresh = true } = {}) {
  const inFlight = useRef(false);
  const [running, setRunning] = useState(false);
  const [lockedSource, setLockedSource] = useState(null);
  const locked = running || (lockedSource !== null && lockedSource === source);

  // 실행했으면 true, 잠겨 있어 무시했으면 false
  async function run(request) {
    if (inFlight.current || locked) return false;
    inFlight.current = true;
    setRunning(true);
    try {
      await request();
      if (waitForRefresh) setLockedSource(source);
      return true;
    } finally {
      inFlight.current = false;
      setRunning(false);
    }
  }

  return { locked, running, run };
}
