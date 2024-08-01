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
