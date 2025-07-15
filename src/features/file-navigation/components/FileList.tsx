/**
 * FileList Component
 * Displays files with virtualization for performance
 */

import { Box, Text } from "ink";
import React, { useMemo } from "react";
import type { FileItem } from "../types/index.js";
import {
	formatDate,
	formatFileSize,
	getFileIcon,
	truncateFilename,
} from "../utils/fileFormat.js";

interface FileListProps {
	files: readonly FileItem[];
	selectedIndex: number;
	terminalWidth: number;
	terminalHeight: number;
}

/**
 * Individual file item component
 */
const FileItemComponent: React.FC<{
	file: FileItem;
	isSelected: boolean;
	nameWidth: number;
}> = React.memo(
	({ file, isSelected, nameWidth }) => {
		// Memoize expensive computations
		const icon = React.useMemo(() => getFileIcon(file), [file]);
		const name = React.useMemo(
			() => truncateFilename(file.name, nameWidth),
			[file.name, nameWidth],
		);
		const size = React.useMemo(
			() => (file.type === "directory" ? "" : formatFileSize(file.size)),
			[file.type, file.size],
		);
		const date = React.useMemo(
			() => formatDate(file.modifiedAt),
			[file.modifiedAt],
		);

		return (
			<Box>
				<Text
					color={isSelected ? "black" : undefined}
					backgroundColor={isSelected ? "white" : undefined}
				>
					{isSelected ? ">" : " "} {icon} {name.padEnd(nameWidth)}{" "}
					{size.padStart(8)} {date.padStart(12)}
				</Text>
			</Box>
		);
	},
	(prevProps, nextProps) => {
		return (
			prevProps.file === nextProps.file &&
			prevProps.isSelected === nextProps.isSelected &&
			prevProps.nameWidth === nextProps.nameWidth
		);
	},
);

FileItemComponent.displayName = "FileItemComponent";

/**
 * File list with virtual scrolling
 */
export const FileList: React.FC<FileListProps> = React.memo(
	({ files, selectedIndex, terminalWidth, terminalHeight }) => {
		// Memoize constants to prevent recalculation
		const maxVisible = useMemo(() => terminalHeight - 4, [terminalHeight]);
		const halfMaxVisible = useMemo(
			() => Math.floor(maxVisible / 2),
			[maxVisible],
		);

		// Calculate visible range for virtual scrolling
		const visibleRange = useMemo(() => {
			const start = Math.max(0, selectedIndex - halfMaxVisible);
			const end = Math.min(files.length, start + maxVisible);

			return { start, end };
		}, [selectedIndex, halfMaxVisible, maxVisible, files.length]);

		// Calculate column widths
		const columnWidths = useMemo(() => {
			const iconWidth = 3;
			const sizeWidth = 8;
			const dateWidth = 12;
			const padding = 4; // Spaces between columns
			const nameWidth = Math.max(
				20,
				terminalWidth - iconWidth - sizeWidth - dateWidth - padding,
			);

			return { nameWidth };
		}, [terminalWidth]);

		// Get visible files
		const visibleFiles = useMemo(() => {
			return files.slice(visibleRange.start, visibleRange.end);
		}, [files, visibleRange]);

		return (
			<Box flexDirection="column">
				{/* Header */}
				<Box>
					<Text bold>📁 Files ({files.length})</Text>
				</Box>

				{/* File list */}
				<Box flexDirection="column">
					{visibleFiles.map((file, index) => {
						const actualIndex = visibleRange.start + index;
						return (
							<FileItemComponent
								key={file.path}
								file={file}
								isSelected={actualIndex === selectedIndex}
								nameWidth={columnWidths.nameWidth}
							/>
						);
					})}
				</Box>

				{/* Scroll indicator */}
				{files.length > visibleFiles.length && (
					<Box>
						<Text dimColor>
							Showing {visibleRange.start + 1}-{visibleRange.end} of{" "}
							{files.length}
						</Text>
					</Box>
				)}
			</Box>
		);
	},
	// Custom comparison function to prevent unnecessary re-renders
	(prevProps, nextProps) => {
		return (
			prevProps.files === nextProps.files &&
			prevProps.selectedIndex === nextProps.selectedIndex &&
			prevProps.terminalWidth === nextProps.terminalWidth &&
			prevProps.terminalHeight === nextProps.terminalHeight
		);
	},
);

FileList.displayName = "FileList";
