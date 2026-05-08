// Tiny global event emitter — no React dependency, callable from anywhere.
const listeners = new Set();

function emit(type, message, duration) {
  const id = Date.now() + Math.random();
  listeners.forEach(fn => fn({ id, type, message, duration }));
}

export const toast = {
  success: (msg, duration = 3000)  => emit('success', msg, duration),
  error:   (msg, duration = 4500)  => emit('error',   msg, duration),
  info:    (msg, duration = 3000)  => emit('info',    msg, duration),
  warn:    (msg, duration = 4000)  => emit('warn',    msg, duration),
  _subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
};
