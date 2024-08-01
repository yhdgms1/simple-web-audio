# simple-web-audio

Простая обёртка над Web Audio API. На Android не будет уведомления при проигрывании аудио.

Некоторые браузеры показывают предупреждение лишь при создании AudioContext до взаимодействия пользователя. В этом пакете перед созданием аудио контекста происходит ожидания нажатия куда-либо на экран.

## Использование

```ts
import { createAudio } from 'simple-web-audio';

const audio = createAudio({
  src: './path-to-music.ogg',
  loop: true,
  volume: 0.25
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
```

### Выключить при закрытии страницы

```ts
// Можно брать из localStorage
let state: "unmuted" | "muted" = "unmuted"

button.addEventListener('click', () => {
  if (audio.playing) {
    audio.pause()
    button.textContent = 'Play'
    state = 'muted'
  } else {
    audio.play();
    button.textContent = 'Pause'
    state = 'unmuted'
  }
})

let status: "idle" | "focused" | "blurred" = "idle";

if (status === 'idle' && !audio.playing && state === 'unmuted') {
  audio.play();
}

addEventListener('focus', () => {
  if (status === 'blurred' && !audio.playing && state === 'unmuted') {
    audio.play()
  }

  status = 'focused';
});

addEventListener('blur', () => {
  if (audio.playing) {
    audio.pause();
  }

  status = 'blurred';
});
```