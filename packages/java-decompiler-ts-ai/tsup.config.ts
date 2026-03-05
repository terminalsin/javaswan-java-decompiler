import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    minify: false,
    // react/ink are CLI-only deps — don't bundle them in the library
    external: ['react', 'ink', 'react/jsx-runtime'],
  },
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    treeshake: true,
    minify: false,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
