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

	/** For each available flag, a boolean value indicating whether it was provided. */
	flags: undefined extends Input['flags']
		? ExcludeMe
		: {
				[Flag in keyof Input['flags']]: boolean;
		  };

	/** For each available option, the value that was provided (or `undefined` if not provided). */
	options: undefined extends Input['options']
		? ExcludeMe
		: {
				[Option in keyof Input['options']]: string | number;
		  };

	/** If provided, the data given to this command. */
	data: 'data' extends keyof Input
		? NonNullable<Input['data']> extends never
			? ExcludeMe
			: NonNullable<Input['data']> extends Array<string | number>
			? Input extends { acceptsMultipleData: true }
				? Input['data'] extends undefined
					? NonNullable<Input['data']> | undefined
					: NonNullable<Input['data']>
				: Input['data'] extends undefined
				? NonNullable<Input['data']>[number] | undefined
				: NonNullable<Input['data']>[number]
			: Input['data']
		: ExcludeMe;

	/** If provided, an array of pass-through arguments. */
	passThroughArgs?: undefined extends Input['acceptsPassThroughArgs'] ? ExcludeMe : string[];

	/** If provided, data allows multiple items rather than a single instance */
	acceptsMultipleData?: undefined extends Input['acceptsMultipleData'] ? ExcludeMe : true;
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

	// Initialize some keys, in case the objects are empty
	if (typeof mergedSpec.flags === 'object') {
		inputObject.flags = {};
	}

	if (typeof mergedSpec.options === 'object') {
		inputObject.options = {};
	}

	// Loop over each component and store
	Object.entries(mergedSpec.flags ?? {}).forEach(([flag]) => {
		if (['help', 'version'].includes(flag)) {
			return;
		}

		if (!inputObject.flags) {
			inputObject.flags = {};
		}

		inputObject.flags[flag] = organizedArguments.flags.includes(flag);
	});

	Object.entries(mergedSpec.options ?? {}).forEach(([option, details]) => {
		const optionIndex = organizedArguments.options.indexOf(option);

		if (!inputObject.options) {
			inputObject.options = {};
		}

		inputObject.options[option] = organizedArguments.values[optionIndex];

		if (details.required && !organizedArguments.options.includes(option)) {
			throw new PrintableError(`The --${option} option is required`);
		}
	});

	// Handle missing required data
	if (mergedSpec.data && mergedSpec.data.required && !organizedArguments.data) {
		throw new PrintableError('Data is required');
	}

	// Store data
	if (typeof mergedSpec.data === 'object') {
		inputObject.data = organizedArguments.data;
	}

	// Store command
	inputObject.command = organizedArguments.command;

	// Store pass-through
	if (organizedArguments.passThrough) {
		inputObject.passThroughArgs = organizedArguments.passThrough;
	}

	// Return
	return inputObject;
}
