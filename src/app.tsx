/**
 * Main Application Component
 * Mobile-Native CLI File Explorer with React Ink
 */

import { Box, Text, useApp } from "ink";
import React from "react";
import { FileList } from "./features/file-navigation/components/FileList.js";
import { createDependencies } from "./features/file-navigation/factories/ServiceFactory.js";
import { useFileNavigation } from "./features/file-navigation/hooks/useFileNavigation.js";
import { PreviewPanel } from "./features/file-preview/components/PreviewPanel.js";
import { useFilePreview } from "./features/file-preview/hooks/useFilePreview.js";
import { useKeyboardInput } from "./features/keyboard-input/hooks/useKeyboardInput.js";
import { StatusBar } from "./features/terminal-ui/components/StatusBar.js";
import { useTerminalSize } from "./features/terminal-ui/hooks/useTerminalSize.js";

/**
 * Main App Component
 */
export const App: React.FC = () => {
	const { exit } = useApp();
	const terminalSize = useTerminalSize();
	const dependencies = React.useMemo(() => createDependencies(), []);
	const navigation = useFileNavigation({ dependencies });
	const preview = useFilePreview({ dependencies });

	// Memoize stable values to prevent unnecessary re-renders
	const stableExit = React.useCallback(() => exit(), [exit]);
	const fileListHeight = React.useMemo(
		() => terminalSize.height - 1,
		[terminalSize.height],
	);

	// Setup keyboard input handling
	useKeyboardInput({
		navigation,
		preview,
		onExit: stableExit,
	});

	// Loading state
	if (navigation.state.isLoading) {
		return (
			<Box
				justifyContent="center"
				alignItems="center"
				height={terminalSize.height}
			>
				<Text color="blue">Loading...</Text>
			</Box>
		);
	}

	// Error state
	if (navigation.state.error) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text color="red" bold>
					Error:
				</Text>
				<Text color="red">{navigation.state.error}</Text>
				<Text color="gray">Press 'q' to quit</Text>
			</Box>
		);
	}

	// Show full-screen preview when in preview mode
	if (preview.state.isVisible) {
		return (
			<PreviewPanel
				state={preview.state}
				width={terminalSize.width}
				height={terminalSize.height}
			/>
		);
	}

	// Normal file navigation view
	return (
		<Box flexDirection="column" height={terminalSize.height}>
			{/* Main file list */}
			<Box flexGrow={1}>
				<FileList
					files={navigation.state.files}
					selectedIndex={navigation.state.selectedIndex}
					terminalWidth={terminalSize.width}
					terminalHeight={fileListHeight}
				/>
			</Box>

			{/* Status bar */}
			<Box>
				<StatusBar
					navigationState={navigation.state}
					terminalWidth={terminalSize.width}
				/>
			</Box>
		</Box>
	);
};
