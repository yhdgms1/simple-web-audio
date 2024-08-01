import pLimit from 'p-limit';

type Thenable<T> = T | Promise<T>;
type Queue = (() => Thenable<void>)[]

const createQueue = (queue: Queue) => {
  const limit = pLimit(1);

  const run = async () => {
    const items = queue.slice();

    for await (const item of items) {
      await item();
    }

    queue = queue.filter(item => !items.includes(item));
  };

  return {
    get queue() {
      return queue;
    },
    set queue(value) {
      queue = value;
    },
    execute: () => {
      return limit(run);
    }
  }
}

export { createQueue }
export type { Queue }