// Imports
import fs from 'fs';
import path from 'path';
import chalk from './chalk.js';
import { PrintableError } from './errors.js';
import { ExcludeMe, OmitExcludeMeProperties } from '../types/exclude-matching-properties.js';
import getContext from './get-context.js';

// Define what command input looks like
export interface CommandInput {
	flags?: {
		[flag: string]: boolean;
	};
	options?: {
		[option: string]: string | string[] | number | number[];
	};
	data?: string | string[] | number | number[];
	acceptsPassThroughArgs?: true;
	acceptsMultipleData?: true;
}

// Helper types
export type EmptyCommandInput = {
	[Key in keyof Required<CommandInput>]: undefined;
};

/** Describes a command's specifications */
export type CommandSpec<Input extends CommandInput = EmptyCommandInput> = OmitExcludeMeProperties<{
	/** A description of this command, to be shown on help screens. */
	description?: string;

	/** Whether to execute this command before executing commands farther down in the file tree. Defaults to `false`. */
	executeOnCascade?: true;

	/** Whether this command accepts pass-through arguments (arguments that follow ` -- `). Pass-through arguments are intended to be handed off to another program being executed by this command. Defaults to `false`. */
	acceptsPassThroughArgs: undefined extends Input['acceptsPassThroughArgs'] ? ExcludeMe : true;

	/** Permitted boolean arguments. */
	flags: 'flags' extends keyof Input
		? NonNullable<Input['flags']> extends never
			? ExcludeMe
			: {
					[Flag in keyof Input['flags']]: {
						/** A description of this flag, to be shown on help screens. */
						description?: string;

						/** Whether this flag also applies to commands farther down in the file tree. Defaults to `false`. */
						cascades?: true;

						/** A single-character that could be used instead of the full flag name. */
						shorthand?: string;
					};
			  }
		: ExcludeMe;

	/** Permitted key/value arguments. */
	options: 'options' extends keyof Input
		? NonNullable<Input['options']> extends never
			? ExcludeMe
			: {
					[Option in keyof Input['options']]: OmitExcludeMeProperties<{
						/** A description of this option, to be shown on help screens. */
						description?: string;

						/** Whether this option also applies to commands farther down in the file tree. Defaults to `false`. */
						cascades?: true;

						/** A single-character that could be used instead of the full option name. */
						shorthand?: string;

						/** Whether this option must be provided with this command. Defaults to `false`. */
						required: undefined extends Input['options'][Option] ? ExcludeMe : true;

						/** What type of value should be provided. Invalid values will be rejected. */
						type: number extends Input['options'][Option]
							? Input['options'][Option] extends number
								? 'integer' | 'float'
								: ExcludeMe
							: ExcludeMe;

						/** A finite array of acceptable option values or callback providing same. Invalid values will be rejected. */
						accepts: NonNullable<Input['options'][Option]> extends
							| string[]
							| number[]
							| (() => string[] | number[])
							| (() => Promise<string[] | number[]>)
							? Input['options'][Option] | (() => Promise<Input['options'][Option]>)
							: ExcludeMe;
					}>;
			  }
		: ExcludeMe;

	/** Details about what kind of data this command accepts. Any object (even an empty one) permits data. */
	data: 'data' extends keyof Input
		? NonNullable<Input['data']> extends never
			? ExcludeMe
			: OmitExcludeMeProperties<{
					/** A description of what kind of data should be provided, to be shown on help screens. */
					description?: string;

					/** Whether data must be provided to this command. */
					required: undefined extends Input['data'] ? ExcludeMe : true;

					/** What type of data should be provided. Invalid data will be rejected. */
					type: number extends Input['data']
						? Input['data'] extends number
							? 'integer' | 'float'
							: ExcludeMe
						: ExcludeMe;

					/** A finite array of acceptable data values or callback providing same. Invalid data will be rejected. */
					accepts: NonNullable<Input['data']> extends
						| string[]
						| number[]
						| (() => string[] | number[])
						| (() => Promise<string[] | number[]>)
						? Input['data'] | (() => Promise<Input['data']>)
						: ExcludeMe;

					/** Whether to ignore anything that looks like flags/options once data is reached. Useful if you expect your data to contain things that would otherwise appear to be flags/options. */
					ignoreFlagsAndOptions?: true;

					// ** Whether the accepts is singular or a list of acceptable values. */
					acceptsMultiple: undefined extends Input['acceptsMultipleData'] ? ExcludeMe : true;
			  }>
		: ExcludeMe;
}>;

// Describes what a command spec might look like after being imported
export interface GenericCommandSpec {
	description?: string;
	executeOnCascade?: true;
	acceptsPassThroughArgs?: true;
	flags?: {
		[flag: string]: {
			description?: string;
			cascades?: true;
			shorthand?: string;
		};
	};
	options?: {
		[option: string]: {
			description?: string;
			cascades?: true;
			shorthand?: string;
			required?: true;
			type?: 'integer' | 'float';
			accepts?: string[] | number[] | (() => string[] | number[]) | (() => Promise<string[] | number[]>);
		};
	};
	data?: {
		description?: string;
		required?: true;
		type?: 'integer' | 'float';
		accepts?: string[] | number[] | (() => string[] | number[]) | (() => Promise<string[] | number[]>);
		ignoreFlagsAndOptions?: true;
		acceptsMultiple?: true;
	};
}

/** Get the parsed command spec from a particular directory */
export default async function getCommandSpec(directory: string): Promise<GenericCommandSpec> {
	// Error if directory does not exist
	if (!fs.existsSync(directory)) {
		throw new Error(`Directory does not exist: ${directory}`);
	}

	// Get child files of a parent directory
	const getFiles = (directory: string): string[] => {
		if (!fs.existsSync(directory)) {
			return [];
		}

		const allItems = fs.readdirSync(directory).map((name: string) => path.join(directory, name));

		return allItems.filter((path) => fs.lstatSync(path).isFile());
	};

	// List the possible spec files in this directory
	const specFiles = getFiles(directory).filter((path) => path.match(/\.spec.[cm]?js$/));

	// Error if not exactly one spec file
	if (specFiles.length !== 1) {
		throw new PrintableError(
			`There should be exactly one spec file (ending in ${chalk.bold('.spec.[cm]?js')}) in: ${directory}`
		);
	}

	// Get the context
	const context = await getContext();

	// Get the file paths
	const specFilePath = specFiles[0];
	const truncatedPath = specFilePath.replace(`${path.dirname(context.entryFile)}/`, '');

	// Return
	try {
		let spec = (await import(specFilePath)) as { default: GenericCommandSpec } | GenericCommandSpec;

		spec = 'default' in spec ? spec.default : spec;

		if (spec.data?.accepts && typeof spec.data.accepts === 'function') {
			const arrayOrPromise = spec.data.accepts();
			spec.data.accepts = arrayOrPromise instanceof Promise ? await arrayOrPromise : arrayOrPromise;
		}

		if ((spec.data?.acceptsMultiple || spec.data?.accepts) && !(spec.data?.accepts instanceof Array)) {
			throw new Error('data.accepts must resolve to an Array');
		}

		return spec;
	} catch (error) {
		throw new PrintableError(
			`${String(error)}\n\nEncountered this error while importing the spec file at: ${chalk.bold(truncatedPath)}`
		);
	}
}
