import type * as d from '@stencil/core/declarations';
import { doNotExpectFiles, expectFiles } from '../../../testing/testing-utils';
import { mockCreateCompiler, MockCompiler, mockCompilerRoot } from '../../../testing/mock-compiler';
import path from 'path';

describe('outputTarget, dist', () => {
  jest.setTimeout(20000);
  let compiler: MockCompiler;
  let config: d.Config = {};

  it('default dist files', async () => {
    config.buildAppCore = true; //todo
    config.buildEs5 = true;
    config.globalScript = path.join(mockCompilerRoot, 'src', 'global.ts');
    config.outputTargets = [{ type: 'dist' }];
    config.sourceMap = true; //todo

    compiler = await mockCreateCompiler(config);
    config = compiler.config;

    await config.sys.writeFile(path.join(mockCompilerRoot, 'polyfills', 'index.js'), `/* polyfills */`); //todo
    await config.sys.writeFile(
      config.packageJsonFilePath,
      `{
      "collection": "dist/collection/collection-manifest.json",
      "main": "dist/index.cjs.js",
      "module": "dist/index.js",
      "types": "dist/types/components.d.ts"
    }`
    );
    await config.sys.writeFile(
      path.join(config.srcDir, 'components', 'cmp-a.tsx'),
      `
      import { Component, h } from '@stencil/core';
      @Component({
        tag: 'cmp-a',
        styleUrls: {
          ios: 'cmp-a.ios.css',
          md: 'cmp-a.md.css'
        }
      }) export class CmpA {}
    `
    );
    await config.sys.writeFile(path.join(config.srcDir, 'components', 'cmp-a.ios.css'), `cmp-a { color: blue; }`);
    await config.sys.writeFile(path.join(config.srcDir, 'components', 'cmp-a.md.css'), `cmp-a { color: green; }`);
    await config.sys.writeFile(
      path.join(config.srcDir, 'global.ts'),
      `export default function() { console.log('my global'); }`
    );

    const r = await compiler.build();
    expect(r.diagnostics).toHaveLength(0);

    expectFiles(compiler.compilerCtx.fs, [
      path.join(mockCompilerRoot, 'dist', 'index.js'),
      path.join(mockCompilerRoot, 'dist', 'index.cjs.js'),

      // TODO cjs/

      path.join(mockCompilerRoot, 'dist', 'collection', 'collection-manifest.json'),
      path.join(mockCompilerRoot, 'dist', 'collection', 'index.js'),
      path.join(mockCompilerRoot, 'dist', 'collection', 'index.js.map'),
      path.join(mockCompilerRoot, 'dist', 'collection', 'components', 'cmp-a.js'),
      path.join(mockCompilerRoot, 'dist', 'collection', 'components', 'cmp-a.js.map'),
      path.join(mockCompilerRoot, 'dist', 'collection', 'components', 'cmp-a.ios.css'),
      path.join(mockCompilerRoot, 'dist', 'collection', 'components', 'cmp-a.md.css'),
      path.join(mockCompilerRoot, 'dist', 'collection', 'global.js'),
      path.join(mockCompilerRoot, 'dist', 'collection', 'global.js.map'),

      path.join(mockCompilerRoot, 'dist', 'esm', 'index.js'),
      path.join(mockCompilerRoot, 'dist', 'esm', 'index.js.map'),
      path.join(mockCompilerRoot, 'dist', 'esm', 'loader.js'),
      path.join(mockCompilerRoot, 'dist', 'esm', 'polyfills', 'index.js'),
      path.join(mockCompilerRoot, 'dist', 'esm', 'polyfills', 'index.js.map'),

      path.join(mockCompilerRoot, 'dist', 'esm-es5', 'index.js'),
      path.join(mockCompilerRoot, 'dist', 'esm-es5', 'index.js.map'),
      path.join(mockCompilerRoot, 'dist', 'esm-es5', 'loader.js'),

      path.join(mockCompilerRoot, 'dist', 'loader'),

      path.join(mockCompilerRoot, 'dist', 'types', 'components', 'cmp-a.d.ts'),
      path.join(mockCompilerRoot, 'dist', 'types', 'components.d.ts'),
      path.join(mockCompilerRoot, 'dist', 'types', 'global.d.ts'),
      path.join(mockCompilerRoot, 'dist', 'types', 'index.d.ts'),
      path.join(mockCompilerRoot, 'dist', 'types', 'stencil-public-runtime.d.ts'),

      path.join(mockCompilerRoot, 'src', 'components.d.ts'),
    ]);

    doNotExpectFiles(compiler.compilerCtx.fs, [
      path.join(mockCompilerRoot, 'build'),
      path.join(mockCompilerRoot, 'esm'),
      path.join(mockCompilerRoot, 'es5'),
      path.join(mockCompilerRoot, 'www'),
      path.join(mockCompilerRoot, 'index.html'),
    ]);

    compiler.destroy();
  });
});
