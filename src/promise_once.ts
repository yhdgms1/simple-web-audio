type PromiseOnceFunctionWrapper<T> = {
  (): Promise<T>;

  value: null | T;
  promise: Promise<T>;
};

const promiseOnce = <T>(fn: () => Promise<T>) => {
  let called = false;

  const { promise, resolve } = Promise.withResolvers<T>();

  const wrapper: PromiseOnceFunctionWrapper<T> = () => {
    if (called) {
      return promise;
    }

    called = true;
    fn().then(resolve);

    return promise;
  };

  wrapper.value = null;
  wrapper.promise = promise;

  promise.then((value) => {
    wrapper.value = value;
  });

  return wrapper;
}

export { promiseOnce }
export type { PromiseOnceFunctionWrapper }