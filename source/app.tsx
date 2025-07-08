import * as fs from "node:fs";
import * as path from "node:path";
import { Box, Text, useApp, useInput } from "ink";
import React, { useEffect, useState } from "react";

type FileItem = {
	name: string;
	isDirectory: boolean;
	size: number;
	modified: Date;
};

export default function App() {
	const [currentPath, setCurrentPath] = useState(process.cwd());
	const [files, setFiles] = useState<FileItem[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const { exit } = useApp();

	// ファイル一覧を読み込む
	useEffect(() => {
		try {
			const entries = fs.readdirSync(currentPath);
			const fileItems: FileItem[] = entries
				.map((name) => {
					try {
						const stats = fs.statSync(path.join(currentPath, name));
						return {
							name,
							isDirectory: stats.isDirectory(),
							size: stats.size,
							modified: stats.mtime,
						};
					} catch {
						return null;
					}
				})
				.filter((item): item is FileItem => item !== null)
				.sort((a, b) => {
					// ディレクトリを先に表示
					if (a.isDirectory && !b.isDirectory) return -1;
					if (!a.isDirectory && b.isDirectory) return 1;
					return a.name.localeCompare(b.name);
				});

			// 親ディレクトリへの移動を追加
			if (currentPath !== "/") {
				fileItems.unshift({
					name: "..",
					isDirectory: true,
					size: 0,
					modified: new Date(),
				});
			}

			setFiles(fileItems);
			setSelectedIndex(0);
			setError(null);
		} catch (err) {
			setError(`Error reading directory: ${err}`);
		}
	}, [currentPath]);

	// キーボード入力処理
	useInput((input, key) => {
		if (input === "q") {
			exit();
		}

		if (key.upArrow) {
			setSelectedIndex((prev) => Math.max(0, prev - 1));
		}

		if (key.downArrow) {
			setSelectedIndex((prev) => Math.min(files.length - 1, prev + 1));
		}

		if (key.return) {
			const selected = files[selectedIndex];
			if (selected?.isDirectory) {
				if (selected.name === "..") {
					setCurrentPath(path.dirname(currentPath));
				} else {
					setCurrentPath(path.join(currentPath, selected.name));
				}
			}
		}
	});

	return (
		<Box flexDirection="column">
			{/* ヘッダー */}
			<Box marginBottom={1}>
				<Text bold color="cyan">
					📁 {currentPath}
				</Text>
			</Box>

			{/* エラー表示 */}
			{error && (
				<Box marginBottom={1}>
					<Text color="red">{error}</Text>
				</Box>
			)}

			{/* ファイル一覧 */}
			<Box flexDirection="column">
				{files.map((file, index) => (
					<Box key={`${file.name}-${index}`}>
						<Text
							color={selectedIndex === index ? "green" : "white"}
							backgroundColor={selectedIndex === index ? "gray" : undefined}
						>
							{selectedIndex === index ? "▶ " : "  "}
							{file.isDirectory ? "📁" : "📄"} {file.name}
							{!file.isDirectory && ` (${formatFileSize(file.size)})`}
						</Text>
					</Box>
				))}
			</Box>

			{/* フッター */}
			<Box marginTop={1}>
				<Text dimColor>↑↓: Navigate | Enter: Open | q: Quit</Text>
			</Box>
		</Box>
	);
}

// ファイルサイズをフォーマット
function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}
