import { waitForInteraction } from "./wait_for_interaction";
import { registerEventListeners } from './browser-events';
import { createQueue } from './queue';
import { cachedPromise } from './cached-promise';
import { noop } from "./noop";

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

type OnEndedCallback = (this: AudioScheduledSourceNode, e: Event) => void;

const createAudio = (options: AudioOptions) => {
  let audioContext: AudioContext;
  let gainNode: GainNode;
  let bufferSource: AudioBufferSourceNode;
  let arrayBuffer: ArrayBuffer;
  let audioBuffer: AudioBuffer;

  let onEnded: OnEndedCallback = noop;

  const onBufferSourceEnded: OnEndedCallback = function(event) {
    onEnded.call(this, event);

    bufferSource.onended = null;
  }

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

    bufferSource.onended = onBufferSourceEnded;
  }

  const fetchArrayBuffer = cachedPromise(async () => {
    arrayBuffer = await fetch(options.src).then(res => res.arrayBuffer());
  })

  const decodeAudioData = async () => {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  }

  const connectSources = () => {
    if (bufferSource.buffer === null) {
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
    decodeAudioData,
    connectSources,
  ]);

  /**
   * Will resume when focus or not
   */
  let resume = false;

  const unregister = registerEventListeners({
    focus: () => {
      if (!options.pauseOnBlur || !resume) return;

      resume = false;

      queue.queue.push(playAudio);
      queue.execute()
    },
    blur: () => {
      if (!options.pauseOnBlur || !state.playing) return;

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
    if (audioContext.state === "suspended" && queue.queue.at(-1) === playAudio) {
      queue.queue.pop();
    }

    if (audioContext.state === "running") {
      await audioContext.suspend();

      state.playing = false;
    }
  }

  const disconnectAudio = async () => {
    bufferSource.disconnect();

    /**
     * Reset `started` value
     * That will make `source.start()` call when `play()` will be called
     */
    state.started = false;
  }

  if (options.autoplay) {
    queue.queue.push(playAudio)
    queue.execute()
  }

  return {
    /**
     * Play
     */
    async play() {
      if (state.destroyed) return;
      
      queue.queue.push(playAudio);

      return queue.execute();
    },
    /**
     * Pause
     */
    async pause() {
      if (state.destroyed) return;
      
      queue.queue.push(pauseAudio);

      return queue.execute();
    },
    /**
     * Reset
     */
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
    /**
     * Stop
     */
    async stop() {
      queue.queue.push(
        pauseAudio,
        disconnectAudio,
        createBufferSource,
        connectSources
      );

      return queue.execute();
    },
    /**
     * Destroy
     */
    async destroy() {
      if (state.destroyed) return;

      unregister();

      queue.queue.push(
        pauseAudio,
        disconnectAudio
      );

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
    /**
     * Set's callback once, overriding previous one
     * @param cb Callback function
     */
    onEnded(cb: OnEndedCallback) {
      onEnded = cb;
    },
    /**
     * Is currently playing
     */
    get playing() {
      return state.playing;
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
  }
};

export { createAudio };
export type { AudioOptions }