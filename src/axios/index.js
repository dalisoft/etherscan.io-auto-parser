const axios = require('axios');
const { endpoints } = require('../config');
const { sleep, reident } = require('../helpers');
const { reducers } = require('../hof');
const $ = require('cheerio');

const API_KEY = process.env.API_KEY;
const headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'No-Cache',
    'Set-Metadata': 'cause="user-activated", destination="document", site="same-origin"',
    'Upgrade-Insecure-Requests': 1,
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36',
    'Referer': 'https://google.com'
};
const getAbiUrl = (address) => axios.get(endpoints.apiUrl, {
    params: {
        module: 'contract',
        action: 'getabi',
        address,
        apikey: API_KEY
    },
    headers
});
const getSourceCode = (address) => axios.get(endpoints.apiUrl, {
    params: {
        module: 'contract',
        action: 'getsourcecode',
        address,
        apikey: API_KEY
    },
    headers
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
            .map(async (item, i) => {
                if (!item.address) {
                    return null;
                }
                await sleep(i * 1250);

                let source_code = await getSourceCode(item.address).then(res => res.data ? res.data : null)
                    .then(res => res ? res.result : res)
                    .catch(err => {
                        console.error('Error while fetching Source code', err.message);
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

module.exports = { getAbiUrl, getSourceCode, scanPage, receiptNormalizer };
