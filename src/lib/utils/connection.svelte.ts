// ─── Online/Offline detection (Svelte 5 Runes) ───

function createConnectionStore() {
  let isOnline = $state(true);
  let wasOffline = $state(false);

  if (typeof window !== 'undefined') {
    isOnline = navigator.onLine;

    const onOnline = () => {
      isOnline = true;
      wasOffline = true;
      // Reset after 3 seconds
      setTimeout(() => (wasOffline = false), 3000);
    };

    const onOffline = () => {
      isOnline = false;
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
  }

  return {
    get isOnline() { return isOnline; },
    get wasOffline() { return wasOffline; },
  };
}

export const connection = createConnectionStore();
