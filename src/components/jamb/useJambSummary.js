import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import jambService from "../../services/jambService";

/**
 * Loads the round/history summary from the server and refreshes it every time
 * the screen gains focus. Never throws (keeps the last good summary on error).
 */
export const useJambSummary = () => {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const next = await jambService.getSummary();
      setSummary(next);
      setError(null);
      return next;
    } catch (e) {
      setError(e);
      return null;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { summary, refresh, error };
};

export default useJambSummary;
