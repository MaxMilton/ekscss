/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable import/no-extraneous-dependencies, no-console */

import esbuild from 'esbuild';

const mode = process.env.NODE_ENV;
const dev = mode === 'development';

/** @param {Error|null} err */
function handleErr(err) {
  if (err) throw err;
}

/** @param {esbuild.BuildResult} buildResult */
async function analyzeMeta(buildResult) {
  if (buildResult.metafile) {
    console.log(await esbuild.analyzeMetafile(buildResult.metafile));
  }
}

// Standard node CJS bundle
esbuild
  .build({
    entryPoints: ['src/index.ts'],
    outfile: 'dist/index.js',
    platform: 'node',
    target: ['node10'],
    define: {
      'process.env.BROWSER': 'false',
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    external: ['source-map', 'stylis'],
    banner: { js: '"use strict";' },
    bundle: true,
    sourcemap: true,
    minify: !dev,
    watch: dev,
    metafile: process.stdout.isTTY,
    logLevel: 'debug',
  })
  .then(analyzeMeta)
  .catch(handleErr);

// Browser compatible ESM bundle (without sourcemap support)
esbuild
  .build({
    entryPoints: ['src/index.ts'],
    outfile: 'dist/browser.mjs',
    platform: 'browser',
    format: 'esm',
    define: {
      __filename: JSON.stringify(''),
      'process.env.BROWSER': 'true',
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    external: ['stylis'],
    bundle: true,
    sourcemap: true,
    minifySyntax: !dev,
    watch: dev,
    metafile: process.stdout.isTTY,
    logLevel: 'debug',
    plugins: [
      {
        name: 'mock-sourcemap',
        setup(build) {
          build.onResolve({ filter: /^\.\/sourcemap$/ }, () => ({
            namespace: 'mock-sourcemap',
            path: 'null',
          }));
          build.onLoad({ filter: /.*/, namespace: 'mock-sourcemap' }, () => ({
            contents: 'export const compileSourceMap = () => {};',
          }));
        },
      },
    ],
  })
  .then(analyzeMeta)
  .catch(handleErr);
