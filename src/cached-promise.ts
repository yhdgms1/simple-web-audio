type CachedPromise<T> = () => Promise<T>;

const cachedPromise = <T>(fn: () => Promise<T>) => {
  let called = false;
  let { promise, resolve } = Promise.withResolvers<T>();

  const wrapper: CachedPromise<T> = () => {
    if (!called) {
      called = true;
      fn().then(resolve);  
    }

    return promise;
  };

  return wrapper;
}

export { cachedPromise }
export type { CachedPromise }