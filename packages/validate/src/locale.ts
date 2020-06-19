export const string = {
	type: '${path} must be a string',
	min: '${path} must be at least ${min} characters',
	max: '${path} must be at most ${max} characters',
	length: '${path} must be exactly ${length} characters',
	matches: '${path} must match the following: "${regex}"',
	email: '${path} must be a valid email',
	url: '${path} must be a valid URL',
};

export const number = {
	type: '${path} must be a number',
	integer: '${path} must be an integer',
	min: '${path} must be greater than ${min}',
	max: '${path} must be less than ${max}',
};

export const array = {
	type: '${path} must be an array',
	min: '${path} must contain at least ${min} items',
	max: '${path} must contain less than or equal to ${max} items',
	length: '${path} must contain exactly ${length} items',
	items: '${path} array items validate failed',
};

export const tuple = {
	type: '${path} must be a tuple and have exactly ${length} items',
	items: '${path} tuple items validate failed',
};

export const union = {
	type: '${path} does not match any of the allowed types',
};

export const object = {
	type: '${path} must be an object',
	strict: '${path} field cannot have keys not specified in the object shape',
	shape: '${path} object fields validate failed',
};

export const boolean = {
	type: '${path} must be a boolean',
};

export const literal = {
	type: '${path} must be equal to literal value "${target}"',
};
