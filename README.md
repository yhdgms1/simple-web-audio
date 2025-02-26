# simple-web-audio

A simple wrapper over the Web Audio API

## Usage

```ts
import { createAudio } from 'simple-web-audio';

const audio = createAudio({
  src: './path-to-music.ogg',
  loop: true,
  volume: 0.25
});

/**
 * Play
 */
audio.play().then(() => {
  console.log(audio.playing) // true
})

/**
 * Pause
 */
audio.pause().then(() => {
  console.log(audio.playing) // false
})

/**
 * Will stop audio, next play will be from the start
 */
audio.stop()

/**
 * Will stop audio, disable event listeners, it will be impossible to play audio again
 */
audio.destroy()

/**
 * Prefetch
 */
audio.fetch().then(() => {
  console.log('audio is fetched')
})
```

## User Effects

You should provide a function that will get `AudioContext` and a `GainNode`. Function should return node that will be connected to audio source. Read more about applying effects here: https://web.dev/patterns/media/audio-effects

In this example we are using library called Tuna to apply some effects. Pay close attention to what is returned

```ts
import { createAudio } from 'simple-web-audio';
import Tuna from 'tunajs';

const audio = createAudio({
  src: './path-to-music.weba',
  extendAudioGraph: ({ context, node }) => {
    const tuna = new Tuna(context);
    const overdrive = new tuna.Overdrive();

    node.connect(overdrive);

    const bitcrusher = new tuna.Bitcrusher()

    overdrive.connect(bitcrusher)

    return bitcrusher;
  }
});

/**
 * Without Effects
 */
const audio = createAudio({
  src: './path-to-music.weba',
  extendAudioGraph: ({ node }) => {
    return node;
  }
});
```

## Volume Change

You can change the volume during the call of the `createAudio` function, but it is also possible to change the volume during execution.

```ts
const audio = createAudio({
  src: './path-to-music.weba',
  volume: 0.5
});

audio.volume = 0.25;
```
