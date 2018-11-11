const dotEnv = require('dotenv-safe');

dotEnv.config();

const puppeteer = require('puppeteer');
const Promise = require('bluebird');
const { endpoints } = require('../src/config');
const normalizeHTML = require('../src/parser');
const { dbHelper } = require('../src/helpers');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
            // '--proxy-server=x.x.x.x:pppp'
        ]
    });
    const page = await browser.newPage();

    await page.goto(`${endpoints.scanUrl}/?ps=100`);

    let htmlContent = await page.evaluate(() => document.documentElement.innerHTML);

    // eslint-disable-next-line no-unused-vars
    const { page: pages, data } = await normalizeHTML(page, htmlContent);

    // const pages = 5; // Uncomment when need specified amount of page that should be fetched
    let currentPage = 0; // When you want fetch from specified page range

    const firstPage = fs.existsSync(`./db/pages/${1}.db`);

    if (!firstPage) {
        const _db = dbHelper.createDb('db/pages/1.db');
        dbHelper.insert(_db, data);
    }

    if (pages < 1) {
        return false;
    }

    await Promise.each(new Array(pages - 1)
        .fill(endpoints.scanUrl)
        .map((url, i) => ({ url: `${url}/${(pages - currentPage) - i}?ps=100`, page: (pages - currentPage) - i }))
        .filter(({ page }) => !fs.existsSync(`./db/pages/${page}.db`)), async ({ url, page: pageId }) => {
        await page.goto(url);

        let htmlContentInside = await page.evaluate(() => document.documentElement.innerHTML);
        const response = await normalizeHTML(page, htmlContentInside);

        if (!response || !response.data) {
            throw new Error('Error occured within page crawler parsings');
        }

        const _dbInstancee = dbHelper.createDb(`db/pages/${pageId}.db`);
        dbHelper.insert(_dbInstancee, response.data);


        return response.data;
    });

    await browser.close();
})();