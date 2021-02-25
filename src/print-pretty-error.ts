// Dependencies
import chalk from './chalk.js';

// Print a pretty error message and return just the message
export default function printPrettyError(message: string) {
	console.error(`${chalk.inverse.red.bold(' ERROR ')}\n`);
	console.error(chalk.red(`> ${message.split('\n').join('\n> ')}\n`));

	return message;
}
