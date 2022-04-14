import { Config, HydratedFlag } from '../../declarations';
import { isString, Loose } from '@utils';

export const validateHydrated = (config: Loose<Config>) => {
  if (config.hydratedFlag === undefined || config.hydratedFlag === null || config.hydratedFlag === false) {
    return undefined;
  }

  const hydratedFlag: HydratedFlag = { ...config.hydratedFlag };

  if (!isString(hydratedFlag.name) || hydratedFlag.property === '') {
    hydratedFlag.name = `hydrated`;
  }

  if (hydratedFlag.selector === 'attribute') {
    hydratedFlag.selector = `attribute`;
  } else {
    hydratedFlag.selector = `class`;
  }

  if (!isString(hydratedFlag.property) || hydratedFlag.property === '') {
    hydratedFlag.property = `visibility`;
  }

  if (!isString(hydratedFlag.initialValue) && hydratedFlag.initialValue !== null) {
    hydratedFlag.initialValue = `hidden`;
  }

  if (!isString(hydratedFlag.hydratedValue) && hydratedFlag.initialValue !== null) {
    hydratedFlag.hydratedValue = `inherit`;
  }

  return hydratedFlag;
};
