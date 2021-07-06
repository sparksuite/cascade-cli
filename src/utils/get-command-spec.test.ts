// Imports
import path from 'path';
import getCommandSpec from './get-command-spec';

// Set the absolute path to the test file trees directory
const testFileTrees = path.normalize(path.join(__dirname, '..', '..', 'test-file-trees'));

// Tests
describe('#getCommandSpec()', () => {
	it('Catches non-existent directory', async () => {
		await expect(getCommandSpec('/path/to/fake/directory')).rejects.toThrow('Directory does not exist');
	});

	it('Complains about multiple spec files', async () => {
		await expect(getCommandSpec(path.join(testFileTrees, 'bad-structure', 'cli', 'multiple-specs'))).rejects.toThrow(
			'There should be exactly one spec file'
		);
	});

	it('Complains about invalid spec JS', async () => {
		await expect(getCommandSpec(path.join(testFileTrees, 'bad-structure', 'cli', 'invalid-spec-js'))).rejects.toThrow(
			'Encountered this error while importing the spec file at'
		);
	});

	it('Complains about invalid spec JS', async () => {
		await expect(getCommandSpec(path.join(testFileTrees, 'bad-structure', 'cli', 'invalid-data-js'))).rejects.toThrow(
			'Encountered this error while importing the spec file at'
		);
	});

	it('Returns the spec file', async () => {
		expect(await getCommandSpec(path.join(testFileTrees, 'primary'))).toStrictEqual({
			flags: {
				example: {
					shorthand: 'e',
				},
			},
		});
	});
});
