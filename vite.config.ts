import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
  const base =
    process.env.GITHUB_ACTIONS === 'true' && repositoryName
      ? `/${repositoryName}/`
      : '/';

  return {
    base,
    plugins: [react()],
    worker: {
      format: 'es',
    },
    optimizeDeps: {
      exclude: ['stockfish'],
    },
    server: {
      headers: {
        // Required for SharedArrayBuffer (Stockfish multi-thread)
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
  };
});
