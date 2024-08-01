/**
 * Primitive memo key-based wrapper.
 * 
 * This memoization function wraps an asynchronous function and caches its result
 * based on a unique key. If the function has already been called with the same
 * key, the cached result (a promise) will be returned instead of invoking the
 * function again.
 * 
 * @warning
 * This cache implementation does not handle promise rejections. If the provided
 * function's promise is rejected, the rejection will be cached, and any subsequent
 * calls with the same key will return the same rejected promise.
 */
const createMemo = <T>() => {
  const cache = new Map<string, Promise<T>>()

  return (key: string, fn: () => Promise<T>) => {
    return () => {
      const preserved = cache.get(key);

      if (preserved) {
        return preserved;
      }

      const promise = fn();

      cache.set(key, promise);

      return promise;
    }
  }
}

export { createMemo }