import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import jambService from "../../services/jambService";

/**
 * Loads the round/history summary (average prediction, rounds, current round)
 * and refreshes it every time the screen gains focus.
 */
export const useJambSummary = () => {
  const [summary, setSummary] = useState(null);

  const refresh = useCallback(async () => {
    const next = await jambService.getSummary();
    setSummary(next);
    return next;
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { summary, refresh };
};

export default useJambSummary;
