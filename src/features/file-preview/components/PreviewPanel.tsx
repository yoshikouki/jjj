/**
 * Preview Panel Component
 * Displays file content preview in a panel
 */

import { Box, Text } from "ink";
import type React from "react";
import type { PreviewState } from "../types/index.js";

/**
 * Preview panel props
 */
interface PreviewPanelProps {
	/** Preview state */
	state: PreviewState;
	/** Panel width */
	width: number;
	/** Panel height */
	height: number;
}

/**
 * Format file size for display
 */
const formatFileSize = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Get visible content lines with scroll offset
 */
const getVisibleContent = (
	content: string,
	scrollOffset: number,
	maxLines: number,
): string[] => {
	const lines = content.split("\n");
	const visibleLines = lines.slice(scrollOffset, scrollOffset + maxLines);

	// Add scroll indicators if needed
	if (scrollOffset > 0 && lines.length > maxLines) {
		visibleLines[0] = `↑ (${scrollOffset} lines above)`;
	}

	if (scrollOffset + maxLines < lines.length) {
		visibleLines[visibleLines.length - 1] = `↓ (${
			lines.length - scrollOffset - maxLines
		} lines below)`;
	}

	return visibleLines;
};

/**
 * Preview panel component
 */
export const PreviewPanel: React.FC<PreviewPanelProps> = ({
	state,
	width,
	height,
}) => {
	if (!state.isVisible) return null;

	// Calculate available content height (minus header and footer)
	const contentHeight = height - 3;
	const contentWidth = width - 4;

	return (
		<Box flexDirection="column" width={width} height={height}>
			{/* Header */}
			<Box
				justifyContent="space-between"
				borderStyle="single"
				borderColor="cyan"
				paddingX={1}
			>
				<Text color="cyan" bold>
					📄 {state.file?.name || "Unknown"}
				</Text>
				{state.file && (
					<Text color="gray">{formatFileSize(state.file.size)}</Text>
				)}
			</Box>

			{/* Content */}
			<Box flexDirection="column" height={contentHeight} paddingX={2}>
				{state.isLoading && (
					<Box justifyContent="center" alignItems="center" height="100%">
						<Text color="blue">Loading preview...</Text>
					</Box>
				)}

				{state.error && (
					<Box justifyContent="center" alignItems="center" height="100%">
						<Text color="red">{state.error}</Text>
					</Box>
				)}

				{state.content && !state.isLoading && !state.error && (
					<Box flexDirection="column" width={contentWidth}>
						{getVisibleContent(
							state.content,
							state.scrollOffset,
							contentHeight,
						).map((line, index) => (
							<Text key={index} wrap="truncate">
								{line}
							</Text>
						))}
					</Box>
				)}
			</Box>

			{/* Footer */}
			<Box borderStyle="single" borderColor="gray" paddingX={1}>
				<Text color="gray">[ESC/Space/Enter] Close [↑↓] Scroll [q] Quit</Text>
			</Box>
		</Box>
	);
};
