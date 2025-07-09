/**
 * ファイルリストコンポーネント
 *
 * ファイルリストの表示とスクロール機能を担当
 * 仮想化によるパフォーマンス最適化を含む
 */

import { Box, Text } from "ink";
import React from "react";
import type { DisplayConfig, FileItem, ScrollInfo } from "../types/index.js";
import { formatScrollIndicator } from "../utils/fileFormat.js";
import {
	areDisplayConfigsEqual,
	areFilesEqual,
	useDebounce,
	useOptimizedCallback,
	useOptimizedMemo,
	useRenderTime,
	useVirtualizedMemo,
} from "../utils/performanceUtils.js";
import {
	useDynamicVirtualScroll,
	useIntersectionObserver,
	useOptimizedVirtualScroll,
	type VirtualScrollConfig,
} from "../utils/virtualScroll.js";
import { FileItemComponent } from "./FileItem.js";

/**
 * ファイルリストコンポーネントのプロパティ
 */
interface FileListProps {
	/** ファイルリスト */
	files: FileItem[];
	/** 選択されたファイルのインデックス */
	selectedIndex: number;
	/** 表示設定 */
	displayConfig: DisplayConfig;
	/** スクロール情報 */
	scrollInfo: ScrollInfo;
	/** エラー状態 */
	error?: string | null;
	/** 読み込み状態 */
	isLoading?: boolean;
	/** 空の状態メッセージ */
	emptyMessage?: string;
}

/**
 * ファイルリストコンポーネント
 */
export const FileList: React.FC<FileListProps> = React.memo(
	({
		files,
		selectedIndex,
		displayConfig,
		scrollInfo,
		error,
		isLoading,
		emptyMessage = "No files found",
	}) => {
		// レンダリング時間を測定（デバッグ用）
		useRenderTime("FileList", false);

		// 表示するファイルを計算（最適化されたuseMemo）
		const visibleFiles = useVirtualizedMemo(
			() =>
				files.slice(
					scrollInfo.visibleStartIndex,
					scrollInfo.visibleEndIndex + 1,
				),
			scrollInfo.visibleStartIndex,
			scrollInfo.visibleEndIndex,
			files.length,
		);

		// ファイルアイテムの描画関数（メモ化）
		const renderFileItem = useOptimizedCallback(
			(file: FileItem, visibleIndex: number) => {
				const actualIndex = scrollInfo.visibleStartIndex + visibleIndex;
				const isSelected = actualIndex === selectedIndex;

				return (
					<FileItemComponent
						key={`${file.name}-${actualIndex}`}
						file={file}
						isSelected={isSelected}
						displayConfig={displayConfig}
					/>
				);
			},
			[scrollInfo.visibleStartIndex, selectedIndex, displayConfig],
		);

		// 読み込み状態の表示
		if (isLoading) {
			return (
				<Box justifyContent="center" alignItems="center">
					<Text dimColor>Loading...</Text>
				</Box>
			);
		}

		// エラー状態の表示
		if (error) {
			return (
				<Box justifyContent="center" alignItems="center">
					<Text color="red">{error}</Text>
				</Box>
			);
		}

		// 空の状態の表示
		if (files.length === 0) {
			return (
				<Box justifyContent="center" alignItems="center">
					<Text dimColor>{emptyMessage}</Text>
				</Box>
			);
		}

		return (
			<Box flexDirection="column">
				{/* ファイルリスト */}
				<Box flexDirection="column">{visibleFiles.map(renderFileItem)}</Box>
			</Box>
		);
	},
	(prevProps, nextProps) => {
		// カスタム比較関数で最適化
		return (
			areFilesEqual(prevProps.files, nextProps.files) &&
			prevProps.selectedIndex === nextProps.selectedIndex &&
			areDisplayConfigsEqual(
				prevProps.displayConfig,
				nextProps.displayConfig,
			) &&
			prevProps.scrollInfo.visibleStartIndex ===
				nextProps.scrollInfo.visibleStartIndex &&
			prevProps.scrollInfo.visibleEndIndex ===
				nextProps.scrollInfo.visibleEndIndex &&
			prevProps.error === nextProps.error &&
			prevProps.isLoading === nextProps.isLoading &&
			prevProps.emptyMessage === nextProps.emptyMessage
		);
	},
);

FileList.displayName = "FileList";

/**
 * 仮想化ファイルリストコンポーネント
 */
interface VirtualizedFileListProps extends FileListProps {
	/** ファイル選択時のハンドラー */
	onFileSelect?: (index: number) => void;
	/** ファイルアクティベート時のハンドラー */
	onFileActivate?: (file: FileItem, index: number) => void;
}

export const VirtualizedFileList: React.FC<VirtualizedFileListProps> =
	React.memo(
		({
			files,
			selectedIndex,
			displayConfig,
			scrollInfo,
			onFileSelect,
			onFileActivate,
			error,
			isLoading,
			emptyMessage,
		}) => {
			return (
				<VirtualizedFileListCore
					files={files}
					selectedIndex={selectedIndex}
					displayConfig={displayConfig}
					scrollInfo={scrollInfo}
					onFileSelect={onFileSelect}
					onFileActivate={onFileActivate}
					error={error}
					isLoading={isLoading}
					emptyMessage={emptyMessage}
				/>
			);
		},
	);

VirtualizedFileList.displayName = "VirtualizedFileList";

/**
 * 仮想化ファイルリストのコア実装
 */
const VirtualizedFileListCore: React.FC<VirtualizedFileListProps> = React.memo(
	({
		files,
		selectedIndex,
		displayConfig,
		scrollInfo,
		error,
		isLoading,
		emptyMessage,
	}) => {
		// レンダリング時間を測定（デバッグ用）
		useRenderTime("VirtualizedFileListCore", false);

		// 仮想化のための設定（メモ化）
		const virtualizationConfig = useOptimizedMemo(() => {
			const itemHeight = 1; // 各アイテムの高さ（行数）
			const containerHeight = scrollInfo.availableHeight;
			const startIndex = scrollInfo.visibleStartIndex;
			const endIndex = Math.min(startIndex + containerHeight, files.length);

			return {
				itemHeight,
				containerHeight,
				startIndex,
				endIndex,
				topSpacerHeight: startIndex * itemHeight,
				bottomSpacerHeight: (files.length - endIndex) * itemHeight,
			};
		}, [
			scrollInfo.availableHeight,
			scrollInfo.visibleStartIndex,
			files.length,
		]);

		// 表示するファイルを計算（最適化されたuseMemo）
		const visibleFiles = useVirtualizedMemo(
			() =>
				files.slice(
					virtualizationConfig.startIndex,
					virtualizationConfig.endIndex,
				),
			virtualizationConfig.startIndex,
			virtualizationConfig.endIndex,
			files.length,
		);

		// ファイルアイテムの描画関数（メモ化）
		const renderFileItem = useOptimizedCallback(
			(file: FileItem, visibleIndex: number) => {
				const actualIndex = virtualizationConfig.startIndex + visibleIndex;
				const isSelected = actualIndex === selectedIndex;

				return (
					<FileItemComponent
						key={`${file.name}-${actualIndex}`}
						file={file}
						isSelected={isSelected}
						displayConfig={displayConfig}
					/>
				);
			},
			[virtualizationConfig.startIndex, selectedIndex, displayConfig],
		);

		// 上部スペーサーコンポーネント（メモ化）
		const TopSpacer = useOptimizedMemo(() => {
			if (virtualizationConfig.topSpacerHeight <= 0) return null;
			return (
				<Box height={virtualizationConfig.topSpacerHeight}>
					<Text> </Text>
				</Box>
			);
		}, [virtualizationConfig.topSpacerHeight]);

		// 下部スペーサーコンポーネント（メモ化）
		const BottomSpacer = useOptimizedMemo(() => {
			if (virtualizationConfig.bottomSpacerHeight <= 0) return null;
			return (
				<Box height={virtualizationConfig.bottomSpacerHeight}>
					<Text> </Text>
				</Box>
			);
		}, [virtualizationConfig.bottomSpacerHeight]);

		if (isLoading) {
			return (
				<Box justifyContent="center" alignItems="center">
					<Text dimColor>Loading...</Text>
				</Box>
			);
		}

		if (error) {
			return (
				<Box justifyContent="center" alignItems="center">
					<Text color="red">{error}</Text>
				</Box>
			);
		}

		if (files.length === 0) {
			return (
				<Box justifyContent="center" alignItems="center">
					<Text dimColor>{emptyMessage}</Text>
				</Box>
			);
		}

		return (
			<Box flexDirection="column">
				{/* 上部スペーサー */}
				{TopSpacer}

				{/* 表示されるファイル */}
				{visibleFiles.map(renderFileItem)}

				{/* 下部スペーサー */}
				{BottomSpacer}
			</Box>
		);
	},
	(prevProps, nextProps) => {
		// カスタム比較関数で最適化
		return (
			areFilesEqual(prevProps.files, nextProps.files) &&
			prevProps.selectedIndex === nextProps.selectedIndex &&
			areDisplayConfigsEqual(
				prevProps.displayConfig,
				nextProps.displayConfig,
			) &&
			prevProps.scrollInfo.visibleStartIndex ===
				nextProps.scrollInfo.visibleStartIndex &&
			prevProps.scrollInfo.visibleEndIndex ===
				nextProps.scrollInfo.visibleEndIndex &&
			prevProps.scrollInfo.availableHeight ===
				nextProps.scrollInfo.availableHeight &&
			prevProps.error === nextProps.error &&
			prevProps.isLoading === nextProps.isLoading &&
			prevProps.emptyMessage === nextProps.emptyMessage
		);
	},
);

VirtualizedFileListCore.displayName = "VirtualizedFileListCore";

/**
 * 高度な仮想スクロールファイルリストコンポーネント
 */
interface AdvancedVirtualizedFileListProps extends VirtualizedFileListProps {
	/** 仮想スクロール設定 */
	virtualScrollConfig?: Partial<VirtualScrollConfig>;
	/** 動的サイズ対応 */
	dynamicSize?: boolean;
	/** パフォーマンス監視 */
	enablePerformanceMonitoring?: boolean;
}

export const AdvancedVirtualizedFileList: React.FC<AdvancedVirtualizedFileListProps> =
	React.memo(
		({
			files,
			selectedIndex,
			displayConfig,
			scrollInfo,
			virtualScrollConfig = {},
			dynamicSize = false,
			enablePerformanceMonitoring = false,
			error,
			isLoading,
			emptyMessage,
		}) => {
			// レンダリング時間を測定
			useRenderTime("AdvancedVirtualizedFileList", enablePerformanceMonitoring);

			// 仮想スクロール設定の最適化
			const virtualConfig = useOptimizedMemo(
				() => ({
					itemHeight: 1,
					bufferSize: 5,
					containerHeight: scrollInfo.availableHeight,
					overscan: 3,
					dynamicSize,
					smoothScroll: true,
					...virtualScrollConfig,
				}),
				[scrollInfo.availableHeight, dynamicSize, virtualScrollConfig],
			);

			// 最適化された仮想スクロール
			const {
				state: virtualState,
				handleScroll,
				updateItemSize,
			} = useOptimizedVirtualScroll(files, virtualConfig);

			// 動的サイズ対応
			const { measureItemSize, getItemSize } = useDynamicVirtualScroll(
				files,
				virtualConfig,
			);

			// 可視性監視
			const handleIntersection = useOptimizedCallback(
				(entries: IntersectionObserverEntry[]) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							const element = entry.target as HTMLElement;
							const index = parseInt(element.dataset.index || "0", 10);
							if (dynamicSize && element) {
								measureItemSize(index, element);
							}
						}
					});
				},
				[dynamicSize, measureItemSize],
			);

			const { observe, unobserve } =
				useIntersectionObserver(handleIntersection);

			// 表示アイテムのレンダリング関数
			const renderVirtualizedItem = useOptimizedCallback(
				(file: FileItem, index: number) => {
					const actualIndex = virtualState.startIndex + index;
					const isSelected = actualIndex === selectedIndex;
					const itemSize = dynamicSize
						? getItemSize(actualIndex)
						: virtualConfig.itemHeight;

					return (
						<div
							key={`${file.name}-${actualIndex}`}
							data-index={actualIndex}
							style={{ height: itemSize }}
							ref={(el) => {
								if (el) {
									observe(el);
								} else {
									// クリーンアップ処理は useIntersectionObserver で処理
								}
							}}
						>
							<FileItemComponent
								file={file}
								isSelected={isSelected}
								displayConfig={displayConfig}
							/>
						</div>
					);
				},
				[
					virtualState.startIndex,
					selectedIndex,
					displayConfig,
					dynamicSize,
					getItemSize,
					virtualConfig.itemHeight,
					observe,
				],
			);

			// 表示するファイル
			const visibleFiles = useVirtualizedMemo(
				() => files.slice(virtualState.startIndex, virtualState.endIndex + 1),
				virtualState.startIndex,
				virtualState.endIndex,
				files.length,
			);

			// ローディング状態
			if (isLoading) {
				return (
					<Box justifyContent="center" alignItems="center">
						<Text dimColor>Loading...</Text>
					</Box>
				);
			}

			// エラー状態
			if (error) {
				return (
					<Box justifyContent="center" alignItems="center">
						<Text color="red">{error}</Text>
					</Box>
				);
			}

			// 空の状態
			if (files.length === 0) {
				return (
					<Box justifyContent="center" alignItems="center">
						<Text dimColor>{emptyMessage}</Text>
					</Box>
				);
			}

			return (
				<Box flexDirection="column" height={virtualConfig.containerHeight}>
					{/* 上部スペーサー */}
					{virtualState.topSpacerHeight > 0 && (
						<Box height={virtualState.topSpacerHeight}>
							<Text> </Text>
						</Box>
					)}

					{/* 仮想化されたアイテム */}
					{visibleFiles.map((file, index) =>
						renderVirtualizedItem(file, index),
					)}

					{/* 下部スペーサー */}
					{virtualState.bottomSpacerHeight > 0 && (
						<Box height={virtualState.bottomSpacerHeight}>
							<Text> </Text>
						</Box>
					)}

					{/* パフォーマンス統計 */}
					{enablePerformanceMonitoring && (
						<Box>
							<Text dimColor>
								Rendered: {virtualState.endIndex - virtualState.startIndex + 1}{" "}
								/ {files.length}
							</Text>
						</Box>
					)}
				</Box>
			);
		},
		(prevProps, nextProps) => {
			// 高度な比較関数
			return (
				areFilesEqual(prevProps.files, nextProps.files) &&
				prevProps.selectedIndex === nextProps.selectedIndex &&
				areDisplayConfigsEqual(
					prevProps.displayConfig,
					nextProps.displayConfig,
				) &&
				prevProps.scrollInfo.visibleStartIndex ===
					nextProps.scrollInfo.visibleStartIndex &&
				prevProps.scrollInfo.visibleEndIndex ===
					nextProps.scrollInfo.visibleEndIndex &&
				prevProps.scrollInfo.availableHeight ===
					nextProps.scrollInfo.availableHeight &&
				prevProps.dynamicSize === nextProps.dynamicSize &&
				prevProps.enablePerformanceMonitoring ===
					nextProps.enablePerformanceMonitoring &&
				prevProps.error === nextProps.error &&
				prevProps.isLoading === nextProps.isLoading &&
				prevProps.emptyMessage === nextProps.emptyMessage
			);
		},
	);

AdvancedVirtualizedFileList.displayName = "AdvancedVirtualizedFileList";

/**
 * ファイルリストの統計情報コンポーネント
 */
interface FileListStatsProps {
	/** ファイルリスト */
	files: FileItem[];
	/** 表示設定 */
	displayConfig: DisplayConfig;
}

export const FileListStats: React.FC<FileListStatsProps> = React.memo(
	({ files }) => {
		const stats = React.useMemo(() => {
			const totalFiles = files.filter((f) => !f.isDirectory).length;
			const totalDirectories = files.filter((f) => f.isDirectory).length;
			const totalSize = files
				.filter((f) => !f.isDirectory)
				.reduce((acc, f) => acc + f.size, 0);

			return { totalFiles, totalDirectories, totalSize };
		}, [files]);

		// 狭い画面では統計情報を省略
		if (process.stdout.columns && process.stdout.columns < 60) {
			return null;
		}

		return (
			<Box justifyContent="space-between">
				<Text dimColor>
					{stats.totalDirectories} dirs, {stats.totalFiles} files
				</Text>
				{stats.totalSize > 0 && (
					<Text dimColor>{formatBytes(stats.totalSize)}</Text>
				)}
			</Box>
		);
	},
);

FileListStats.displayName = "FileListStats";

/**
 * スクロールインジケーターコンポーネント
 */
interface ScrollIndicatorProps {
	/** スクロール情報 */
	scrollInfo: ScrollInfo;
	/** 表示設定 */
	displayConfig: DisplayConfig;
}

export const ScrollIndicator: React.FC<ScrollIndicatorProps> = React.memo(
	({ scrollInfo }) => {
		const needsScrollIndicator =
			scrollInfo.totalItems > scrollInfo.availableHeight;

		if (!needsScrollIndicator) {
			return <Text> </Text>; // レイアウトを維持するための空のスペース
		}

		const indicator = formatScrollIndicator(
			scrollInfo.visibleStartIndex,
			scrollInfo.visibleEndIndex,
			scrollInfo.totalItems,
		);

		return (
			<Box justifyContent="center">
				<Text dimColor>{indicator}</Text>
			</Box>
		);
	},
);

ScrollIndicator.displayName = "ScrollIndicator";

/**
 * ファイルリストのフィルター機能（最適化版）
 */
export const useFileListFilter = (files: FileItem[]) => {
	const [filter, setFilter] = React.useState("");
	const [showHidden, setShowHidden] = React.useState(false);

	// デバウンス処理を適用
	const debouncedFilter = useDebounce(filter, 300);

	// フィルタリング処理を最適化
	const filteredFiles = useOptimizedMemo(
		() => {
			let result = files;

			// 隠しファイルのフィルター
			if (!showHidden) {
				result = result.filter(
					(file) => !file.name.startsWith(".") || file.name === "..",
				);
			}

			// 名前によるフィルター（デバウンス適用）
			if (debouncedFilter.trim()) {
				const filterLower = debouncedFilter.toLowerCase();
				result = result.filter((file) =>
					file.name.toLowerCase().includes(filterLower),
				);
			}

			return result;
		},
		[files, debouncedFilter, showHidden],
		areFilesEqual,
	);

	// フィルター設定関数を最適化
	const optimizedSetFilter = useOptimizedCallback((newFilter: string) => {
		setFilter(newFilter);
	}, []);

	const optimizedSetShowHidden = useOptimizedCallback(
		(newShowHidden: boolean) => {
			setShowHidden(newShowHidden);
		},
		[],
	);

	return {
		filteredFiles,
		filter,
		setFilter: optimizedSetFilter,
		showHidden,
		setShowHidden: optimizedSetShowHidden,
	};
};

/**
 * ファイルリストの選択状態管理（最適化版）
 */
export const useFileListSelection = (files: FileItem[]) => {
	const [selectedIndex, setSelectedIndex] = React.useState(0);
	const [multiSelection, setMultiSelection] = React.useState<number[]>([]);

	// 選択インデックスの正規化（最適化）
	const normalizedIndex = useOptimizedMemo(() => {
		return Math.max(0, Math.min(selectedIndex, files.length - 1));
	}, [selectedIndex, files.length]);

	// 選択操作のバッチ処理
	const selectNext = useOptimizedCallback(() => {
		setSelectedIndex((prev) => Math.min(prev + 1, files.length - 1));
	}, [files.length]);

	const selectPrevious = useOptimizedCallback(() => {
		setSelectedIndex((prev) => Math.max(prev - 1, 0));
	}, []);

	const selectItem = useOptimizedCallback(
		(index: number) => {
			if (index >= 0 && index < files.length) {
				setSelectedIndex(index);
			}
		},
		[files.length],
	);

	// 複数選択の最適化
	const toggleMultiSelection = useOptimizedCallback((index: number) => {
		setMultiSelection((prev) => {
			if (prev.includes(index)) {
				return prev.filter((i) => i !== index);
			} else {
				return [...prev, index];
			}
		});
	}, []);

	const clearMultiSelection = useOptimizedCallback(() => {
		setMultiSelection([]);
	}, []);

	// 選択されたファイルを取得
	const selectedFile = useOptimizedMemo(() => {
		return files[normalizedIndex] || null;
	}, [files, normalizedIndex]);

	// 複数選択されたファイルを取得
	const selectedFiles = useOptimizedMemo(() => {
		return multiSelection.map((index) => files[index]).filter(Boolean);
	}, [multiSelection, files]);

	// 選択状態の統計情報
	const selectionStats = useOptimizedMemo(() => {
		return {
			selectedCount: multiSelection.length,
			hasSelection: normalizedIndex >= 0 && normalizedIndex < files.length,
			hasMultiSelection: multiSelection.length > 0,
		};
	}, [multiSelection.length, normalizedIndex, files.length]);

	return {
		selectedIndex: normalizedIndex,
		multiSelection,
		selectNext,
		selectPrevious,
		selectItem,
		toggleMultiSelection,
		clearMultiSelection,
		selectedFile,
		selectedFiles,
		selectionStats,
	};
};

/**
 * バイト数を人間が読みやすい形式に変換する補助関数
 */
const formatBytes = (bytes: number): string => {
	if (bytes === 0) return "0 B";

	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
};
