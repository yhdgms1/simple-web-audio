import pLimit from 'p-limit';

type Thenable<T> = T | Promise<T>;
type Queue = (() => Thenable<void>)[]

const createQueue = (queue: Queue, stopped = false) => {
  const limit = pLimit(1);

  const run = async () => {
    const items = queue.slice();

    for await (const item of items) {
      if (stopped) break;

      await item();
    }

    queue = queue.filter(item => !items.includes(item));
    stopped = false;
  };

  return {
    get queue() {
      return queue;
    },
    set queue(value) {
      queue = value;
    },
    stop() {
      stopped = true;
    },
    execute: () => {
      return limit(run);
    }
  }
}

export { createQueue }
export type { Queue }