#!/usr/bin/env bun

/**
 * CLI File Explorer "jjj" Entry Point
 * Mobile-Native Design with React Ink
 */

import { render } from "ink";
import React from "react";
import { App } from "./app.js";

// Render the React Ink application
const { unmount } = render(React.createElement(App));

// Handle cleanup on exit
process.on("SIGINT", () => {
	unmount();
	process.exit(0);
});

process.on("SIGTERM", () => {
	unmount();
	process.exit(0);
});
