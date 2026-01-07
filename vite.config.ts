import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Vercel이나 .env 어디서든 키를 찾아냅니다
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
      // [핵심 해결] 'process.env'라는 꾸러미 전체를 가짜로 만들어줍니다.
      // 이렇게 하면 프로그램이 "process가 뭐지?" 하고 멈추는 일이 사라집니다.
      'process.env': JSON.stringify({
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
