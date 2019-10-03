// Dependencies
const chalk = require('chalk');
const fs = require('fs');
const Fuse = require('fuse.js');
const path = require('path');
const ErrorWithoutStack = require('./error-without-stack.js');

// Helpful utility functions
module.exports = function Constructor(currentSettings) {
	// Store an internal copy of the current settings
	const settings = { ...currentSettings };

	// Return the functions
	return {
		// Verbose log output helper function
		verboseLog(message) {
			if (settings.verbose) {
				console.log(chalk.dim.italic(`[VERBOSE] ${message}`));
			}
		},

		// Process arguments
		processArguments(argv) {
			const processedArguments = [];

			argv.forEach(argument => {
				if (argument.substr(0, 2) === '--') {
					argument.split('=').forEach(piece => {
						if (piece !== '') {
							processedArguments.push(piece);
						}
					});
				} else {
					processedArguments.push(argument);
				}
			});

			return processedArguments.slice(2);
		},

		// Retrieve app information
		retrieveAppInformation() {
			// Initialize
			const app = { ...settings.app };

			// Build path to package.json file
			const pathToPackageFile = `${path.dirname(settings.mainFilename)}/${
				settings.packageFilePath
			}`;

			// Handle if a package.json file exists
			if (fs.existsSync(pathToPackageFile)) {
				// Verbose output
				module
					.exports(settings)
					.verboseLog(`Found package.json at: ${pathToPackageFile}`);

				// Get package
				const packageInfo = JSON.parse(fs.readFileSync(pathToPackageFile));

				// Store information
				app.name = app.name || packageInfo.name;
				app.packageName = packageInfo.name;
				app.version = app.version || packageInfo.version;
			} else {
				module
					.exports(settings)
					.verboseLog(`Could not find package.json at: ${pathToPackageFile}`);
			}

			// Return info
			return app;
		},

		// Get specs for a command
		getMergedSpec(command) {
			// Break into pieces, with entry point
			const pieces = `. ${command}`.trim().split(' ');

			// Initialize
			const mergedSpec = {
				description: null,
				data: {},
				flags: {
					version: {
						shorthand: 'v',
						description: 'Show version',
					},
					help: {
						shorthand: 'h',
						description: 'Show help',
					},
				},
				options: {},
			};

			// Loop over every piece
			let currentPathPrefix = path.dirname(settings.mainFilename);

			pieces.forEach((piece, index) => {
				// Append to path prefix
				if (piece) {
					currentPathPrefix += `/${piece}`;
				}

				// Get the files we care about
				const commandFiles = module
					.exports(settings)
					.files.getFiles(currentPathPrefix);

				// Error if not exactly one .js and one .json file
				if (commandFiles.filter(path => path.match(/\.js$/)).length !== 1) {
					throw new ErrorWithoutStack(
						`There should be exactly one .js file in: ${currentPathPrefix}`
					);
				}

				if (commandFiles.filter(path => path.match(/\.json$/)).length !== 1) {
					throw new ErrorWithoutStack(
						`There should be exactly one .json file in: ${currentPathPrefix}`
					);
				}

				// Get spec
				const specFilePath = commandFiles.filter(path =>
					path.match(/\.json$/)
				)[0];
				let spec = {};

				try {
					spec = JSON.parse(fs.readFileSync(specFilePath));
				} catch (error) {
					throw new ErrorWithoutStack(
						`This file has bad JSON: ${specFilePath}`
					);
				}

				// Build onto spec
				if (typeof spec.flags === 'object') {
					Object.entries(spec.flags).forEach(([flag, details]) => {
						if (index === pieces.length - 1 || details.cascades === true) {
							mergedSpec.flags[flag] = details;
						}
					});
				}

				if (typeof spec.options === 'object') {
					Object.entries(spec.options).forEach(([option, details]) => {
						if (index === pieces.length - 1 || details.cascades === true) {
							mergedSpec.options[option] = details;
						}
					});
				}

				if (index === pieces.length - 1) {
					mergedSpec.description = spec.description;
					mergedSpec.data = spec.data;
				}
			});

			// Return spec
			return mergedSpec;
		},

		// Organize arguments into categories
		organizeArguments() {
			// Initialize
			const organizedArguments = {
				flags: [],
				options: [],
				values: [],
				data: null,
				command: '',
			};

			let previousOption = null;
			let nextIsOptionValue = false;
			let nextValueType = null;
			let nextValueAccepts = null;
			let reachedData = false;

			// Loop over every command
			let currentPathPrefix = path.dirname(settings.mainFilename);

			settings.arguments.forEach(argument => {
				// Verbose output
				module.exports(settings).verboseLog(`Inspecting argument: ${argument}`);

				// Skip option values
				if (nextIsOptionValue) {
					// Verbose output
					module
						.exports(settings)
						.verboseLog(`...Is value for previous option (${previousOption})`);

					// Initialize
					let value = argument;

					// Validate value, if necessary
					if (nextValueAccepts) {
						if (!nextValueAccepts.includes(value)) {
							throw new ErrorWithoutStack(
								`Unrecognized value for ${previousOption}: ${value}\nAccepts: ${nextValueAccepts.join(
									', '
								)}`
							);
						}
					}

					if (nextValueType) {
						if (nextValueType === 'integer') {
							if (value.match(/^[0-9]+$/) !== null) {
								value = parseInt(value, 10);
							} else {
								throw new ErrorWithoutStack(
									`The option ${previousOption} expects an integer\nProvided: ${value}`
								);
							}
						} else if (nextValueType === 'float') {
							if (
								value.match(/^[0-9]*[.]*[0-9]*$/) !== null &&
								value !== '.' &&
								value !== ''
							) {
								value = parseFloat(value);
							} else {
								throw new ErrorWithoutStack(
									`The option ${previousOption} expects a float\nProvided: ${value}`
								);
							}
						} else {
							throw new ErrorWithoutStack(
								`Unrecognized "type": ${nextValueType}`
							);
						}
					}

					// Store and continue
					nextIsOptionValue = false;
					organizedArguments.values.push(value);
					return;
				}

				// Get merged spec for this command
				const mergedSpec = module
					.exports(settings)
					.getMergedSpec(organizedArguments.command);

				// Handle if we're supposed to ignore anything that looks like flags/options
				if (
					reachedData &&
					mergedSpec.data &&
					mergedSpec.data.ignoreFlagsAndOptions === true
				) {
					// Verbose output
					module.exports(settings).verboseLog('...Is data');

					// Append onto data
					organizedArguments.data += ` ${argument}`;

					// Skip further processing
					return;
				}

				// Skip options/flags
				if (argument[0] === '-') {
					// Check if this is an option
					if (typeof mergedSpec.options === 'object') {
						Object.entries(mergedSpec.options).forEach(([option, details]) => {
							// Check for a match
							const matchesFullOption =
								argument === `--${option.trim().toLowerCase()}`;
							const matchesShorthandOption =
								details.shorthand &&
								argument === `-${details.shorthand.trim().toLowerCase()}`;

							// Handle a match
							if (matchesFullOption || matchesShorthandOption) {
								// Verbose output
								module.exports(settings).verboseLog('...Is an option');

								// Store details
								previousOption = argument;
								nextIsOptionValue = true;
								nextValueAccepts = details.accepts;
								nextValueType = details.type;
								organizedArguments.options.push(option);
							}
						});
					}

					// Handle flags
					if (nextIsOptionValue === false) {
						// Initialize
						let matchedFlag = false;

						// Check if this is a valid flag
						if (typeof mergedSpec.flags === 'object') {
							Object.entries(mergedSpec.flags).forEach(([flag, details]) => {
								if (argument === `--${flag.trim().toLowerCase()}`) {
									// Verbose output
									module.exports(settings).verboseLog('...Is a flag');

									// Store details
									matchedFlag = true;
									organizedArguments.flags.push(flag);
								} else if (
									details.shorthand &&
									argument === `-${details.shorthand.trim().toLowerCase()}`
								) {
									// Verbose output
									module.exports(settings).verboseLog('...Is a flag');

									// Store details
									matchedFlag = true;
									organizedArguments.flags.push(flag);
								}
							});
						}

						// Handle no match
						if (!matchedFlag) {
							throw new ErrorWithoutStack(`Unrecognized argument: ${argument}`);
						}
					}

					// Skip further processing
					return;
				}

				// Get the files we care about
				const commandFiles = module
					.exports(settings)
					.files.getFiles(`${currentPathPrefix}/${argument}`);

				// Get the command path
				const commandPath = commandFiles.filter(path => path.match(/\.js$/))[0];

				// Check if that file exists
				if (
					!reachedData &&
					fs.existsSync(commandPath) &&
					argument.replace(/[/\\?%*:|"<>.]/g, '') !== ''
				) {
					// Verbose output
					module.exports(settings).verboseLog('...Is a command');

					// Add to currents
					currentPathPrefix += `/${argument}`;
					organizedArguments.command += ` ${argument}`;
				} else {
					// Verbose output
					module.exports(settings).verboseLog('...Is data');

					// Store details
					reachedData = true;

					if (organizedArguments.data === null) {
						organizedArguments.data = argument;
					} else {
						organizedArguments.data += ` ${argument}`;
					}
				}
			});

			// Error if we're missing an expected value
			if (nextIsOptionValue === true) {
				throw new ErrorWithoutStack(
					`No value provided for ${previousOption}, which is an option, not a flag`
				);
			}

			// Handle if there's any data
			if (organizedArguments.data !== null) {
				// Get merged spec for this command
				const mergedSpec = module
					.exports(settings)
					.getMergedSpec(organizedArguments.command);

				// Check if data is allowed
				if (!mergedSpec.data || !mergedSpec.data.description) {
					// Get all commands in this program
					const commands = module.exports(settings).getAllProgramCommands();

					// Search for the best match
					const fuse = new Fuse(commands, {
						shouldSort: true,
						threshold: 1,
						tokenize: true,
						includeScore: true,
						includeMatches: true,
						maxPatternLength: 32,
						minMatchCharLength: 1,
					});

					const results = fuse.search(
						`${organizedArguments.command} ${organizedArguments.data}`.trim()
					);
					let bestMatch = null;

					if (results.length && results[0].score < 0.6) {
						bestMatch = results[0].matches[0].value;
					}

					// Determine command
					const command = `${settings.usageCommand}${organizedArguments.command}`;

					// Form error message
					let errorMessage = `You provided ${
						chalk.bold(organizedArguments.data)
					} to ${chalk.bold(command)}\n`;

					if (bestMatch) {
						errorMessage +=
							'If you were trying to pass in data, this command does not accept data\n';
						errorMessage += `If you were trying to use a command, did you mean ${chalk.bold(
							settings.usageCommand
						)} ${chalk.bold(bestMatch)}?\n`;
					} else {
						errorMessage += 'However, this command does not accept data\n';
					}

					errorMessage += `For more guidance, see: ${command} --help`;

					// Throw error
					throw new ErrorWithoutStack(errorMessage);
				}

				// Validate data, if necessary
				if (mergedSpec.data.accepts) {
					if (!mergedSpec.data.accepts.includes(organizedArguments.data)) {
						throw new ErrorWithoutStack(
							`Unrecognized data for "${organizedArguments.command.trim()}": ${
								organizedArguments.data
							}\nAccepts: ${mergedSpec.data.accepts.join(', ')}`
						);
					}
				}

				if (mergedSpec.data.type) {
					if (mergedSpec.data.type === 'integer') {
						if (organizedArguments.data.match(/^[0-9]+$/) !== null) {
							organizedArguments.data = parseInt(organizedArguments.data, 10);
						} else {
							throw new ErrorWithoutStack(
								`The command "${organizedArguments.command.trim()}" expects integer data\nProvided: ${
									organizedArguments.data
								}`
							);
						}
					} else if (mergedSpec.data.type === 'float') {
						if (
							organizedArguments.data.match(/^[0-9]*[.]*[0-9]*$/) !== null &&
							organizedArguments.data !== '.' &&
							organizedArguments.data !== ''
						) {
							organizedArguments.data = parseFloat(organizedArguments.data);
						} else {
							throw new ErrorWithoutStack(
								`The command "${organizedArguments.command.trim()}" expects float data\nProvided: ${
									organizedArguments.data
								}`
							);
						}
					} else {
						throw new ErrorWithoutStack(
							`Unrecognized "type": ${mergedSpec.data.type}`
						);
					}
				}
			}

			// Trim command
			organizedArguments.command = organizedArguments.command.trim();

			// Return
			return organizedArguments;
		},

		// Construct a full input object
		constructInputObject(organizedArguments) {
			// Initialize
			const inputObject = {};

			// Get merged spec for this command
			const mergedSpec = module
				.exports(settings)
				.getMergedSpec(organizedArguments.command);

			// Loop over each component and store
			Object.entries(mergedSpec.flags).forEach(([flag]) => {
				const camelCaseKey = module
					.exports(settings)
					.convertDashesToCamelCase(flag);
				inputObject[camelCaseKey] = organizedArguments.flags.includes(flag);
			});

			Object.entries(mergedSpec.options).forEach(([option, details]) => {
				const camelCaseKey = module
					.exports(settings)
					.convertDashesToCamelCase(option);
				const optionIndex = organizedArguments.options.indexOf(option);
				inputObject[camelCaseKey] = organizedArguments.values[optionIndex];

				if (details.required && !organizedArguments.options.includes(option)) {
					throw new ErrorWithoutStack(`The --${option} option is required`);
				}
			});

			// Store data
			inputObject.data = organizedArguments.data;

			if (
				mergedSpec.data &&
				mergedSpec.data.required &&
				!organizedArguments.data
			) {
				throw new ErrorWithoutStack('Data is required');
			}

			// Store command
			inputObject.command = organizedArguments.command;

			// Return
			return inputObject;
		},

		// Get all commands in program
		getAllProgramCommands() {
			// Get all directories
			const mainDir = path.dirname(settings.mainFilename);
			let commands = module.exports(settings).files.getAllDirectories(mainDir);

			// Process into just commands
			commands = commands.map(file => file.replace(`${mainDir}/`, ''));
			commands = commands.map(file => file.replace(/\.js$/, ''));
			commands = commands.map(file => file.replace(/\//, ' '));

			// Return
			return commands;
		},

		// Convert a string from aaa-aaa-aaa to aaaAaaAaa
		convertDashesToCamelCase(string) {
			return string.replace(/-(.)/g, g => g[1].toUpperCase());
		},

		// Print a pretty error message
		printPrettyError(message) {
			console.error(`${chalk.inverse.red.bold(' ERROR ')}\n`);
			console.error(chalk.red(`> ${message.split('\n').join('\n> ')}\n`));
		},

		// File functions
		files: {
			// Return true if this path is a directory
			isDirectory(path) {
				return fs.lstatSync(path).isDirectory();
			},

			// Return true if this path is a file
			isFile(path) {
				return fs.lstatSync(path).isFile();
			},

			// Get child files of a parent directory
			getFiles(directory) {
				if (!fs.existsSync(directory)) {
					return [];
				}

				const allItems = fs
					.readdirSync(directory)
					.map(name => path.join(directory, name));

				return allItems.filter(module.exports(settings).files.isFile);
			},

			// Get child directories of a parent directory
			getDirectories(directory) {
				if (!fs.existsSync(directory)) {
					return [];
				}

				const allItems = fs
					.readdirSync(directory)
					.map(name => path.join(directory, name));

				return allItems.filter(module.exports(settings).files.isDirectory);
			},

			// Get child directories of a parent directory, recursively & synchronously
			getAllDirectories(directory) {
				if (!fs.existsSync(directory)) {
					return [];
				}

				return fs.readdirSync(directory).reduce((files, file) => {
					const name = path.join(directory, file);

					if (module.exports(settings).files.isDirectory(name)) {
						return [
							...files,
							name,
							...module.exports(settings).files.getAllDirectories(name),
						];
					}

					return [...files];
				}, []);
			},
		},
	};
};
