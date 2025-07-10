/**
 * ファイルナビゲーションReactフック（リファクタリング版）
 *
 * 依存性注入を活用し、テスタビリティを向上させた実装
 * 副作用を適切に分離し、純粋関数として実装されたビジネスロジックを使用
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import { getGlobalServiceContainer } from "../factories/FileSystemFactory.js";
import type {
	CachedFileSystemService,
	EnvironmentService,
	PathUtilsService,
} from "../interfaces/FileSystemService.js";
import type {
	FileItem,
	FileNavigationActions,
	FileNavigationState,
	FileSortConfig,
	UseFileNavigation,
} from "../types/index.js";
import {
	addParentDirectory,
	getDefaultSortConfig,
	sortFiles,
} from "../utils/fileSort.js";
import {
	useAdvancedDebounce,
	useOptimizedCallback,
} from "../utils/performanceUtils.js";

/**
 * ファイルナビゲーション状態のアクションタイプ
 */
type FileNavigationAction =
	| { type: "SET_LOADING"; payload: boolean }
	| { type: "SET_CURRENT_PATH"; payload: string }
	| { type: "SET_FILES"; payload: FileItem[] }
	| { type: "SET_SELECTED_INDEX"; payload: number }
	| { type: "SET_ERROR"; payload: string | null }
	| { type: "SET_SORT_CONFIG"; payload: FileSortConfig }
	| { type: "RESET_SELECTION" };

/**
 * ファイルナビゲーション状態のリデューサー
 *
 * @param state - 現在の状態
 * @param action - アクション
 * @returns 新しい状態
 */
const fileNavigationReducer = (
	state: FileNavigationState,
	action: FileNavigationAction,
): FileNavigationState => {
	switch (action.type) {
		case "SET_LOADING":
			return { ...state, isLoading: action.payload };

		case "SET_CURRENT_PATH":
			return { ...state, currentPath: action.payload };

		case "SET_FILES":
			return { ...state, files: action.payload };

		case "SET_SELECTED_INDEX":
			return {
				...state,
				selectedIndex: Math.max(
					0,
					Math.min(action.payload, state.files.length - 1),
				),
			};

		case "SET_ERROR":
			return { ...state, error: action.payload };

		case "SET_SORT_CONFIG":
			return { ...state, sortConfig: action.payload };

		case "RESET_SELECTION":
			return { ...state, selectedIndex: 0 };

		default:
			return state;
	}
};

/**
 * ファイルナビゲーションフックの依存性
 */
export interface FileNavigationDependencies {
	/**
	 * ファイルシステムサービス
	 */
	fileSystemService: CachedFileSystemService;

	/**
	 * パス操作ユーティリティサービス
	 */
	pathUtilsService: PathUtilsService;

	/**
	 * 環境サービス
	 */
	environmentService: EnvironmentService;
}

/**
 * ファイルナビゲーションフックのオプション
 */
export interface FileNavigationOptions {
	/**
	 * 初期パス
	 */
	initialPath?: string;

	/**
	 * 依存性（テスト時に注入）
	 */
	dependencies?: FileNavigationDependencies;

	/**
	 * デバウンス遅延時間
	 */
	debounceDelay?: number;

	/**
	 * 最大待機時間
	 */
	maxWait?: number;
}

/**
 * ファイルナビゲーションフック
 *
 * @param options - オプション
 * @returns ファイルナビゲーション状態とアクション
 */
export const useFileNavigation = (
	options: FileNavigationOptions = {},
): UseFileNavigationExtended => {
	const {
		initialPath,
		dependencies,
		debounceDelay = 300,
		maxWait = 1000,
	} = options;

	// 依存性の取得（注入されない場合はグローバルから取得）
	const serviceContainer = getGlobalServiceContainer();
	const deps: FileNavigationDependencies = dependencies || {
		fileSystemService: serviceContainer.getCachedFileSystemService(),
		pathUtilsService: serviceContainer.getPathUtilsService(),
		environmentService: serviceContainer.getEnvironmentService(),
	};

	// 初期パスの決定
	const resolvedInitialPath =
		initialPath || deps.environmentService.getCurrentWorkingDirectory();

	// ファイルナビゲーション状態の初期値
	const initialState: FileNavigationState = {
		currentPath: resolvedInitialPath,
		files: [],
		selectedIndex: 0,
		error: null,
		isLoading: false,
		sortConfig: getDefaultSortConfig(),
	};

	const [state, dispatch] = useReducer(fileNavigationReducer, initialState);

	// 現在のパスが変更されたかどうかを追跡
	const previousPathRef = useRef<string>(resolvedInitialPath);

	// ファイルリストを読み込む関数（純粋関数を使用）
	const loadFiles = useOptimizedCallback(
		async (path: string) => {
			dispatch({ type: "SET_LOADING", payload: true });
			dispatch({ type: "SET_ERROR", payload: null });

			try {
				// キャッシュ付きで読み込み
				const result =
					await deps.fileSystemService.readDirectoryWithCache(path);

				if (result.success && result.data) {
					// 純粋関数でファイルをソート
					const sortedFiles = sortFiles(
						result.data,
						state.sortConfig.sortBy,
						state.sortConfig.order,
					);

					// 純粋関数で親ディレクトリエントリを追加
					const filesWithParent = addParentDirectory(sortedFiles, path);

					dispatch({ type: "SET_FILES", payload: filesWithParent });

					// パスが変更された場合のみ選択をリセット
					if (path !== previousPathRef.current) {
						dispatch({ type: "RESET_SELECTION" });
						previousPathRef.current = path;
					}
				} else {
					dispatch({
						type: "SET_ERROR",
						payload: result.error || "Unknown error",
					});
					dispatch({ type: "SET_FILES", payload: [] });
				}
			} catch (error) {
				dispatch({
					type: "SET_ERROR",
					payload: `Failed to load files: ${String(error)}`,
				});
				dispatch({ type: "SET_FILES", payload: [] });
			} finally {
				dispatch({ type: "SET_LOADING", payload: false });
			}
		},
		[deps.fileSystemService, state.sortConfig.sortBy, state.sortConfig.order],
	);

	// デバウンス処理を適用
	const debouncedLoadFiles = useAdvancedDebounce(loadFiles, debounceDelay, {
		leading: true,
		trailing: false,
		maxWait,
	});

	// 初回読み込みとパス変更時の処理
	useEffect(() => {
		debouncedLoadFiles(state.currentPath);
	}, [state.currentPath, debouncedLoadFiles]);

	/**
	 * ディレクトリに移動する
	 */
	const navigateToDirectory = useCallback(async (path: string) => {
		dispatch({ type: "SET_CURRENT_PATH", payload: path });
	}, []);

	/**
	 * 親ディレクトリに移動する
	 */
	const navigateUp = useCallback(async () => {
		if (!deps.pathUtilsService.isRootDirectory(state.currentPath)) {
			const parentPath = deps.pathUtilsService.getParentDirectory(
				state.currentPath,
			);
			dispatch({ type: "SET_CURRENT_PATH", payload: parentPath });
		}
	}, [state.currentPath, deps.pathUtilsService]);

	/**
	 * ファイルを選択する
	 */
	const selectFile = useCallback((index: number) => {
		dispatch({ type: "SET_SELECTED_INDEX", payload: index });
	}, []);

	/**
	 * 次のファイルを選択する
	 */
	const selectNext = useCallback(() => {
		const nextIndex = Math.min(state.selectedIndex + 1, state.files.length - 1);
		dispatch({ type: "SET_SELECTED_INDEX", payload: nextIndex });
	}, [state.selectedIndex, state.files.length]);

	/**
	 * 前のファイルを選択する
	 */
	const selectPrevious = useCallback(() => {
		const prevIndex = Math.max(state.selectedIndex - 1, 0);
		dispatch({ type: "SET_SELECTED_INDEX", payload: prevIndex });
	}, [state.selectedIndex]);

	/**
	 * ソート設定を変更する
	 */
	const setSortConfig = useCallback(
		(config: FileSortConfig) => {
			dispatch({ type: "SET_SORT_CONFIG", payload: config });
			// ソート設定変更後、ファイルを再読み込み
			loadFiles(state.currentPath);
		},
		[state.currentPath, loadFiles],
	);

	/**
	 * ファイルリストを更新する
	 */
	const refreshFiles = useCallback(async () => {
		await loadFiles(state.currentPath);
	}, [state.currentPath, loadFiles]);

	/**
	 * 現在選択されているファイルを取得する
	 */
	const getSelectedFile = useCallback((): FileItem | null => {
		if (state.selectedIndex >= 0 && state.selectedIndex < state.files.length) {
			return state.files[state.selectedIndex] || null;
		}
		return null;
	}, [state.selectedIndex, state.files]);

	/**
	 * 前/次のファイル情報を取得する
	 */
	const getNavigationInfo = useCallback(() => {
		const prevIndex = state.selectedIndex > 0 ? state.selectedIndex - 1 : null;
		const nextIndex =
			state.selectedIndex < state.files.length - 1
				? state.selectedIndex + 1
				: null;

		return {
			prevFile: prevIndex !== null ? state.files[prevIndex] : null,
			nextFile: nextIndex !== null ? state.files[nextIndex] : null,
			canGoUp: !deps.pathUtilsService.isRootDirectory(state.currentPath),
			currentFile: getSelectedFile(),
		};
	}, [
		state.selectedIndex,
		state.files,
		state.currentPath,
		getSelectedFile,
		deps.pathUtilsService,
	]);

	/**
	 * ファイルナビゲーションの統計情報を取得する
	 */
	const getStats = useCallback(() => {
		const totalFiles = state.files.filter((f) => !f.isDirectory).length;
		const totalDirectories = state.files.filter((f) => f.isDirectory).length;
		const totalSize = state.files
			.filter((f) => !f.isDirectory)
			.reduce((acc, f) => acc + f.size, 0);

		return {
			totalFiles,
			totalDirectories,
			totalSize,
			totalItems: state.files.length,
		};
	}, [state.files]);

	/**
	 * キャッシュの統計情報を取得する
	 */
	const getCacheStats = useCallback(() => {
		return deps.fileSystemService.getCacheStats();
	}, [deps.fileSystemService]);

	/**
	 * キャッシュをクリアする
	 */
	const clearCache = useCallback(() => {
		deps.fileSystemService.clearCache();
	}, [deps.fileSystemService]);

	const actions: FileNavigationActions = {
		navigateToDirectory,
		navigateUp,
		selectFile,
		selectNext,
		selectPrevious,
		setSortConfig,
		refreshFiles,
	};

	return {
		state,
		actions,
		// 追加のヘルパー関数
		getSelectedFile,
		getNavigationInfo,
		getStats,
		getCacheStats,
		clearCache,
	};
};

/**
 * ファイルナビゲーションフックの型を拡張
 */
export interface UseFileNavigationExtended extends UseFileNavigation {
	getSelectedFile: () => FileItem | null;
	getNavigationInfo: () => {
		prevFile: FileItem | null;
		nextFile: FileItem | null;
		canGoUp: boolean;
		currentFile: FileItem | null;
	};
	getStats: () => {
		totalFiles: number;
		totalDirectories: number;
		totalSize: number;
		totalItems: number;
	};
	getCacheStats: () => {
		size: number;
		memoryUsage: number;
	};
	clearCache: () => void;
}

/**
 * ファイルナビゲーション用のキーボードハンドラーフック
 *
 * @param navigation - ファイルナビゲーション
 * @returns キーボードハンドラー
 */
export const useFileNavigationKeys = (
	navigation: UseFileNavigationExtended,
) => {
	const handleKeyPress = useCallback(
		(key: {
			upArrow?: boolean;
			downArrow?: boolean;
			leftArrow?: boolean;
			rightArrow?: boolean;
			return?: boolean;
		}) => {
			const { state, actions, getSelectedFile } = navigation;

			if (key.upArrow) {
				actions.selectPrevious();
			} else if (key.downArrow) {
				actions.selectNext();
			} else if (key.leftArrow) {
				actions.navigateUp();
			} else if (key.rightArrow) {
				const selected = getSelectedFile();
				if (selected?.isDirectory) {
					if (selected.name === "..") {
						actions.navigateUp();
					} else {
						const newPath = `${state.currentPath}/${selected.name}`;
						actions.navigateToDirectory(newPath);
					}
				}
			} else if (key.return) {
				const selected = getSelectedFile();
				if (selected?.isDirectory) {
					if (selected.name === "..") {
						actions.navigateUp();
					} else {
						const newPath = `${state.currentPath}/${selected.name}`;
						actions.navigateToDirectory(newPath);
					}
				}
			}
		},
		[navigation],
	);

	return { handleKeyPress };
};

/**
 * ファイルナビゲーションの状態を永続化するフック
 *
 * @param navigation - ファイルナビゲーション
 * @param storageKey - ストレージキー
 */
export const useFileNavigationPersistence = (
	navigation: UseFileNavigationExtended,
	storageKey: string = "file-navigation-state",
) => {
	const { state, actions } = navigation;

	// 状態の保存
	useEffect(() => {
		const persistentState = {
			currentPath: state.currentPath,
			sortConfig: state.sortConfig,
		};
		localStorage.setItem(storageKey, JSON.stringify(persistentState));
	}, [state.currentPath, state.sortConfig, storageKey]);

	// 状態の復元
	useEffect(() => {
		try {
			const saved = localStorage.getItem(storageKey);
			if (saved) {
				const persistentState = JSON.parse(saved);
				if (persistentState.currentPath) {
					actions.navigateToDirectory(persistentState.currentPath);
				}
				if (persistentState.sortConfig) {
					actions.setSortConfig(persistentState.sortConfig);
				}
			}
		} catch (error) {
			console.warn("Failed to restore file navigation state:", error);
		}
	}, [actions, storageKey]);
};

/**
 * テスト用のファイルナビゲーションフック作成
 *
 * @param dependencies - テスト用の依存性
 * @param options - オプション
 * @returns テスト用のファイルナビゲーション
 */
export const createTestFileNavigation = (
	dependencies: FileNavigationDependencies,
	options: Omit<FileNavigationOptions, "dependencies"> = {},
): UseFileNavigationExtended => {
	return useFileNavigation({
		...options,
		dependencies,
	});
};
