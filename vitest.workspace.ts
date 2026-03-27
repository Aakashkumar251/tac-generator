import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/*',
  {
    test: {
      include: ['packages/app-shell/src/**/*.{test,spec}.{ts,tsx}'],
      name: 'app-shell',
      environment: 'jsdom',
      setupFiles: ['./packages/app-shell/src/test/setup.ts'],
    },
  },
  {
    test: {
      include: ['packages/core-compiler/test/**/*.{test,spec}.ts'],
      name: 'core-compiler',
      environment: 'node',
    },
  },
  {
    test: {
      include: ['packages/optimizers/src/**/*.{test,spec}.ts'],
      name: 'optimizers',
      environment: 'node',
    },
  },
  {
    test: {
      include: ['packages/visualizers/src/**/*.{test,spec}.ts'],
      name: 'visualizers',
      environment: 'node',
    },
  },
  {
    test: {
      include: ['packages/shared/src/**/*.{test,spec}.ts'],
      name: 'shared',
      environment: 'node',
    },
  },
]);
