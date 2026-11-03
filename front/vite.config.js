import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// /api 로 시작하는 요청을 Spring Boot 로 전달한다 (개발 서버 전용)
const API_TARGET = 'http://localhost:8080';

// 프로젝트 루트 .env.local (백엔드와 같은 키 파일) 의 VITE_ 값. front/.env.local · 환경변수보다 우선한다.
// 빈 값은 건너뛴다. 백엔드 LocalKeyFileEnvironmentPostProcessor 와 같은 KEY=VALUE 규칙
const ROOT_KEY_FILE = fileURLToPath(new URL('../.env.local', import.meta.url));

function rootKeyFileDefines() {
  if (!existsSync(ROOT_KEY_FILE)) return {};
  const defines = {};
  for (const line of readFileSync(ROOT_KEY_FILE, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(VITE_[A-Za-z0-9_]+)\s*[=:]\s*(.*?)\s*$/);
    if (match && match[2]) defines[`import.meta.env.${match[1]}`] = JSON.stringify(match[2]);
  }
  return defines;
}

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  define: rootKeyFileDefines(),
  server: {
    // 같은 네트워크의 다른 PC에서도 개발 서버에 접속한다. 기본값은 localhost뿐이라 끈다.
    host: true,
    port: 5173,
    proxy: {
      '/api/v2': {
        target: 'http://127.0.0.1:8002',
        changeOrigin: true,
      },
      '/api/v1/recommendations': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
      // 8단계: 1:1 상담 채팅 WebSocket. ws: true 가 있어야 WebSocket 연결을 넘겨준다 (강의 샘플 step4 와 같음)
      '/ws': {
        target: API_TARGET,
        ws: true,
      },
    },
  },
});
