const unlockCircular = require('./unlock-circular');

module.exports = function reident(child, i) {
	unlockCircular(child);
	if (child.type) {
		switch (child.type) {
		case 'tag': {
			let { children, name } = child;

			if (name === 'script' || name === 'style' || name === 'link') {
				return null;
			}
			if (name === 'tbody') {
				child.children.forEach(unlockCircular);
				return child.children.map(reident);
			}

			children.forEach(unlockCircular);

			children = children.map(child => {
				if (child.children) {
					child.children.forEach(unlockCircular);
					if (child.children.length === 0) {
						if (child.attribs) {
							if (child.attribs.title === 'Constructor Arguments') {
								return { arguments: true };
							}
							if (child.attribs.title === 'Optimization Enabled') {
								return { optimization: true };
							}
						}
					}
					return child.children;
				}
				return child;
			});

			// Fast lookup
			if (children) {
				if (children[0] && children[0].length === 1) {
					children[0] = children[0][0];
				}
				if (children[1] && children[1].length === 1) {
					children[1] = children[1][0];
				}
				if (children[0] && children[0].length === 0) {
					return null;
				}
			}

			if (children.length === 1) {
				return reident(children[0], 0);
			} else if (children.length === 2) {
				if (children[0].optimization !== undefined || children[0].arguments !== undefined) {
					return children[0];
				} else if (children[0].name === 'font' || children[0].name === 'i') {
					return reident(children[1], 1);
				}
			} else if (children.length === 3 && children[1].data === ' ') {
				if (children[0].name === 'font' || children[0].name === 'i') {
					return reident(children[2], 2);
				}
			} else if (children.length === 3 && children[1].data === '.') {
				if (children[0].type === 'text') {
					return reident(children[2], 2);
				}
			} else if (children.length === 4 && children[1].data === ' ') {
				const [child1, , child2] = children;

				if (child1.optimization !== undefined && child2.arguments !== undefined) {
					child1.arguments = child2.arguments;
					return child1;
				} else if (child1.optimization !== undefined && child2.arguments === undefined) {
					return child1;
				} else if (child2.arguments !== undefined && child1.optimization === undefined) {
					return child2;
				}

				return null;
			}

			return children.map(reident).filter(item => item);
		}
		case 'text': {
			let key;
			const txt = child.data;

			if (typeof txt === 'string') {
				if (txt.indexOf('/') === 2) {
					key = 'date_verified';
				} else if (txt.indexOf('0x') !== -1) {
					key = 'address';
				} else if (txt.indexOf('v0') !== -1) {
					key = 'compiler';
				} else if (txt.indexOf(' Ether') > 0) {
					key = 'balance';
					child.data = parseFloat(child.data.split(' ')[0]);
				} else if (txt !== ' ' && typeof +txt === 'number' && !isNaN(+txt) && txt) {
					key = 'tx_count';
					child.data = +child.data;
				} else if (txt.length > 2) {
					key = 'contractName';
				} else if (i === 0) {
					key = 'optimization';
					child.data = txt !== '-';
				} else {
					key = 'unknownField_index' + i;
				}
			}
			return { [key]: child.data };
		}
		}
	}
	if (child && Array.isArray(child) && child.length === 1) {
		return reident(child[0]);
	}
	return null;
};
