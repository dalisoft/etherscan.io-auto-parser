const dotEnv = require('dotenv-safe');

dotEnv.config();

const puppeteer = require('puppeteer');
const { endpoints } = require('../src/config');
const { receiptNormalizer: normalizeHTML } = require('../src/axios');
const { dbHelper } = require('../src/helpers');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        // args: [ '--proxy-server=127.0.0.1:9876' ]
    });
    const page = await browser.newPage();
    await page.goto(endpoints.scanUrl);

    await page.evaluate(() => {
        const selectElem = document.querySelector('select[name="ctl00$ContentPlaceHolder1$ddlRecordsPerPage"]');
        const optionElem = selectElem.querySelector('option:nth-child(4)');
        optionElem.selected = true;
        const event = new Event('change', {bubbles: true});
        selectElem.dispatchEvent(event);
    });

    await page.waitForSelector('select[name="ctl00$ContentPlaceHolder1$ddlRecordsPerPage"]');

    const { page: pages, data } = await page.evaluate(() => ({data: document.documentElement.innerHTML})).then(normalizeHTML);

    // const pages = 1; // Uncomment when need specified amount of page that should be fetched
    let currentPage = 0; // When you want fetch from specified page range

    const firstPage = fs.existsSync(`./db/pages/${1}.db`);

    if (!firstPage) {
        const _db = dbHelper.createDb('db/pages/1.db');
        dbHelper.insert(_db, data);
    }

    if (pages < 1) {
        return false;
    }

    await Promise.all(new Array(pages - 1)
        .fill(endpoints.scanUrl)
        .map((url, i) => ({ url: `${url}/${pages - currentPage - i}`, page: pages - currentPage - i }))
        .filter(({ page }) => !fs.existsSync(`./db/pages/${page}.db`))
        .map(async ({ url, page: pageId }) => {
            await page.waitForSelector('select[name="ctl00$ContentPlaceHolder1$ddlRecordsPerPage"]');

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