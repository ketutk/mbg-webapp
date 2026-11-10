type Listener = () => void;

let message = "";
const listeners = new Set<Listener>();
let timer: ReturnType<typeof setTimeout>;

export const toast = {
  show(msg: string, ms = 2600) {
    message = msg;
    listeners.forEach((l) => l());
    clearTimeout(timer);
    timer = setTimeout(() => {
      message = "";
      listeners.forEach((l) => l());
    }, ms);
  },
  subscribe: (l: Listener) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => message,
};

