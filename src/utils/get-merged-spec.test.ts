// Imports
import path from 'path';
import getMergedSpec from './get-merged-spec';

// Set the absolute path to the test projects directory
const testProjectsPath = path.normalize(path.join(__dirname, '..', '..', 'test-projects'));

// Tests
describe('#getMergedSpec()', () => {
	it('Gets top-level spec', async () => {
		process.argv = ['/path/to/node', path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js')];

		expect(await getMergedSpec('')).toStrictEqual({
			data: undefined,
			description: undefined,
			flags: {
				help: {
					shorthand: 'h',
					description: 'Show help',
				},
				'non-cascading': {
					description: 'Just used for testing',
				},
				quiet: {
					cascades: true,
					description: 'Disable interactivity, rely on default values instead',
					shorthand: 'q',
				},
				version: {
					shorthand: 'v',
					description: 'Show version',
				},
			},
			options: {
				'delivery-zip-code': {
					cascades: true,
					description: 'The delivery ZIP code, for context',
					shorthand: 'z',
				},
			},
		});
	});

	it('Gets merged spec', async () => {
		process.argv = ['/path/to/node', path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js')];

		expect(await getMergedSpec('list')).toStrictEqual({
			data: {
				description: 'What you want to list',
				accepts: ['toppings', 'crusts', 'two words'],
				required: true,
				acceptsMultiple: true,
			},
			description: 'List something',
			flags: {
				help: {
					shorthand: 'h',
					description: 'Show help',
				},
				quiet: {
					cascades: true,
					description: 'Disable interactivity, rely on default values instead',
					shorthand: 'q',
				},
				vegetarian: {
					description: 'Only list vegetarian choices',
					shorthand: 'v',
				},
				version: {
					shorthand: 'v',
					description: 'Show version',
				},
			},
			options: {
				'delivery-zip-code': {
					cascades: true,
					description: 'The delivery ZIP code, for context',
					shorthand: 'z',
				},
				limit: {
					description: 'How many items to list',
					type: 'integer',
				},
				'max-price': {
					description: 'The maximum price of the items to list',
					type: 'float',
				},
				sort: {
					description: 'How to sort the list',
					accepts: ['popularity', 'alphabetical'],
					required: true,
				},
			},
		});
	});

	it('Gets another merged spec', async () => {
		process.argv = ['/path/to/node', path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js')];

		expect(await getMergedSpec('order')).toStrictEqual({
			data: undefined,
			description: 'Order a pizza',
			flags: {
				'gluten-free': {
					description: "Let the kitchen know you're gluten free",
				},
				help: {
					shorthand: 'h',
					description: 'Show help',
				},
				quiet: {
					cascades: true,
					description: 'Disable interactivity, rely on default values instead',
					shorthand: 'q',
				},
				version: {
					shorthand: 'v',
					description: 'Show version',
				},
			},
			options: {
				'delivery-zip-code': {
					cascades: true,
					description: 'The delivery ZIP code, for context',
					shorthand: 'z',
				},
			},
		});
	});
});
