// Imports
import getContext from './get-context.js';
import getConfig from './get-config.js';
import fs from 'fs';
import path from 'path';
import verboseLog from './verbose-log.js';
import { PrintableError } from './errors.js';
import getMergedSpec from './get-merged-spec.js';
import chalk from './chalk.js';
import getAllProgramCommands from './get-all-program-commands.js';
import Fuse from 'fuse.js';

// Define what organized arguments look like
interface OrganizedArguments {
	command: string;
	data?: string | number | string[] | number[];
	flags: string[];
	options: string[];
	values: (string | number)[];
	passThrough?: string[];
}

// Initialize
let organizedArguments: OrganizedArguments | undefined = undefined;

/** Organize arguments into their respective categories */
export default async function getOrganizedArguments(): Promise<OrganizedArguments> {
	// Return already constructed version, if possible
	if (typeof organizedArguments === 'object' && !process.env.JEST_WORKER_ID) {
		return organizedArguments;
	}

	// Initialize
	organizedArguments = {
		flags: [],
		options: [],
		values: [],
		command: '',
	};

	let previousOption: string | undefined = undefined;
	let nextIsOptionValue = false;
	let nextValueType: string | undefined = undefined;
	let nextValueAccepts: string[] | number[] | undefined = undefined;
	let reachedData = false;
	let reachedPassThrough = false;

	// Get the context/config
	const context = await getContext();
	const config = await getConfig();

	// Loop over every command
	let currentPathPrefix = path.dirname(context.entryFile);

	for (const argument of context.standardizedArguments) {
		// Verbose output
		await verboseLog(`Inspecting argument: ${argument}`);

		// Collect pass-through arguments
		if (reachedPassThrough) {
			// Initialize if needed
			if (!organizedArguments.passThrough) {
				organizedArguments.passThrough = [];
			}

			// Store pass-through
			organizedArguments.passThrough.push(argument);
			continue;
		}

		// Skip option values
		if (nextIsOptionValue) {
			// Verbose output
			await verboseLog(`...Is value for previous option (${String(previousOption)})`);

			// Initialize
			let value: string | number = argument;

			// Validate value, if necessary
			if (nextValueType) {
				if (nextValueType === 'integer') {
					if (/^[0-9]+$/.test(value)) {
						value = parseInt(value, 10);
					} else {
						throw new PrintableError(`The option ${String(previousOption)} expects an integer\nProvided: ${value}`);
					}
				} else if (nextValueType === 'float') {
					if (/^[0-9]*[.]*[0-9]*$/.test(value) && value !== '.' && value !== '') {
						value = parseFloat(value);
					} else {
						throw new PrintableError(`The option ${String(previousOption)} expects a float\nProvided: ${value}`);
					}
				} else {
					throw new PrintableError(`Unrecognized "type": ${nextValueType}`);
				}
			}

			if (Array.isArray(nextValueAccepts)) {
				const accepts = nextValueAccepts;

				// @ts-expect-error: TypeScript is confused here...
				if (accepts.includes(value) === false) {
					throw new PrintableError(
						`Unrecognized value for ${String(previousOption)}: ${value}\nAccepts: ${accepts.join(', ')}`
					);
				}
			}

			// Store and continue
			nextIsOptionValue = false;
			organizedArguments.values.push(value);
			continue;
		}

		// Get merged spec for this command
		const mergedSpec = await getMergedSpec(organizedArguments.command);

		// Handle if we're supposed to ignore anything that looks like flags/options
		if (reachedData && mergedSpec.data && mergedSpec.data.ignoreFlagsAndOptions === true) {
			// Verbose output
			await verboseLog('...Is data');

			// Append onto data
			if (!organizedArguments.data) {
				organizedArguments.data = ` ${argument}`;
			} else {
				organizedArguments.data += ` ${argument}`;
			}

			// Skip further processing
			continue;
		}

		// Detect pass-through indication
		if (argument === '--') {
			// Error if this command does not accept pass-through arguments
			if (!mergedSpec.acceptsPassThroughArgs) {
				throw new PrintableError('This command does not support pass-through arguments');
			}

			// Begin collecting pass-through arguments
			reachedPassThrough = true;
			continue;
		}

		// Skip options/flags
		if (argument.startsWith('-')) {
			// Check if this is an option
			if (typeof mergedSpec.options === 'object') {
				for (const [option, details] of Object.entries(mergedSpec.options)) {
					// Check for a match
					const matchesFullOption = argument === `--${option.trim().toLowerCase()}`;
					const matchesShorthandOption = details.shorthand && argument === `-${details.shorthand.trim().toLowerCase()}`;

					// Handle a match
					if (matchesFullOption || matchesShorthandOption) {
						// Verbose output
						await verboseLog('...Is an option');

						// Store details
						previousOption = argument;
						nextIsOptionValue = true;

						const arrayOrPromise =
							typeof details.accepts === 'function' ? details.accepts() : details.accepts || undefined;
						nextValueAccepts = arrayOrPromise instanceof Promise ? await arrayOrPromise : arrayOrPromise;

						nextValueType = details.type || undefined;
						organizedArguments.options.push(option);
					}
				}
			}

			// Handle flags
			if (!nextIsOptionValue) {
				// Initialize
				let matchedFlag = false;

				// Check if this is a valid flag
				if (typeof mergedSpec.flags === 'object') {
					for (const [flag, details] of Object.entries(mergedSpec.flags)) {
						if (argument === `--${flag.trim().toLowerCase()}`) {
							// Verbose output
							await verboseLog('...Is a flag');

							// Store details
							matchedFlag = true;
							organizedArguments.flags.push(flag);
						} else if (details.shorthand && argument === `-${details.shorthand.trim().toLowerCase()}`) {
							// Verbose output
							await verboseLog('...Is a flag');

							// Store details
							matchedFlag = true;
							organizedArguments.flags.push(flag);
						}
					}
				}

				// Handle no match
				if (!matchedFlag) {
					throw new PrintableError(`Unrecognized argument: ${argument}`);
				}
			}

			// Skip further processing
			continue;
		}

		// Get the command path
		const commandPath = path.join(currentPathPrefix, argument);

		// Check if that file exists
		if (!reachedData && fs.existsSync(commandPath) && argument.replace(/[/\\?%*:|"<>.]/g, '') !== '') {
			// Verbose output
			await verboseLog('...Is a command');

			// Add to currents
			currentPathPrefix += `/${argument}`;
			organizedArguments.command += ` ${argument}`;
		} else {
			// Verbose output
			await verboseLog('...Is data');

			// Store details
			reachedData = true;

			if (!organizedArguments.data) {
				organizedArguments.data = argument;
			} else {
				organizedArguments.data += ` ${argument}`;
			}
		}
	}

	// Error if we're missing an expected value
	if (nextIsOptionValue) {
		throw new PrintableError(`No value provided for ${String(previousOption)}, which is an option, not a flag`);
	}

	// Handle if there's any data
	if (typeof organizedArguments.data === 'string') {
		// Get merged spec for this command
		const mergedSpec = await getMergedSpec(organizedArguments.command);

		// Handle if data is not allowed
		if (typeof mergedSpec.data !== 'object') {
			// Get all commands in this program
			const commands = await getAllProgramCommands();

			// Search for the best match
			const fuse = new Fuse(commands, {
				shouldSort: true,
				threshold: 1,
				includeScore: true,
				includeMatches: true,
				minMatchCharLength: 1,
			});

			const results = fuse.search(`${organizedArguments.command} ${organizedArguments.data}`.trim());
			let bestMatch: string | undefined = undefined;

			if (results.length && results[0].score && results[0].score < 0.6) {
				bestMatch = results[0].matches?.[0].value;
			}

			// Determine command
			const command = `${config.usageCommand}${organizedArguments.command}`;

			// Form error message
			let errorMessage = `You provided ${chalk.bold(organizedArguments.data)} to ${chalk.bold(command)}\n`;

			if (bestMatch) {
				errorMessage += 'If you were trying to pass in data, this command does not accept data\n';
				errorMessage += `If you were trying to use a command, did you mean ${chalk.bold(
					config.usageCommand
				)} ${chalk.bold(bestMatch)}?\n`;
			} else {
				errorMessage += 'However, this command does not accept data\n';
			}

			errorMessage += `For more guidance, see: ${command} --help`;

			// Throw error
			throw new PrintableError(errorMessage);
		}

		// Validate data, if necessary
		if (mergedSpec.data.accepts && mergedSpec.data.accepts instanceof Array) {
			// Initialize holder of acceptable values
			const acceptables: string[] = [];

			// Find unrecognized data by removing acceptable values
			//  -> Space-padding to guard against partial matches
			//  -> Acceptables list should be presented in longest to shortest ordering if multi-word phrases exist
			let remnants = ` ${organizedArguments.data} `;

			for (const current of mergedSpec.data.accepts) {
				if (remnants.indexOf(` ${current} `) >= 0) {
					acceptables.push(`${current}`);

					remnants = remnants.replace(` ${current} `, ' ');
				}
			}

			remnants = remnants.trim();

			// Error if unacceptable remnants remain
			if (remnants.length > 0) {
				throw new PrintableError(
					`Unrecognized data for "${organizedArguments.command.trim()}": ${remnants}\nAccepts: ${mergedSpec.data.accepts.join(
						', '
					)}`
				);
			}

			// Error if we have multiple when single is expected
			if (!mergedSpec.data.acceptsMultiple && acceptables.length > 1) {
				throw new PrintableError(
					`Only 1 of the acceptable data items are allowed.\nAccepts one of: ${mergedSpec.data.accepts.join(', ')}`
				);
			}

			// Use validated data
			organizedArguments.data = mergedSpec.data.acceptsMultiple ? acceptables : acceptables[0];
		}

		if (mergedSpec.data.type) {
			const dataItems =
				typeof organizedArguments.data === 'object' ? organizedArguments.data : [organizedArguments.data];
			const acceptables: number[] = [];

			for (const dataItem of dataItems) {
				if (mergedSpec.data.type === 'integer') {
					if (/^[0-9]+$/.test(dataItem)) {
						acceptables.push(parseInt(dataItem, 10));
					} else {
						throw new PrintableError(
							`The command "${organizedArguments.command.trim()}" expects integer data\nProvided: ${dataItem}`
						);
					}
				} else if (mergedSpec.data.type === 'float') {
					if (/^[0-9]*[.]*[0-9]*$/.test(dataItem) && dataItem !== '.' && dataItem !== '') {
						acceptables.push(parseFloat(dataItem));
					} else {
						throw new PrintableError(
							`The command "${organizedArguments.command.trim()}" expects float data\nProvided: ${dataItem}`
						);
					}
				} else {
					throw new PrintableError(`Unrecognized "type": ${String(mergedSpec.data.type)}`);
				}
			}

			organizedArguments.data = mergedSpec.data.acceptsMultiple ? acceptables : acceptables[0];
		}
	}

	// Trim command
	organizedArguments.command = organizedArguments.command.trim();

	// Return
	return organizedArguments;
}
