#!/usr/bin/env node

// Import and initialize Waterfall CLI
const waterfall = require('waterfall-cli');

waterfall.init({
	verbose: true,
}).catch((error) => {
	console.error(error);
	process.exit(1);
});
