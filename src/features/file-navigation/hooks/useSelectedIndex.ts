/**
 * Selected Index Hook
 * Manages cursor selection state independently from file data
 */

import { useCallback, useRef, useState } from "react";

/**
 * Selected index hook return type
 */
export interface UseSelectedIndexReturn {
	selectedIndex: number;
	actions: {
		setSelectedIndex: (index: number) => void;
		moveUp: (totalFiles: number) => void;
		moveDown: (totalFiles: number) => void;
		reset: () => void;
	};
}

/**
 * Hook for managing selected index state
 * Optimized for high-frequency updates (cursor movement)
 */
export const useSelectedIndex = (initialIndex = 0): UseSelectedIndexReturn => {
	const [selectedIndex, setSelectedIndexState] = useState(initialIndex);
	const lastTotalFiles = useRef(0);

	/**
	 * Set selected index with bounds checking
	 */
	const setSelectedIndex = useCallback((index: number) => {
		setSelectedIndexState((prev) => {
			const newIndex = Math.max(0, Math.min(index, lastTotalFiles.current - 1));
			return newIndex === prev ? prev : newIndex;
		});
	}, []);

	/**
	 * Move selection up with wrap-around
	 */
	const moveUp = useCallback((totalFiles: number) => {
		lastTotalFiles.current = totalFiles;
		setSelectedIndexState((prev) => {
			if (totalFiles === 0) return 0;
			return prev === 0 ? totalFiles - 1 : prev - 1;
		});
	}, []);

	/**
	 * Move selection down with wrap-around
	 */
	const moveDown = useCallback((totalFiles: number) => {
		lastTotalFiles.current = totalFiles;
		setSelectedIndexState((prev) => {
			if (totalFiles === 0) return 0;
			return prev === totalFiles - 1 ? 0 : prev + 1;
		});
	}, []);

	/**
	 * Reset selection to beginning
	 */
	const reset = useCallback(() => {
		setSelectedIndexState(0);
	}, []);

	return {
		selectedIndex,
		actions: {
			setSelectedIndex,
			moveUp,
			moveDown,
			reset,
		},
	};
};
