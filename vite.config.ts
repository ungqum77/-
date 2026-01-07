import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 1. Vite가 불러온 환경변수(.env)
  const env = loadEnv(mode, process.cwd(), '');
  
  // 2. Vercel 서버의 진짜 환경변수 (process.env)
  // 순서대로 검사해서 하나라도 있으면 가져옵니다.
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
      // 3. 찾은 키를 프로그램에 강제로 주입 (이 부분이 핵심!)
      'process.env.API_KEY': JSON.stringify(realApiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(realApiKey),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(realApiKey)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
