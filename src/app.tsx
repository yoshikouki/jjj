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
	const [terminalHeight, setTerminalHeight] = useState(
		process.stdout.rows || 24,
	);
	const [visibleStartIndex, setVisibleStartIndex] = useState(0);
	const [debugMode, setDebugMode] = useState(false); // Debug mode toggle
	const { exit } = useApp();

	// Calculate available height for file list
	const calculateAvailableHeight = () => {
		let usedHeight = 0;

		// Debug info (if enabled): 3 lines (border + padding + content)
		if (debugMode) {
			usedHeight += 3;
		}

		// Header: 1 line + marginBottom
		usedHeight += 2;

		// Error display (if present): 1 line + marginBottom
		if (error) {
			usedHeight += 2;
		}

		// Footer: 1 line + marginTop
		usedHeight += 2;

		// Scroll indicator: 1 line + marginTop (always reserve space to avoid layout shift)
		usedHeight += 2;

		// Add buffer for terminal rendering issues (tmux, etc.)
		usedHeight += 1;

		// Calculate final available height
		const availableHeight = terminalHeight - usedHeight;

		// Ensure minimum display height of 5 lines for better usability
		// For very small terminals, reduce minimum to 3 lines
		const minHeight = terminalHeight < 15 ? 3 : 5;
		return Math.max(minHeight, availableHeight);
	};

	// Monitor terminal size
	useEffect(() => {
		const handleResize = () => {
			const newWidth = process.stdout.columns || 80;
			const newHeight = process.stdout.rows || 24;

			// Ensure minimum terminal size
			setTerminalWidth(Math.max(20, newWidth));
			setTerminalHeight(Math.max(10, newHeight));

			// Reset scroll position when terminal size changes significantly
			if (Math.abs(newHeight - terminalHeight) > 5) {
				setVisibleStartIndex(0);
			}
		};

		// Initial size check
		handleResize();

		process.stdout.on("resize", handleResize);
		return () => {
			process.stdout.off("resize", handleResize);
		};
	}, [terminalHeight]);

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
			setVisibleStartIndex(0);
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

		// Toggle debug mode with 'd' key
		if (input === "d") {
			setDebugMode(!debugMode);
			return;
		}

		if (input === " ") {
			// Space key: toggle preview
			const selected = files[selectedIndex];
			if (selected && !selected.isDirectory) {
				if (showPreview) {
					setShowPreview(false);
					setPreview(null);
				} else {
					const filePath = path.join(currentPath, selected.name);
					loadPreview(filePath);
					setShowPreview(true);
				}
			}
			return;
		}

		if (input === "d") {
			// Debug mode toggle
			setDebugMode(!debugMode);
			return;
		}

		if (key.escape && showPreview) {
			setShowPreview(false);
			setPreview(null);
			return;
		}

		if (key.upArrow) {
			const newIndex = Math.max(0, selectedIndex - 1);
			setSelectedIndex(newIndex);

			// Update visible window for scrolling
			if (newIndex < visibleStartIndex) {
				setVisibleStartIndex(newIndex);
			}

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

			// Update visible window for scrolling
			const availableHeight = calculateAvailableHeight();
			if (newIndex >= visibleStartIndex + availableHeight) {
				setVisibleStartIndex(newIndex - availableHeight + 1);
			}

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

		if (key.leftArrow) {
			if (showPreview) {
				// In preview mode: close preview
				setShowPreview(false);
				setPreview(null);
			} else {
				// Navigate to parent directory
				setCurrentPath(path.dirname(currentPath));
				setShowPreview(false);
				setPreview(null);
			}
		}

		if (key.rightArrow) {
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
					// Preview file
					const filePath = path.join(currentPath, selected.name);
					loadPreview(filePath);
					setShowPreview(true);
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
		// Get previous/next file info
		const getPrevNextFiles = () => {
			const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : null;
			const nextIndex =
				selectedIndex < files.length - 1 ? selectedIndex + 1 : null;

			const prevFile = prevIndex !== null ? files[prevIndex] : null;
			const nextFile = nextIndex !== null ? files[nextIndex] : null;

			return { prevFile, nextFile };
		};

		const { prevFile, nextFile } = getPrevNextFiles();

		// Calculate dynamic preview height
		// Header (2) + Footer (2) + Navigation hints (2) = 6 minimum
		const previewHeight = Math.max(5, terminalHeight - 8); // Add buffer for better rendering

		// Preview screen
		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color="yellow">
						📄 Preview: {files[selectedIndex]?.name}
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
					{/* Navigation hints */}
					{terminalHeight > 10 && (
						<Box justifyContent="space-between">
							<Text dimColor>
								{prevFile
									? `↑ ${truncateFileName(prevFile.name, terminalWidth / 2 - 5)}`
									: ""}
							</Text>
							<Text dimColor>
								{nextFile
									? `${truncateFileName(nextFile.name, terminalWidth / 2 - 5)} ↓`
									: ""}
							</Text>
						</Box>
					)}
					<Box marginTop={terminalHeight > 10 ? 1 : 0}>
						<Text dimColor>
							{terminalHeight > 8
								? "Space: Toggle | ←: Back | ↑↓: Navigate | Enter/ESC: Exit"
								: "Space ← ↑↓ Enter ESC"}
						</Text>
					</Box>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			{/* Debug info */}
			{debugMode && (
				<Box marginBottom={1} borderStyle="single" padding={1}>
					<Text dimColor>
						Terminal: {terminalHeight}x{terminalWidth} | Available:{" "}
						{calculateAvailableHeight()} | Files: {files.length} | Visible:{" "}
						{visibleStartIndex}-
						{Math.min(
							visibleStartIndex + calculateAvailableHeight(),
							files.length,
						)}{" "}
						| Error: {error ? "Yes" : "No"}
					</Text>
				</Box>
			)}

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
				{(() => {
					const availableHeight = calculateAvailableHeight();
					const visibleFiles = files.slice(
						visibleStartIndex,
						visibleStartIndex + availableHeight,
					);

					return visibleFiles.map((file, visibleIndex) => {
						const actualIndex = visibleStartIndex + visibleIndex;
						return (
							<Box key={`${file.name}-${actualIndex}`}>
								<Text
									color={selectedIndex === actualIndex ? "green" : "white"}
									backgroundColor={
										selectedIndex === actualIndex ? "gray" : undefined
									}
								>
									{selectedIndex === actualIndex ? "▶ " : "  "}
									{file.isDirectory ? "📁" : "📄"}{" "}
									{truncateFileName(file.name, terminalWidth)}
									{!file.isDirectory &&
										terminalWidth > 60 &&
										` (${formatFileSize(file.size)})`}
								</Text>
							</Box>
						);
					});
				})()}
			</Box>

			{/* Scroll indicators - always render to maintain consistent layout */}
			<Box justifyContent="center" marginTop={1} height={1}>
				{(() => {
					const availableHeight = calculateAvailableHeight();
					const needsScrollIndicator = files.length > availableHeight;

					if (!needsScrollIndicator) {
						return <Text> </Text>; // Empty space to maintain layout
					}

					return (
						<Text dimColor>
							{visibleStartIndex > 0 ? "↑ " : ""}
							{`${visibleStartIndex + 1}-${Math.min(visibleStartIndex + availableHeight, files.length)} of ${files.length}`}
							{visibleStartIndex + availableHeight < files.length ? " ↓" : ""}
						</Text>
					);
				})()}
			</Box>

			{/* Footer */}
			<Box marginTop={1}>
				<Text dimColor>
					{terminalWidth > 50
						? "↑↓: Navigate | ←→: Dir/Preview | Space: Toggle | Enter: Open | q: Quit | d: Debug"
						: "↑↓←→ Space Enter q d"}
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
