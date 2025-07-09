#!/usr/bin/env node
import { render } from "ink";
import meow from "meow";
import React from "react";
import App from "./app.js";

meow(
	`
	Usage
	  $ jjj

	A mobile-friendly CLI file explorer

	Controls:
	  ↑/↓     Navigate files
	  ←/→     Navigate directories/Preview files
	  Space   Toggle preview
	  Enter   Open directory or toggle preview
	  q       Quit

	Examples
	  $ jjj
`,
	{
		importMeta: import.meta,
	},
);

render(<App />);
