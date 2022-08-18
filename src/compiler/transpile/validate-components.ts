import type * as d from '../../declarations';
import { buildError } from '@utils';
import { relative } from 'path';

/**
 * Perform a series of validations on the components in the current build context
 * @param config the Stencil configuration associated with the current build
 * @param buildCtx the current build context
 */
export const validateTranspiledComponents = (config: d.ValidatedConfig, buildCtx: d.BuildCtx): void => {
  for (const cmp of buildCtx.components) {
    validateUniqueTagNames(config, buildCtx, cmp);
  }
};

/**
 * Verifies that the tag name for the provided component is unique.
 *
 * If the component's tag name is not unique, an error diagnostic is written to the build context
 *
 * @param config the Stencil configuration associated with the current build
 * @param buildCtx the current build context
 * @param cmp the metadata of the component whose tag name is being tested for uniqueness
 */
const validateUniqueTagNames = (
  config: d.ValidatedConfig,
  buildCtx: d.BuildCtx,
  cmp: d.ComponentCompilerMeta
): void => {
  const tagName = cmp.tagName;
  const cmpsWithTagName = buildCtx.components.filter((c) => c.tagName === tagName);
  if (cmpsWithTagName.length > 1) {
    const err = buildError(buildCtx.diagnostics);
    err.header = `Component Tag Name "${tagName}" Must Be Unique`;
    err.messageText = `Please update the components so "${tagName}" is only used once: ${cmpsWithTagName
      .map((c) => relative(config.rootDir, c.sourceFilePath))
      .join(' ')}`;
  }
};
