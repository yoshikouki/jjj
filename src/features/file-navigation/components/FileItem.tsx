/**
 * ファイルアイテムコンポーネント
 *
 * 個別のファイル/ディレクトリの表示を担当
 * 純粋なプレゼンテーションコンポーネント
 */

import { Box, Text } from "ink";
import React from "react";
import type { DisplayConfig, FileItem } from "../types/index.js";
import {
	formatFileSize,
	formatRelativeDate,
	getFileIcon,
	truncateFileName,
} from "../utils/fileFormat.js";
import {
	areDisplayConfigsEqual,
	areFileItemsEqual,
	useOptimizedMemo,
	useRenderTime,
} from "../utils/performanceUtils.js";

/**
 * ファイルアイテムコンポーネントのプロパティ
 */
interface FileItemProps {
	/** ファイル情報 */
	file: FileItem;
	/** 選択されているかどうか */
	isSelected: boolean;
	/** 表示設定 */
	displayConfig: DisplayConfig;
	/** クリック時のハンドラー */
	onClick?: () => void;
	/** ホバー時のハンドラー */
	onHover?: () => void;
	/** フォーカス時のハンドラー */
	onFocus?: () => void;
}

/**
 * ファイルアイテムコンポーネント
 */
export const FileItemComponent: React.FC<FileItemProps> = React.memo(
	({ file, isSelected, displayConfig }) => {
		// レンダリング時間を測定（デバッグ用）
		useRenderTime("FileItemComponent", false);

		// アイコンを取得（メモ化）
		const icon = useOptimizedMemo(
			() => getFileIcon(file),
			[file.name, file.isDirectory],
		);

		// ファイル名を切り詰め（メモ化）
		const displayName = useOptimizedMemo(
			() => truncateFileName(file.name, displayConfig.terminalSize.width),
			[file.name, displayConfig.terminalSize.width],
		);

		// 選択状態のスタイル（メモ化）
		const styles = useOptimizedMemo(
			() => ({
				textColor: isSelected ? "green" : "white",
				backgroundColor: isSelected ? "gray" : undefined,
			}),
			[isSelected],
		);

		// サイズ表示の決定（メモ化）
		const showSize = useOptimizedMemo(
			() =>
				displayConfig.showFileSize &&
				!file.isDirectory &&
				displayConfig.terminalSize.width > 60,
			[
				displayConfig.showFileSize,
				file.isDirectory,
				displayConfig.terminalSize.width,
			],
		);

		// 日付表示の決定（メモ化）
		const showDate = useOptimizedMemo(
			() =>
				displayConfig.showModifiedDate && displayConfig.terminalSize.width > 80,
			[displayConfig.showModifiedDate, displayConfig.terminalSize.width],
		);

		// フォーマットされたサイズと日付（メモ化）
		const formattedSize = useOptimizedMemo(
			() => (showSize ? formatFileSize(file.size) : null),
			[showSize, file.size],
		);

		const formattedDate = useOptimizedMemo(
			() => (showDate ? formatRelativeDate(file.modified) : null),
			[showDate, file.modified],
		);

		return (
			<Box>
				<Text color={styles.textColor} backgroundColor={styles.backgroundColor}>
					{/* 選択インジケーター */}
					{isSelected ? "▶ " : "  "}

					{/* ファイルアイコン */}
					{icon}

					{/* ファイル名 */}
					{displayName}

					{/* ファイルサイズ */}
					{formattedSize && ` (${formattedSize})`}

					{/* 更新日時 */}
					{formattedDate && ` - ${formattedDate}`}
				</Text>
			</Box>
		);
	},
	(prevProps, nextProps) => {
		// カスタム比較関数で最適化
		return (
			areFileItemsEqual(prevProps.file, nextProps.file) &&
			prevProps.isSelected === nextProps.isSelected &&
			areDisplayConfigsEqual(prevProps.displayConfig, nextProps.displayConfig)
		);
	},
);

FileItemComponent.displayName = "FileItemComponent";

/**
 * ファイルアイテムのバリアント
 */
export interface FileItemVariant {
	/** コンパクト表示 */
	compact: boolean;
	/** 詳細表示 */
	detailed: boolean;
	/** アイコンのみ表示 */
	iconOnly: boolean;
}

/**
 * コンパクトファイルアイテムコンポーネント
 */
export const CompactFileItem: React.FC<Omit<FileItemProps, "displayConfig">> =
	React.memo(({ file, isSelected }) => {
		const icon = getFileIcon(file);
		const textColor = isSelected ? "green" : "white";
		const backgroundColor = isSelected ? "gray" : undefined;

		return (
			<Box>
				<Text color={textColor} backgroundColor={backgroundColor}>
					{isSelected ? "▶ " : "  "}
					{icon} {file.name}
				</Text>
			</Box>
		);
	});

CompactFileItem.displayName = "CompactFileItem";

/**
 * 詳細ファイルアイテムコンポーネント
 */
export const DetailedFileItem: React.FC<FileItemProps> = React.memo(
	({ file, isSelected, displayConfig }) => {
		const icon = getFileIcon(file);
		const textColor = isSelected ? "green" : "white";
		const backgroundColor = isSelected ? "gray" : undefined;

		const displayName = truncateFileName(
			file.name,
			displayConfig.terminalSize.width - 40,
		);
		const size = formatFileSize(file.size);
		const date = formatRelativeDate(file.modified);

		return (
			<Box>
				<Box width="100%" justifyContent="space-between">
					<Text color={textColor} backgroundColor={backgroundColor}>
						{isSelected ? "▶ " : "  "}
						{icon} {displayName}
					</Text>

					<Box>
						{!file.isDirectory && (
							<Text color={textColor} backgroundColor={backgroundColor}>
								{size}
							</Text>
						)}
						<Text color={textColor} backgroundColor={backgroundColor} dimColor>
							{" "}
							{date}
						</Text>
					</Box>
				</Box>
			</Box>
		);
	},
);

DetailedFileItem.displayName = "DetailedFileItem";

/**
 * アイコンのみファイルアイテムコンポーネント
 */
export const IconOnlyFileItem: React.FC<Omit<FileItemProps, "displayConfig">> =
	React.memo(({ file, isSelected }) => {
		const icon = getFileIcon(file);
		const textColor = isSelected ? "green" : "white";
		const backgroundColor = isSelected ? "gray" : undefined;

		return (
			<Box>
				<Text color={textColor} backgroundColor={backgroundColor}>
					{icon}
				</Text>
			</Box>
		);
	});

IconOnlyFileItem.displayName = "IconOnlyFileItem";

/**
 * ファイルアイテムのファクトリー関数
 */
export const createFileItem = (variant: keyof FileItemVariant) => {
	switch (variant) {
		case "compact":
			return CompactFileItem;
		case "detailed":
			return DetailedFileItem;
		case "iconOnly":
			return IconOnlyFileItem;
		default:
			return FileItemComponent;
	}
};

/**
 * ファイルアイテムの選択状態を管理するフック
 */
export const useFileItemSelection = (
	files: FileItem[],
	initialIndex: number = 0,
) => {
	const [selectedIndex, setSelectedIndex] = React.useState(initialIndex);

	const selectNext = React.useCallback(() => {
		setSelectedIndex((prev) => Math.min(prev + 1, files.length - 1));
	}, [files.length]);

	const selectPrevious = React.useCallback(() => {
		setSelectedIndex((prev) => Math.max(prev - 1, 0));
	}, []);

	const selectItem = React.useCallback(
		(index: number) => {
			if (index >= 0 && index < files.length) {
				setSelectedIndex(index);
			}
		},
		[files.length],
	);

	const selectedFile = files[selectedIndex] || null;

	return {
		selectedIndex,
		selectedFile,
		selectNext,
		selectPrevious,
		selectItem,
	};
};

/**
 * ファイルアイテムのアニメーション効果
 */
export const useFileItemAnimation = (isSelected: boolean) => {
	const [isAnimating, setIsAnimating] = React.useState(false);

	React.useEffect(() => {
		if (isSelected) {
			setIsAnimating(true);
			const timer = setTimeout(() => {
				setIsAnimating(false);
			}, 200);

			return () => clearTimeout(timer);
		}
		return undefined;
	}, [isSelected]);

	return { isAnimating };
};

/**
 * ファイルアイテムのキーボードナビゲーション
 */
export const useFileItemKeyboard = (
	onEnter?: () => void,
	onSpace?: () => void,
	onEscape?: () => void,
) => {
	const handleKeyPress = React.useCallback(
		(input: string, key: { return?: boolean; escape?: boolean }) => {
			if (key.return && onEnter) {
				onEnter();
			} else if (input === " " && onSpace) {
				onSpace();
			} else if (key.escape && onEscape) {
				onEscape();
			}
		},
		[onEnter, onSpace, onEscape],
	);

	return { handleKeyPress };
};

/**
 * ファイルアイテムのコンテキストメニュー
 */
export interface FileItemContextMenuProps {
	file: FileItem;
	isVisible: boolean;
	onClose: () => void;
	onOpen?: () => void;
	onDelete?: () => void;
	onRename?: () => void;
	onCopy?: () => void;
	onMove?: () => void;
}

export const FileItemContextMenu: React.FC<FileItemContextMenuProps> =
	React.memo(
		({ file, isVisible, onOpen, onDelete, onRename, onCopy, onMove }) => {
			if (!isVisible) return null;

			return (
				<Box borderStyle="single" padding={1}>
					<Box flexDirection="column">
						<Text>{file.name}</Text>
						<Text dimColor>---</Text>
						{onOpen && <Text>Open</Text>}
						{onCopy && <Text>Copy</Text>}
						{onMove && <Text>Move</Text>}
						{onRename && <Text>Rename</Text>}
						{onDelete && <Text color="red">Delete</Text>}
					</Box>
				</Box>
			);
		},
	);

FileItemContextMenu.displayName = "FileItemContextMenu";
