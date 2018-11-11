/* global Promise */
const nedb = require('nedb');

const count = (db) => new Promise((resolve, reject) => {
    db.count({}, (err, doc) => {
        if (err) {
            return reject(err);
        }
        return resolve(doc);
    });
}).catch((err) => console.error(`DB Helpers [Count]: Error\nStack: ${err.stack}\nMessage: ${err.message}`));
const insert = (db, data) => new Promise((resolve, reject) => {
    db.insert(data, (err, doc) => {
        if (err) {
            return reject(err);
        }
        return resolve(doc);
    });
}).catch((err) => console.error(`DB Helpers [Insert]: Error\nStack: ${err.stack}\nMessage: ${err.message}\nData: ${JSON.stringify(data, null, 4)}`));
const createDb = (filename) => new nedb({ filename, autoload: true });

module.exports = { count, insert, createDb};
