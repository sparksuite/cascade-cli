module.exports = {
	description: 'List something',
	data: {
		description: 'What you want to list',
		accepts: ['toppings', 'crusts', 'two words'],
		acceptsMultiple: true,
		required: true,
	},
	flags: {
		vegetarian: {
			shorthand: 'v',
			description: 'Only list vegetarian choices',
		},
	},
	options: {
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
};
