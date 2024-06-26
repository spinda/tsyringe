import DependencyContainer from "../types/dependency-container";
import FactoryFunction from "./factory-function";

export default function instancePerContainerCachingFactory<T>(
  factoryFunc: FactoryFunction<T>
): FactoryFunction<T> {
  const cache = new WeakMap<DependencyContainer, T>();
  return async (dependencyContainer: DependencyContainer) => {
    let instance = cache.get(dependencyContainer);
    if (instance == undefined) {
      instance = await factoryFunc(dependencyContainer);
      cache.set(dependencyContainer, instance);
    }
    return instance;
  };
}
