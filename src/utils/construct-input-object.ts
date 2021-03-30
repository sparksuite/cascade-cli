// Imports
import { PrintableError } from './errors.js';
import getMergedSpec from './get-merged-spec.js';
import getOrganizedArguments from './get-organized-arguments.js';
import { CommandInput } from './get-command-spec.js';
import { ExcludeMe, OmitExcludeMeProperties } from '../types/exclude-matching-properties.js';

/** Describes the type that governs a command's input */
export type InputObject<Input extends CommandInput> = OmitExcludeMeProperties<{
	/** The final command being run. */
	command: string;

	/** For each available flag (converted to camel case), a boolean value indicating whether it was provided. */
	flags: undefined extends Input['flags']
		? ExcludeMe
		: {
				[Flag in keyof Input['flags']]: boolean;
		  };

	/** For each available option (converted to camel case), the value that was provided (or `undefined` if not provided). */
	options: undefined extends Input['options']
		? ExcludeMe
		: {
				[Option in keyof Input['options']]: string | number;
		  };

	/** If provided, the data given to this command. */
	data: undefined extends Input['data'] ? ExcludeMe : string | number;

	/** If provided, an array of pass-through arguments. */
	passThroughArgs?: undefined extends Input['acceptsPassThroughArgs'] ? ExcludeMe : string[];
}>;

// Define the return type
export type ConstructedInputObject = Omit<Partial<InputObject<Required<CommandInput>>>, 'command'> &
	Pick<InputObject<Required<CommandInput>>, 'command'>;

// Construct a full input object
export default async function constructInputObject(): Promise<ConstructedInputObject> {
	// Initialize
	const inputObject: ConstructedInputObject = {
		command: '',
	};

	// Get organized arguments
	const organizedArguments = await getOrganizedArguments();

	// Get merged spec for this command
	const mergedSpec = await getMergedSpec(organizedArguments.command);

	// Convert a string from aaa-aaa-aaa to aaaAaaAaa
	const convertDashesToCamelCase = (string: string): string => {
		return string.replace(/-(.)/g, (g) => g[1].toUpperCase());
	};

	// Loop over each component and store
	Object.entries(mergedSpec.flags ?? {}).forEach(([flag]) => {
		const camelCaseKey = convertDashesToCamelCase(flag);

		if (!inputObject.flags) {
			inputObject.flags = {};
		}

		inputObject.flags[camelCaseKey] = organizedArguments.flags.includes(flag);
	});

	Object.entries(mergedSpec.options ?? {}).forEach(([option, details]) => {
		const camelCaseKey = convertDashesToCamelCase(option);
		const optionIndex = organizedArguments.options.indexOf(option);

		if (!inputObject.options) {
			inputObject.options = {};
		}

		inputObject.options[camelCaseKey] = organizedArguments.values[optionIndex];

		if (details.required && !organizedArguments.options.includes(option)) {
			throw new PrintableError(`The --${option} option is required`);
		}
	});

	// Handle missing required data
	if (mergedSpec.data && mergedSpec.data.required && !organizedArguments.data) {
		throw new PrintableError('Data is required');
	}

	// Store data
	inputObject.data = organizedArguments.data;

	// Store command
	inputObject.command = organizedArguments.command;

	// Store pass-through
	if (organizedArguments.passThrough) {
		inputObject.passThroughArgs = organizedArguments.passThrough;
	}

	// Return
	return inputObject;
}
