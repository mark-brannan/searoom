import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Deployed at https://mark-brannan.github.io/searoom/
export default defineConfig({
  base: '/searoom/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
