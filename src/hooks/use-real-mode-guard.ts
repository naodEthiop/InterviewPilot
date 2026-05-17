import { useCallback, useEffect, useRef } from "react";

export type IntegrityKind =
  | "tab_switch"
  | "fullscreen_exit"
  | "blocked_devtools";

type Options = {
  enabled: boolean;
  /** After user entered fullscreen gate */
  fullscreenArmed: boolean;
  onViolation: (kind: IntegrityKind) => void;
};

export function useRealModeGuard({ enabled, fullscreenArmed, onViolation }: Options) {
  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;
  const lastFireRef = useRef(0);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visHiddenRef = useRef(false);

  const fire = useCallback((kind: IntegrityKind) => {
    const t = Date.now();
    if (t - lastFireRef.current < 1000) return;
    lastFireRef.current = t;
    onViolationRef.current(kind);
  }, []);

  const requestFullscreen = useCallback(async () => {
    const el = document.documentElement;
    if (!el.requestFullscreen) return false;
    try {
      await el.requestFullscreen();
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        visHiddenRef.current = true;
        fire("tab_switch");
      } else {
        visHiddenRef.current = false;
      }
    };

    const onBlur = () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      blurTimerRef.current = setTimeout(() => {
        if (!visHiddenRef.current) fire("tab_switch");
      }, 500);
    };

    const onFocus = () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    };

    const onFullscreenChange = () => {
      if (!fullscreenArmed) return;
      if (!document.fullscreenElement) fire("fullscreen_exit");
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault();
        fire("blocked_devtools");
        return;
      }
      if (e.key === "PrintScreen") {
        e.preventDefault();
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      const k = e.key.toLowerCase();
      if (
        k === "c" ||
        k === "v" ||
        k === "x" ||
        k === "a" ||
        k === "u" ||
        k === "p" ||
        k === "s"
      ) {
        e.preventDefault();
        return;
      }
      if (e.shiftKey && (k === "i" || k === "j" || k === "c")) {
        e.preventDefault();
        fire("blocked_devtools");
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("paste", onPaste, true);
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("paste", onPaste, true);
      document.removeEventListener("keydown", onKeyDown, true);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, [enabled, fullscreenArmed, fire]);

  return { requestFullscreen };
}
