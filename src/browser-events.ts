type EventHandler<T> = (this: Document, event: T) => void;

type BlurEventHandler = EventHandler<Event>;
type FocusEventHandler = EventHandler<FocusEvent>;

const BLUR_HANDLERS = new Set<BlurEventHandler>();
const FOCUS_HANDLERS = new Set<FocusEventHandler>();

type EventListeners = {
  focus: FocusEventHandler;
  blur: BlurEventHandler;
}

const registerEventListeners = (listeners: EventListeners) => {
  BLUR_HANDLERS.add(listeners.blur);
  FOCUS_HANDLERS.add(listeners.focus);

  return () => {
    BLUR_HANDLERS.delete(listeners.blur);
    FOCUS_HANDLERS.delete(listeners.focus);
  }
}

addEventListener('focus', function (event) {
  for (const handler of FOCUS_HANDLERS) {
    try {
      handler.call(this.document, event);
    } catch {}
  }
});

addEventListener('blur', function (event) {
  for (const handler of BLUR_HANDLERS) {
    try {
      handler.call(this.document, event);
    } catch {}
  }
});

export { registerEventListeners, BLUR_HANDLERS as _BLUR_HANDLERS, FOCUS_HANDLERS as _FOCUS_HANDLERS }
export type { EventHandler, BlurEventHandler, FocusEventHandler, EventListeners }