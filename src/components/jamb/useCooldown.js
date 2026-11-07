/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";

import { JAMB_COOLDOWN_MS, formatHMS, formatShort } from "../../helpers/jambConfig";

/**
 * Live countdown to `until` (epoch ms). Date-based, so it stays correct after
 * backgrounding. Calls onExpire() once when the timer reaches zero.
 *   tickMs: 1000 for a HH:MM:SS display, larger for "5h 12m" displays.
 */
export const useCooldown = (until, onExpire, tickMs = 1000) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setNow(Date.now());
    if (!until || until <= Date.now()) return undefined;

    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= until) {
        clearInterval(id);
        onExpire?.();
      }
    }, tickMs);

    return () => clearInterval(id);
  }, [until]);

  const remaining = Math.max((until ?? 0) - now, 0);
  return {
    active: remaining > 0,
    remaining,
    hms: formatHMS(remaining),
    short: formatShort(remaining),
    progress: remaining > 0 ? Math.min(Math.max(1 - remaining / JAMB_COOLDOWN_MS, 0), 1) : 1,
  };
};

export default useCooldown;
