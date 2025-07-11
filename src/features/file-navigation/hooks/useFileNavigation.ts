/**
 * File Navigation Hook with Dependency Injection
 * Core navigation logic following functional programming principles
 */

import { useCallback, useEffect, useReducer } from "react";
import type { Dependencies } from "../factories/ServiceFactory.js";
import { createDependencies } from "../factories/ServiceFactory.js";
import type {
	FileItem,
	FileNavigationState,
	FilterOptions,
	SortConfig,
} from "../types/index.js";
import { processFiles } from "../utils/fileSort.js";

/**
 * Navigation actions
 */
type NavigationAction =
	| { type: "SET_LOADING"; loading: boolean }
	| { type: "SET_FILES"; files: readonly FileItem[]; path: string }
	| { type: "SET_ERROR"; error: string }
	| { type: "SET_SELECTED_INDEX"; index: number }
	| { type: "MOVE_UP" }
	| { type: "MOVE_DOWN" }
	| { type: "SET_SORT_CONFIG"; config: SortConfig }
	| { type: "SET_FILTER_OPTIONS"; options: FilterOptions };

/**
 * Navigation state reducer
 */
const navigationReducer = (
	state: FileNavigationState,
	action: NavigationAction,
): FileNavigationState => {
	switch (action.type) {
		case "SET_LOADING":
			return { ...state, isLoading: action.loading, error: undefined };

		case "SET_FILES": {
			const processedFiles = processFiles(
				action.files,
				state.sortConfig,
				state.filterOptions,
			);
			return {
				...state,
				files: processedFiles,
				currentPath: action.path,
				selectedIndex: 0,
				isLoading: false,
				error: undefined,
			};
		}

		case "SET_ERROR":
			return { ...state, error: action.error, isLoading: false };

		case "SET_SELECTED_INDEX":
			return {
				...state,
				selectedIndex: Math.max(
					0,
					Math.min(action.index, state.files.length - 1),
				),
			};

		case "MOVE_UP":
			return {
				...state,
				selectedIndex:
					state.selectedIndex === 0
						? state.files.length - 1
						: state.selectedIndex - 1,
			};

		case "MOVE_DOWN":
			return {
				...state,
				selectedIndex:
					state.selectedIndex === state.files.length - 1
						? 0
						: state.selectedIndex + 1,
			};

		case "SET_SORT_CONFIG": {
			const processedFiles = processFiles(
				state.files,
				action.config,
				state.filterOptions,
			);
			return { ...state, sortConfig: action.config, files: processedFiles };
		}

		case "SET_FILTER_OPTIONS": {
			const processedFiles = processFiles(
				state.files,
				state.sortConfig,
				action.options,
			);
			return { ...state, filterOptions: action.options, files: processedFiles };
		}

		default: {
			const _exhaustive: never = action;
			void _exhaustive;
			return state;
		}
	}
};

/**
 * Initial state
 */
const createInitialState = (initialPath: string): FileNavigationState => ({
	currentPath: initialPath,
	files: [],
	selectedIndex: 0,
	sortConfig: { key: "name", order: "asc" },
	filterOptions: {
		showHidden: false,
		showDirectoriesFirst: true,
	},
	isLoading: false,
});

/**
 * Hook options
 */
interface UseFileNavigationOptions {
	dependencies?: Dependencies;
	initialPath?: string;
}

/**
 * Hook return type
 */
export interface UseFileNavigationReturn {
	state: FileNavigationState;
	actions: {
		loadDirectory: (path: string) => Promise<void>;
		selectFile: (index: number) => void;
		moveUp: () => void;
		moveDown: () => void;
		enterSelectedItem: () => Promise<void>;
		goToParent: () => Promise<void>;
		setSortConfig: (config: SortConfig) => void;
		setFilterOptions: (options: FilterOptions) => void;
	};
}

/**
 * File Navigation Hook with DI
 */
export const useFileNavigation = (
	options: UseFileNavigationOptions = {},
): UseFileNavigationReturn => {
	const deps = options.dependencies ?? createDependencies();
	const initialPath =
		options.initialPath ??
		(() => {
			const result = deps.environmentService.getCurrentDirectory();
			return result.ok ? result.value : "/";
		})();

	const [state, dispatch] = useReducer(
		navigationReducer,
		createInitialState(initialPath),
	);

	/**
	 * Load directory contents
	 */
	const loadDirectory = useCallback(
		async (path: string) => {
			dispatch({ type: "SET_LOADING", loading: true });

			try {
				const result = await deps.fileSystemService.readDirectory(path);

				if (result.ok) {
					dispatch({ type: "SET_FILES", files: result.value, path });
				} else {
					dispatch({ type: "SET_ERROR", error: result.error.message });
				}
			} catch (error) {
				dispatch({
					type: "SET_ERROR",
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		},
		[deps.fileSystemService],
	);

	/**
	 * Select file by index
	 */
	const selectFile = useCallback((index: number) => {
		dispatch({ type: "SET_SELECTED_INDEX", index });
	}, []);

	/**
	 * Move selection up
	 */
	const moveUp = useCallback(() => {
		dispatch({ type: "MOVE_UP" });
	}, []);

	/**
	 * Move selection down
	 */
	const moveDown = useCallback(() => {
		dispatch({ type: "MOVE_DOWN" });
	}, []);

	/**
	 * Enter selected item (directory or file)
	 */
	const enterSelectedItem = useCallback(async () => {
		// Get current state values through dispatch
		const currentState = state;
		const selectedFile = currentState.files[currentState.selectedIndex];
		if (!selectedFile) return;

		if (selectedFile.type === "directory") {
			await loadDirectory(selectedFile.path);
		}
		// File preview logic will be added later
	}, [loadDirectory, state]);

	/**
	 * Go to parent directory
	 */
	const goToParent = useCallback(async () => {
		const parentResult = deps.fileSystemService.getParentPath(
			state.currentPath,
		);
		if (parentResult.ok) {
			await loadDirectory(parentResult.value);
		}
	}, [deps.fileSystemService, loadDirectory, state.currentPath]);

	/**
	 * Set sort configuration
	 */
	const setSortConfig = useCallback((config: SortConfig) => {
		dispatch({ type: "SET_SORT_CONFIG", config });
	}, []);

	/**
	 * Set filter options
	 */
	const setFilterOptions = useCallback((options: FilterOptions) => {
		dispatch({ type: "SET_FILTER_OPTIONS", options });
	}, []);

	/**
	 * Load initial directory on mount
	 */
	useEffect(() => {
		loadDirectory(initialPath);
	}, []);

	return {
		state,
		actions: {
			loadDirectory,
			selectFile,
			moveUp,
			moveDown,
			enterSelectedItem,
			goToParent,
			setSortConfig,
			setFilterOptions,
		},
	};
};
