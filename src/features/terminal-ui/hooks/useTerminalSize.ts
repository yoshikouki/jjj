/**
 * Terminal Size Hook
 * Manages responsive terminal dimensions
 */

import { useState, useEffect } from "react";

/**
 * Terminal size state
 */
interface TerminalSize {
  width: number;
  height: number;
}

/**
 * Hook options
 */
interface UseTerminalSizeOptions {
  initialWidth?: number;
  initialHeight?: number;
}

/**
 * Terminal size hook
 */
export const useTerminalSize = (options: UseTerminalSizeOptions = {}): TerminalSize => {
  const [size, setSize] = useState<TerminalSize>({
    width: options.initialWidth ?? process.stdout.columns ?? 80,
    height: options.initialHeight ?? process.stdout.rows ?? 24,
  });

  useEffect(() => {
    const updateSize = () => {
      setSize({
        width: process.stdout.columns ?? 80,
        height: process.stdout.rows ?? 24,
      });
    };

    // Listen for terminal resize events
    process.stdout.on("resize", updateSize);

    return () => {
      process.stdout.off("resize", updateSize);
    };
  }, []);

  return size;
};