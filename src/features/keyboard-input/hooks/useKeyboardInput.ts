/**
 * Keyboard Input Hook
 * Handles keyboard events with functional composition
 */

import { type Key, useInput } from "ink";
import React from "react";
import type { UseFileNavigationReturn } from "../../file-navigation/hooks/useFileNavigation.js";
import { FileType } from "../../file-navigation/types/index.js";
import type { UseFilePreviewReturn } from "../../file-preview/hooks/useFilePreview.js";

/**
 * Key handler type
 */
type KeyHandler = (input: string, key: Key) => void | Promise<void>;

/**
 * Compose multiple key handlers with early termination support
 */
const composeKeyHandlers = (...handlers: KeyHandler[]): KeyHandler => {
	return async (input: string, key: Key) => {
		for (const handler of handlers) {
			const result = await handler(input, key);
			// If a handler explicitly returns a value, stop processing
			if (result !== undefined) {
				break;
			}
		}
	};
};

/**
 * Navigation key handler
 */
const createNavigationHandler = (
	navigation: UseFileNavigationReturn["actions"],
): KeyHandler => {
	return (_input: string, key: Key) => {
		if (key.upArrow) {
			navigation.moveUp();
		} else if (key.downArrow) {
			navigation.moveDown();
		} else if (key.leftArrow || key.delete) {
			navigation.goToParent();
		} else if (key.rightArrow) {
			navigation.enterSelectedItem();
		}
	};
};

/**
 * Application control key handler
 */
const createAppControlHandler = (onExit: () => void): KeyHandler => {
	return (input: string, key: Key) => {
		if (input === "q" || key.escape || (key.ctrl && input === "c")) {
			onExit();
		}
	};
};

/**
 * Sort control key handler
 */
const createSortHandler = (
	navigation: UseFileNavigationReturn["actions"],
): KeyHandler => {
	return (input: string, _key: Key) => {
		switch (input) {
			case "n":
				navigation.setSortConfig({ key: "name", order: "asc" });
				break;
			case "N":
				navigation.setSortConfig({ key: "name", order: "desc" });
				break;
			case "s":
				navigation.setSortConfig({ key: "size", order: "asc" });
				break;
			case "S":
				navigation.setSortConfig({ key: "size", order: "desc" });
				break;
			case "d":
				navigation.setSortConfig({ key: "modified", order: "asc" });
				break;
			case "D":
				navigation.setSortConfig({ key: "modified", order: "desc" });
				break;
			case "t":
				navigation.setSortConfig({ key: "type", order: "asc" });
				break;
			case "T":
				navigation.setSortConfig({ key: "type", order: "desc" });
				break;
		}
	};
};

/**
 * Filter control key handler
 */
const createFilterHandler = (
	navigation: UseFileNavigationReturn["actions"],
	currentOptions: UseFileNavigationReturn["state"]["filterOptions"],
): KeyHandler => {
	return (input: string, _key: Key) => {
		if (input === "h") {
			navigation.setFilterOptions({
				...currentOptions,
				showHidden: !currentOptions.showHidden,
			});
		}
	};
};

/**
 * Preview key handler
 */
const createPreviewHandler = (
	navigationState: UseFileNavigationReturn["state"],
	preview: UseFilePreviewReturn,
): KeyHandler => {
	return async (input: string, key: Key) => {
		// Handle preview toggle with Enter or Space (only for files)
		if ((key.return || input === " ") && !preview.state.isVisible) {
			const selectedFile = navigationState.files[navigationState.selectedIndex];
			if (selectedFile && selectedFile.type !== FileType.Directory) {
				await preview.actions.togglePreview(selectedFile);
				return; // Prevent other handlers from processing
			}
		}

		// Close preview with Escape, Enter, Space or Delete (when preview is visible)
		if (
			preview.state.isVisible &&
			(key.escape || key.return || input === " " || key.delete)
		) {
			preview.actions.hidePreview();
			return; // Prevent other handlers from processing
		}

		// Handle scrolling in preview mode
		if (preview.state.isVisible) {
			if (key.upArrow) {
				preview.actions.scrollUp();
				return; // Prevent other handlers from processing
			} else if (key.downArrow) {
				preview.actions.scrollDown();
				return; // Prevent other handlers from processing
			} else if (input === "l" || input === "L") {
				preview.actions.toggleLineNumbers();
				return; // Prevent other handlers from processing
			}
		}
	};
};

/**
 * Keyboard input hook options
 */
interface UseKeyboardInputOptions {
	navigation: UseFileNavigationReturn;
	preview: UseFilePreviewReturn;
	onExit: () => void;
}

/**
 * Main keyboard input hook
 */
export const useKeyboardInput = ({
	navigation,
	preview,
	onExit,
}: UseKeyboardInputOptions): void => {
	// Memoize handlers to prevent recreation on every render
	const navigationHandler = React.useMemo(
		() => createNavigationHandler(navigation.actions),
		[navigation.actions],
	);

	const appControlHandler = React.useMemo(
		() => createAppControlHandler(onExit),
		[onExit],
	);

	const sortHandler = React.useMemo(
		() => createSortHandler(navigation.actions),
		[navigation.actions],
	);

	const filterHandler = React.useMemo(
		() =>
			createFilterHandler(navigation.actions, navigation.state.filterOptions),
		[navigation.actions, navigation.state.filterOptions],
	);

	const previewHandler = React.useMemo(
		() => createPreviewHandler(navigation.state, preview),
		[navigation.state, preview],
	);

	// Use different handlers based on preview mode
	const keyHandler = React.useMemo(() => {
		return preview.state.isVisible
			? composeKeyHandlers(previewHandler, appControlHandler)
			: composeKeyHandlers(
					previewHandler,
					navigationHandler,
					appControlHandler,
					sortHandler,
					filterHandler,
				);
	}, [
		preview.state.isVisible,
		previewHandler,
		appControlHandler,
		navigationHandler,
		sortHandler,
		filterHandler,
	]);

	// Use input hook - it will handle TTY checks internally
	useInput(keyHandler);
};
