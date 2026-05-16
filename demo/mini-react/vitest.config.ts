import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Force all imports of react/react-dom to resolve to this project's copy,
    // preventing a duplicate-React error when mini-guard/react (a file: dep)
    // resolves React relative to the root package instead.
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['app/**/*.test.tsx', 'app/**/*.test.ts'],
  },
});
