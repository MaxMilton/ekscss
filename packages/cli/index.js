'use strict';

const childProc = require('child_process');
const colors = require('colorette');
const xcss = require('ekscss');
const fs = require('fs');
const JoyCon = require('joycon').default;
const path = require('path');
const { performance } = require('perf_hooks');

/**
 * Check if a file exists.
 * @param {string} filePath
 * @return {Promise<boolean>}
 */
function pathExists(filePath) {
  return new Promise((resolve) => {
    fs.access(filePath, (err) => {
      resolve(!err);
    });
  });
}

const joycon = new JoyCon({
  files: [
    '.xcssrc.js',
    '.xcssrc.json',
    'xcss.config.js',
    'xcss.config.json',
    'package.json',
  ],
  packageKey: 'xcss',
});

/**
 * @param {string?} src
 * @param {string?} dest
 * @param {object} opts
 * @param {string} [opts.config]
 * @param {boolean} [opts.map]
 * @param {boolean} [opts.quiet]
 */
module.exports = async (src, dest, opts) => {
  // load user defined config or fall back to default file locations
  const result = await joycon.load(opts.config ? [opts.config] : undefined);

  if (!result.path && !opts.quiet) {
    console.warn(colors.yellow('Warning:'), 'Unable to locate XCSS config');
  }

  const config = result.data || {};
  const rootDir = config.rootDir || process.cwd();
  const srcFiles = src ? [src] : ['index.xcss', 'src/index.xcss'];
  /** @type {string|undefined} */
  let srcFile;

  for (const filename of srcFiles) {
    const file = path.resolve(rootDir, filename);
    const exists = await pathExists(file);

    if (exists) {
      srcFile = file;
      break;
    }
  }

  if (!srcFile) {
    throw new Error('Unable to resolve src file');
  }

  const destFile = dest || srcFile.replace(/\.xcss$/, '.css');
  const code = await fs.promises.readFile(srcFile, 'utf-8');

  const t0 = performance.now();
  const compiled = xcss.compile(code, {
    from: srcFile,
    to: destFile,
    globals: config.globals,
    plugins: config.plugins,
    rootDir,
    map: opts.map ?? config.map,
  });
  const t1 = performance.now();

  for (const warning of compiled.warnings) {
    if (!opts.quiet) {
      console.error(colors.red('Error:'), warning.message || warning);
    }
    process.exitCode = 1;
  }

  // FIXME: `config.header` needs to be accounted for in source maps

  const css = `${config.header || ''}${compiled.css}`;

  if (compiled.map) {
    fs.writeFileSync(
      destFile,
      `${css}\n/*# sourceMappingURL=${path.basename(destFile)}.map */`,
      'utf8',
    );
    fs.writeFileSync(`${destFile}.map`, JSON.stringify(compiled.map), 'utf8');
  } else {
    fs.writeFileSync(destFile, css, 'utf8');
  }

  if (!opts.quiet) {
    // highlight potential code issues
    const cssHighlighted = css.replace(
      /null|undefined|UNDEFINED|INVALID|NaN/g,
      colors.bold(colors.red('$&')),
    );
    const bytes = Buffer.byteLength(css, 'utf8');
    const gzBytes = childProc.execSync(
      `echo "${css}" | gzip --stdout - | wc --bytes`,
    );
    const memMB = process.memoryUsage().heapUsed / 1024 / 1024;
    const time = `${(t1 - t0).toFixed(2)}ms`;
    const timeTotal = `${Math.round(performance.now())}ms total`;

    console.log('');
    console.log(`@@\n@@ ${destFile}\n@@`);
    console.log('');
    console.log(cssHighlighted);
    console.log('');
    console.log(`time:  ${time} (${timeTotal})`);
    console.log(`mem:   ${memMB.toFixed(2)} MB`);
    console.log(`chars: ${compiled.css.length}`);
    console.log(`bytes: ${bytes} B, ${`${(bytes / 1024).toFixed(2)} kB`}`);
    console.log(`gz:    ${+gzBytes} B, ${(+gzBytes / 1024).toFixed(2)} kB`);
    console.log('');
  }
};
