import { useEffect, useMemo, useRef, useState } from "react";

export type UseInterviewTimerOptions = {
  startedAt: string | null | undefined;
  limitSec: number;
  onExpire?: () => void;
  enabled?: boolean;
};

export function useInterviewTimer({
  startedAt,
  limitSec,
  onExpire,
  enabled = true,
}: UseInterviewTimerOptions) {
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!enabled || !startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [enabled, startedAt]);

  const { remainingSec, percent, warning, expired } = useMemo(() => {
    if (!startedAt || !enabled) {
      return { remainingSec: limitSec, percent: 100, warning: false, expired: false };
    }
    const start = new Date(startedAt).getTime();
    const elapsed = Math.max(0, (now - start) / 1000);
    const rem = Math.max(0, limitSec - elapsed);
    const pct = limitSec > 0 ? Math.min(100, (rem / limitSec) * 100) : 0;
    const warn = rem > 0 && rem <= 60;
    const exp = rem <= 0;
    return { remainingSec: rem, percent: pct, warning: warn, expired: exp };
  }, [startedAt, limitSec, now, enabled]);

  useEffect(() => {
    if (!enabled || !startedAt || expired === false || firedRef.current) return;
    firedRef.current = true;
    onExpireRef.current?.();
  }, [enabled, startedAt, expired]);

  return {
    remainingSec,
    percent,
    warning,
    expired,
    mmss: formatMmSs(remainingSec),
  };
}

function formatMmSs(totalSec: number) {
  const s = Math.floor(Math.max(0, totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
