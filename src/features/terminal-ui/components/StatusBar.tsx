/**
 * Status Bar Component
 * Shows current path, file count, and keyboard shortcuts
 */

import { Box, Text } from "ink";
import React from "react";
import type { FileNavigationState } from "../../file-navigation/types/index.js";

interface StatusBarProps {
	navigationState: FileNavigationState;
	terminalWidth: number;
}

/**
 * Get responsive keyboard shortcuts text
 */
const getShortcutsText = (width: number): string => {
	if (width > 120) {
		return "↑↓: Navigate | ←/Del: Back | →: Dir | h: Hidden | n/s/d/t: Sort | q: Quit";
	} else if (width > 80) {
		return "↑↓: Navigate | ←/Del: Back | →: Dir | h: Hidden | q: Quit";
	} else if (width > 60) {
		return "↑↓: Navigate | ←/Del: Back | →: Dir | q: Quit";
	} else {
		return "↑↓←→ Del h q";
	}
};

/**
 * Status bar component
 */
export const StatusBar: React.FC<StatusBarProps> = React.memo(
	({ navigationState, terminalWidth }) => {
		const { currentPath, files, selectedIndex, sortConfig, filterOptions } =
			navigationState;

		// Memoize computed values to prevent recalculation
		const selectedFile = React.useMemo(
			() => files[selectedIndex],
			[files, selectedIndex],
		);
		const fileInfo = React.useMemo(
			() => (selectedFile ? `${selectedFile.name}` : ""),
			[selectedFile],
		);
		const sortInfo = React.useMemo(
			() => `Sort: ${sortConfig.key} ${sortConfig.order}`,
			[sortConfig],
		);
		const filterInfo = React.useMemo(
			() => (filterOptions.showHidden ? "Hidden: ON" : "Hidden: OFF"),
			[filterOptions.showHidden],
		);
		const stats = React.useMemo(() => `${files.length} items`, [files.length]);
		const shortcutsText = React.useMemo(
			() => getShortcutsText(terminalWidth),
			[terminalWidth],
		);

		return (
			<Box flexDirection="column">
				{/* Path and file info */}
				<Box>
					<Text bold color="blue">
						📁 {currentPath}
					</Text>
					{fileInfo && <Text color="gray"> | {fileInfo}</Text>}
				</Box>

				{/* Stats and controls */}
				<Box justifyContent="space-between">
					<Box>
						<Text color="gray">
							{stats} | {sortInfo} | {filterInfo}
						</Text>
					</Box>

					<Box>
						<Text color="gray">{shortcutsText}</Text>
					</Box>
				</Box>
			</Box>
		);
	},
	// Custom comparison function to prevent unnecessary re-renders
	(prevProps, nextProps) => {
		const prevState = prevProps.navigationState;
		const nextState = nextProps.navigationState;

		return (
			prevState.currentPath === nextState.currentPath &&
			prevState.files === nextState.files &&
			prevState.selectedIndex === nextState.selectedIndex &&
			prevState.sortConfig.key === nextState.sortConfig.key &&
			prevState.sortConfig.order === nextState.sortConfig.order &&
			prevState.filterOptions.showHidden ===
				nextState.filterOptions.showHidden &&
			prevProps.terminalWidth === nextProps.terminalWidth
		);
	},
);

StatusBar.displayName = "StatusBar";
