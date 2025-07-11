#!/usr/bin/env bun

/**
 * CLI File Explorer "jjj" Entry Point
 * Mobile-Native Design with React Ink
 */

import { render } from "ink";
import React from "react";
import { App } from "./app.js";

// Check if raw mode is supported
const isRawModeSupported = process.stdin.isTTY && typeof process.stdin.setRawMode === 'function';

if (!isRawModeSupported) {
  console.log("🚀 CLI File Explorer 'jjj' starting...");
  console.log("📁 Current directory:", process.cwd());
  console.log("⚠️  Raw mode not supported in this environment.");
  console.log("💡 Run in a real terminal for full keyboard navigation.");
  console.log("");
}

// Render the React Ink application
const { unmount } = render(React.createElement(App), {
  exitOnCtrlC: true,
});

// Handle cleanup on exit
process.on("SIGINT", () => {
	unmount();
	process.exit(0);
});

process.on("SIGTERM", () => {
	unmount();
	process.exit(0);
});
