import { create } from "zustand";

const TOAST_MS = 2600;
// Module-level, NOT state. Replaces the per-page useRef timer; same semantics.
let toastTimer: ReturnType<typeof setTimeout> | undefined;

interface UiState {
  toast: string;
  drawerOpen: boolean;
  loginOpen: boolean;
  passwordOpen: boolean;
  newSessionOpen: boolean;

  showToast: (msg: string) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  openLogin: () => void;
  closeLogin: () => void;
  openPassword: () => void;
  closePassword: () => void;
  openNewSession: () => void;
  closeNewSession: () => void;
  closeOverlays: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  toast: "",
  drawerOpen: false,
  loginOpen: false,
  passwordOpen: false,
  newSessionOpen: false,

  // Same order as the original: set → clear previous timer → start new timer.
  showToast: (msg) => {
    set({ toast: msg });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: "" }), TOAST_MS);
  },
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
  openLogin: () => set({ loginOpen: true }),
  closeLogin: () => set({ loginOpen: false }),
  openPassword: () => set({ passwordOpen: true }),
  closePassword: () => set({ passwordOpen: false }),
  openNewSession: () => set({ newSessionOpen: true }),
  closeNewSession: () => set({ newSessionOpen: false }),
  closeOverlays: () =>
    set({
      drawerOpen: false,
      loginOpen: false,
      passwordOpen: false,
      newSessionOpen: false,
    }),
}));

/** Stable reference (actions are created once). Use instead of passing onToast around. */
export const useToast = () => useUiStore((s) => s.showToast);

