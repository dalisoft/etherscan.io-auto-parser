module.exports = (item) => {
	delete item.parent;
	delete item.prev;
	delete item.next;

	return item;
};
