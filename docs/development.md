# 개발 가이드

README 의 실행 방법을 쓰면서 필요한 세부 동작 · 옵션 · 키 설정 · CI 를 모은 문서입니다.

## 실행 스크립트

### Windows PowerShell (`dev.ps1`)

프로젝트 루트에서 실행합니다. Node.js, Java, ML 가상환경·패키지·학습 모델([초기 준비](../ml/README.md))이 필요합니다.

React(5173)·Spring(8080)·Python 추천 서버(8002)를 함께 실행합니다. 이미 사용 중인 포트는 기존 프로세스를 재사용하므로 해당 포트가 이 프로젝트 서버인지 확인하세요. 프로젝트 MySQL(3307)이 실행 중이면 그대로 사용하고, 없으면 Docker Desktop을 통해 프로젝트 DB를 시작합니다. DB 계정·스키마는 아래 직접 실행 설정과 같습니다.

터미널을 열어 둔 채 사용하며, Ctrl+C를 누르면 이번 실행으로 새로 켠 앱 서버와 하위 프로세스만 종료합니다. 기존 서버와 DB는 유지합니다. 로그는 `tmp/dev/<실행시각>/`에 저장됩니다. 처음 실행할 때만 프런트 의존성이 없으면 `npm ci`를 수행하며, ML 설치·모델 학습은 자동으로 하지 않습니다.

```powershell
.\dev.ps1 -Check                  # 서버를 켜지 않고 실행 준비 확인
.\dev.ps1 -DatabasePort 3308      # 다른 MySQL 포트 사용
```

명령 프롬프트에서는 기존 `dev.cmd`도 동일한 스크립트를 호출합니다.

```bat
dev.cmd                 # MySQL + Spring + React + Python 추천 서버
dev.cmd down            # 프로젝트 DB 컨테이너 중지 (데이터 유지)
dev.cmd reset           # 프로젝트 DB 컨테이너와 데이터 삭제
set DB_PORT=3308 && dev.cmd
```

PowerShell에서는 `.\dev.ps1 down`, `.\dev.ps1 reset`도 사용할 수 있습니다. `-DatabasePort`를 생략하면 `DB_PORT` 환경변수를 사용하며, 둘 다 없으면 3307입니다. `reset`은 DB 데이터를 삭제하므로 재초기화할 때만 사용하세요. Spring을 새로 켜는 경우 Java 소스의 연속 컴파일도 실행해 저장 시 DevTools 자동 재시작을 유지합니다.

스크립트 실행 정책으로 차단되는 경우 이 실행에만 적용합니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\dev.ps1
```

### Git Bash · macOS (`dev.sh`)

Docker, JDK(17 이 없으면 Gradle 이 자동으로 받음), Node.js 가 필요합니다.

```bash
./dev.sh          # MySQL(Docker) + Spring Boot + Vite 실행, Ctrl+C 로 종료
./dev.sh down     # DB 컨테이너 중지 (데이터 유지)
./dev.sh reset    # DB 컨테이너와 데이터 삭제
```

- Java 파일을 저장하면 서버가 자동 재시작되고, 프론트는 HMR 로 바로 반영됩니다.
- 3307 포트를 이미 쓰고 있으면 `DB_PORT=3308 ./dev.sh` 로 실행합니다.
- Windows 는 Git Bash 에서 실행합니다.
- 이 Bash 스크립트에는 추천 서버가 포함되지 않습니다. 추천까지 함께 켜려면 `dev.ps1`을 사용하세요.

### 직접 실행

DB 는 기본 호스트 포트 3307에서 `docker compose up -d` 로 띄우거나, 같은 포트의 로컬 MySQL 8 에 `final_sample` DB 와 `server` / `server` 계정을 준비합니다.

외부 서비스 키는 직접 실행해도 루트 `.env.local` 에서 그대로 읽습니다. IntelliJ 실행 폴더가 프로젝트 루트든 `back` 이든 같습니다.

### Elasticsearch · Kibana

`dev.ps1`·`dev.cmd`·`dev.sh` 실행 시 MySQL과 함께 Elasticsearch(9200, 한국어 분석기 nori 포함)와 Kibana(5601)도 Docker로 자동 실행됩니다. 첫 실행 때 nori 를 설치한 이미지를 빌드하므로 몇 분 걸릴 수 있으며, Docker Desktop 메모리는 4GB 이상을 권장합니다. 개발용이라 보안을 끈 단일 노드이며 인증 없이 http://localhost:9200 으로 접속합니다. 9200 포트를 이미 쓰고 있으면 `ES_PORT=9201` 환경변수로 바꿉니다. 직접 띄울 때는 `docker compose up -d` 로 MySQL·Elasticsearch·Kibana를 모두 시작합니다.

## 외부 서비스 키

외부 서비스 키는 **코드 · DB · git 에 넣지 않습니다.** 키가 없어도 아래처럼 개발 모드로 동작하므로, 조원은 키 없이 그대로 실행하면 됩니다.

**키 파일 하나로 넣기 (권장)**: 프로젝트 루트에서 `.env.example` 을 `.env.local` 로 복사해 값을 채우고 서버 · 프론트를 다시 켭니다. 백엔드와 프론트가 모두 이 파일을 읽습니다.

```bash
cp .env.example .env.local      # Windows PowerShell: Copy-Item .env.example .env.local
```

- `dev.ps1` · `dev.sh`, `./gradlew bootRun` · `npm run dev` 직접 실행, IntelliJ 실행 모두 같은 파일을 읽습니다. 백엔드 기동 로그의 `key file applied: … (N keys)` 줄로 적용을 확인합니다.
- 우선순위: 루트 `.env.local` > 환경변수 > `front/.env.local` > 기본값. 값이 빈 줄은 무시됩니다.
- 관리자 계정은 이 파일이 아니라 기존대로 `back/admin-seed.local.properties` 에 둡니다.
- 아래의 환경변수 · `front/.env.local` 방식도 그대로 쓸 수 있습니다.

`.env.local` 내용 (`.env.example` 과 같음). 필요한 줄만 `=` 뒤에 따옴표 없이 채우고, 안 쓰는 키는 비워 둡니다.

```properties
# DB 서버 주소. 비우면 localhost (dev 스크립트가 Docker DB 를 띄운다). 다른 PC 의 DB 를 쓸 때만 적는다
DB_HOST=

# 이메일 인증 메일 — Gmail 주소와 앱 비밀번호 (Google 계정 → 보안 → 2단계 인증 → 앱 비밀번호, 16자리 공백 없이)
# 비우면 메일 대신 서버 로그에 인증 코드: [DEV-MAIL] email verification code=123456 to=…
MAIL_USERNAME=
MAIL_PASSWORD=

# reCAPTCHA v2 체크박스 — reCAPTCHA 관리 콘솔에서 발급 (도메인에 localhost 추가). 두 키는 한 쌍
# 로그인 3번 실패 후 표시. 비우면 구글 테스트 키 (항상 통과) — 배포 때는 반드시 채운다
RECAPTCHA_SECRET_KEY=
VITE_RECAPTCHA_SITE_KEY=

# 구글 로그인 — Google Cloud Console → 사용자 인증 정보 → OAuth 클라이언트 ID (웹)
# 승인된 JavaScript 원본에 http://localhost:5173 추가. 두 줄에 같은 값. 비우면 구글 버튼이 "설정 필요" 로 비활성
GOOGLE_CLIENT_ID=
VITE_GOOGLE_CLIENT_ID=

# 콤파 챗봇 LLM — 쓰는 쪽 키 하나만 있으면 된다 (Gemini: Google AI Studio, OpenAI: platform.openai.com)
# CHATBOT_PROVIDER: gemini (기본) 또는 openai. 모델을 비우면 gemini-3.5-flash-lite · gpt-5.6-luna
# 비우면 추천 질문 · 용어 고정 답변만 되고 AI 질문은 "키 없음" 으로 응답
CHATBOT_PROVIDER=
GEMINI_API_KEY=
GEMINI_MODEL=
OPENAI_API_KEY=
OPENAI_MODEL=

# 로그인 토큰. 비우면 로컬 개발용 값 · false
# 배포 때는 JWT_SECRET(32자 이상 임의 문자열) 과 JWT_COOKIE_SECURE=true (https) 를 반드시 넣는다
JWT_SECRET=
JWT_COOKIE_SECURE=
```

- 개발 모드 회원가입: 이메일 [인증 코드 받기] → 백엔드 콘솔(또는 `tmp/dev/…` 로그)에서 `DEV-MAIL` 줄의 6자리 코드를 찾아 입력합니다.

키 파일 대신 기존 방식으로 넣을 때:

- 프론트 키(`VITE_…`)는 `front/.env.local` 에 적습니다. `.env.*` 는 git 에서 제외됩니다.
- 백엔드 키는 서버를 켜는 터미널에서 넣습니다. 비밀번호가 명령 기록에 남지 않게 `read -s` 로 입력합니다.

```bash
export MAIL_USERNAME=보내는계정@gmail.com
read -s -p "Gmail 앱 비밀번호: " MAIL_PASSWORD; echo; export MAIL_PASSWORD
DB_PORT=3308 ./dev.sh
```

## DB 스키마

테이블은 서버 시작 시 Flyway 가 `back/src/main/resources/db/migration` 의 SQL 로 자동 생성합니다. 변경 방법은 [back/SCHEMA.md](../back/SCHEMA.md) 를 참고하세요.

### 관리자 화면 데모 데이터

`V26__seed_admin_demo_data.sql` 이 관리자 콘솔(`/console`)을 확인할 수 있도록 데모 데이터를 넣습니다. 들어가는 데이터는 다음과 같습니다.

- 회원 40명. 관리자 2명이 포함되고, 정지 · 구글 로그인 · 프로필 미입력 회원도 섞여 있습니다.
- 1:1 상담 13건 (대기 · 진행 · 종료 · 제한)과 상담 평가 · 신고.
- 운영 로그 26건.
- 콤파 대화 20쌍과 평가.
- 재무 진단 24건.
- 작성 중 · 판매 종료 · 삭제 상태의 차량 6대.

모든 데이터는 마이그레이션을 적용한 시점을 기준으로 최근 30일에 분포합니다.

- 데모 회원의 이메일은 `@demo.compa.local`, 데모 차량의 id 는 `demo-` 로 시작합니다.
- 데모 회원은 로그인할 수 없습니다. 비밀번호 해시를 일부러 BCrypt 형식이 아닌 값으로 넣었습니다. 화면은 `admin-seed.local.properties` 의 총관리자로 들어가서 확인합니다.
- 데모 데이터를 지우는 SQL 은 V26 파일 머리 주석에 있습니다. 운영 DB 에서 지울 때는 그 SQL 을 새 마이그레이션으로 추가합니다.

## CI

모든 브랜치에 푸시하면 GitHub Actions 가 `back`(MySQL 포함)과 `front` 단위 테스트를 실행합니다. `ml`·`tools` 의 Python 테스트는 실행하지 않습니다.

- 실패하면 GitHub 가 푸시한 사람에게 메일을 보냅니다. GitHub **Settings → Notifications → Actions** 에서 Email 을 켜고 **Only notify for failed workflows** 를 선택해 두세요. 메일은 GitHub 알림 이메일로 갑니다.
- 푸시 자체는 막지 않습니다. `develop` 에는 실패한 코드도 올라갈 수 있으니 메일을 받으면 바로 고칩니다.
- `main` 은 PR 로만 변경하며 `back-test`·`front-test` 를 통과해야 머지할 수 있습니다.
- 실패 원인은 Actions 실행 화면의 로그와 `back-test-report` 아티팩트에서 확인합니다.
