const count = (db) => new Promise((resolve, reject) => {
	db.count({}, (err, doc) => {
		if (err) {
			return reject(err);
		}
		return resolve(doc);
	});
});

module.exports = { count }
;
