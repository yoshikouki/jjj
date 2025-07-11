/**
 * Main Application Component
 * Mobile-Native CLI File Explorer with React Ink
 */

import React from "react";
import { Box, Text } from "ink";
import { useApp } from "ink";
import { useFileNavigation } from "./features/file-navigation/hooks/useFileNavigation.js";
import { useKeyboardInput } from "./features/keyboard-input/hooks/useKeyboardInput.js";
import { useTerminalSize } from "./features/terminal-ui/hooks/useTerminalSize.js";
import { FileList } from "./features/file-navigation/components/FileList.js";
import { StatusBar } from "./features/terminal-ui/components/StatusBar.js";

/**
 * Main App Component
 */
export const App: React.FC = () => {
  const { exit } = useApp();
  const terminalSize = useTerminalSize();
  const navigation = useFileNavigation();

  // Setup keyboard input handling
  useKeyboardInput({
    navigation,
    onExit: exit,
  });

  // Loading state
  if (navigation.state.isLoading) {
    return (
      <Box justifyContent="center" alignItems="center" height={terminalSize.height}>
        <Text color="blue">Loading...</Text>
      </Box>
    );
  }

  // Error state
  if (navigation.state.error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>Error:</Text>
        <Text color="red">{navigation.state.error}</Text>
        <Text color="gray">Press 'q' to quit</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={terminalSize.height}>
      {/* Main file list */}
      <Box flexGrow={1}>
        <FileList
          files={navigation.state.files}
          selectedIndex={navigation.state.selectedIndex}
          terminalWidth={terminalSize.width}
          terminalHeight={terminalSize.height}
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