// Dependencies
import versionScreen from './version';
import { Config } from '../utils/get-config';
import getConfig from '../utils/get-config';
import chalk from '../utils/chalk';

// Mocks
jest.mock('../utils/get-config');

// Tests
describe('#versionScreen()', () => {
	it('Handles all details present', async () => {
		const config: Config = {
			displayName: 'Example program',
			packageName: 'example',
			version: '1.2.3',
			usageCommand: 'node entry.js',
			spacing: {
				before: 1,
				after: 1,
			},
			verbose: false,
		};

		// @ts-expect-error: mockImplementation() *is* available
		getConfig.mockImplementation(() => Promise.resolve(config)); // eslint-disable-line @typescript-eslint/no-unsafe-call

		expect(await versionScreen()).toEqual(`${chalk.bold('Example program: ')}1.2.3`);
	});

	it('Handles missing display name', async () => {
		const config: Config = {
			packageName: 'example',
			version: '1.2.3',
			usageCommand: 'node entry.js',
			spacing: {
				before: 1,
				after: 1,
			},
			verbose: false,
		};

		// @ts-expect-error: mockImplementation() *is* available
		getConfig.mockImplementation(() => Promise.resolve(config)); // eslint-disable-line @typescript-eslint/no-unsafe-call

		expect(await versionScreen()).toEqual(`${chalk.bold('example: ')}1.2.3`);
	});

	it('Handles missing package name', async () => {
		const config: Config = {
			displayName: 'Example program',
			version: '1.2.3',
			usageCommand: 'node entry.js',
			spacing: {
				before: 1,
				after: 1,
			},
			verbose: false,
		};

		// @ts-expect-error: mockImplementation() *is* available
		getConfig.mockImplementation(() => Promise.resolve(config)); // eslint-disable-line @typescript-eslint/no-unsafe-call

		expect(await versionScreen()).toEqual(`${chalk.bold('Example program: ')}1.2.3`);
	});

	it('Handles missing version', async () => {
		const config: Config = {
			displayName: 'Example program',
			usageCommand: 'node entry.js',
			spacing: {
				before: 1,
				after: 1,
			},
			verbose: false,
		};

		// @ts-expect-error: mockImplementation() *is* available
		getConfig.mockImplementation(() => Promise.resolve(config)); // eslint-disable-line @typescript-eslint/no-unsafe-call

		expect(await versionScreen()).toEqual(chalk.bold('Example program'));
	});

	it('Handles missing name', async () => {
		const config: Config = {
			version: '1.2.3',
			usageCommand: 'node entry.js',
			spacing: {
				before: 1,
				after: 1,
			},
			verbose: false,
		};

		// @ts-expect-error: mockImplementation() *is* available
		getConfig.mockImplementation(() => Promise.resolve(config)); // eslint-disable-line @typescript-eslint/no-unsafe-call

		expect(await versionScreen()).toEqual('1.2.3');
	});
});
