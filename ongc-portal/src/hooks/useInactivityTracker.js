import { useState, useEffect, useRef, useCallback } from "react";

const INACTIVITY_LIMIT = 10 * 60 * 1000;
const WARNING_BEFORE = 60 * 1000;
const DEBOUNCE_MS = 2000;

export function useInactivityTracker(onLogout) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const timerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const lastResetRef = useRef(0);
  const enabled = typeof onLogout === "function";

  const clearAllTimers = useCallback(() => {
    clearTimeout(timerRef.current);
    clearTimeout(warningTimerRef.current);
    clearInterval(countdownRef.current);
  }, []);

  const reset = useCallback(() => {
    const now = Date.now();
    if (now - lastResetRef.current < DEBOUNCE_MS) return;

    if (lastResetRef.current > 0 && now - lastResetRef.current >= INACTIVITY_LIMIT && enabled) {
      clearAllTimers();
      onLogout();
      return;
    }

    lastResetRef.current = now;

    clearAllTimers();
    setShowWarning(false);

    if (!enabled) return;

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(60);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearAllTimers();
            onLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, INACTIVITY_LIMIT - WARNING_BEFORE);
  }, [clearAllTimers, onLogout, enabled]);

  const extendSession = useCallback(() => {
    lastResetRef.current = 0;
    reset();
  }, [reset]);

  useEffect(() => {
    reset();
    if (!enabled) return;
    const events = ["mousemove", "mousedown", "click", "keydown", "scroll", "touchstart", "wheel"];
    const handler = () => reset();
    events.forEach(ev => window.addEventListener(ev, handler, { passive: true }));
    return () => {
      clearAllTimers();
      events.forEach(ev => window.removeEventListener(ev, handler));
    };
  }, [enabled]);

  return { showWarning, countdown, extendSession };
}
