/**
 * メインアプリケーションコンポーネント
 *
 * 新しいファイルナビゲーション機能を統合
 */

import React from "react";
import { useApp } from "ink";
import { FileNavigation } from "./features/file-navigation/components/FileNavigation.js";

/**
 * メインアプリケーション
 */
export default function App() {
	const { exit } = useApp();

	return (
		<FileNavigation
			initialPath={process.cwd()}
			onExit={exit}
			debugMode={false}
		/>
	);
}
