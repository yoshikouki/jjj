/**
 * Keyboard Input Hook
 * Handles keyboard events with functional composition
 */

import { useInput } from "ink";
import type { UseFileNavigationReturn } from "../../file-navigation/hooks/useFileNavigation.js";

/**
 * Key handler type
 */
type KeyHandler = (input: string, key: any) => void | Promise<void>;

/**
 * Compose multiple key handlers
 */
const composeKeyHandlers = (...handlers: KeyHandler[]): KeyHandler => {
	return (input: string, key: any) => {
		for (const handler of handlers) {
			handler(input, key);
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
		} else if (key.rightArrow || key.return) {
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
 * Keyboard input hook options
 */
interface UseKeyboardInputOptions {
	navigation: UseFileNavigationReturn;
	onExit: () => void;
}

/**
 * Main keyboard input hook
 */
export const useKeyboardInput = ({
	navigation,
	onExit,
}: UseKeyboardInputOptions): void => {
	const keyHandler = composeKeyHandlers(
		createNavigationHandler(navigation.actions),
		createAppControlHandler(onExit),
		createSortHandler(navigation.actions),
		createFilterHandler(navigation.actions, navigation.state.filterOptions),
	);

	// Check if raw mode is supported
	const isRawModeSupported = process.stdin.isTTY && typeof process.stdin.setRawMode === 'function';
	
	if (!isRawModeSupported) {
		// In environments without raw mode support, provide basic keyboard simulation
		return;
	}

	try {
		useInput(keyHandler);
	} catch (error) {
		console.warn("⚠️ Keyboard input not available:", error);
	}
};
