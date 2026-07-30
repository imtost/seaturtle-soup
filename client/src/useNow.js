import { useEffect, useState } from "react";

// Ticks so components can re-check "how long ago was this" without each
// item needing its own timer (e.g. a "NEW" badge that expires after 10s).
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
