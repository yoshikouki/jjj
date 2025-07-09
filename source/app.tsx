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
	const [preview, setPreview] = useState<string | null>(null);
	const [showPreview, setShowPreview] = useState(false);
	const [terminalWidth, setTerminalWidth] = useState(
		process.stdout.columns || 80,
	);
	const { exit } = useApp();

	// Monitor terminal size
	useEffect(() => {
		const handleResize = () => {
			setTerminalWidth(process.stdout.columns || 80);
		};

		process.stdout.on("resize", handleResize);
		return () => {
			process.stdout.off("resize", handleResize);
		};
	}, []);

	// Load file list
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
					// Show directories first
					if (a.isDirectory && !b.isDirectory) return -1;
					if (!a.isDirectory && b.isDirectory) return 1;
					return a.name.localeCompare(b.name);
				});

			// Add parent directory navigation
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

	// Load file preview
	const loadPreview = (filePath: string) => {
		// Clear previous preview first
		setPreview(null);
		
		setTimeout(() => {
			try {
				const stats = fs.statSync(filePath);
				if (stats.size > 1024 * 1024) {
					// Don't load files larger than 1MB
					setPreview("File too large (> 1MB)");
					return;
				}

				const content = fs.readFileSync(filePath, "utf-8");
				const lines = content.split("\n").slice(0, 10); // Show only first 10 lines
				setPreview(lines.join("\n"));
			} catch (err) {
				setPreview(`Cannot preview: ${err}`);
			}
		}, 50); // Small delay to prevent render conflicts
	};

	// Handle keyboard input
	useInput((input, key) => {
		if (input === "q") {
			exit();
		}

		if (key.escape && showPreview) {
			setShowPreview(false);
			setPreview(null);
			return;
		}

		if (key.upArrow) {
			const newIndex = Math.max(0, selectedIndex - 1);
			setSelectedIndex(newIndex);
			
			// If in preview mode, update preview for the new file
			if (showPreview) {
				const newSelected = files[newIndex];
				if (newSelected && !newSelected.isDirectory) {
					const filePath = path.join(currentPath, newSelected.name);
					loadPreview(filePath);
				} else {
					// Close preview if new selection is a directory
					setShowPreview(false);
					setPreview(null);
				}
			}
		}

		if (key.downArrow) {
			const newIndex = Math.min(files.length - 1, selectedIndex + 1);
			setSelectedIndex(newIndex);
			
			// If in preview mode, update preview for the new file
			if (showPreview) {
				const newSelected = files[newIndex];
				if (newSelected && !newSelected.isDirectory) {
					const filePath = path.join(currentPath, newSelected.name);
					loadPreview(filePath);
				} else {
					// Close preview if new selection is a directory
					setShowPreview(false);
					setPreview(null);
				}
			}
		}

		if (key.return) {
			const selected = files[selectedIndex];
			if (selected) {
				if (selected.isDirectory) {
					// Navigate to directory
					if (selected.name === "..") {
						setCurrentPath(path.dirname(currentPath));
					} else {
						setCurrentPath(path.join(currentPath, selected.name));
					}
				} else {
					// Toggle preview for files
					if (showPreview) {
						setShowPreview(false);
						setPreview(null);
					} else {
						const filePath = path.join(currentPath, selected.name);
						loadPreview(filePath);
						setShowPreview(true);
					}
				}
			}
		}
	});

	if (showPreview) {
		// Preview screen
		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color="yellow">
						📄 Preview: {files[selectedIndex]?.name}
					</Text>
				</Box>
				<Box borderStyle="single" padding={1} flexDirection="column" minHeight={10}>
					{preview ? (
						<Text>{preview}</Text>
					) : (
						<Text dimColor>Loading...</Text>
					)}
				</Box>
				<Box marginTop={1}>
					<Text dimColor>↑↓: Navigate files | Enter/ESC: Back</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			{/* Header */}
			<Box marginBottom={1}>
				<Text bold color="cyan">
					📁 {truncateFileName(currentPath, terminalWidth - 2)}
				</Text>
			</Box>

			{/* Error display */}
			{error && (
				<Box marginBottom={1}>
					<Text color="red">{error}</Text>
				</Box>
			)}

			{/* File list */}
			<Box flexDirection="column">
				{files.map((file, index) => (
					<Box key={`${file.name}-${index}`}>
						<Text
							color={selectedIndex === index ? "green" : "white"}
							backgroundColor={selectedIndex === index ? "gray" : undefined}
						>
							{selectedIndex === index ? "▶ " : "  "}
							{file.isDirectory ? "📁" : "📄"}{" "}
							{truncateFileName(file.name, terminalWidth)}
							{!file.isDirectory &&
								terminalWidth > 60 &&
								` (${formatFileSize(file.size)})`}
						</Text>
					</Box>
				))}
			</Box>

			{/* Footer */}
			<Box marginTop={1}>
				<Text dimColor>
					{terminalWidth > 50
						? "↑↓: Navigate | Enter: Open/Preview | q: Quit"
						: "↑↓ Enter q"}
				</Text>
			</Box>
		</Box>
	);
}

// Format file size
function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

// Truncate filename based on width
function truncateFileName(name: string, terminalWidth: number): string {
	// Available width minus icons and indentation
	const availableWidth = Math.max(20, terminalWidth - 25);

	if (name.length <= availableWidth) {
		return name;
	}

	// Preserve file extension
	const ext = path.extname(name);
	const baseName = path.basename(name, ext);
	const maxBaseLength = availableWidth - ext.length - 3; // For "..."

	if (maxBaseLength < 5) {
		// Very narrow case
		return `${name.slice(0, availableWidth - 3)}...`;
	}

	return `${baseName.slice(0, maxBaseLength)}...${ext}`;
}
