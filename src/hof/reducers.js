const { isDuplicateKey } = require('../helpers');

const reduceAccItemSort = (acc, curr) => {
	let last = acc[acc.length - 1];

	if (isDuplicateKey(last, curr)) {
		if (last.optimization === undefined) {
			last.optimization = false;
		}
		if (last.arguments === undefined) {
			last.arguments = false;
		}
		if (last.source === undefined) {
			last.source = null;
		}
		if (last.abi === undefined) {
			last.abi = null;
		}
		last = {};
		acc.push(last);
	}

	if (Array.isArray(curr)) {
		return acc;
	}

	Object.assign(last, curr);

	return acc;
};
const reduceAccItemMerge = (acc, curr) => {
	if (Array.isArray(acc)) {
		acc.push(...curr);
	}
	return acc;
};

module.exports = { reduceAccItemSort, reduceAccItemMerge };
