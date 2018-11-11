const dotEnv = require('dotenv-safe');

dotEnv.config();

const puppeteer = require('puppeteer');
const { endpoints } = require('../src/config');
const { receiptNormalizer: normalizeHTML } = require('../src/axios');
const { sleep, dbHelper } = require('../src/helpers');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        // args: [ '--proxy-server=127.0.0.1:9876' ]
    });
    const page = await browser.newPage();
    await page.goto(endpoints.scanUrl);

    const { page: pages, data } = await page.evaluate(() => ({data: document.documentElement.innerHTML})).then(normalizeHTML);

    const firstPage = fs.existsSync(`./db/pages/${1}.db`);

    if (!firstPage) {
        const _db = dbHelper.createDb('db/pages/1.db');
        dbHelper.insert(_db, data);
    }


    await Promise.all(new Array(pages - 1)
        .fill(endpoints.scanUrl)
        .map((url, i) => ({ url: `${url}/${pages - i}`, page: pages - i }))
        .filter(({ page }) => !fs.existsSync(`./db/pages/${page}.db`))
        .map(async ({ url, page: pageId }, i) => {
            await sleep(i * 1500);

            await page.goto(url);
            const { data } = await page.evaluate(() => ({data: document.documentElement.innerHTML})).then(normalizeHTML).catch(() => null);

            if (!data) {
                throw new Error('Error occured within page crawler parsings');
            }

            const _db = dbHelper.createDb(`db/pages/${pageId}.db`);
            dbHelper.insert(_db, data);

            return data;
        }));

    await browser.close();
})();