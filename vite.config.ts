import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load public environment variables
  const rootEnv = loadEnv(mode, (process as any).cwd(), '');
  const serverEnv = loadEnv(mode, path.resolve((process as any).cwd(), 'server'), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {}
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: rootEnv.VITE_PROXY_TARGET || serverEnv.VITE_PROXY_TARGET || 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
        },
        '/media': {
          target: rootEnv.VITE_PROXY_TARGET || serverEnv.VITE_PROXY_TARGET || 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    optimizeDeps: {
      exclude: []
    },
    build: {
      rollupOptions: {
        external: [],
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react/') || id.includes('react-dom/')) {
                return 'vendor-react';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('axios')) {
                return 'vendor-axios';
              }
            }
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    esbuild: {
      jsxDev: false
    }
    // Security: Do NOT embed secret API keys in the client bundle.
    // All AI and payment calls are strictly routed through authenticated backend endpoints.
  };
});
