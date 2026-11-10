import { useState, useEffect, useRef } from "react";
import type { TrackingSession } from "../../types/index";

export function useTrackingTimer(
  trackingSession: TrackingSession | null,
): number {
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const timerRef = useRef<number | undefined>(undefined);

  // setElapsedSecs(0) はトラッキングセッション終了時のリセット。同期呈示必須の終了処理であり、cascading renderの実害なし。
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (trackingSession) {
      timerRef.current = setInterval(
        () =>
          setElapsedSecs(
            Math.floor(
              (Date.now() - new Date(trackingSession.startedAt).getTime()) /
                1000,
            ),
          ),
        1000,
      ) as unknown as number;
    } else {
      clearInterval(timerRef.current);
      setElapsedSecs(0);
    }
    return () => clearInterval(timerRef.current);
  }, [trackingSession]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return elapsedSecs;
}
