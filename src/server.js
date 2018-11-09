const nedb = require('nedb');
const dotEnv = require('dotenv-safe');

dotEnv.config();

const { scanPage } = require('./axios');
const { sleep, dbHelper } = require('./helpers');

const cache = new nedb({ filename: '.cache', autoload: true });

new Promise(async resolve => {
	let pages = await new Promise((resolve, reject) => cache.find({}, (err, doc) => {
		if (err) {
			return reject(err);
		}
		return resolve(doc.pop());
	})).then(({pagesDone}) => pagesDone || 0).catch(() => 0);

	scanPage(pages).then(async ({ data, page: cachePage }) => {
		pages = cachePage - pages;
		return Promise.all(new Array(pages - 1).fill(null).map(async (_, i) => {
			await sleep(5000);
			const { data: response } = await scanPage(pages - (i + 1)).catch(() => {});

			return response;
		})).then(async pagesResponse => {
			pagesResponse.unshift(data);

			// pagesResponse = pagesResponse.reduce(reducers.reduceAccItemMerge, pagesResponse.shift())

			let successItems = 0;
			let currentPage = pages;
			let pagesDone = 0;
			if (Array.isArray(pagesResponse)) {
				await Promise.all(pagesResponse.map(async (pagesItems, i) => {
					const db = new nedb({ filename: `db/pages/${(pagesResponse.length - i)}.db`, autoload: true });

					const count = await dbHelper.count(db);
					if (count === pagesItems.length) {
						return false;
					}
					return await Promise.all(pagesItems.filter(item => item).map(item => new Promise((resolve, reject) => {
						db.insert(item, (err, doc) => {
							if (err || !doc) {
								return reject(err);
							}
							successItems++;

							resolve(doc);
						});
					}))).then(() => {
						pagesDone++;
						currentPage--;
					});
				}));

				const $set = { cache: true, successItems, currentPage, pagesDone };
				cache.findOne({ cache: true }, (err, doc) => {
					if (err || !doc) {
						cache.insert($set);
						return err;
					}
					cache.update(doc, $set, {});
				});
			}
		}).catch(err => {
			console.error('Error', err);
		});
	});
	resolve();
});
