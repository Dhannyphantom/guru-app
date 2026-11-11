/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";

import { formatHMS, formatShort } from "../../helpers/jambConfig";
import { getCooldownMs, serverNow } from "../../services/jambAdapters";

/**
 * Live countdown to `until` (epoch ms, SERVER time). Uses the server-corrected
 * clock so a wrong device clock can't skip or extend the rest period.
 * Calls onExpire() once when the timer reaches zero (parent should refetch).
 */
export const useCooldown = (until, onExpire, tickMs = 1000) => {
  const [now, setNow] = useState(serverNow());

  useEffect(() => {
    setNow(serverNow());
    if (!until || until <= serverNow()) return undefined;

    const id = setInterval(() => {
      const n = serverNow();
      setNow(n);
      if (n >= until) {
        clearInterval(id);
        onExpire?.();
      }
    }, tickMs);

    return () => clearInterval(id);
  }, [until]);

  const remaining = Math.max((until ?? 0) - now, 0);
  const total = getCooldownMs();
  return {
    active: remaining > 0,
    remaining,
    hms: formatHMS(remaining),
    short: formatShort(remaining),
    progress: remaining > 0 ? Math.min(Math.max(1 - remaining / total, 0), 1) : 1,
  };
};

export default useCooldown;
