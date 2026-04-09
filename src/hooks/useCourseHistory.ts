import { useState, useCallback, useRef } from 'react';

export type HistoryAction = {
  label: string;
  timestamp: number;
};

type HistoryEntry<T> = {
  state: T;
  action: HistoryAction;
};

const MAX_HISTORY = 30;

export function useCourseHistory<T>(initialState: T) {
  const [current, setCurrent] = useState<T>(initialState);
  const historyRef = useRef<HistoryEntry<T>[]>([{ state: initialState, action: { label: 'Start', timestamp: Date.now() } }]);
  const indexRef = useRef(0);

  const pushState = useCallback((newState: T, actionLabel: string) => {
    const history = historyRef.current;
    // Remove any future states if we undid some actions
    historyRef.current = history.slice(0, indexRef.current + 1);
    historyRef.current.push({
      state: newState,
      action: { label: actionLabel, timestamp: Date.now() },
    });
    // Trim to max
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current = historyRef.current.slice(historyRef.current.length - MAX_HISTORY);
    }
    indexRef.current = historyRef.current.length - 1;
    setCurrent(newState);
  }, []);

  const undo = useCallback((): boolean => {
    if (indexRef.current <= 0) return false;
    indexRef.current--;
    setCurrent(historyRef.current[indexRef.current].state);
    return true;
  }, []);

  const redo = useCallback((): boolean => {
    if (indexRef.current >= historyRef.current.length - 1) return false;
    indexRef.current++;
    setCurrent(historyRef.current[indexRef.current].state);
    return true;
  }, []);

  const canUndo = indexRef.current > 0;
  const canRedo = indexRef.current < historyRef.current.length - 1;

  const getRecentActions = useCallback((count = 5): HistoryAction[] => {
    const history = historyRef.current;
    const end = indexRef.current + 1;
    const start = Math.max(1, end - count); // skip index 0 which is 'Start'
    return history.slice(start, end).map(h => h.action).reverse();
  }, []);

  const reset = useCallback((newState: T) => {
    historyRef.current = [{ state: newState, action: { label: 'Start', timestamp: Date.now() } }];
    indexRef.current = 0;
    setCurrent(newState);
  }, []);

  // Silent update (doesn't push to history - for intermediate drag states)
  const silentUpdate = useCallback((newState: T) => {
    setCurrent(newState);
    // Update the current history entry's state so undo works correctly after drag
    if (historyRef.current.length > 0) {
      historyRef.current[indexRef.current] = {
        ...historyRef.current[indexRef.current],
        state: newState,
      };
    }
  }, []);

  return {
    state: current,
    pushState,
    silentUpdate,
    undo,
    redo,
    canUndo,
    canRedo,
    getRecentActions,
    reset,
  };
}
