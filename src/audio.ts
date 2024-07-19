import { promiseOnce } from "./promise_once";
import { waitForInteraction } from "./wait_for_interaction";

type AudioOptions = {
  /**
   * Source
   */
  src: string;
  /**
   * Loop
   */
  loop: boolean;
};

const createAudio = (options: AudioOptions) => {
  const getAudioContext = promiseOnce(async () => {
    await waitForInteraction();

    return new AudioContext();
  });

  const getGainNode = promiseOnce(async () => {
    const context = await getAudioContext();

    const gainNode = context.createGain();

    gainNode.connect(context.destination);

    return gainNode;
  });

  const getBufferSource = promiseOnce(async () => {
    const context = await getAudioContext();
    const source = context.createBufferSource();

    source.loop = options.loop;

    return source;
  });

  const fetchArrayBuffer = promiseOnce(async () => {
    const response = await fetch(options.src);

    return await response.arrayBuffer();
  });

  const load = promiseOnce(async () => {
    const arrayBuffer = await fetchArrayBuffer();
    const context = await getAudioContext();

    const audioData = await context.decodeAudioData(arrayBuffer);

    const source = await getBufferSource();
    const gainNode = await getGainNode();

    source.buffer = audioData;
    source.connect(gainNode);
  });

  const state = {
    started: false,
    playing: false,
  };

  const instance = {
    async play() {
      const context = await getAudioContext();
      const source = await getBufferSource();

      await load();

      if (context.state === "suspended") {
        await context.resume();

        if (state.started) {
          state.playing = true;
        }
      }

      if (!state.started) {
        source.start();

        state.started = true;
        state.playing = true;
      }
    },
    async pause() {
      const context = await getAudioContext();

      if (context.state === "running") {
        await context.suspend();

        state.playing = false;
      }
    },
    on: {
      async setup() {
        await getGainNode.promise;
      },
      async fetch() {
        await fetchArrayBuffer.promise;
      },
      async load() {
        await load.promise;
      }
    },
    actions: {
      /**
       * 1-st step of initialization. AudioContext is initialized
       */
      async setup() {
        await getAudioContext();
        await getGainNode();
        await getBufferSource();
      },
      /**
       * 2-nd step of initialization. Audio fetched
       */
      async fetch() {
        await fetchArrayBuffer();
      },
      /**
       * 3-rd step of initialization. Audio decoded and ready to play
       */
      async load() {
        await load();
      },
    },
    /**
     * Is currently playing
     */
    get playing() {
      return state.playing;
    },
    /**
     * Volume
     */
    get volume() {
      if (getGainNode.value) {
        return getGainNode.value.gain.value;
      }

      return 1;
    },
    set volume(value: number) {
      if (getGainNode.value) {
        getGainNode.value.gain.value = value;

        return;
      }

      getGainNode().then((gainNode) => {
        gainNode.gain.value = value;
      });
    }
  };

  return instance;
};

export { createAudio };
export type { AudioOptions }