/**
 * メインのファイルナビゲーションコンポーネント
 *
 * 全体のレイアウト、キーボード操作、プレビュー機能を統合
 */

import * as path from "node:path";
import { Box, Text, useInput } from "ink";
import React, { useCallback, useEffect, useState } from "react";
import {
	type UseFileNavigationExtended,
	useFileNavigation,
} from "../hooks/useFileNavigation.js";
import { readFilePreview } from "../services/fileSystem.js";
import type {
	DisplayConfig,
	ScrollInfo,
	TerminalSize,
} from "../types/index.js";
import { getDefaultDisplayConfig, truncatePath } from "../utils/fileFormat.js";
import { ScrollIndicator, VirtualizedFileList } from "./FileList.js";

/**
 * ファイルナビゲーションコンポーネントのプロパティ
 */
interface FileNavigationProps {
	/** 初期パス */
	initialPath?: string;
	/** 終了ハンドラー */
	onExit?: () => void;
	/** デバッグモード */
	debugMode?: boolean;
}

/**
 * ファイルナビゲーションコンポーネント
 */
export const FileNavigation: React.FC<FileNavigationProps> = ({
	initialPath = process.cwd(),
	onExit,
	debugMode = false,
}) => {
	// ファイルナビゲーションフック
	const navigation = useFileNavigation(
		initialPath,
	) as UseFileNavigationExtended;
	const { state, actions, getSelectedFile, getNavigationInfo } = navigation;

	// UI状態
	const [terminalSize] = useState<TerminalSize>({
		width: process.stdout.columns || 80,
		height: process.stdout.rows || 24,
	});
	const [visibleStartIndex, setVisibleStartIndex] = useState(0);
	const [preview, setPreview] = useState<string | null>(null);
	const [showPreview, setShowPreview] = useState(false);
	const [showDebug, setShowDebug] = useState(debugMode);

	// 表示設定
	const displayConfig: DisplayConfig = getDefaultDisplayConfig(terminalSize);

	// 利用可能な高さを計算
	const calculateAvailableHeight = useCallback(() => {
		let usedHeight = 0;

		// デバッグ情報
		if (showDebug) {
			usedHeight += 3;
		}

		// ヘッダー
		usedHeight += 2;

		// エラー表示
		if (state.error) {
			usedHeight += 2;
		}

		// フッター
		usedHeight += 2;

		// スクロールインジケーター
		usedHeight += 2;

		// バッファ
		usedHeight += 1;

		const availableHeight = terminalSize.height - usedHeight;
		const minHeight = terminalSize.height < 15 ? 3 : 5;

		return Math.max(minHeight, availableHeight);
	}, [terminalSize.height, showDebug, state.error]);

	// スクロール情報
	const scrollInfo: ScrollInfo = {
		visibleStartIndex,
		visibleEndIndex: Math.min(
			visibleStartIndex + calculateAvailableHeight(),
			state.files.length,
		),
		totalItems: state.files.length,
		availableHeight: calculateAvailableHeight(),
	};

	// 選択変更時のスクロール調整
	useEffect(() => {
		const selectedIndex = state.selectedIndex;
		const availableHeight = calculateAvailableHeight();

		if (selectedIndex < visibleStartIndex) {
			setVisibleStartIndex(selectedIndex);
		} else if (selectedIndex >= visibleStartIndex + availableHeight) {
			setVisibleStartIndex(selectedIndex - availableHeight + 1);
		}
	}, [state.selectedIndex, visibleStartIndex, calculateAvailableHeight]);

	// プレビュー読み込み
	const loadPreview = async (filePath: string) => {
		setPreview(null);

		try {
			const result = await readFilePreview(filePath);
			if (result.success && result.data) {
				setPreview(result.data);
			} else {
				setPreview(result.error || "Failed to load preview");
			}
		} catch (error) {
			setPreview(`Preview error: ${error}`);
		}
	};

	// キーボード操作
	useInput((input, key) => {
		if (input === "q") {
			onExit?.();
			return;
		}

		if (input === "d") {
			setShowDebug(!showDebug);
			return;
		}

		if (input === " ") {
			// スペースキー: プレビュー切り替え
			const selected = getSelectedFile();
			if (selected && !selected.isDirectory) {
				if (showPreview) {
					setShowPreview(false);
					setPreview(null);
				} else {
					const filePath = path.join(state.currentPath, selected.name);
					loadPreview(filePath);
					setShowPreview(true);
				}
			}
			return;
		}

		if (key.escape && showPreview) {
			setShowPreview(false);
			setPreview(null);
			return;
		}

		if (key.upArrow) {
			actions.selectPrevious();

			// プレビューモードの場合は新しいファイルをプレビュー
			if (showPreview) {
				const newSelected = getSelectedFile();
				if (newSelected && !newSelected.isDirectory) {
					const filePath = path.join(state.currentPath, newSelected.name);
					loadPreview(filePath);
				} else {
					setShowPreview(false);
					setPreview(null);
				}
			}
		}

		if (key.downArrow) {
			actions.selectNext();

			// プレビューモードの場合は新しいファイルをプレビュー
			if (showPreview) {
				const newSelected = getSelectedFile();
				if (newSelected && !newSelected.isDirectory) {
					const filePath = path.join(state.currentPath, newSelected.name);
					loadPreview(filePath);
				} else {
					setShowPreview(false);
					setPreview(null);
				}
			}
		}

		if (key.leftArrow) {
			if (showPreview) {
				setShowPreview(false);
				setPreview(null);
			} else {
				actions.navigateUp();
				setShowPreview(false);
				setPreview(null);
			}
		}

		if (key.rightArrow) {
			const selected = getSelectedFile();
			if (selected) {
				if (selected.isDirectory) {
					if (selected.name === "..") {
						actions.navigateUp();
					} else {
						const newPath = path.join(state.currentPath, selected.name);
						actions.navigateToDirectory(newPath);
					}
				} else {
					const filePath = path.join(state.currentPath, selected.name);
					loadPreview(filePath);
					setShowPreview(true);
				}
			}
		}

		if (key.return) {
			const selected = getSelectedFile();
			if (selected) {
				if (selected.isDirectory) {
					if (selected.name === "..") {
						actions.navigateUp();
					} else {
						const newPath = path.join(state.currentPath, selected.name);
						actions.navigateToDirectory(newPath);
					}
				} else {
					if (showPreview) {
						setShowPreview(false);
						setPreview(null);
					} else {
						const filePath = path.join(state.currentPath, selected.name);
						loadPreview(filePath);
						setShowPreview(true);
					}
				}
			}
		}
	});

	// プレビュー画面
	if (showPreview) {
		const { prevFile, nextFile } = getNavigationInfo();
		const previewHeight = Math.max(5, terminalSize.height - 8);

		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color="yellow">
						📄 Preview: {getSelectedFile()?.name}
					</Text>
				</Box>

				<Box
					borderStyle="single"
					padding={1}
					flexDirection="column"
					height={previewHeight}
				>
					{preview ? <Text>{preview}</Text> : <Text dimColor>Loading...</Text>}
				</Box>

				<Box marginTop={1} flexDirection="column">
					{terminalSize.height > 10 && (
						<Box justifyContent="space-between">
							<Text dimColor>
								{prevFile
									? `↑ ${truncatePath(prevFile.name, terminalSize.width / 2 - 5)}`
									: ""}
							</Text>
							<Text dimColor>
								{nextFile
									? `${truncatePath(nextFile.name, terminalSize.width / 2 - 5)} ↓`
									: ""}
							</Text>
						</Box>
					)}

					<Box marginTop={terminalSize.height > 10 ? 1 : 0}>
						<Text dimColor>
							{terminalSize.height > 8
								? "Space: Toggle | ←: Back | ↑↓: Navigate | Enter/ESC: Exit"
								: "Space ← ↑↓ Enter ESC"}
						</Text>
					</Box>
				</Box>
			</Box>
		);
	}

	// メイン画面
	return (
		<Box flexDirection="column">
			{/* デバッグ情報 */}
			{showDebug && (
				<Box marginBottom={1} borderStyle="single" padding={1}>
					<Text dimColor>
						Terminal: {terminalSize.height}x{terminalSize.width} | Available:{" "}
						{calculateAvailableHeight()} | Files: {state.files.length} |
						Visible: {visibleStartIndex}-
						{Math.min(
							visibleStartIndex + calculateAvailableHeight(),
							state.files.length,
						)}{" "}
						| Error: {state.error ? "Yes" : "No"}
					</Text>
				</Box>
			)}

			{/* ヘッダー */}
			<Box marginBottom={1}>
				<Text bold color="cyan">
					📁 {truncatePath(state.currentPath, terminalSize.width - 2)}
				</Text>
			</Box>

			{/* エラー表示 */}
			{state.error && (
				<Box marginBottom={1}>
					<Text color="red">{state.error}</Text>
				</Box>
			)}

			{/* ファイルリスト */}
			<VirtualizedFileList
				files={state.files}
				selectedIndex={state.selectedIndex}
				displayConfig={displayConfig}
				scrollInfo={scrollInfo}
				onFileSelect={actions.selectFile}
				onFileActivate={(file) => {
					if (file.isDirectory) {
						if (file.name === "..") {
							actions.navigateUp();
						} else {
							const newPath = path.join(state.currentPath, file.name);
							actions.navigateToDirectory(newPath);
						}
					}
				}}
				error={state.error}
				isLoading={state.isLoading}
			/>

			{/* スクロールインジケーター */}
			<Box justifyContent="center" marginTop={1} height={1}>
				<ScrollIndicator
					scrollInfo={scrollInfo}
					displayConfig={displayConfig}
				/>
			</Box>

			{/* フッター */}
			<Box marginTop={1}>
				<Text dimColor>
					{terminalSize.width > 50
						? "↑↓: Navigate | ←→: Dir/Preview | Space: Toggle | Enter: Open | q: Quit | d: Debug"
						: "↑↓←→ Space Enter q d"}
				</Text>
			</Box>
		</Box>
	);
};

/**
 * ファイルナビゲーションのプロバイダーコンポーネント
 */
interface FileNavigationProviderProps {
	children: React.ReactNode;
	initialPath?: string;
}

export const FileNavigationProvider: React.FC<FileNavigationProviderProps> = ({
	children,
	initialPath = process.cwd(),
}) => {
	const navigation = useFileNavigation(
		initialPath,
	) as UseFileNavigationExtended;

	return (
		<FileNavigationContext.Provider value={navigation}>
			{children}
		</FileNavigationContext.Provider>
	);
};

/**
 * ファイルナビゲーションコンテキスト
 */
const FileNavigationContext =
	React.createContext<UseFileNavigationExtended | null>(null);

/**
 * ファイルナビゲーションコンテキストフック
 */
export const useFileNavigationContext = () => {
	const context = React.useContext(FileNavigationContext);
	if (!context) {
		throw new Error(
			"useFileNavigationContext must be used within FileNavigationProvider",
		);
	}
	return context;
};

/**
 * ファイルナビゲーションの便利なエクスポート
 */
export {
	useFileNavigation,
	useFileNavigationKeys,
} from "../hooks/useFileNavigation.js";
export * from "../services/fileSystem.js";
export * from "../types/index.js";
export * from "../utils/fileFormat.js";
export * from "../utils/fileSort.js";
export { FileItemComponent as FileItem } from "./FileItem.js";
export { FileList, VirtualizedFileList } from "./FileList.js";
