/**
 * File Navigation Hook with Dependency Injection
 * Core navigation logic following functional programming principles
 */

import { startTransition, useCallback, useEffect, useReducer } from "react";
import type { Dependencies } from "../factories/ServiceFactory.js";
import { createDependencies } from "../factories/ServiceFactory.js";
import type {
	FileItem,
	FileNavigationState,
	FilterOptions,
	SortConfig,
} from "../types/index.js";
import { processFiles, processFilesAsync } from "../utils/fileSort.js";
import { useSelectedIndex } from "./useSelectedIndex.js";

/**
 * Navigation actions (selectedIndex removed - managed separately)
 */
type NavigationAction =
	| { type: "SET_LOADING"; loading: boolean }
	| { type: "SET_FILES"; files: readonly FileItem[]; path: string }
	| { type: "SET_ERROR"; error: string }
	| { type: "SET_SORT_CONFIG"; config: SortConfig }
	| { type: "SET_FILTER_OPTIONS"; options: FilterOptions }
	| { type: "SET_PROCESSED_FILES"; files: readonly FileItem[] };

/**
 * Navigation state reducer
 */
const navigationReducer = (
	state: InternalNavigationState,
	action: NavigationAction,
): InternalNavigationState => {
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
				rawFiles: action.files,
				currentPath: action.path,
				isLoading: false,
				error: undefined,
			};
		}

		case "SET_ERROR":
			return { ...state, error: action.error, isLoading: false };

		case "SET_SORT_CONFIG":
			return { ...state, sortConfig: action.config };

		case "SET_FILTER_OPTIONS":
			return { ...state, filterOptions: action.options };

		case "SET_PROCESSED_FILES":
			return { ...state, files: action.files };

		default: {
			const _exhaustive: never = action;
			void _exhaustive;
			return state;
		}
	}
};

/**
 * Internal navigation state (with rawFiles, without selectedIndex)
 */
interface InternalNavigationState {
	currentPath: string;
	files: readonly FileItem[];
	rawFiles: readonly FileItem[];
	sortConfig: SortConfig;
	filterOptions: FilterOptions;
	isLoading: boolean;
	error?: string;
}

/**
 * Initial state (selectedIndex removed)
 */
const createInitialState = (initialPath: string): InternalNavigationState => ({
	currentPath: initialPath,
	files: [],
	rawFiles: [], // Store unprocessed files
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
 * Hook return type (selectedIndex integrated from separate hook)
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

	const [navigationState, dispatch] = useReducer(
		navigationReducer,
		createInitialState(initialPath),
	);

	// Selected index managed separately for performance
	const selectedIndex = useSelectedIndex(0);

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
					// Reset selection when loading new directory
					selectedIndex.actions.reset();
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
		[deps.fileSystemService, selectedIndex.actions],
	);

	/**
	 * Select file by index
	 */
	const selectFile = useCallback(
		(index: number) => {
			selectedIndex.actions.setSelectedIndex(index);
		},
		[selectedIndex.actions],
	);

	/**
	 * Move selection up
	 */
	const moveUp = useCallback(() => {
		selectedIndex.actions.moveUp(navigationState.files.length);
	}, [selectedIndex.actions, navigationState.files.length]);

	/**
	 * Move selection down
	 */
	const moveDown = useCallback(() => {
		selectedIndex.actions.moveDown(navigationState.files.length);
	}, [selectedIndex.actions, navigationState.files.length]);

	/**
	 * Enter selected item (directory or file)
	 */
	const enterSelectedItem = useCallback(async () => {
		const selectedFile = navigationState.files[selectedIndex.selectedIndex];
		if (!selectedFile) return;

		if (selectedFile.type === "directory") {
			await loadDirectory(selectedFile.path);
		}
		// File preview logic will be added later
	}, [loadDirectory, navigationState.files, selectedIndex.selectedIndex]);

	/**
	 * Go to parent directory
	 */
	const goToParent = useCallback(async () => {
		const parentResult = deps.fileSystemService.getParentPath(
			navigationState.currentPath,
		);
		if (parentResult.ok) {
			await loadDirectory(parentResult.value);
		}
	}, [deps.fileSystemService, loadDirectory, navigationState.currentPath]);

	/**
	 * Async file processing helper
	 */
	const processFilesInBackground = useCallback(
		async (
			rawFiles: readonly FileItem[],
			sortConfig: SortConfig,
			filterOptions: FilterOptions,
		) => {
			const processedFiles = await processFilesAsync(
				rawFiles,
				sortConfig,
				filterOptions,
			);
			dispatch({ type: "SET_PROCESSED_FILES", files: processedFiles });
		},
		[],
	);

	/**
	 * Set sort configuration (non-urgent update)
	 */
	const setSortConfig = useCallback(
		(config: SortConfig) => {
			dispatch({ type: "SET_SORT_CONFIG", config });

			startTransition(() => {
				processFilesInBackground(
					navigationState.rawFiles,
					config,
					navigationState.filterOptions,
				);
			});
		},
		[
			processFilesInBackground,
			navigationState.rawFiles,
			navigationState.filterOptions,
		],
	);

	/**
	 * Set filter options (non-urgent update)
	 */
	const setFilterOptions = useCallback(
		(options: FilterOptions) => {
			dispatch({ type: "SET_FILTER_OPTIONS", options });

			startTransition(() => {
				processFilesInBackground(
					navigationState.rawFiles,
					navigationState.sortConfig,
					options,
				);
			});
		},
		[
			processFilesInBackground,
			navigationState.rawFiles,
			navigationState.sortConfig,
		],
	);

	/**
	 * Load initial directory on mount
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: Only run once on mount
	useEffect(() => {
		loadDirectory(initialPath);
	}, []);

	// Combine navigation state with selected index
	const combinedState: FileNavigationState = {
		...navigationState,
		selectedIndex: selectedIndex.selectedIndex,
	};

	return {
		state: combinedState,
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
