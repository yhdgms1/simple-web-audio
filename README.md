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

## Изменение громкости

Изменить громкость можно во время запуска функции createAudio, но также существует возможность изменять громкость во время исполнения.

```ts
const audio = createAudio({
  src: './path-to-music.weba',
  volume: 0.5
});

try {
  audio.volume = 0.25;
} catch (error) {
  console.log(error)
}

audio.play().then(() => {
  audio.volume = 0.25;
})
```

Но менять громкость можно только после запуска воспроизведения аудио.