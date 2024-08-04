import type { AudioInstance } from "./types";
import { waitForInteraction } from "./wait_for_interaction";
import { registerEventListeners } from './browser-events';
import { createQueue } from './queue';
import { createMemo } from './memo';

const fetcherMemo = createMemo<ArrayBuffer | void>();
const decoderMemo = createMemo<AudioBuffer | void>();

type ExtendAudioGraphOptions = {
  context: AudioContext;
  node: GainNode;
}

type AudioNodeLike = {
  connect: ((destinationNode: AudioNode) => void);
}

type ExtendAudioGraph = (options: ExtendAudioGraphOptions) => AudioNode | AudioNodeLike;

type AudioOptions = {
  /**
   * Source
   */
  src: string;
  /**
   * Loop
   * @default false
   */
  loop?: boolean;
  /**
   * Volume
   * @default 1
   */
  volume?: number;
  /**
   * Will pause playing on blur event, play on focus.
   * @default false
   */
  pauseOnBlur?: boolean;
  /**
   * @default false
   */
  autoplay?: boolean;
  /**
   * Function to extend audio "graph"
   */
  extendAudioGraph?: ExtendAudioGraph;
};

const createAudio = (options: AudioOptions) => {
  let audioContext: AudioContext;
  let gainNode: GainNode;
  let bufferSource: AudioBufferSourceNode;
  let arrayBuffer: ArrayBuffer;
  let audioBuffer: AudioBuffer;

  const createAudioContext = () => {
    audioContext = new AudioContext()
  }

  const createGainNode = () => {
    gainNode = audioContext.createGain();
    gainNode.gain.value = options.volume || 1;

    const extendAudioGraph = options.extendAudioGraph || (() => gainNode);

    const node = extendAudioGraph({
      context: audioContext,
      node: gainNode
    });

    node.connect(audioContext.destination);
  }

  const createBufferSource = () => {
    bufferSource = audioContext.createBufferSource();
    bufferSource.loop = options.loop || false;
  }

  const fetchArrayBuffer = fetcherMemo(options.src, async () => {
    try {
      return await fetch(options.src).then(res => res.arrayBuffer());
    } catch {
      /**
       * Firstly prevent next queue items from running because they depend on previous items
       * Then destroy audio because there is no reason to try run it over and over again
       */
      queue.stop();
      instance.destroy();
    }
  });

  const setArrayBuffer = async () => {
    arrayBuffer = (await fetchArrayBuffer())!;
  }

  const decodeAudioData = decoderMemo(options.src, async () => {
    return audioContext.decodeAudioData(arrayBuffer);
  })

  const setAudioData = async () => {
    audioBuffer = (await decodeAudioData())!;
  }

  const connectSources = () => {
    if (bufferSource && bufferSource.buffer === null) {
      bufferSource.buffer = audioBuffer;
      bufferSource.connect(gainNode);
    }
  }

  const queue = createQueue([
    waitForInteraction,
    createAudioContext,
    createGainNode,
    createBufferSource,
    fetchArrayBuffer,
    setArrayBuffer,
    decodeAudioData,
    setAudioData,
    connectSources,
  ]);

  /**
   * Will resume when focus or not
   */
  let resume = false;

  const unregister = registerEventListeners({
    focus: () => {
      if (!options.pauseOnBlur || !resume || state.destroyed) return;

      resume = false;

      queue.queue.push(playAudio);
      queue.execute()
    },
    blur: () => {
      if (!options.pauseOnBlur || !state.playing || state.destroyed) return;

      resume = true;

      queue.queue.push(pauseAudio);
      queue.execute()
    }
  });

  const state = {
    started: false,
    playing: false,
    destroyed: false
  };

  const playAudio = async () => {
    if (state.destroyed) return;

    if (audioContext.state === "suspended") {
      await audioContext.resume();

      if (state.started) {
        state.playing = true;
      }
    }

    if (!state.started) {
      bufferSource.start();

      state.started = true;
      state.playing = true;
    }
  }

  const pauseAudio = async () => {
    if (state.destroyed) return;
    
    if (audioContext.state === "suspended" && queue.queue.at(-1) === playAudio) {
      queue.queue.pop();
    }

    if (audioContext.state === "running") {
      await audioContext.suspend();

      state.playing = false;
    }
  }

  const disconnectAudio = async () => {
    bufferSource && bufferSource.disconnect();

    /**
     * Reset `started` value
     * That will make `source.start()` call when `play()` will be called
     */
    state.started = false;
  }

  const instance = {
    async play() {
      if (state.destroyed) return;
      
      queue.queue.push(playAudio);

      return queue.execute();
    },
    async pause() {
      if (state.destroyed) return;
      
      queue.queue.push(pauseAudio);

      return queue.execute();
    },
    async reset() {
      if (state.destroyed) return;

      if (state.playing) {
        queue.queue.push(pauseAudio)
      }

      queue.queue.push(
        disconnectAudio,
        createBufferSource,
        connectSources
      );

      if (state.playing) {
        queue.queue.push(playAudio)
      }

      return queue.execute();
    },
    async stop() {
      if (state.destroyed) return;

      queue.queue.push(
        pauseAudio,
        disconnectAudio,
        createBufferSource,
        connectSources
      );

      return queue.execute();
    },
    async destroy() {
      if (state.destroyed) return;

      unregister();

      queue.queue = [
        pauseAudio,
        disconnectAudio
      ];

      await queue.execute();

      state.destroyed = true;

      // @ts-expect-error
      audioContext = null;
      // @ts-expect-error
      gainNode = null;
      // @ts-expect-error
      bufferSource = null;
      // @ts-expect-error
      arrayBuffer = null;
      // @ts-expect-error
      audioBuffer = null;
    },
    async fetch() {
      if (state.destroyed) return;

      await fetchArrayBuffer();
    },
    get playing() {
      return state.playing;
    },
    get destroyed() {
      return state.destroyed;
    },
    get volume() {
      return gainNode.gain.value;
    },
    set volume(value) {
      gainNode.gain.value = value;
    },
    get loop() {
      return bufferSource.loop;
    },
    set loop(value) {
      bufferSource.loop = value;
    }
  } satisfies AudioInstance;

  if (options.autoplay) {
    queue.queue.push(playAudio)
    queue.execute()
  }

  return instance;
};

const prefetchAudio = (src: string) => {
  const fetcher = fetcherMemo(src, () => fetch(src).then(res => res.arrayBuffer()));

  return fetcher();
}

export { prefetchAudio, createAudio };
export type { AudioOptions }