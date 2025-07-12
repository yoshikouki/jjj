/**
 * Preview Panel Component
 * Displays file content preview in a panel
 */

import { Box, Text } from "ink";
import React from "react";
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
 * Calculate line number width based on total lines
 */
const calculateLineNumberWidth = (totalLines: number): number => {
	return Math.max(3, totalLines.toString().length + 1);
};

/**
 * Format line with optional line number
 */
const formatLineWithNumber = (
	line: string,
	lineNumber: number,
	lineNumberWidth: number,
	showLineNumbers: boolean,
): string => {
	if (!showLineNumbers) return line;
	
	const paddedNumber = lineNumber.toString().padStart(lineNumberWidth - 1, " ");
	return `${paddedNumber} │ ${line}`;
};

/**
 * Get visible content lines with scroll offset and line numbers
 */
const getVisibleContent = (
	content: string,
	scrollOffset: number,
	maxLines: number,
	showLineNumbers: boolean,
): string[] => {
	const lines = content.split("\n");
	const totalLines = lines.length;
	const lineNumberWidth = calculateLineNumberWidth(totalLines);
	
	let visibleLines = lines.slice(scrollOffset, scrollOffset + maxLines);
	
	// Add scroll indicators if needed
	if (scrollOffset > 0 && totalLines > maxLines) {
		const indicator = `↑ (${scrollOffset} lines above)`;
		visibleLines[0] = showLineNumbers 
			? formatLineWithNumber(indicator, scrollOffset + 1, lineNumberWidth, false)
			: indicator;
	}
	
	if (scrollOffset + maxLines < totalLines) {
		const remainingLines = totalLines - scrollOffset - maxLines;
		const indicator = `↓ (${remainingLines} lines below)`;
		const indicatorIndex = visibleLines.length - 1;
		visibleLines[indicatorIndex] = showLineNumbers
			? formatLineWithNumber(indicator, scrollOffset + maxLines, lineNumberWidth, false) 
			: indicator;
	}
	
	// Apply line numbers to regular lines
	return visibleLines.map((line, index) => {
		const lineNumber = scrollOffset + index + 1;
		const isIndicator = (scrollOffset > 0 && index === 0) || 
						   (scrollOffset + maxLines < totalLines && index === visibleLines.length - 1);
		
		if (isIndicator) return line; // Already formatted
		return formatLineWithNumber(line, lineNumber, lineNumberWidth, showLineNumbers);
	});
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
					{state.content && (
						<Text color="gray">
							{" "}| {state.content.split("\n").length} lines
							{state.displayOptions.showLineNumbers ? " | Line #: ON" : " | Line #: OFF"}
						</Text>
					)}
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
							state.displayOptions.showLineNumbers,
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
				<Text color="gray">
					[ESC/Space/Enter] Close  [↑↓] Scroll  [L] Line numbers  [q] Quit
				</Text>
			</Box>
		</Box>
	);
};
