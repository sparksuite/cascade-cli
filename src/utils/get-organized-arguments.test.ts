// Imports
import path from 'path';
import getOrganizedArguments from './get-organized-arguments';

// Set the absolute path to the test projects directory
const testProjectsPath = path.normalize(path.join(__dirname, '..', '..', 'test-projects'));

// Tests
describe('#getOrganizedArguments()', () => {
	it('Handles no arguments', async () => {
		process.argv = ['/path/to/node', path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js')];

		expect(await getOrganizedArguments()).toStrictEqual({
			flags: [],
			options: [],
			values: [],
			command: '',
		});
	});

	it('Handles simple command', async () => {
		process.argv = ['/path/to/node', path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'), 'list'];

		expect(await getOrganizedArguments()).toStrictEqual({
			flags: [],
			options: [],
			values: [],
			command: 'list',
		});
	});

	it('Handles simple command with data', async () => {
		process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'toppings',
		];

		expect(await getOrganizedArguments()).toStrictEqual({
			flags: [],
			options: [],
			values: [],
			data: ['toppings'],
			command: 'list',
		});
	});

	it('Handles simple command with multi-word data', async () => {
		process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'two',
			'words',
		];

		expect(await getOrganizedArguments()).toStrictEqual({
			flags: [],
			options: [],
			values: [],
			data: ['two words'],
			command: 'list',
		});
	});

	it('Handles multiple data', async () => {
		process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'two',
			'words',
			'crusts',
		];

		expect(await getOrganizedArguments()).toStrictEqual({
			flags: [],
			options: [],
			values: [],
			data: ['crusts', 'two words'],
			command: 'list',
		});
	});

	it('Handles simple command with flag after data', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'toppings',
			'--help',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: ['help'],
				options: [],
				values: [],
				data: ['toppings'],
				command: 'list',
			});
	});

	it('Ignores flag in data', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'dine-in',
			'something',
			'--help',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: [],
				options: [],
				values: [],
				data: 'something --help',
				command: 'order dine-in',
			});
	});

	it('Ignores options in data', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'dine-in',
			'something',
			'--delivery-zip-code',
			'55555',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: [],
				options: [],
				values: [],
				data: 'something --delivery-zip-code 55555',
				command: 'order dine-in',
			});
	});

	it('Handles simple command with longer data', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'dine-in',
			'pizza1',
			'pizza2',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: [],
				options: [],
				values: [],
				data: 'pizza1 pizza2',
				command: 'order dine-in',
			});
	});

	it('Handles data with special characters', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'dine-in',
			'~!@#$%^&*()-=_+',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: [],
				options: [],
				values: [],
				data: '~!@#$%^&*()-=_+',
				command: 'order dine-in',
			});
	});

	it('Handles integer data', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'integer-data',
			'10',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: [],
				options: [],
				values: [],
				data: 10,
				command: 'order integer-data',
			});
	});

	it('Handles float data', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'float-data',
			'123.4',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: [],
				options: [],
				values: [],
				data: 123.4,
				command: 'order float-data',
			});

		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'float-data',
			'123.',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: [],
				options: [],
				values: [],
				data: 123,
				command: 'order float-data',
			});

		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'float-data',
			'123',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: [],
				options: [],
				values: [],
				data: 123,
				command: 'order float-data',
			});

		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'float-data',
			'.123',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: [],
				options: [],
				values: [],
				data: 0.123,
				command: 'order float-data',
			});
	});

	it('Handles multiple commands', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'dine-in',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: [],
				options: [],
				values: [],
				command: 'order dine-in',
			});
	});

	it('Handles flag', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'--vegetarian',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: ['vegetarian'],
				options: [],
				values: [],
				command: 'list',
			});
	});

	it('Handles cascading flag', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'--quiet',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: ['quiet'],
				options: [],
				values: [],
				command: 'list',
			});
	});

	it('Handles shorthand flag', async () => {
		(process.argv = ['/path/to/node', path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'), 'list', '-q']),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: ['quiet'],
				options: [],
				values: [],
				command: 'list',
			});
	});

	it('Handles multiple flags', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'--vegetarian',
			'--quiet',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: ['vegetarian', 'quiet'],
				options: [],
				values: [],
				command: 'list',
			});
	});

	it('Handles cascading flag before command', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'--quiet',
			'list',
			'--vegetarian',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: ['quiet', 'vegetarian'],
				options: [],
				values: [],
				command: 'list',
			});
	});

	it('Handles integer option', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'--limit',
			'10',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: [],
				options: ['limit'],
				values: [10],
				command: 'list',
			});
	});

	it('Handles float option', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'--max-price',
			'123.4',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: [],
				options: ['max-price'],
				values: [123.4],
				command: 'list',
			});

		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'--max-price',
			'123.',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: [],
				options: ['max-price'],
				values: [123],
				command: 'list',
			});

		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'--max-price',
			'123',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: [],
				options: ['max-price'],
				values: [123],
				command: 'list',
			});

		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'--max-price',
			'.123',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: [],
				options: ['max-price'],
				values: [0.123],
				command: 'list',
			});
	});

	it('Handles cascading option', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'--delivery-zip-code',
			'55555',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: [],
				options: ['delivery-zip-code'],
				values: ['55555'],
				command: 'list',
			});
	});

	it('Handles shorthand option', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'-z',
			'55555',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				flags: [],
				options: ['delivery-zip-code'],
				values: ['55555'],
				command: 'list',
			});
	});

	it('Treats bad command as data', async () => {
		(process.argv = ['/path/to/node', path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'), 'list', '.']),
			await expect(getOrganizedArguments()).rejects.toThrow('Unrecognized data for "list"');
	});

	it('Complains about missing option value', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'--delivery-zip-code',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow(
				'No value provided for --delivery-zip-code, which is an option, not a flag'
			);
	});

	it('Complains about unrecognized option value type', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'to-go',
			'--test',
			'test',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow('Unrecognized "type": fake');
	});

	it('Complains about unrecognized data type', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'to-go',
			'test',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow('Unrecognized "type": fake');
	});

	it('Complains about unrecognized flag', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'--fake',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow('Unrecognized argument: --fake');
	});

	it('Complains about non-permitted data', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'abc',
			'123',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow('this command does not accept data');
	});

	it('Complains about option value not in "values"', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'--sort',
			'fake',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow('Unrecognized value for --sort: fake');
	});

	it('Complains about data not in "values"', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'fake',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow('Unrecognized data for "list": fake');
	});

	it('Complains about option value not being integer', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'--limit',
			'123.4',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow('The option --limit expects an integer');

		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'--limit',
			'abc',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow('The option --limit expects an integer');
	});

	it('Complains about option value not being float', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'--max-price',
			'abc',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow('The option --max-price expects a float');

		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'--max-price',
			'123.4.5',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow('The option --max-price expects a float');

		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'--max-price',
			'.',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow('The option --max-price expects a float');

		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'list',
			'--max-price',
			'',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow('The option --max-price expects a float');
	});

	it('Complains about data not being integer', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'integer-data',
			'123.4',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow('The command "order integer-data" expects integer data');

		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'integer-data',
			'abc',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow('The command "order integer-data" expects integer data');
	});

	it('Complains about data not being float', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'float-data',
			'abc',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow('The command "order float-data" expects float data');

		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'float-data',
			'123.4.5',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow('The command "order float-data" expects float data');

		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'float-data',
			'.',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow('The command "order float-data" expects float data');

		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'float-data',
			'',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow('The command "order float-data" expects float data');
	});

	it('Complains about unexpected pass-through arguments ', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'dine-in',
			'--',
			'--pass-through-flag',
			'pass-through-option=value',
			'pass-through-data',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow('This command does not support pass-through arguments');
	});

	it('Complains about unexpected multiple data not in "values"', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'single-topping',
			'cheese',
			'pineapple',
		]),
			await expect(getOrganizedArguments()).rejects.toThrow(
				'Only 1 of the acceptable data items are allowed.\nAccepts one of: pineapple, ham, chicken, cheese'
			);
	});

	it('Handles having pass-through arguments', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'to-go',
			'--',
			'--pass-through-flag',
			'pass-through-option=value',
			'pass-through-data',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				command: 'order to-go',
				flags: [],
				options: [],
				passThrough: ['--pass-through-flag', 'pass-through-option=value', 'pass-through-data'],
				values: [],
			});
	});

	it('Handles having dynamic async option accept values', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'dynamic-async-accepts',
			'--test',
			'a2',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				command: 'order dynamic-async-accepts',
				flags: [],
				options: ['test'],
				values: ['a2'],
			});
	});

	it('Handles having dynamic sync option accept values', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'dynamic-sync-accepts',
			'--test',
			'a2',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				command: 'order dynamic-sync-accepts',
				flags: [],
				options: ['test'],
				values: ['a2'],
			});
	});

	it('Handles having dynamic async data accept values', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'dynamic-async-accepts',
			'b1',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				command: 'order dynamic-async-accepts',
				flags: [],
				options: [],
				values: [],
				data: 'b1',
			});
	});

	it('Handles having dynamic sync data accept values', async () => {
		(process.argv = [
			'/path/to/node',
			path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js'),
			'order',
			'dynamic-sync-accepts',
			'b1',
		]),
			expect(await getOrganizedArguments()).toStrictEqual({
				command: 'order dynamic-sync-accepts',
				flags: [],
				options: [],
				values: [],
				data: 'b1',
			});
	});
});
