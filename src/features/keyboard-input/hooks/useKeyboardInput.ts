/**
 * Keyboard Input Hook
 * Handles keyboard events with functional composition
 */

import { useInput } from "ink";
import type { UseFileNavigationReturn } from "../../file-navigation/hooks/useFileNavigation.js";
import { FileType } from "../../file-navigation/types/index.js";
import type { UseFilePreviewReturn } from "../../file-preview/hooks/useFilePreview.js";

/**
 * Key handler type
 */
type KeyHandler = (input: string, key: any) => void | Promise<void | any>;

/**
 * Compose multiple key handlers with early termination support
 */
const composeKeyHandlers = (...handlers: KeyHandler[]): KeyHandler => {
	return async (input: string, key: any) => {
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
	return (_input: string, key: any) => {
		if (key.upArrow) {
			navigation.moveUp();
		} else if (key.downArrow) {
			navigation.moveDown();
		} else if (key.leftArrow) {
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
	return (input: string, key: any) => {
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
	return (input: string, _key: any) => {
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
	currentOptions: any,
): KeyHandler => {
	return (input: string, _key: any) => {
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
	return async (input: string, key: any) => {
		// Handle preview toggle with Enter or Space (only for files)
		if ((key.return || input === " ") && !preview.state.isVisible) {
			const selectedFile = navigationState.files[navigationState.selectedIndex];
			if (selectedFile && selectedFile.type !== FileType.Directory) {
				await preview.actions.togglePreview(selectedFile);
				return; // Prevent other handlers from processing
			}
		}

		// Close preview with Escape, Enter or Space (when preview is visible)
		if (
			preview.state.isVisible &&
			(key.escape || key.return || input === " ")
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
	// Use different handlers based on preview mode
	const keyHandler = preview.state.isVisible
		? composeKeyHandlers(
				createPreviewHandler(navigation.state, preview),
				createAppControlHandler(onExit),
			)
		: composeKeyHandlers(
				createPreviewHandler(navigation.state, preview),
				createNavigationHandler(navigation.actions),
				createAppControlHandler(onExit),
				createSortHandler(navigation.actions),
				createFilterHandler(navigation.actions, navigation.state.filterOptions),
			);

	// Always try to use input, but handle errors gracefully
	try {
		useInput(keyHandler);
	} catch (error) {
		// Only warn in development/non-TTY environments
		if (!process.stdin.isTTY) {
			console.warn("⚠️ Keyboard input not available:", error);
		}
	}
};
