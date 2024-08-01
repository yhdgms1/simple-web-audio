# simple-web-audio

Простая обёртка над Web Audio API. Цель пакета — сделать так, чтобы на Android не было уведомления при проигрывании аудио.

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
 * Включить
 */
audio.play().then(() => {
  /**
   * Играет или нет
   */
  console.log(audio.playing) // true
})

/**
 * Выключить
 */
audio.pause().then(() => {
  /**
   * Играет или нет
   */
  console.log(audio.playing) // false
})

/**
 * Предзагрузка
 */
audio.fetch().then(() => {
  console.log('Аудио загружено')
})
```

## События

Есть событие окончания музыки. Срабатывает в случае если параметр `loop` установлен в значение `false`.

```ts
import { createAudio } from 'simple-web-audio';

const audio = createAudio({
  src: './path-to-music.weba',
});

audio.onEnded((event) => {
  console.log('Конец трека, ', event);
})
```

## Пользовательские эффекты

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