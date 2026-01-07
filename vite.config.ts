import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Vercel 환경변수와 .env 파일 양쪽에서 키를 찾습니다.
  const realApiKey = 
    process.env.GEMINI_API_KEY || 
    process.env.VITE_GEMINI_API_KEY || 
    env.GEMINI_API_KEY || 
    env.VITE_GEMINI_API_KEY || 
    '';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      // [수정된 부분] process.env를 만들 때 'NODE_ENV'도 같이 넣어줍니다!
      // 이게 없으면 리액트가 작동을 멈춥니다.
      'process.env': JSON.stringify({
        NODE_ENV: mode, 
        GEMINI_API_KEY: realApiKey,
        VITE_GEMINI_API_KEY: realApiKey,
        API_KEY: realApiKey
      })
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
