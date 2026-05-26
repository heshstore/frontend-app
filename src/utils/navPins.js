export const PINS_KEY = 'saachu_pins';

export function loadPins() {
  try { return JSON.parse(localStorage.getItem(PINS_KEY) || '[]'); } catch { return []; }
}

export function savePins(pins) {
  localStorage.setItem(PINS_KEY, JSON.stringify(pins));
  // Notify same-tab listeners (storage event only fires in OTHER tabs)
  window.dispatchEvent(new CustomEvent('saachu-pins-updated'));
}
