#!/usr/bin/env bash
# 추천 서버(FastAPI) 실행 — mac/Linux 용. Windows 는 serve-candidates.ps1 (같은 동작)
#   ./ml/serve-candidates.sh
#   PORT=8003 RUN=outputs/models/scenario-choices/<폴더> PYTHON=/path/to/python ./ml/serve-candidates.sh
set -euo pipefail

ML_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$ML_DIR")"
PORT="${PORT:-8002}"
RUN="${RUN:-outputs/models/scenario-choices/20261103-unified-managed-3m}"
PYTHON="${PYTHON:-$ML_DIR/.venv/bin/python}"

if [ ! -x "$PYTHON" ]; then
  echo "ml/.venv 가 없습니다. ml/README.md 의 설치 방법대로 만들거나 PYTHON 으로 python 경로를 지정하세요." >&2
  exit 1
fi

export ML_CANDIDATE_RUN="$ML_DIR/$RUN"
export PYTHONPATH="$ML_DIR:$ROOT_DIR"
exec "$PYTHON" -m uvicorn vehicle_matching.api:app --app-dir "$ML_DIR" --host 127.0.0.1 --port "$PORT"
