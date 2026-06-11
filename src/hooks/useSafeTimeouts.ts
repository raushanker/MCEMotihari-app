import { useEffect, useRef, useCallback } from 'react';

export function useSafeTimeouts() {
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const setSafeTimeout = useCallback((cb: () => void, delay: number) => {
    const id = setTimeout(cb, delay);
    timeouts.current.push(id);
    return id;
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  }, []);

  useEffect(() => {
    return clearAllTimeouts;
  }, [clearAllTimeouts]);

  return { setSafeTimeout, clearAllTimeouts };
}
