const { endpoints } = require('../config');
const { reident } = require('../helpers');
const { reducers } = require('../hof');
const $ = require('cheerio');
const Promise = require('bluebird');

const { API_KEY, API_KEY2 } = process.env;

module.exports = async (apiPage, response) => {
    const container = $(response).find('.profile.container');
    const page = parseInt(container.find('.row:last-child').find('p[align="right"]').find('b:last-child').text());

    const rawTableSourceItems = Object.values(container.find('tbody').find('tr > td'))
        .map(reident)
        .filter(item => item);

    const accGroupedItems = rawTableSourceItems.reduce(reducers.reduceAccItemSort, [{}]);

    const tableItems = await apiPage.evaluate(async (accGroupedItems, API_KEY, API_KEY2, endpoints) => {
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        return (await Promise.all(accGroupedItems.map(async (item, i) => {
            if (!item.address) {
                return null;
            }
            const url = `${endpoints.apiUrl}/?module=contract&action=getsourcecode&address=${item.address}&apiKey=${(i % 2) === 1 ? API_KEY : API_KEY2}`;
    
            await sleep(i * 1000);

            let source_code = await fetch(url).then(res => res.json()).catch(() => null);
    
            if (!source_code) {
                return null;
            }
    
            if (source_code.result) {
                source_code = source_code.result;
            } else {
                return null;
            }
    
            item.source = source_code[0].SourceCode;
            item.abi = source_code[0].ABI;
            return item;
        }))).filter(item => item);
    }, accGroupedItems, API_KEY, API_KEY2, endpoints);

    return { page, data: tableItems };
};
