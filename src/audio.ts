import type { AudioInstance } from "./types";
import { waitForInteraction } from "./wait_for_interaction";
import { createQueue } from './queue';
import { createMemo } from './memo';

const fetcherMemo = createMemo<ArrayBuffer>();
const decoderMemo = createMemo<AudioBuffer>();

const onEndedOptions: AddEventListenerOptions = {
  once: true,
};

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

  /**
   * Values that pending it's queue to be set
   */
  let pendingVolume = options.volume || 1;
  let pendingLoop = options.loop || false;

  const createAudioContext = () => {
    audioContext = new AudioContext()
  }

  const getGainNode = () => {
    return gainNode;
  }

  const createGainNode = () => {
    gainNode = audioContext.createGain();

    const node = (options.extendAudioGraph || getGainNode)({
      context: audioContext,
      node: gainNode
    });

    node.connect(audioContext.destination);
  }

  const createBufferSource = () => {
    bufferSource = audioContext.createBufferSource();
  }

  const interruptQueueThenDestroy = (cause: Error | unknown) => {
    /**
     * Firstly prevent next queue items from running because they depend on previous items
     * Then destroy audio because there is no reason to try run it over and over again
     */
    queue.stop();
    instance.destroy();

    return new Error('', { cause });
  }

  const fetchArrayBuffer = fetcherMemo(options.src, async () => {
    try {
      return await fetch(options.src).then(response => response.arrayBuffer());
    } catch (error) {
      throw interruptQueueThenDestroy(error);
    }
  });

  const setArrayBuffer = async () => {
    arrayBuffer = await fetchArrayBuffer();
  }

  const decodeAudioData = decoderMemo(options.src, async () => {
    try {
      return await audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      throw interruptQueueThenDestroy(error);
    }
  })

  const setAudioData = async () => {
    audioBuffer = await decodeAudioData();
  }

  const connectSources = () => {
    if (bufferSource && bufferSource.buffer === null) {
      bufferSource.buffer = audioBuffer;
      bufferSource.connect(gainNode);
    }
  }

  const setVolume = () => {
    gainNode.gain.value = pendingVolume;
  }

  const setLoop = () => {
    bufferSource.loop = pendingLoop;
  }

  const queue = createQueue([
    waitForInteraction,
    createAudioContext,
    createGainNode,
    setVolume,
    createBufferSource,
    setLoop,
    fetchArrayBuffer,
    setArrayBuffer,
    decodeAudioData,
    setAudioData,
    connectSources,
  ]);

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
        setLoop,
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
        setLoop,
        connectSources
      );

      return queue.execute();
    },
    async destroy() {
      if (state.destroyed) return;

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
    onEnded: (callback) => {
      if (state.destroyed || !bufferSource) return;
      
      bufferSource.addEventListener('ended', callback, onEndedOptions);
    },
    get playing() {
      return state.playing;
    },
    get destroyed() {
      return state.destroyed;
    },
    get volume() {
      return pendingVolume;
    },
    set volume(value) {
      if (state.destroyed) return;

      pendingVolume = value;
      queue.queue.push(setVolume);
      queue.execute()
    },
    get loop() {
      return pendingLoop;
    },
    set loop(value) {
      if (state.destroyed) return;
     
      pendingLoop = value;
      queue.queue.push(setLoop);
      queue.execute()
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