module.exports = {
	description: 'Order a pizza, to-go',
	data: {
		description: 'What type of pizza to order',
		type: 'fake',
	},
	options: {
		test: {
			description: 'Just used for testing',
			type: 'fake',
		},
	},
	passThrough: true,
};
