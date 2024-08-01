import { waitForInteraction } from "./wait_for_interaction";
import { registerEventListeners } from './browser-events';
import pLimit from 'p-limit';

type AudioOptions = {
  /**
   * Source
   */
  src: string;
  /**
   * Loop
   */
  loop: boolean;
  /**
   * Volume
   */
  volume: number;
};

const createAudio = (options: AudioOptions) => {
  let audioContext: AudioContext;
  let gainNode: GainNode;
  let bufferSource: AudioBufferSourceNode;
  let arrayBuffer: ArrayBuffer;
  let audioBuffer: AudioBuffer;

  const createAudioContext = () => {
    audioContext = new AudioContext({
      sampleRate: 44100
    })
  }

  const createGainNode = () => {
    gainNode = audioContext.createGain();
    gainNode.gain.value = options.volume;
    gainNode.connect(audioContext.destination);
  }

  const createBufferSource = () => {
    bufferSource = audioContext.createBufferSource();
    bufferSource.loop = options.loop;
  }

  const fetchArrayBuffer = async () => {
    arrayBuffer = await fetch(options.src).then(res => res.arrayBuffer());
  }

  const decodeAudioData = async () => {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  }

  const connectSources = () => {
    if (bufferSource.buffer === null) {
      bufferSource.buffer = audioBuffer;
      bufferSource.connect(gainNode);
    }
  }

  let queue = [
    waitForInteraction,
    createAudioContext,
    createGainNode,
    createBufferSource,
    fetchArrayBuffer,
    decodeAudioData,
    connectSources
  ];

  const limit = pLimit(1);

  const run = async () => {
    const items = queue.slice();

    for await (const item of items) {
      await item();
    }

    queue = queue.filter(item => !items.includes(item));
  };

  const unregister = registerEventListeners({
    focus: () => {
      queue.push(playAudio);
      limit(run)
    },
    blur: () => {
      queue.push(pauseAudio);
      limit(run)
    }
  });

  unregister;

  const state = {
    started: false,
    playing: false,
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
    if (audioContext.state === "suspended" && queue.at(-1) === playAudio) {
      queue.pop();
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

  const instance = {
    async play() {
      queue.push(playAudio);
      run()
    },
    async pause() {
      queue.push(pauseAudio);
      run()
    },
    async reset() {
      const playing = state.playing;

      if (playing) {
        queue.push(pauseAudio)
      }

      queue.push(
        disconnectAudio,
        createBufferSource,
        connectSources
      );

      if (playing) {
        queue.push(playAudio)
      }

      limit(run)
    },
    /**
     * Is currently playing
     */
    get playing() {
      return state.playing;
    },
    run: () => limit(run),
  };

  return instance;
};

export { createAudio };
export type { AudioOptions }