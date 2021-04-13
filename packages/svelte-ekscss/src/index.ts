/* eslint-disable no-console */

import * as colors from 'colorette';
import { compile, XCSSCompileOptions } from 'ekscss';
import JoyCon from 'joycon';
import type { Preprocessor, PreprocessorGroup } from './types';
// import type { Preprocessor, PreprocessorGroup } from 'svelte/types/compiler/preprocess';

export type XCSSConfig = Omit<XCSSCompileOptions, 'from' | 'to'>;

interface PluginOptions {
  /** An XCSS config object or the path to a config file. */
  config?: XCSSConfig | string;
}

export const style = ({ config }: PluginOptions = {}): Preprocessor => {
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
  let configData: XCSSConfig;
  let configPath: string | undefined;

  return async ({ attributes, content, filename }) => {
    if (attributes.lang !== 'xcss') return null;

    // XXX: Svelte has no way to identify when the config was changed when
    // watching during dev mode, so to update the config the whole svelte
    // processes must be manually restarted

    if (!config || typeof config === 'string') {
      // load user defined config or fall back to default file locations
      const result = await joycon.load(config ? [config] : undefined);
      configData = (result.data as XCSSConfig) || {};
      configPath = result.path;

      if (!result.path) {
        console.warn(colors.yellow('Warning:'), 'Unable to locate XCSS config');
      }
    } else {
      configData = config || {};
    }

    const compiled = compile(content, {
      from: filename,
      globals: configData.globals,
      map: configData.map,
      plugins: configData.plugins,
      rootDir: configData.rootDir,
    });

    // eslint-disable-next-line no-restricted-syntax
    for (const warning of compiled.warnings) {
      console.warn(colors.yellow('Warning:'), warning.message || warning);

      if (warning.file) {
        console.log(
          '  at',
          colors.dim(
            [warning.file, warning.line, warning.column]
              .filter(Boolean)
              .join(':'),
          ),
        );
      }
    }

    const { dependencies } = compiled;
    if (configPath) dependencies.push(configPath);

    return {
      code: compiled.css,
      dependencies,
      map: compiled.map?.toJSON(),
    };
  };
};

export default (opts: PluginOptions): PreprocessorGroup => ({
  style: style(opts),
});
