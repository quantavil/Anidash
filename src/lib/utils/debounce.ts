// ─── Debounce with flush & cancel ───

export interface DebouncedFn<T extends (...args: never[]) => unknown> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
  pending: () => boolean;
}

export function debounce<T extends (...args: never[]) => unknown>(
  fn: T,
  delayMs: number,
): DebouncedFn<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latestArgs: Parameters<T> | null = null;

  function debounced(...args: Parameters<T>) {
    latestArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (latestArgs !== null) {
        fn(...latestArgs);
        latestArgs = null;
      }
    }, delayMs);
  }

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      latestArgs = null;
    }
  };

  debounced.flush = () => {
    if (timer && latestArgs !== null) {
      clearTimeout(timer);
      timer = null;
      fn(...latestArgs);
      latestArgs = null;
    }
  };

  debounced.pending = () => timer !== null;

  return debounced;
}
