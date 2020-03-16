import Dictionary from "./types/dictionary";
import InjectionToken, {TokenDescriptor} from "./providers/injection-token";
import {ParamInfo} from "./dependency-container";
import Transform from "./types/transform";

export const INJECTION_TOKEN_METADATA_KEY = "injectionTokens";

// The following is a patch of tsyringe's internal getParamInfo to support method parameters
export function getParamInfo(
  target: any,
  propertyKey: string | symbol | undefined = undefined
): ParamInfo[] {
  let params: any[] = [];
  params = propertyKey
    ? Reflect.getMetadata("design:paramtypes", target, propertyKey) || []
    : Reflect.getMetadata("design:paramtypes", target) || [];

  const injectionTokens: Dictionary<InjectionToken<any>> = propertyKey
    ? Reflect.getOwnMetadata(
        INJECTION_TOKEN_METADATA_KEY,
        target,
        propertyKey
      ) || {}
    : Reflect.getOwnMetadata(INJECTION_TOKEN_METADATA_KEY, target) || {};

  Object.keys(injectionTokens).forEach(key => {
    params[+key] = injectionTokens[key];
  });

  return params;
}

export function defineInjectionTokenMetadata(
  data: any,
  transform?: {transformToken: InjectionToken<Transform<any, any>>; args: any[]}
): (
  target: any,
  propertyKey: string | symbol | undefined,
  parameterIndex: number
) => any {
  return function(
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
  ): any {
    const descriptors: Dictionary<
      InjectionToken<any> | TokenDescriptor
    > = propertyKey
      ? Reflect.getOwnMetadata(
          INJECTION_TOKEN_METADATA_KEY,
          target,
          propertyKey
        ) || {}
      : Reflect.getOwnMetadata(INJECTION_TOKEN_METADATA_KEY, target) || {};
    descriptors[parameterIndex] = transform
      ? {
          token: data,
          transform: transform.transformToken,
          transformArgs: transform.args || []
        }
      : data;

    if (propertyKey) {
      Reflect.defineMetadata(
        INJECTION_TOKEN_METADATA_KEY,
        descriptors,
        target,
        propertyKey
      );
    } else {
      Reflect.defineMetadata(INJECTION_TOKEN_METADATA_KEY, descriptors, target);
    }
  };
}
