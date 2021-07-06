// Imports
import path from 'path';
import getAllProgramCommands from './get-all-program-commands';

// Set the absolute path to the test projects directory
const testProjectsPath = path.normalize(path.join(__dirname, '..', '..', 'test-projects'));

// Tests
describe('#getAllProgramCommands()', () => {
	it('Gets all commands', async () => {
		process.argv = ['/path/to/node', path.join(testProjectsPath, 'pizza-ordering', 'cli', 'entry.js')];

		expect(await getAllProgramCommands()).toStrictEqual([
			'list',
			'order',
			'order descriptionless-data',
			'order dine-in',
			'order dynamic-async-accepts',
			'order dynamic-sync-accepts',
			'order float-data',
			'order integer-data',
			'order single-topping',
			'order to-go',
		]);
	});
});
