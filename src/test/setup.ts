import 'fake-indexeddb/auto';

// Lingkungan Node tidak punya `matchMedia`/`Notification`; sebagian modul
// memeriksa keberadaannya dengan aman, jadi cukup sediakan stub minimal.
if (typeof globalThis.matchMedia !== 'function') {
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof globalThis.matchMedia;
}
