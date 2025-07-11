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
	if (width > 100) {
		return "↑↓: Navigate | ←→: Dir/Enter | h: Hidden | n/s/d/t: Sort | q: Quit";
	} else if (width > 60) {
		return "↑↓: Navigate | ←→: Dir | h: Hidden | q: Quit";
	} else {
		return "↑↓←→ h q";
	}
};

/**
 * Status bar component
 */
export const StatusBar: React.FC<StatusBarProps> = React.memo(
	({ navigationState, terminalWidth }) => {
		const { currentPath, files, selectedIndex, sortConfig, filterOptions } =
			navigationState;

		// Current file info
		const selectedFile = files[selectedIndex];
		const fileInfo = selectedFile ? `${selectedFile.name}` : "";

		// Sort and filter info
		const sortInfo = `Sort: ${sortConfig.key} ${sortConfig.order}`;
		const filterInfo = filterOptions.showHidden ? "Hidden: ON" : "Hidden: OFF";

		// Stats
		const stats = `${files.length} items`;

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
						<Text color="gray">{getShortcutsText(terminalWidth)}</Text>
					</Box>
				</Box>
			</Box>
		);
	},
);

StatusBar.displayName = "StatusBar";
