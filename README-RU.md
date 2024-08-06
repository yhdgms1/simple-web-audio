# simple-web-audio

Простая обёртка над Web Audio API

## Использование

```ts
import { createAudio } from 'simple-web-audio';

const audio = createAudio({
  src: './path-to-music.ogg',
  loop: true,
  volume: 0.25,
  pauseOnBlur: true
});

/**
 * Играть
 */
audio.play().then(() => {
  console.log(audio.playing) // true
})

/**
 * На паузу
 */
audio.pause().then(() => {
  console.log(audio.playing) // false
})

/**
 * Остановить. При запуске будет играть с начала
 */
audio.stop()

/**
 * Остановит аудио, уберёт все слушатели событий
 * Включить заного будет невозможно
 */
audio.destroy()

/**
 * Предзагрузка
 */
audio.fetch().then(() => {
  console.log('Аудио загружено')
})
```

## Пользовательские эффекты

Вы должны предоставить функцию, которая будет получать `AudioContext` и `GainNode`. Функция должна возвращать AudioNode, который будет подключен к источнику звука. Подробнее о применении эффектов читайте здесь: https://web.dev/patterns/media/audio-effects

В этом примере мы используем библиотеку Tuna для применения некоторых эффектов. Обратите внимание на то, что возвращается

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
 * Без эффектов
 */
const audio = createAudio({
  src: './path-to-music.weba',
  extendAudioGraph: ({ node }) => {
    return node;
  }
});
```

## Изменение громкости

Изменить громкость можно во время запуска функции `createAudio`, но также существует возможность изменять громкость во время исполнения.

```ts
const audio = createAudio({
  src: './path-to-music.weba',
  volume: 0.5
});

audio.volume = 0.25;
```