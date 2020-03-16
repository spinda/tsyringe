import constructor from "../types/constructor";
import Transform from "../types/transform";

type InjectionToken<T = any> = constructor<T> | string | symbol;

export function isNormalToken(
  token?: InjectionToken<any>
): token is string | symbol {
  return typeof token === "string" || typeof token === "symbol";
}

export function isTokenDescriptor(
  descriptor: any
): descriptor is TokenDescriptor {
  return (
    typeof descriptor === "object" &&
    "token" in descriptor &&
    "multiple" in descriptor
  );
}

export function isTransformDescriptor(
  descriptor: any
): descriptor is TransformDescriptor {
  return (
    typeof descriptor === "object" &&
    "token" in descriptor &&
    "transform" in descriptor
  );
}

export function isConstructorToken(
  token?: InjectionToken<any>
): token is constructor<any> {
  return typeof token === "function";
}

export interface TokenDescriptor {
  token: InjectionToken<any>;
  multiple: boolean;
}

export interface TransformDescriptor {
  token: InjectionToken<any>;
  transform: InjectionToken<Transform<any, any>>;
  transformArgs: any[];
}

export default InjectionToken;
