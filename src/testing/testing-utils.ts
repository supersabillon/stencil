import type * as d from '@stencil/core/internal';
import { isOutputTargetDistLazy, isOutputTargetWww } from '../compiler/output-targets/output-utils';
import { join, relative } from 'path';

export function shuffleArray(array: any[]) {
  // http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
  let currentIndex = array.length;
  let temporaryValue: any;
  let randomIndex: number;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

/**
 * Testing utility to validate the existence of some provided file paths using a specific file system
 *
 * @param fs the file system to use to validate the existence of some files
 * @param filePaths the paths to validate
 * @throws when one or more of the provided file paths cannot be found
 */
export function expectFilesExist(fs: d.InMemoryFileSystem, filePaths: string[]): void {
  const notFoundFiles: ReadonlyArray<string> = filePaths.filter((filePath: string) => !fs.statSync(filePath).exists);

  if (notFoundFiles.length > 0) {
    throw new Error(
      `The following files were expected, but could not be found:\n${notFoundFiles
        .map((result: string) => '-' + result)
        .join('\n')}`
    );
  }
}

/**
 * Testing utility to validate the non-existence of some provided file paths using a specific file system
 *
 * @param fs the file system to use to validate the non-existence of some files
 * @param filePaths the paths to validate
 * @throws when one or more of the provided file paths is found
 */
export function expectFilesDoNotExist(fs: d.InMemoryFileSystem, filePaths: string[]): void {
  const existentFiles: ReadonlyArray<string> = filePaths.filter((filePath: string) => fs.statSync(filePath).exists);

  if (existentFiles.length > 0) {
    throw new Error(
      `The following files were expected to not exist, but do:\n${existentFiles
        .map((result: string) => '-' + result)
        .join('\n')}`
    );
  }
}

/**
 * Get the URL of the file used to bootstrap a Stencil entrypoint for e2e testing.
 *
 * The filename to be included in the URL is derived from the namespace of the project. The contents of the loaded file
 * includes the necessary code to patch the browser and lazily init a project's components
 *
 * @param config the Stencil configuration used while running e2e tests
 * @param browserUrl the base of the URL to be used when serving the JS file (e.g. "http://localhost:3333")
 * @returns the URL of the entrypoint file, or `null` if global styles are not set
 */
export function getAppScriptUrl(config: d.ValidatedConfig, browserUrl: string): string {
  const appFileName = `${config.fsNamespace}.esm.js`;
  return getAppUrl(config, browserUrl, appFileName);
}

/**
 * Get the URL of global styles for e2e testing
 * @param config the Stencil configuration used while running e2e tests
 * @param browserUrl the base of the URL to be used when serving the CSS file (e.g. "http://localhost:3333")
 * @returns the URL of the styles file, or `null` if global styles are not set
 */
export function getAppStyleUrl(config: d.ValidatedConfig, browserUrl: string): string | null {
  if (config.globalStyle) {
    const appFileName = `${config.fsNamespace}.css`;
    return getAppUrl(config, browserUrl, appFileName);
  }
  return null;
}

/**
 * Build a URL to the provided `appFileName` on a local file server to be used for e2e testing purposes.
 *
 * This function is agnostic to file types. The extension of the file to be served is expected to be included in
 * `appFileName`.
 *
 * @param config the Stencil configuration used while running e2e tests
 * @param browserUrl the base of the URL to be used when serving the file (e.g. "http://localhost:3333")
 * @param appFileName the name of the file to serve
 * @returns the URL of the file to serve
 */
function getAppUrl(config: d.ValidatedConfig, browserUrl: string, appFileName: string): string {
  const wwwOutput = config.outputTargets.find(isOutputTargetWww);
  if (wwwOutput) {
    const appBuildDir = wwwOutput.buildDir;
    const appFilePath = join(appBuildDir, appFileName);
    const appUrlPath = relative(wwwOutput.dir, appFilePath);
    const url = new URL(appUrlPath, browserUrl);
    return url.href;
  }

  const distOutput = config.outputTargets.find(isOutputTargetDistLazy);
  if (distOutput) {
    const appBuildDir = distOutput.esmDir;
    const appFilePath = join(appBuildDir, appFileName);
    const appUrlPath = relative(config.rootDir, appFilePath);
    const url = new URL(appUrlPath, browserUrl);
    return url.href;
  }

  return browserUrl;
}

/**
 * Utility for silencing `console` functions in tests.
 *
 * When this function is first called it grabs a reference to the `log`,
 * `error`, and `warn` functions on `console` and then returns a per-test setup
 * function which sets up a fresh set of mocks (via `jest.fn()`) and then
 * assigns them to each of these functions. This setup function will return a
 * reference to each of the three mock functions so tests can make assertions
 * about their calls and so on.
 *
 * Because references to the original `.log`, `.error`, and `.warn` functions
 * exist in closure within the function, it can use an `afterAll` call to clean
 * up after itself and ensure that the original implementations are restored
 * after the test suite finishes.
 *
 * An example of using this to silence log statements in a single test could look
 * like this:
 *
 * ```ts
 * describe("my-test-suite", () => {
 *   const setupConsoleMocks = setupConsoleMocker()
 *
 *   it("should log a message", () => {
 *     const { logMock } = setupConsoleMocks();
 *     myFunctionWhichLogs(foo, bar);
 *     expect(logMock).toBeCalledWith('my log message');
 *   })
 * })
 * ```
 *
 * @returns a per-test mock setup function
 */
export function setupConsoleMocker(): ConsoleMocker {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  afterAll(() => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  });

  function setupConsoleMocks() {
    const logMock = jest.fn();
    const warnMock = jest.fn();
    const errorMock = jest.fn();

    console.log = logMock;
    console.warn = warnMock;
    console.error = errorMock;

    return {
      logMock,
      warnMock,
      errorMock,
    };
  }
  return setupConsoleMocks;
}

interface ConsoleMocker {
  (): {
    logMock: jest.Mock<typeof console.log>;
    warnMock: jest.Mock<typeof console.warn>;
    errorMock: jest.Mock<typeof console.error>;
  };
}

/**
 * the callback that `withSilentWarn` expects to receive. Basically receives a mock
 * as its argument and returns a `Promise`, the value of which is returns by `withSilentWarn`
 * as well.
 */
type SilentWarnFunc<T> = (mock: jest.Mock<typeof console.warn>) => Promise<T>;

/**
 * Wrap a single callback with a silent `console.warn`. The callback passed in
 * receives the mocking function as an argument, so you can easily make assertions
 * that it is called if necessary.
 *
 * @param cb a callback which `withSilentWarn` will call after replacing `console.warn`
 * with a mock.
 * @returns a Promise wrapping the return value of the callback
 */
export async function withSilentWarn<T>(cb: SilentWarnFunc<T>): Promise<T> {
  const realWarn = console.warn;
  const warnMock = jest.fn();
  console.warn = warnMock;
  const retVal = await cb(warnMock);
  console.warn = realWarn;
  return retVal;
}
