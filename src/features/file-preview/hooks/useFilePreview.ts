/**
 * File Preview Hook
 * Manages file preview state and loading
 */

import { useCallback, useReducer } from "react";
import type { Dependencies } from "../../file-navigation/factories/ServiceFactory.js";
import { type FileItem, FileType } from "../../file-navigation/types/index.js";
import type { PreviewDisplayOptions, PreviewState } from "../types/index.js";
import {
	DEFAULT_DISPLAY_OPTIONS,
	DEFAULT_PREVIEW_CONFIG,
} from "../types/index.js";

/**
 * Preview actions
 */
type PreviewAction =
	| { type: "SHOW_PREVIEW"; file: FileItem }
	| { type: "HIDE_PREVIEW" }
	| { type: "SET_LOADING"; loading: boolean }
	| { type: "SET_CONTENT"; content: string }
	| { type: "SET_ERROR"; error: string }
	| { type: "TOGGLE_PREVIEW"; file: FileItem }
	| { type: "SCROLL_UP"; lines: number }
	| { type: "SCROLL_DOWN"; lines: number }
	| { type: "RESET_SCROLL" }
	| { type: "TOGGLE_LINE_NUMBERS" }
	| { type: "SET_DISPLAY_OPTIONS"; options: PreviewDisplayOptions };

/**
 * Initial preview state
 */
const initialState: PreviewState = {
	file: null,
	content: null,
	isLoading: false,
	error: null,
	isVisible: false,
	scrollOffset: 0,
	displayOptions: DEFAULT_DISPLAY_OPTIONS,
};

/**
 * Preview state reducer
 */
const previewReducer = (
	state: PreviewState,
	action: PreviewAction,
): PreviewState => {
	switch (action.type) {
		case "SHOW_PREVIEW":
			return {
				...state,
				file: action.file,
				isVisible: true,
				isLoading: true,
				error: null,
			};

		case "HIDE_PREVIEW":
			return {
				...state,
				isVisible: false,
				content: null,
				error: null,
				scrollOffset: 0,
			};

		case "SET_LOADING":
			return {
				...state,
				isLoading: action.loading,
			};

		case "SET_CONTENT":
			return {
				...state,
				content: action.content,
				isLoading: false,
				error: null,
			};

		case "SET_ERROR":
			return {
				...state,
				error: action.error,
				isLoading: false,
				content: null,
			};

		case "TOGGLE_PREVIEW":
			if (state.isVisible && state.file?.path === action.file.path) {
				// Hide if already showing the same file
				return {
					...state,
					isVisible: false,
					content: null,
					error: null,
					scrollOffset: 0,
				};
			}
			// Show new preview
			return {
				...state,
				file: action.file,
				isVisible: true,
				isLoading: true,
				error: null,
				scrollOffset: 0,
			};

		case "SCROLL_UP":
			return {
				...state,
				scrollOffset: Math.max(0, state.scrollOffset - action.lines),
			};

		case "SCROLL_DOWN": {
			if (!state.content) return state;
			const totalLines = state.content.split("\n").length;
			return {
				...state,
				scrollOffset: Math.min(
					Math.max(0, totalLines - 10), // Leave some visible lines
					state.scrollOffset + action.lines,
				),
			};
		}

		case "RESET_SCROLL":
			return {
				...state,
				scrollOffset: 0,
			};

		case "TOGGLE_LINE_NUMBERS":
			return {
				...state,
				displayOptions: {
					...state.displayOptions,
					showLineNumbers: !state.displayOptions.showLineNumbers,
				},
			};

		case "SET_DISPLAY_OPTIONS":
			return {
				...state,
				displayOptions: action.options,
			};

		default:
			return state;
	}
};

/**
 * Check if file is previewable
 */
const isPreviewable = (file: FileItem): boolean => {
	if (file.type === FileType.Directory) return false;
	if (file.size > DEFAULT_PREVIEW_CONFIG.maxFileSize) return false;

	const extension =
		file.name.lastIndexOf(".") > -1
			? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
			: "";

	return DEFAULT_PREVIEW_CONFIG.supportedExtensions.includes(extension);
};

/**
 * File preview hook options
 */
interface UseFilePreviewOptions {
	dependencies: Dependencies;
}

/**
 * File preview hook return type
 */
export interface UseFilePreviewReturn {
	state: PreviewState;
	actions: {
		showPreview: (file: FileItem) => Promise<void>;
		hidePreview: () => void;
		togglePreview: (file: FileItem) => Promise<void>;
		scrollUp: () => void;
		scrollDown: () => void;
		toggleLineNumbers: () => void;
		setDisplayOptions: (options: PreviewDisplayOptions) => void;
	};
}

/**
 * File preview hook
 */
export const useFilePreview = ({
	dependencies,
}: UseFilePreviewOptions): UseFilePreviewReturn => {
	const [state, dispatch] = useReducer(previewReducer, initialState);
	const { fileSystemService } = dependencies;

	const loadPreview = useCallback(
		async (file: FileItem) => {
			if (!isPreviewable(file)) {
				dispatch({
					type: "SET_ERROR",
					error: "File type not supported for preview",
				});
				return;
			}

			dispatch({ type: "SET_LOADING", loading: true });

			const result = await fileSystemService.readFilePreview(
				file.path,
				DEFAULT_PREVIEW_CONFIG.maxBytes,
			);

			if (result.ok) {
				dispatch({ type: "SET_CONTENT", content: result.value });
			} else {
				dispatch({
					type: "SET_ERROR",
					error: result.error.message || "Failed to load preview",
				});
			}
		},
		[fileSystemService],
	);

	const showPreview = useCallback(
		async (file: FileItem) => {
			dispatch({ type: "SHOW_PREVIEW", file });
			await loadPreview(file);
		},
		[loadPreview],
	);

	const hidePreview = useCallback(() => {
		dispatch({ type: "HIDE_PREVIEW" });
	}, []);

	const togglePreview = useCallback(
		async (file: FileItem) => {
			dispatch({ type: "TOGGLE_PREVIEW", file });

			// Load preview if toggling on
			if (!state.isVisible || state.file?.path !== file.path) {
				await loadPreview(file);
			}
		},
		[loadPreview, state.isVisible, state.file],
	);

	const scrollUp = useCallback(() => {
		dispatch({ type: "SCROLL_UP", lines: 5 });
	}, []);

	const scrollDown = useCallback(() => {
		dispatch({ type: "SCROLL_DOWN", lines: 5 });
	}, []);

	const toggleLineNumbers = useCallback(() => {
		dispatch({ type: "TOGGLE_LINE_NUMBERS" });
	}, []);

	const setDisplayOptions = useCallback((options: PreviewDisplayOptions) => {
		dispatch({ type: "SET_DISPLAY_OPTIONS", options });
	}, []);

	return {
		state,
		actions: {
			showPreview,
			hidePreview,
			togglePreview,
			scrollUp,
			scrollDown,
			toggleLineNumbers,
			setDisplayOptions,
		},
	};
};
