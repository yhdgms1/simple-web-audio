import { waitForInteraction } from "./wait_for_interaction";
import { registerEventListeners } from './browser-events';
import { createQueue } from './queue';

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
    gainNode.gain.value = options.volume || 1;
    gainNode.connect(audioContext.destination);
  }

  const createBufferSource = () => {
    bufferSource = audioContext.createBufferSource();
    bufferSource.loop = options.loop || false;
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

  const queue = createQueue([
    waitForInteraction,
    createAudioContext,
    createGainNode,
    createBufferSource,
    fetchArrayBuffer,
    decodeAudioData,
    connectSources
  ])

  const unregister = registerEventListeners({
    focus: () => {
      // todo: check for paused state. i.e. do not play sound on focus when sound was paused manually
      if (options.pauseOnBlur) {
        queue.queue.push(playAudio);
        queue.execute()
      }
    },
    blur: () => {
      if (options.pauseOnBlur) {
        queue.queue.push(pauseAudio);
        queue.execute()
      }
    }
  });

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

  return {
    play() {
      queue.queue.push(playAudio);

      return queue.execute();
    },
    pause() {
      queue.queue.push(pauseAudio);

      return queue.execute();
    },
    async reset() {
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
     * Is currently playing
     */
    get playing() {
      return state.playing;
    },
    async destroy() {
      unregister();

      queue.queue.push(
        pauseAudio,
        disconnectAudio
      );

      await queue.execute();

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
    }
  }
};

export { createAudio };
export type { AudioOptions }