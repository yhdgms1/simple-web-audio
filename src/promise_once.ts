type PromiseOnceFunctionWrapper<T> = {
  (): Promise<T>;

  fn: () => Promise<T>;

  value: null | T;
  promise: Promise<T>;
};

const promiseOnce = <T>(fn: () => Promise<T>) => {
  let called = false;
  let { promise, resolve } = Promise.withResolvers<T>();

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

  wrapper.fn = fn;

  promise.then((value) => {
    wrapper.value = value;
  });

  return wrapper;
}

export { promiseOnce }
export type { PromiseOnceFunctionWrapper }