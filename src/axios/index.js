const axios = require('axios');
const { endpoints } = require('../config');
const { sleep, reident } = require('../helpers');
const { reducers } = require('../hof');
const $ = require('cheerio');

const API_KEY = process.env.API_KEY;

const getAbiUrl = (address) => axios.get(endpoints.apiUrl, {
	params: {
		module: 'contract',
		action: 'getabi',
		address,
		apikey: API_KEY
	}
});
const getSourceCode = (address) => axios.get(endpoints.apiUrl, {
	params: {
		module: 'contract',
		action: 'getsourcecode',
		address,
		apikey: API_KEY
	}
});
const scanPage = (page = 1) => axios.get(`${endpoints.scanUrl}/${page}`).then(receiptNormalizer);

async function receiptNormalizer(response) {
	if (!response || !response.data) {
		throw new Error('Error, something got wrong');
	}
	if (response.data) {
		const container = $(response.data).find('.profile.container');
		const page = parseInt(container.find('.row:last-child').find('p[align="right"]').find('b:last-child').text());

		const rawTableSourceItems = Object.values(container.find('tbody').find('tr > td'))
			.map(reident)
			.filter(item => item);

		const accGroupedItems = rawTableSourceItems.reduce(reducers.reduceAccItemSort, [{}]);
		const tableItems = (await Promise.all(accGroupedItems
			.map(async (item) => {
				if (!item.address) {
					return null;
				}
				await sleep(2000); // It it calls within 250ms, some calls may be blocked by FORBIDDEN status

				let source_code = await getSourceCode(item.address).then(res => res.data ? res.data : new Error('Got wrong with failed result'))
					.then(res => res.result)
					.catch(err => {
						console.error('Something error', err.message);
						return null;
					});

				if (!source_code) {
					return null;
				}

				item.source = source_code[0].SourceCode;
				item.abi = source_code[0].ABI;
				return item;
			})))
			.filter(item => item);

		return { page, data: tableItems };
	}
	return null;
}

module.exports = { getAbiUrl, getSourceCode, scanPage };
